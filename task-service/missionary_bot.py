""" Worker class for automating missionary work online. """
import sys
import json
import time
import threading
import os
import gzip
import urllib.parse
import pickle

from bs4 import BeautifulSoup
from selenium import webdriver
import pandas as pd
import redis


url = urllib.parse.urlparse(os.environ.get('REDISCLOUD_URL'))
r = redis.Redis(host=url.hostname, port=url.port, password=url.password)


class MissionaryBot:
  def __init__(self, church_username=None, church_password=None, pros_area_id=None, facebook_username=None, facebook_password=None):
    self.church_username = church_username
    self.church_password = church_password
    self.facebook_username = facebook_username
    self.facebook_password = facebook_password
    self.pros_area_id = pros_area_id
    self.set_status('Intializing')

    self.mission_id = 14440
    self.pros_area_url = f'https://areabook.churchofjesuschrist.org/services/mission/prosArea/{self.pros_area_id}'
    # https://areabook.churchofjesuschrist.org/services/mission/prosArea/units/4025235
    self.mission_directory_url = f'https://areabook.churchofjesuschrist.org/services/mission/{self.mission_id}'
    self.stewardCmisIds = []
    self.area_book_json = f'https://areabook.churchofjesuschrist.org/services/people/primary?stewardCmisIds={",".join(self.stewardCmisIds)}'
    self.person_profile_id = None
    self.person_profile = f'https://areabook.churchofjesuschrist.org/services/people/{self.person_profile_id}'

    self.chrome_options = webdriver.ChromeOptions()
    self.chrome_options.binary_location = os.environ.get("GOOGLE_CHROME_BIN")
    self.chrome_options.add_argument("--headless")
    self.chrome_options.add_argument("--disable-gpu")
    self.chrome_options.add_argument("--disable-dev-shm-usage")
    self.chrome_options.add_argument("--no-sandbox")
    self.chrome_options.add_argument("--silent")
    self.chrome_options.add_argument("--incognito")
    self.wd = webdriver.Chrome(executable_path=os.environ.get("CHROMEDRIVER_PATH"), chrome_options=self.chrome_options)
    self.wd.set_window_size(1920, 1080)
    self.wd.implicitly_wait(30)
    self.wd.set_script_timeout(30)


  """
  Run startup routine
  """
  def do_work(self):
    area_book_results = self.scrape_area_book_for_people().values.tolist()
    r.set(self.church_username+':area_book_results', pickle.dumps(area_book_results))
    if self.authenticate_with_facebook():
      self.load_facebook_profiles()


  """
  fetch all the facebook profiles
  """
  def load_facebook_profiles(self):
    area_book_results = pickle.loads(r.get(self.church_username+':area_book_results'))
    r.set(self.church_username + ":current_index", -2)
    self.set_status("Loading Facebook Profiles")
    for item in area_book_results:
      if not r.exists(self.church_username + ":status"):
        r.delete(self.church_username + ":facebook_search_results")
        self.wd.quit()
        sys.exit()
      try:
        self.wd.get(f'https://www.facebook.com/search/people?q={urllib.parse.quote(item[1]+ " " +item[2])}')
        time.sleep(1)
        cleaned = self.parse_facebook_search_page(self.wd.page_source)
        if cleaned == None:
          cleaned = ''
        else:
          cleaned = bytes(cleaned,'utf-8')
      except Exception as e:
        print(e)
      r.rpush(self.church_username + ":facebook_search_results", gzip.compress(cleaned))
    self.set_status("Done Loading Facebook Profiles")


  """
  Set status of the bot
  """
  def set_status(self, status):
    return r.set(self.church_username + ":status", status)


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
  return the cleaned html
  """
  def parse_facebook_search_page(self, html):
      try:
        soup = BeautifulSoup(html, "html.parser")
        results_container = soup.find("div", {"id": "BrowseResultsContainer"})
        if results_container == None:
          results_container = soup.find("div", {"aria-label": "Preview of a Search Result"})
          for circle in results_container.find_all('circle', {'class':"mlqo0dh0 georvekb s6kb5r3f"}):
            circle.decompose()
      except Exception as e:
        print(e)
      finally:
        return str(results_container)


  """
  Authenticate with church
  return true if successfull 
  """
  def authenticate_with_church(self):
    self.set_status('Authenticating with church')
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
      except Exception as e:
        print(e)
        return None


  """
  Log in to face book so we can start doing searches
  """
  def authenticate_with_facebook(self):
    self.set_status("Authenticating with Facebook")
    self.wd.get("https://www.facebook.com/")
    #self.wd.get_screenshot_as_file("1.png")
    if self.facebook_username is None:
      return "No Username"
    elif self.facebook_password is None:
      return "No Password"
    try: # Loggin in
      if self.wd.find_element_by_name("email"):
        self.wd.find_element_by_name("email").send_keys(self.facebook_username)
        self.wd.find_element_by_name("pass").send_keys(self.facebook_password)
        self.wd.find_element_by_name("pass").submit()
        #self.wd.get_screenshot_as_file("2email.png")
      try: #Check if we are allowed in imediately
        self.wd.implicitly_wait(5)
        try: #Check for facebook version 1
          if self.wd.find_element_by_xpath('//input[@placeholder="Search Facebook"]'):
            #self.wd.get_screenshot_as_file("search.png")
            self.wd.implicitly_wait(30)
            return True
        except:
          pass
        try:#Check for facebook version 2
          if self.wd.find_element_by_xpath('//input[@placeholder="Search"]'):
            #self.wd.get_screenshot_as_file("search.png")
            self.wd.implicitly_wait(30)
            return True
        except:
          pass
        try: #Check if it is asking about the new location
          if self.wd.find_element_by_xpath('//button[contains(text(), "Yes")]'):
            self.wd.find_element_by_xpath('//button[contains(text(), "Yes")]').click()
        except:
          pass
      except:# Error in checking for search bar
        pass
      if self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]'):
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        #self.wd.get_screenshot_as_file("3continue.png")

      if self.wd.find_element_by_id("checkpointSubmitButton"):
        self.safe_find_element_by_id("checkpointSubmitButton").click()
        #self.wd.get_screenshot_as_file("4chechpoint.png")

      if self.wd.find_element_by_xpath("//span[text()='Get a code sent to your email']"):
        self.wd.find_element_by_xpath("//span[text()='Get a code sent to your email']").click()
        #self.wd.get_screenshot_as_file("5email radio.png")

      if self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]'):
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        #self.wd.get_screenshot_as_file("6continue past email radio.png")
      
      if self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]'):
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        #self.wd.get_screenshot_as_file("7continue past email select.png")

      if self.wd.find_element_by_xpath("//input[@type='text']"):
        #self.wd.get_screenshot_as_file("8email code.png")
        while (not r.exists(self.church_username + ":facebook_key")):
          self.set_status(f'waiting for key from {self.church_username} might have to check spam')
          time.sleep(5)
        self.wd.find_element_by_xpath("//input[@type='text']").send_keys(str(r.get(self.church_username + ":facebook_key")))
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        self.set_status('entering key')
        #self.wd.get_screenshot_as_file("9continue past email select.png")

      while True:
        try:
          element = self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]')
          element.click()
          #self.wd.get_screenshot_as_file("10continue past email select.png")
        except:
          break
      try:
        if self.wd.find_element_by_xpath('//input[@placeholder="Search"]'):
          #self.wd.get_screenshot_as_file("search.png")
          self.set_status('Done authentication with Facebook version 1')
          return True
      except Exception as e:
        print(e)
      try:
        if self.wd.find_element_by_xpath('//input[@placeholder="Search Facebook"]'):
          #self.wd.get_screenshot_as_file("search.png")
          self.set_status('Done authentication with Facebook version 2')
          return True
      except Exception as e:
        print(e)

    except Exception as e:
        print(e)
        self.wd.get_screenshot_as_file("exception.png")
        
        #file = open('out.html', 'w')
        #file.write(self.wd.page_source)
        #file.close()
        # if self.safe_find_element_by_id("login"):
        #   self.safe_find_element_by_id("login").click()
    return False


  """
  Connect to areabook web and scrape the data
  return the df
  """
  def scrape_area_book_for_people(self):
    self.set_status("Scraping AreaBook")
    self.wd.get(self.pros_area_url)
    try:
      self.authenticate_with_church()
    except:
      pass
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

  def get_missionary_emails(self):
    self.wd.get('https://areabook.churchofjesuschrist.org/services/config?lang=en')
    try:
      self.authenticate_with_church()
    except:
      pass
    self.wd.find_elements_by_tag_name("pre")
    lang_data = self.parse_church_json(self.wd.page_source)
    url_list = []
    for mission in lang_data['missions']:
      url_list.append({'url':f'https://areabook.churchofjesuschrist.org/services/mission/{mission["id"]}', 'id':mission["id"]})
    #f = open('urls.txt', 'w')
    #for item in url_list:
    #  f.write("%s\n" % item)
    #f.close()
    import json 
    for item in url_list:
      self.wd.get(item["url"])
      self.wd.find_elements_by_tag_name("pre")
      ff = open(f'data/{item["id"]}', 'w+')
      ff.write(json.dumps(self.parse_church_json(self.wd.page_source)))
      ff.close()
    return f'found {len(url_list)}'

"""
Returns a list of data frames of tables in the html page
"""
def convert_html_to_data_frame(html):
  df_list = []
  soup = BeautifulSoup(html,'html.parser') 
  for i in range(len(soup.find_all("table"))):
    list_header = []
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
  desired_column = ["firstName", "lastName", "gender", "ageCategoryId",
                    "address", "phone", "phoneHome", "phoneMobile" ]
  columns_to_drop = []
  for column_name in df.columns:
    if column_name not in desired_column:
      columns_to_drop.append(column_name)
  df.drop(columns_to_drop, axis=1, inplace=True)
