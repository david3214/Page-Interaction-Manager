import unittest
import os
import json
from app import worker, create_app, db
from app.models import PageDatum


class TaskTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        test_data = []
        with open('tests/page_data.json') as json_file:
            data = json.load(json_file)
            for page in data['page_data']:
                foo = PageDatum(page_id=page['page_id'], page_details=json.loads(page['page_details']))
                test_data.append(foo)
        try:
            db.session.bulk_save_objects(test_data)
            db.session.commit()
        except:
            pass


    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_process_result(self):
        test_obj = {
            'page_id': '103149398319188', 
            'task_name': 'missionary_bot.tasks.get_profile_links', 
            'data': {'https://facebook.com/104293337915105_3889746227759913': [], 'https://facebook.com/104293337915105_265739008437203': [], 'https://facebook.com/104293337915105_258980765663700': ['Ata Katoa', 'Meleane Tohu\'ia Ikahihifo']}, 
            'results': {'Joseph Ammendola': 'https://www.facebook.com/joey.ammendola.5', 'Jenn Doughty Talbot': 'https://www.facebook.com/jennifer.doughtytalbot', 'Liesle Knight Winters': 'https://www.facebook.com/liesle', 'Hayden Urmston': 'https://www.facebook.com/hayden.urmston', 'Arnold Nevarez': 'https://www.facebook.com/arnold.nevarez.94', 'Madeline Furstenau': 'https://www.facebook.com/madeline.furstenau', 'Judy Lemons George': 'https://www.facebook.com/judy.l.george', 'Wimalasuriya Wimalasuriya': 'https://www.facebook.com/profile.php?id=100027047604247', 'Zella Millard': 'https://www.facebook.com/zella.millard.1', 'Tiesha Jensen Christensen': 'https://www.facebook.com/tiesha.christensen', 'Paul Kearns': 'ht...'}
        }
        results = worker.process_result(test_obj)
        self.assertTrue(results)

    def test_update_all_profile_links(self):
        results = worker.update_all_profile_links() 
        self.assertTrue(results)