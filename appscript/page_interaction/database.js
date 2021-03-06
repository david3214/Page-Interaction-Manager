var user = 'app_script';
var userPwd = '***REMOVED***';
var db = 'page_interaction_manager';
var root = 'root';
var rootPwd = '***REMOVED***';
var instanceUrl = "jdbc:mysql://34.68.83.123";
var dbUrl = instanceUrl + '/' + db;

/**
 * Create a new database within a Cloud SQL instance.
 */
function createDatabase() {
    var conn = Jdbc.getConnection(instanceUrl, root, rootPwd);
    var stmt = conn.prepareStatement(`CREATE DATABASE ${db} DEFAULT CHARSET=utf8mb4 DEFAULT COLLATE=utf8mb4_unicode_ci`);
    stmt.execute();
}

/**
 * Create a new user for your database with full privileges.
 */
function createUser() {
  var conn = Jdbc.getConnection(dbUrl, root, rootPwd);
  var stmt = conn.prepareStatement('CREATE USER ? IDENTIFIED BY ?');
  stmt.setString(1, user);
  stmt.setString(2, userPwd);
  stmt.execute();
  conn.createStatement().execute('GRANT ALL ON `%`.* TO ' + user);
}

/**
 * Create a new table in the database.
 */
function createTable() {
  var conn = Jdbc.getConnection(dbUrl, user, userPwd);
  conn.createStatement().execute('CREATE TABLE preferences ('
  + 'sheet_id VARCHAR(100) NOT NULL, '
  + 'preference VARCHAR(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, '
  + 'PRIMARY KEY (sheet_id));');
  conn.createStatement().execute('CREATE TABLE page_data ('
  +	'page_id VARCHAR(50) NOT NULL,'
  +	'page_details VARCHAR(1500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, '
  +	'PRIMARY KEY (page_id));');
}

/**
 * Write preferences for a sheet_id
 */
function setPreference(sheet_id, preference) {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
  
    var stmt = conn.prepareStatement('REPLACE INTO preferences '
        + '(sheet_id, preference) values (?, ?)');
    stmt.setString(1, sheet_id);
    stmt.setString(2, JSON.stringify(preference));
    stmt.executeUpdate();
    stmt.close();
    conn.close();
    return true;
  }

/**
 * Get preferences for a sheet_id
 */
function getPreference(sheet_id) {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('SELECT preference '
        + 'FROM preferences WHERE sheet_id = ?');
    stmt.setString(1, sheet_id);
    results = stmt.executeQuery();
    while (results.next()) {
        var preference = JSON.parse(results.getString(1));
        break;
    }
    stmt.close();
    conn.close();
    return preference;
}

/**
 * Get all page_details for a page_id
 */
function getAllPreference() {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('SELECT * '
        + 'FROM preferences');
    results = stmt.executeQuery();
    var preference = {};
    while (results.next()) {
      preference[results.getString(1)] = JSON.parse(results.getString(2));
    }
    results.close();
    stmt.close();
    conn.close();
    return preference;
}

/**
 * Delete preferences for a sheet_id
 */
function deletePreference(sheet_id) {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('DELETE '
    + 'FROM preferences WHERE sheet_id = ?');
    stmt.setString(1, sheet_id);
    results = stmt.executeUpdate();
    stmt.close();
    conn.close();
    return true;
}

/**
 * Write page_data for a page_id
 */
function setPageDetails(page_id, page_details) {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('REPLACE INTO page_data '
        + '(page_id, page_details) values (?, ?)');
    stmt.setString(1, page_id);
    stmt.setString(2, JSON.stringify(page_details));
    stmt.executeUpdate();
    stmt.close();
    conn.close();
    return true;
  }

/**
 * Get page_details for a page_id
 */
function getPageDetails(page_id) {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('SELECT page_details '
        + 'FROM page_data WHERE page_id = ?');
    stmt.setString(1, page_id);
    results = stmt.executeQuery();
    while (results.next()) {
        var page_details = JSON.parse(results.getString(1));
        break;
    }
    results.close();
    stmt.close();
    conn.close();
    return page_details;
}

/**
 * Get all page_details for a page_id
 */
function getAllPageDetails() {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('SELECT * '
        + 'FROM page_data');
    results = stmt.executeQuery();
    var pageDetails = {};
    while (results.next()) {
      pageDetails[JSON.parse(results.getString(1))] = JSON.parse(results.getString(2));
    }
    results.close();
    stmt.close();
    conn.close();
    return pageDetails;
}


/**
 * Delete page_details for a page_id
 */
function deletePageDetails(page_id) {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('DELETE '
        + 'FROM page_data WHERE page_id = (?)');
    stmt.setString(1, page_id);
    results = stmt.executeUpdate();
    stmt.close();
    conn.close();
    return true;
}

/**
 * Get the refresh token for an open id sub
*/
function getRefreshToken(userId){
    return getUser(userId)['refresh_token'];
}

function getUser(userId){
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('SELECT id_token '
        + 'FROM users WHERE user_id = ?');
    stmt.setString(1, userId);
    results = stmt.executeQuery();
    while (results.next()) {
        var id_token = JSON.parse(results.getString(1));
        break;
    }
    results.close();
    stmt.close();
    conn.close();
    return id_token;
}

function setUser(user_id, id_token){
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('REPLACE INTO users '
        + '(user_id, id_token) values (?, ?)');
    stmt.setString(1, user_id);
    stmt.setString(2, JSON.stringify(id_token));
    stmt.executeUpdate();
    stmt.close();
    conn.close();
    return true;
}

/**
 * Add users to db
 */
function addUserToDB(){
    var userIdentityToken = getIdentityToken();
    var userId = getEffectiveUserId();
    var user = getUser(userId);
    user = user == undefined ? {} : user;
    user['name'] = userIdentityToken['name'];
    user['email'] = userIdentityToken['email'];
    setUser(userId, user);
}


/**
 * update all rows of db
*/
function updateDB(){
    var preferenceDict = getAllPreference();
    var cache = CacheService.getScriptCache();
    Object.keys(preferenceDict).forEach(key => {
        preferenceDict[key]["statusToMerge"] = ["Member", "Missionary", "Do Not Contact", "Rejected"];
        setPreference(key, preferenceDict[key]);
        cache.put(`programSettings:${key}`, JSON.stringify(preferenceDict[key]), 6000);
    })
}

function findMissingRefreshTokens(){
    var pageDataList = getAllPageDetails();
    var missingList = [];
    var all = [];
    Object.values(pageDataList).forEach(function(val){
        if (!val.google_sheets.refresh_token){
            missingList.push(val.name);
        }
        all.push(val.name);
    })
    console.log(`Missing ${_.toString(missingList)}`);
    console.log(`All ${_.toString(all)}`)
}

function checkForFaultySettings(){
    var pageSettingsList = getAllPreference();
    var badList = {};
    Object.values(pageSettingsList).forEach(function(val, idx){
        if(!val.statusList){
            Logger.log(`${Object.keys(pageSettingsList)[idx]} is missing statusList`);
            badList[Object.keys(pageSettingsList)[idx]] = val;
            val.statusList = defaultUserSettings.statusList;
        }
        if(!val.hiddenStatuses){
            Logger.log(`${Object.keys(pageSettingsList)[idx]} is missing hiddenStatuses`);
            badList[Object.keys(pageSettingsList)[idx]] = val;
            val.hiddenStatuses = defaultUserSettings.hiddenStatuses
        }
        if(!val.statusToMerge){
            Logger.log(`${Object.keys(pageSettingsList)[idx]} is missing statusToMerge`);
            badList[Object.keys(pageSettingsList)[idx]] = val;
            val.statusToMerge = defaultUserSettings.statusToMerge
        }
        if(!val.assignmentMap){
            Logger.log(`${Object.keys(pageSettingsList)[idx]} is missing assignmentMap`);
            badList[Object.keys(pageSettingsList)[idx]] = val;
            val.assignmentMap = defaultUserSettings.assignmentMap
        }
        if(!val.sheetSettings){
            Logger.log(`${Object.keys(pageSettingsList)[idx]} is missing sheetSettings`);
            badList[Object.keys(pageSettingsList)[idx]] = val;
            val.sheetSettings = defaultUserSettings.sheetSettings
        }
        if (val.genderMap){delete val.genderMap;}
        if (val.reactionsMap){delete val.reactionsMap;}
        if (val.triggerNames){delete val.triggerNames;}
        if (val.headerRowNumber){delete val.headerRowNumber;}
        if (val.initialRowLength){delete val.initialRowLength;}
        if (val.adIDMap){delete val.adIDMap;}
        if (val.areaIDs){delete val.areaIDs;}
        
        setPreference(Object.keys(pageSettingsList)[idx], val)
    })
    console.log(`Missing ${JSON.stringify(badList)}`);
}

