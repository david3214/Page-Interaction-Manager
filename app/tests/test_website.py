import json
import unittest
import unittest.mock

import pytest
from flask import Flask

import unittest
from flask import current_app, url_for
from app import create_app, db


class WebsiteTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client(use_cookies=True)

    def test_home_page(self):
        self.app = create_app('testing')
        response = self.client.get(url_for('website.index'))
        self.assertEquals(response.status_code, 200)