import sys
sys.path.insert(0,'/usr/bin/chromedriver')
from selenium import webdriver
from time import sleep
import json
from bs4 import BeautifulSoup
import pandas as pd 
import time
import threading
import os

from flask import Flask, make_response, request
from pickle import load, dump
import urllib.parse
import atexit
import pickle

selectors = json.loads("""{
  "status": "//div[contains(@class, '_5pbx')]",
  "sections_bar": "//*[@class='_3cz'][1]/div[2]/div[1]",
  "status_exc": ".//div[@class='userContent']",
  "temp": ".//div[@class='_3x-2']",
  "title": ".//span[@class='fwb fcg']",
  "title_exc1": ".//span[@class='fcg']",
  "title_exc2": ".//span[@class='fwn fcg']",
  "title_element": ".//div[@class='_1dwg _1w_m']",
  "background_img_links": "//*[contains(@id, 'pic_')]/div/i",
  "firefox_profile_path": "/home/zeryx/.mozilla/firefox/0n8gmjoz.bot",
  "facebook_https_prefix": "https://",
  "facebook_link_body": ".facebook.com/",
  "spotlight": "spotlight",
  "default_image": "10354686_10150004552801856_220367501106153455_n.jpg",
  "height_script": "return document.body.scrollHeight",
  "scroll_script": "window.scrollTo(0, document.body.scrollHeight);",
  "title_text": "fb-timeline-cover-name",
  "profilePicThumb": "profilePicThumb",
  "fb_link": "https://en-gb.facebook.com/",
  "single_post" : ".//div[contains(@class, '_5pcr')]",
  "post_photos": ".//a[contains(@class, '_5dec') or contains(@class, '_4-eo')]",
  "post_photo_small" : ".//img[contains(@class, '_46-i')]",
  "post_photo_small_opt1" : ".//img[contains(@class, 'scaledImageFitWidth') or contains(@class, 'scaledImageFitHeight')]",
  "comment_section" : ".//*[@class='commentable_item']",
  "comment" : ".//div[@aria-label='Comment']",
  "comment_author" : ".//a[@class='_6qw4']",
  "comment_text" : ".//span[contains(@class,'_3l3x')]",
  "more_comment_replies": ".//a[contains(@class,'_4sxc _42ft')]",
  "comment_see_more_link" : ".//a[contains(@class,'_5v47 fss')]",
  "comment_reply" : "..//..//div[@aria-label='Comment reply']"

}""")

firefox_profile_path = selectors.get("firefox_profile_path")
facebook_https_prefix = selectors.get("facebook_https_prefix")
facebook_link_body = selectors.get("facebook_link_body")

class MissionaryBot:
  def __init__(self, church_username=None, church_password=None, pros_area_id=None, facebook_username=None, facebook_password=None):
    print("Bot Init")
    self.church_username = church_username
    self.church_password = church_password
    self.pros_area_id = pros_area_id
    self.status = 'Intializing'
    self.facebook_username = facebook_username
    self.facebook_password = facebook_password
    self.number_of_pops = -2

    self.mission_id = 14440
    self.pros_area_url = f'https://areabook.churchofjesuschrist.org/services/mission/prosArea/{self.pros_area_id}'
    # https://areabook.churchofjesuschrist.org/services/mission/prosArea/units/4025235
    self.mission_directory_url = f'https://areabook.churchofjesuschrist.org/services/mission/{self.mission_id}'
    self.stewardCmisIds = []
    self.area_book_json = f'https://areabook.churchofjesuschrist.org/services/people/primary?stewardCmisIds={",".join(self.stewardCmisIds)}'

    self.person_profile_id = None
    self.person_profile = f'https://areabook.churchofjesuschrist.org/services/people/{self.person_profile_id}'

    self.chrome_options = webdriver.ChromeOptions()
    self.chrome_options.add_argument('--headless')
    self.chrome_options.add_argument('--no-sandbox')
    self.chrome_options.add_argument('--disable-dev-shm-usage')
    self.wd = webdriver.Chrome('chromedriver',options=self.chrome_options)
    self.wd.set_window_size(1920, 1080)
    self.wd.implicitly_wait(30)
    self.wd.set_script_timeout(30)

    self.facebook_search_results = []
    self.area_book_results = []
    self.do_work_thread()

  """
  Run startup routine
  """
  def do_work(self):
    self.area_book_results = self.scrape_area_book_for_people().values.tolist()
    if self.authenticate_with_facebook():
      self.load_facebook_profiles_thread()

  """
  Thread to initialize all the values
  """
  def do_work_thread(self):
    y = threading.Thread(target=self.do_work, daemon=True)
    y.start()

  """
  fetch all the facebook profiles
  """
  def load_facebook_profiles(self):
    self.status = "Loading Facebook Profiles"
    for item in self.area_book_results:
      try:
        self.wd.get(f'https://www.facebook.com/search/people?q={urllib.parse.quote(item[1]+ " " +item[2])}')
      except Exception as e:
        print(e)
      cleaned = self.parse_facebook_search_page(self.wd.page_source)
      self.facebook_search_results.append(cleaned)
    self.status = "Done Loading Facebook Profiles"
  
  def load_facebook_profiles_thread(self):
    x = threading.Thread(target=self.load_facebook_profiles, daemon=True)
    x.start()

  def get_next_profile(self):
    try:
      results = self.facebook_search_results.pop(0)
      self.number_of_pops += 1
    except:
      results = "No people ready"
    finally:
      return results

  """
  return the status of the bot as a string
  """
  def get_status(self):
    try:
      status = f'There are {len(self.facebook_search_results)} people in queue. \
    Status: {self.status} \
    Total: {len(self.area_book_results)} \
    Completed: {self.number_of_pops} \
    Remaining: {len(self.area_book_results) - self.number_of_pops}\
    Current Name: {self.area_book_results[self.number_of_pops][1] + " " + self.area_book_results[self.number_of_pops][2]}'
    except Exception as e:
      print(e)
      status = "Loading"
    finally:
      return status


  """
  Parse church html page json
  return json object
  """
  def parse_church_json(self, html):
    soup = BeautifulSoup(html, "html.parser")
    element = soup.find("pre").contents[0]
    return json.loads(element)


  """
  Process the facebook search page 
  TODO filter the scandelous profile pics for prezident
  return the cleaned html
  """
  def parse_facebook_search_page(self, html):
    soup = BeautifulSoup(html, "html.parser")
    element = soup.find("div", {"id": "BrowseResultsContainer"})
    content = str(element)
    return content


  """
  Authenticate with church
  return true if successfull 
  """
  def authenticate_with_church(self):
    print('Authenticating with church')
    self.status = 'Authenticating with church'
    # Check if already logged in
    self.wd.find_element_by_id("okta-signin-username").send_keys(self.church_username)
    self.wd.find_element_by_id("okta-signin-submit").click()
    self.wd.find_element_by_name("password").send_keys(self.church_password)
    self.wd.find_element_by_name("password").submit()


  """
  Function for not raising an error when an element doesn't exist
  """
  def safe_find_element_by_id(self, elem_id):
      try:
          return self.wd.find_element_by_id(elem_id)
      except NoSuchElementException:
          return None

  """
  Log in to face book so we can start doing searches
  """
  def authenticate_with_facebook(self):
    print("Authenticating with Facebook")
    self.status = "Authenticating with Facebook"
    self.wd.get("https://www.facebook.com/")
    self.wd.get_screenshot_as_file("1.png")
    try:
      if self.wd.find_element_by_name("email"):
        self.wd.find_element_by_name("email").send_keys(self.facebook_username)
        self.wd.find_element_by_name("pass").send_keys(self.facebook_password)
        self.wd.find_element_by_name("pass").submit()
        self.wd.get_screenshot_as_file("2email.png")

      try:
        self.wd.implicitly_wait(5)
        if self.wd.find_element_by_xpath('//input[@placeholder="Search"]'):
          self.wd.get_screenshot_as_file("search.png")
          self.wd.implicitly_wait(30)
          return True
        elif self.wd.find_element_by_xpath('//input[@placeholder="Search Facebook"]'):
          self.wd.get_screenshot_as_file("search.png")
          return True
        if self.facebook_username is None:
          return "No Username"
        elif self.facebook_password is None:
          return "No Password"
      except:
        self.wd.implicitly_wait(30)

      if self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]'):
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        self.wd.get_screenshot_as_file("3continue.png")

      if self.wd.find_element_by_id("checkpointSubmitButton"):
        self.safe_find_element_by_id("checkpointSubmitButton").click()
        self.wd.get_screenshot_as_file("4chechpoint.png")

      if self.wd.find_element_by_xpath("//span[text()='Get a code sent to your email']"):
        self.wd.find_element_by_xpath("//span[text()='Get a code sent to your email']").click()
        self.wd.get_screenshot_as_file("5email radio.png")

      if self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]'):
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        self.wd.get_screenshot_as_file("6continue past email radio.png")
      
      if self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]'):
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        self.wd.get_screenshot_as_file("7continue past email select.png")

      if self.wd.find_element_by_xpath("//input[@type='text']"):
        self.wd.get_screenshot_as_file("8email code.png")
        while (True):
          if self.facebook_username in fb_key_dict.keys():
            break
          else:
            print(f'waiting for key from {self.facebook_username} might have to check spam')
            self.status = f'waiting for key from {self.facebook_username}'
            time.sleep(5)
        print(fb_key_dict[self.facebook_username])
        self.wd.find_element_by_xpath("//input[@type='text']").send_keys(fb_key_dict[self.facebook_username])
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        self.wd.get_screenshot_as_file("9continue past email select.png")

      while True:
        try:
          element = self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]')
          element.click()
          self.wd.get_screenshot_as_file("10continue past email select.png")
        except:
          break

      if self.wd.find_element_by_xpath('//input[@placeholder="Search"]'):
        self.wd.get_screenshot_as_file("search.png")
        return True
      elif self.wd.find_element_by_xpath('//input[@placeholder="Search Facebook"]'):
        self.wd.get_screenshot_as_file("search.png")
        return True    

    except Exception as e:
        print(e)
        self.wd.get_screenshot_as_file("exception.png")
        file = open('out.html', 'w')
        file.write(self.wd.page_source)
        file.close()
        # if self.safe_find_element_by_id("login"):
        #   self.safe_find_element_by_id("login").click()
       
    return False


  """
  Connect to areabook web and scrape the data
  return the df
  """
  def scrape_area_book_for_people(self):
    print("Scraping AreaBook")
    self.status = "Scraping AreaBook"
    self.wd.get(self.pros_area_url)
    self.authenticate_with_church()
    self.wd.find_elements_by_tag_name("pre")
    pros_area_data = self.parse_church_json(self.wd.page_source)
    for missionary in pros_area_data['missionaries']:
      self.stewardCmisIds.append(missionary['cmisId'])
    self.wd.get(self.area_book_json)
    self.wd.find_elements_by_tag_name("pre")
    area_book_data = self.parse_church_json(self.wd.page_source)
    df = pd.json_normalize(area_book_data['persons'])
    return df

  def pass_data(self, url):
    self.wd.get(url)
    self.wd.find_element_by_tag_name('input')
    return self.wd.page_source

"""
Returns a list of data frames of tables in the html page
"""
def convert_html_to_data_frame(html):
  df_list = []
  soup = BeautifulSoup(html,'html.parser') 
  for i in range(len(soup.find_all("table"))):
    # for getting the header from 
    # the HTML file  
    list_header = []
    # empty list 
    data = []
     
    header = soup.find_all("table")[i].find("tr")
    for items in header: 
        try: 
            list_header.append(items.get_text()) 
        except: 
            continue
      
    # for getting the data  
    HTML_data = soup.find_all("table")[i].find_all("tr")[1:]
      
    for element in HTML_data: 
        sub_data = [] 
        for sub_element in element: 
            try: 
                sub_data.append(sub_element.get_text()) 
            except: 
                continue
        data.append(sub_data) 
      
    # Storing the data into Pandas 
    # DataFrame  
    dataFrame = pd.DataFrame(data=data, columns=list_header)
    df_list.append(dataFrame)

  return df_list


"""
Processing to do to a individual data frame
Remove unwanted columns
"""
def process_data_frame(df):
  desired_column = ["firstName", "lastName", "gender", "ageCategoryId", "address", "phone", "phoneHome", "phoneMobile" ]
  columns_to_drop = []
  for column_name in df.columns:
    if column_name not in desired_column:
      columns_to_drop.append(column_name)
  df.drop(columns_to_drop, axis=1, inplace=True)

def process_data_frame2(df):
  pandas.json_normalize(data)


app = Flask(__name__)
fb_key_dict = {}


# Check for previous bots
try:
  bots = pickle.load(open('bots.pickle', 'rb'))
except (OSError, IOError) as e:
  bots = {}
  pickle.dump(bots, open("bots.pickle", "wb"))

def exit_handler():
  #Save the bots
  pickle.dump(bots, open('bots.pickle', 'wb'))

atexit.register(exit_handler)

# Delete a bot
@app.route("/delete-bot")
def delete_bot():
  args = request.args
  try:
    if args['church_username'] == "" or args['church_username'] not in bots.keys():
      raise ValueError
    else:
      print(f"deleting bot{args['church_username']}")
      bots.pop(args['church_username'])
  except:
    return "Missing bot name"

@app.route("/create-bot")
def create_bot():
  print("Creating bot")
  args = request.args
  try:
    if (args['church_username'] == None or args['church_password'] == None or args['pros_area_id'] == None or args['facebook_username'] == None or args['facebook_password'] == None):
      raise ValueError
    if args['church_username'] in bots.keys():
      return "Bot already exist"
    else:
      bot = MissionaryBot(**args)
      bots[args['church_username']] = bot
      return "added bot"
  except Exception as e:
    return f"Exception: {e}"


@app.route("/bot-status")
def bot_status():
  args = request.args
  if args['church_username'] in bots.keys():
    return bots[args['church_username']].get_status()
  else:
    return "No Bot with that name"


@app.route("/pass-data")
def pass_data_view():
  args = request.args
  url = args['url']
  bot = MissionaryBot()
  return bot.pass_data(url)


@app.route("/get-next-profile")
def get_next_profile():
  args = request.args
  if args['church_username'] in bots.keys():
      return bots[args['church_username']].get_next_profile()
  else:
    return "No bots with that name"

"""
Add key for facebook 2 factor authentication
"""
@app.route("/add-key")
def add_key():
  try:
    args = request.args
    if args['key'] == "" or args['facebook_username'] == "":
      raise ValueError
    else:
      key = args['key']
      facebook_username = args['facebook_username']
      fb_key_dict[facebook_username] = key
      return "✅"
  except:
    return "❌"

if __name__ == '__main__':
  app.run()
