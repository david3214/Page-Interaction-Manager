import pytest


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv('REDISCLOUD_URL', '***REMOVED***')
    import main
    main.app.testing = True
    return main.app.test_client()


def test_index(app):
    r = app.get('/')
    assert r.status_code == 200

