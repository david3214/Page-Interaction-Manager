//-----------------Global Variables----------------------


//------------Functions----------------------------------

function mainSearch(searchTerm) {
    try{
    clearOldSearchResults();
    var paths = getFirestorePaths(searchTerm)
    var firestoreResutls = getFirestoreValues(paths)
    displayResults(firestoreResutls)
    searchStat();  
    } catch(e) {
      logError(e.name, e.message, 'mainSearch')
    }
  };
  
  function getFirestorePaths(searchTerm) {
    try{
    var firestorePaths = searchAlogliaRecords(searchTerm);
    return firestorePaths
    } catch(e) {
      logError(e.name, e.message, 'getFirestorePaths')
    }
  };
  
  function getFirestoreValues(paths) {
    try{
    var searchResults = firestore.getDocuments("page_connections", paths)
    return searchResults;
    } catch(e) {
      logError(e.name, e.message, 'getFirestoreValues')
    }
  };
  
  function displayResults(results) {
    try {
    for(i=0; i<results.length; i++){
      var date = results[i].obj.date
      var area = results[i].obj.areaContact
      var name = results[i].obj.name
      var location = results[i].obj.location
      var originSource = results[i].obj.originSource
      var page = results[i].obj.page
      var details = results[i].obj.details
      var values = [
        [date, area, name, location, originSource, page, details]
      ]
      var range = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Search').getRange(i+8, 2 ,1 , 7);
      range.setValues(values);
    }
    Logger.log('Displayed ' + results.length + ' Results')
    } catch(e) {
      logError(e.name, e.message, 'displayResults')
    }
  };
  
  function clearOldSearchResults() {
    try {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Search').getRange(8, 2, 26, 7).clear()
    } catch(e) {
      logError(e.name, e.message, 'clearOldSearchResults')
    }
  }