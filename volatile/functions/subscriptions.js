const AWS = require('aws-sdk');

let createResponse = function (statusCode, body, callback) {
    const response = {
        statusCode: statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS 
        },
        body: JSON.stringify(body)
    };
    callback(null, response);
};

exports.handler = (event, context, callback) => {
    //createResponse(200, {event: event, context: context}, callback);
    /*let body = JSON.parse(event.body);
    event.body = body;*/
    let userId = event.requestContext.authorizer.claims.sub;
    //createResponse(200, {userId: userId}, callback);
    let ddb = new AWS.DynamoDB();
    ddb.query({
        IndexName: "user_id",
        TableName: 'Subscriptions',
        KeyConditionExpression: "user_id = :v1",
        ExpressionAttributeValues: {
            ":v1": {
                S: userId
            }
        }
    }, (err, data) => {
        if (err) {
            createResponse(500, err, callback);
            return;
        }
        createResponse(200, data, callback);
    });
};