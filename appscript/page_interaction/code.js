/*jshint esversion: 6 */
// Dictionary of program settings
var defaultUserSettings = {
  // Program variables
  statusList: ["Select", "Left on Read", "Rejected", "Do Not Contact", "Outside Mission", "Member", "Missionary", "Non Member", "Sent Friend Request", "Currently Messaging", "Messaged 1 Time", "Teaching", "Baptized", "Stopped Teaching"],
  statusToMerge: ["Select", "Left on Read", "Rejected", "Do Not Contact", "Outside Mission", "Member", "Missionary", "Non Member", "Sent Friend Request", "Currently Messaging", "Messaged 1 Time", "Teaching", "Baptized", "Stopped Teaching"],
  hiddenStatuses: ["Member", "Missionary", "Do Not Contact", "Rejected"],
  assignmentMap: [['Unassigned', '#82C1EC'], ['Ward 1', '#F28530'], ['Ward 2', '#FCFBC2'], ['Ward 3', '#ECE3D4'], ['Ward 4', '#F9F85F']],
  sheetSettings: {
    "Ad Likes": { "highlightEnabled": false, "sortingEnabled": true, "mergingEnabled": true },
    "Page Messages": { "highlightEnabled": false, "sortingEnabled": true, "mergingEnabled": true }
  },
}

var internalVariables = {
  reactionsMap: { "LIKE": '👍', "LOVE": '❤️', "CARE": '❤️', "HAHA": '😆', "WOW": '😮', "SAD": '😥', "ANGRY": '😡' },
  genderMap: { 'male': '#6ca0dc', 'female': '#f8b9d4' },
  triggerNames: ['doLogicPageMessages', 'updateSheet', 'everyHour'],
  editableColumns: ['Gender', 'Profile Link', 'Assignment', 'Status', '@Sac', 'On Date', 'Notes'],
  memberStatusList: ['Member', 'Missionary', 'Baptized'],
  genericHeader: ['Date', 'Name', 'Gender', 'Profile Link', 'PSID', 'Source', 'Assignment', 'Status', '@Sac', 'On Date', 'Data', 'Notes', 'Counter'],
  sheetNames: ["Ad Likes", "Page Messages"]
}

// TODO figure out a good spot for this
function updateSource(context = openContext()) {
  // If a row has a profile url then change the source to the name
  var profileLink = context.header.get('Profile Link')
  var source = context.header.get('Source')
  var postMap = getPostMap()
  _.forEach(context.values, function (row) {
    if (row[profileLink] != "") {
      var id = row[source].slice("https://facebook.com/".length)
      var title = postMap[id]
      if (title) {
        row[source] = title
      }
    }
  })
  return context
}

var programSettings = function (sheet_id = SpreadsheetApp.getActiveSpreadsheet().getId()) {
  var cache = CacheService.getScriptCache()
  var cached = cache.get(`programSettings:${sheet_id}`)
  if (cached !== null) {
    return JSON.parse(cached)
  }
  var settings = getPreference(sheet_id)
  cache.put(`programSettings:${sheet_id}`, JSON.stringify(settings), 6000)
  return settings
}

function saveProgramSettings(settings, context = openContext()) {
  /* Write the settings to the database 
   * Takes an active spreadSheet
  */
  setPreference(context.spreadSheetID, settings)
  var cache = CacheService.getScriptCache()
  cache.put(`programSettings:${context.spreadSheetID}`, JSON.stringify(settings), 6000)
}

var Rule = function () {
  return { 'create': undefined }
}

function doLogicPageMessages(e = undefined, context = openContext()) {
  /*
  Main function for the program
  Runs from the onChange trigger
  */

  var lock = LockService.getUserLock()
  lock.waitLock(30000)

  var context = e == undefined ? context : openContext(e.source)
  // Determine what type of onChange event it is
  switch (e.changeType) {
    case "INSERT_ROW":
      updateNewRow(context)
      updateSheet(e = undefined, context)
      break
    case "EDIT":
      return
    default:
  }
  // Release the lock so that other processes can continue.
  lock.releaseLock()
}

function updateNewRow(context = openContext()) {
  /*
    Update new row with prexisting or new values
  */
  var newRow = context.values.pop()
  var PSID = context.header.get('PSID')
  var newPSID = newRow[PSID]
  var PSIDList = context.values.map(row => row[PSID])

  if (PSIDList.includes(newPSID)) {
    var otherRow = _.find(context.values, [PSID, newPSID])
    // Get the index of the first matching item with the same PSID
    internalVariables.editableColumns.map(columnName => context.header.get(columnName)).forEach(columnIndex => {
      newRow[columnIndex] = otherRow[columnIndex]
    })
    newRow[context.header.get('Counter')] = 1
  }
  else {
    newRow[context.header.get('Assignment')] = _.head(_.head(context.settings.assignmentMap))
    newRow[context.header.get('Status')] = _.head(context.settings.statusList)
    newRow[context.header.get('@Sac')] = 'FALSE'
    newRow[context.header.get('On Date')] = 'FALSE'
    newRow[context.header.get('Notes')] = ""
    newRow[context.header.get('Counter')] = 1
    newRow[context.header.get('Gender')] = guessGender(newRow[context.header.get('Name')])
  }
  context.values.unshift(newRow)
  return context
}

function guessGender(name) {
  var cache = CacheService.getScriptCache()
  name = name.split(" ")[0]
  var cached = cache.get(name)
  if (cached == null && name) {
    var url = 'https://api.genderize.io' + '?name=' + encodeURIComponent(name)
    var response = UrlFetchApp.fetch(url, { 'muteHttpExceptions': true })
    if (response.getResponseCode() !== 200) { Logger.log(response.getContentText()) }
    var gender = JSON.parse(response.getContentText())['gender']
    cache.put(name, gender, 864000)
  } else {
    var gender = cached
  }
  return gender
}

function updateExistingRows(e, context = openContext()) {
  /**
   * Update existing rows with the new event data
   */
  // If the row has the same psid as event then set the events new data to the current data

  // Reject if range changed
  if (!e.hasOwnProperty('value')) { return }
  const PSID = context.header.get('PSID')
  e.columnIndex = e.range.getColumn() - 1
  e.editedRow = context.values[e.range.getRowIndex() - 2] // removing 2 to adjust for position vs index and missing header
  // Reject if not editable
  if (!internalVariables.editableColumns.map(columnName => context.header.get(columnName)).includes(e.columnIndex)) { return }
  context.values.forEach(function (row) {
    if (row[PSID] != e.editedRow[PSID]) { return }
    row[e.columnIndex] = e.value
  })

  return context
}

function updateConditionalFormattingRules(context = openContext()) {
  /*
  Adjust the conditional formating rules to cover the sheet data
  */

  if (context.values.length <= 0) { return }
  // Track the conditional formatting
  var sheetConditionalFormatRules = []

  var sheet = context.sheet

  const nameLetter = context.header.getLetter('Name')
  const assignmentLetter = context.header.getLetter('Assignment')
  const statusLetter = context.header.getLetter('Status')
  const genderLetter = context.header.getLetter('Gender')

  // Add all condtional format rules not made by us back to the list
  sheet.getConditionalFormatRules().forEach(function(format) {
    const booleanCondition = format.getBooleanCondition();
    if (booleanCondition) {
      const criteria = booleanCondition.getCriteriaType();
      const args = booleanCondition.getCriteriaValues();
      if (criteria != 'CUSTOM_FORMULA' || !args.find(arg=>arg.includes('&T(N("Missionary-Tools-Formula"))')))
        sheetConditionalFormatRules.push(format)
    }
  })

  // Make conditional formatting rule to give the different genders
  Object.keys(internalVariables.genderMap).forEach(function (key) {
    var genderConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=LOWER($${genderLetter}1)="${key}" &T(N("Missionary-Tools-Formula"))`)
      .setBackground(internalVariables.genderMap[key])
      .setRanges([sheet.getRange(`${nameLetter}:${nameLetter}`)])
      .build()
    sheetConditionalFormatRules.push(genderConditionalFormatRule)
  })

  // Hide Gender, PSID, Profile Link 
  sheet.hideColumns(context.header.get('Gender') + 1)
  sheet.hideColumns(context.header.get('PSID') + 1)

  if (context.settings.sheetSettings[context.sheetName].highlightEnabled) {
    const defaultStatus = context.settings.statusList[0]
    let selectConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$${statusLetter}1="${defaultStatus}" &T(N("Missionary-Tools-Formula"))`)
      .setBackground("#EA4335") // soft red
      .setFontColor('white')
      .setItalic(true)
      .setRanges([sheet.getRange(`${statusLetter}:${statusLetter}`)])
      .build()
    
    sheetConditionalFormatRules.push(selectConditionalFormatRule)

    // Make conditional formatting rule to give the Assignments different colors
    context.settings.assignmentMap.forEach(function (assignmentPair) {      
      const assignmentConditionalFormatRule1 = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($${assignmentLetter}1="${assignmentPair[0]}" &T(N("Missionary-Tools-Formula")), ISEVEN(ROW()))`)
        .setBackground(assignmentPair[1])
        .setRanges([context.range])
        .build()
        
      const assignmentConditionalFormatRule2 = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($${assignmentLetter}1="${assignmentPair[0]}" &T(N("Missionary-Tools-Formula")), ISODD(ROW()))`)
        .setBackground(LightenColor(assignmentPair[1], 5))
        .setRanges([context.range])
        .build()
      
      sheetConditionalFormatRules.push(...[assignmentConditionalFormatRule1, assignmentConditionalFormatRule2])
    })
  }
  else {
    // If they don't want sheet highlighting just highlight the assignment 

    // Make conditional formatting rule to give the Assignments different colors
    context.settings.assignmentMap.forEach(function (assignmentPair) {
      const assignmentConditionalFormatRule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${assignmentLetter}1="${assignmentPair[0]}" &T(N("Missionary-Tools-Formula"))`)
        .setBackground(assignmentPair[1])
        .setRanges([sheet.getRange(`${assignmentLetter}:${assignmentLetter}`)])
        .build()
      sheetConditionalFormatRules.push(assignmentConditionalFormatRule)
    })
  }

  // Apply conditional formatting rule to sheet
  sheet.setConditionalFormatRules(sheetConditionalFormatRules)
}

function updateDataValidationRules(context = openContext()) {
  /*
  Function is reponsible for apply page wide data validation rules
  */
  if (context.values.length <= 0) { return }
  // Get the current active sheet
  var sheet = context.sheet

  // Clear previous rules
  sheet.getRange(1, 1, sheet.getMaxRows(), context.maxColumns).setDataValidation(null)

  // Dictionary to hold all of our rules
  var rules = {}

  // Make 'Assignment' rule
  var assignment = new Rule()
  assignment.create = function () {

    // Make data validation rule for Assignment
    var enforceAssignment = SpreadsheetApp.newDataValidation()
    var assigment_vals = context.settings.assignmentMap.map(pair => pair[0])
    enforceAssignment.requireValueInList(assigment_vals, true)
    enforceAssignment.setAllowInvalid(true)
    enforceAssignment.build()

    // Set the assignment range rule
    sheet.getRange(2, context.header.get('Assignment') + 1, context.values.length).setDataValidation(enforceAssignment)
  }
  rules["Assignment"] = assignment

  // Make a 'Status' rule
  var status = new Rule()
  status.create = function () {

    // Make data validation rule for Status
    var enforceStatus = SpreadsheetApp.newDataValidation()
    enforceStatus.requireValueInList(context.settings.statusList, true)
    enforceStatus.setAllowInvalid(true)

    // Set the status range rule andd apply the rule
    sheet.getRange(2, context.header.get('Status') + 1, context.values.length).setDataValidation(enforceStatus)
  }
  rules["Status"] = status

  // Make a '@Sac' rule
  var atSac = new Rule()
  atSac.create = function () {

    // Make data validation rule for check boxes
    var enforceCheckbox = SpreadsheetApp.newDataValidation()
    enforceCheckbox.requireCheckbox()
    enforceCheckbox.setAllowInvalid(true)
    enforceCheckbox.build()

    // Get the atSac range and apply data validation check boxes
    sheet.getRange(2, context.header.get('@Sac') + 1, context.values.length).setDataValidation(enforceCheckbox)
  }
  rules["@Sac"] = atSac

  // Make a 'On Date' rule
  var onDate = new Rule()
  onDate.create = function () {

    // Make data validation rule for check boxes
    var enforceCheckbox = SpreadsheetApp.newDataValidation()
    enforceCheckbox.requireCheckbox()
    enforceCheckbox.setAllowInvalid(true)
    enforceCheckbox.build()

    // Get the 'On Date' range and apply data validation check boxes
    sheet.getRange(2, context.header.get('On Date') + 1, context.values.length).setDataValidation(enforceCheckbox)
  }
  rules["On Date"] = onDate

  // Make a 'Following The FB Page' rule
  var followingTheFBPage = new Rule()
  followingTheFBPage.create = function () {

    // Make data validation rule for check boxes
    var enforceCheckbox = SpreadsheetApp.newDataValidation()
    enforceCheckbox.requireCheckbox()
    enforceCheckbox.setAllowInvalid(true)
    enforceCheckbox.build()

    // Get the 'Following The Page' range and apply data validation check boxes
    sheet.getRange(2, context.header.get('Following The FB Page') + 1, context.values.length).setDataValidation(enforceCheckbox)
  }
  rules["Following The FB Page"] = followingTheFBPage

  // Build the rules on for the current sheet
  context.header.headerData.forEach(function (columnName) {
    if (rules.hasOwnProperty(columnName)) {
      rules[columnName].create(sheet)
    }
  })
}

function highlightSheet(context = openContext()) {
  /*
  Ensure acurate highlighting on the sheet
  */
  // Check if highlighting is enabled
  if (!context.settings.sheetSettings[context.sheetName].highlightEnabled) { return }
  var values = context.getWritableValues()

  // Filter the values and get all PSID where status == select
  var status = context.header.get('Status')
  var PSID = context.header.get('PSID')
  var selectPSID = values.filter(row => row[status] == 'Select').map(row => row[PSID])

  // Map the values, if PSID is in previous filter results then mark the line red
  var colorRow = function (row) {
    /* Color a specific cell in a row */
    if (selectPSID.includes(row[PSID])) {
      var res = new Array(row.length).fill("red")
    } else {
      var res = new Array(row.length).fill("white")
    }
    return res
  }
  var results = values.map(colorRow)

  // Write back the results to google sheets
  context.range.setBackgrounds(results)
}

function hideRows(context = openContext(), active = true) {
  /* Hide rows with specific statuses */
  // Get inital data
  var sheet = context.sheet
  var range = context.range
  var hiddenStatuses = context.settings.hiddenStatuses

  // Unhide all the rows
  sheet.unhideRow(range)
  if (active == false) { return }

  // Get a list of indexes where the row status is in hidden status
  // Filter the values and get all PSID where status is in hiddenStatuses
  var PSIDsToHide = context.values.filter(row => hiddenStatuses.includes(row[context.header.get('Status')])).map(row => row[context.header.get('PSID')])

  // Hides the rows in results
  var hideMatchingPSID = function (row, index) {
    var currentPSID = row[context.header.get('PSID')]
    if (PSIDsToHide.includes(currentPSID)) {
      sheet.hideRows(index + 1, 1)
    }
  }
  context.values.forEach(hideMatchingPSID)
}

function activateTriggers(context = openContext()) {
  /* Create the project triggers */
  // Enable a trigger to run the page logic
  ScriptApp.newTrigger(internalVariables.triggerNames[0])
    .forSpreadsheet(context.spreadSheetID)
    .onChange()
    .create()

  // Enable a triger to run on edit to do the highlights
  ScriptApp.newTrigger(internalVariables.triggerNames[1])
    .forSpreadsheet(context.spreadSheetID)
    .onEdit()
    .create()

  ScriptApp.newTrigger(internalVariables.triggerNames[2])
    .timeBased()
    .everyHours(1)
    .create()
}


function deactivateTriggers(context = openContext()) {
  /* Remove our project triggers */
  var triggers = ScriptApp.getUserTriggers(context.spreadSheet)
  var removeOurTriggers = function (trigger) {
    if (internalVariables.triggerNames.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger)
    }
  }
  triggers.forEach(removeOurTriggers)
}


function setUpSheet(spreadSheet = SpreadsheetApp.getActiveSpreadsheet()) {
  /*
  Create sheets, open auth pannel
  */
  var firstSheet = _.head(spreadSheet.getSheets()).getName()
  var context = openContext(spreadSheet, firstSheet)

  saveProgramSettings(defaultUserSettings, context)
  tearDownSheet(context)
  var genericHeader = internalVariables.genericHeader
  var sheetNames = ["Ad Likes", "Page Messages"]
  _.forEach(sheetNames, function (name) {
    var newSheet = context.spreadSheet.insertSheet(name)
    newSheet.getRange(1, 1, 1, genericHeader.length).setValues([genericHeader])
    var deleteColumns = newSheet.getMaxColumns() - newSheet.getLastColumn()
    newSheet.deleteColumns((newSheet.getLastColumn() + 1), deleteColumns)
  })
  activateTriggers(context)
  showAuthenticationSidebar(context)
}

function tearDownSheet(context = openContext()) {
  /* Remove our sheets */
  // Uninstall the triggers
  var spreadSheet = context.spreadSheet
  deactivateTriggers(context)

  // Get app installed page_id's, remove them from database

  // Remove facebook authentication for user
  resetAuth()

  // Unsubscribe the page from facebook app to stop uncoming data
  // TODO is needed

  // Remove the pages from the script properties
  // Delete managed pages by page id
  // var sheet_id = spreadSheet.getId();

  /// deletePreference(sheet_id);

  // Check if there are already sheets with the names to be created if so, give an error notifcation that the sheet names already exist
  var sheetNames = spreadSheet.getSheets().map(sheet => sheet.getName())
  var neededSheetNames = ['Ad Likes', 'Page Messages']
  var nameIntersection = sheetNames.filter(name => neededSheetNames.includes(name))

  // Delete the page messages, and ad likes sheet
  if (nameIntersection === undefined || nameIntersection.length > 0) {
    nameIntersection.forEach(name => spreadSheet.deleteSheet(spreadSheet.getSheetByName(name)))
  }
}

function showSettings() {
  var html = HtmlService.createTemplateFromFile('page_interaction/settings_models/settings')
  html = html.evaluate()
    .setTitle('Program Settings')
    .setWidth(600)
    .setHeight(600)
  SpreadsheetApp.getUi()
    .showModalDialog(html, 'Program Settings')
}

function openContext(spreadSheet = SpreadsheetApp.getActiveSpreadsheet(), sheetName = undefined) {
  // Create a context to be shared by all executions
  var spreadSheetID = spreadSheet.getId()
  var manuallySpecified = _.isString(sheetName)
  var sheetName = _.defaultTo(sheetName, spreadSheet.getActiveSheet().getName())
  if (!manuallySpecified && !_.includes(internalVariables.sheetNames, sheetName)) { Logger.log(`${sheetName} of ${spreadSheetID} made an edit on a non normal sheet, exiting`); return }
  var sheet = spreadSheet.getSheetByName(sheetName)
  var settings = programSettings(spreadSheetID)
  var range = sheet.getDataRange()
  var values = range.getValues()
  var headerArray = values.shift()
  var header = {
    headerData: headerArray,
    get(columnName) { return this.headerData.indexOf(columnName) },
    getLetter(columnName) { return columnToLetter(this.get(columnName) + 1)}
  }
  var lastRow = sheet.getLastRow()
  var maxColumns = sheet.getMaxColumns()
  return {
    spreadSheet: spreadSheet,
    sheet: sheet,
    spreadSheetID: spreadSheetID,
    sheetName: sheetName,
    settings: settings,
    range: range,
    header: header,
    values: values,
    lastRow: lastRow,
    maxColumns: maxColumns,
    allValues: function () { return [this.header.headerData].concat(this.values) },
    getWritableValues: function () {
      var allValues = this.allValues()
      var initialHeight = this.range.getHeight()
      var currentHeight = allValues.length
      var difference = Math.abs(currentHeight - initialHeight)
      const rowLength = this.header.headerData.length
      var blankArray = [...Array(difference)].map(x => Array(rowLength))
      allValues = _.concat(allValues, blankArray)
      return allValues
    },
    writeRange: function () {
      var allValues = this.getWritableValues()
      this.range.setValues(allValues)
    }
  }
}

function trimSheet(context = openContext()) {
  // Cut sheet width and height to length
  var sheet = context.sheet
  var start = context.allValues().length + 1
  var howManyToDelete = sheet.getMaxRows() - start + 1
  if (howManyToDelete > 0) { sheet.deleteRows(start, howManyToDelete) }

  var headerLength = context.header.headerData.length
  var deleteColumns = context.maxColumns - headerLength
  if (deleteColumns > 0) { sheet.deleteColumns((headerLength + 1), deleteColumns) }

}
function removeBadRows(context = openContext()) {
  _.remove(context.values, _.matches(["", "", "", "", "", "", "", "", false, false, "", "", ""]))
}

function formatSheet(context = openContext()) {
  updateConditionalFormattingRules(context)
  updateDataValidationRules(context)
  trimSheet(context)
  // highlightSheet(context)

  // =$H2="Select"
  // =AND($H2="Select",$G2="Unassigned")
  // TODO build a conditional formating rule to highlight the sheet
}

function updateSheet(e = undefined, context = openContext()) {
  // Update the sheet rules, formatting and, coloring
  // Called every time an edit happens
  // Return if no data
  var lock = LockService.getDocumentLock() == null ? LockService.getUserLock() : LockService.getDocumentLock()
  lock.waitLock(30000)
  var context = e == undefined ? context : openContext(e.source)
  if (context.values.length == 0) { return }
  if (e != undefined) { updateExistingRows(e, context) };
  mergeData(context)
  sortData(context)
  removeBadRows(context)
  context.writeRange()
  SpreadsheetApp.flush()
  lock.releaseLock()
}

function showDebugSidebar() {
  var html = HtmlService.createTemplateFromFile('page_interaction/debug')
  html = html.evaluate()
    .setTitle('Debug')
    .setWidth(600)
    .setHeight(600)
  SpreadsheetApp.getUi()
    .showSidebar(html)

}
function getAuthorizationUrl() {
  // Get authorization url if not authorized
  var facebookService = getFacebookService()
  if (!facebookService.hasAccess()) {
    var authorizationUrl = facebookService.getAuthorizationUrl()
    return authorizationUrl
  }
}
function showAuthenticationSidebar() {
  if (mode == "TEST") { return }
  var facebookService = getFacebookService()
  if (!facebookService.hasAccess()) {
    var authorizationUrl = facebookService.getAuthorizationUrl()
    var template = HtmlService.createTemplate(
      `<div class="auth-container-facebook"> 
        Click the button to connect pages from Facebook.
        <a target="_blank" id="facebook-auth-link" href="<?= authorizationUrl ?>">
          <img id="facebook-sign-in-button" style="padding:10px; width: 250px; display:block; margin:auto;" src="https://storage.googleapis.com/eighth-vehicle-287322.appspot.com/page_interaction_manager/continue-with-facebook.png"></img>
        </a>
      </div>
      <div class="auth-container-google">
      Click the button to authenticate with Google.
      <a target="_blank" id="facebook-auth-link" href="https://missionary-tools.com/auth/authorize">
          <img id="google-sign-in-button" style="padding:10px; width: 250px; display:block; margin:auto;" src="https://storage.googleapis.com/eighth-vehicle-287322.appspot.com/page_interaction_manager/btn_google_signin_dark_normal_web.png"></img>
      </a>
      </div>
      <div><p>Please close this panel and go to addon settings to pick a page to sync to this sheet when Facebook and Google have been authenticated successfully.</p></div>`)
    template.authorizationUrl = authorizationUrl
    var page = template.evaluate().setTitle("Authentication")
    SpreadsheetApp.getUi().showSidebar(page)
  } else {
    // ... What to do if they are authenticated
    var template = HtmlService.createTemplate('You are authorized, go to Page Interaction Manager settings to pick a page for the sheet.\n')

    var page = template.evaluate().setTitle("Authentication")
    SpreadsheetApp.getUi().showSidebar(page)
  }
}

function doPost(request) {
  // Load the stored data for the page

  try {
    var event = mode == "TEST" ? test_data.sample_page_notifications_accept.shift() : JSON.parse(request.postData.getDataAsString())
    if (event.entry[0].messaging) { var event_type = 'message' } else if (event.entry[0].changes[0].value.item) { var event_type = 'reaction' }
    var event_type = mode == "TEST" ? "reaction" : event_type
    var eventNameMap = { 'reaction': 'Ad Likes', 'message': 'Page Messages' }
    var reactionsMap = internalVariables.reactionsMap
    var page_id = undefined
    var page_details = undefined
    if (event_type == "reaction") {
      // Classify the incoming event
      // Reject stuff we aren't interested in
      if (event.entry[0].changes[0].value.item == 'video'
        || event.entry[0].changes[0].value.item == 'comment'
        || event.entry[0].changes[0].value.verb != 'add') {
        return ContentService.createTextOutput(JSON.stringify({ "status": "Unprocessed" }))
      }
      page_id = event.entry[0].id

    } else if (event_type == "message") {
      page_id = event.entry[0].messaging[0].recipient.id

    }

    var page_details = getPageDetails(page_id)
    if (!page_details) { throw { name: "ValueError", message: `Searched for ${page_id} but no result was found` } }

    // Process reactions
    if (event_type == "reaction") {
      var messageOrReaction = reactionsMap[event.entry[0].changes[0].value.reaction_type.toUpperCase()]
      var name = event.entry[0].changes[0].value.from.name
      var psid = event.entry[0].changes[0].value.from.id
      var facebookClue = `https://facebook.com/${encodeURIComponent(event.entry[0].changes[0].value.post_id)}`
    }
    else if (event_type == "message") {
      var messageOrReaction = event.entry[0].messaging[0].message.text
      // Get name from fb
      var url = `https://graph.facebook.com/${event.entry[0].messaging[0].sender.id}?fields=first_name,last_name&access_token=${page_details.access_token}`
      var results = JSON.parse(UrlFetchApp.fetch(url).getContentText())
      var name = results['first_name'] + " " + results['last_name']
      var psid = event.entry[0].messaging[0].sender.id
      var facebookClue = `https://www.facebook.com/search/people?q=${encodeURIComponent(name)}`
    }

    // Process current time
    var today = new Date()
    today = today.toLocaleDateString("en-US")

    // Send the results to the sheet as the user
    var spreadsheetId = page_details.google_sheets.id
    var sheetName = eventNameMap[event_type]
    var values = { "values": [[today, name, "", "", psid, facebookClue, "", "", "", "", messageOrReaction, "", ""]] }
    var options = {
      "headers": {
        'Authorization': 'Bearer ' + page_details.google_sheets.token,
        "Content-type": "application/json",
      },
      "method": "POST",
      "payload": JSON.stringify(values),
      'muteHttpExceptions': true
    }
    var url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) + "/values/" + encodeURIComponent(sheetName) + ":append?insertDataOption=INSERT_ROWS&valueInputOption=USER_ENTERED"
    var results = UrlFetchApp.fetch(url, options)

    if (results.getResponseCode() !== 200) {
      var clientId = PropertiesService.getScriptProperties().getProperty("MT_CLIENT_ID")
      var clientSecret = PropertiesService.getScriptProperties().getProperty("MT_CLIENT_SECRET")
      var refreshToken = page_details.google_sheets.refresh_token
      var accessToken = refreshAccessToken(clientId, clientSecret, refreshToken)
      page_details.google_sheets.token = accessToken
      options.headers.Authorization = 'Bearer ' + page_details.google_sheets.token
      setPageDetails(page_details.id, page_details)
      var results = UrlFetchApp.fetch(url, options)
      if (results.getResponseCode() !== 200) { throw { name: "TokenError", message: `Tried to update access token but failed for ${JSON.stringify(page_details)}` } };
    }

    return ContentService.createTextOutput(JSON.stringify({ "status": "Processed" }))
  } catch (error) {
    Logger.log(`error in doPost ${JSON.stringify(error.message)}, ${JSON.stringify(request)}`)
    return ContentService.createTextOutput(JSON.stringify({ "status": "Error" }))
  }
}

function analyzeSheet(context = openContext()) {
  // Get initial data
  var values = context.values
  const PSID = context.header.get('PSID')
  const count = context.header.get('Counter')
  const status = context.header.get('Status')
  const source = context.header.get('Source')
  var postMap = getPostMap()
  var results = {
    "statuses": {},
    "PSID": [],
    "uniquePeople": 0,
    "members": [0, 0],
    "nonMembers": [0, 0],
    "posts": {},
    "sortedPosts": [],
    "postMap": postMap
  }

  // Clean data
  // Get the most recent and unique rows by PSID
  var set = new Set()
  var cleanedData = values.filter(row => {
    if (set.has(row[PSID])) { return false }
    else { set.add(row[PSID]); return true }
  })
  results.PSID = Array.from(set)

  results.uniquePeople = set.size   // Count the number of unique people
  // Count the number of members and non members
  // Figure out the best non member and member post
  var unique = 0
  var total = 1
  cleanedData.forEach(row => {
    results.statuses[row[status]] = results.statuses[row[status]] == null ? [0, 0] : results.statuses[row[status]]
    results.statuses[row[status]][unique] += 1
  })

  values.forEach(row => {
    results.posts[row[source]] = results.posts[row[source]] == null ? {} : results.posts[row[source]]
    results.posts[row[source]][row[status]] = results.posts[row[source]][row[status]] == null ? 0 : results.posts[row[source]][row[status]]
    results.posts[row[source]][row[status]] += 1

    results.statuses[row[status]] = results.statuses[row[status]] == null ? [0, 0] : results.statuses[row[status]]
    results.statuses[row[status]][total] += parseInt(row[count])
  })

  _.forEach(results.statuses, function (val, key) {
    if (_.includes(internalVariables.memberStatusList, key)) {
      results.members[unique] += parseInt(val[unique])
      results.members[total] += parseInt(val[total])
    } else {
      results.nonMembers[unique] += parseInt(val[unique])
      results.nonMembers[total] += parseInt(val[total])
    }
  })

  // Sort the bests posts
  // Create items array
  function sortByValue(dict) {
    var items = Object.keys(dict).map(function (key) {
      var sum = Object.values(dict[key]).reduce((a, b) => a + b, 0)
      return [key, sum]
    })
    // Sort the array based on the second element
    items.sort(function (first, second) {
      return second[1] - first[1]
    })
    return items
  }

  results.sortedPosts = sortByValue(results.posts).map(function (row) {
    var obj = {}
    obj[row[0]] = results.posts[row[0]]
    return obj
  })
  return JSON.stringify(results)
}

function showAnalytics(context = openContext()) {
  if (mode == "TEST") { return }
  var template = HtmlService.createTemplateFromFile('page_interaction/analytics')
  var page = template.evaluate().setTitle("Analytics")
  SpreadsheetApp.getUi().showSidebar(page)
}

function updateProfiles(profileList, context = openContext()) {
  // Add in the profile list into the sheet
  const profileLink = context.header.get('Profile Link')
  const name = context.header.get('Name')
  context.values.forEach(function (row) {
    if (row[profileLink] == "") {
      row[profileLink] = profileList[row[name]]
    }
  })
  context.writeRange()
}


function mergeData(context = openContext()) {
  /**
   * Ensures all rows are unique, will lost past history
   * return the values in 2d array form
   */
  if (!context.settings.sheetSettings[context.sheetName].mergingEnabled) { return };
  const PSID = context.header.get('PSID')
  const count = context.header.get('Counter')
  const status = context.header.get('Status')
  const assignment = context.header.get('Assignment')
  const date = context.header.get('Date')
  const statusToMerge = context.settings.statusToMerge
  var values = _.groupBy(context.values, PSID)
  var defaultStatus = _.head(context.settings.statusList)

  var rowsToMerge = _.filter(context.values, function (row) {
    return _.includes(statusToMerge, row[status])
  })
  var PSIDToMerge = _.uniq(_.map(rowsToMerge, row => row[PSID]))

  PSIDToMerge.forEach(currentPSID => {
    values[currentPSID] = _.partition(values[currentPSID], [status, defaultStatus])
    values[currentPSID] = _.map(values[currentPSID], partition => { return _.orderBy(partition, [status, assignment, date], ['asc', 'asc', 'asc']) })
    values[currentPSID] = _.flatten(values[currentPSID])
    values[currentPSID] = _.reduceRight(values[currentPSID], function (accumulator, row) {
      row[count] = _.isNumber(row[count]) ? row[count] : 1
      accumulator[count] = _.isNumber(accumulator[count]) ? accumulator[count] : 1
      row[count] = _.defaultTo(row[count], 1)
      accumulator[count] = _.defaultTo(accumulator[count], 1)
      if (!accumulator[count] || !row[count]) {
        Logger.log(`${accumulator} ${row[count]}`)
      }
      accumulator[count] = parseInt(accumulator[count]) + parseInt(row[count])
      return accumulator
    })
    values[currentPSID] = [values[currentPSID]]
  })

  context.values = _.flatten(_.values(values))
  return context
}

function shuffle(context = openContext()) {
  context.values = _.shuffle(context.values)
  context.writeRange()
}

function sortData(context = openContext()) {
  /**
   * Sort and group the data, memberish rows are moved to the end
   * TODO Add another sorting option to sort just by date
  */
  if (!context.settings.sheetSettings[context.sheetName].sortingEnabled) { return }
  var assignment = context.header.get('Assignment')
  var status = context.header.get('Status')
  var PSID = context.header.get('PSID')
  var date = context.header.get('Date')
  var hiddenStatuses = context.settings.hiddenStatuses || internalVariables.memberStatusList
  var hidden = _.filter(context.values, function (row) { return _.includes(hiddenStatuses, row[status]) })
  var values = _.filter(context.values, function (row) { return !_.includes(hiddenStatuses, row[status]) })
  values = _.orderBy(values, [assignment, status, date], ['asc', 'asc', 'desc'])
  hidden = _.orderBy(hidden, [assignment, status, date], ['asc', 'asc', 'desc'])
  var finalResults = _.concat(values, hidden)
  context.values = finalResults
  return context
}

function getGoogleAuthStatus() {

  var clientId = PropertiesService.getScriptProperties().getProperty("MT_CLIENT_ID")
  var clientSecret = PropertiesService.getScriptProperties().getProperty("MT_CLIENT_SECRET")
  let valid_status = { user_status: true, page_status: true }

  // Check if a valid token is tied to the page
  const selectedPage = getSelectedPages().data[0]
  let fbRefreshToken = selectedPage ? selectedPage.google_sheets.refresh_token : undefined
  if (!fbRefreshToken) {
    valid_status.page_status = false
  } else {
    try {
      refreshAccessToken(clientId, clientSecret, fbRefreshToken)
      valid_status.page_status = true
      return valid_status
    } catch (err) {
      if (!err.message || (!err.message.includes('Bad Request') && !err.message.includes('Token has been expired or revoked'))) throw err
      valid_status.page_status = false
    }
  }

  // Check if a valid token is tied to the user
  const userId = getEffectiveUserId()
  const user = getUser(userId)

  if (!user || !user.refresh_token || user.refresh_token == fbRefreshToken)
    valid_status.user_status = false
  else {
    try {
      refreshAccessToken(clientId, clientSecret, user.refresh_token)
      valid_status.user_status = true
    } catch (err) {
      if (!err.message || (!err.message.includes('Bad Request') && !err.message.includes('Token has been expired or revoked'))) throw err
      valid_status.user_status = false
    }
  }

  return valid_status
}

function updatePageRefreshToken() {
  saveFacebookPagesDetails(getSelectedPages())
  return true
}

// TODO Use the time that facebook gives for the event occurence
// TODO convert that time to the timezone of the sheet

function refreshAccessToken(clientId, clientSecret, refreshToken) {
  // todo deep six the token if it is bad
  var url = "https://accounts.google.com/o/oauth2/token"
  var data = {
    'grant_type': 'refresh_token',
    'client_id': clientId,
    'client_secret': clientSecret,
    'refresh_token': refreshToken
  }
  var options = {
    'method': 'post',
    'payload': data
  }
  var accessToken = JSON.parse(UrlFetchApp.fetch(url, options).getContentText())['access_token']
  return accessToken
}

function getIdentityToken() {
  var idToken = ScriptApp.getIdentityToken()
  var body = idToken.split('.')[1]
  var decoded = Utilities.newBlob(Utilities.base64Decode(body)).getDataAsString()
  var payload = JSON.parse(decoded)
  return payload
}

function getEffectiveUserId() {
  var profileId = getIdentityToken().sub
  return profileId
}


function healSheet(context = openContext()) {
  // Make sure the triggers are installed
  // Make sure the sheets have correct authentication levels
  // 
  var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL)
  var authUrl = authInfo.getAuthorizationUrl()
  if (authUrl) {
    context.spreadSheet.toast(`Authentication needed. ${authUrl}`, 'Authentication', 15)
    return
  } else if (!_.head(getSelectedPages().data).google_sheets.refresh_token) {
    var htmlOutput = HtmlService
      .createHtmlOutput(`<a target="_blank" href="https://missionary-tools.com/auth/authorize">Click here</a> to fix data not showing up in the sheet.`)
      .setWidth(300)
      .setHeight(100)
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Missing Authentication!")
    return
  }
  deactivateTriggers(context)
  activateTriggers(context)
  updateSheet(e = undefined, context)
  formatSheet(context)
  insertMissingDefaultValues(context)
}

function executeFunctionByName(functionName, context = this /*, args */) {
  var args = Array.prototype.slice.call(arguments, 2)
  var namespaces = functionName.split(".")
  var func = namespaces.pop()
  for (var i = 0;i < namespaces.length;i++) {
    context = context[namespaces[i]]
  }
  return context[func].apply(context, args)
}

function getPostMap() {
  // create a dictionary of post ids to post titles
  var pageData = getSelectedPages()
  var feed = _.head(pageData.data).feed.data
  var postMap = _.mapValues(_.keyBy(feed, 'id'), 'message')
  return postMap
}

function insertMissingDefaultValues(context = openContext()) {
  // Fill in null or blank values with defaults
  context.values.forEach(row => {
    row[0] = row[0] == "" ? "" : row[0] // Date
    row[1] = row[1] == "" ? "" : row[1] // Name
    row[2] = row[2] == "" ? "" : row[2] // Gender
    row[3] = row[3] == "" ? "" : row[3] // Profile Link
    row[4] = row[4] == "" ? "" : row[4] // PSID
    row[5] = row[5] == "" ? "" : row[5] // Source
    row[6] = row[6] == "" ? _.head(_.head(context.settings.assignmentMap)) : row[6] // Assignment
    row[7] = row[7] == "" ? _.head(context.settings.statusList) : row[7] // Status
    row[8] = row[8] == "" ? "FALSE" : row[8] // Sac
    row[9] = row[9] == "" ? "FALSE" : row[9] // Date
    row[10] = row[10] == "" ? "" : row[10] // Reaction
    row[11] = row[11] == "" ? "" : row[11] // Notes
    row[12] = row[12] == "" ? 1 : row[12] // Counter
    row[12] = isNaN(row[12]) ? 1 : row[12]
  })
  context.writeRange()
}

function everyHour(e = undefined) {
  try {
    if (e != undefined) {
      internalVariables.sheetNames.forEach(sheetName => {
        var context = openContext(e.source, sheetName)
        formatSheet(context)
        updateSheet(e = undefined, context)
        insertMissingDefaultValues(context)
      })
    }
  } catch (e) {
    if (e instanceof TypeError) {
      // statements to handle TypeError exceptions
      Logger.log(e)
    } else if (e instanceof RangeError) {
      // statements to handle RangeError exceptions
      Logger.log(e)
    } else if (e instanceof EvalError) {
      // statements to handle EvalError exceptions
      Logger.log(e)
    } else {
      // statements to handle any unspecified exceptions
      Logger.log(e) // pass exception object to error handler
    }
  }
}

function toastSheetInfo(context = openContext()) {

  var projectTriggers = ScriptApp.getProjectTriggers()
  var installedProjectTriggers = _.map(projectTriggers, function (trigger) { return trigger.getHandlerFunction() })

  var userTriggers = ScriptApp.getUserTriggers(context.spreadSheet)
  var installedUserTriggers = _.map(userTriggers, function (trigger) { return trigger.getHandlerFunction() })
  var results = `P ${installedProjectTriggers.toString()}: U ${installedUserTriggers.toString()}`
  Logger.log(results)
  context.spreadSheet.toast(results, 'Debug info', 30)

}

//Helper function for HTML scriplet templating. Called by HtmlService when including other files into a template
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent()
}

// Helper function to for column indexing will return values of A, B, AA, BB for respective Columns
function columnToLetter(column)
{
  let temp, letter = '';
  while (column > 0)
  {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

// Helper Function to the Condtional formatting for lighter assignment rows
function LightenColor(hex, strength=5) {

	// validate hex string
	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6) {
		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	}

	// convert to decimal and change luminosity
	var rgb = "#", c, i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i*2,2), 16);
		c = Math.round(Math.min(Math.max(0, c + (255-c) / strength), 255)).toString(16);
		rgb += ("00"+c).substr(c.length);
	}

	return rgb;
}

// fix the every hour issue not being able to get settings or do any update
// set highlighting to false in every ones settings?
// add a forward and back button to the find member profiles
// store the member profile data locally instead of on redis, just pull from redis, check if can store in rows 50k character limit
// get profiles to load automattically - put job in queue for automatic execution
// find way to connect the web and desktop client together
// message people automatticaly and update the sheet that it has been done.
// stream all events into backup database for history and reliability
// make the profiles global accross all google sheets so if one missionary marks a profile as member all missionaries get that data
// fix the column formating for counter to be a number and date to be a date
// todo fix collumsn expanding right
// Bug: when notes are cleared to nothing none of the other ones update...
// name cache isn't working 
// TODO delete should disconnect from the facebook app as well
// TODO freeze the header row