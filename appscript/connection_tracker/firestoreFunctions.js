//-------------Global Variables---------------------
var connectionTracker = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Connection Tracker')
var sheetDB = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('db')
var ss = SpreadsheetApp.getActiveSpreadsheet();
// Firestore Auth
var email = 'default-account@contact-manager-76697.iam.gserviceaccount.com';
var key = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDDsdFZTTPxBzr6\ny22KSdM41y7UaFzxgmmxo7jEZpybcGH9iMENZXERNmai+c/4Q+wAvQFqP+UFg2ZR\nznQfTnVDiAV37f02MgNScPiMiMoIqubceqP0PUn2F+qNQ6G1la6WSEvR9eo6Okvu\n+rimWWFrzu8G1Vz2OJBedFm0MRiWdrIlvC0qJ1qjYHqNga9cW8a1KBeh8rv8yH43\n8sloi0DyecCilZECJKKFcugsFyXdse/ht30lGYvBON4IABKMiCSEhSZVlDcIWWfe\nmcupXH9E9sJaQX5RBMBwBdXKEb/0LGhfLyVH/jE/t6+zIcJAnFFvbUqrwJWhOCDP\n8tSuAAdFAgMBAAECggEAAcFQvEk7nhkmSemwKlH+L1aJlleuIt08Wron07hCc766\nN/n6FmvikF1QU+pMqdmT0MtO4kxIjKFS2q1ntIB2JBD8LCRnpZ8lETJveWKgZvcS\nANpeKaX6N1cuSUmiEZYSKSUJR1Xey2zBbSl+XFOVUr3+mYi7pDX6FzbHycEnQfGg\nINfRVtOmUcA6T3kJbLZx5XiUSBMISq/dkCEDPANMUekSym4EYRz7Mns8gi+3+LK3\n0TOH/AecX9eTVKClaobGBKEzMiaBbFkyvlvn3xO8Vjn9ib7ESj5jHWN1AtYgHEV3\nyYVpfWDDv/xq4abpnt/nydQe+Iq88og1V39VvhAcMQKBgQDzwVHoLxgJooYx/WyE\nd30g31ovmxpZgJn1WDFYhzH2qGwpO5b6xIEb+XS0M0OgX5GCTkZ6QqCuLcPzIzpH\n47H+4V9Bh55chkOND5gml4Ef8QWjiTzAbkuxYfhmvll8pUqdHMibCKnaG8MydXYm\nQet/TuLAMtXTWCyNTFL+PZfqWQKBgQDNhnD40u72DSbJPNaGzqbyBx+dRBZpwzLP\n7jg+0GFDyjVa5Jre6wKtwtY7UPwk1zQ0/eblxU/nrQzvyGE6DLVuecVQAsI973nE\n+ddkHuBTPiWsauiqaBMG4KHmoJTaM/gi3lPuiuB+whLo6WQgHcH8BeOCEGQ3C8j2\nqe+/LryOzQKBgQDGW1Pe4Kvr80DG31Z2eZHutTL7uHj5yof+ujT1uJa1BRt3dlGH\nYW87J4WLuofWss6DPlVl2mBNPVrOuaUMqULIifftKIJ7Aptn5//Fr9ZY+ta+3Mf+\nRAL+px3v5giGQS/1qF2qo6MspRj0L9fkjBIquDQXeYa9hGxE045Z7B96iQKBgFxT\nCGy+VJozTjkYG0ZzjosqqAj9jRP1m93MJXgSI59QNqeeCfQZnhpwa8w5lQr3oXws\nkoylFj/8fNM6MHLjQp1eFkTa+GbaLNlPYnKXbC34vPO3Es158xIj1pbDjBp5Pf5r\n4UhHGpHWnKgEL/Y9Z+bOvmSu+FXB9YTY0doQJKQBAoGBAMcGAdDCt37Xy90WTyxq\nsqcyiklpKEwsDVmI1DdmcBFDwcwr/oCPeGVpCFJFxca+dcojhi4Ovh0vFNG7gAwJ\nc6zToZBpck0oJtQF0igjgcpsf6jv9mOgk3NOwPRmnzkxqoMtObNeD+JPD1dOsWcO\ny+CmySCMldn5K4DZlcOYXs10\n-----END PRIVATE KEY-----\n"
var projectId = 'contact-manager-76697'
var firestore = FirestoreApp.getFirestore(email, key, projectId);
var scriptProperties = PropertiesService.getScriptProperties();
var currDateTime = Date.now()
var currTime = Date.now()
//------------End Global Variables---------------

//----------Edit Functionality-------------------
// runs edit logic ran in onEdit trigger/function
function cacheDdUpdate(e) {
  try{
  if(rowExistsInCache(e.range.getRow()) == false) {
    Logger.log('Row not previously edited')
    removeBlankDBRows()
    triggerMain();
    sheetDB.getRange(sheetDB.getLastRow()+1, 1).setValue(e.range.getRow())
  } else if(rowExistsInCache(e.range.getRow()) == true){
    Logger.log('Row ' + e.range.getRow() + ' exists in cache')
    triggerMain();
  }
  } catch(e) {
    logError(e.name, e.message, 'cacheDbUpdate')
  }
}
// check if row exists in cache sheet
function rowExistsInCache(rowSearch) {
 try{
  var arr = sheetDB.getRange(2,1, sheetDB.getLastRow()).getValues();
  return arr.some(row => row.includes(rowSearch));
  } catch(e) {
    logError(e.name, e.message, 'rowExistsInCache')
  }
}
//-----------End Edit Functionality--------------------

//-----------onEdit Miss Trigger---------------------
function onEditError() {
  try{
  //chcek trigger status if null continue
  var triggerStatus = scriptProperties.getProperty('triggerCreationState')
  if(triggerStatus == 'queued') {return}
  //check if any entries in db sheet
  var values = sheetDB.getRange(2,1,sheetDB.getLastRow()).getValues();
  values.pop();
  //if true run trigger main
  if(values.length != 0){
    triggerMain();
    return true;
  } else {
    return false;
  }
  //else return false
  } catch(e) {
    logError(e.name, e.message, 'onEditError')
  }
}


//-----------END onEdit Miss Trigger---------------------

//----------Trigger State Error ------------------------
function triggerStateError() {
  try{
  var state = scriptProperties.getProperty('triggerCreationState')
  var trigTime = scriptProperties.getProperty('triggerCreationTime')
  
  if(currTime > Number(trigTime)+120000 && state == 'queued') {
    Logger.log("Error: Trigger Not Deleted. State Changed to 'null'")
    scriptProperties.setProperty('triggerCreationState', 'null')
    scriptProperties.setProperty('triggerCreationTime', 'null')
  }
  } catch(e) {
    logError(e.name, e.message, 'triggerStateError')
  }
}

//----------END Trigger State Error --------------------

//-----------(DEV)Scaleable trigger functionality------
function triggerMain() {
  try{
  var triggerCreationState = scriptProperties.getProperty('triggerCreationState')
  if(triggerCreationState == 'queued') {
    return Logger.log('Trigger Already Queued')
  } else if(triggerCreationState == 'null') {
    return createTrigger('mainUpdate', 60000)
  } else {
    return createTrigger('mainUpdate', 60000)
  }
  } catch(e) {
    logError(e.name, e.message, 'triggerMain')
  }
}

function status() {
  try{
  Logger.log(scriptProperties.getProperty('triggerCreationState'))
  } catch(e) {
    logError(e.name, e.message, 'status')
  }
}

function reset() {
  try{
  scriptProperties.setProperty('triggerCreationState', 'null')
  scriptProperties.setProperty('triggerCreationTime', 'null')
  } catch(e) {
    logError(e.name, e.message, 'reset')
  }
}


function timerDeleteTrigger(funcTime) {
  try{
  Utilities.sleep(funcTime + 60000)
  var triggers = ScriptApp.getProjectTriggers();
  for(i=0; i<triggers.length; i++) {
    if(triggers[i].getEventType() == 'CLOCK' && triggers[i].getHandlerFunction() == 'mainUpdate') {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
  //clear values in db sheet
  sheetDB.getRange(2, 1, sheetDB.getLastRow()).clear();
  scriptProperties.setProperty('triggerCreationState', 'null')
  scriptProperties.setProperty('triggerCreationTime', 'null')
  } catch(e) {
    logError(e.name, e.message, 'timerDeleteTrigger')
  }
}

function createTrigger(func ,timeDuration) {
  try{
  ScriptApp.newTrigger(func)
  .timeBased()
  .after(timeDuration)
  .create();
  scriptProperties.setProperty('triggerCreationState', 'queued')
  scriptProperties.setProperty('triggerCreationTime', Number(currTime))
  //getTriggerID
  var triggers = ScriptApp.getProjectTriggers();
  for(i=0; i<triggers.length; i++) {
    if(triggers[i].getEventType() == 'CLOCK' && triggers[i].getHandlerFunction() == func) {
      timerDeleteTrigger(timeDuration);
    }
  }
  } catch(e) {
    logError(e.name, e.message, 'createTrigger')
  }
}

//-------END (DEV)Scaleable trigger functionality------

//-----------Update firestore functionality-------
//runs update logic when triggered every 5 minutes
var firestoreResults;
var numOfUpdates = 0;
var numOfWrites = 0;

function mainUpdate() {
  try{
  removeBlankDBRows();
  var cacheValues = sheetDB.getRange(2,1, sheetDB.getLastRow()).getValues();
  cacheValues.pop()
  cacheValues.forEach(e => {
    if(checkNameFirestore(connectionTracker.getRange(e[0], 3).getValue()) == true && connectionTracker.getRange(e[0], 3).isBlank() == false && connectionTracker.getRange(e[0], 1).isBlank() == false){
      updateRecord(firestoreResults, e[0]);
      numOfUpdates +=1
    } else if(checkNameFirestore(connectionTracker.getRange(e[0], 3).getValue()) == false && connectionTracker.getRange(e[0], 3).isBlank() == false && connectionTracker.getRange(e[0], 1).isBlank() == false) {
      createFirestoreRecord(e[0])
      numOfWrites += 1
    } else if(connectionTracker.getRange(e[0], 1).isBlank() && connectionTracker.getRange(e[0], 3).isBlank() == false) {
      //future delete record 
    }
  })
  statUpdate(ss.getName(), numOfUpdates);
  statWrite(ss.getName(), numOfWrites);
  //delete all db sheet values
  sheetDB.getRange(2, 1, sheetDB.getLastRow()).clear();
  } catch(f) {
    logError(f.name, f.message, 'mainUpdate')
  }
}

// checks if name is in Firestore
function checkNameFirestore(nameSearch) {
  try{
  try {
    var searchResults =  firestore.query('page_connections').Where("name", "==", nameSearch).Limit(1).Execute()
      if(searchResults[0].obj.name == nameSearch) {
        firestoreResults = searchResults;
        return true;
      } else if(searchResults == []) {
        return false;
      }
  } catch(e) {
    if(e.message == "Cannot read property 'obj' of undefined") {
      return false;
    }
  }
  } catch(e) {
    logError(e.name, e.message, 'checkNameFirestore')
  }
}

// updates the sheet if existing record in Firestore
function updateRecord(fsResults, row) {
  try{
  var dataToUpdate = {
    'date': connectionTracker.getRange(row, 1).getValue(),
    'areaContact': connectionTracker.getRange(row, 2).getValue(),
    'name': connectionTracker.getRange(row, 3).getValue(),
    'location': connectionTracker.getRange(row, 4).getValue(),
    'source': connectionTracker.getRange(row, 5).getValue(),
    'details': connectionTracker.getRange(row, 6).getValue(),
    'page': ss.getName()
  }
  try {
    firestore.updateDocument(fsResults[0].path, dataToUpdate, true);
    //update algolia record
    updateAlgoliaRecords([{'name': dataToUpdate.name}], getAlgoliaID(dataToUpdate.name))
    Logger.log(fsResults[0].obj.name + "'s Record was updated")
  } catch(e) {
    if(e.message.includes("'objectID' attribute is required")) {
      var algoliaID = createAlgoliaRecords([{'name': dataToUpdate.name, 'firestorePath': getFirestorePath(dataToUpdate.name)}])
      firestore.updateDocument(fsResults[0].path, Object.assign(dataToUpdate, {'algoliaID': algoliaID}), true);
    }
  }
  } catch(e) {
    logError(e.name, e.message, 'updateRecord')
  }
}

// creates new record in Firestore
function createFirestoreRecord(row) {
  try{
    var newData = {
    'date': connectionTracker.getRange(row, 1).getValue(),
    'areaContact': connectionTracker.getRange(row, 2).getValue(),
    'name': connectionTracker.getRange(row, 3).getValue(),
    'location': connectionTracker.getRange(row, 4).getValue(),
    'source': connectionTracker.getRange(row, 5).getValue(),
    'details': connectionTracker.getRange(row, 6).getValue(),
    'page': ss.getName(),
  }
  firestore.createDocument('page_connections', newData);
  //Create record in algolia
  var algoliaID = createAlgoliaRecords([{'name': newData.name, 'firestorePath': getFirestorePath(newData.name)}])
  firestore.updateDocument(getFirestorePath(newData.name), {'algoliaID': algoliaID}, true)
  Logger.log(connectionTracker.getRange(row, 3).getValue() + "'s Record was created")
  } catch(e) {
    logError(e.name, e.message, 'createFirestoreRecord')
  }
}
//-----------End Update firestore functionality-----

function getFirestorePath(nameSearch) {
  try{
  var firestoreQuery = firestore.query('page_connections').Where("name", "==", nameSearch).Execute()
  return firestoreQuery[0].path;
  } catch(e) {
    logError(e.name, e.message, 'getFirestorePath')
  }
}

function getAlgoliaID(nameSearch) {
  try{
  var firestoreQuery = firestore.query('page_connections').Where("name", "==", nameSearch).Execute()
  return firestoreQuery[0].obj.algoliaID;
  } catch(e) {
    logError(e.name, e.message, 'getAlgoliaID')
  }
}






