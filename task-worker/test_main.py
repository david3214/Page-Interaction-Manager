import pytest
import json

from flask import Flask

import main

@pytest.fixture
def app():
    main.app.testing = True
    return main.app.test_client()

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