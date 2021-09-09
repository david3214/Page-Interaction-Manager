from flask import Blueprint

qr = Blueprint('qr', __name__)

from . import views
