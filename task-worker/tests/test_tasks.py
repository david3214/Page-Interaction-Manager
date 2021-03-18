from missionary_bot.tasks import get_profile_links
import unittest
from unittest.mock import patch
import json

from missionary_bot import create_bot, test_task


class TasksTestCase(unittest.TestCase):
  @classmethod
  def setUpClass(self):
    # Start worker
    pass

  @classmethod
  def setUp(self):
    pass

  @classmethod
  def tearDown(self):
    pass

  
  def test_test_task(self, test_mock):
    task_info = {"text": "Hello World!"}
    results = test_task(task_info)
    self.assertEqual(task_info['text'], results['text'])

  def test_get_profile_links(self):
    task = {
      "sheet_url": "1234567890",
      "type": "scrape_profiles", 
      "data": {"https://facebook.com/104293337915105_3889746227759913": ["Braden Dickerson", "June Arvin Loza"], "https://facebook.com/104293337915105_265739008437203": ["Judy Lemons George", "Arnold Nevarez", "Liesle Knight Winters", "Madeline Furstenau", "Hayden Urmston", "Jenn Doughty Talbot", "Joseph Ammendola"], "https://facebook.com/104293337915105_258980765663700": [
        "Jeff Peleseuma", "Leiny Almendra", "Sunil Kumar", "Janet Starr", "Luis Schwichtenberg", "Wimalasuriya Wimalasuriya", "Peggy Schuchard", "Jonhy Herbert", "Ata Katoa", "Laraine Kearns", "Helga Silski", "Mel Andrew", "Terence Ahmod Johnson", "Aaron Barlow", "Koby Christensen", "Charles Kewish", "Zella Millard", "Tiesha Jensen Christensen", "Meleane Tohu'ia Ikahihifo", "Anaseini Fakava", "Kara Kienzynski", "Paul Kearns"]
      },
      "results":{}
    }

    results = get_profile_links(task)
    self.assertTrue(results)

  def test_find_member_profiles(self):
    pass

  def test_create_pass_along_cards(self):
    pass

  def test_insert_row_in_sheet(self):
    pass
