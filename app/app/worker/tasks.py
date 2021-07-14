import io
import json
import os
from flask.app import Flask

import gspread
import pandas as pd
from celery.signals import worker_process_init, worker_process_shutdown
from google.oauth2.credentials import Credentials
from oauthlib.oauth1.rfc5849.endpoints import access_token

from .. import celery, create_app, db
from ..models import PageDatum, Preference, User

from celery import Celery
from celery.schedules import crontab

# Placeholder, for flask app created on init
app = Celery()

# TODO set task to run periodically
# @app.on_after_configure.connect
# def setup_periodic_tasks(sender, **kwargs):
#     sender.add_periodic_task(
#         10.0,
#         # crontab(minute='*1'),
#         update_all_profile_links(),
#         name="update_all_profile_links"
#     )

@worker_process_init.connect
def init_worker(**kwargs):
    app = create_app(os.getenv('FLASK_CONFIG') or 'default')
    app.app_context().push()

@celery.task(name='app.worker.cron_run')
def cron_run(**kwargs):
    print('I\'ve been triggered')
    return

@worker_process_shutdown.connect
def shutdown_worker(**kwargs):
    if db.session:
        db.session.close()

@celery.task()
def test_task(task_info):
    task_info['results'] = task_info['text']
    return task_info

@celery.task()
def update_all_profile_links():
    # Run a task on all sheets
    results = db.session.query(PageDatum).all()
    for result in results:
        try:
            task_info = {}
            task_info['task_name'] = "missionary_bot.tasks.get_profile_links"
            task_info["page_id"] = result.page_id
            task_info["data"] = {}
            auth = make_auth(result.page_id)
            gc = gspread.authorize(auth)
            sh = gc.open_by_key(result.page_details['google_sheets']['id'])
            worksheet = sh.worksheet("Ad Likes")
            df = pd.DataFrame(worksheet.get_all_records())
            df = df.loc[df['Profile Link'] == '']
            def f(name, profile_link, source):
                if profile_link == '' :
                    task_info['data'].setdefault(source, []).append(name)

            df.apply(lambda x: f(x['Name'], x['Profile Link'], x['Source']), axis=1)
            print(task_info)
            celery.send_task(app=celery, name=task_info['task_name'],
                            kwargs={'task_info': task_info},
                            chain=[celery.signature('app.worker.process_results', queue='results')]
            )
        except:
            print(f"error: {result}")
    return True

@celery.task()
def update_all_locations():
    # Run a task on all sheets
    results = db.session.query(PageDatum).all()
    for result in results:
        try:
            task_info = {}
            task_info['task_name'] = "missionary_bot.tasks.scrape_profiles_for_location"
            task_info["page_id"] = result.page_id
            task_info["data"] = []
            auth = make_auth(result.page_id)
            gc = gspread.authorize(auth)
            sh = gc.open_by_key(result.page_details['google_sheets']['id'])
            worksheet = sh.worksheet("Ad Likes")
            df = pd.DataFrame(worksheet.get_all_records())
            df = df.loc[(df['Profile Link'] != '') & (df['Location'] == '')]
            def f(profile_link):
                task_info['data'].append(profile_link)

            df.apply(lambda x: f(x['Profile Link']), axis=1)
            celery.send_task(app=celery, name=task_info['task_name'],
                            kwargs={'task_info': task_info},
                            chain=[celery.signature('app.worker.process_results', queue='results')]
            )
        except:
            print(f"error: {result}")
    return True

@celery.task(name='app.worker.process_results')
def process_result(task_info):
    if task_info['task_name'] == "test":
        print(task_info)
        return True

    elif task_info['task_name'] == "missionary_bot.tasks.get_profile_links":
        results = db.session.query(PageDatum).get(task_info['page_id'])
        auth = make_auth(task_info['page_id'])

        gc = gspread.authorize(auth)
        sh = gc.open_by_key(results.page_details['google_sheets']['id'])
        worksheet_list = sh.worksheets()
        worksheet = sh.worksheet("Ad Likes")

        df = pd.DataFrame(worksheet.get_all_records(value_render_option="UNFORMATTED_VALUE"))
        pd.set_option("display.max_rows", None, "display.max_columns", None)
        def f(name, profileLink):
            if profileLink == '' and name in task_info['results']:
                return task_info['results'][name]
            # elif profileLink == '' and not task_info['results'][name]:
            #     return 'Link not found'
            else:
                return profileLink
        df['Profile Link'] = df.apply(lambda x: f(x['Name'], x['Profile Link']), axis=1)
        worksheet.update([df.columns.values.tolist()] + df.values.tolist())
        return True

    elif task_info['task_name'] == "missionary_bot.tasks.scrape_profiles_for_location":
        results = db.session.query(PageDatum).get(task_info['page_id'])
        auth = make_auth(task_info['page_id'])

        gc = gspread.authorize(auth)
        sh = gc.open_by_key(results.page_details['google_sheets']['id'])
        worksheet_list = sh.worksheets()
        worksheet = sh.worksheet("Ad Likes")

        df = pd.DataFrame(worksheet.get_all_records(value_render_option="UNFORMATTED_VALUE"))
        pd.set_option("display.max_rows", None, "display.max_columns", None)
        def f(profileLink, location):
            if location == '' and profileLink in task_info['results']:
                about_info = task_info['results'][profileLink]
                keys = about_info.keys()
                if "lives_in" in keys and about_info['lives_in'] != None:
                    return f"Lives in {about_info['lives_in']}"
                elif "from" in keys and about_info['from'] != None:
                    return f"From {about_info['from']}"
                elif "error" in keys:
                    return "Couldn't find it"
                else:
                    return "Not written"
            else:
                return location
        df['Location'] = df.apply(lambda x: f(x['Profile Link'], x['Location']), axis=1)
        worksheet.update([df.columns.values.tolist()] + df.values.tolist())
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

@celery.task()
def check():
    print("I am checking your stuff")
