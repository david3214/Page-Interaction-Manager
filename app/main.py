""" Used for interacting with redis and queue """
import flask
from google.protobuf import timestamp_pb2
from google.cloud import tasks_v2
from tasks import app as celeryApp
from celery.result import AsyncResult
import os
import json
import pickle
import gzip
import urllib.parse
import urllib.request.urlopen
from io import BytesIO
from pathlib import Path
import logging
import requests

import google.oauth2.credentials
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
import google_auth_oauthlib.flow
import googleapiclient.discovery
import sqlalchemy
import pandas as pd
import pyarrow as pa
from flask import Flask, request, send_file, jsonify, abort
import redis
from PIL import Image
import qrcode

redis_url = os.environ.get("REDIS_URL")
rabbitmq_url = os.environ.get("RABBITMQ_URL")
db_user = os.environ["DB_USER"]
db_pass = os.environ["DB_PASS"]
db_name = os.environ["DB_NAME"]
db_host = os.environ["DB_HOST"]
db_socket_dir = os.environ.get("DB_SOCKET_DIR", "/cloudsql")
cloud_sql_connection_name = os.environ["CLOUD_SQL_CONNECTION_NAME"]
project = os.environ.get("GCP_PROJECT")
location = os.environ.get("GCP_LOCATION")


url = urllib.parse.urlparse(rediscloud_url)
r = redis.Redis(host=url.hostname, port=url.port, password=url.password)


app = Flask(__name__)
context = pa.default_serialization_context()


@app.route('/')
def hello():
    """Basic index to verify app is serving."""
    return 'Hello World!'


@app.route('/bot', methods=['GET', 'POST', 'DELETE'])
def bot():
    args = request.args
    if request.method == "GET":
        church_username = urllib.parse.unquote_plus(args['church_username'])
        # Get status
        if r.exists(church_username + ":status"):
            try:
                pops = int(r.get(church_username + ":current_index"))
                area_book_results = context.deserialize(
                    r.get(church_username+':area_book_results'))
                long_status = f'There are {r.llen(church_username + ":facebook_search_results")} people in queue.\
          Status: {r.get(church_username + ":status").decode("utf-8")}\
          Total: {len(area_book_results.index)}\
          Completed: {pops}\
          Remaining: {len(area_book_results.index) - pops}'
                return long_status
            except Exception as e:
                print(e)
                return r.get(church_username + ":status")
        else:
            return "Bot not created yet"

    elif request.method == "POST":
        # Create Bot
        church_username = request.form['church_username']
        church_password = request.form['church_password']
        facebook_username = request.form['facebook_username']
        facebook_password = request.form['facebook_password']
        try:
            if (church_username == None or church_password == None or facebook_username == None or facebook_password == None):
                raise ValueError
            if r.exists(church_username + ":status"):
                return "Bot already exist"
            else:
                payload = request.form
                create_tasks_with_data_v2(
                    'http://35.224.213.80/find_member_profiles', payload)
                #create_tasks_with_data(project, location, queue, 'https://96.3.72.48/find_member_profiles', payload)
                return f"added bot {church_username}"
        except Exception as e:
            return f"Exception: {e}"

    elif request.method == "DELETE":
        # Remove bot
        church_username = urllib.parse.unquote_plus(args['church_username'])
        try:
            if r.exists(church_username + ":status"):
                r.delete(church_username + ":alive")
                r.delete(church_username + ":status")
                r.delete(church_username + ":current_index")
                r.delete(church_username + ':area_book_results')
                r.delete(church_username + ":facebook_key")
                r.delete(church_username + ":facebook_search_results")
                return f"Removed bot {church_username}"
        except:
            return "Missing bot name"
    return 'done'


@app.route("/get-next-profile")
def get_next_profile():
    args = request.args
    church_username = urllib.parse.unquote_plus(args['church_username'])
    if r.exists(church_username + ":status"):
        try:
            results = r.lpop(church_username + ":facebook_search_results")
            if results:
                results = gzip.decompress(results)
                r.incr(church_username + ":current_index")
            else:
                raise Exception
        except:
            results = {'about': 'No People Ready', 'content': ''}
        finally:
            return results
    else:
        return {'about': 'No bots with that name', 'content': ''}


"""
Add key for facebook 2 factor authentication
"""


@app.route("/add-key", methods=['POST'])
def add_key():
    try:
        if request.method == "POST":
            if request.form['key'] == "" or request.form['church_username'] == "":
                raise ValueError
            else:
                key = request.form['key']
                church_username = request.form['church_username']
                r.set(church_username + ":facebook_key", key)
                return "✅"
        else:
            return "❌"
    except Exception as e:
        print(e)
        return "❌"


def serve_pil_image(pil_img):
    img_io = BytesIO()
    pil_img.save(img_io, 'PNG', quality=95)
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')


jesus_bg = Image.open(urllib.request.urlopen(
    "https://storage.googleapis.com/eighth-vehicle-287322.appspot.com/qr-code/jesus_template.png").read())


@app.route('/pass_along_cards', methods=['GET'])
def pass_along_cards():
    """
    Take a string and encode onto a jesus background with qr code
    """
    try:
        assert request.args.get('text') is not None
        jesus_bg = Image.open(Path("jesus_template.png"))
        # Open the template
        img_bg = jesus_bg
        # Make the qr code
        qr = qrcode.QRCode(box_size=2, border=0)
        qr.add_data(request.args.get('text'))
        qr.make()
        img_qr = qr.make_image(fit=True)
        img_qr = img_qr.resize(
            (int(img_bg.size[0] * 0.53), int(img_bg.size[0] * 0.53)))
        # Paste the qr code onto the image
        pos = (int(img_bg.size[0] * 0.23), int(img_bg.size[1] * 0.65))
        img_bg.paste(img_qr, pos)
    finally:
        return serve_pil_image(img_bg)


@app.errorhandler(404)
def resource_not_found(e):
    return jsonify(error=str(e)), 404


@app.route('/tasks', methods=["GET", "POST"])
def tasks():
    if request.method == "GET":
        job_id = request.args['id']
        res = AsyncResult(job_id, app=celeryApp)
        if res.state == "SUCCESS":
            return res.get()
        else:
            return res.state

    elif request.method == "POST":
        payload = request.get_json()
        if payload['type'] == "scrape_profiles":
            celeryApp.create
            task = get_profile_links.apply_async((payload['data'],))
            return jsonify({}), 202, {'Location': url_for('taskstatus',
                                                          task_id=task.id)}


@app.route('/status/<task_id>')
def taskstatus(task_id):
    task = AsyncResult(task_id, app=celeryApp)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'current': 0,
            'total': 1,
            'status': 'Pending...'
        }
    elif task.state != 'FAILURE':
        response = {
            'state': task.state,
            'current': task.info.get('current', 0),
            'total': task.info.get('total', 1),
            'status': task.info.get('status', '')
        }
        if task.result:
            response['result'] = task.result
    else:
        # something went wrong in the background job
        response = {
            'state': task.state,
            'current': 1,
            'total': 1,
            'status': str(task.info),  # this is the exception raised
        }
    return jsonify(response)


# This variable specifies the name of a file that contains the OAuth 2.0
# information for this application, including its client_id and client_secret.
CLIENT_SECRETS_FILE = "client_secret.json"

# This OAuth 2.0 access scope allows for full read/write access to the
# authenticated user's account and requires requests to use an SSL connection.
SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/script.container.ui",
          "https://www.googleapis.com/auth/script.external_request", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/script.scriptapp"]
API_SERVICE_NAME = 'sheets'
API_VERSION = 'v4'
logger = logging.getLogger()

app = flask.Flask(__name__)
# Note: A secret key is included in the sample so that it works.
# If you use this code in your application, replace this with a truly secret
# key. See https://flask.palletsprojects.com/quickstart/#sessions.
app.secret_key = 'REPLACE ME - this value is here as a placeholder.'


def init_connection_engine():
    db_config = {
        "pool_size": 5,
        "pool_timeout": 30,  # 30 seconds
        "pool_recycle": 1800,  # 30 minutes

    }

    if os.environ.get("DB_HOST"):
        return init_tcp_connection_engine(db_config)
    else:
        return init_unix_connection_engine(db_config)


def init_tcp_connection_engine(db_config):
    db_user = os.environ["DB_USER"]
    db_pass = os.environ["DB_PASS"]
    db_name = os.environ["DB_NAME"]
    db_host = os.environ["DB_HOST"]

    host_args = db_host.split(":")
    db_hostname, db_port = host_args[0], int(host_args[1])

    pool = sqlalchemy.create_engine(
        sqlalchemy.engine.url.URL(
            drivername="mysql+pymysql",
            username=db_user,
            password=db_pass,
            host=db_hostname,
            port=db_port,
            database=db_name,
        ),
        **db_config
    )

    return pool


def init_unix_connection_engine(db_config):
    db_user = mysql_user
    db_pass = mysql_password
    db_name = os.environ["DB_NAME"]
    db_socket_dir = os.environ.get("DB_SOCKET_DIR", "/cloudsql")
    cloud_sql_connection_name = os.environ["CLOUD_SQL_CONNECTION_NAME"]

    pool = sqlalchemy.create_engine(
        sqlalchemy.engine.url.URL(
            drivername="mysql+pymysql",
            username=db_user,
            password=db_pass,
            database=db_name,
            query={
                "unix_socket": "{}/{}".format(
                    db_socket_dir,
                    cloud_sql_connection_name)
            }
        ),
        **db_config
    )

    return pool


# This global variable is declared with a value of `None`, instead of calling
# `init_connection_engine()` immediately, to simplify testing. In general, it
# is safe to initialize your database connection pool when your script starts
# -- there is no need to wait for the first request.
db = None


@app.before_first_request
def create_tables():
    global db
    db = db or init_connection_engine()
    # Create tables (if they don't already exist)
    with db.connect() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users ("
            "user_id VARCHAR(100) NOT NULL, "
            'id_token VARCHAR(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, '
            'PRIMARY KEY (user_id));'
        )


def insert_user(id, id_token):
    stmt = sqlalchemy.text(
        "REPLACE INTO users (user_id, id_token)" " VALUES (:id, :id_token)"
    )
    try:
        with db.connect() as conn:
            conn.execute(stmt, id=id, id_token=json.dumps(id_token))
    except Exception as e:
        logger.exception(e)

    return True


@app.route('/')
def index():
    return print_index_table()


@app.route('/test')
def test_api_request():
    if 'credentials' not in flask.session:
        return flask.redirect('authorize')

    # Load credentials from the session.
    credentials = google.oauth2.credentials.Credentials(
        **flask.session['credentials'])

    service = googleapiclient.discovery.build(
        API_SERVICE_NAME, API_VERSION, credentials=credentials)

    # Save credentials back to session in case access token was refreshed.
    # ACTION ITEM: In a production app, you likely want to save these
    #              credentials in a persistent database instead.
    flask.session['credentials'] = credentials_to_dict(credentials)
    if credentials.scopes == SCOPES:
        return ('<p>Success! You can close this page.</p>')
    else:
        return ('<p>All scopes are required for the app to work.</p>')


@app.route('/authorize')
def authorize():
    # Create flow instance to manage the OAuth 2.0 Authorization Grant Flow steps.
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES)

    # The URI created here must exactly match one of the authorized redirect URIs
    # for the OAuth 2.0 client, which you configured in the API Console. If this
    # value doesn't match an authorized URI, you will get a 'redirect_uri_mismatch'
    # error.
    flow.redirect_uri = flask.url_for(
        'oauth2callback', _external=True, _scheme='https')

    authorization_url, state = flow.authorization_url(
        # Enable offline access so that you can refresh an access token without
        # re-prompting the user for permission. Recommended for web server apps.
        access_type='offline',
        # Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes='true')

    # Store the state so the callback can verify the auth server response.
    flask.session['state'] = state

    return flask.redirect(authorization_url)


@app.route('/oauth2callback')
def oauth2callback():
    # Specify the state when creating the flow in the callback so that it can
    # verified in the authorization server response.
    state = flask.session['state']

    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state)
    flow.redirect_uri = flask.url_for(
        'oauth2callback', _external=True, _scheme='https')

    # Use the authorization server's response to fetch the OAuth 2.0 tokens.
    authorization_response = flask.request.url
    flow.fetch_token(authorization_response=authorization_response)

    # Store credentials in the session.
    # ACTION ITEM: In a production app, you likely want to save these
    #              credentials in a persistent database instead.
    credentials = flow.credentials
    flask.session['credentials'] = credentials_to_dict(credentials)
    request = grequests.Request()
    id_info = id_token.verify_oauth2_token(
        credentials.id_token, request, flow.client_config['client_id'])
    if credentials.refresh_token:
        insert_user(id_info['sub'], {
                    'refresh_token': credentials.refresh_token, 'email': id_info['email'], 'name': id_info['name']})

    return flask.redirect(flask.url_for('test_api_request'))


@app.route('/revoke')
def revoke():
    if 'credentials' not in flask.session:
        return ('You need to <a href="/authorize">authorize</a> before ' +
                'testing the code to revoke credentials.')

    credentials = google.oauth2.credentials.Credentials(
        **flask.session['credentials'])

    revoke = requests.post('https://oauth2.googleapis.com/revoke',
                           params={'token': credentials.token},
                           headers={'content-type': 'application/x-www-form-urlencoded'})

    status_code = getattr(revoke, 'status_code')
    if status_code == 200:
        return('Credentials successfully revoked.' + print_index_table())
    else:
        return('An error occurred.' + print_index_table())


@app.route('/clear')
def clear_credentials():
    if 'credentials' in flask.session:
        del flask.session['credentials']
    return ('Credentials have been cleared.<br><br>' +
            print_index_table())


@app.route('/google46b0d5ef2ffda0c5.html')
def google_verification():
    return flask.render_template('google46b0d5ef2ffda0c5.html')


def credentials_to_dict(credentials):
    return {'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes}


def print_index_table():
    return ('<table>' +
            '<tr><td><a href="/test">Test an API request</a></td>' +
            '<td>Submit an API request and see a formatted JSON response. ' +
            '    Go through the authorization flow if there are no stored ' +
            '    credentials for the user.</td></tr>' +
            '<tr><td><a href="/authorize">Test the auth flow directly</a></td>' +
            '<td>Go directly to the authorization flow. If there are stored ' +
            '    credentials, you still might not be prompted to reauthorize ' +
            '    the application.</td></tr>' +
            '<tr><td><a href="/revoke">Revoke current credentials</a></td>' +
            '<td>Revoke the access token associated with the current user ' +
            '    session. After revoking credentials, if you go to the test ' +
            '    page, you should see an <code>invalid_grant</code> error.' +
            '</td></tr>' +
            '<tr><td><a href="/clear">Clear Flask session credentials</a></td>' +
            '<td>Clear the access token currently stored in the user session. ' +
            '    After clearing the token, if you <a href="/test">test the ' +
            '    API request</a> again, you should go back to the auth flow.' +
            '</td></tr></table>')


if __name__ == '__main__':
    # When running locally, disable OAuthlib's HTTPs verification.
    # ACTION ITEM for developers:
    #     When running in production *do not* leave this option enabled.
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

    # Specify a hostname and port that are set as a valid redirect URI
    # for your API project in the Google API Console.
    app.run('localhost', 8080, debug=True)


# recieve post request and create a task

def index(request):
    if request.method == "GET":
        if request.args.get("hub.mode") == "subscribe" and request.args.get("hub.challenge"):
            if not request.args.get("hub.verify_token") == 'hambone':
                return "Verification token mismatch", 403
            return request.args["hub.challenge"], 200
        return flask.render_template("index.html")

    if request.method == "POST":
        # Create a client.
        client = tasks_v2.CloudTasksClient()

        # Inital settings
        project = 'eighth-vehicle-287322'
        queue = 'facebook-webhook'
        location = 'us-central1'
        url = 'https://script.google.com/macros/s/AKfycbyntJvxGIZalY9QGLCv89H_OBSFdSJARHyhpWxJo4II_SpgSIxW/exec'
        payload = request.get_json()

        # Construct the fully qualified queue name.
        parent = client.queue_path(project, location, queue)

        # Construct the request body.
        task = {
            "http_request": {  # Specify the type of request.
                "http_method": tasks_v2.HttpMethod.POST,
                "url": url,  # The full url path that the task will be sent to.
            }
        }
        if payload is not None:
            if isinstance(payload, dict):
                # Convert dict to JSON string
                payload = json.dumps(payload)
                # specify http content-type to application/json
                task["http_request"]["headers"] = {
                    "Content-type": "application/json"}

            # The API expects a payload of type bytes.
            converted_payload = payload.encode()

            # Add the payload to the request.
            task["http_request"]["body"] = converted_payload

        # Use the client to build and send the task.
        client.create_task(request={"parent": parent, "task": task})

        return ('', 200)


# Send help instruction
@app.route("/help")
def help():
    return """Watch the video to learn how to use this program"""


@app.route("/privacy")
def privacy():
    return render_template('privacy.html')


@app.route("/")
def main():
    return render_template('index.html')


@app.route("/support")
def support():
    return "Email me at ***REMOVED***"


@app.route("/post-install-tip")
def post_install_tip():
    return "Click the run addon button"


@app.route("/terms-of-service")
def terms_of_service():
    return render_template('terms_of_service.html')


@app.route('/google46b0d5ef2ffda0c5.html')
def google_verification():
    return render_template('google46b0d5ef2ffda0c5.html')


@app.route('/assets/<path:path>')
def send_assets(path):
    return send_from_directory('assets', path)


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True, ssl_context='adhoc')
