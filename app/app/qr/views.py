from flask import render_template, request
from . import qr

@qr.route('/', methods=["GET"])
def send_redirect():
    id = request.args.get("id")
    return render_template('qr-redirect.html', page_id=id)