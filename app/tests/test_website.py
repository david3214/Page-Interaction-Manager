import json
import unittest
import unittest.mock

from flask import Flask

import unittest
from flask import current_app, url_for
from flask.templating import render_template
from app import create_app, db


class WebsiteTestCase(unittest.TestCase):
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

    def test_home_page(self):
        response = self.client.get('/')
        self.assertEquals(response.status_code, 200)
        self.assertTrue(response.data.find(b'Home') != -1)

    def test_help_page(self):
        response = self.client.get('/help')
        self.assertEquals(response.status_code, 200)
        self.assertEquals(response.data, b'Watch the video to learn how to use this program')

    def test_privacy_page(self):
        response = self.client.get('/privacy')
        self.assertEquals(response.status_code, 200)
        self.assertTrue(response.data.find(b'Privacy Policy') != -1)

    def test_support_page(self):
        response = self.client.get('/support')
        self.assertEquals(response.status_code, 200)
        self.assertEquals(response.data, b'Email me at graham.harrison@missionary.org')

    def test_post_install_tip_page(self):
        response = self.client.get('/post-install-tip')
        self.assertEquals(response.status_code, 200)
        self.assertEquals(response.data, b'Click the run addon button')

    def test_terms_of_service_page(self):
        response = self.client.get('/terms-of-service')
        self.assertEquals(response.status_code, 200)
        self.assertTrue(response.data.find(b'Terms and Conditions') != -1)

    def test_google_verification_page(self):
        response = self.client.get('/google46b0d5ef2ffda0c5.html')
        self.assertEquals(response.status_code, 200)
        self.assertTrue(response.data.find(b'google-site-verification: google46b0d5ef2ffda0c5.html') != -1)

    def test_assets_page(self):
        response = self.client.get('/assets/test.html')
        self.assertEquals(response.status_code, 200)
        self.assertTrue(response.data.find(b'Log In with the JavaScript SDK') != -1)
