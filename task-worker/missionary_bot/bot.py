""" Worker class for automating missionary work online. """
import gzip
import json
import logging
import os
import pickle
import signal
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
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from urllib.parse import urlparse, parse_qs
import jwt

from .errors import AuthenticationError, BlockedError

# Redis
# url = urllib.parse.urlparse(os.environ.get('REDISCLOUD_URL'))
# r = redis.Redis(host=url.hostname, port=url.port, password=url.password)
context = pa.default_serialization_context()


class MissionaryBot:
    def __init__(self, config):
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.DEBUG)
        self.church_username = config.CHURCH_USERNAME
        self.church_password = config.CHURCH_PASSWORD
        self.facebook_username = config.FACEBOOK_USERNAME
        self.facebook_password = config.FACEBOOK_PASSWORD
        self.language = config.LANGUAGE
        self.selenium_url = config.DRIVER_URL
        with open('missionary_bot/facebook_paths.json') as f:
            self.facebook_paths = json.load(f)
        self.set_status('Intializing')

        self.church_auth_url = "https://areabook.churchofjesuschrist.org/services/auth"
        self.stewardCmisIds = []
        # self.pros_area_url = f'https://areabook.churchofjesuschrist.org/services/mission/prosArea/{pros_area_id}'
        self.area_book_json = f'https://areabook.churchofjesuschrist.org/services/people/primary?stewardCmisIds={",".join(self.stewardCmisIds)}'
        self.person_profile_id = None
        self.person_profile = f'https://areabook.churchofjesuschrist.org/services/people/{self.person_profile_id}'

        self.chrome_options = webdriver.ChromeOptions()
        self.chrome_options.binary_location = os.environ.get(
            "GOOGLE_CHROME_BIN")
        # self.chrome_options.add_argument("--headless")
        self.chrome_options.add_argument("--disable-gpu")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--silent")
        self.chrome_options.add_argument("--incognito")
        self.chrome_options.add_argument("--disable-notifications")
        self.chrome_options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36")
        # self.chrome_options.add_argument('--proxy-server=socks5://localhost:8080')
        self.chrome_options.add_argument("--log-level=3")
        # self.wd = webdriver.Chrome(executable_path=os.environ.get("CHROMEDRIVER_PATH"), chrome_options=self.chrome_options)
        self.wd = webdriver.Remote(
            self.selenium_url, DesiredCapabilities.CHROME, options=self.chrome_options)
        # self.wd.set_window_size(1920, 1080)
        # self.wd.implicitly_wait(30)
        # self.wd.set_script_timeout(30)

    """
  Run startup routine
  """

    def do_work(self):
        try:
            self.set_status('Feature unavailable due to no redis db')
            # self.set_status('Doing work')
            # r.set(self.church_username + ":alive", 'true')
            # area_book_results = self.scrape_area_book_for_people()
            # r.set(self.church_username+':area_book_results',
            #       context.serialize(area_book_results).to_buffer().to_pybytes())
            # self.authenticate_with_facebook()
            # self.load_facebook_profiles()
            # self.set_status('Done working')
            # r.set(self.church_username + ":alive", 'false')
            return True
        except:
            self.delete()

    """
  fetch all the facebook profiles
  """

    def load_facebook_profiles(self):
        self.set_status('Feature unavailable due to no redis db')
        # self.set_status("Starting to Load Facebook Profiles")
        # area_book_results = context.deserialize(
        #     r.get(self.church_username+':area_book_results'))
        # r.set(self.church_username + ":current_index", -2)
        # count_row = area_book_results.shape[0]
        # blocked_by_facebook = False
        # time_to_wait = 30
        # loop_index = 0
        # for row_number, row in area_book_results.iterrows():
        #     loop_index += 1
        #     if not r.exists(self.church_username + ":alive"):
        #         r.delete(self.church_username + ":facebook_search_results")
        #         self.wd.quit()
        #         raise KeyboardInterrupt
        #     try:
        #         row['firstName'] = str(row['firstName'] or '')
        #         row['lastName'] = str(row['lastName'] or '')
        #         row['gender'] = 'U' if row['gender'] == None else row['gender']
        #         if row['ageCategoryId'] != row['ageCategoryId']:
        #             row['ageCategoryId'] = 0
        #         combined = {}
        #         search_term = row["firstName"] + " " + row["lastName"]
        #         if len(search_term.split()) > 2:
        #             first, *middle, last = search_term.split()
        #             search_term = first + " " + last
        #         facebook_search_url = f'https://www.facebook.com/search/people?q={urllib.parse.quote(search_term)}'
        #         self.wd.get(facebook_search_url)
        #         time.sleep(time_to_wait)
        #         if len(self.wd.find_elements_by_xpath("""//*[contains(text(), "You Can't Use This Feature Right Now")]""")) != 0:
        #             blocked_by_facebook = True
        #             while blocked_by_facebook:
        #                 self.set_status(
        #                     "Facebook rate limit active, sleeping for an hour")
        #                 self.logger.error("Facebook has detected bot")
        #                 time.sleep(3600)
        #                 self.wd.get(facebook_search_url)
        #                 time.sleep(time_to_wait)
        #                 if len(self.wd.find_elements_by_xpath("""//*[contains(text(), "You Can't Use This Feature Right Now")]""")) == 0:
        #                     blocked_by_facebook = False
        #             self.set_status("Loading Facebook Profiles")
        #             time_to_wait += 1
        #         content = self.parse_facebook_search_page(self.wd.page_source)
        #         if content == None or content == "None":
        #             self.logger.warning("Didn't find any search results")
        #             content = f'<br>Didn\'t Find Any Good Results <br> Maybe search <a href="{facebook_search_url}">{row["firstName"]+ " " +row["lastName"]}</a> on Facebook by hand?<br>'
        #         combined['content'] = content
        #         combined['about'] = f'Name: {str(row["firstName"]) + " " +str(row["lastName"])}<br>Age: {age_map[row["ageCategoryId"]]}<br>Gender: {gender_map[row["gender"]]}'
        #         self.logger.info(
        #             f"{row['firstName']} {row['lastName']} {loop_index} / {count_row} ... {round(((loop_index / count_row) * 100), 2)}% done")
        #     except Exception as e:
        #         self.logger.debug(row)
        #         self.logger.error(e)
        #     finally:
        #         try:
        #             combined = bytes(json.dumps(combined), 'utf-8')
        #             r.rpush(self.church_username +
        #                     ":facebook_search_results", gzip.compress(combined))
        #         except:
        #             combined = bytes(json.dumps(
        #                 {'about': 'Something Broke', 'content': 'Something Broke'}), 'utf-8')
        #             r.rpush(self.church_username +
        #                     ":facebook_search_results", gzip.compress(combined))

        # self.set_status("Done Loading Facebook Profiles")

    def set_status(self, status):
        """
        Set status of the bot
        """
        try:
            self.logger.info(f'{self.church_username}: {status}')
            # return r.set(self.church_username + ":status", status)
        except:
            self.logger.info(f'{status}')

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
            results_container = soup.find(
                "div", {"aria-label": "Search Results"})
            if results_container == None:
                results_container = soup.find(
                    "div", {"id": "BrowseResultsContainer"})
            else:
                for circle in results_container.find_all('circle', {'class': "mlqo0dh0 georvekb s6kb5r3f"}):
                    circle.decompose()
        except:
            # print(e)
            pass
        finally:
            return str(results_container)

    def authenticate_with_church(self):
        """
        Authenticate with church
        return true if successfull 
        """
        self.set_status('Starting Authentication with church')
        # Check if already logged in
        self.wd.find_element_by_id(
            "okta-signin-username").send_keys(self.church_username)
        self.wd.find_element_by_id("okta-signin-submit").click()
        WebDriverWait(self.wd, 10).until(EC.presence_of_element_located(
            (By.NAME, "password"))).send_keys(self.church_password)
        self.wd.find_element_by_name("password").submit()
        self.set_status('Done authenticating with church')
        return True

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
        self.wd.get("https://www.facebook.com/")
        self.set_status('Starting Authentication with Facebook')
        WebDriverWait(self.wd, 10).until(
            EC.presence_of_element_located((By.NAME, "email")))
        self.wd.find_element_by_name("email").send_keys(self.facebook_username)
        self.wd.find_element_by_name("pass").send_keys(self.facebook_password)
        self.wd.find_element_by_name("pass").submit()
        self.set_status('Done Authentication with Facebook')
        try:
            WebDriverWait(self.wd, 10).until(EC.presence_of_element_located(
                (By.XPATH, self.facebook_paths[self.language]['home_button'])))
        except:
            self.set_status("Failed to login to Facebook")
            raise AuthenticationError(provider="Facebook")
        return True

    def scrape_post_reactions_for_people(self, post_url, people):
        """
        Get a dictionary of the names and profile links of a list of people for a post
        """
        def clean_facebook_profile_url(url):
            o = urlparse(url)
            if o.path == '/profile.php':
                return o.scheme + "://" + o.netloc + o.path + "?id=" + parse_qs(o.query)['id'][0]
            elif o.scheme == 'https':
                return o.scheme + "://" + o.netloc + o.path
        results = {}
        if post_url == '' or len(people) == 0:
            self.logger.info(f"Skiping {post_url} of length {len(people)}")
            return results
        try:
            self.set_status('Scraping for profile_id')
            self.wd.get(post_url)
            WebDriverWait(self.wd, 10).until(EC.presence_of_element_located(
                (By.XPATH, self.facebook_paths[self.language]['reactions_button'])))
            reaction_button = self.wd.find_elements_by_xpath(
                self.facebook_paths[self.language]["reactions_button"])[0]
            reaction_button.click()
            previous_links = None
            while len(people) != 0:
                links = WebDriverWait(self.wd, 10).until(EC.presence_of_element_located(
                    (By.XPATH, self.facebook_paths[self.language]['reactions_box']))).find_elements_by_tag_name('a')
                for link in links:
                    if link.text in people:
                        cleaned_url = clean_facebook_profile_url(
                            link.get_attribute('href'))
                        results[link.text] = cleaned_url
                        people.remove(link.text)
                    if len(people) == 0:
                        return results
                if links == previous_links:
                    return results
                else:
                    previous_links = links

                box = self.wd.find_element_by_xpath(
                    self.facebook_paths[self.language]['reactions_scroll_bar'])
                actions = ActionChains(self.wd)
                actions.move_to_element(box)
                actions.click(box)
                actions.key_down(Keys.CONTROL)
                actions.key_down(Keys.END)
                actions.key_up(Keys.CONTROL)
                actions.key_up(Keys.END)
                actions.perform()
                locator = (
                    By.XPATH, self.facebook_paths[self.language]['reactions_box_list'])
                length = len(self.wd.find_elements_by_xpath(
                    self.facebook_paths[self.language]['reactions_box_list']))
                condition = elements_length_changes(locator, length)
                WebDriverWait(self.wd, 5, 1).until(condition)
        except:
            if 'www.facebook.com/login/' in self.wd.current_url:
                # If the webdriver has been open for a while it may have been logged out
                self.logger.warning(
                    'Attempting to login again, url: {}'.format(self.wd.getCurrentURL()))
                self.authenticate_with_facebook()
                return self.scrape_post_reactions_for_people(post_url, people)
            elif len(self.wd.find_elements_by_xpath(self.facebook_paths[self.language]["facebook_blocked"])):
                # If facebook has blocked us because we've been doing too many tasks kill the process
                results['BlockedError'] = True
        finally:
            return results


    def facebook_blocked(self, post_url):
        try:
            self.set_status('Scraping for profile_id')
            self.wd.get(post_url)
            # If not foudn in 10 seconds, it will throw an error
            WebDriverWait(self.wd, 10).until(EC.presence_of_element_located(
                (By.XPATH, self.facebook_paths[self.language]['reactions_button'])))
            reaction_button = self.wd.find_elements_by_xpath(
                self.facebook_paths[self.language]["reactions_button"])[0]
            reaction_button.click()
            # If not found in 10 seconds, it will throw an error
            WebDriverWait(self.wd, 10).until(EC.presence_of_element_located(
                    (By.XPATH, self.facebook_paths[self.language]['reactions_box']))).find_elements_by_tag_name('a')
            return False
        except:
            # If it couldn't find the element because we were blocked return true
            if len(self.wd.find_elements_by_xpath(self.facebook_paths[self.language]["facebook_blocked"])):
                return True
            return False


    def scrape_area_book_for_people(self):
        """
        Connect to areabook web and scrape the data
        return the df
        """
        # Authenticate with area book app
        self.set_status("Starting Scraping Areabook")
        self.wd.get(self.church_auth_url)
        try:
            self.authenticate_with_church()
        except:
            self.set_status("Failed to login to church")

        #
        self.wd.find_elements_by_tag_name("pre")
        auth_data = self.parse_church_json(self.wd.page_source)
        auth_data = jwt.decode(auth_data['token'], verify=False)
        self.stewardCmisIds = auth_data['companions']
        self.wd.get(self.area_book_json)
        self.wd.find_elements_by_tag_name("pre")
        area_book_data = self.parse_church_json(self.wd.page_source)
        upload_blob_from_string(os.environ.get('BUCKET_NAME'), json.dumps(
            area_book_data), f'areabooks/{auth_data["areaId"]}.json')
        upload_blob_from_string(os.environ.get('BUCKET_NAME'), json.dumps({'church_username': self.church_username, 'church_password': self.church_password,
                                'facebook_username': self.facebook_username, 'facebook_password': self.facebook_password, 'authdata': json.dumps(auth_data)}), f'users/{self.church_username}.json')
        df = pd.json_normalize(area_book_data['persons'])
        df = df[(df['ageCategoryId'] > inv_age_map["Youth Primary 9–11"])
                | (df['ageCategoryId'] == 0)]
        self.set_status("Done scraping areabook.")
        return df

    def pass_data(self, url):
        self.wd.get(url)
        self.wd.find_element_by_tag_name('input')
        return self.wd.page_source

    def say_hi(self):
        print("Hi")
        return "Hi"

    def delete(self):
        """Delete the instance of the bot in case of failure"""
        self.set_status('Started Deleting Self')
        url = f"https://api-dot-eighth-vehicle-287322.uc.r.appspot.com/bot?church_username={self.church_username}"
        payload = {}
        headers = {}
        requests.request("DELETE", url, headers=headers, data=payload)


def convert_html_to_data_frame(html):
    """
    Returns a list of data frames of tables in the html page
    """
    df_list = []
    soup = BeautifulSoup(html, 'html.parser')
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
                      "address", "phone", "phoneHome", "phoneMobile"]
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
    # logging.info("File {} uploaded to {}.".format(string[0:10], destination_blob_name))


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
    logging.info("File {} uploaded to {}.".format(
        html[0:10], destination_blob_name))


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
    logging.info("File {} uploaded to {}.".format(
        png[0:10], destination_blob_name))


# Convert the keys to usable string
age_map = {
    0: "Not Recorded",
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


class elements_length_changes(object):
    """An expectation for checking that an elements has changes.

    locator - used to find the element
    returns the WebElement once the length has changed
    """

    def __init__(self, locator, length):
        self.locator = locator
        self.length = length

    def __call__(self, driver):
        element = driver.find_elements(*self.locator)
        element_count = len(element)
        if element_count > self.length:
            return element
        else:
            return False
