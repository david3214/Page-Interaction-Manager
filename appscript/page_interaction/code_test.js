QUnit.helpers( this );
function testFunctions() {
   testingFacebookWebhookUpdate();
}
/*
function doGet( e ) {
     QUnit.urlParams( e.parameter );
     QUnit.config({
          title: "QUnit for Google Apps Script - Test suite" // Sets the title of the test page.
     });
     QUnit.load( testFunctions );
 
     return QUnit.getHtml();
};
*/
function testingFacebookWebhookUpdate(){
    QUnit.test("facebook post testing", function(assert) {
        test_data.sample_page_notifications_accept.forEach(function(data){
            var options = {
                'method' : 'post',
                'contentType': 'application/json',
                'payload' : JSON.stringify(data)
            };
            var results = UrlFetchApp.fetch(ScriptApp.getService().getUrl(), options).getContentText();
            assert.ok(results, `Should say Processed: ${JSON.parse(results).status}`)
        })
        
        test_data.sample_page_notifications_reject.forEach(function(data){
            var options = {
                'method' : 'post',
                'contentType': 'application/json',
                'payload' : JSON.stringify(data)
            };
            var results = UrlFetchApp.fetch(ScriptApp.getService().getUrl(), options).getContentText();
            assert.ok(results, `Should say Unprocessed: ${JSON.parse(results).status}`)
        })

        test_data.sample_page_notifications_error.forEach(function(data){
            var options = {
                'method' : 'post',
                'contentType': 'application/json',
                'payload' : JSON.stringify(data)
            };
            var results = UrlFetchApp.fetch(ScriptApp.getService().getUrl(), options).getContentText();
            assert.ok(results, `Should say Error: ${JSON.parse(results).status}`)
        })
   });
}