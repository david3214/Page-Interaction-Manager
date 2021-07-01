FROM python:3.7-slim

WORKDIR /app

<<<<<<< HEAD
ENV REDISCLOUD_URL=***REMOVED***
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/keys/worker_upload.json
ENV PROJECT_ID=eighth-vehicle-287322
ENV BUCKET_NAME=eighth-vehicle-287322.appspot.com

ENV RABBITMQ_URL=amqps://***REMOVED***@albatross.rmq.cloudamqp.com/ywxqrfya
ENV FACEBOOK_USERNAME=***REMOVED***
ENV FACEBOOK_PASSWORD=***REMOVED***
ENV FACEBOOK_LANGUAGE=japanese-kansai
ENV ***REMOVED***
ENV ***REMOVED***

=======
# Make sure to load environment variables to me
# REDISCLOUD_URL, GOOGLE_APPLICATION_CREDENTIAL, PROJECT_ID, BUCKET_NAME
# RABBITMQ_URL, FACEBOOK_USERNAME, FACEBOOK_PASSWORD
# FACEBOOK_LANGUAGE, CHURCH_USERNAME, CHURCH_PASSWORD
>>>>>>> c6aa773010b215b334354e5f741394f6048197a5

# Copy local code to the container image.
ADD requirements.txt .
RUN pip install -r requirements.txt

ADD . .

CMD celery -A missionary_bot.tasks worker --loglevel=INFO --concurrency=1
