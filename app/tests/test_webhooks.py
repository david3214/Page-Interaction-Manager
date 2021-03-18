import unittest
from flask import current_app
from app import create_app, db


class WebhookTestCase(unittest.TestCase):
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

    def test_facebook_webhook_get(self):
        args = {}
        args['hub.verify_token'] = "hambone"
        args['hub.challenge'] = 42
        args['hub.mode'] = "subscribe"

        response = self.client.get(
            '/webhooks/v1/facebook',
            query_string=args
        )
        self.assertEqual(response.status_code, 200)

    def test_facebook_webhook_post(self):
        test_event = {"object":"page","entry":[{"id":"103149398319188","time":1609656118325,"messaging":[{"sender":{"id":"3424692677644577"},"recipient":{"id":"103149398319188"},"timestamp":1609656118099,"message":{"mid":"m_ABt4i4wZIOP21KTsxMwTaHlgf8qsN5F1_pYhFwXvsac2EfSPOAzvt8s8WqxZHjsJUT4OHm8W49PFJtBJ3ITjIg","text":"aa"}}]}]}
        response = self.client.post(
            '/webhooks/v1/facebook',
            headers = {'content-type': 'application/json'},
            json=test_event
        )
        self.assertEqual(response.status_code, 200)