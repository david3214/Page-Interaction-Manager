var connectionName = 'eighth-vehicle-287322:us-central1:database';
var user = 'app_script';
var userPwd = '***REMOVED***';
var db = 'page_interaction_manager';
var root = 'root';
var rootPwd = 'B53sAez4lvjgiusO';
var instanceUrl = 'jdbc:google:mysql://' + connectionName;
var dbUrl = instanceUrl + '/' + db;

/**
 * Create a new database within a Cloud SQL instance.
 */
function createDatabase() {
  var conn = Jdbc.getCloudSqlConnection(instanceUrl, root, rootPwd);
  conn.createStatement().execute('CREATE DATABASE ' + db);
}

/**
 * Create a new user for your database with full privileges.
 */
function createUser() {
  var conn = Jdbc.getCloudSqlConnection(dbUrl, root, rootPwd);

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
  var conn = Jdbc.getCloudSqlConnection(dbUrl, user, userPwd);
  conn.createStatement().execute('CREATE TABLE preferences '
  + '(sheet_id VARCHAR(100) NOT NULL, preference VARCHAR(2000) NOT NULL, '
  + 'PRIMARY KEY (sheet_id));');
  conn.createStatement().execute('CREATE TABLE page_data ('
  +	'page_id VARCHAR(50) NOT NULL,'
  +	'page_details VARCHAR(1500) NOT NULL,'
  +	'PRIMARY KEY (page_id));');
}

/**
 * Write preferences for a sheet_id
 */
function setPreference(sheet_id, preference) {
    var conn = Jdbc.getCloudSqlConnection(dbUrl, user, userPwd);
  
    var stmt = conn.prepareStatement('INSERT INTO preferences '
        + '(sheet_id, preference) values (?, ?)');
    stmt.setString(1, sheet_id);
    stmt.setString(2, JSON.stringify(preference));
    stmt.execute();
  }

/**
 * Get preferences for a sheet_id
 */
function getPreference(sheet_id) {
    var conn = Jdbc.getCloudSqlConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('SELECT sheet_id '
        + 'FROM preferences WHERE preference = (?)');
    stmt.setString(1, sheet_id);
    results = stmt.execute();
    var preference = JSON.loads(results.getString());
    results.close();
    stmt.close();
    conn.close();
    return preference;
}

/**
 * Delete preferences for a sheet_id
 */
function deletePreference(sheet_id) {
    var conn = Jdbc.getCloudSqlConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('DELETE '
    + 'FROM preferences WHERE sheet_id = (?)');
    stmt.setString(1, sheet_id);
    results = stmt.execute();
    results.close();
    stmt.close();
    conn.close();
}

/**
 * Write page_data for a page_id
 */
function setPageDetail(page_id, page_detail) {
    var conn = Jdbc.getCloudSqlConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('INSERT INTO page_data '
        + '(page_id, page_detail) values (?, ?)');
    stmt.setString(1, page_id);
    stmt.setString(2, JSON.stringify(page_detail));
    stmt.execute();
    stmt.close();
    conn.close();
  }

/**
 * Get page_details for a page_id
 */
function getPageDetail(page_id) {
    var conn = Jdbc.getCloudSqlConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('SELECT page_detail '
        + 'FROM page_data WHERE page_id = (?)');
    stmt.setString(1, page_id);
    results = stmt.execute();
    var page_detail = JSON.loads(results.getString());
    results.close();
    stmt.close();
    conn.close();
    return page_detail;
}

/**
 * Get all page_details for a page_id
 */
function getAllPageDetail(page_id) {
    var conn = Jdbc.getCloudSqlConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('SELECT * '
        + 'FROM page_data');
    stmt.setString(1, page_id);
    results = stmt.execute();
    var page_detail = JSON.loads(results.getString());
    results.close();
    stmt.close();
    conn.close();
    return page_detail;
}


/**
 * Delete page_details for a page_id
 */
function deletePageDetail(page_id) {
    var conn = Jdbc.getCloudSqlConnection(dbUrl, user, userPwd);
    var stmt = conn.prepareStatement('DELETE '
        + 'FROM page_data WHERE page_id = (?)');
    stmt.setString(1, page_id);
    results = stmt.execute();
    var page_detail = JSON.loads(results.getString());
    results.close();
    stmt.close();
    conn.close();
    return page_detail;
}