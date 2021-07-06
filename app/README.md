# App
### Project containing the front and backend for the Page Interaction Manager

Prerequisites to running app:
- An app.env file with all your environment variables in the app directory
- A page_data.json file with all the data from the cloud sql database/page_interaction_manager
- [Docker](https://docs.docker.com/get-docker/) installed on your local machine
- [Python](https://www.python.org/downloads/) installed on your machine. (Currently Running fine on Python 3.9)
- VScode with Remote Containers extension
  - After Issue #14 this won't be necessary

## App.env file
File to house all the necessary variables used by the App project. Create the file and populate these fields
```
FLASK_CONFIG=testing
TEST_DATABASE_URL=
REDIS_URL=
CELERY_BROKER_URL=
CELERY_RESULT_BACKEND=
```
- **Flask Config** Tells the container the environment to run in. All of these environment variables are for the testing config
- **Test Database Url** Generally be mysql+pymysql://root:example@mysql:3306/testing based on db under the [docker-compose](/app/docker-compose.yaml) file
- **Redis Url** url will be the redis database hosted on [Heroku](https://dashboard.heroku.com/apps)
- **Celery Result Backend** same url as the redis url
- **Celery Broker URL** is the url for the rabbitMQ queue. Found on [CloudAMPQ](https://customer.cloudamqp.com/) Difference is this one starts with ampq not ampqs

## page_data.json

## Docker
Once you have docker installed you may also install the VScode extension called docker. This will make running the app much easier.

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
