/*jshint esversion: 6 */
// Dictionary of program settings
var defaultUserSettings = {
  // Program variables
  headerRowNumber: 1,

  statusList : ["Select", "Left on Read", "Rejected", "Do Not Contact", "Member", "Missionary", "Non Member", "Currently Messaging", "Teaching", "Baptized", "Stopped Teaching"],
  
  hiddenStatuses : ["Member", "Missionary", "Do Not Contact", "Rejected"],

  statusToMerge: ["Member", "Missionary", "Do Not Contact", "Rejected"],

  // Dictionary to map reactions
  reactionsMap : {"LIKE": '👍', "LOVE": '❤️', "CARE": '❤️', "HAHA": '😆', "WOW": '😮', "SAD": '😥', "ANGRY": '😡'},
  
  // 2d list to map wards to colors
  assignmentMap : [['Ward 1', '#82C1EC'], ['Ward 2', '#F28530'], ['Ward 3', '#FCFBC2'], ['Ward 4', '#ECE3D4'], ['Ward 5', '#F9F85F']],
  
  // Dictionary to map gender to colors
  genderMap : {'male': '#6ca0dc', 'female': '#f8b9d4'},
  
  // Dictionary to map the ads ids to names
  //adIDMap : {"1234567890": "Ad Name here"},

  triggerNames : ['doLogicPageMessages', 'updateSheet'],

  sheetSettings: {
      "Ad Likes": { "highlightEnabled": true, "sortingEnabled": true, "mergingEnabled": true },
      "Page Messages": { "highlightEnabled": false, "sortingEnabled": true, "mergingEnabled": true }
    },
};

// TODO Migrate internal variables in here
var internalVariables = {
  editableColumns: ['Gender', 'Profile Link', 'Assignment', 'Status', '@Sac', 'On Date', 'Notes'],
  memberStatusList: ['Member', 'Missionary', 'Baptized'],
  headerEnum: {'Date':0, 'Name':1, 'Gender':2, 'Profile Link':3, 'PSID':4, 'Source':5, 'Assignment':6, 'Status':7, '@Sac':8, 'On Date':9, 'Reaction':10, 'Notes':11, 'Counter':12}
};

var programSettings = function(sheet_id=SpreadsheetApp.getActiveSpreadsheet().getId()){
  var cache = CacheService.getScriptCache();
  var cached = cache.get(`programSettings:${sheet_id}`);
  if (cached !== null) {
    return JSON.parse(cached);
  }
  var settings = getPreference(sheet_id);
  cache.put(`programSettings:${sheet_id}`, JSON.stringify(settings), 6000);
  return settings;
};

function saveProgramSettings(settings, spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /* Write the settings to the database 
   * Takes an active spreadSheet
  */
  var sheet_id = spreadSheet.getId();
  setPreference(sheet_id, settings);
  var cache = CacheService.getScriptCache();
  cache.put(`programSettings:${sheet_id}`, JSON.stringify(settings), 6000);
}

/*
  Intakes a spreadsheet
*/
var TableHeader = function(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /* Translate page header */
  // var spreadSheetID = spreadSheet.getId();
  // var sheet = spreadSheet.getActiveSheet();
  // TODO Fix this, it will break with messages as it is specific to reactions
  // also it is taking to many api calls
  var header = {
    // headerData: sheet.getRange(programSettings(spreadSheetID).headerRowNumber, 1, 1, sheet.getLastColumn()).getValues()[0],
    headerData: ['Date', 'Name', 'Gender', 'Profile Link', 'PSID', 'Source', 'Assignment', 'Status', '@Sac', 'On Date', 'Reaction', 'Notes', 'Counter'],
    getColumnIndex(columnName) {return this.headerData.indexOf(columnName);}
  };
  return header;
};

var Rule = function(){
    return {'create': undefined};
};

function doLogicPageMessages(e=undefined, spreadSheet=SpreadsheetApp.getActiveSpreadsheet()) {
  /*
  Main function for the program
  Runs from the onChange trigger
  */

 var spreadSheet = e == undefined ? spreadSheet : e.source;
  // Determine what type of onChange event it is
  switch (e.changeType){
    case "INSERT_ROW":
      // Run logic to move row to top
      // Un-hide so we can see all the data
      hideRows(spreadSheet=spreadSheet, active=false);
      updateNewRow(spreadSheet=spreadSheet);
      updateSheet(e, spreadSheet=spreadSheet);
      break;
    case "EDIT":
      return;
    default:
  }
}

function onRowInsert(spreadSheet=SpreadsheetApp.getActiveSheet()){
  const _ = LodashGS.load();
  var sheet = spreadSheet.getActiveSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();
  var header = values.shift();
  var newRow = values.pop();

}

function updateNewRow(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()) {
/*
  Run the sort logic when a new row is added
*/
  var sheet = spreadSheet.getActiveSheet();
  var spreadSheetID = spreadSheet.getId();
  // Get the current active sheet
  var sheetName = sheet.getName();

  // Check if sortingEnabled is true for this sheet
  if (!programSettings(spreadSheetID)['sheetSettings'][sheetName].sortingEnabled){return;}
  
  // Check if allowed to merge rows
  var doMerge = programSettings(spreadSheetID)['sheetSettings'][sheetName].mergingEnabled;

  // Get range of all data
  var range = sheet.getDataRange().offset(programSettings(spreadSheetID).headerRowNumber, 0, sheet.getLastRow() - programSettings(spreadSheetID).headerRowNumber);
  var values = range.getValues();
  
  // Read in the table header translate to in
  tableHeader = new TableHeader(spreadSheet);
  
  // Get the new entry row
  var newRow = values.pop();
  
  // Get the new entry PSID
  var newPSID = newRow[tableHeader.getColumnIndex('PSID')];
  
  // List of PSID of members
  // Get rows where Member is true
  var memberPSIDList = values.filter(row => internalVariables.memberStatusList.includes(row[tableHeader.getColumnIndex('Status')]))
  .map(row => row[tableHeader.getColumnIndex('PSID')]);
  
  // List of PSID of non members who have messaged the page
  // Get rows where Member is false
  var nonMemberPSIDList = values.filter(row => !internalVariables.memberStatusList.includes(row[tableHeader.getColumnIndex('Status')]))
  .map(row => row[tableHeader.getColumnIndex('PSID')]);
  
  var reactionOrMessage = sheetName == "Ad Likes" ? tableHeader.getColumnIndex("Reaction") : tableHeader.getColumnIndex("Message");

  // Case 1 member messaging the page for multiple times
  // PSID is in list of member PSIDs
  if (memberPSIDList.includes(newPSID)) {
    // Need to measure the length of array so we know how many blank rows to put back in
    var initialLength = values.length;
    
    // Remove all matching rows from sheet except the checked one
    values = values.filter(row => row[tableHeader.getColumnIndex('PSID')] != newPSID 
    || (row[tableHeader.getColumnIndex('PSID')] == newPSID 
    && internalVariables.memberStatusList.includes(row[tableHeader.getColumnIndex('Status')])));
    
    // Measure difference and add the blanks in
    var finalLength = values.length;
    var difference = Math.abs(finalLength - initialLength);
    var blankArray = [...Array(difference + 1)].map(x=>Array(newRow.length));
    values.push(...blankArray);
    
    // Find the old entry and increment the counter
    oldRowIndex = values.findIndex(obj => obj[tableHeader.getColumnIndex('PSID')] == newPSID);
    values[oldRowIndex][tableHeader.getColumnIndex('Counter')] = parseInt(values[oldRowIndex][tableHeader.getColumnIndex('Counter')]) + 1 + parseInt(difference);
    
    // Update the reactionOrMessage for kicks
    values[oldRowIndex][reactionOrMessage] = newRow[reactionOrMessage];
  }
  
  // Case 2 non member messaging page for the multiple times
  // PSID is in the non member list
  else if (nonMemberPSIDList.includes(newPSID)){
    // Get the index of the first matching item with the same PSID
    oldRowIndex = values.findIndex(obj => obj[tableHeader.getColumnIndex('PSID')] == newPSID);
    if (doMerge == true ){
      // Bump the old row to the top
      // Get the old row
      var oldRow = values.splice(oldRowIndex, 1)[0];
      // Update the old row with the new row's time stamp and message and increment the counter
      oldRow[tableHeader.getColumnIndex('Date')] = newRow[tableHeader.getColumnIndex('Date')];
      oldRow[reactionOrMessage] = newRow[reactionOrMessage];
      oldRow[tableHeader.getColumnIndex('Counter')] = parseInt(oldRow[tableHeader.getColumnIndex('Counter')]) + 1;      
      // Move the old row to the top
      values.unshift(oldRow);
      // Add a blank row to keep the length the same
      var blankArray = new Array(oldRow.length);
      values.push(blankArray);
    }
    else {
      // Copy values from last row the new row
      internalVariables.editableColumns.map(columnName => tableHeader.getColumnIndex(columnName)).forEach(columnIndex => {
        newRow[columnIndex] = values[oldRowIndex][columnIndex];
      })
      newRow[tableHeader.getColumnIndex('Counter')] = 1;   
      values.unshift(newRow);
    }
  }
  
  // Case 3 member or non member first time messaging page
  // PSID is not in list of non member or member PDIDs
  else {
    // Add default values
    // If no time is added, insert it
    // newRow[tableHeader.getColumnIndex('Date')] = Utilities.formatDate(newRow[tableHeader.getColumnIndex('Date')], "GMT-6", "MM/dd/yyyy");
    
    // Reaction -> map word to emoji
    // newRow[tableHeader.getColumnIndex('Reaction')] = reactionsMap[newRow[tableHeader.getColumnIndex('Reaction')].toUpperCase()];
    
    // Source -> map number to an ad
    // newRow[tableHeader.getColumnIndex('Source')] = adIDMap[newRow[tableHeader.getColumnIndex('Source')]] == undefined ? newRow[tableHeader.getColumnIndex('Source')] : adIDMap[newRow[tableHeader.getColumnIndex('Source')]];
    
    // Assignment -> Default to first key
    newRow[tableHeader.getColumnIndex('Assignment')] = programSettings(spreadSheetID).assignmentMap.shift().shift();
    
    // Status -> Select
    newRow[tableHeader.getColumnIndex('Status')] = programSettings(spreadSheetID).statusList.shift();
    
    // @Sac -> FALSE
    newRow[tableHeader.getColumnIndex('@Sac')] = 'FALSE';
    
    // On Date -> FALSE
    newRow[tableHeader.getColumnIndex('On Date')] = 'FALSE';
    
    // Spot for Notes
    newRow[tableHeader.getColumnIndex('Notes')] = "";
    
    // Counter -> 1
    newRow[tableHeader.getColumnIndex('Counter')] = 1;
    
    // Predict if name is male or female
    // Check cache first
    var cache = CacheService.getScriptCache();
    var name = newRow[tableHeader.getColumnIndex('Name')];
    name = name.split(" ")[0];
    var cached = cache.get(name);
    if (cached == null && name) {
      var url = 'https://api.genderize.io' + '?name=' + encodeURIComponent(name);
      var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
      if (response.getResponseCode() !== 200) {Logger.log(response.getContentText())}
      var gender = JSON.parse(response.getContentText())['gender'];
      cache.put(name, gender, 864000);
    } else {
      var gender = cached;
    }
    // Guese gender
    newRow[tableHeader.getColumnIndex('Gender')] = gender;
    
    // Move the old row to the top
    values.unshift(newRow);
  }
  if (doMerge == true ){ values = mergeData(values, spreadSheet);}

  //Write the values back to the sheet
  range.setValues(values);
  
  // End
  return;
}

function updateExistingRows(e, spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /**
   * Update existing rows with the new event data
   */
  // If the row has the same psid as event then set the events new data to the current data
  
  // Reject if range changed
  if (!e.hasOwnProperty('value')){return;} 

  var sheet = spreadSheet.getActiveSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();
  var tableHeader = new TableHeader(spreadSheet);
  const PSID = tableHeader.getColumnIndex('PSID');
  e.columnIndex = e.range.getColumn() - 1;
  e.editedRow = values[e.range.getRowIndex() -1]
  // Reject if not editable
  if (!internalVariables.editableColumns.map(columnName => tableHeader.getColumnIndex(columnName)).includes(e.columnIndex)){return}
  values.forEach(function(row){
    if (row[PSID] != e.editedRow[PSID]) {return}
    row[e.columnIndex] = e.value;
  })
  range.setValues(values);
  return true;
}

function updateConditionalFormattingRules(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /*
  Adjust the conditional formating rules to cover the sheet data
  */
  var spreadSheetID = spreadSheet.getId();
  var sheet = spreadSheet.getActiveSheet();

  // Read in the table header translate to in
  tableHeader = new TableHeader(spreadSheet);
  
  // Track the conditional formatting
  var sheetConditionalFormatRules = [];

  // Get 'Name' column
  var name = sheet.getRange(2, tableHeader.getColumnIndex('Name')+1, sheet.getLastRow() - 1);
  
  // Get 'Assignment' column
  var assignment = sheet.getRange(2, tableHeader.getColumnIndex('Assignment')+1, sheet.getLastRow() - 1);
  
  // Make conditional formatting rule to give the different genders
  Object.keys(programSettings(spreadSheetID).genderMap).forEach(function(key){
    var genderConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=C2="${key}"`)
    .setBackground(programSettings(spreadSheetID).genderMap[key])
    .setRanges([name])
    .build();
    sheetConditionalFormatRules.push(genderConditionalFormatRule);
  });
  
  // Hide Gender, PSID, Profile Link 
  sheet.hideColumns(tableHeader.getColumnIndex('Gender')+1);
  sheet.hideColumns(tableHeader.getColumnIndex('PSID')+1);
  
  // Make conditional formatting rule to give the Assignments different colors
  programSettings(spreadSheetID).assignmentMap.forEach(function(assignmentPair){
    var assignmentConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(assignmentPair[0])
    .setBackground(assignmentPair[1])
    .setRanges([assignment])
    .build();
    sheetConditionalFormatRules.push(assignmentConditionalFormatRule);
  });
  
  // Apply conditional formatting rule to sheet
  sheet.setConditionalFormatRules(sheetConditionalFormatRules);
}

function updateDataValidationRules(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /*
  Function is reponsible for apply page wide data validation rules
  */ 
  // Get the current active sheet
  var spreadSheetID = spreadSheet.getId();
  var sheet = spreadSheet.getActiveSheet();

  // Read in the table header translate to in
  tableHeader = new TableHeader(spreadSheet);
  
  // Clear previous rules
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).setDataValidation(null);
  
  // Dictionary to hold all of our rules
  var rules = {};
  
  // Make 'Assignment' rule
  var assignment = new Rule();
  assignment.create = function(){
    
    // Make data validation rule for Assignment
    var enforceAssignment = SpreadsheetApp.newDataValidation();
    var assigment_vals = programSettings(spreadSheetID).assignmentMap.map(pair => pair[0]);
    enforceAssignment.requireValueInList(assigment_vals, true);
    enforceAssignment.build();
    
    // Set the assignment range rule
    sheet.getRange(2, tableHeader.getColumnIndex('Assignment')+1, sheet.getLastRow() - 1).setDataValidation(enforceAssignment);
  };
  rules["Assignment"] = assignment;
  
  // Make a 'Status' rule
  var status = new Rule();
  status.create = function(){
    
    // Make data validation rule for Status
    var enforceStatus = SpreadsheetApp.newDataValidation();
    
    enforceStatus.requireValueInList(programSettings(spreadSheetID).statusList, true);

    // Set the status range rule andd apply the rule
    sheet.getRange(2, tableHeader.getColumnIndex('Status')+1, sheet.getLastRow() - 1).setDataValidation(enforceStatus);
  };
  rules["Status"] = status;
  
  // Make a '@Sac' rule
  var atSac = new Rule();
  atSac.create = function(){
    
    // Make data validation rule for check boxes
    var enforceCheckbox = SpreadsheetApp.newDataValidation();
    enforceCheckbox.requireCheckbox();
    enforceCheckbox.setAllowInvalid(false);
    enforceCheckbox.build();
    
    // Get the atSac range and apply data validation check boxes
    sheet.getRange(2, tableHeader.getColumnIndex('@Sac')+1, sheet.getLastRow() - 1).setDataValidation(enforceCheckbox);
  };
  rules["@Sac"] = atSac;
  
  // Make a 'On Date' rule
  var onDate = new Rule();
  onDate.create = function(){
    
    // Make data validation rule for check boxes
    var enforceCheckbox = SpreadsheetApp.newDataValidation();
    enforceCheckbox.requireCheckbox();
    enforceCheckbox.setAllowInvalid(false);
    enforceCheckbox.build();
    
    // Get the 'On Date' range and apply data validation check boxes
    sheet.getRange(2, tableHeader.getColumnIndex('On Date')+1, sheet.getLastRow() - 1).setDataValidation(enforceCheckbox);
  };
  rules["On Date"] = onDate;
  
  // Make a 'Reaction' rule
  var reaction = new Rule();
  reaction.create = function(){
    
    // Make data validation rule for Reaction
    var enforceReaction = SpreadsheetApp.newDataValidation();
    enforceReaction.requireValueInList(Object.values(programSettings(spreadSheetID).reactionsMap), true);
    enforceReaction.build();
    
    // Get the reaction range and apply data validation rule for reaction
    sheet.getRange(2, tableHeader.getColumnIndex('Reaction')+1, sheet.getLastRow() - 1).setDataValidation(enforceReaction);
  };
  rules["Reaction"] = reaction;
  
  // Build the rules on for the current sheet
  tableHeader.headerData.forEach(function(columnName){
    if (rules.hasOwnProperty(columnName)){
      rules[columnName].create(sheet);
    }
  });
}

function highlightSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /*
  Ensure acurate highlighting on the sheet
  */
  var spreadSheetID = spreadSheet.getId();
  var sheet = spreadSheet.getActiveSheet();

  // Load initial data
  var sheetName = sheet.getName();

  // Check if highlighting is enabled
  if (!programSettings(spreadSheetID)['sheetSettings'][sheetName].highlightEnabled){ return; }
  
  // Clear previous highlighting
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).setBackground("white");
  
  // Highlight the rows in red that contain a matching PSID and have a default status
  // Get the values from the sheet
  var range = sheet.getDataRange().offset(programSettings(spreadSheetID).headerRowNumber, 0, sheet.getLastRow());
  var values = range.getValues();
  
  // Read in the table header translate to in
  var tableHeader = new TableHeader(spreadSheet);
  
  // Filter the values and get all PSID where status == select
  var selectPSID = values.filter(row => row[tableHeader.getColumnIndex('Status')] == 'Select').map(row => row[tableHeader.getColumnIndex('PSID')]);
  
  // Map the values if PSID is in previous filter results then mark the line red
  var colorRow = function(row){
    /* Color a specific cell in a row */
    if (selectPSID.includes(row[tableHeader.getColumnIndex('PSID')])) {
      var res = new Array(row.length).fill("red");
    } else {
      var res = new Array(row.length);
    }
    return res;
  };
  var results = values.map(colorRow);
  
  // Write back the results to google sheets
  range.setBackgrounds(results);
  
}

function hideRows(spreadSheet=SpreadsheetApp.getActiveSpreadsheet(), active=true){
  /* Hide rows with specific statuses */
  var spreadSheetID = spreadSheet.getId();
  var sheet = spreadSheet.getActiveSheet();

  // Get inital data
  var range = sheet.getDataRange();
  var values = range.getValues();
  var hiddenStatuses = programSettings(spreadSheetID).hiddenStatuses;
  var tableHeader = new TableHeader(spreadSheet);

  // Unhide all the rows
  sheet.unhideRow(range);
  if (active == false) {return;}

  // Get a list of indexes where the row status is in hidden status
  // Filter the values and get all PSID where status is in hiddenStatuses
  var PSIDsToHide = values.filter(row => hiddenStatuses.includes(row[tableHeader.getColumnIndex('Status')])).map(row => row[tableHeader.getColumnIndex('PSID')]);

  // Hides the rows in results
  var hideMatchingPSID = function(row, index){
    var currentPSID = row[tableHeader.getColumnIndex('PSID')];
    if (PSIDsToHide.includes(currentPSID)) {
      sheet.hideRows(index+1, 1);
    }
  };
  values.forEach(hideMatchingPSID);

}

function activateTriggers(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /* Create the project triggers */ 
  // Enable a trigger to run the page logic
  ScriptApp.newTrigger(programSettings(spreadSheet.getId())['triggerNames'][0])
  .forSpreadsheet(spreadSheet.getId())
  .onChange()
  .create();
  
  // Enable a triger to run on edit to do the highlights
  ScriptApp.newTrigger(programSettings(spreadSheet.getId())['triggerNames'][1])
  .forSpreadsheet(spreadSheet.getId())
  .onEdit()
  .create();

}


function deactivateTrigger(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /* Remove our project triggers */
  var triggers = ScriptApp.getProjectTriggers();
   var removeOurTriggers = function(trigger) {
     if (programSettings(spreadSheet.getId()).triggerNames.includes(trigger.getHandlerFunction())) {
       ScriptApp.deleteTrigger(trigger);
     }
   };
  triggers.forEach(removeOurTriggers);
}


function setUpSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()) {
  /*
  */
  // Save default settings to sheet
  saveProgramSettings(defaultUserSettings, spreadSheet);

  // Clear any old possible sheets 
  tearDownSheet(spreadSheet);

  // Create ad likes sheet
  var adLikesHeaders = ['Date', 'Name', 'Gender', 'Profile Link', 'PSID', 'Source', 'Assignment', 'Status', '@Sac', 'On Date', 'Reaction', 'Notes', 'Counter'];
  var sheetName = "Ad Likes";
  
  // Write headers
  var newSheet = spreadSheet.insertSheet(sheetName);
  newSheet.getRange(1,1,1, adLikesHeaders.length).setValues([adLikesHeaders]);
  
  // Trim to length
  var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn();
  newSheet.deleteColumns((newSheet.getLastColumn() +1), deleteColumns);
  
  // Create 'Page Messages' sheet
  var pageMessagHeaders = ['Date', 'Name', 'Gender', 'Profile Link', 'PSID', 'Source', 'Assignment', 'Status', '@Sac', 'On Date', 'Message', 'Notes', 'Counter'];
  var sheetName = "Page Messages";
  
  // Insert sheet
  var newSheet = spreadSheet.insertSheet(sheetName);

  // Write headers
  newSheet.getRange(1,1,1, pageMessagHeaders.length).setValues([pageMessagHeaders]);

  // Trim columns
  var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn();
  newSheet.deleteColumns((newSheet.getLastColumn() +1), deleteColumns);

  // Activate triggers
  activateTriggers(spreadSheet);

  // Connect sheet to facebook
  showAuthenticationSidebar(spreadSheet);

}

function tearDownSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()) {
  /* Remove our sheets */
  // Uninstaill the triggers
  deactivateTrigger(spreadSheet);

  // Get app installed page_id's, remove them from database

  // Remove facebook authentication for user
  resetAuth();

  // Unsubscribe the page from facebook app
  // TODO Not sure if this is needed

  // Remove the pages from the script properties
  // Delete managed pages by page id
  // var sheet_id = spreadSheet.getId();
  
  /// deletePreference(sheet_id);

  // Check if there are already sheets with the names to be created if so, give an error notifcation that the sheet names already exist
  var sheetNames = spreadSheet.getSheets().map(sheet => sheet.getName());
  var neededSheetNames = ['Ad Likes', 'Page Messages'];
  var nameIntersection = sheetNames.filter(name => neededSheetNames.includes(name));
  
  // Delete the page messages, and ad likes sheet
  if (nameIntersection === undefined || nameIntersection.length > 0){
    nameIntersection.forEach(name => spreadSheet.deleteSheet(spreadSheet.getSheetByName(name)));
  }
}

function showSettings(){
  /* 
  have a section to calculate the page stats, member to non member interaction count, total interactions, 
  
  double check the code is clearing out the highlights out side of its bounds

  Settings needs to be able to:
  */
  var html = HtmlService.createTemplateFromFile('page_interaction/settings');
  html = html.evaluate()
    .setTitle('Program Settings')
    .setWidth(600)
    .setHeight(600);
  SpreadsheetApp.getUi()
    .showModalDialog(html, 'Program Settings');
}

function updateSheet(e=undefined, spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  // Update the sheet rules, formatting and, coloring
  // Called every time an edit happens
  // Return if no data
  var spreadSheet = e == undefined ? spreadSheet : e.source;
  var sheet = spreadSheet.getActiveSheet();
  if (sheet.getDataRange().getValues().length == 1) {return;}
  if (e != undefined) {updateExistingRows(e, spreadSheet)};
  mergeSheet(spreadSheet);
  sortSheet(spreadSheet);
  updateConditionalFormattingRules(spreadSheet);
  updateDataValidationRules(spreadSheet);
  highlightSheet(spreadSheet);
  hideRows(spreadSheet=spreadSheet, active=true);
}


function showAuthenticationSidebar() {
  if (mode == "TEST") {return;}
  var facebookService = getFacebookService();
  if (!facebookService.hasAccess()) {
    var authorizationUrl = facebookService.getAuthorizationUrl();
    var template = HtmlService.createTemplate(
      `<div class="auth-container-facebook"> 
        Click the button to connect pages from Facebook.
        <a target="_blank" id="facebook-auth-link" href="<?= authorizationUrl ?>">
          <img id="facebook-sign-in-button" style="padding:10px; width: 250px; display:block; margin:auto;" src="https://storage.googleapis.com/eighth-vehicle-287322.appspot.com/page_interaction_manager/continue-with-facebook.png"></img>
        </a>
      </div>
      <div class="auth-container-google">
      Click the button to authenticate with Google.
      <a target="_blank" id="facebook-auth-link" href="https://page-interaction-manager-auth-t7emter6aa-uc.a.run.app/authorize">
          <img id="google-sign-in-button" style="padding:10px; width: 250px; display:block; margin:auto;" src="https://storage.googleapis.com/eighth-vehicle-287322.appspot.com/page_interaction_manager/btn_google_signin_dark_normal_web.png"></img>
      </a>
      </div>
      <div><p>Please close this panel and go to addon settings to pick a page to sync to this sheet when Facebook and Google have been authenticated successfully.</p></div>`);
    template.authorizationUrl = authorizationUrl;
    var page = template.evaluate().setTitle("Authentication");
    SpreadsheetApp.getUi().showSidebar(page);
  } else {
  // ... What to do if they are authenticated
  var template = HtmlService.createTemplate('You are authorized, go to Page Interaction Manager settings to pick a page for the sheet.\n');

  var page = template.evaluate().setTitle("Authentication");
  SpreadsheetApp.getUi().showSidebar(page);
  }
}

function doPost(request){
  // Load the stored data for the page

  try {
    var event = mode == "TEST" ? test_data.sample_page_notifications_accept.shift() : JSON.parse(request.postData.getDataAsString());
    if (event.entry[0].messaging) {var event_type = 'message'} else if (event.entry[0].changes[0].value.item) {var event_type = 'reaction'}
    var event_type = mode == "TEST" ? "reaction" : event_type;
    var eventNameMap = {'reaction': 'Ad Likes', 'message': 'Page Messages'};
    var reactionsMap = {"LIKE": '👍', "LOVE": '❤️', "CARE": '❤️', "HAHA": '😆', "WOW": '😮', "SAD": '😥', "ANGRY": '😡'};
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
      if (results.getResponseCode() !== 200){throw {name : "TokenError", message : `Tried to update access token but failed for ${page_details}`}};
    }

    return ContentService.createTextOutput(JSON.stringify({"status": "Processed"}));
  } catch (error) {
      Logger.log('error in doPost');
      Logger.log(JSON.stringify(error.message))
      return ContentService.createTextOutput(JSON.stringify({"status": "Error"}));
  }
}

// calculate the page data
function analyzeSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  // Get initial data
  var sheet = spreadSheet.getActiveSheet();
  var sheetName = sheet.getName();
  var spreadSheetID = spreadSheet.getId();
  var values = sheet.getDataRange().getValues();
  tableHeader = new TableHeader(spreadSheet);
  values.shift()
  const PSID = tableHeader.getColumnIndex('PSID');
  const count = tableHeader.getColumnIndex('Counter');
  const status = tableHeader.getColumnIndex('Status');
  const source = tableHeader.getColumnIndex('Source');

  var results = {
    "statuses": {},
    "PSID": [],
    "uniquePeople": 0,
    "members": 0,
    "nonMembers": 0,
    "posts": {},
    "sortedPosts": []
  };

  // Clean data
  // Get the most recent and unique rows by PSID
  var set = new Set();
  var cleanedData = values.filter(row => {
      if (set.has(row[PSID])){ return false; } 
      else { set.add(row[PSID]); return true; }
  });
  results.PSID = Array.from(set);
  
  results.uniquePeople = set.size   // Count the number of unique people
  // Count the number of members and non members
  // Figure out the best non member and member post
  cleanedData.forEach(row => {
    results.statuses[row[status]] = results.statuses[row[status]] == null ? 0 : results.statuses[row[status]];
    results.statuses[row[status]] += 1;
  })

  values.forEach(row => {
    results.posts[row[source]] = results.posts[row[source]] == null ? {} : results.posts[row[source]]
    results.posts[row[source]][row[status]] = results.posts[row[source]][row[status]] == null ? 0 : results.posts[row[source]][row[status]];
    results.posts[row[source]][row[status]] += 1

  });
  // Sort the bests posts
  // Create items array
  function sortByValue(dict){
    var items = Object.keys(dict).map(function(key) {
      var sum = Object.values(dict[key]).reduce((a, b) => a + b, 0)
      return [key, sum];
    });
    // Sort the array based on the second element
    items.sort(function(first, second) {
      return second[1] - first[1];
    });
    return items;
  }
  
  results.sortedPosts = sortByValue(results.posts).map(function(row){
    var obj = {};
    obj[row[0]] = results.posts[row[0]];
    return obj;
  });
  return results
}

function showAnalytics(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()) {
  if (mode == "TEST") {return;}
  var template = HtmlService.createTemplateFromFile('page_interaction/analytics');
  var page = template.evaluate().setTitle("Analytics");
  SpreadsheetApp.getUi().showSidebar(page);
}

function getScraperInput(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  // Creat a dict of posts and the names of the missing links
  var sheet = spreadSheet.getActiveSheet();
  var values = sheet.getDataRange().getValues();
  tableHeader = new TableHeader(spreadSheet);
  var header = values.shift();
  const profileLink = tableHeader.getColumnIndex('Profile Link');
  const name = tableHeader.getColumnIndex('Name');
  const source = tableHeader.getColumnIndex('Source');

  var programInput = {};
  values.forEach(function(row){
    if (row[profileLink] == ""){
      programInput[row[source]] = programInput[row[source]] == null ? [] : programInput[row[source]];
      programInput[row[source]].push(row[name]);
    }
  })
  return programInput;
}

function updateProfiles(profileList, spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  var sheet = spreadSheet.getActiveSheet();
  var values = sheet.getDataRange().getValues();
  tableHeader = new TableHeader(spreadSheet);
  var header = values.shift();
  const profileLink = tableHeader.getColumnIndex('Profile Link');
  const name = tableHeader.getColumnIndex('Name');

  values.forEach(function(row){
    if (row[profileLink] == ""){
      row[profileLink] = profileList[row[name]];
    }
  })

  values.unshift(header);
  sheet.getDataRange().setValues(values);

}

function mergeSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  var spreadSheetID = spreadSheet.getId();
  var sheet = spreadSheet.getActiveSheet();
  var sheetName = sheet.getName();
  var doMerge = programSettings(spreadSheetID)['sheetSettings'][sheetName].mergingEnabled;
  if (doMerge == true ){ 
    var range = sheet.getDataRange().offset(programSettings(spreadSheetID).headerRowNumber, 0, sheet.getLastRow() - programSettings(spreadSheetID).headerRowNumber);
    var values = range.getValues();
    values = mergeData(values, spreadSheet);
    range.setValues(values);
  }
}

function mergeData(values, spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
   /**
    * Ensures all rows are unique, will lost past history
    * return the values in 2d array form
    */
  var initialLength = values.length;
  var tableHeader = new TableHeader(spreadSheet);
  const PSID = tableHeader.getColumnIndex('PSID');
  const count = tableHeader.getColumnIndex('Counter');
  const status = tableHeader.getColumnIndex('Status');
  var results = {};
  var unMerged = [];
  var spreadSheetID = spreadSheet.getId();
  const statusToMerge = programSettings(spreadSheetID)['statusToMerge'];
  const rowLength = values.first().length;

  values.forEach(row => {
    if (!statusToMerge.includes(row[status])) {unMerged.push(row);return}
    if (results[row[PSID]] == null){
      results[row[PSID]] = {};
      results[row[PSID]].data = row;
    } else {
      results[row[PSID]].data[count] = results[row[PSID]].data[count] == "" ? 1 : results[row[PSID]].data[count];
      results[row[PSID]].data[count] = parseInt(results[row[PSID]].data[count]) + parseInt(row[count]);
    }
  });
  values = Object.values(results).map(key => key.data).concat(unMerged);
  var finalLength = values.length;
  var difference = Math.abs(finalLength - initialLength);
  var blankArray = [...Array(difference)].map(x=>Array(rowLength));
  values.push(...blankArray);
  return values;
}

function sortSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  var sheet = spreadSheet.getActiveSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();
  var header = values.shift();
  values = sortData(values, spreadSheet);
  values.unshift(header);
  range.setValues(values);
}

 function sortData(values, spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /**
   * Sort and group the data
   */
  // Group data status
  var tableHeader = new TableHeader(spreadSheet);
  var assignment = tableHeader.getColumnIndex('Assignment');
  var status = tableHeader.getColumnIndex('Status');
  var PSID = tableHeader.getColumnIndex('PSID');
  var date = tableHeader.getColumnIndex('Date');
  var memberStatuses = internalVariables.memberStatusList;
  const _ = LodashGS.load();
  var hidden = _.filter(values, function(row){return _.includes(memberStatuses, row[status])});
  var values = _.filter(values, function(row){return !_.includes(memberStatuses, row[status])});
  var groups = _.groupBy(values, assignment);
  var results = [];
  _.forEach(groups, function(value, key1) {
    groups[key1] = _.groupBy(groups[key1], status);
    _.forEach(groups[key1], function(value, key2){
      groups[key1][key2] = _.groupBy(groups[key1][key2], PSID);
      _.forEach(groups[key1][key2], function(value, key3){
        groups[key1][key2][key3] = _.sortBy(groups[key1][key2][key3], date);
        results = _.concat(results, groups[key1][key2][key3]);
      })
    })
  });
  results = _.concat(results, hidden)
  return results
}

// TODO Use the time that facebook gives for the event occurence

function refreshAccessToken(clientId, clientSecret, refreshToken){
  var url = "https://accounts.google.com/o/oauth2/token";
  var data = {
    'grant_type':    'refresh_token',
    'client_id':     clientId,
    'client_secret': clientSecret,
    'refresh_token': refreshToken
  }
  var options = {
    'method' : 'post',
    'payload' : data
  };
  var accessToken = JSON.parse(UrlFetchApp.fetch(url, options).getContentText())['access_token'];
  return accessToken;
}

function getEffectiveUserId(){
  var idToken = ScriptApp.getIdentityToken();
  var body = idToken.split('.')[1];
  var decoded = Utilities.newBlob(Utilities.base64Decode(body)).getDataAsString();
  var payload = JSON.parse(decoded);
  var profileId = payload.sub;
  return profileId;
}

Object.defineProperty(Array.prototype, 'first', {
  value() {
    return this.find(e => true);
  }
});

function healSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  // Make sure the triggers are installed
  deactivateTrigger(spreadSheet);
  activateTriggers(spreadSheet);
  
  // Make sure the collumns are the right length
  var sheet = spreadSheet.getActiveSheet();
  var spreadSheetID = spreadSheet.getId();
  var tableHeader = new TableHeader(spreadSheet);
  var headerLength = tableHeader.headerData.length;
  var deleteColumns = sheet.getMaxColumns() - headerLength;
  if (deleteColumns != 0){sheet.deleteColumns((headerLength +1), deleteColumns)}

  // Fill in null or blank  vallues with defaults
  var range = sheet.getDataRange();
  var values = range.getValues();
  values.forEach(row => {
    row[0] = row[0] == "" ? "" : row[0]; // Date
    row[1] = row[1] == "" ? "" : row[1]; // Name
    row[2] = row[2] == "" ? "" : row[2]; // Gender
    row[3] = row[3] == "" ? "" : row[3]; // Profile Link
    row[4] = row[4] == "" ? "" : row[4]; // PSID
    row[5] = row[5] == "" ? "" : row[5]; // Source
    row[6] = row[6] == "" ? programSettings(spreadSheetID).assignmentMap.shift().shift() : row[6]; // Assignment
    row[7] = row[7] == "" ? programSettings(spreadSheetID).statusList.shift() : row[7]; // Status
    row[8] = row[8] == "" ? "FALSE" : row[8]; // Sac
    row[9] = row[9] == "" ? "FALSE" : row[9]; // Date
    row[10] = row[10] == "" ? "" : row[10]; // Reaction
    row[11] = row[11] == "" ? "" : row[11]; // Notes
    row[12] = row[12] == "" ? 1 : row[12]; // Counter
  })

  // Keep all the data
  range.setValues(values);
}

// Figure out why the dates are wierd. ensure consistent sorting for the groups