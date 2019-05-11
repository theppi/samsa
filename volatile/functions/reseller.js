const AWS = require('aws-sdk'),
    CognitoProvider = AWS.CognitoIdentityServiceProvider,
    crypto = require('crypto'),
    _const = require("./_const.json");


const REGION = process.env.REGION,
    USER_POOL_ID = process.env.USER_POOL_ID,
    FRONTENDURL = process.env.FRONTENDURL,
    COGNITO_PROVIDER_CONFIG = {
        region: REGION
    },
    SECRET_1 = _const.SECRET_1,
    SECRET_2 = _const.SECRET_2;

function createResponse(status, data, callback) {
    let response = {
        statusCode: status,
        body: JSON.stringify(data),
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    };
    callback(null, response);
}

function createSubscription(body) {
    return {
        id: {
            'S': body.items[0].recurringBilling.subscriptionId
        },
        purchase_id: {
            'S': body.purchaseId.toString()
        },
        quantity: {
            'N': body.items[0].quantity.toString()
        },
        productName: {
            'S': body.items[0].productName
        },
        status: {
            'S': body.items[0].recurringBilling.status
        },
        cancellationUrl: {
            'S': body.items[0].recurringBilling.cancellationUrl
        },
        changePaymentSubscriptionUrl: {
            'S': body.items[0].recurringBilling.changePaymentSubscriptionUrl
        },
        intervalNumber: {
            'N': body.items[0].recurringBilling.intervalNumber.toString()
        },
        nextBillingDate: {
            'S': body.items[0].recurringBilling.nextBillingDate
        }
    };
}

function getKeyObject(id, hash) {
    let url = FRONTENDURL + "/#!/purchase/" + id + "/" + hash;
    return {
        key: "Thank you for your purchase. \r\n\r\n Please visit " + url,
        keyRaw: url,
        deliveryType: "cleverbridge delivers key",
        deliveryTypeId: "cleverbridgeDeliversKey"
    };
}

function getKeyObjectUser() {
    return {
        key: "Thank you for your purchase. Please check the subscription" +
            "management system for the key to this subscription.",
        keyRaw: "No key",
        deliveryType: "cleverbridge delivers key",
        deliveryTypeId: "cleverbridgeDeliversKey"
    };
}

function handleRequest(user, body, callback) {
    let subscription = createSubscription(body);
    if (user) {
        subscription.user_id = {
            S: user.Username
        };
    }
    new AWS.DynamoDB().putItem({
        TableName: 'Subscriptions',
        Item: subscription
    }, (err) => {
        if (err) return createResponse(err.statusCode, err, callback);
        if (!user) {
            console.log("+++HASHDATA+++", SECRET_1 + subscription.purchase_id.S + SECRET_2 + subscription.id.S);
            let hash = crypto.createHash("SHA512").update(SECRET_1 + subscription.purchase_id.S + SECRET_2 + subscription.id.S).digest("hex");
            console.log("+++HASH+++", hash);
            let response = getKeyObject(subscription.purchase_id.S, hash);
            return createResponse(200, response, callback);
        }

        return createResponse(200, getKeyObjectUser(), callback);
    });
}

exports.handler = (event, context, callback) => {
    let body = JSON.parse(event.body);
    let user = body.licenseeContact.email;
    let subscriptionId = body.items[0].recurringBilling.subscriptionId;
    let subParams = {
        Key: {
            "id": {
                S: subscriptionId
            }
        },
        TableName: "Subscriptions"
    };
    new AWS.DynamoDB().getItem(subParams, function (err, data) {
        if (err) return createResponse(err.statusCode, err, callback);
        if (data.Item) return createResponse(400, {
            error: "Subscription already created"
        }, callback);
        let params = {
            UserPoolId: USER_POOL_ID,
            AttributesToGet: [
                'email',
            ],
            Filter: 'email = "' + user + '"',
            Limit: 1,
        };

        new CognitoProvider(COGNITO_PROVIDER_CONFIG).listUsers(params, function (err, data) {
            if (err) {
                if (err.code !== "UserNotFoundException") return createResponse(err.statusCode, err, callback);
                handleRequest(null, body, callback);
            } else handleRequest(data.Users[0], body, callback);
        });
    });
};