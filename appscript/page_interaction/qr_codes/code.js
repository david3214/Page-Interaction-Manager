/**
 * Displays the QR Code manager in a modal dialog
 */
function showQRManager() {
  const html =  HtmlService.createTemplateFromFile("qr-manager.html")
    .setWidth(600)
    .setHeight(600)
    .evaluate()
  SpreadsheetApp.getUi().showModalDialog(html, "QR Manager")
}

/**
 * Checks the QR Code url cache in User Properties, then updates 
 *  it if any new pages have been added to the account
 * @returns {Object} object where the key is the name of the page, 
 *  and the value is an object like so: {url: "link"}
 */
function getQRCodeUrls() {
  // Get constants
  const userProps = PropertiesService.getUserProperties()
  const qrUrls = JSON.parse(userProps.getProperty("QR_CODE_URLS")) || {}
  const allPageInfo = getFacebookPages()["data"]

  // Iterate over the page info array see if we already have a url for the page
  for (const page of allPageInfo) {
    if (!(page.name in qrUrls)) {
      // If not, generate the url
      qrUrls[page.name] = { 
        url: createDynamicLink(`https://missionary-tools.com/qr?id=${page.id}`) 
      }
    }
  }

  // Save everything in the User Properties cache
  userProps.setProperty("QR_CODE_URLS", JSON.stringify(qrUrls))
  
  return qrUrls
}

/**
 * Create Firebase dynamic short link
 * @param {string} url input URL
 * @returns {string} Firebase URL
 */
function createDynamicLink(url, length="SHORT") {
  const payload = {
    dynamicLinkInfo: {
      domainUriPrefix: "https://mitools.page.link",
      link: url
    },
    suffix: {
      option: length
    }
  }

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  }

  const apiKey = PropertiesService.getScriptProperties().getProperty('FIREBASE_KEY')
  const result = UrlFetchApp.fetch(`https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${apiKey}`, options)
  const shortUrl = JSON.parse(result.getContentText())

  return shortUrl.shortLink
}
