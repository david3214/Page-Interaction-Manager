import unittest
import json
from flask import current_app
from app import create_app, db
from app.auth.views import insert_user
from app.models import User


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

    def test_insert_user(self):
        insert_user(100, {"name": "testing", "email": "fake@gmail.com"})

        myUser = User.query.get('100')
        self.assertEquals(myUser.user_id, '100')
        self.assertEquals(myUser.id_token, '{"name": "testing", "email": "fake@gmail.com"}')