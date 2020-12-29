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
  triggerNames : ['doLogicPageMessages', 'updateSheet'],

  // Sheet Settings
  sheetSettings: {
      "Ad Likes": { "highlightEnabled": true, "sortingEnabled": true, "setMerging": false },
      "Page Messages": { "highlightEnabled": false, "sortingEnabled": true, "setMerging": true }
    }
};

var programSettings = function(sheet_id){
  var cache = CacheService.getScriptCache();
  var cached = cache.get(`programSettings:${sheet_id}`);
  if (cached !== null) {
    return JSON.parse(cached);
  }
  var settings = getPreference(sheet_id);
  cache.put(`programSettings:${sheet_id}`, JSON.stringify(settings), 60);
  return settings;
};

function saveSettings(spreadSheet=SpreadsheetApp.getActiveSpreadsheet(), settings){
  /* Write the settings to the database */
  var sheet_id = spreadSheet.getId();
  setPreference(sheet_id, settings);
  var cache = CacheService.getScriptCache();
  cache.put(`programSettings:${sheet_id}`, JSON.stringify(settings), 60);
  //updateSheet();
}

/*
  Intakes a spreadsheet
*/
var TableHeader = function(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()()){
  /* Translate page header */
  var spreadSheetID = spreadSheet.getId();
  var sheet = spreadSheet.getActiveSheet();
  var header = {
    headerData: sheet.getRange(programSettings(spreadSheetID).headerRowNumber, 1, 1, sheet.getLastColumn()).getValues()[0],
    getColumnIndex(columnName) {return this.headerData.indexOf(columnName);}
  };
  return header;
};

var Rule = function(){
    return {'create': undefined};
};

function doLogicPageMessages(e, spreadSheet=SpreadsheetApp.getActiveSpreadsheet()()) {
  /*
  // Main function for the program
  Runs from the onChange trigger
  */

  // Determine what type of onChange event it is
  switch (e.changeType){
    case "INSERT_ROW":
      // Run logic to move row to top
      updateNewRow(spreadSheet);
      
      // Update the rules
      updateSheet(spreadSheet);
      
      // End
      break;    
    default:
  }
}

function updateNewRow(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()()) {
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
    newRow[tableHeader.getColumnIndex('Assignment')] = Object.keys(programSettings(spreadSheetID).assignmentMap)[0];
    
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

function updateConditionalFormattingRules(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()()){
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
  
  // Hide gender, PSID. source
  sheet.hideColumns(tableHeader.getColumnIndex('Gender')+1);
  sheet.hideColumns(tableHeader.getColumnIndex('PSID')+1);
  
  // Make conditional formatting rule to give the Assignments different colors
  Object.keys(programSettings(spreadSheetID).assignmentMap).forEach(function(key){
    var assignmentConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(key)
    .setBackground(programSettings(spreadSheetID).assignmentMap[key])
    .setRanges([assignment])
    .build();
    sheetConditionalFormatRules.push(assignmentConditionalFormatRule);
  });
  
  // Apply conditional formatting rule to sheet
  sheet.setConditionalFormatRules(sheetConditionalFormatRules);
}

function updateDataValidationRules(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()()){
  /*
  Function is reponsible for apply page wide data validation rules
  */ 
  // Get the current active sheet
  var spreadSheetID = spreadSheet.getId();
  var sheet = spreadSheet.getActiveSheet();

  // Read in the table header translate to in
  tableHeader = new TableHeader(spreadSheet);
  
  // Clear previous rules
  var range = sheet.getDataRange().offset(sheet.getLastRow(), 0, sheet.getMaxRows() - sheet.getLastRow()).setDataValidation(null);
  
  // Dictionary to hold all of our rules
  var rules = {};
  
  // Make 'Assignment' rule
  var assignment = new Rule();
  assignment.create = function(){
    
    // Make data validation rule for Assignment
    var enforceAssignment = SpreadsheetApp.newDataValidation();
    enforceAssignment.requireValueInList(Object.keys(programSettings(spreadSheetID).assignmentMap), true);
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
    
    enforceStatus.requireValueInList(programSettings(spreadSheetID).messagesStatus, true);

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

function highlightSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()()){
  /*
  Ensure acurate highlighting on the sheet
  */
  var spreadSheetID = spreadSheet.getId();
  var sheet = spreadSheet.getActiveSheet();

  // Load initial data
  var sheetName = sheet.getName();

  // Check if highlighting is enabled
  if (!programSettings(spreadSheetID)['sheetSettings'][sheetName].highlightEnabled){ return; }
  
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

function hideRows(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()()){
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

function activateTriggers(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()()){
  /* Create the project triggers */ 
  var spreadSheetID = spreadSheet.getId();
  var spreadSheet = spreadSheet.getActiveSheet();

  // Enable a trigger to run the page logic
  ScriptApp.newTrigger(programSettings(spreadSheet)['triggerNames'][0])
   .forSpreadsheet(spreadSheet)
   .onChange()
   .create();
    
  // Enable a triger to run on edit to do the highlights
  ScriptApp.newTrigger(programSettings(spreadSheet)['triggerNames'][1])
    .forSpreadsheet(spreadSheet)
    .onEdit()
    .create();
}


function deactivateTrigger(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  /* Remove our project triggers */
  var triggers = ScriptApp.getProjectTriggers();
   var removeOurTriggers = function(trigger) {
     if (programSettings(spreadSheet).triggerNames.includes(trigger.getHandlerFunction())) {
       ScriptApp.deleteTrigger(trigger);
     }
   };
  triggers.forEach(removeOurTriggers);
}

function setUpSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()) {
  /*
  */
  // Save default settings to sheet
  saveSettings(spreadSheet.getId(), defaultSettings);

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

  // Initialize with blank data
  newSheet.appendRow(new Array(adLikesHeaders.length).fill(" "));
  
  // Create 'Page Messages' sheet
  var pageMessagHeaders = ['Date', 'Name', 'Gender', 'Profile Link', 'PSID', 'Source', 'Assignment', 'Status', '@Sac', 'On Date', 'Message', 'Notes', 'Counter'];
  var sheetName = "Page Messages";
  
  // Insert sheet
  var newSheet = spreadSheet.insertSheet(sheetName);

  // Write headers
  newSheet.getRange(1,1,1, pageMessagHeaders.length).setValues([pageMessagHeaders]);

  // Initialize with blank data
  newSheet.appendRow(new Array(pageMessagHeaders.length).fill(" "));

  // Trim columns
  var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn();
  newSheet.deleteColumns((newSheet.getLastColumn() +1), deleteColumns);

  // Activate triggers
  activateTriggers(spreadSheet);

  // Connect sheet to facebook
  showFacebookSidebar(spreadSheet);

}

function tearDownSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()) {
  /* Remove our sheets */
  // Uninstaill the triggers
  deactivateTrigger(spreadSheet);

  // Remove facebook authentication
  resetAuth();

  // Remove the pages from the script properties
  // Delete managed pages by page id
  var sheet_id = spreadSheet.getId()
  deletePageDetails(sheet_id);
  deletePreference(sheet_id);

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
 var html = HtmlService.createTemplateFromFile('page_interaction/settings').evaluate()
 .setTitle('Program Settings')
 .setWidth(600)
 .setHeight(600);
SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
 .showModalDialog(html, 'Program Settings');

}

function updateSheet(spreadSheet=SpreadsheetApp.getActiveSpreadsheet()){
  // Update the sheet rules, formatting and, coloring
  // Called every time an edit happens
  // Return if no data
  var sheet = spreadSheet.getActiveSheet()
  if (sheet.getDataRange().getValues().length == 1) {return;}
  updateConditionalFormattingRules(spreadSheet);
  updateDataValidationRules(spreadSheet);
  highlightSheet(spreadSheet);
  hideRows(spreadSheet);
}


function showFacebookSidebar() {
  if (mode == "TEST") {return;}
  var facebookService = getFacebookService();
  if (!facebookService.hasAccess()) {
    var authorizationUrl = facebookService.getAuthorizationUrl();
    var template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'Click the link to connect pages from facebook.');
    template.authorizationUrl = authorizationUrl;
    var page = template.evaluate();
    SpreadsheetApp.getUi().showSidebar(page);
  } else {
  // ... What to do if they are authenticated
  var template = HtmlService.createTemplate('You are authorized\n');
  var page = template.evaluate();
  SpreadsheetApp.getUi().showSidebar(page);
  }
}

function showDebugPannel(){
  var data = getAllPageDetails();
  var foo = ""
  for (var key in data) {
    foo = foo + `Key: ${key}, Value: ${data[key]}` + '\n';
  }
  var template = HtmlService.createTemplate(
    'You are authorized\n'
    + foo
  );
  var page = template.evaluate();
  SpreadsheetApp.getUi().showSidebar(page);
}

/**
 * Webhook that can handle the event from Facebook
 */
function doPost(request){
  // Load the stored data for the page
  try {
    var event = JSON.parse(request.postData.getDataAsString());
    var event_type = undefined;
    var eventNameMap = {'reaction': 'Ad Likes', 'message': 'Page Messages'};
    var reactionsMap = {"LIKE": '👍', "LOVE": '❤️', "CARE": '❤️', "HAHA": '😆', "WOW": '😮', "SAD": '😥', "ANGRY": '😡'};
    var page_id = undefined;
    var page_details = undefined;
    var active_sheet = undefined;

    // Classify the incoming event
    // Reject stuff we aren't interested in
    if (event.entry[0].changes[0].value.item == 'video' 
    ||  event.entry[0].changes[0].value.item == 'comment'
    ||  event.entry[0].changes[0].value.verb != 'add') {
      return ContentService.createTextOutput(JSON.stringify({"status": "Unprocessed"}));
    }

    // Classify event 
    else if(event.entry[0].changes[0].value.item) {
      event_type = event.entry[0].changes[0].value.item;
      page_id = event.entry[0].id;
    } else if (event.entry[0].messaging) {
      event_type = event.entry[0].messaging;
      page_id = event.entry[0].messaging[0].recipient.id
    }

    var page_details = getPageDetails(page_id);
    if (!page_details) {throw {name : "ValueError", message : `Searched for ${page_id} but no result was found`}}
    var spreadsheet = SpreadsheetApp.openById(page_details.google_sheets.id);
    active_sheet = spreadsheet.getSheetByName(eventNameMap[event_type]);

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
      var url = `https://graph.facebook.com/${event.entry[0].messaging[0].sender.id}?fields=first_name,last_name&access_token=${accessTokenMap[pageID]}`
      JSON.parse(UrlFetchApp.fetch(url));
      var name = getReqRes['first_name'] + " " + getReqRes['last_name'];
      var psid = event.entry[0].messaging[0].sender.id;
      var facebookClue = `https://www.facebook.com/search/people?q=${encodeURIComponent(name)}`
    }

    // Process current time
    var today  = new Date();
    today = today.toLocaleDateString("en-US")

    // Send the results to the sheet
    var row = [today, name, "", "", psid, facebookClue, "", "", "", "", messageOrReaction, "", ""];
    active_sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({"status": "Processed"}));
  } catch (error) {
      Logger.log(error)
      return ContentService.createTextOutput(JSON.stringify({"status": "Error"}));
  }
}
/*
function doGet(request)
{
  Logger.log(request);
  if (request.parameter['hub.verify_token'] == 'hambone') {
    return ContentService.createTextOutput(request.parameter['hub.challenge']);
  }
}
*/
// Finish testing the new database preferences and page_details
// TODO addin code to remove the preferences and page data on delete
// TODO Fix the delete method to check if it is actually removing the key