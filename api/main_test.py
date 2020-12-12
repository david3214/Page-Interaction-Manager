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

def test_credentials(app):

    r = app.post('/page-interaction-manager/credentials', data=mock_data['page_results'])
    assert r.status_code == 200
    r = app.get('/page-interaction-manager/credentials?id=1')
    assert r.status_code == 200
