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

function testSheetFunctions(){
    QUnit.test("Test sheet", function(assert){
        assert.ok(test_doLogicPageMessages, "Should see a new line get inserted");
        assert.ok(test_sheet_creation, "Should re create the sheet");
        assert.ok(test_updateNewRow, "Should be ok");
        assert.ok(test_analyzeSheet, "Should be ok");
        assert.ok(test_getScraperInput, "Should be ok");
        assert.ok(test_updateProfiles, "Should be ok");
        assert.ok(test_getRefreshToken, "Should be ok");
        assert.ok(test_updateExistingRows, "Should be ok");
        assert.ok(test_mergeData, "Should be ok");
        assert.ok(test_sortData, "Should be ok");
        assert.ok(test_sortSheet, "Should be ok");
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
function test_doLogicPageMessages(){
    /* Test the sheet is working */
    setPreference(test_data.sample_page_details_property.google_sheets.id, test_data.sample_sheet_settings);
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    var sheet = spreadSheet.getSheetByName("Ad Likes");
    sheet.appendRow(["1",	"tom",	"male",	"a",	"2",	"a",	"Assignment",	"a",	"a",	"👍",	"3",	"3",	"3"]);
    var e = JSON.parse('{ "authMode": "FULL", "changeType": "INSERT_ROW", "source": {}, "triggerUid": "502test6549", "user": { "email": "test.test@test.org", "nickname": "test.test" }}');
    doLogicPageMessages(e, spreadSheet);
}

function test_sheet_creation(){
    mode = "TEST";
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    setUpSheet(spreadSheet);
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

function test_getScraperInput(){
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));
    var results = getScraperInput(spreadSheet);
    Logger.log(results)
}

function test_updateProfiles(){
    var test_data = {"Echo Booth": "https://www.facebook.com/echo.booth.5", "Bird Torres": "https://www.facebook.com/covidtbird", "Amy Allen Anderson": "https://www.facebook.com/amy.a.anderson.9", "Sandy Sage Carr": "https://www.facebook.com/sandy.s.carr.9", "Robin Newton": "https://www.facebook.com/robin.newton.3152", "Brian Pulliam": "https://www.facebook.com/brian.pulliam.965", "Morgan Julie": "https://www.facebook.com/morgan.julie.92754", "Melodie Ann": "https://www.facebook.com/melodieannie628", "Mele Mounga Lose Kauvaka": "https://www.facebook.com/moungakauvaka", "Joann Donley": "https://www.facebook.com/joann.donley.1"}
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));
    var results = updateProfiles(test_data, spreadSheet);
    Logger.log(results)
}

function test_getRefreshToken(){
    var userId = "112522451767020538355";
    var refresh_token = getRefreshToken(userId);
    Logger.log(refresh_token)
}

function test_updateExistingRows(){
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));
    var sheet = spreadSheet.getActiveSheet();
    var e = {
        value: "Tokyo",
        range: sheet.getRange("G2"),
    }
    var results = updateExistingRows(e, spreadSheet);
    Logger.log(results)
}

function test_mergeData(){
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));
    var values = [["Date","Name","Gender","Profile Link","PSID","Source","Assignment","Status","@Sac","On Date","Reaction","Notes","Counter"],
    ["2021-01-13T06:00:00.000Z","Jeremy Bird","male","",3568458856574110,"https://facebook.com/105691394435112_213783213625929","Ward 1","missionary",false,false,"👍","",1],
    ["2021-01-13T06:00:00.000Z","Jeremy Bird","male","",3568458856574110,"https://facebook.com/105691394435112_216371783367072","Ward 1","missionary",false,false,"👍","",1],
    ["2021-01-13T06:00:00.000Z","Jeremy Bird","male","",3568458856574110,"https://facebook.com/105691394435112_189586012712316","Ward 1","missionary",false,false,"👍","",1],
    ["2021-01-12T06:00:00.000Z","Jake Steimle","","","4514114971962822","https://facebook.com/105691394435112_216425196695064","Ward 4","Member",false,false,"👍","",1],
    ["2021-01-11T06:00:00.000Z","Kime Kinikini","male","","4081260035237352","https://facebook.com/105691394435112_216425196695064","Ward 1","Member",false,false,"❤️","",1],
    ["2021-01-11T06:00:00.000Z","Rich Bludorn","","","3884149271650207","https://facebook.com/105691394435112_216371783367072","Ward 1","Member",false,false,"👍","",1],
    ["2021-01-11T06:00:00.000Z","Rylee Rampton","","","4519182614818927","https://facebook.com/105691394435112_216425196695064","Ward 1","Member",false,false,"👍","",1],
    ["2021-01-10T06:00:00.000Z","Philip Henley","","","3855437887855173","https://facebook.com/105691394435112_211399640530953","Ward 1","Member",false,false,"👍","",1],
    ["2021-01-10T06:00:00.000Z","Rich Bludorn","male","","3884149271650207","https://facebook.com/105691394435112_217704479900469","Ward 1","Member",false,false,"👍","",1],
    ["2021-01-10T06:00:00.000Z","Lori Jacobson","female","","3456223204487022","https://facebook.com/105691394435112_216425196695064","Ward 1","Member",false,false,"👍","",1]];
    var results = mergeData(values, spreadSheet);
    Logger.log(results)
}

function test_sortData(){
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));
    var range = spreadSheet.getActiveSheet().getDataRange()
    var values = range.getValues();
    var results = sortData(values, spreadSheet);
    range.setValues(results);
    Logger.log(results)

}

function test_sortSheet(){
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));
    sortSheet(spreadSheet);
}

function test_healSheet(){
    var spreadSheet = SpreadsheetApp.openById("1bKbHJAUn6E41E6H-_ZdmsFViXctchO_w6SzrIaAMmas");
    spreadSheet.setActiveSheet(spreadSheet.getSheetByName("Ad Likes"));
    healSheet(spreadSheet);
}