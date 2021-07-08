# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.7-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Make sure to pass these environment variables

# CLOUD_SQL_CONNECTION_NAME, DATABASE_URL, TEST_DATABASE_URL, DEV_DATABASE_URL
# REDIS_URL, TEST_REDIS_URL, RABBITMQ_URL, TEST_RABBITMQ_URL
# CLIENT_SECRETS_FILE, CELERY_BROKER_URL, CELERY_RESULT_BACKEND, FLASK_CONFIG

ENV PORT=5000
ENV APP_HOME /app
ENV CLIENT_SECRETS_FILE=/keys/missionary_tools_client_secret.json

WORKDIR $APP_HOME
ADD ./requirements.txt requirements.txt
RUN pip install Flask gunicorn
RUN pip install -r requirements.txt

COPY ./app ./app
COPY ./keys/missionary_tools_client_secret.json ${CLIENT_SECRETS_FILE}

# RUN celery -A celery_worker worker --loglevel=INFO -Q results
CMD exec gunicorn --bind :$PORT --workers 2 --threads 8 --timeout 0 "app:create_app()"