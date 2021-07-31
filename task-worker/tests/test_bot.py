import unittest

from missionary_bot import create_bot


class MissionaryBotTestCase(unittest.TestCase):
    @classmethod
    def setUp(self):
        self.bot = create_bot('testing')

    @classmethod
    def tearDown(self):
        self.bot.wd.quit()

    def test_say_hi(self):
        self.assertEqual(self.bot.say_hi(), "Hi")

    def test_church_login(self):
        # Test to make sure class can sign into church
        self.bot.wd.get("https://id.churchofjesuschrist.org/")
        isAuthenticated = self.bot.authenticate_with_church()
        self.assertTrue(isAuthenticated)

    # Test to make sure you can sign into facebook
    def test_facebook_login(self):
        isAuthenticated = self.bot.authenticate_with_facebook()
        self.assertTrue(isAuthenticated)

    def test_facebook_login_bad(self):
        self.bot.facebook_password = ''
        isAuthenticated = self.bot.authenticate_with_facebook()
        self.assertFalse(isAuthenticated)

# Test to make sure that you can get data from facebook
