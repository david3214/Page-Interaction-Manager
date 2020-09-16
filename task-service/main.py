"""Cloud Task workers"""
import json
from flask import Flask, request

from missionary_bot import MissionaryBot

app = Flask(__name__)

@app.route('/find_member_profiles', methods=['POST'])
def find_member_profiles():
    """Log the request payload."""
    payload = request.get_data(as_text=True) or '(empty payload)'
    print('Received task with payload: {}'.format(payload))
    try:
        MissionaryBot(**json.loads(payload)).do_work()
    except Exception as e:
        return f"{e} Didn't completed loading Facebook profile information"
    return "Completed loading Facebook profile information"


@app.route('/')
def hello():
    """Basic index to verify app is serving."""
    return 'Hello World!'


@app.route('/liveness_check')
def liveness_check():
    return "OK"

@app.route('/readiness_check')
def readiness_check():
    return "OK"


if __name__ == '__main__':
    # This is used when running locally. Gunicorn is used to run the
    # application on Google App Engine. See entrypoint in app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)
