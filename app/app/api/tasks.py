from io import BytesIO

from celery.result import AsyncResult
from flask import jsonify, request, send_file, url_for

from .. import celery
from . import api


@api.route('/tasks', methods=["POST"])
def tasks():
    payload = request.get_json()
    task = celery.send_task(app=celery, name=payload['task_name'], 
                            kwargs=payload['task_info'])
    return jsonify({}), 202, {'Location': url_for('taskstatus', 
                                                task_id=task.id)}

@api.route('/tasks/<task_id>')
def taskstatus(task_id):
    res = AsyncResult(task_id, app=celery)
    if res.state == "SUCCESS":
        response = res.get()
    else:
        response = res.state
    return jsonify(response)

def serve_pil_image(pil_img):
    img_io = BytesIO()
    pil_img.save(img_io, 'PNG', quality=95)
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')
