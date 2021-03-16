function removeBlankDBRows() {
    try {
    var range = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('db').getRange(2,1, SpreadsheetApp.getActiveSpreadsheet().getSheetByName('db').getLastRow()).getValues();
    range.pop();
    if(range[0] != null) {
      var values = []
      for(i=0; i<range.length; i++) {
        if(typeof range[i][0] == 'number') {
          values.push(range[i][0])
        }
      }
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName('db').getRange(2, 1, range.length).clear()
      for(i=0; i<values.length; i++) {
        SpreadsheetApp.getActiveSpreadsheet().getSheetByName('db').getRange(i+2, 1).setValue(values[i])
        
      }
    }
    } catch(e) {
      logError(e.name, e.message, 'removeBlankDBRows')
    }
  }