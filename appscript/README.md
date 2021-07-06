# Google Apps Script Add-on

This project is made using [Google Apps Script](https://developers.google.com/apps-script) (It is Javascript with some additional tools and restrictions)

We use [clasp](https://github.com/google/clasp) for editing it. Here is a short [guide](https://yagisanatode.com/2019/04/01/working-with-google-apps-script-in-visual-studio-code-using-clasp/) to getting clasp setup on your machine.

## Connection Tracker

This section is outdated. It currently is listed under the .claspignore and is not a part of the project. It was used for tracking various data

## Member Profiles

This one is going to possibly be deprecated as well. It is the code for running the member Profile Finder. 
Currently (As of 7/6/21) the api for the finder is not running, so if someone tries to use it this feature it will not work.

## Page Interaction Manager

This is used for everything that the users see in relation to the page interaction manager. 
This includes 
- Menus they interact with like settings.html
- page_interaction/code.js contains all the code working with the sheets.
  - Includes program settings, formatting, sorting, etc
- page_interaction/Facebook.js is where the facebook webhook is and code related to that data
- page_interaction/database.js is where user preferences are stored, as well as the sheet_id etc used by the profile scraping bot

## How to Update the add-on via Google Cloud

Once you have Google Cloud setup on your account. You will need to be added to the project. 
You may reach out to either [david3214](https://github.com/david3214) or [grahas](https://github.com/grahas) to be added to the project.

Once added go to the Google Workspace Marketplace SDK under the app configuration to update the add-on version

*Important thing to note, if any changes to authorization scopes were made it will be an ordeal to get the add-on reapproved by Google.
If no major changes are made the add-on should update nearly immediatly.*

https://console.cloud.google.com/apis/api/appsmarket-component.googleapis.com/googleapps_sdk?authuser=0&project=eighth-vehicle-287322
