//-------------Global Variables---------------------
// Firestore Auth
var email = 'gas-firestore@error-management.iam.gserviceaccount.com';
var key = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCjnTS9xXM98oR4\nnpp7U7A57cGLZMB1YZ8gC6wVO6bTuq9OgXzfvzF/v25orvvFuEI/gbitTP80pKiT\nWUJVFCGBCO7GUZhqs+piJtOjTCTT8UDkFfw2iRBfp9AYrze9KVkoIUXJthJvC0hk\nMki8EYi/I/q+nJYSNMrFuIq3XB59D7SFuda4YdelwCmKjomxbP3tXKtMB9rgcTXq\nuHaTefYXrZIpktRXcTFi8HocJcMLyOmXAP9BGqMo+FAFD06VD8USYREA8y/hqszI\n58oLaloAHB6Ppuw1cRMTaoZ14bVDCo4ZoUYAul/ZU0sDLBezbZ5TA+4Yi0vS18uu\natL7Frj1AgMBAAECggEACEHZVRB/eetg4yOCAWJeXPYSVAIgMmxcVwYvx5yMlVfx\nHAGt9y7ThTJ4lIDsRPTBJypZUym1IYeD2HfjQJ709+mm/0xD6HKvDAgQm0eu/iFJ\nWJmBcpElSeaSuoQxSHMrRDq1pnHxaThFDYV6JT+vSpI6x97oNgADEcp3+bwE7+PD\n2+NxbWo9XJBULVHBZtAz3bNgCacrjUDp63YS8t1OqkEhKP8Y3cTMo8sCtoORhko0\nKYE4W1mAbs/or7XrZ4B+rf3ll7msnfrs8ap53TEhwWbTDUxdS8JXv73pMb/NQ0Zu\nOJZhY2w1+PjYwQjvowxofk97/8EfobBHS3FR7am5OwKBgQDQUcaRZoQJw7ZibjNS\nnDsVw+ea9Be4E/ZsnPi6znqaFa2HCH2KCeIZHXzZb7+BjJcohiptj9Ie1euIPPO4\nX+VCe8/wT5BMNNnnqV2u2QZy3VJDaYjSmW79Gd6JXBH4yaQIMBOMPx+HPsZTQ0sY\nST0D49V9LRUXwl+emveLdmKgmwKBgQDJD/mEBk+tPEWM7u2FwSFyDqiEK5JjjLRv\nkXlsNQ17iyFBLur2kRPXtnGdYc2K/7ziVOG5s+0CJvui7hpW5pMGSPe29Ix3HB0Z\n3TbIcYKYkow17e6H0TW1/g/12f7fLp4E4qg8p5dBT8H4G2O2d3XfdUJPE9re5nyq\no96ar5I9rwKBgGTaMjfSWbogdfvRPieQW0p+PXJXGeSURYjvtbs6m0BdnlTxV1Ws\n0zk1fWwHHb+qQMPtsDy6lA85oX2jhJqOUn+NUW4WFtXOAHCXHjO3/dc+LsVUIllS\nztjZ3VLCsDCx7ifInq4XITxot7s3qPNpAZEQjBq96KhIAeLXQ2DRP45hAoGATsDp\nFON79fjzrR4w/wEE3q4LJ6oBbujADCtJCi9FlqyKXAPKmMV+pjGaEvEqF1XQYD6r\nI5fsL7mhOtJUktFBqWaPUKQ9GLJ0W5sgSCbd5nEQZldJ5Pz3Ms/O5Jd8k2KpFnTJ\nPOjQAA8DhPEFf4UPMHW3gU3fnwtcrWH+YUx/1ZUCgYAwkWfQ4/KeT9GOYXly/ADB\n5Anjr6jE5WEBgtegoDrHA+6599yyG/eAnYhzzrN1fRe7R4Aq3/wGzrDfWNMcI3B3\nIrq1qBFJTOETI5AiC4EpKKLoXMJlBAG+lvyNdyGtAMwfMWCdk53z7BuS8IgonzQv\nbMlG4Oa9yfYjb71EedVNqQ==\n-----END PRIVATE KEY-----\n"
var projectId = 'error-management'
var fs = FirestoreApp.getFirestore(email, key, projectId);
var currDateTime = Utilities.formatDate(new Date(), "CST", "MMM.d.yyyy 'T' HH:mm:ss z")

var currUserEmail = 'null'
//------------End Global Variables---------------
var projectType = 'Google App Script'

var projectName = 'Connection Tracker'

var errorNotifEmail = '500366540@missionary.org'

//Error Class
class Error {
  constructor(type, message, insideFunction) {
    this.type = type;
    this.message = message;
    this.insideFunction = insideFunction;
  }
  init() {
    //send error to Firestore
    // sendNotifEmail(projectName, 'null')
    fs.createDocument(`projects/${projectName}/errors/${this.type + Date.now()}`, {errorType: this.type, errorMessage: this.message, insideFunction: this.insideFunction, userEmail: currUserEmail, timeStamp: currDateTime, container: SpreadsheetApp.getActiveSpreadsheet().getName()})
  }
}

function logError(type, message, insideFunction) {
  var err = new Error(type, message, insideFunction)
  err.init();
}

function sendNotifEmail(project, userEmail) {
  MailApp.sendEmail(errorNotifEmail, `${project} Has a New Error`, `The project ${project} has a newly logged error. The user 'unknown' was using the application when the error occured. Date error occurred: ${new Date()}`, {
    name: 'Error Management Service',
  })
}

function initializeErrorManagement() {
  Logger.log('Initializing Project...')
  fs.updateDocument(`projects/${projectName}`, {projectType: projectType, dateInitialized: String(new Date())})
  Logger.log('Initialize SUCCESSFUL')
}


















