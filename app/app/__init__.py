import urllib.parse

import redis
import pyarrow as pa
from celery.app.base import Celery
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

from .config import config, Config

db = SQLAlchemy()
url = urllib.parse.urlparse(Config.REDIS_URL)
r = redis.Redis(host=url.hostname, port=url.port, password=url.password)
celery = Celery(__name__, broker=Config.CELERY_BROKER_URL, backend=Config.CELERY_RESULT_BACKEND)
context = pa.default_serialization_context()

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    db.init_app(app)
    celery.conf.update(app.config)
    
    from .website import website as website_blueprint
    app.register_blueprint(website_blueprint)

    from .api import api as api_blueprint
    app.register_blueprint(api_blueprint, url_prefix='/api/v1')

    from .webhooks import webhooks as webhooks
    app.register_blueprint(webhooks, url_prefix='/webhooks/v1')

    from .auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix='/auth')

    return app
