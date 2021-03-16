from flask import render_template

from .. import celery
from . import webhooks

@webhooks.route('facebook/webhook')
def index(request):
    """ recieve post request and create a task """
    if request.method == "GET":
        if request.args.get("hub.mode") == "subscribe" and request.args.get("hub.challenge"):
            if not request.args.get("hub.verify_token") == 'hambone':
                return "Verification token mismatch", 403
            return request.args["hub.challenge"], 200
        return render_template("index.html")

    if request.method == "POST":
        payload = request.get_json()
        task = celery.send_task(app=celery, name="tasks.insert_row_in_sheet", 
                            kwargs=payload)
        return ('', 200)
