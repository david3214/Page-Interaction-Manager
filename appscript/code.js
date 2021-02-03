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
}

// Make the menu appear after installing it
function onInstall(e) {
    onOpen(e);
    // Perform additional setup as needed.
}


function getEffectiveUserEmail() {
    //Put user email into html when it loads for determining whether user is the authorized user
    return Session.getEffectiveUser().getEmail();
}