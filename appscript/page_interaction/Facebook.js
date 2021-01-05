/*
 * Facebook OAuth 2.0 guides:
 * https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
 * https://developers.facebook.com/apps/
 */

var CLIENT_ID = '177470164010190';
var CLIENT_SECRET = '7fe710fe40f7d3a8bf74e8584510613f';

/**
 * Authorizes and makes a request to the Facebook API.
 */
function run() {
  var service = getFacebookService();
  if (service.hasAccess()) {
    var url = 'https://graph.facebook.com/v9.0/me';
    var response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + service.getAccessToken()
      }
    });
    var result = JSON.parse(response.getContentText());
    Logger.log(JSON.stringify(result, null, 2));
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s',
        authorizationUrl);
  }
}

/**
 * Reset the authorization state, so that it can be re-tested.
 */
function resetAuth() {
  getFacebookService().reset();
}

/**
 * Configures the service.
 */
function getFacebookService() {
  return OAuth2.createService('Facebook')
    // Set the endpoint URLs.
    .setAuthorizationBaseUrl('https://www.facebook.com/dialog/oauth')
    .setTokenUrl('https://graph.facebook.com/v9.0/oauth/access_token')

    // Set the client ID and secret.
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)

    // Set the name of the callback function that should be invoked to complete
    // the OAuth flow.
    .setCallbackFunction('authCallback')

    // Set the access scope
    .setScope("pages_read_engagement,pages_manage_metadata,pages_messaging")

    // Set the property store where authorized tokens should be persisted.
    .setPropertyStore(PropertiesService.getUserProperties());
}

/**
 * Handles the OAuth callback.
 */
function authCallback(request) {
  var service = getFacebookService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    uploadFacebookToken(service.getAccessToken());
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied.');
  }
}

/**
 * Logs the redict URI to register.
 */
function logRedirectUri() {
  Logger.log(OAuth2.getRedirectUri());
}

/**
 * Stores the page data in the script properties
 */
function uploadFacebookToken(token) {
  // Exchange the token to long lasting user token
  var FBurl = `https://graph.facebook.com/v9.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&fb_exchange_token=${token}`;
  var longLivedUserAccessToken = JSON.parse(UrlFetchApp.fetch(FBurl))['access_token'];

  // Get user ID
  var FBurl = `https://graph.facebook.com/v9.0/me?fields=id,name&access_token=${longLivedUserAccessToken}`;
  var userID = JSON.parse(UrlFetchApp.fetch(FBurl))['id'];

  // Exchange the token for a page token
  FBurl = `https://graph.facebook.com/v9.0/${userID}/accounts?access_token=${longLivedUserAccessToken}`
  var pageResults = JSON.parse(UrlFetchApp.fetch(FBurl));

  // Get the access token for the script
  var scriptAuthToken = ScriptApp.getOAuthToken();

  // get the spreadsheet id
  var spreadSheetId = SpreadsheetApp.getActive().getId();
  
  // Zip together the appropriate keys
  pageResults.data.forEach(page => page['google_sheets'] = {"id": spreadSheetId, "token": scriptAuthToken});
  
  /* Storing in properties since can't afford a cloud hosted db right now
  // Return true if successful
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(response)
  };

  // Store in db
  UrlFetchApp.fetch(baseURL + "page-interaction-manager/credentials", options);
  */
  
  // Set the page_id to the data
  var scriptProperties = PropertiesService.getScriptProperties();
  pageResults.data.forEach(page => scriptProperties.setProperty(page.id, JSON.stringify(page)));

  // Subscribe each page to webhook updates
  pageResults.data.forEach(function(page){
    var options = {
      'method': 'post',
    }
    var FBurl = `https://graph.facebook.com/${page.id}/subscribed_apps?subscribed_fields=feed,messages&access_token=${page.access_token}`;
    var results = JSON.parse(UrlFetchApp.fetch(FBurl, options));
  })

}

