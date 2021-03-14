# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.9-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

ENV DB_USER=***REMOVED***
ENV DB_PASS=***REMOVED***
ENV DB_NAME=page_interaction_manager
ENV CLOUD_SQL_CONNECTION_NAME=eighth-vehicle-287322:us-central1:datab
ENV OAUTHLIB_INSECURE_TRANSPORT=1

# Copy local code to the container image.
ENV APP_HOME /app
WORKDIR $APP_HOME
COPY . ./

# Install production dependencies.
RUN pip install Flask gunicorn
RUN pip install -r requirements.txt

# Run the web service on container startup. Here we use the gunicorn
# webserver, with one worker process and 8 threads.
# For environments with multiple CPU cores, increase the number of workers
# to be equal to the cores available.
CMD exec gunicorn --bind :$PORT --workers 2 --threads 8 --timeout 0 main:app