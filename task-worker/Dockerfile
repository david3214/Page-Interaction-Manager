FROM python:3.7-slim

WORKDIR /app

ENV REDISCLOUD_URL=***REMOVED***
ENV ***REMOVED***
ENV ***REMOVED***
ENV ***REMOVED***

ENV RABBITMQ_URL=***REMOVED***
ENV FACEBOOK_USERNAME=***REMOVED***
ENV FACEBOOK_PASSWORD=***REMOVED***
ENV FACEBOOK_LANGUAGE=japanese-kansai
env ***REMOVED***
env ***REMOVED***



# Copy local code to the container image.
ADD requirements.txt .
RUN pip install -r requirements.txt

ADD . .

CMD celery -A tasks worker --loglevel=INFO
