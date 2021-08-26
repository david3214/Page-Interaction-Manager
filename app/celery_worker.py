import os
from app import celery, create_app
from celery.schedules import crontab

foo = create_app(os.getenv('FLASK_CONFIG') or 'default')
foo.app_context().push()

# celery.conf.CELERYBEAT_SCHEDULE = {
#     "run-every-ten-seconds": {
#         "task": "app.worker.tasks.update_all_profile_links",
#         "schedule": crontab(minute=0, hour=2, day_of_week=4),
#         "options": {'queue': 'results'}
#     }
# }
