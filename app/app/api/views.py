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
    return jsonify({}), 202, {'Location': url_for('api.task_status', 
                                                task_id=task.id)}

@api.route('/tasks/<task_id>', methods=["GET", "DELETE"])
def task_status(task_id):
    task = AsyncResult(task_id, app=celery)
    response = {}
    if request.method == "GET":
        if task.state == "SUCCESS":
            response['results'] = task.get(timeout=1)
        response['state'] = task.state
    elif request.method == "DELETE":
        AsyncResult(task_id, app=celery).forget()
    
    return jsonify(response), 200

def serve_pil_image(pil_img):
    img_io = BytesIO()
    pil_img.save(img_io, 'PNG', quality=95)
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')