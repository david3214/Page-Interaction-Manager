import pytest


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv('CHROMEDRIVER_PATH', 'C:\\chromedriver.exe')
    monkeypatch.setenv('GOOGLE_CHROME_BIN', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
    import main
    main.app.testing = True
    return main.app.test_client()


def test_index(app):
    r = app.get('/')
    assert r.status_code == 200

def test_find_member_profiles(app):
    data = {'church_username': 'grahas',
            'church_password': 'Harr1s0n1',
            'facebook_username': '***REMOVED***',
            'facebook_password': 'Harr1s0n123',
            'pros_area_id': '418067424'}
    r = app.post('/find_member_profiles', data=data)
    assert r.status_code == 200