import os
from app import celery, create_app

foo = create_app(os.getenv('FLASK_CONFIG') or 'default')
foo.app_context().push()