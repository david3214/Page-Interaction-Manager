"""Cloud Task workers"""
import json
from flask import Flask, request

from missionary_bot import MissionaryBot

app = Flask(__name__)

@app.route('/find_member_profiles', methods=['POST'])
def find_member_profiles():
    """Log the request payload."""
    payload = request.get_data(parse_form_data=True) or '(empty payload)'
    print('Received task with payload: {}'.format(payload))
    MissionaryBot(**json.loads(payload)).do_work_thread()
    return "Added data to queue"
# [END cloud_tasks_appengine_quickstart]


@app.route('/')
def hello():
    """Basic index to verify app is serving."""
    return 'Hello World!'


if __name__ == '__main__':
    # This is used when running locally. Gunicorn is used to run the
    # application on Google App Engine. See entrypoint in app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)
