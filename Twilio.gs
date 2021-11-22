var twilioAuth
var twilioSid

// Sends a message to all active booth operators
function sendAllOperators(message) {
  console.log("Sending message to all active operators")
  getTwilioCredentials();
  sheet = operatorData.getSheetByName('Contact')
  lastRow = sheet.getLastRow()

  var vals = sheet.getRange(2, 1, lastRow-1, 4).getValues()
  var i = 0;
  for (const operator of vals) {
    var active = operator[3]
    var phone = operator[0]
    if (active) {
      console.log("Sending text to " + operator[2])
      sendText(phone, message, i++);
      i = i % phonenumbers.length;
    }
  }
  console.log("Finished sending messages")
}

// Sends a text to "to" with message "body"
// The phonegroup identifies which Twilio number the message
// will be sent from. 0 <= phonegroup <= phonenumbers.length-1
function sendText(to, body, phonegroup) {
  if (!validateTwilioCredentials()) {
    getTwilioCredentials();
  }

  var messages_url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;

  var payload = {
    "To": to,
    "Body" : body,
    "From" : phonenumbers[phonegroup]
  };

  var options = {
    "method" : "post",
    "payload" : payload
  };

  options.headers = { 
    "Authorization" : "Basic " + Utilities.base64Encode(`${twilioSid}:${twilioAuth}`)
  };

 try {
  UrlFetchApp.fetch(messages_url, options);
 } catch(e) {
   console.error(e)
 }
}

// Gets Twilio credentials from a secure spreadsheet
function getTwilioCredentials() {
  // If credentials have already been fetched, don't fetch again
  if (validateTwilioCredentials()) return;

  textPassword = getServicePassword()
  token = ScriptApp.getOAuthToken()
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {Authorization: 'Bearer ' + token},
    'muteHttpExceptions': false,
    'payload': JSON.stringify({'password': textPassword})
  };

  var message;
  var response;

  try {
    var resp = UrlFetchApp.fetch(twilioSecretsUrl, options)
    response = JSON.parse(resp)
    message = response.message
  } catch(e) {
    console.error(e)
  }
  console.log("POST Request response message: "+message)
  if (message != "Success") {
    throw 'Could not get credentials'
  }
  
  twilioAuth = response.auth
  twilioSid = response.sid
  console.log("Twilio Credentials valid? " + validateTwilioCredentials())
}

function validateTwilioCredentials() {
  return (twilioAuth != null && twilioSid != null)
}