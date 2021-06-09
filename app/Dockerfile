# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.7-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

ENV CLOUD_SQL_CONNECTION_NAME=eighth-vehicle-287322:us-central1:datab
ENV DATABASE_URL=***REMOVED***
ENV TEST_DATABASE_URL=mysql+pymysql://root:example@mysql:3306/testing
ENV DEV_DATABASE_URL=
ENV REDIS_URL=***REMOVED***
ENV TEST_REDIS_URL=***REMOVED***
ENV RABBITMQ_URL=amqps://ywxqrfya:***REMOVED***@albatross.rmq.cloudamqp.com/ywxqrfya
ENV TEST_RABBITMQ_URL=***REMOVED***
ENV PORT=5000
ENV CLIENT_SECRETS_FILE=***REMOVED***
ENV CELERY_BROKER_URL=amqps://ywxqrfya:***REMOVED***@albatross.rmq.cloudamqp.com/ywxqrfya
ENV CELERY_RESULT_BACKEND=***REMOVED***
ENV FLASK_CONFIG=testing
ENV APP_HOME /app

WORKDIR $APP_HOME
ADD ./requirements.txt requirements.txt
RUN pip install Flask gunicorn
RUN pip install -r requirements.txt

COPY ./app ./app
COPY .***REMOVED*** ***REMOVED***

# RUN celery -A celery_worker worker --loglevel=INFO -Q results
CMD exec gunicorn --bind :$PORT --workers 2 --threads 8 --timeout 0 "app:create_app()"