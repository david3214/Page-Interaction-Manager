# App
### Project containing the front and backend for the Page Interaction Manager

Prerequisites to running app:
- [app.env](#user-content-appenv) file with all your environment variables in the app directory
- [Cloud SQL Proxy](#user-content-cloud-sql-proxy) used for generating the page_data.json
- [page_data.json](#user-content-page_datajson) file with all the data from the cloud sql database/page_interaction_manager
- [cloud_sql_proxy_key.json](#user-content-cloud_sql_proxy_keyjson) file with credentials tied to the google cloud project
- [Docker](#user-content-docker) installed on your local machine
- [Python](https://www.python.org/downloads/) installed on your machine. (Currently Running fine on Python 3.9)
- [VScode](#user-content-remote-containers-extension) with Remote Containers extension
  - Not necessary but very convienent

## App.env file
File to house all the necessary variables used by the App project. Create the file and populate these fields
```
FLASK_CONFIG=testing
TEST_DATABASE_URL=
CELERY_BROKER_URL=
```
- **Flask Config** Tells the container the environment to run in. All of these environment variables are for the testing config
- **Test Database Url** Generally be mysql+pymysql://root:example@mysql:3306/testing based on db under the [docker-compose](/app/docker-compose.yaml) file
- **Celery Broker URL** is the url for the rabbitMQ queue. Found on [CloudAMPQ](https://customer.cloudamqp.com/) Difference is this one starts with ampq not ampqs

## Cloud SQL Proxy

Install [Cloud SQL Proxy](https://cloud.google.com/sql/docs/mysql/connect-admin-proxy#install). This is honestly kinda jank. 
Get [gcloud](https://cloud.google.com/sdk/gcloud) as well to find your instance_connection_name

Once you have it installed run this command. Your Key file is obtained from our cloud_sql_proxy service account on the google cloud project.
To generate a key file go to the projects service accounts, found [here](https://console.cloud.google.com/iam-admin/serviceaccounts?project=eighth-vehicle-287322&supportedpurview=project). 
Choose the service account labeled cloud_sql_proxy, then go to the keys section and choose add key to generate your key file as a json file.

`./cloud_sql_proxy -instances=INSTANCE_CONNECTION_NAM=tcp:3306 -credential_file=PATH_TO_KEY_FILE`

Once cloud_sql_proxy is running you can connect to your database via localhost:3306

## page_data.json

Once you have [Cloud SQL Proxy](#user-content-cloud-sql-proxy) up and running use your favorite database tool to access the database.

I have used [DBeaver](https://dbeaver.io/) to view my database with a decent experience.
For most testing you will want just one page saved. Once you have the database open you will want to save your testing pages data in app/tests/page_data.json
Format should be:

```
{
	"page_data": [
		{
			"page_id": 12345....,
			"page_details": "{...}"
		}
	]
}
```

## cloud_sql_proxy_key.json

Create a new key [here](https://console.cloud.google.com/iam-admin/serviceaccounts/details/109372204229314385514/keys?project=eighth-vehicle-287322). Save it as a json file and be sure not to lose it otherwise you'll need to create a new one and delete the old.

Save the file in app/keys/cloud_sql_proxy_key.json (not app/app/keys/cloud_sql_proxy.json)

## Docker

Once you have [Docker](https://docs.docker.com/get-docker/) installed you may also install the VScode extension called docker. 
This will make running the app much easier.

App right now is a bit more complicated than running task-worker

## Remote Containers Extension

This is important because you need to get inside the docker container once it is up.

After installing open up just the `app` folder in VSCode. A popup should appear asking if you would like to open it up in a developement container. 
(If it doesn't reach out to @david3214 and He'll help you troubleshoot it and/or use it)

Once it opens up App in a developement container, which will take a second, go to tests/test_tasks.py

type ctrl + shift + p > Type Python: Discover Tests
- use the default python path if it asks for it
- choose unittest
- Run discover tests again

at this point if it isn't discovering your tests a .vscode folder should have been made. 
Type this into the settings.json and it should be able to discover your tests
```
{
  "python.pythonPath": "/usr/local/bin/python",
  "python.testing.nosetestArgs": [
    "tests"
  ],
  "python.testing.pytestEnabled": false,
  "python.testing.unittestEnabled": true,
  "python.testing.nosetestsEnabled": false,
  "python.testing.unittestArgs": [
    "-v",
    "-s",
    "./tests",
    "-p",
    "test_*.py"
  ]
}
```

Now that tests are discovered go to test_tasks.py again and go to the last test, test_update_all_profile_links.
Create a breakpoint on the line with self.assertTrue(...)

Click Debug test, which should now appear above the name of the test. Once your code pauses at the breakpoint leave it here.

Open up a new terminal in the same dev vscode window. Type `celery -A celery_worker worker --loglevel=INFO -Q results` and hit enter.

Once you have those up, leave them running and run the task-worker. 
You should now have all parts of the project up and running and everyone's sheets should be updating.

*We know this is jank, and plan to resolve it with a future update*
