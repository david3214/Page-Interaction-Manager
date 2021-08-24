import io
import json
import os
import datetime
import locale
from ssl import Options
from urllib.parse import quote, urlencode
from urllib import request, error
from flask import current_app
from babel.dates import format_date

import gspread
import pandas as pd
from celery.signals import worker_process_init, worker_process_shutdown, task_postrun
from google.oauth2.credentials import Credentials, exceptions
from sqlalchemy import or_

from .. import celery, create_app, db
from ..models import PageDatum, Preference, User
from ..utils import deep_get
from .task_dicts import internalVariables

from celery import Celery

# Placeholder, for flask app created on init
app = Celery()


@worker_process_init.connect
def init_worker(**kwargs):
    try:
        current_app.app_context()
        # app_context will throw runtime error if not in current_app context
        app = current_app
    except RuntimeError:
        # Runtime Error will be thrown if we are not in current_app context
        print('current_app Runtime Error')
        app = create_app(os.getenv('FLASK_CONFIG') or 'default')
        app.app_context().push()


@worker_process_shutdown.connect
def shutdown_worker(**kwargs):
    if db.session:
        db.session.close()


@task_postrun.connect
def shutdown_task(**kwargs):
    if db.session:
        db.session.remove()


@celery.task()
def test_task(task_info):
    task_info['results'] = task_info['text']
    return task_info


@celery.task()
def update_all_profile_links(pages='all'):
    # Run a task on all sheets
    results = None
    if pages == 'all':
        results = db.session.query(PageDatum).all()
    elif isinstance(pages, list):
        # Create a filter condition to look for any of these page names
        filter_conditions = [PageDatum.page_details.like(f'%{page_name}%') for page_name in pages]
        results = db.session.query(PageDatum).filter(or_(*filter_conditions))
    for result in results:
        try:
            task_info = {}
            task_info['task_name'] = "missionary_bot.tasks.get_profile_links"
            task_info["page_id"] = result.page_id
            task_info["data"] = {}
            psids_with_links = {}
            process_result_info = {}
            
            # Authorize and Access google sheet
            auth = make_auth(result.page_id)
            gc = gspread.authorize(auth)
            sh = gc.open_by_key(result.page_details['google_sheets']['id'])
            worksheet = sh.worksheet("Ad Likes")
            df = pd.DataFrame(worksheet.get_all_records())
            # df = df.loc[df['Profile Link'] == '']

            def create_list_of_psids_with_links(psid, profile_link): 
                if profile_link != 'Not Found' and profile_link != '':
                    psids_with_links[psid] = profile_link

            def f(name, profile_link, source, psid):
                if profile_link == '':
                    if psids_with_links.get(psid):
                        process_result_info[name] = psids_with_links[psid]
                    else:
                        source_data = task_info['data'].setdefault(source, [])
                        if name not in source_data:
                            source_data.append(name)
                            
            df.apply(lambda x: create_list_of_psids_with_links(
                x['PSID'], x['Profile Link']), axis=1)
            df.apply(lambda x: f(
                x['Name'], x['Profile Link'], x['Source'], x['PSID']), axis=1)
            print(task_info)
            celery.send_task(app=celery, name=task_info['task_name'],
                             kwargs={'task_info': task_info},
                             chain=[celery.signature(
                                 'app.worker.process_results', queue='results')]
                             )

            if len(process_result_info):
                print('sending process_results task')
                task_info['results'] = process_result_info
                celery.send_task(app=celery, name='app.worker.process_results', 
                                 kwargs={'task_info': task_info}, queue='results')
        except Exception as e:
            print(f"error: {e}")
    return True


@celery.task(name='app.worker.process_results')
def process_result(task_info):
    if task_info['task_name'] == "missionary_bot.tasks.get_profile_links":
        results = db.session.query(PageDatum).get(task_info['page_id'])
        auth = make_auth(task_info['page_id'])

        gc = gspread.authorize(auth)
        sh = gc.open_by_key(results.page_details['google_sheets']['id'])
        worksheet_list = sh.worksheets()
        worksheet = sh.worksheet("Ad Likes")

        df = pd.DataFrame(worksheet.get_all_records(
            value_render_option="UNFORMATTED_VALUE"))
        pd.set_option("display.max_rows", None, "display.max_columns", None)

        def f(name, profileLink):
            if profileLink == '' and name in task_info['results']:
                return task_info['results'][name]
            else:
                return profileLink
        df['Profile Link'] = df.apply(lambda x: f(
            x['Name'], x['Profile Link']), axis=1)
        # Skip First row, because some sheets have protected those values and we don't need to reset them
        worksheet.update('A2:Z', df.values.tolist())
        return True

    elif task_info['task_name'] == "test":
        print(task_info)
        return True


def make_auth(page_id):
    results = db.session.query(PageDatum).get(page_id)
    token_path = os.environ.get('CLIENT_SECRETS_FILE')

    with io.open(token_path, "r", encoding="utf-8") as json_file:
        data = json.load(json_file)
        data = data['web']
        data['token'] = results.page_details['google_sheets']['token']
        data['refresh_token'] = results.page_details['google_sheets']['refresh_token']
        scopes = ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/script.container.ui",
                  "https://www.googleapis.com/auth/script.external_request", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/script.scriptapp"]
        auth = Credentials.from_authorized_user_info(data, scopes)
    return auth


@celery.task(autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 8})
def insert_row_into_sheet(task_info):
    try:
        event_type = None
        # Identify the type of webhook received
        try:
            if task_info['entry'][0]['messaging']:
                event_type = 'message'
        except KeyError:
            try:
                if task_info['entry'][0]['changes'][0]['value']['item']:
                    event_type = 'reaction'
            except KeyError:
                return json.dumps({'status': 'Unprocessed'})

        eventNameMap = {'reaction': 'Ad Likes', 'message': 'Page Messages'}
        reactionsMap = internalVariables['reactionsMap']
        page_id = None
        page_details = None

        if event_type == 'reaction':
            # Classify the incoming event
            # Reject stuff we aren't interested in
            if (task_info['entry'][0]['changes'][0]['value']['item'] == 'video' or
                task_info['entry'][0]['changes'][0]['value']['item'] == 'comment' or
                    task_info['entry'][0]['changes'][0]['value']['verb'] != 'add'):
                return json.dumps({'status': 'Unprocessed', 'message': 'Reaction was a comment, video, or edited reaction'})
            page_id = task_info['entry'][0]['id']

        elif event_type == 'message':
            page_id = task_info['entry'][0]['messaging'][0]['recipient']['id']
        
        page = PageDatum.query.get(page_id)
        try:
            # If page_details doesn't exist the query didn't pull anything
            page_details = page.page_details
        except AttributeError:
            raise ValueError(json.dumps(
                {'status': 'Error', 'retry': False, 'message': f'Searched for page {page_id} but no result was found'}))

        data = {'name': None, 'psid': None,
                'facebookClue': None, 'messageOrReaction': None}
        # Process reactions
        if event_type == 'reaction':
            data['messageOrReaction'] = reactionsMap[task_info['entry']
                                                     [0]['changes'][0]['value']['reaction_type'].upper()]
            data['name'] = task_info['entry'][0]['changes'][0]['value']['from']['name']
            data['psid'] = task_info['entry'][0]['changes'][0]['value']['from']['id']
            data['facebookClue'] = 'https://facebook.com/{}'.format(
                quote(task_info['entry'][0]['changes'][0]['value']['post_id']))
        elif event_type == 'message':
            data['messageOrReaction'] = task_info['entry'][0]['messaging'][0]['message']['text']
            data['psid'] = task_info['entry'][0]['messaging'][0]['sender']['id']
            # Get name from Facebook
            url = 'https://graph.facebook.com/{}?fields=first_name,last_name&access_token={}'.format(
                data['psid'], page_details['access_token'])
            try:
                results = json.loads(request.urlopen(url).read())
            except error.HTTPError as e:
                # If we can't get the name of the person who messaged us, stop now
                raise Exception(json.dumps(
                    {'status': 'Error', 'retry': False, 'message': "Failed to get ({}) user's name from facebook: error {}".format(data['psid'], e)}))
            data['name'] = results['first_name'] + ' ' + results['last_name']
            data['facebookClue'] = 'https://www.facebook.com/search/people?q={}'.format(
                quote(data['name']))

        # Process current time
        today = format_date(datetime.datetime.now(),
                            'MM/dd/yyyy', locale='en_US')
        values = [[today, data['name'], '', '', data['psid'], data['facebookClue'],
                   '', '', False, False, data['messageOrReaction'], '', '']]

        try:
            # Run the auth for editing the page
            auth = make_auth(page_id)
            gc = gspread.authorize(auth)

            # Send the results to the sheet as the user
            sheetName = eventNameMap[event_type]
            sh = gc.open_by_key(page_details['google_sheets']['id'])
            worksheet = sh.worksheet(sheetName)
            worksheet.append_rows(values, value_input_option='USER_ENTERED')

        except (exceptions.RefreshError, exceptions.GoogleAuthError, exceptions.UserAccessTokenError) as e:
            # These are all errors relating to a bad refresh token
            raise Exception(json.dumps(
                {'status': 'Error', 'retry': False, 'message': str(e), 'task_info': task_info}))
        except (gspread.exceptions.APIError) as e:
            # If the sheet has too many cells it will stop us from inserting into it
            raise Exception(json.dumps(
                {'status': 'Error', 'retry': False, 'message': str(e), 'task_info': task_info}))
        except (gspread.exceptions.WorksheetNotFound) as e:
            # sheet name wasn't found
            raise Exception(json.dumps(
                {'status': 'Error', 'retry': False, 'message': 'Worksheet not found:' + str(e), 'task_info': task_info}))

        return_value = json.dumps({'status': 'Processed', 'page_id': page_id})
        return return_value
    except KeyError as k:
        # Catches when facebook sends us weird objects
        return json.dumps({'status': 'Unprocessed', 'KeyError': str(k), 'task_info': task_info})
    except Exception as e:
        # Raise an error to retry the task, if not specified otherwise
        if not '\"retry\": false' in str(e):
            raise Exception(json.dumps(
                {'status': 'Error', 'message': str(e), 'task_info': task_info}))
        else:
            return str(e)
