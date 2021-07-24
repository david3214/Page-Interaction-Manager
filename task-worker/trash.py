# type: ignore
# Install Chrome for Selenium
ARG CHROME_VERSION="google-chrome-stable"
RUN apt-get update && apt-get install unzip
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update -qqy \
  && apt-get -qqy install \
    ${CHROME_VERSION:-google-chrome-stable} \
  && rm /etc/apt/sources.list.d/google-chrome.list \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*
ENV GOOGLE_CHROME_BIN=/usr/bin/google-chrome
ARG CHROME_DRIVER_VERSION="latest"
RUN CD_VERSION=$(if [ ${CHROME_DRIVER_VERSION:-latest} = "latest" ]; then echo $(wget -qO- https://chromedriver.storage.googleapis.com/LATEST_RELEASE); else echo $CHROME_DRIVER_VERSION; fi) \
  && echo "Using chromedriver version: "$CD_VERSION \
  && wget --no-verbose -O /tmp/chromedriver_linux64.zip https://chromedriver.storage.googleapis.com/$CD_VERSION/chromedriver_linux64.zip \
  && rm -rf /opt/selenium/chromedriver \
  && unzip /tmp/chromedriver_linux64.zip -d /opt/selenium \
  && rm /tmp/chromedriver_linux64.zip \
  && mv /opt/selenium/chromedriver /opt/selenium/chromedriver-$CD_VERSION \
  && chmod 755 /opt/selenium/chromedriver-$CD_VERSION \
  && ln -fs /opt/selenium/chromedriver-$CD_VERSION /usr/bin/chromedriver
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver



import threading, queue
import multiprocessing
from alive_progress import alive_bar

def worker():
  bot = MissionaryBot(facebook_username="graham.harrison@missionary.org", facebook_password="***REMOVED***")
  bot.language = "japanese-kansai"
  bot.authenticate_with_facebook()
  while True:
    item = q.get()
    print(f'Working on {item}')
    for name in item[1]:
      if name in merged.keys():
        item[1].remove(name)
    profile_links = bot.scrape_post_reactions_for_people(item[0], item[1])
    results.put(profile_links)
    print(f'Finished {item}')
    q.task_done()
    if q.empty():
      bot.wd.quit()
      break

def progress_bar(queue):
  with alive_bar(queue.qsize()) as bar:
    size = queue.qsize()
    while not queue.empty():
      for _ in range(size - queue.qsize()):
        size = queue.qsize()
        bar()
      time.sleep(1)


def merge_results(queue):
  global merged
  while True:
    obj = queue.get()
    if obj is not None:
      merged = {**merged, **obj}

if __name__ == "__main__":
  q = queue.Queue()
  results = queue.Queue()
  merged = {}

  with open('input.json') as json_file:
    data = json.load(json_file)

  for key, value in data.items():
    q.put([key, value])
  print('All task requests sent\n', end='')
  threading.Thread(target=progress_bar, daemon=True, args=[q], name="Q Monitor").start()
  threading.Thread(target=merge_results, daemon=True, args=[results], name="Merge Results").start()

  for _ in range(multiprocessing.cpu_count()):
    threading.Thread(target=worker, daemon=True, name=f"Profile_worker_{_}").start()
    time.sleep(5)
  
  q.join()
  print('All work completed')
  
  with open('results.json', 'w') as outfile:
    json.dump(merged, outfile)






    self.wd.implicitly_wait(5)
    try: # Loggin in
      self.set_status(f"Starting Authentication with Facebook")
      self.wd.get("https://www.facebook.com/")
      
      try: # Check for facebook version 2
        if :
          return
      except:
        self.set_status("Not on version 2")
      picture_log = {}
      picture_log[f"1"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
      if self.wd.find_element_by_name("email"):

        picture_log[f"2-email"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
      try: # Check if we are allowed in imediately
        try: # Check for facebook version 2
          if self.wd.find_element_by_xpath(self.facebook_paths[self.language]["home_button"]):
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
          self.logger.info('trying to confirm)
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
        if self.wd.find_element_by_xpath(self.facebook_paths[self.language]["home_button"]):
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
      self.logger.error(f'{self.church_username} : {e}') 
      picture_log[f"exception"] = {'screen_shot': self.wd.get_screenshot_as_png(), 'html': self.wd.page_source}
      raise Exception
    finally:
      for key in picture_log.keys():
        file_name = f"debug/{self.church_username}/{key}"
        upload_blob_from_png(os.environ.get('BUCKET_NAME'), picture_log[key]['screen_shot'], file_name + '.png')
        upload_blob_from_html(os.environ.get('BUCKET_NAME'), picture_log[key]['html'], file_name + '.html')

# javascript doPost
function doPost(request){
  // Load the stored data for the page

  try {
    var event = mode == "TEST" ? test_data.sample_page_notifications_accept.shift() : JSON.parse(request.postData.getDataAsString());
    if (event.entry[0].messaging) {var event_type = 'message'} else if (event.entry[0].changes[0].value.item) {var event_type = 'reaction'}
    var event_type = mode == "TEST" ? "reaction" : event_type;
    var eventNameMap = {'reaction': 'Ad Likes', 'message': 'Page Messages'};
    var reactionsMap = internalVariables.reactionsMap;
    var page_id = undefined;
    var page_details = undefined;
    if (event_type == "reaction"){
      // Classify the incoming event
      // Reject stuff we aren't interested in
      if (event.entry[0].changes[0].value.item == 'video' 
      ||  event.entry[0].changes[0].value.item == 'comment'
      ||  event.entry[0].changes[0].value.verb != 'add') {
        return ContentService.createTextOutput(JSON.stringify({"status": "Unprocessed"}));
      }
      page_id = event.entry[0].id;

    } else if (event_type == "message"){
      page_id = event.entry[0].messaging[0].recipient.id

    }

    var page_details = getPageDetails(page_id);
    if (!page_details) {throw {name : "ValueError", message : `Searched for ${page_id} but no result was found`}}

    // Process reactions
    if (event_type == "reaction"){
      var messageOrReaction = reactionsMap[event.entry[0].changes[0].value.reaction_type.toUpperCase()];
      var name = event.entry[0].changes[0].value.from.name;
      var psid = event.entry[0].changes[0].value.from.id;
      var facebookClue = `https://facebook.com/${encodeURIComponent(event.entry[0].changes[0].value.post_id)}`
    }
    else if (event_type == "message"){
      var messageOrReaction = event.entry[0].messaging[0].message.text;
      // Get name from fb
      var url = `https://graph.facebook.com/${event.entry[0].messaging[0].sender.id}?fields=first_name,last_name&access_token=${page_details.access_token}`
      var results = JSON.parse(UrlFetchApp.fetch(url).getContentText());
      var name = results['first_name'] + " " + results['last_name'];
      var psid = event.entry[0].messaging[0].sender.id;
      var facebookClue = `https://www.facebook.com/search/people?q=${encodeURIComponent(name)}`
    }

    // Process current time
    var today  = new Date();
    today = today.toLocaleDateString("en-US")

    // Send the results to the sheet as the user
    var spreadsheetId = page_details.google_sheets.id
    var sheetName = eventNameMap[event_type];
    var values = {"values":[[today, name, "", "", psid, facebookClue, "", "", "", "", messageOrReaction, "", ""]]};
    var options = {
      "headers": {
           'Authorization': 'Bearer ' + page_details.google_sheets.token,
           "Content-type": "application/json",
       },
      "method": "POST",
      "payload": JSON.stringify(values),
      'muteHttpExceptions': true 
    }
    var url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) + "/values/" + encodeURIComponent(sheetName) + ":append?insertDataOption=INSERT_ROWS&valueInputOption=USER_ENTERED";
    var results = UrlFetchApp.fetch(url, options);

    if (results.getResponseCode() !== 200){
      var clientId = PropertiesService.getScriptProperties().getProperty("MT_CLIENT_ID");
      var clientSecret = PropertiesService.getScriptProperties().getProperty("MT_CLIENT_SECRET");
      var refreshToken = page_details.google_sheets.refresh_token;
      var accessToken = refreshAccessToken(clientId, clientSecret, refreshToken);
      page_details.google_sheets.token = accessToken;
      options.headers.Authorization = 'Bearer ' + page_details.google_sheets.token;
      setPageDetails(page_details.id, page_details);
      var results = UrlFetchApp.fetch(url, options);
      if (results.getResponseCode() !== 200){throw {name : "TokenError", message : `Tried to update access token but failed for ${JSON.stringify(page_details)}`}};
    }

    return ContentService.createTextOutput(JSON.stringify({"status": "Processed"}));
  } catch (error) {
      Logger.log(`error in doPost ${JSON.stringify(error.message)}, ${JSON.stringify(request)}`);
      return ContentService.createTextOutput(JSON.stringify({"status": "Error"}));
  }
}