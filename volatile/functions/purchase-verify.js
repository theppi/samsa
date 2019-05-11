const AWS = require('aws-sdk'),
    crypto = require('crypto'),
    _const = require("./_const.json");

const SECRET_1 = _const.SECRET_1,
    SECRET_2 = _const.SECRET_2;

exports.handler = (event, context, callback) => {
    // TODO implement

    let id = event.pathParameters["id"],
        key = event.pathParameters["key"];
    //callback(null, {statusCode: 200, body: "OK"});
    let ddb = new AWS.DynamoDB();
    ddb.query({
        IndexName: "purchase_id",
        TableName: 'Subscriptions',
        KeyConditionExpression: "purchase_id = :v1",
        ExpressionAttributeValues: {
            ":v1": {
                S: id
            }
        }
    }, (err, data) => {
        if (err) return callback(null, {
            statusCode: 400,
            body: JSON.stringify(err),
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
        if (data.Items.length > 1) return callback(null, {
            statusCode: 400,
            body: JSON.stringify({
                error: "Multiple subscriptions for single purchase-id."
            }),
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
        let subscription = data.Items[0];

        let hash = crypto.createHash("SHA512").update(SECRET_1 + subscription.purchase_id.S + SECRET_2 + subscription.id.S).digest("hex");
        callback(null, {
            statusCode: 200,
            body: hash === key,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            isBase64Encoded: false
        });
        return;
    });
};