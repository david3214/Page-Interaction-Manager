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