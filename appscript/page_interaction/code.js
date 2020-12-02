/*jshint esversion: 6 */
// Dictionary of program settings
var defaultSettings = {
  // Program variables
  headerRowNumber: 1,
  
  // List of ad likes status
  adLikesStatus : ["Select", "Pending", "Not Reached", "Left on Read", "Rejected", "Do Not Contact", "Member", "Currently Messaging", "Teaching", "Baptized", "Stopped Teaching", "Previously Contacted"],
  
  // List of messages status
  messagesStatus : ["Select", "Left on Read", "Rejected", "Do Not Contact", "Member", "Currently Messaging", "Teaching", "Baptized", "Stopped Teaching"],
  
  // Statuses to hide
  hiddenStatuses : ["Member", "Do Not Contact", "Rejected"],

  // Dictionary to map reactions
  reactionsMap : {"LIKE": '👍', "LOVE": '❤️', "CARE": '❤️', "HAHA": '😆', "WOW": '😮', "SAD": '😥', "ANGRY": '😡'},
  
  // Dictionary to map wards to colors
  assignmentMap : {'Ward 1': '#82C1EC', 'Ward 2': '#F28530', 'Ward 3': '#FCFBC2', 'Ward 4': '#ECE3D4', 'Ward 5': '#F9F85F'},
  
  // Dictionary to map gender to colors
  genderMap : {'male': '#6ca0dc', 'female': '#f8b9d4'},
  
  // Dictionary to map the ads ids to names
  adIDMap : {"1234567890": "Ad Name here"},
  // Read the IDs set by the user some how
  
  // Dictionary to map the area ids to area names
  areaIDs : {'123456789': 'Area Name Here'},
  
  // Initial row length
  initialRowLength : 1000,
  
  // Name of trigger functions
  triggerNames : ['doLogicPageMessages', 'computeTheStuff'],

  // Sheet Settings
  sheetSettings: {
      "Ad Likes": { "highlightEnabled": true, "sortingEnabled": true, "setMerging": false },
      "Page Messages": { "highlightEnabled": false, "sortingEnabled": true, "setMerging": true }
    }
};

var programSettings = function(){
  var cache = CacheService.getScriptCache();
  var cached = cache.get("programSettings");
  if (cached !== null) {
    return JSON.parse(cached);
  }
  var documentProperties = PropertiesService.getDocumentProperties();
  var settings = documentProperties.getProperty('programSettings') ? JSON.parse(documentProperties.getProperty('programSettings')) : defaultSettings;
  cache.put("programSettings", JSON.stringify(settings), 60);
  return settings;
};

function saveSettings(settings){
  /* Write the settings to the sheet */
  var documentProperties = PropertiesService.getDocumentProperties();
  documentProperties.setProperty('programSettings', JSON.stringify(settings));
  var cache = CacheService.getScriptCache();
  cache.put("programSettings", JSON.stringify(settings), 60);
  updateSheet();
}

var TableHeader = function(){
  /* Translate page header */
  var sheet = SpreadsheetApp.getActiveSheet();
  var header = {
    headerData: sheet.getRange(programSettings().headerRowNumber, 1, 1, sheet.getLastColumn()).getValues()[0],
    getColumnIndex(columnName) {return this.headerData.indexOf(columnName);}
  };
  return header;
};

var Rule = function(){
    return {'create': undefined};
};

function computeTheStuff() {
  Logger.log("computeTheStuff was found");
  Logger.log(this)
  var stuff = this
  SpreadsheetApp.getActiveSheet().appendRow([JSON.stringify(stuff)])
  // Logger.log(`${JSON.stringify(e)}`);
  // Logger.log(e);
  // updateAndMerge(e);
  // updateSheet();
  return;
}

function doLogicPageMessages(e) {
  /*
  // Main function for the program
  Runs from the onChange trigger
  */

  // Determine what type of onChange event it is
  switch (e.changeType){
    case "INSERT_ROW":
      // Run logic to move row to top
      updateNewRow();
      
      // Update the rules
      updateSheet();
      
      // End
      break;    
    default:
  }
}

function updateNewRow() {
/*
  Run the sort logic when a new row is added
*/
  // Get the current active sheet
  var sheet = SpreadsheetApp.getActiveSheet();
  var sheetName = sheet.getName();

  // Check if sortingEnabled is true for this sheet
  if (!programSettings()['sheetSettings'][sheetName].sortingEnabled){return;}
  
  // Check if allowed to merge rows
  var doMerge = programSettings()['sheetSettings'][sheetName].mergingEnabled;

  // Get range of all data
  var range = sheet.getDataRange().offset(programSettings().headerRowNumber, 0, sheet.getLastRow() - programSettings().headerRowNumber);
  var values = range.getValues();
  
  // Read in the table header translate to in
  tableHeader = new TableHeader();
  
  // Get the new entry row
  var newRow = values.pop();
  
  // Get the new entry PSID
  var newPSID = newRow[tableHeader.getColumnIndex('PSID')];
  
  // List of PSID of members
  // Get rows where Member is true
  var memberPSIDList = values.filter(row => row[tableHeader.getColumnIndex('Status')] == 'Member')
  .map(row => row[tableHeader.getColumnIndex('PSID')]);
  
  // List of PSID of non members who have messaged the page
  // Get rows where Member is false
  var nonMemberPSIDList = values.filter(row => row[tableHeader.getColumnIndex('Status')] != 'Member')
  .map(row => row[tableHeader.getColumnIndex('PSID')]);
  
  
  // Case 1 member messaging the page for multiple times
  // PSID is in list of member PSIDs
  if (memberPSIDList.includes(newPSID)) {
    // Need to measure the length of array so we know how many blank rows to put back in
    var initialLength = values.length;
    
    // Remove all matching rows from sheet except the checked one
    values = values.filter(row => row[tableHeader.getColumnIndex('PSID')] != newPSID || (row[tableHeader.getColumnIndex('PSID')] == newPSID && row[tableHeader.getColumnIndex('Status')] == 'Member'));
    
    // Measure difference and add the blanks in
    var finalLength = values.length;
    var difference = (finalLength - initialLength) * -1;
    var blankArray = [...Array(difference + 1)].map(x=>Array(newRow.length));
    values.push(...blankArray);
    
    // Find the old entry and increment the counter
    objIndex = values.findIndex(obj => obj[tableHeader.getColumnIndex('PSID')] == newPSID);
    values[objIndex][tableHeader.getColumnIndex('Counter')] += 1 + difference;
    
    // Update the message for kicks
    values[objIndex][tableHeader.getColumnIndex('Message')] = newRow[tableHeader.getColumnIndex('Message')];
  }
  
  // Case 2 non member messaging page for the multiple times
  // PSID is in the non member list
  else if (nonMemberPSIDList.includes(newPSID) && doMerge === true){
    // Bump the old row to the top
    // Get the old row
    objIndex = values.findIndex(obj => obj[tableHeader.getColumnIndex('PSID')] == newPSID);
    var oldRow = values.splice(objIndex, 1)[0];
    
    // Update the old row with the new row's time stamp and message and increment the counter
    oldRow[tableHeader.getColumnIndex('Date')] = newRow[tableHeader.getColumnIndex('Date')];
    oldRow[tableHeader.getColumnIndex('Message')] = newRow[tableHeader.getColumnIndex('Message')];
    oldRow[tableHeader.getColumnIndex('Counter')] += 1;
    
    // Move the old row to the top
    values.unshift(oldRow);
    
    // Add a blank row to keep the length the same
    var blankArray = new Array(oldRow.length);
    values.push(blankArray);
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
    newRow[tableHeader.getColumnIndex('Assignment')] = Object.keys(programSettings().assignmentMap)[0];
    
    // Status -> Select
    newRow[tableHeader.getColumnIndex('Status')] = 'Select';
    
    // @Sac -> FALSE
    newRow[tableHeader.getColumnIndex('@Sac')] = 'FALSE';
    
    // On Date -> FALSE
    newRow[tableHeader.getColumnIndex('On Date')] = 'FALSE';
    
    // Spot for Notes
    newRow[tableHeader.getColumnIndex('Notes')] = "";
    
    // Counter -> 1
    newRow[tableHeader.getColumnIndex('Counter')] = 1;
    
    // Predict if name is male or female
    var name = newRow[tableHeader.getColumnIndex('Name')];
    if (name) {
      name = name.split(" ")[0];
      var url = 'https://api.genderize.io' + '?name=' + encodeURIComponent(name);
      var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
      var json = response.getContentText();
      var data = JSON.parse(json);
      var gender = data['gender'];
    
      // Guese gender
      newRow[tableHeader.getColumnIndex('Gender')] = gender;
    }
    
    // Move the old row to the top
    values.unshift(newRow);
  }
  
  //Write the values back to the sheet
  range.setValues(values);
  
  // End
  return;
}

function updateConditionalFormattingRules(sheet=SpreadsheetApp.getActiveSheet()){
  /*
  Adjust the conditional formating rules to cover the sheet data
  */

  // Read in the table header translate to in
  tableHeader = new TableHeader();
  
  // Track the conditional formatting
  var sheetConditionalFormatRules = [];

  // Get 'Name' column
  var name = sheet.getRange(2, tableHeader.getColumnIndex('Name')+1, sheet.getLastRow() - 1);
  
  // Get 'Assignment' column
  var assignment = sheet.getRange(2, tableHeader.getColumnIndex('Assignment')+1, sheet.getLastRow() - 1);
  
  // Make conditional formatting rule to give the different genders
  Object.keys(programSettings().genderMap).forEach(function(key){
    var genderConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=C2="${key}"`)
    .setBackground(programSettings().genderMap[key])
    .setRanges([name])
    .build();
    sheetConditionalFormatRules.push(genderConditionalFormatRule);
  });
  
  // Hide gender, PSID. source
  sheet.hideColumns(tableHeader.getColumnIndex('Gender')+1);
  sheet.hideColumns(tableHeader.getColumnIndex('PSID')+1);
  
  // Make conditional formatting rule to give the Assignments different colors
  Object.keys(programSettings().assignmentMap).forEach(function(key){
    var assignmentConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(key)
    .setBackground(programSettings().assignmentMap[key])
    .setRanges([assignment])
    .build();
    sheetConditionalFormatRules.push(assignmentConditionalFormatRule);
  });
  
  // Apply conditional formatting rule to sheet
  sheet.setConditionalFormatRules(sheetConditionalFormatRules);
}

function updateDataValidationRules(sheet=SpreadsheetApp.getActiveSheet()){
  /*
  Function is reponsible for apply page wide data validation rules
  */ 
  // Get the current active sheet
  
  // Read in the table header translate to in
  tableHeader = new TableHeader();
  
  // Clear previous rules
  var range = sheet.getDataRange().offset(sheet.getLastRow(), 0, sheet.getMaxRows() - sheet.getLastRow()).setDataValidation(null);
  
  // Dictionary to hold all of our rules
  var rules = {};
  
  // Make 'Assignment' rule
  var assignment = new Rule();
  assignment.create = function(){
    
    // Make data validation rule for Assignment
    var enforceAssignment = SpreadsheetApp.newDataValidation();
    enforceAssignment.requireValueInList(Object.keys(programSettings().assignmentMap), true);
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
    
    enforceStatus.requireValueInList(programSettings().messagesStatus, true);

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
    enforceReaction.requireValueInList(Object.values(programSettings().reactionsMap), true);
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

function highlightSheet(sheet=SpreadsheetApp.getActiveSheet()){
  /*
  Ensure acurate highlighting on the sheet
  */

  // Load initial data
  var sheetName = sheet.getName();

  // Check if highlighting is enabled
  if (!programSettings()['sheetSettings'][sheetName].highlightEnabled){ return; }
  
  // Highlight the rows in red that contain a matching PSID and have a default status
  // Get the values from the sheet
  var range = sheet.getDataRange().offset(programSettings().headerRowNumber, 0, sheet.getLastRow());
  var values = range.getValues();
  
  // Read in the table header translate to in
  var tableHeader = new TableHeader();
  
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

function hideRows(sheet=SpreadsheetApp.getActiveSheet()){
  /* Hide rows with specific statuses */

  // Get inital data
  var range = sheet.getDataRange();
  var values = range.getValues();
  var hiddenStatuses = programSettings().hiddenStatuses;
  var tableHeader = new TableHeader();

  // Unhide all the rows
  sheet.unhideRow(range);

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

function updateAndMerge(e){
  /* When one status is updated, update all the matching ones*/

  // 
  Logger.log(`I was edited ${e}`);
  // get the psid of what was changes
  // set all the other PSID to thoese values
  // merge all the values to the one that was clicked


}
function myFunction() {
  var message = 'The current time is ' + new Date().toString();
  var title = 'Welcome to Google Sheets';
  //var obj = JSON.stringify(e)
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title);
}

function activateTriggers(){
  /* Create the project triggers */ 
  // var ss = SpreadsheetApp.getActive();
  
  // Enable a triger to run on edit to do the highlights
  var sheet = SpreadsheetApp.getActive();
  ScriptApp.newTrigger("myFunction")
    .forSpreadsheet(sheet)
    .onEdit()
    .create();

  /*
  // Enable a trigger to run the page logic
  ScriptApp.newTrigger(programSettings()['triggerNames'][0])
   .forSpreadsheet(ss)
   .onChange()
   .create();
  */
}



function deactivateTrigger(){
  /* Remove our project triggers */
  var triggers = ScriptApp.getProjectTriggers();
   var removeOurTriggers = function(trigger) {
     if (programSettings().triggerNames.includes(trigger.getHandlerFunction())) {
       ScriptApp.deleteTrigger(trigger);
     }
   };
  triggers.forEach(removeOurTriggers);
}

function setUpSheet() {
  /*
  */
  // Begin Setting up the sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Check if there are already sheets with the names to be created if so, give an error notifcation that the sheet names already exist

  var sheetNames = sheet.getSheets().map(sheet => sheet.getName());
  var neededSheetNames = ['Ad Likes', 'Page Messages'];
  var nameIntersection = sheetNames.filter(name => neededSheetNames.includes(name));

  if (nameIntersection === undefined || nameIntersection.length > 0){
    nameIntersection.forEach(name => sheet.deleteSheet(sheet.getSheetByName(name)));
    deactivateTrigger();
  }
  
  // Create ad likes sheet
  var adLikesHeaders = ['Date', 'Name', 'Gender', 'Profile Link', 'PSID', 'Source', 'Assignment', 'Status', '@Sac', 'On Date', 'Reaction', 'Notes', 'Counter'];
  var sheetName = "Ad Likes";
  
  // Write headers
  var newSheet = sheet.insertSheet(sheetName);
  newSheet.getRange(1,1,1, adLikesHeaders.length).setValues([adLikesHeaders]);
  
  // Trim to length
  var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn();
  newSheet.deleteColumns((newSheet.getLastColumn() +1), deleteColumns); 
  
  // Create 'Page Messages' sheet
  var pageMessagHeaders = ['Date', 'Name', 'Gender', 'Profile Link', 'PSID', 'Source', 'Assignment', 'Status', '@Sac', 'On Date', 'Message', 'Notes', 'Counter'];
  var sheetName = "Page Messages";
  
  // Insert sheet
  var newSheet = sheet.insertSheet(sheetName);

  // Write headers
  newSheet.getRange(1,1,1, pageMessagHeaders.length).setValues([pageMessagHeaders]);

  // Trim columns
  var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn();
  newSheet.deleteColumns((newSheet.getLastColumn() +1), deleteColumns);

  // Save default settings to sheet
  saveSettings(defaultSettings);

  // Activate triggers
  activateTriggers();
  // popup, authenticate with facebook, give missionary tools facebook app permision to get page data
  // write plan on how to get facebook data and dump it to sheet

  // Restrict sorting on the actual function
}

function tearDownSheet() {
  /* Remove our sheets */
  // Uninstaill the triggers
  deactivateTrigger();
  // Get the current active sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Check if there are already sheets with the names to be created if so, give an error notifcation that the sheet names already exist
  var sheetNames = sheet.getSheets().map(sheet => sheet.getName());
  var neededSheetNames = ['Ad Likes', 'Page Messages'];
  var nameIntersection = sheetNames.filter(name => neededSheetNames.includes(name));
  
  // Delete the page messages, and ad likes sheet
  if (nameIntersection === undefined || nameIntersection.length > 0){
    nameIntersection.forEach(name => sheet.deleteSheet(sheet.getSheetByName(name)));
  }
}

function test_doLogicPageMessages(){
  /**/
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.appendRow(["1",	"a",	"m",	"a",	"2",	"a",	"Assignmenta3",	"a",	"a",	"3",	"3",	"3",	"3"]);
  var e = JSON.parse('{ "authMode": "FULL", "changeType": "INSERT_ROW", "source": {}, "triggerUid": "502test6549", "user": { "email": "test.test@test.org", "nickname": "test.test" }}');
  doLogicPageMessages(e);
}


function showSettings(){
  /* Updates to make
  When you click some one as a member, update the rest of their entries to be member as well, also collapse them into one row
  hide member rows
  Don't hide the source column
  have a section to calculate the page stats, member to non member interaction count, total interactions, 
  
  double check the code is clearing out the highlights out side of its bounds

  Settings needs to be able to:
  Adjust adLikesStatus, messagesStatus, reactionsMap, assignmentMap, genderMap, adIDMap

  */
 var html = HtmlService.createTemplateFromFile('page_interaction/settings').evaluate()
 .setTitle('Program Settings')
 .setWidth(600)
 .setHeight(600);
SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
 .showModalDialog(html, 'Program Settings');

}

function updateSheet(){
  // Update the sheet rules, formatting and, coloring
  // Return if no data
  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getDataRange().getValues().length == 1) {return;}
  updateConditionalFormattingRules(sheet);
  updateDataValidationRules(sheet);
  highlightSheet(sheet);
  hideRows(sheet);
}