FROM python:3.7-slim

WORKDIR /app

# Make sure to load environment variables to me
# REDISCLOUD_URL, GOOGLE_APPLICATION_CREDENTIAL, PROJECT_ID, BUCKET_NAME
# RABBITMQ_URL, FACEBOOK_USERNAME, FACEBOOK_PASSWORD
# FACEBOOK_LANGUAGE, CHURCH_USERNAME, CHURCH_PASSWORD

# Copy local code to the container image.
ADD requirements.txt .
RUN pip install -r requirements.txt

ADD . .

CMD celery -A missionary_bot.tasks worker --loglevel=INFO --concurrency=1
