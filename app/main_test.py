import pytest


@pytest.fixture
def app():
    import main
    main.app.testing = True
    return main.app.test_client()


def test_index(app):
    r = app.get('/')
    assert r.status_code == 200
