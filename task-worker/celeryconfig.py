import os

## Broker settings.
broker_url = os.getenv("RABBITMQ_URL")

result_backend = "rpc://"

# List of modules to import when the Celery worker starts.
imports = ('tasks',)