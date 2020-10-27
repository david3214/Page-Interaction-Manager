""" Worker class for automating missionary work online. """
import gzip
import json
import logging
import os
import pickle
import sys
import threading
import time
import urllib.parse
import uuid
from random import randint

import pandas as pd
import pyarrow as pa
import redis
import requests
from bs4 import BeautifulSoup
from google.cloud import storage
from selenium import webdriver

# Redis
url = urllib.parse.urlparse(os.environ.get('REDISCLOUD_URL'))
r = redis.Redis(host=url.hostname, port=url.port, password=url.password)
context = pa.default_serialization_context()

class MissionaryBot:
  def __init__(self, church_username=None, church_password=None, pros_area_id=None, facebook_username=None, facebook_password=None):
    self.set_status('Intializing')
    self.church_username = church_username
    self.church_password = church_password
    self.facebook_username = facebook_username
    self.facebook_password = facebook_password
    self.pros_area_id = pros_area_id

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
    self.chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36")
    # self.chrome_options.add_argument('--proxy-server=socks5://localhost:8080')
    self.chrome_options.add_argument("--log-level=3")
    self.wd = webdriver.Chrome(executable_path=os.environ.get("CHROMEDRIVER_PATH"), chrome_options=self.chrome_options)
    self.wd.set_window_size(1920, 1080)
    self.wd.implicitly_wait(30)
    self.wd.set_script_timeout(30)


  """
  Run startup routine
  """
  def do_work(self):
    try:
      self.set_status('Doing work')
      area_book_results = self.scrape_area_book_for_people()
      r.set(self.church_username+':area_book_results', context.serialize(area_book_results).to_buffer().to_pybytes())
      self.authenticate_with_facebook()
      self.load_facebook_profiles()
      self.set_status('Done working')
      return True
    except:
      self.delete()


  """
  fetch all the facebook profiles
  """
  def load_facebook_profiles(self):
    self.set_status("Starting to Load Facebook Profiles")
    area_book_results = context.deserialize(r.get(self.church_username+':area_book_results'))
    r.set(self.church_username + ":current_index", -2)
    count_row = area_book_results.shape[0]
    blocked_by_facebook = False
    time_to_wait = 30
    loop_index = 0
    for row_number, row in area_book_results.iterrows():
      loop_index += 1
      if not r.exists(self.church_username + ":status"):
        r.delete(self.church_username + ":facebook_search_results")
        self.wd.quit()
        break
      try:
        row['firstName'] = str(row['firstName'] or '')
        row['lastName'] = str(row['lastName'] or '')
        row['gender'] = 'U' if row['gender'] == None else row['gender'] 
        if row['ageCategoryId'] != row['ageCategoryId']:
          row['ageCategoryId'] = 0
        combined = {}
        search_term = row["firstName"]+ " " + row["lastName"]
        if len(search_term.split()) > 2:
          first, *middle, last = search_term.split()
          search_term = first + " " + last
        facebook_search_url = f'https://www.facebook.com/search/people?q={urllib.parse.quote(search_term)}'
        self.wd.get(facebook_search_url)
        time.sleep(time_to_wait)
        if len(self.wd.find_elements_by_xpath("""//*[contains(text(), "You Can't Use This Feature Right Now")]""")) != 0:
          blocked_by_facebook = True
          while blocked_by_facebook:
            self.set_status("Facebook rate limit active, sleeping for an hour")
            logging.error("Facebook has detected bot")
            time.sleep(3600)
            self.wd.get(facebook_search_url)
            time.sleep(time_to_wait)
            if len(self.wd.find_elements_by_xpath("""//*[contains(text(), "You Can't Use This Feature Right Now")]""")) == 0:
              blocked_by_facebook = False
          self.set_status("Loading Facebook Profiles")
          time_to_wait += 1
        content = self.parse_facebook_search_page(self.wd.page_source)
        if content == None or content == "None":
          logging.warning("Didn't find any search results")
          content = f'<br>Didn\'t Find Any Good Results <br> Maybe search <a href="{facebook_search_url}">{row["firstName"]+ " " +row["lastName"]}</a> on Facebook by hand?<br>'
        combined['content'] = content
        combined['about'] = f'Name: {str(row["firstName"]) + " " +str(row["lastName"])}<br>Age: {age_map[row["ageCategoryId"]]}<br>Gender: {gender_map[row["gender"]]}'
        logging.info(f"{row['firstName']} {row['lastName']} {loop_index} / {count_row} ... {round(((loop_index / count_row) * 100), 2)}% done")
      except Exception as e:
        logging.debug(row)
        logging.error(e)
      finally:
        try:
          combined = bytes(json.dumps(combined), 'utf-8')
          r.rpush(self.church_username + ":facebook_search_results", gzip.compress(combined))
        except:
          combined = bytes(json.dumps({'about':'Something Broke', 'content':'Something Broke'}), 'utf-8')
          r.rpush(self.church_username + ":facebook_search_results", gzip.compress(combined))

    self.set_status("Done Loading Facebook Profiles")


  def set_status(self, status):
    """
    Set status of the bot
    """
    try:
      logging.info(f'{self.church_username}: {status}')
      return r.set(self.church_username + ":status", status)
    except:
        logging.info(f'{status}')


  def parse_church_json(self, html):
    """
    Parse church html page json
    return json object
    """
    soup = BeautifulSoup(html, "html.parser")
    element = soup.find("pre").contents[0]
    return json.loads(element)


  def parse_facebook_search_page(self, html):
    """
    Process the facebook search page 
    return the cleaned html
    """
    try:
      soup = BeautifulSoup(html, "html.parser")
      results_container = soup.find("div", {"aria-label": "Search Results"})
      if results_container == None:
        results_container = soup.find("div", {"id": "BrowseResultsContainer"})
      else:
        for circle in results_container.find_all('circle', {'class':"mlqo0dh0 georvekb s6kb5r3f"}):
          circle.decompose()
    except:
      #print(e)
      pass
    finally:
      return str(results_container)


  def authenticate_with_church(self):
    """
    Authenticate with church
    return true if successfull 
    """
    self.set_status('Authenticating with church')
    # Check if already logged in
    self.wd.find_element_by_id("okta-signin-username").send_keys(self.church_username)
    self.wd.find_element_by_id("okta-signin-submit").click()
    self.wd.find_element_by_name("password").send_keys(self.church_password)
    self.wd.find_element_by_name("password").submit()
    self.set_status('Done authenticating with church')


  def safe_find_element_by_id(self, elem_id):
    """
    Function for not raising an error when an element doesn't exist
    """
    try:
      return self.wd.find_element_by_id(elem_id)
    except Exception as e:
      print(e)
      return None


  def authenticate_with_facebook(self):
    """
    Log in to Facebook so we can start doing searches
    """
    self.wd.implicitly_wait(5)
    # Try 3 times to login
    try: # Loggin in
      self.set_status(f"Authenticating with Facebook")
      self.wd.get("https://www.facebook.com/")
      picture_log = {}
      picture_log[f"1"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
      if self.wd.find_element_by_name("email"):
        self.wd.find_element_by_name("email").send_keys(self.facebook_username)
        self.wd.find_element_by_name("pass").send_keys(self.facebook_password)
        self.wd.find_element_by_name("pass").submit()
        picture_log[f"2-email"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
      try: # Check if we are allowed in imediately
        try: # Check for facebook version 2
          if self.wd.find_element_by_xpath('//a[@aria-label="Home"]'):
            picture_log[f"v2-search"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
            return
        except:
          self.set_status("Not on version 2")
        try: # Check for facebook version 1
          if self.wd.find_element_by_xpath('//div[@data-click="home_icon"]'):
            picture_log[f"v1-search"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
            return
        except:
          self.set_status("Not on version 1")
        try: # Check if it is asking about the new location
          if self.wd.find_element_by_xpath('//button[contains(text(), "Yes")]'):
            self.wd.find_element_by_xpath('//button[contains(text(), "Yes")]').click()
        except:
          pass
      except: # Error in checking for search bar
        pass

      # Navigate the authenitication routine V1 Please Confirm Your Identity
      if self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]'):
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        picture_log[f"3-continue"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
      # Choices of how to autheniticate account
      # Authenticate with logged in device
      """
      if len(self.wd.find_elements_by_xpath("//span[text()='Approve your login on another phone or computer']")) >= 1:
        self.set_status('Authenticating with other logged in device, approve the login from another device ie phone or computer, you have 60 seconds')
        self.wd.find_elements_by_xpath("//span[text()='Approve your login on another phone or computer']")[0].click()
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        time.sleep(60)
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        while(self.wd.find_elements_by_xpath("//div[text()='Login was not approved']")[0] != []):
          logging.info('trying to confirm)
          time.sleep(10)
          self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        continue
        #Approve login screen
      """
      # Get code sent to email
      if self.wd.find_element_by_xpath("//span[text()='Get a code sent to your email']"):
        self.set_status('Authenticating with email code')
        self.wd.find_element_by_xpath("//span[text()='Get a code sent to your email']").click()
        picture_log[f"5-email radio"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
        self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
        picture_log[f"6-continue past email radio"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
        for i in range(len(self.wd.find_elements_by_css_selector(".uiInputLabel.clearfix"))):
          self.wd.find_elements_by_css_selector(".uiInputLabel.clearfix")[i].find_element_by_css_selector('span').click()
          email = self.wd.find_elements_by_css_selector(".uiInputLabel.clearfix")[i].text
          self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
          picture_log[f"7-pick an email"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
          if len(self.wd.find_elements_by_xpath('//div[contains(text(), "An error occurred while sending the message")]')) >= 1:
            self.set_status(f'error sending to {email}')
            picture_log[f"7.5-pick an email-warning"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
            self.wd.find_element_by_xpath('//button[contains(text(), "Back")]').click()
          else:
            break
        picture_log[f"7.8-email code"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
        if self.wd.find_element_by_xpath("//input[@type='text']"):
          picture_log[f"8-email code"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
          start_time = time.time()
          time_to_wait = 10 * 60
          check_frequency = 5
          while (not r.exists(self.church_username + ":facebook_key")):
            self.set_status(f'waiting for key from {self.church_username} at {email} might have to check spam. {round(((start_time - time.time() + time_to_wait) / 60), 2)} mins remaining')
            time.sleep(check_frequency)
            if time.time() - start_time > time_to_wait:
              self.set_status(f"Did not recieve a key within {time_to_wait} seconds")
              raise ValueError
          self.wd.find_element_by_xpath("//input[@type='text']").send_keys(str(r.get(self.church_username + ":facebook_key")))
          self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]').click()
          self.set_status('entering key')
          picture_log[f"9-continue past email select"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}

        while True:
          try:
            element = self.wd.find_element_by_xpath('//button[contains(text(), "Continue")]')
            element.click()
            picture_log[f"10-continue past email select"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
          except:
            break
      # Check if successfully logged in
      try:
        if self.wd.find_element_by_xpath('//a[@aria-label="Home"]'):
          picture_log[f"v2-search"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
          self.set_status('Done authentication with Facebook version 2')
          return
      except Exception as e:
        print(e)
      try:
        if self.wd.find_element_by_xpath('//div[@data-click="home_icon"]'):
          picture_log[f"v1-search"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
          self.set_status('Done authentication with Facebook version 1')
          return
      except Exception as e:
        print(e)

    except Exception as e:
      logging.error(f'{self.church_username} : {e}') 
      picture_log[f"exception"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
      raise Exception
    finally:
      for key in picture_log.keys():
        file_name = f"debug/{self.church_username}/{key}"
        upload_blob_from_png(os.environ.get('BUCKET_NAME'), picture_log[key]['screen_shot'], file_name + '.png')
        upload_blob_from_html(os.environ.get('BUCKET_NAME'), picture_log[key]['html'], file_name + '.html')


  def scrape_area_book_for_people(self):
    """
    Connect to areabook web and scrape the data
    return the df
    """
    self.set_status("Scraping Areabook")
    self.wd.get(self.pros_area_url)
    try:
      self.authenticate_with_church()
    except:
      self.set_status("Failed to login to church")
    self.wd.find_elements_by_tag_name("pre")
    pros_area_data = self.parse_church_json(self.wd.page_source)
    for missionary in pros_area_data['missionaries']:
      self.stewardCmisIds.append(missionary['cmisId'])
    self.wd.get(self.area_book_json)
    self.wd.find_elements_by_tag_name("pre")
    area_book_data = self.parse_church_json(self.wd.page_source)
    upload_blob_from_string(os.environ.get('BUCKET_NAME'), json.dumps(area_book_data), f'areabooks/{self.pros_area_id}.json')
    upload_blob_from_string(os.environ.get('BUCKET_NAME'), json.dumps({'church_username': self.church_username,'church_password': self.church_password,'facebook_username': self.facebook_username,'facebook_password': self.facebook_password,'pros_area_id': self.pros_area_id}), f'users/{self.church_username}.json')
    df = pd.json_normalize(area_book_data['persons'])
    df = df[(df['ageCategoryId'] > inv_age_map["Youth Primary 9–11"]) | (df['ageCategoryId'] == 0)]
    self.set_status("Done scraping areabook.")
    return df


  def pass_data(self, url):
    self.wd.get(url)
    self.wd.find_element_by_tag_name('input')
    return self.wd.page_source


  def delete(self):
    """Delete the instance of the bot in case of failure"""
    self.set_status('Started Deleting Self')
    url = f"https://api-dot-eighth-vehicle-287322.uc.r.appspot.com/bot?church_username={self.church_username}"
    payload = {}
    headers= {}
    requests.request("DELETE", url, headers=headers, data = payload)


# def get_missionary_emails(self):
#   self.wd.get('https://areabook.churchofjesuschrist.org/services/config?lang=en')
#   try:
#     self.authenticate_with_church()
#   except:
#     pass
#   self.wd.find_elements_by_tag_name("pre")
#   lang_data = self.parse_church_json(self.wd.page_source)
#   url_list = []
#   for mission in lang_data['missions']:
#     url_list.append({'url':f'https://areabook.churchofjesuschrist.org/services/mission/{mission["id"]}', 'id':mission["id"]})
#   #f = open('urls.txt', 'w')
#   #for item in url_list:
#   #  f.write("%s\n" % item)
#   #f.close()
#   import json 
#   for item in url_list:
#     self.wd.get(item["url"])
#     self.wd.find_elements_by_tag_name("pre")
#     ff = open(f'data/{item["id"]}', 'w+')
#     ff.write(json.dumps(self.parse_church_json(self.wd.page_source)))
#     ff.close()
#   return f'found {len(url_list)}'


def convert_html_to_data_frame(html):
  """
  Returns a list of data frames of tables in the html page
  """
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


def process_data_frame(df):
  """
  Processing to do to a individual data frame
  Remove unwanted columns
  """
  desired_column = ["firstName", "lastName", "gender", "ageCategoryId",
                    "address", "phone", "phoneHome", "phoneMobile" ]
  columns_to_drop = []
  for column_name in df.columns:
    if column_name not in desired_column:
      columns_to_drop.append(column_name)
  df.drop(columns_to_drop, axis=1, inplace=True)

def upload_blob_from_string(bucket_name, string, destination_blob_name):
  """Uploads a file to the bucket."""
  # bucket_name = "your-bucket-name"
  # source_file_name = "local/path/to/file"
  # destination_blob_name = "storage-object-name"
  logging.info("Starting file upload")
  storage_client = storage.Client()
  bucket = storage_client.bucket(bucket_name)
  blob = bucket.blob(destination_blob_name)
  blob.upload_from_string(string)
  logging.info("File {} uploaded to {}.".format(string[0:10], destination_blob_name))

def upload_blob_from_html(bucket_name, html, destination_blob_name):
  """Uploads a file to the bucket."""
  # bucket_name = "your-bucket-name"
  # source_file_name = "local/path/to/file"
  # destination_blob_name = "storage-object-name"
  logging.info("Starting file upload")
  storage_client = storage.Client()
  bucket = storage_client.bucket(bucket_name)
  blob = bucket.blob(destination_blob_name)
  blob.upload_from_string(html, content_type='text/html')
  logging.info("File {} uploaded to {}.".format(html[0:10], destination_blob_name))

def upload_blob_from_png(bucket_name, png, destination_blob_name):
  """Uploads a file to the bucket."""
  # bucket_name = "your-bucket-name"
  # source_file_name = "local/path/to/file"
  # destination_blob_name = "storage-object-name"
  logging.info("Starting file upload")
  storage_client = storage.Client()
  bucket = storage_client.bucket(bucket_name)
  blob = bucket.blob(destination_blob_name)
  blob.upload_from_string(png, content_type='image/png')
  logging.info("File {} uploaded to {}.".format(png[0:10], destination_blob_name))

# Convert the keys to usable string
age_map = {
  0 : "Not Recorded",
  10: "Child 0–8",
  15: "Youth Primary 9–11",
  20: "Youth YMYW 12–17",
  30: "Young Adult 18–30",
  40: "Middle Age Adult 31–45",
  50: "Mature Adult 46–59",
  60: "Senior Adult 60+"
}
inv_age_map = {v: k for k, v in age_map.items()}

gender_map = {
  'M': "Male",
  'F': "Female",
  'U': "Not Recorded"
}
