const AWS = require('aws-sdk'),
    CognitoProvider = AWS.CognitoIdentityServiceProvider,
    crypto = require('crypto'),
    _const = require("./_const.json");

const REGION = process.eventNames.REGION,
    USER_POOL_ID = process.env.USER_POOL_ID,
    COGNITO_PROVIDER_CONFIG = {
        region: REGION
    },
    secret = _const.SECRET;

exports.handler = (event, context, callback) => {
    let body = JSON.parse(event.body);
    let key = crypto.createHash('SHA512').update(secret + body.user).digest("hex");
    if(key !== body.key) {
        const response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: JSON.stringify({valid: false}),
        };
        callback(null, response);
        
    }
    var params = {
        UserPoolId: USER_POOL_ID,
        Username: body.user
    };
    new CognitoProvider(COGNITO_PROVIDER_CONFIG).adminConfirmSignUp(params, function (err, data) {
        if (err) callback(null, err);
        else {
            const response = {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                    "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
                },
                body: JSON.stringify({data: data, valid: true}),
            };
            callback(null, response);
        }
    });
};