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
  authfixed = PropertiesService.getDocumentProperties().getProperty('AuthFixNotified')
  isPageInteractionSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Ad Likes')
  if (!authfixed && isPageInteractionSheet != null) {
    const ui = SpreadsheetApp.getUi()
    response = ui.alert(`We resently updated the Page Interaction Manager. 
    If your sheet has not been receiving updates please check out the Page Interaction Manager
    settings to relink your sheet to Google and/or your facebook page`)
    if (response == ui.Button.OK)
      PropertiesService.getDocumentProperties().setProperty('AuthFixNotified', true)
  }
}