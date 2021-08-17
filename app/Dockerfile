# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.7-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Make sure to pass these environment variables

# CLOUD_SQL_CONNECTION_NAME, DATABASE_URL, TEST_DATABASE_URL, DEV_DATABASE_URL
# RABBITMQ_URL, TEST_RABBITMQ_URL, CLIENT_SECRETS_FILE,
# CELERY_BROKER_URL, FLASK_CONFIG

ENV APP_HOME /app
ENV CLIENT_SECRETS_FILE=/keys/missionary_tools_client_secret.json

WORKDIR $APP_HOME

# Copy all the commands

COPY ./docker-commands/create-app.sh ./create-app.sh
COPY ./docker-commands/celery-cron.sh ./celery-cron.sh
COPY ./docker-commands/celery-worker.sh ./celery-worker.sh

RUN sed -i 's/\r$//g' ./create-app.sh
RUN chmod +x ./create-app.sh

RUN sed -i 's/\r$//g' ./celery-cron.sh
RUN chmod +x ./celery-cron.sh

RUN sed -i 's/\r$//g' ./celery-worker.sh
RUN chmod +x ./celery-worker.sh

# Add the rest of the project
ADD ./requirements.txt requirements.txt
RUN pip install Flask gunicorn
RUN pip install -r requirements.txt

COPY ./app ./app
COPY ./keys/missionary_tools_client_secret.json ${CLIENT_SECRETS_FILE}
COPY ./celery_worker.py celery_worker.py

EXPOSE ${PORT:-5000}

CMD ./create-app.sh