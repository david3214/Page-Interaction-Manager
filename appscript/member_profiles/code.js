// Server code

// Reset the bot on the server, remove all data from the list of bots
function showPopup() {
    var html = HtmlService.createTemplateFromFile('member_profiles/sideBar').evaluate()
        .setTitle('Find Member Profiles')
        .setWidth(600)
        .setHeight(600);
    SpreadsheetApp.getUi() 
        .showModalDialog(html, 'Find Member Profiles');
}


function get(url) {
    var response = UrlFetchApp.fetch(url);
    return response.getContentText();
}


function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename)
        .getContent();
}


function reset() {
    var url = encodeURI(baseURL + `bot?church_username=${get_church_username()}`);
    var options = {
        'method': 'delete',
    };
    var userProperties = PropertiesService.getUserProperties();
    userProperties.deleteProperty('church_username');
    UrlFetchApp.fetch(url, options);
}


function next(data = { 'index': 0, 'link': "test link", 'name': 'Test name' }) {
    var sheet = SpreadsheetApp.getActiveSheet();
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, 2).setValues([[data['name'], data['link']]]);
}


function set_church_username(name) {
    if (name !== "") {
        var userProperties = PropertiesService.getUserProperties();
        userProperties.setProperty('church_username', name);
    }
}


function get_church_username() {
    var userProperties = PropertiesService.getUserProperties();
    var church_username = userProperties.getProperty('church_username');
    if (church_username == null) { return undefined; }
    return church_username;
}


function processLoginForm(form) {
    var requestOptions = {
        'method': 'POST',
        'payload': form,
    };
    var url = encodeURI(baseURL + 'bot');
    var response = UrlFetchApp.fetch(url, requestOptions);
    return response.getContentText();
}


function processKeyForm(form) {
    var requestOptions = {
        'method': 'POST',
        'payload': form,
    };
    var url = encodeURI(baseURL + 'add-key');
    var response = UrlFetchApp.fetch(url, requestOptions);
    return response.getContentText();
}