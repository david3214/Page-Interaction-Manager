
@app.route('/api/bot', methods=['GET', 'POST', 'DELETE'])
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
    DB_USER = os.environ["DB_USER"]
    DB_PASS = os.environ["DB_PASS"]
    DB_NAME = os.environ["DB_NAME"]
    DB_HOST = os.environ["DB_HOST"]

    host_args = DB_HOST.split(":")
    db_hostname, db_port = host_args[0], int(host_args[1])

    pool = sqlalchemy.create_engine(
        sqlalchemy.engine.url.URL(
            drivername="mysql+pymysql",
            username=DB_USER,
            password=DB_PASS,
            host=db_hostname,
            port=db_port,
            database=DB_NAME,
        ),
        **db_config
    )

    return pool


def init_unix_connection_engine(db_config):
    DB_USER = os.environ["DB_USER"]
    DB_PASS = os.environ["DB_PASS"]
    DB_NAME = os.environ["DB_NAME"]
    db_socket_dir = os.environ.get("DB_SOCKET_DIR", "/cloudsql")
    cloud_sql_connection_name = os.environ["CLOUD_SQL_CONNECTION_NAME"]

    pool = sqlalchemy.create_engine(
        sqlalchemy.engine.url.URL(
            drivername="mysql+pymysql",
            username=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
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

import sqlalchemy as db

# specify database configurations
config = {
    'host': 'localhost',
    'port': 3306,
    'user': '***REMOVED***',
    'password': '***REMOVED***',
    'database': 'page_interaction_manager'
}
db_user = config.get('user')
db_pwd = config.get('password')
db_host = config.get('host')
db_port = config.get('port')
db_name = config.get('database')
# specify connection string
connection_str = f'mysql+pymysql://{db_user}:{db_pwd}@{db_host}:{db_port}/{db_name}'
# connect to database
engine = sqlalchemy.create_engine(connection_str)
connection = engine.connect()
# pull metadata of a table
metadata = sqlalchemy.MetaData(bind=engine)
metadata.reflect(only=['test_table'])

test_table = metadata.tables['test_table']
test_table

SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/script.container.ui",
        "https://www.googleapis.com/auth/script.external_request", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/script.scriptapp"]
API_SERVICE_NAME = 'sheets'
API_VERSION = 'v4'




if __name__ == '__main__':
    # os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    app.run(host='127.0.0.1', port=5000, debug=True, ssl_context='adhoc')




from flask_sqlalchemy import SQLAlchemy
from google.auth.transport import requests as grequests
from google.cloud import tasks_v2
from google.oauth2 import id_token
from google.protobuf import timestamp_pb2
import pandas as pd

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

with open("/workspaces/missionary-tools/appscript/page_interaction/mock_data.json") as f:
  mock_data = json.load(f)