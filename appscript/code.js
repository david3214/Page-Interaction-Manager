var baseURL = "https://api-dot-eighth-vehicle-287322.uc.r.appspot.com/"; // Don't forget last slash
const _ = LodashGS.load();

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
/**
  if (e && e.authMode != ScriptApp.AuthMode.NONE) { //
    // Add a menu item based on properties (doesn't work in AuthMode.NONE).
    Logger.log(e.authMode)
    Logger.log(Session.getActiveUser().getEmail())
    
    
    var debugUsers = JSON.parse(PropertiesService.getScriptProperties().getProperty("debugEnabled")).users;
    if (_.includes(debugUsers, Session.getActiveUser().getEmail())) {
      // add debug menu
      menu.addItem('Debug', 'showDebugSidebar')
    }
  }
  */
  menu.addToUi();

    
}

// Make the menu appear after installing it
function onInstall(e) {
    onOpen(e);
    // Perform additional setup as needed.
    addUserToDB();
}


function getEffectiveUserEmail() {
    //Put user email into html when it loads for determining whether user is the authorized user
    return Session.getEffectiveUser().getEmail();
}
