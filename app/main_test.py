import pytest
import json

from flask import Flask

import main

with open("/workspaces/missionary-tools/appscript/page_interaction/mock_data.json") as f:
  mock_data = json.load(f)

@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv('REDISCLOUD_URL', '***REMOVED***')
    main.app.testing = True
    return main.app.test_client()


def test_index(app):
    r = app.get('/')
    assert r.status_code == 200

def test_tasks(app):
    mimetype = 'application/json'
    headers = {
        'Content-Type': mimetype,
        'Accept': mimetype
    }

    data = {"type":"scrape_profiles", "data":{"https://facebook.com/104293337915105_3889746227759913":["Braden Dickerson","June Arvin Loza"],"https://facebook.com/104293337915105_265739008437203":["Judy Lemons George","Arnold Nevarez","Liesle Knight Winters","Madeline Furstenau","Hayden Urmston","Jenn Doughty Talbot","Joseph Ammendola"],"https://facebook.com/104293337915105_258980765663700":["Jeff Peleseuma","Leiny Almendra","Sunil Kumar","Janet Starr","Luis Schwichtenberg","Wimalasuriya Wimalasuriya","Peggy Schuchard","Jonhy Herbert","Ata Katoa","Laraine Kearns","Helga Silski","Mel Andrew","Terence Ahmod Johnson","Aaron Barlow","Koby Christensen","Charles Kewish","Zella Millard","Tiesha Jensen Christensen","Meleane Tohu'ia Ikahihifo","Anaseini Fakava","Kara Kienzynski","Paul Kearns"]}}
    url = '/tasks'

    response = app.post(url, data=json.dumps(data), headers=headers)

    assert response.content_type == mimetype
    assert response.location
    print(response.location)

import unittest
import unittest.mock
import json

import main

class TestIndex(unittest.TestCase):
    def test_index_get(self):
        args = {}
        args['hub.verify_token'] = "hambone"
        args['hub.challenge'] = 42
        args['hub.mode'] = "subscribe"
        req = unittest.mock.Mock(method="GET", args=args)

        # Call tested function
        assert main.index(req) == (42, 200)

    def test_index_post(self):
        req = unittest.mock.Mock(method="POST")
        req.get_json = lambda : {"object":"page","entry":[{"id":"103149398319188","time":1609656118325,"messaging":[{"sender":{"id":"3424692677644577"},"recipient":{"id":"103149398319188"},"timestamp":1609656118099,"message":{"mid":"m_ABt4i4wZIOP21KTsxMwTaHlgf8qsN5F1_pYhFwXvsac2EfSPOAzvt8s8WqxZHjsJUT4OHm8W49PFJtBJ3ITjIg","text":"aa"}}]}]}

        assert main.index(req) == ("", 200)