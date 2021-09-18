
var twilioAuth
var twilioSid
var twilioNum
var textPassword
var props = PropertiesService.getScriptProperties()

var boothCooldown = 5; // mins

const appUrl = ScriptApp.getService().getUrl()
const form2Url = "https://forms.gle/ikqkodxgfX2HwoxG8"

function getSecretsSheet() {
  // const secretsId = "1VXrTgy-SH26KlhjpXkYEKpfJU6n2f84dxINq6Kyz-hM"
  // return SpreadsheetApp.openById(secretsId).getActiveSheet()
  return getOperatorDataSpreadsheet().getSheetByName("Secrets")
}
function getOperatorDataSpreadsheet() {
  const operatorDataId = "1m2pxwcB542VDeeMtaMP_sROX86DMSqSz0ahmTzWwB4g"
  return SpreadsheetApp.openById(operatorDataId)
}

// Called by booth kiosk script when button is pressed so that notification goes out to operators
function doPost(e) {
  console.log("Incoming POST request to send message to operators")
  getTwilioCredentials()
  var pass = textPassword
  // Request e should contain a password
  var data = JSON.parse(e.postData.contents)
  inPassword = data.password
  if (inPassword !== pass) {
    console.error("Could not find data in post body, or incorrect password")
    return ContentService.createTextOutput(`Could not find required data in post body: ` + JSON.stringify(e))
  }
  sendAllOperators(`Patient has joined the booth! Assistant needed:\n${appUrl}`)
  unlockBooth()
  console.log("Completed doPost")
  return ContentService.createTextOutput(`Text sent to operators`)
}

// On webpage open, check that the user is a booth operator
// Then, check if interface is locked.
// If locked, show BoothClosed.html; otherwise, show Interface.html
function doGet() {
  if (userAuthorized()) {
    if (boothIsLocked()) {
      return HtmlService.createHtmlOutputFromFile('BoothClosed.html')
    } else {
      return HtmlService.createHtmlOutputFromFile('Interface')
    }
  } else {
    return HtmlService.createHtmlOutputFromFile('Unauthorized');
  }
}

function userAuthorized() {
  var currentUser = Session.getActiveUser()
  var operators = GroupsApp.getGroupByEmail("booth-operators@endeavr.city")
  return operators.hasUser(currentUser)
}
function getUserEmail() {
  return Session.getActiveUser().getEmail()
}

// When an operator opens the Meet call:
// Send a notification text to all operators
// Log the user who joined the call
// Lock the booth
function operatorOpenedMeet(boothLocked) {
  console.log("Operator opened meet call")
  logOperator()
  if (!boothLocked) sendAllOperators("Another operator has joined the booth.")
  lockBooth()
}

// Gets the current time, user, and booth lock state
// Inserts into a spreadsheet
function logOperator() {
  var time = new Date()
  var currentUser = getUserEmail()
  var locked = boothIsLocked()
  var timestamp = time.toLocaleString()
  console.log("Logging operator " + currentUser)

  var data = {
    "password": getServicePassword(),
    "timestamp": timestamp,
    "user": currentUser,
    "locked": locked
  }

  textPassword = getServicePassword()
  token = ScriptApp.getOAuthToken()
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {Authorization: 'Bearer ' + token},
    muteHttpExceptions: true,
    'payload': JSON.stringify(data)
  };

  var message;

  try {
    var resp = UrlFetchApp.fetch(`https://script.google.com/macros/s/AKfycbzGjFT5PjGIISD3CBMpZi-eQVZt8BethgYaFGicCiEDlGBVUJh1OHlurRfkzX494p8O/exec?endpoint=logOperator`, options)
    var response = JSON.parse(resp)
    message = response.message
  } catch(e) {
    console.error(e)
    sendText("(512) 461-7383", "Failed to log operator "+currentUser+"!\nBooth locked: "+locked)
  }
  console.log("Log operator "+currentUser+" response message: "+message)
}

function getServicePassword() {
  return getSecretsSheet().getRange('B4').getValue()
}

function getBoothUrl() {
  return getSecretsSheet().getRange('B5').getValue()
}

function getBoothId() {
  var id = getBoothUrl().substring(24);
  console.log("Returning ID: " + id);
  return id;
}

function boothIsLocked() {
  return props.getProperty("locked") == "true"
}

function lockBooth() {
  console.log("Locking booth")
  props.setProperty("locked", "true")
}

// Sets the "lastOpened" property to "0" time, which was years ago, and greater than whatever the cooldown is 
function unlockBooth() {
  props.setProperty("locked", "false")
}

