//-------------Global Variables---------------------
var connectionTracker = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Connection Tracker')
var sheetDB = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('db')
var ss = SpreadsheetApp.getActiveSpreadsheet();
// Firestore Auth
var email = 'default-account@contact-manager-76697.iam.gserviceaccount.com';
var key = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDDsdFZTTPxBzr6\ny22KSdM41y7UaFzxgmmxo7jEZpybcGH9iMENZXERNmai+c/4Q+wAvQFqP+UFg2ZR\nznQfTnVDiAV37f02MgNScPiMiMoIqubceqP0PUn2F+qNQ6G1la6WSEvR9eo6Okvu\n+rimWWFrzu8G1Vz2OJBedFm0MRiWdrIlvC0qJ1qjYHqNga9cW8a1KBeh8rv8yH43\n8sloi0DyecCilZECJKKFcugsFyXdse/ht30lGYvBON4IABKMiCSEhSZVlDcIWWfe\nmcupXH9E9sJaQX5RBMBwBdXKEb/0LGhfLyVH/jE/t6+zIcJAnFFvbUqrwJWhOCDP\n8tSuAAdFAgMBAAECggEAAcFQvEk7nhkmSemwKlH+L1aJlleuIt08Wron07hCc766\nN/n6FmvikF1QU+pMqdmT0MtO4kxIjKFS2q1ntIB2JBD8LCRnpZ8lETJveWKgZvcS\nANpeKaX6N1cuSUmiEZYSKSUJR1Xey2zBbSl+XFOVUr3+mYi7pDX6FzbHycEnQfGg\nINfRVtOmUcA6T3kJbLZx5XiUSBMISq/dkCEDPANMUekSym4EYRz7Mns8gi+3+LK3\n0TOH/AecX9eTVKClaobGBKEzMiaBbFkyvlvn3xO8Vjn9ib7ESj5jHWN1AtYgHEV3\nyYVpfWDDv/xq4abpnt/nydQe+Iq88og1V39VvhAcMQKBgQDzwVHoLxgJooYx/WyE\nd30g31ovmxpZgJn1WDFYhzH2qGwpO5b6xIEb+XS0M0OgX5GCTkZ6QqCuLcPzIzpH\n47H+4V9Bh55chkOND5gml4Ef8QWjiTzAbkuxYfhmvll8pUqdHMibCKnaG8MydXYm\nQet/TuLAMtXTWCyNTFL+PZfqWQKBgQDNhnD40u72DSbJPNaGzqbyBx+dRBZpwzLP\n7jg+0GFDyjVa5Jre6wKtwtY7UPwk1zQ0/eblxU/nrQzvyGE6DLVuecVQAsI973nE\n+ddkHuBTPiWsauiqaBMG4KHmoJTaM/gi3lPuiuB+whLo6WQgHcH8BeOCEGQ3C8j2\nqe+/LryOzQKBgQDGW1Pe4Kvr80DG31Z2eZHutTL7uHj5yof+ujT1uJa1BRt3dlGH\nYW87J4WLuofWss6DPlVl2mBNPVrOuaUMqULIifftKIJ7Aptn5//Fr9ZY+ta+3Mf+\nRAL+px3v5giGQS/1qF2qo6MspRj0L9fkjBIquDQXeYa9hGxE045Z7B96iQKBgFxT\nCGy+VJozTjkYG0ZzjosqqAj9jRP1m93MJXgSI59QNqeeCfQZnhpwa8w5lQr3oXws\nkoylFj/8fNM6MHLjQp1eFkTa+GbaLNlPYnKXbC34vPO3Es158xIj1pbDjBp5Pf5r\n4UhHGpHWnKgEL/Y9Z+bOvmSu+FXB9YTY0doQJKQBAoGBAMcGAdDCt37Xy90WTyxq\nsqcyiklpKEwsDVmI1DdmcBFDwcwr/oCPeGVpCFJFxca+dcojhi4Ovh0vFNG7gAwJ\nc6zToZBpck0oJtQF0igjgcpsf6jv9mOgk3NOwPRmnzkxqoMtObNeD+JPD1dOsWcO\ny+CmySCMldn5K4DZlcOYXs10\n-----END PRIVATE KEY-----\n"
var projectId = 'contact-manager-76697'
var firestore = FirestoreApp.getFirestore(email, key, projectId);
// Date and Time
var currDate = Utilities.formatDate(new Date(), "CST", "MMM.d.yyyy")
var currDateTime = Utilities.formatDate(new Date(), "CST", "MMM.d.yyyy 'T' HH:mm:ss z")
//------------End Global Variables---------------

//-------------Start Functions-------------------

function searchStat() {
  try {
  try {
    var pageSearches = firestore.getDocument(`monitor/${currDate}/pages/${ss.getName()}`)
    pageSearches = pageSearches['obj']['searches']
    if(pageSearches == null) {pageSearches = 0}
  } catch(e) {
    if(e.message.includes(`Document "projects/contact-manager-76697/databases/(default)/documents/monitor/${currDate}/pages/${ss.getName()}" not found.`)) {
      pageSearches = 0;
    } else {
      throw e;
    }
  }
  var totalSearches = firestore.getDocument(`monitor/${currDate}`)
  totalSearches  = totalSearches['obj']['searches']
  if(totalSearches == null){totalSearches = 0}

  firestore.updateDocument(`monitor/${currDate}`, {'searches': Number(totalSearches)+1}, true);
  
  firestore.updateDocument(`monitor/${currDate}/pages/${ss.getName()}`, {'searches': Number(pageSearches)+1}, true);
  } catch(e) {
    logError(e.name, e.message, 'searchStat')
  }
}

function statUpdate(page, numOfRec) {
  try{
  try {
    var currTotalUpdatesSearch = totalDateQuery()
    var currTotalWrites = currTotalUpdatesSearch['obj']['writes']
    var currTotalUpdates = currTotalUpdatesSearch['obj']['updates']

    var currUpdatesSearch = pageQuery(page);
    var currWrites = currUpdatesSearch['obj']['writes']
    var currUpdates = currUpdatesSearch['obj']['updates']
    firestore.updateDocument(`monitor/${currDate}`, {'updates': numOfRec + currTotalUpdates, 'writes': currTotalWrites}, true);
    firestore.updateDocument(`monitor/${currDate}/pages/${page}`, {'updates': numOfRec + currUpdates, 'writes': currWrites}, true);
  } catch(e) {
    if(e.message.includes(`Document "projects/contact-manager-76697/databases/(default)/documents/monitor/${currDate}" not found.` || `Document "projects/contact-manager-76697/databases/(default)/documents/monitor/${currDate}/pages/${page}" not found.`)) {
      firestore.updateDocument(`monitor/${currDate}`, {'updates': numOfRec, 'writes': currTotalWrites}, true);
      firestore.updateDocument(`monitor/${currDate}/pages/${page}`, {'updates': numOfRec, 'writes': currWrites}, true);
    } else {
      throw e;
    }
  }
  Logger.log('UPDATE Stats SUCCESS')
  } catch(e) {
    logError(e.name, e.message, 'statUpdate')
  }
}

function statWrite(page, numOfRec) {
  try{
  try {
    var currTotalWritesSearch = totalDateQuery()
    var currTotalUpdates = currTotalWritesSearch['obj']['updates']
    var currTotalWrites = currTotalWritesSearch['obj']['writes']

    var currWritesSearch = pageQuery(page)
    var currUpdates = currWritesSearch['obj']['updates']
    var currWrites = currWritesSearch['obj']['writes']
    firestore.updateDocument(`monitor/${currDate}`, {'writes': numOfRec + currTotalWrites, 'updates': currTotalUpdates}, true);
    firestore.updateDocument(`monitor/${currDate}/pages/${page}`, {'writes': numOfRec + currWrites, 'updates': currUpdates}, true);
  } catch(e) {
    if(e.message.includes(`Document "projects/contact-manager-76697/databases/(default)/documents/monitor/${currDate}" not found.` || `Document "projects/contact-manager-76697/databases/(default)/documents/monitor/${currDate}/pages/${page}" not found.`)) {
      firestore.updateDocument(`monitor/${currDate}`, {'writes': numOfRec + currTotalWrites, 'updates': currTotalUpdates}, true);
      firestore.updateDocument(`monitor/${currDate}/pages/${page}`, {'writes': numOfRec, 'updates': currUpdates}, true);
    } else {
      throw e;
    }
  }
  Logger.log('WRITE Stats SUCCESS')
  } catch(e) {
    logError(e.name, e.message, 'statWrite')
  }
}

function pageQuery(page) {
  try {
  var index = firestore.query(`monitor/${currDate}/pages/`).Execute();
  for(i=0; i<index.length; i++) {
    var nameIndex = index[i]['name']
    var pageName = nameIndex.replace(`projects/contact-manager-76697/databases/(default)/documents/monitor/${currDate}/pages/`, '');
    if(pageName == page) {
      return index[i]
    }
  }
  var defaultObj = {['obj']: {'writes': 0, 'updates': 0}}
  return defaultObj
  } catch(e) {
    logError(e.name, e.message, 'pageQuery')
  }
}

function totalDateQuery() {
  try {
  var index = firestore.query(`monitor/`).Execute();
  for(i=0; i<index.length; i++) {
      var nameIndex = index[i]['name']
      var pageName = nameIndex.replace(`projects/contact-manager-76697/databases/(default)/documents/monitor/`, '');
      if(pageName == currDate) {
        return index[i]
      } 
  }
  var defaultObj = {['obj']: {'writes': 0, 'updates': 0}}
  return defaultObj
  } catch(e) {
    logError(e.name, e.message, 'totalDateQuery')
  }
}




//--------------End Functions--------------------



















