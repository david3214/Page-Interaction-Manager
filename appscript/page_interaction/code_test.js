var mode = "PRODUCTION";

QUnit.helpers( this );
function testFunctions() {
   testFacebookWebhookUpdate();
   testSheetFunctions();
}

function doGet( e ) {
     QUnit.urlParams( e.parameter );
     QUnit.config({
          title: "QUnit for Google Apps Script - Test suite" // Sets the title of the test page.
     });
     QUnit.load( testFunctions );
 
     return QUnit.getHtml();
};


function testFacebookWebhookUpdate(){
    var web_app_url1 = `${ScriptApp.getService().getUrl()}?access_token=${ScriptApp.getOAuthToken()}`;
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
function test_sheet_creation(){
    mode = "TEST";
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    setUpSheet(spreadSheet);
}

function testSheetFunctions(){
    QUnit.test("Test sheet", function(assert){
        function test_doLogicPageMessages(){
            /* Test the sheet is working */
            setPreference(test_data.sample_page_details_property.google_sheets.id, test_data.sample_sheet_settings);
            var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
            var sheet = spreadSheet.getSheetByName("Ad Likes");
            sheet.appendRow(["1",	"tom",	"male",	"a",	"2",	"a",	"Assignment",	"a",	"a",	"👍",	"3",	"3",	"3"]);
            var e = JSON.parse('{ "authMode": "FULL", "changeType": "INSERT_ROW", "source": {}, "triggerUid": "502test6549", "user": { "email": "test.test@test.org", "nickname": "test.test" }}');
            doLogicPageMessages(e, spreadSheet);
        }
        assert.ok(test_doLogicPageMessages, "Should see a new line get inserted");

        function test_sheet_creation(){
            mode = "TEST";
            var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
            setUpSheet(spreadSheet);
        }
        assert.ok(test_sheet_creation, "Should re create the sheet");

    });
    const _ = LodashGS.load();
    QUnit.test("Test database preferences", function(assert){
        assert.ok(setPreference(test_data.sample_page_details_property.google_sheets.id, test_data.sample_sheet_settings), "Can set preferences");
        assert.equal(true, _.isEqual(getPreference(test_data.sample_page_details_property.google_sheets.id), test_data.sample_sheet_settings), 'Can get the same preferences that were set');
        // assert.ok(deletePreference(test_data.sample_page_details_property.google_sheets.id), "Can delete preferences");
    });
    QUnit.test("Test database page details", function(assert){
        assert.ok(setPageDetails(test_data.sample_page_details_property.id, test_data.sample_page_details_property), "Can set page details");
        assert.equal(true, _.isEqual(getPageDetails(test_data.sample_page_details_property.id), test_data.sample_page_details_property), "Can get page details");
        // assert.ok(deletePageDetails(test_data.sample_page_details_property.id), "Can delete page details");
        assert.ok(getAllPageDetails(), "Can list all page details");
    });
}

function test_updateNewRow(){
    mode = "TEST";
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));

    updateNewRow(spreadSheet);
}

function test_analyzeSheet(){
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));
    var results = analyzeSheet(spreadSheet);
    Logger.log(results)
}