// Program variables
var headerRowNumber = 1;

// List of ad likes status
var adLikesStatus = ["Select", "Pending", "Not Reached", "Left on Read", "Rejected", "Do Not Contact", "Member", "Currently Messaging", "Teaching", "Baptized", "Stopped Teaching", "Previously Contacted"];

// List of messages status
var messagesStatus = ["Select", "Left on Read", "Rejected", "Do Not Contact", "Member", "Currently Messaging", "Teaching", "Baptized", "Stopped Teaching"];

// Dictionary to map reactions
var reactionsMap = {"LIKE": '👍', "LOVE": '❤️', "CARE": '❤️', "HAHA": '😆', "WOW": '😮', "SAD": '😥', "ANGRY": '😡'};

// Dictionary to map wards to colors
var assignmentMap = {'Ward 1': '#82C1EC', 'Ward 2': '#F28530', 'Ward 3': '#FCFBC2', 'Ward 4': '#ECE3D4', 'Ward 5': '#F9F85F'};

// Dictionary to map gender to colors
var genderMap = {'male': '#6ca0dc', 'female': '#f8b9d4'};

// Dictionary to map the ads ids to names
var adIDMap = {};
// Read the IDs set by the user some how

// Dictionary to map the area ids to area names
var areaIDs = {'102302324777572': 'Grand Forks'};

// Initial row length
var initialRowLength = 1000;

// Name of current triggers
var triggerNames = ['doLogicPageMessages', 'highlightSheet'];

function doLogicPageMessages(e) {
  /*
  // Main function for the program
  Runs from the onChange trigger
  */
  Logger.log(JSON.stringify( e , null, 2 ));
  
  // Determine what type of onChange event it is
  switch (e.changeType){
    case "INSERT_ROW":
      // Run logic to move row to top
      updateNewRow();
      
      // Expand the rules
      updateConditionalFormattingRules();
      updateDataValidationRules();
      highlightSheet();
      
      // End
      break;    
    default:
  }
}

function updateNewRow() {
/*
  
*/
  // Get the current active sheet
  var sheet = SpreadsheetApp.getActiveSheet();
  
  // Check if allowed to sort this sheet
  var finder = sheet.createDeveloperMetadataFinder();
  var results = finder.withKey('sortingEnabled');
  var test = results.find()[0].getValue();
  if (test != "TRUE"){ return; }
  
  // Check if allowed to merge rows
  var finder = sheet.createDeveloperMetadataFinder();
  var results = finder.withKey('mergingEnabled');
  var test = results.find()[0].getValue();
  var doMerge = true;
  if (test != "TRUE"){ doMerge = false; }
  
  // Get range of all data
  var range = sheet.getDataRange().offset(headerRowNumber, 0, sheet.getLastRow() - headerRowNumber);
  var values = range.getValues();
  
  // Read in the table header translate to in
  tableHeader = new TableHeader;
  
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
    var blankArray = [...Array(difference + 1)].map(x=>Array(newRow.length))
    values.push(...blankArray);
    
    // Find the old entry and increment the counter
    objIndex = values.findIndex(obj => obj[tableHeader.getColumnIndex('PSID')] == newPSID);
    values[objIndex][tableHeader.getColumnIndex('Counter')] += 1 + difference;
    
    // Update the message for kicks
    values[objIndex][tableHeader.getColumnIndex('Message')] = newRow[tableHeader.getColumnIndex('Message')];
  }
  
  // Case 2 non member messaging page for the multiple times
  // PSID is in the non member list
  else if (nonMemberPSIDList.includes(newPSID) && doMerge == true){
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
    values.push(blankArray)
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
    
    // Assignment -> Default to first Ward
    newRow[tableHeader.getColumnIndex('Assignment')] = 'Ward 1';
    
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
    var name = newRow[tableHeader.getColumnIndex('Name')]
    if (name) {
      name = name.split(" ")[0];
      var url = 'https://api.genderize.io'
      + '?name=' + encodeURIComponent(name);
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

function updateConditionalFormattingRules(){
  /*
  Adjust the conditional formating rules to cover the sheet data
  */
  // Get the current active sheet
  var sheet = SpreadsheetApp.getActiveSheet();
  
  // Read in the table header translate to in
  tableHeader = new TableHeader;
  
  // Track the conditional formatting
  var sheetConditionalFormatRules = [];
  
  // Get 'Name' column
  var name = sheet.getRange(2, tableHeader.getColumnIndex('Name')+1, sheet.getLastRow() - 1);
  
  // Get 'Assignment' column
  var assignment = sheet.getRange(2, tableHeader.getColumnIndex('Assignment')+1, sheet.getLastRow() - 1);
  
  // Format name to respective colors
  var genderConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
  
  // Make conditional formatting rule to give the different genders
  Object.keys(genderMap).forEach(function(key){
    var genderConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=C2="${key}"`)
    .setBackground(genderMap[key])
    .setRanges([name])
    .build();
    sheetConditionalFormatRules.push(genderConditionalFormatRule);
  });
  
  // Hide gender, PSID. source
  sheet.hideColumns(tableHeader.getColumnIndex('Gender')+1);
  sheet.hideColumns(tableHeader.getColumnIndex('PSID')+1);
  // sheet.hideColumns(tableHeader.getColumnIndex('Source')+1);
  
  // Make conditional formatting rule to give the Assignments different colors
  Object.keys(assignmentMap).forEach(function(key){
    var assignmentConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(key)
    .setBackground(assignmentMap[key])
    .setRanges([assignment])
    .build();
    sheetConditionalFormatRules.push(assignmentConditionalFormatRule);
  });
  
  // Apply conditional formatting rule to sheet
  sheet.setConditionalFormatRules(sheetConditionalFormatRules);
}

function updateDataValidationRules(){
  /*
  Function is reponsible for apply page wide data validation rules
  */ 
  // Get the current active sheet
  var sheet = SpreadsheetApp.getActiveSheet();
  
  // Read in the table header translate to in
  tableHeader = new TableHeader;
  
  // Clear previous rules
  var range = sheet.getDataRange().offset(sheet.getLastRow(), 0, sheet.getMaxRows() - sheet.getLastRow()).setDataValidation(null);
  
  // Dictionary to hold all of our rules
  var rules = {};
  
  // Make 'Assignment' rule
  var assignment = new Rule;
  assignment.create = function(){
    
    // Make data validation rule for Assignment
    var enforceAssignment = SpreadsheetApp.newDataValidation();
    enforceAssignment.requireValueInList(Object.keys(assignmentMap), true);
    enforceAssignment.build();
    
    // Set the assignment range rule
    sheet.getRange(2, tableHeader.getColumnIndex('Assignment')+1, sheet.getLastRow() - 1).setDataValidation(enforceAssignment);
  };
  rules["Assignment"] = assignment;
  
  // Make a 'Status' rule
  var status = new Rule;
  status.create = function(){
    
    // Make data validation rule for Status
    var enforceStatus = SpreadsheetApp.newDataValidation();
    enforceStatus.requireValueInList(messagesStatus, true);
    
    // Set the status range rule andd apply the rule
    sheet.getRange(2, tableHeader.getColumnIndex('Status')+1, sheet.getLastRow() - 1).setDataValidation(enforceStatus);
  };
  rules["Status"] = status;
  
  // Make a '@Sac' rule
  var atSac = new Rule;
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
  var onDate = new Rule;
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
  var reaction = new Rule;
  reaction.create = function(){
    
    // Make data validation rule for Reaction
    var enforceReaction = SpreadsheetApp.newDataValidation();
    enforceReaction.requireValueInList(Object.values(reactionsMap), true);
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

function highlightSheet(){
  /*
  Ensure acurate highlighting on the sheet
  */
  var sheet = SpreadsheetApp.getActiveSheet();
  
  // Check if highlighting is enabled
  var finder = sheet.createDeveloperMetadataFinder();
  var results = finder.withKey('highlightEnabled');
  var test = results.find()[0].getValue();
  if (test != "TRUE"){ return; }
  
  // Highlight the rows in red that contain a matching PSID and have a default status
  // Get the values from the sheet
  var range = sheet.getDataRange().offset(headerRowNumber, 0, sheet.getLastRow());
  var values = range.getValues();
  
  // Read in the table header translate to in
  tableHeader = new TableHeader;
  
  // Filter the values and get all PSID where status == select
  var selectPSID = values.filter(row => row[tableHeader.getColumnIndex('Status')] == 'Select').map(row => row[tableHeader.getColumnIndex('PSID')]);
  
  // Map the values if PSID is in previous filter results then mark the line red
  var colorRow = function(row){
    /* Color a specific cell in a row */
    var test = row[tableHeader.getColumnIndex('PSID')];
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
  
  // lock font to arial
}

function setHighlighting(value){
  // TODO check if this is going on the individual sheet or the whole project
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.addDeveloperMetadata('highlightEnabled', value);
}

function setSorting(value){
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.addDeveloperMetadata('sortingEnabled', value);
}

function setMerging(value){
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.addDeveloperMetadata('mergingEnabled', value);
}

function activateTriggers(){
  /* Create the project triggers */ 
  
  // Enable a trigger to run the page logic
  var ss = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('doLogicPageMessages')
   .forSpreadsheet(ss)
   .onChange()
   .create();
  
  // Enable a triger to run on edit to do the highlights
  var highlightSheetID = ScriptApp.newTrigger('highlightSheet')
  .forSpreadsheet(ss)
  .onEdit()
  .create();
}

function deactivateTrigger(){
  /* Remove our project triggers */
  var triggers = ScriptApp.getProjectTriggers();
   var removeOurTriggers = function(trigger) {
     if (triggerNames.includes(trigger.getHandlerFunction())) {
       ScriptApp.deleteTrigger(trigger);
     }
   }
  triggers.forEach(removeOurTriggers);
}

function setUpSheet() {
  /*
  */
  // Begin Setting up the sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var spreadSheet = sheet.getActiveSheet();
  
  // Check if there are already sheets with the names to be created if so, give an error notifcation that the sheet names already exist

  var sheetNames = sheet.getSheets().map(sheet => sheet.getName());
  var neededSheetNames = ['Ad Likes', 'Page Messages', 'Data Storage'];
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
  var header = newSheet.getRange(1,1,1, adLikesHeaders.length).setValues([adLikesHeaders]);
  
  // Trim to length
  var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn();
  newSheet.deleteColumns((newSheet.getLastColumn() +1), deleteColumns); 
  
  // Enable highlighting on sheet ad likes sheet
  setHighlighting('TRUE');
  setSorting('TRUE');
  setMerging('FALSE');
  
  // Create 'Page Messages' sheet
  var pageMessagHeaders = ['Date', 'Name', 'Gender', 'Profile Link', 'PSID', 'Source', 'Assignment', 'Status', '@Sac', 'On Date', 'Message', 'Notes', 'Counter'];
  var sheetName = "Page Messages";
  
  // Insert sheet
  var newSheet = sheet.insertSheet(sheetName);
  // Wrtite headers
  var header = newSheet.getRange(1,1,1, pageMessagHeaders.length).setValues([pageMessagHeaders]);

  // Trim columns
  var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn();
  newSheet.deleteColumns((newSheet.getLastColumn() +1), deleteColumns); 

  // Enable sorting and merging on Page Messages
  setHighlighting('FALSE');
  setSorting('TRUE');
  setMerging('TRUE');

  // Create a data storage sheet
  var sheetName = "Data Storage";
  var initialData = {'adLikesStatus':adLikesStatus, 'messagesStatus':messagesStatus, 'reactionsMap':Object.values(reactionsMap)};
  var header = Object.keys(initialData);
  // Reshape array and write to sheet
  var body = Object.values(initialData);
  body = body[0].map((_, colIndex) => body.map(row => row[colIndex]));
  var data = [];
  data.push(header);
  data.push(...body);
  var newSheet = sheet.insertSheet(sheetName);
  
  // Write sheet settings
  setHighlighting('FALSE');
  setSorting('FALSE');
  setMerging('FALSE');
  
  // Write the data
  newSheet.getRange(1,1, data.length, header.length).setValues(data);
  
  // Trim to length
  var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn();
  newSheet.deleteColumns((newSheet.getLastColumn() +1), deleteColumns); 
  
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
  var spreadSheet = sheet.getActiveSheet();
  
  // Check if there are already sheets with the names to be created if so, give an error notifcation that the sheet names already exist
  var sheetNames = sheet.getSheets().map(sheet => sheet.getName());
  var neededSheetNames = ['Ad Likes', 'Page Messages', 'Data Storage'];
  var nameIntersection = sheetNames.filter(name => neededSheetNames.includes(name));
  
  // Delete the page messages, ad likes, and data storage sheet
  if (nameIntersection === undefined || nameIntersection.length > 0){
    nameIntersection.forEach(name => sheet.deleteSheet(sheet.getSheetByName(name)));
  }
}

function test_doLogicPageMessages(){
  /**/
  var e = JSON.parse('{ "authMode": "FULL", "changeType": "INSERT_ROW", "source": {}, "triggerUid": "5026549", "user": { "email": "northdakota.bismarck@missionary.org", "nickname": "northdakota.bismarck" }}')
  doLogicPageMessages(e);
}

var TableHeader = function(){
  // Translate page header
  var sheet = SpreadsheetApp.getActiveSheet()
  var header = {
    headerData: sheet.getRange(headerRowNumber, 1, 1, sheet.getLastColumn()).getValues()[0],
    getColumnIndex(columnName) {return this.headerData.indexOf(columnName)}
  }
  return header;
}

var Rule = function(){
    return {'create': undefined};
}

