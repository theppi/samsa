const AWS = require('aws-sdk'),
    crypto = require('crypto'),
    _const = require("./_const.json");

const SECRET_1 = _const.SECRET_1,
    SECRET_2 = _const.SECRET_2;

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
    let body = JSON.parse(event.body);
    event.body = body;
    let userId = event.requestContext.authorizer.claims.sub;
    let ddb = new AWS.DynamoDB();
    ddb.query({
        IndexName: "purchase_id",
        TableName: 'Subscriptions',
        KeyConditionExpression: "purchase_id = :v1",
        ExpressionAttributeValues: {
            ":v1": {
                S: body.purchaseId
            }
        }
    }, (err, data) => {
        if (err) {
            createResponse(500, err, callback);
            return;
        }
        let subscription = data.Items[0];
        if (subscription.user_id) {
            createResponse(400, {
                error: "Subscription already assigned"
            }, callback);
            return;
        }
        let hash = crypto.createHash("SHA512").update(SECRET_1 + subscription.purchase_id.S + SECRET_2 + subscription.id.S).digest("hex");
        if (hash !== body.key) {
            createResponse(400, {
                error: "Invalid purchase"
            }, callback);
            return;
        }
        let params = {
            ExpressionAttributeNames: {
                "#U": "user_id"
            },
            ExpressionAttributeValues: {
                ":u": {
                    S: userId
                }
            },
            Key: {
                "id": {
                    S: subscription.id.S
                }
            },
            ReturnValues: "ALL_NEW",
            TableName: "Subscriptions",
            UpdateExpression: "SET #U = :u"
        };
        ddb.updateItem(params, function (err, data) {
            if (err) createResponse(400, err, callback); // an error occurred
            else createResponse(200, data, callback); // successful response
        });
    });
};