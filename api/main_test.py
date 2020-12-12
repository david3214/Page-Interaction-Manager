import pytest
import json

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

def test_credentials_post(app):
    r = app.post('/page-interaction-manager/credentials', 
        data=json.dumps(dict(mock_data['page_results'])), content_type='application/json')
    assert r.status_code == 200

def test_credentials_get(app):
    for item in mock_data['page_results']['data']:
        r = app.get(f'/page-interaction-manager/credentials?id={item["id"]}')
        assert r.status_code == 200

def test_credentials_delete(app):
    for item in mock_data['page_results']['data']:
        r = app.delete(f'/page-interaction-manager/credentials?page_id={item["id"]}&token_id={item['google_sheets']['id']}')
        assert r.status_code == 200
        
