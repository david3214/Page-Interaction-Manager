FROM python:3.7-slim

WORKDIR /app

ENV REDISCLOUD_URL=***REMOVED***
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/keys/worker_upload.json
ENV PROJECT_ID=eighth-vehicle-287322
ENV BUCKET_NAME=eighth-vehicle-287322.appspot.com

ENV RABBITMQ_URL=***REMOVED***
ENV FACEBOOK_USERNAME=***REMOVED***
ENV FACEBOOK_PASSWORD=***REMOVED***
ENV FACEBOOK_LANGUAGE=japanese-kansai
ENV ***REMOVED***
ENV ***REMOVED***


# Copy local code to the container image.
ADD requirements.txt .
RUN pip install -r requirements.txt

ADD . .

CMD celery -A missionary_bot.tasks worker --loglevel=INFO --concurrency=1
