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

  def test_scrape_post_reactions_for_people(self):
    self.bot.authenticate_with_facebook()
    results = self.bot.scrape_post_reactions_for_people("https://www.facebook.com/SuperacionenelSur/posts/326818732396267", ["Matthew Curtis"])
    self.assertIn("https://www.facebook.com/mattjcurtis02", results.values())

  def test_scrape_profile_for_location(self):
    self.bot.authenticate_with_facebook()
    about_info = self.bot.scrape_profile_for_location("https://www.facebook.com/graham.harrison.3538")
    self.assertIsNotNone(about_info)
    self.assertNotIn("error", about_info.keys())

  def test_scrape_profile_for_location_no_location(self):
    self.bot.authenticate_with_facebook()
    about_info = self.bot.scrape_profile_for_location("https://www.facebook.com/juan.monsalve.5492216")
    self.assertIsNotNone(about_info)
    self.assertIn(None, about_info.values())

# Test to make sure that you can get data from facebook
