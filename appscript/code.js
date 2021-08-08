var baseURL = "https://api-dot-eighth-vehicle-287322.uc.r.appspot.com/" // Don't forget last slash
const _ = LodashGS.load()

function onOpen(e) {
  var menu = SpreadsheetApp.getUi().createMenu('Missionary Tools')
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Find member profiles')
      .addItem('Start', 'showPopup')
      .addItem('Reset', 'reset'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Page interaction manager')
      .addItem('Create', 'setUpSheet')
      .addItem('Analytics', 'showAnalytics')
      .addItem('Format', 'formatSheet')
      .addItem('Settings', 'showSettings'))
    .addItem('Feedback', 'showFeedback')
  menu.addToUi()

  checkForAddonUpdates()
}

// Make the menu appear after installing it
function onInstall(e) {
  onOpen(e)
  addUserToDB()
}


function getEffectiveUserEmail() {
  //Put user email into html when it loads for determining whether user is the authorized user
  return Session.getEffectiveUser().getEmail()
}

function checkForAddonUpdates() {
  let isPageInteractionSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Ad Likes')
  if (isPageInteractionSheet == null) return

  let versionNotifications = JSON.parse(PropertiesService.getDocumentProperties().getProperty('UpdateNotifications')) || {}
  let { authFixed, feedbackUpdate } = versionNotifications
  let updateMessageHTML = ''
  if (!authFixed) {
    updateMessageHTML += `
      Authentication Errors Update
        ○ Updated Page Interaction Manager settings to now show if you are disconnected from google or facebook
        ○ Page Interaction Manager Settings now has an option to reauthenticat with google and facebook
      `
    versionNotifications.authFixed = true
  }

  if (!feedbackUpdate) {
    updateMessageHTML += `
      Feedback Update
        ○ Feature: Under Page Interaction Manager Feedback you can now fill out a bug report or feature request
        ○ Feature: Added the option to select a default status and/or assignment
      
      Profile Link Update
        ○ Updated the profile link updates so if it can't find a link it will state Not Found
      `
    versionNotifications.feedbackUpdate = true
  }

  if (updateMessageHTML) {
    const ui = SpreadsheetApp.getUi()
    response = ui.alert('Recent Updates', updateMessageHTML, ui.ButtonSet.OK)
    if (response == ui.Button.OK)
      PropertiesService.getDocumentProperties().setProperty('UpdateNotifications', JSON.stringify(versionNotifications))
  }
}