var appId = '70IVTZQ47I';
var apiKey = '271a3623bfb100c41aad5563981e216b'
// const algoliaSearch = AlgoliaClient(appId, apiKey);

var headers = {
    'X-Algolia-Application-Id': appId,
    'X-Algolia-API-Key': apiKey
  }

//------------Create & Update Functions--------------

function createAlgoliaRecords(objects) {
  try{
var requests = objects.map(function(obj) {
    return {
      action: 'addObject',
      body: obj
    }
  })

  var res = UrlFetchApp.fetch('https://' + appId + ".algolia.net" + '/1/indexes/' + 'names' + '/batch', {
    contentType: 'application/json',
    method: 'POST',
    headers: headers,
    payload: JSON.stringify({ requests: requests })
  });
  Logger.log(JSON.parse(res.getContentText()))
  return JSON.parse(res.getContentText()).objectIDs[0];
  } catch(e) {
    logError(e.name, e.message, 'createAlgoliaRecords')
  }
}

function updateAlgoliaRecords(objects, algoliaID) {
  try{
  var requests = objects.map(function(obj) {
    return {
      action: 'partialUpdateObject',
      objectID: algoliaID,
      body: obj
    }
  });
  
  var res = UrlFetchApp.fetch('https://' + appId + ".algolia.net" + '/1/indexes/' + 'names' + '/batch', {
    contentType: 'application/json',
    method: 'POST',
    headers: headers,
    payload: JSON.stringify({ requests: requests })
  });
  Logger.log(JSON.parse(res.getContentText()));
  } catch(e) {
    logError(e.name, e.message, 'updateAlgoliaRecords')
  }
}

//----------Search Functions------------
function searchAlogliaRecords(searchTerm) {
  try{
  var firestorePaths = []
  var res = UrlFetchApp.fetch('https://' + appId + ".algolia.net" + '/1/indexes/' + 'names?query=' + encodeURIComponent(searchTerm) + '&hitsPerPage=26', {
    contentType: 'application/json',
    method: 'GET',
    headers: headers,
  });
  JSON.parse(res, (key, value) => {
    if(key == 'firestorePath' && typeof value === 'string') {
      var tempPath = value;
      firestorePaths.push(tempPath.replace('page_connections/', ''));
    }
  })
  return firestorePaths;
  } catch(e) {
    logError(e.name, e.message, 'SearchAlgoliaRecords')
  }
}; 


















