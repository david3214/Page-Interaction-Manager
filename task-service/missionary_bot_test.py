import unittest
import os
import json

from missionary_bot import MissionaryBot

with open("test_credentials.json") as f:
  test_credentials = json.load(f)
bot = MissionaryBot(**test_credentials)

class MyTest(unittest.TestCase):
    # Test to make sure class can sign into church
    def test_church_login(self):
        bot.wd.get("https://id.churchofjesuschrist.org/")
        self.assertTrue(bot.authenticate_with_church())

    # Test to make sure you can sign into facebook
    def test_facebook_login(self):
        bot.authenticate_with_facebook()

# Test to make sure that you can get data from facebook