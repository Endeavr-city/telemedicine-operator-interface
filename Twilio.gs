// Sends a message to all booth operators
function sendAllOperators(message) {
  console.log("Sending message to all active operators")
  getTwilioCredentials();
  var ss = getOperatorDataSpreadsheet()
  sheet = ss.getSheetByName('Contact')
  lastRow = sheet.getLastRow()
  var vals = sheet.getRange(2, 1, lastRow-1, 4).getValues()
  for (const operator of vals) {
    var active = operator[3]
    var phone = operator[0]
    if (active) {
      console.log("Sending text to " + operator[2])
      sendText(phone, message)
    }
  }
  console.log("Finished sending messages")
}

// Sends a text to "to" with message "body"
function sendText(to, body) {
  var messages_url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;

  var payload = {
    "To": to,
    "Body" : body,
    "From" : twilioNum
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
  if (validateTwilioCredentials()) return;

  textPassword = getServicePassword()
  token = ScriptApp.getOAuthToken()
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {Authorization: 'Bearer ' + token},
    'payload': JSON.stringify({'password': textPassword})
  };

  var message;
  var response;

  try {
    var resp = UrlFetchApp.fetch(`https://script.google.com/a/macros/endeavr.city/s/AKfycbzGjFT5PjGIISD3CBMpZi-eQVZt8BethgYaFGicCiEDlGBVUJh1OHlurRfkzX494p8O/exec?endpoint=twilio`, options)
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
  twilioNum = response.num
  twilioSid = response.sid
  console.log("Twilio Credentials valid? " + validateTwilioCredentials())
}

function validateTwilioCredentials() {
  return (twilioAuth != null && twilioNum != null && twilioSid != null)
}