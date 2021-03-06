BROKER_HOST = "localhost"
BROKER_PORT = 5672
BROKER_USER = "myuser"
BROKER_PASSWORD = "mypassword"
BROKER_VHOST = "myvhost"

CELERY_RESULT_BACKEND = "amqp"

CELERY_IMPORTS = ("tasks", )

# celeryd --loglevel=INFO

CELERY_RESULT_BACKEND = "amqp"

#: We want the results to expire in 5 minutes, note that this requires
#: RabbitMQ version 2.1.1 or higher, so please comment out if you have
#: an earlier version.
CELERY_AMQP_TASK_RESULT_EXPIRES = 300

BROKER_TRANSPORT = "redis"

BROKER_HOST = "localhost"  # Maps to redis host.
BROKER_PORT = 6379         # Maps to redis port.
BROKER_VHOST = "0"         # Maps to database number.

CELERY_RESULT_BACKEND = "redis"
CELERY_REDIS_HOST = "localhost"
CELERY_REDIS_PORT = 6379
CELERY_REDIS_DB = 0
