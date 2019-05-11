const AWS = require('aws-sdk'),
    CognitoProvider = AWS.CognitoIdentityServiceProvider,
    crypto = require("crypto"),
    _const = require("./_const.json");

const secret = _const.SECRET,
    FRONTENDURL = process.env.FRONTENDURL;



exports.handler = (event, context, callback) => {
    let key = crypto.createHash('SHA512').update(secret + event.request.userAttributes.email).digest("hex");
    let verifyLink = FRONTENDURL + "#!/user/" + 
        event.request.userAttributes.email +
        "/" + key + "#{####}";
    event.response = {
        "smsMessage": "Thank you for your registration",
        "emailMessage": "<p>Dear customer,</p><p>Thank you for your registration.</p>" +  
            "<p>Please visit this link to activate your account:</p>" + 
            "<p>" + verifyLink + "</p>" + 
            "<p>Best regards,<br>RealObjects Subscription Management Team</p>",
        "emailSubject": "Thank you for your registration"
    };
    console.log(event);
    callback(null, event);
};
