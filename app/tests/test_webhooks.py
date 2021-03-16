import unittest
from flask import current_app
from app import create_app, db


class TestWebhook(unittest.TestCase):
    def test_webhook_get(self):
        args = {}
        args['hub.verify_token'] = "hambone"
        args['hub.challenge'] = 42
        args['hub.mode'] = "subscribe"
        req = unittest.mock.Mock(method="GET", args=args)

        # Call tested function
        assert app.index(req) == (42, 200)

    def test_webhook_post(self):
        req = unittest.mock.Mock(method="POST")
        req.get_json = lambda : {"object":"page","entry":[{"id":"103149398319188","time":1609656118325,"messaging":[{"sender":{"id":"3424692677644577"},"recipient":{"id":"103149398319188"},"timestamp":1609656118099,"message":{"mid":"m_ABt4i4wZIOP21KTsxMwTaHlgf8qsN5F1_pYhFwXvsac2EfSPOAzvt8s8WqxZHjsJUT4OHm8W49PFJtBJ3ITjIg","text":"aa"}}]}]}

        assert app.index(req) == ("", 200)
