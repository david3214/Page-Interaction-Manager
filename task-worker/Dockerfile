FROM python:3.7-slim

WORKDIR /app

ENV REDISCLOUD_URL=***REMOVED***
ENV ***REMOVED***
ENV ***REMOVED***
ENV ***REMOVED***

ENV RABBITMQ_URL=amqps://ywxqrfya:***REMOVED***@albatross.rmq.cloudamqp.com/ywxqrfya
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
