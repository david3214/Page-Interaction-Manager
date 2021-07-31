from flask import render_template, request

from .. import celery
from . import webhooks

@webhooks.route('/facebook', methods=["GET", "POST"])
def facebook_webhook():
    """ recieve post request and create a task """
    if request.method == "GET":
        if request.args.get("hub.mode") == "subscribe" and request.args.get("hub.challenge"):
            if not request.args.get("hub.verify_token") == 'hambone':
                return "Verification token mismatch", 403
            return request.args["hub.challenge"], 200
        return render_template("index.html")

    if request.method == "POST":
        try:
            payload = request.get_json()
            celery.send_task(app=celery, name="app.worker.tasks.insert_row_into_sheet", 
                                kwargs={'task_info': payload}, queue='webhook')
        finally:
            return ('', 200)
