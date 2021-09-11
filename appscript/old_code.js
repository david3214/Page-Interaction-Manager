function testFacebookWebhookUpdate(){
  var web_app_url = "https://script.google.com/macros/s/AKfycbyntJvxGIZalY9QGLCv89H_OBSFdSJARHyhpWxJo4II_SpgSIxW/dev?access_token=ya29.a0AfH6SMCMEiS8qfomf-WIWEtedCHW1m5VuY1_XpRXKNcHENHaWbPOy1DmZ1OQH0qTt8PufVElKJub3ZLvarl12bd-lZLwqatpJU3zDSgIE7yOWCY-7r6vkUArOBbbweydx1hZH9B0Pw5Y1PzyYVMVyr4sZPAVDe5uyPWE0VOJHs7cr4eAh6JYzJ_FORA5qkc";
  QUnit.test("Facebook post interaction testing", function(assert) {
      test_data.sample_page_notifications_accept.forEach(function(data){
          var options = {
              'method' : 'post',
              'contentType': 'application/json',
              'payload' : JSON.stringify(data)
          };
          var results = UrlFetchApp.fetch(web_app_url, options).getContentText();
          assert.ok(results, `Should say Processed: ${JSON.parse(results).status}`)
      })
      
      test_data.sample_page_notifications_reject.forEach(function(data){
          var options = {
              'method' : 'post',
              'contentType': 'application/json',
              'payload' : JSON.stringify(data)
          };
          var results = UrlFetchApp.fetch(web_app_url, options).getContentText();
          assert.ok(results, `Should say Unprocessed: ${JSON.parse(results).status}`)
      })

      test_data.sample_page_notifications_error.forEach(function(data){
          var options = {
              'method' : 'post',
              'contentType': 'application/json',
              'payload' : JSON.stringify(data)
          };
          var results = UrlFetchApp.fetch(web_app_url, options).getContentText();
          assert.ok(results, `Should say Error: ${JSON.parse(results).status}`)
      })
  });
  
 QUnit.test("Facebook messenger test", function(assert){
  test_data.sample_page_message_accept.forEach(function(data){
      var options = {
          'method' : 'post',
          'contentType': 'application/json',
          'payload' : JSON.stringify(data)
      };
      var results = UrlFetchApp.fetch(web_app_url, options).getContentText();
      assert.equal("Processed", JSON.parse(results).status, `Should say Processed: ${JSON.parse(results).status}`)
  })
 });
  
}

function doPost(request) {
  // Load the stored data for the page

  try {
    var event = mode == "TEST" ? test_data.sample_page_notifications_accept.shift() : JSON.parse(request.postData.getDataAsString())
    if (event.entry[0].messaging) { var event_type = 'message' } else if (event.entry[0].changes[0].value.item) { var event_type = 'reaction' }
    var event_type = mode == "TEST" ? "reaction" : event_type
    var eventNameMap = { 'reaction': 'Ad Likes', 'message': 'Page Messages' }
    var reactionsMap = internalVariables.reactionsMap
    var page_id = undefined
    var page_details = undefined
    if (event_type == "reaction") {
      // Classify the incoming event
      // Reject stuff we aren't interested in
      if (event.entry[0].changes[0].value.item == 'video'
        || event.entry[0].changes[0].value.item == 'comment'
        || event.entry[0].changes[0].value.verb != 'add') {
        return ContentService.createTextOutput(JSON.stringify({ "status": "Unprocessed" }))
      }
      page_id = event.entry[0].id

    } else if (event_type == "message") {
      page_id = event.entry[0].messaging[0].recipient.id

    }

    var page_details = getPageDetails(page_id)
    if (!page_details) { throw { name: "ValueError", message: `Searched for ${page_id} but no result was found` } }

    // Process reactions
    if (event_type == "reaction") {
      var messageOrReaction = reactionsMap[event.entry[0].changes[0].value.reaction_type.toUpperCase()]
      var name = event.entry[0].changes[0].value.from.name
      var psid = event.entry[0].changes[0].value.from.id
      var facebookClue = `https://facebook.com/${encodeURIComponent(event.entry[0].changes[0].value.post_id)}`
    }
    else if (event_type == "message") {
      var messageOrReaction = event.entry[0].messaging[0].message.text
      // Get name from fb
      var url = `https://graph.facebook.com/${event.entry[0].messaging[0].sender.id}?fields=first_name,last_name&access_token=${page_details.access_token}`
      var results = JSON.parse(UrlFetchApp.fetch(url).getContentText())
      var name = results['first_name'] + " " + results['last_name']
      var psid = event.entry[0].messaging[0].sender.id
      var facebookClue = `https://www.facebook.com/search/people?q=${encodeURIComponent(name)}`
    }

    // Process current time
    var today = new Date()
    today = today.toLocaleDateString("en-US")

    // Send the results to the sheet as the user
    var spreadsheetId = page_details.google_sheets.id
    var sheetName = eventNameMap[event_type]
    var values = { "values": [[today, name, "", "", psid, facebookClue, "", "", "", "", messageOrReaction, "", ""]] }
    var options = {
      "headers": {
        'Authorization': 'Bearer ' + page_details.google_sheets.token,
        "Content-type": "application/json",
      },
      "method": "POST",
      "payload": JSON.stringify(values),
      'muteHttpExceptions': true
    }
    var url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) + "/values/" + encodeURIComponent(sheetName) + ":append?insertDataOption=INSERT_ROWS&valueInputOption=USER_ENTERED"
    var results = UrlFetchApp.fetch(url, options)

    if (results.getResponseCode() !== 200) {
      var clientId = PropertiesService.getScriptProperties().getProperty("MT_CLIENT_ID")
      var clientSecret = PropertiesService.getScriptProperties().getProperty("MT_CLIENT_SECRET")
      var refreshToken = page_details.google_sheets.refresh_token
      var accessToken = refreshAccessToken(clientId, clientSecret, refreshToken)
      page_details.google_sheets.token = accessToken
      options.headers.Authorization = 'Bearer ' + page_details.google_sheets.token
      setPageDetails(page_details.id, page_details)
      var results = UrlFetchApp.fetch(url, options)
      if (results.getResponseCode() !== 200) { throw { name: "TokenError", message: `Tried to update access token but failed for ${JSON.stringify(page_details)}` } };
    }

    return ContentService.createTextOutput(JSON.stringify({ "status": "Processed" }))
  } catch (error) {
    Logger.log(`error in doPost ${JSON.stringify(error.message)}, ${JSON.stringify(request)}`)
    return ContentService.createTextOutput(JSON.stringify({ "status": "Error" }))
  }
}