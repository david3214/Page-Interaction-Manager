//--------------------Global Variables-------------------------
var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Connection Tracker')
var sheetDB = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('db')
var searchValue = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Search').getRange(3,3).getValue();


var email = 'default-account@contact-manager-76697.iam.gserviceaccount.com';
var key = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDDsdFZTTPxBzr6\ny22KSdM41y7UaFzxgmmxo7jEZpybcGH9iMENZXERNmai+c/4Q+wAvQFqP+UFg2ZR\nznQfTnVDiAV37f02MgNScPiMiMoIqubceqP0PUn2F+qNQ6G1la6WSEvR9eo6Okvu\n+rimWWFrzu8G1Vz2OJBedFm0MRiWdrIlvC0qJ1qjYHqNga9cW8a1KBeh8rv8yH43\n8sloi0DyecCilZECJKKFcugsFyXdse/ht30lGYvBON4IABKMiCSEhSZVlDcIWWfe\nmcupXH9E9sJaQX5RBMBwBdXKEb/0LGhfLyVH/jE/t6+zIcJAnFFvbUqrwJWhOCDP\n8tSuAAdFAgMBAAECggEAAcFQvEk7nhkmSemwKlH+L1aJlleuIt08Wron07hCc766\nN/n6FmvikF1QU+pMqdmT0MtO4kxIjKFS2q1ntIB2JBD8LCRnpZ8lETJveWKgZvcS\nANpeKaX6N1cuSUmiEZYSKSUJR1Xey2zBbSl+XFOVUr3+mYi7pDX6FzbHycEnQfGg\nINfRVtOmUcA6T3kJbLZx5XiUSBMISq/dkCEDPANMUekSym4EYRz7Mns8gi+3+LK3\n0TOH/AecX9eTVKClaobGBKEzMiaBbFkyvlvn3xO8Vjn9ib7ESj5jHWN1AtYgHEV3\nyYVpfWDDv/xq4abpnt/nydQe+Iq88og1V39VvhAcMQKBgQDzwVHoLxgJooYx/WyE\nd30g31ovmxpZgJn1WDFYhzH2qGwpO5b6xIEb+XS0M0OgX5GCTkZ6QqCuLcPzIzpH\n47H+4V9Bh55chkOND5gml4Ef8QWjiTzAbkuxYfhmvll8pUqdHMibCKnaG8MydXYm\nQet/TuLAMtXTWCyNTFL+PZfqWQKBgQDNhnD40u72DSbJPNaGzqbyBx+dRBZpwzLP\n7jg+0GFDyjVa5Jre6wKtwtY7UPwk1zQ0/eblxU/nrQzvyGE6DLVuecVQAsI973nE\n+ddkHuBTPiWsauiqaBMG4KHmoJTaM/gi3lPuiuB+whLo6WQgHcH8BeOCEGQ3C8j2\nqe+/LryOzQKBgQDGW1Pe4Kvr80DG31Z2eZHutTL7uHj5yof+ujT1uJa1BRt3dlGH\nYW87J4WLuofWss6DPlVl2mBNPVrOuaUMqULIifftKIJ7Aptn5//Fr9ZY+ta+3Mf+\nRAL+px3v5giGQS/1qF2qo6MspRj0L9fkjBIquDQXeYa9hGxE045Z7B96iQKBgFxT\nCGy+VJozTjkYG0ZzjosqqAj9jRP1m93MJXgSI59QNqeeCfQZnhpwa8w5lQr3oXws\nkoylFj/8fNM6MHLjQp1eFkTa+GbaLNlPYnKXbC34vPO3Es158xIj1pbDjBp5Pf5r\n4UhHGpHWnKgEL/Y9Z+bOvmSu+FXB9YTY0doQJKQBAoGBAMcGAdDCt37Xy90WTyxq\nsqcyiklpKEwsDVmI1DdmcBFDwcwr/oCPeGVpCFJFxca+dcojhi4Ovh0vFNG7gAwJ\nc6zToZBpck0oJtQF0igjgcpsf6jv9mOgk3NOwPRmnzkxqoMtObNeD+JPD1dOsWcO\ny+CmySCMldn5K4DZlcOYXs10\n-----END PRIVATE KEY-----\n"
var projectId = 'contact-manager-76697'
var firestore = FirestoreApp.getFirestore(email, key, projectId);
var currUserEmail = Session.getActiveUser().getEmail();
//--------------End Global Variables----------------------------

function onOpen() {
  try{
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('db').hideSheet();
  } catch(e) {
    logError(e.name, e.message, 'onOpen')
  }
}

function onEditFunction(e) {
  try{
  if(e.range.getRow() == 3 && e.range.getColumn() == 5 && e.source.getSheetName() == 'Search') {
    mainSearch(searchValue)
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Search').getRange(3, 5).setValue('FALSE');
  }
  if(e.source.getSheetName() == 'Connection Tracker') {
    cacheDdUpdate(e)
  }
  } catch(e) {
    logError(e.name, e.message, 'onEditFunction')
  }
}




