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
      .addItem('Settings', 'showSettings')
      .addItem('QR Codes', 'showQRCodes'))
    .addSeparator()
    .addItem('Updates', 'showUpdatesModel')
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

  let updateMessages = getAllUpdates()

  let versionNotifications = {}
  try {
    versionNotifications = JSON.parse(PropertiesService.getUserProperties().getProperty('UpdateNotifications')) || {}
  } catch {}
  
  const finalMessage = updateMessages.reduce((message, update) => {
    if (!versionNotifications[update.name]){
      message += `\n${update.name}\n${update.message}\n`
      versionNotifications[update.name] = true
    }

    return message
  }, ``)

  if (finalMessage) {
    const ui = SpreadsheetApp.getUi()
    response = ui.alert('Recent Updates', finalMessage, ui.ButtonSet.OK)
    if (response == ui.Button.OK)
      PropertiesService.getUserProperties().setProperty('UpdateNotifications', JSON.stringify(versionNotifications))
  }
}