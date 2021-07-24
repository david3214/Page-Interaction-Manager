import unittest
import os
import json
from unittest.mock import patch, MagicMock
from app import worker, create_app, db
from app.models import PageDatum

class TaskTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        test_pages = []
        self.test_data = {}
        # with open('tests/page_data.json') as json_file:
        with open('tests/page_data_tst.json') as json_file:
            self.test_data = json.load(json_file)
            for page in self.test_data['page_data']:
                foo = PageDatum(page_id=page['page_id'], page_details=json.loads(page['page_details']))
                test_pages.append(foo)
        try:
            db.session.bulk_save_objects(test_pages)
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
        results = worker.tasks.update_all_profile_links() 
        self.assertTrue(results)

    @patch('urllib.request.urlopen')
    def test_insert_row_into_sheet_processed_messaging(self, mockurllib):
        # urlopen_return = MagicMock()
        mockurllib.return_value.read.return_value = json.dumps({"first_name": "David", "last_name": "Westwood"})
        mockurllib.return_value.getcode.return_value = 200
        print(mockurllib)
        results = worker.tasks.insert_row_into_sheet(self.test_data['sample_page_message_accept'][0])
        self.assertEqual(results, ('<p>Status: Processed</p>'))
        mockurllib.return_value.read.assert_called_once()
        mockurllib.return_value.getcode.assert_called_once()

    @patch('urllib.request.Request')
    @patch('urllib.request.urlopen')
    def test_insert_row_into_sheet_processed_reactions(self, mockurllib, mockrequest):
        mockurllib.return_value.getcode.return_value = 200
        results = worker.tasks.insert_row_into_sheet(self.test_data['sample_page_notifications_accept'][0])
        self.assertEqual(results, ('<p>Status: Processed</p>'))
        mockurllib.return_value.read.assert_not_called()
        mockurllib.return_value.getcode.assert_called_once()
        mockrequest.assert_called_with('https://sheets.googleapis.com/v4/spreadsheets/13bR4w9Q3w8DYJ7N_gJecwxaTsQMSaRfVp67sJeR1Los/values/Ad%20Likes:append?insertDataOption=INSERT_ROWS&valueInputOption=USER_ENTERED', 'headers=%7B%27Authorization%27%3A+%27Bearer+ya29.a0AfH6SMAnIoC5xqRCm4xz_XjiWnqB2JdOYYgNJrXHAN04-lslZAYky_lK-cgzwhyQCl8JFUiJG7Qg-SfoVSHNWiZDtJDTy6imlyGDoALJp1cNLD9GCrbmFvY0eMkDAMSiVRUdn3WjgQ7M96IiPm1MOK_kwrq1hLQ%27%2C+%27Content-type%27%3A+%27application%2Fjson%27%7D&method=POST&payload=%7B%22values%22%3A+%5B%5B%2207%2F23%2F2021%22%2C+%22Josh+Gardiner%22%2C+%22%22%2C+%22%22%2C+%22105691394435112%22%2C+%22https%3A%2F%2Ffacebook.com%2F106403761078808_292875975764918%22%2C+%22%22%2C+%22%22%2C+%22%22%2C+%22%22%2C+%22%5Cu2764%5Cufe0f%22%2C+%22%22%2C+%22%22%5D%5D%7D&muteHttpExceptions=True')

    def test_insert_row_into_sheet_processed(self):
        for test_data in self.test_data['sample_page_notifications_accept']:
            results = worker.tasks.insert_row_into_sheet(test_data)
            self.assertEquals(results, json.dumps({'status': 'Processed'}))

