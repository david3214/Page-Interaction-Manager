"""Create a task for a given queue with an arbitrary payload."""

from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
import json
import flask

# recieve post request and create a task
@app.route('/', methods=['POST'])
def index():
    if request.method == "GET":
        if request.parameter['hub.verify_token'] == 'hambone':
            return (request.parameter['hub.challenge'], 200)

    # Create a client.
    client = tasks_v2.CloudTasksClient()

    project = 'eighth-vehicle-287322'
    queue = 'my-queue'
    location = 'us-central1'
    url = 'https://script.google.com/macros/s/AKfycbyntJvxGIZalY9QGLCv89H_OBSFdSJARHyhpWxJo4II_SpgSIxW/exec?event_type=' + request.parameter.event_type
    payload = request.get_json()

    # Construct the fully qualified queue name.
    parent = client.queue_path(project, location, queue)

    # Construct the request body.
    task = {
        "http_request": {  # Specify the type of request.
            "http_method": tasks_v2.HttpMethod.POST,
            "url": url,  # The full url path that the task will be sent to.
        }
    }
    if payload is not None:
        if isinstance(payload, dict):
            # Convert dict to JSON string
            payload = json.dumps(payload)
            # specify http content-type to application/json
            task["http_request"]["headers"] = {"Content-type": "application/json"}

        # The API expects a payload of type bytes.
        converted_payload = payload.encode()

        # Add the payload to the request.
        task["http_request"]["body"] = converted_payload

    # Use the client to build and send the task.
    response = client.create_task(request={"parent": parent, "task": task})

    return ('', 200)

"""
Flask==1.1.2
google-cloud-tasks==2.0.0
"""