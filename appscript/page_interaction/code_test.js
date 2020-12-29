var mode = "PRODUCTION";

QUnit.helpers( this );
function testFunctions() {
   testingFacebookWebhookUpdate();
}

function doGet( e ) {
     QUnit.urlParams( e.parameter );
     QUnit.config({
          title: "QUnit for Google Apps Script - Test suite" // Sets the title of the test page.
     });
     QUnit.load( testFunctions );
 
     return QUnit.getHtml();
};

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
    QUnit.test("Test sheet", function(assert){
        /*
        .addItem('Create sheet', 'setUpSheet')
        .addItem('Remove sheet', 'tearDownSheet')
        .addItem('activateTriggers', 'activateTriggers')
        .addItem('deactivateTrigger', 'deactivateTrigger')
        .addItem('updateSheet', 'updateSheet')
        .addItem('showFacebookSidebar', 'showFacebookSidebar')
        .addItem('updateNewRow', 'updateNewRow')
        .addItem('updateConditionalFormattingRules', 'updateConditionalFormattingRules')
        .addItem('updateDataValidationRules', 'updateDataValidationRules')
        .addItem('highlightSheet', 'highlightSheet')
        .addItem('hideRows', 'hideRows')
        .addItem('resetFacebookAuth', 'resetAuth')
        */
        function test_doLogicPageMessages(){
            /* Test the sheet is working */
            var sheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas").getSheetByName("Ad Likes");
            sheet.appendRow(["1",	"tom",	"male",	"a",	"2",	"a",	"Assignment",	"a",	"a",	"👍",	"3",	"3",	"3"]);
            var e = JSON.parse('{ "authMode": "FULL", "changeType": "INSERT_ROW", "source": {}, "triggerUid": "502test6549", "user": { "email": "test.test@test.org", "nickname": "test.test" }}');
            doLogicPageMessages(e, sheet);
        }
        assert.ok(test_doLogicPageMessages, "Should see a new line get inserted");
    });
    const _ = LodashGS.load();
    QUnit.test("Test database preferences", function(assert){
        assert.ok(setPreference(test_data.sample_page_details_property.google_sheets.id, test_data.sample_sheet_settings), "Can set preferences");
        assert.equal(true, _.isEqual(getPreference(test_data.sample_page_details_property.google_sheets.id), test_data.sample_sheet_settings), 'Can get the same preferences that were set');
        assert.ok(deletePreference(test_data.sample_page_details_property.google_sheets.id), "Can delete preferences");
    });
    QUnit.test("Test database page details", function(assert){
        assert.ok(setPageDetails(test_data.sample_page_details_property.id, test_data.sample_page_details_property), "Can set page details");
        assert.equal(true, _.isEqual(getPageDetails(test_data.sample_page_details_property.id), test_data.sample_page_details_property), "Can get page details");
        assert.ok(deletePageDetails(test_data.sample_page_details_property.id), "Can delete page details");
        assert.ok(getAllPageDetails(), "Can list all page details");
    });
}

function test_db_pref(){
    setPreference(test_data.sample_page_details_property.google_sheets.id, test_data.sample_sheet_settings);
    getPreference(test_data.sample_page_details_property.google_sheets.id);
    deletePreference(test_data.sample_page_details_property.google_sheets.id);
}

function test_db_page_details(){
  setPageDetails(test_data.sample_page_details_property.id, test_data.sample_page_details_property);
  getPageDetails(test_data.sample_page_details_property.id);
  deletePageDetails(test_data.sample_page_details_property.id);
  getAllPageDetails();
}

function test_sheet_creation(){
    mode = "TEST";
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    setUpSheet(spreadSheet);
}

function test_get(){
    getPreference(test_data.sample_page_details_property.google_sheets.id);
}
function test_doLogicPageMessages(){
    /* Test the sheet is working */
    setPreference(test_data.sample_page_details_property.google_sheets.id, test_data.sample_sheet_settings);
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    var sheet = spreadSheet.getSheetByName("Ad Likes");
    sheet.appendRow(["1",	"tom",	"male",	"a",	"2",	"a",	"Assignment",	"a",	"a",	"👍",	"3",	"3",	"3"]);
    var e = JSON.parse('{ "authMode": "FULL", "changeType": "INSERT_ROW", "source": {}, "triggerUid": "502test6549", "user": { "email": "test.test@test.org", "nickname": "test.test" }}');
    doLogicPageMessages(e, spreadSheet);
}