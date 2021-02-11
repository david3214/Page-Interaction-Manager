/**
 * @OnlyCurrentDoc
 */

var baseURL = "https://api-dot-eighth-vehicle-287322.uc.r.appspot.com/"; // Don't forget last slash

function onOpen() {
    SpreadsheetApp.getUi() 
      .createMenu('Missionary Tools')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('Find member profiles')
            .addItem('Start', 'showPopup')
            .addItem('Reset', 'reset'))
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('Page interaction manager')
            .addItem('Create', 'setUpSheet')
            .addItem('Analytics', 'showAnalytics')
            .addItem('Settings', 'showSettings'))
      .addToUi();
    if (e && e.authMode != ScriptApp.AuthMode.NONE) {
        addUserToDB();
    }
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

function onOpen(e) {
    var menu = SpreadsheetApp.getUi().createAddonMenu(); // Or DocumentApp.
    if (e && e.authMode == ScriptApp.AuthMode.NONE) {
      // Add a normal menu item (works in all authorization modes).
      menu.addItem('Start workflow', 'startWorkflow');
    } else {
      // Add a menu item based on properties (doesn't work in AuthMode.NONE).
      var properties = PropertiesService.getDocumentProperties();
      var workflowStarted = properties.getProperty('workflowStarted');
      if (workflowStarted) {
        menu.addItem('Check workflow status', 'checkWorkflow');
      } else {
        menu.addItem('Start workflow', 'startWorkflow');
      }
    }
    menu.addToUi();
  }