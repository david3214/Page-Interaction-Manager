/*
 * Facebook OAuth 2.0 guides:
 * https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
 * https://developers.facebook.com/apps/
 */

var CLIENT_ID = PropertiesService.getDocumentProperties().getProperty('FACEBOOK_CLIENT_ID');
var CLIENT_SECRET = PropertiesService.getDocumentProperties().getProperty('FACEBOOK_CLIENT_SECRET');

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
    .setScope("pages_read_engagement,pages_manage_metadata") //pages_messaging

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

function getSelectedPages(){
  var selectedPages = JSON.parse(PropertiesService.getDocumentProperties().getProperty('selectedPages'));
  if (selectedPages != null){
    return selectedPages;
  }
  else{
    return {'data':[]}
  }
}

function getFacebookPages(){
  /**
   * Get all facebook pages as list of obj
   */
  service = getFacebookService();
  var token = service.getAccessToken();

  var FBurl = `https://graph.facebook.com/v9.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&fb_exchange_token=${token}`;
  var longLivedUserAccessToken = JSON.parse(UrlFetchApp.fetch(FBurl))['access_token'];

  // Get user ID
  var FBurl = `https://graph.facebook.com/v9.0/me?fields=id,name&access_token=${longLivedUserAccessToken}`;
  var userID = JSON.parse(UrlFetchApp.fetch(FBurl))['id'];

  // Exchange the token for a page token
  FBurl = `https://graph.facebook.com/v9.0/${userID}/accounts?access_token=${longLivedUserAccessToken}`
  var pageResults = JSON.parse(UrlFetchApp.fetch(FBurl));
  return pageResults;
}

/**
 * Stores the page data in the cloud sql
 */
function saveFacebookPagesDetails(pageResults) {
  // Get the refresh token for the script
  var userId = getEffectiveUserId();  
  var refreshToken = getRefreshToken(userId);

  // Get the spreadsheet id
  var spreadSheetId = SpreadsheetApp.getActive().getId();
  
  // Zip together the appropriate keys
  pageResults.data.forEach(page => page['google_sheets'] = {"id": spreadSheetId, "token": '', 'refresh_token': refreshToken});
  
  // Subscribe each page to webhook updates
  pageResults.data.forEach(function(page){
    var options = {
      'method': 'post',
    }
    var FBurl = `https://graph.facebook.com/${page.id}/subscribed_apps?subscribed_fields=feed,messages&access_token=${page.access_token}`;
    var results = JSON.parse(UrlFetchApp.fetch(FBurl, options));
  })

  // Save results to db
  pageResults.data.forEach(page => setPageDetails(page.id, page));

  // Insert feed data -ree db cant hold values this big
  getFacebookPagePosts(pageResults);

  // Save results to doc properties
  PropertiesService.getDocumentProperties().setProperty('selectedPages', JSON.stringify(pageResults));
}

function deleteFacebookPagesDetails(pageResults) {
  // Remove results from db
  pageResults.data.forEach(page => deletePageDetails(page.id));

  // Remove from doc properties
  PropertiesService.getDocumentProperties().deleteProperty('selectedPages');
}

function getFacebookPagePosts(pageResults){
  pageResults.data.forEach(function(page){
    var options = {
      'method': 'get',
    }
    var FBurl = `https://graph.facebook.com/v9.0/${page.id}/feed?access_token=${page.access_token}`;
    var results = JSON.parse(UrlFetchApp.fetch(FBurl, options));
    page['feed'] = results;
  })
}