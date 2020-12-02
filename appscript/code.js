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
          .addItem('Create sheet', 'setUpSheet')
          .addItem('Remove sheet', 'tearDownSheet')
          .addItem('activateTriggers', 'activateTriggers')
          .addItem('deactivateTrigger', 'deactivateTrigger')
          .addItem('updateNewRow', 'updateNewRow')
          .addItem('updateConditionalFormattingRules', 'updateConditionalFormattingRules')
          .addItem('updateDataValidationRules', 'updateDataValidationRules')
          .addItem('highlightSheet', 'highlightSheet')
          .addItem('hideRows', 'hideRows')
          .addItem('updateAndMerge', 'updateAndMerge')
          .addItem('testDeets', 'testDeets')
          
          .addItem('Test page logic', 'test_doLogicPageMessages')
          .addItem('updateSheet', 'updateSheet')
          .addItem('computeTheStuff', 'computeTheStuff')
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