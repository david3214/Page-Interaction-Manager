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
        # Add a test task
        response = self.client.post(
            '/api/v1/tasks',
            headers = {'content-type': 'application/json'},
            data=json.dumps({
                "task_name":"missionary_bot.tasks.test_task", 
                "task_info":{"text":"Hello, World", "type": "test"}
            }),
        )
        self.assertEqual(response.status_code, 202)
        json_response = json.loads(response.get_data(as_text=True))
        self.assertEqual(json_response, {})


    def test_bad_task_status(self):
        response = self.client.get(
            '/api/v1/tasks/0')
        self.assertEqual(response.json['state'], "PENDING")

    def test_get_profile_links_task(self):
        # Add a get_profile_links task
        response = self.client.post(
            '/api/v1/tasks',
            headers = {'content-type': 'application/json'},
            data=json.dumps({
                 "task_name":"missionary_bot.tasks.get_profile_links", 
                "task_info":{
                    "page_id": "103149398319188", 
                    "task_name": "missionary_bot.tasks.get_profile_links", 
                    "data": {"https://facebook.com/104293337915105_3889746227759913": ["Braden Dickerson", "June Arvin Loza"], "https://facebook.com/104293337915105_265739008437203": ["Judy Lemons George", "Arnold Nevarez", "Liesle Knight Winters", "Madeline Furstenau", "Hayden Urmston", "Jenn Doughty Talbot", "Joseph Ammendola"], "https://facebook.com/104293337915105_258980765663700": [
                        "Jeff Peleseuma", "Leiny Almendra", "Sunil Kumar", "Janet Starr", "Luis Schwichtenberg", "Wimalasuriya Wimalasuriya", "Peggy Schuchard", "Jonhy Herbert", "Ata Katoa", "Laraine Kearns", "Helga Silski", "Mel Andrew", "Terence Ahmod Johnson", "Aaron Barlow", "Koby Christensen", "Charles Kewish", "Zella Millard", "Tiesha Jensen Christensen", "Meleane Tohu'ia Ikahihifo", "Anaseini Fakava", "Kara Kienzynski", "Paul Kearns"]
                    },
                    "results":{}
                    }
            }),
        )
        self.assertEqual(response.status_code, 202)
        json_response = json.loads(response.get_data(as_text=True))
        self.assertEqual(json_response, {})