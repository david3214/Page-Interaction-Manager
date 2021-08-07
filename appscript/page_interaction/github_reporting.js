function showFeedback() {
  var html = HtmlService.createTemplateFromFile('page_interaction/feedback_models/feedback')
  html = html.evaluate()
    .setWidth(600)
    .setHeight(600)
  SpreadsheetApp.getUi()
    .showModalDialog(html)
}

function createGitHubIssue({title, body, labels}) {
  var authToken = PropertiesService.getScriptProperties().getProperty("Github Auth")

  const postData = {
    title,
    body,
    labels
  }

  const params = {
    'method': 'post',
    headers: {
      'Authorization': `token ${authToken}`
    },
    'contentType': 'application/json',
    'payload': JSON.stringify(postData)
  }

  const githubUrl = 'https://api.github.com/repos/walkwithchrist/missionary-tools/issues'
  
  return UrlFetchApp.fetch(githubUrl, params)
}