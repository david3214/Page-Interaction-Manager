import unittest
import json
from flask import current_app
from app import create_app, db

class APITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_tasks(self):
        # Add a task
        response = self.client.post(
            '/api/v1/tasks',
            headers = {'content-type': 'application/json'},
            data=json.dumps({"task_name":"tasks.test", "task_info":{"text":"Hello, World"}}),
            )
        self.assertEqual(response.status_code, 202)
        json_response = json.loads(response.get_data(as_text=True))
        self.assertEqual(json_response, {})


    def test_bad_task_status(self):
        response = self.client.get(
            '/api/v1/tasks/0')
        self.assertEqual(response.json['state'], "PENDING")