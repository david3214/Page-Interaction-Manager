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
          .addItem('Remove sheet', 'tearDownSheet'))
      .addToUi();
}