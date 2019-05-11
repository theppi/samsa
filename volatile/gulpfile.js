const { series, src, dest } = require('gulp'),
    AWS = require("aws-sdk"),

    baseConstants = require("../stacks/persistent.json"),
    constants = require("../stacks/volatile.json"),
    awsCredentials = require("./aws-credentials.json"),

    cognitosync = new AWS.CognitoIdentityServiceProvider(awsCredentials),
    lambda = new AWS.Lambda({apiVersion: '2015-03-31', region:"eu-central-1"}),
    awsS3 = require("aws-sdk").S3;

async function trigger() {
    cognitosync.apiVersions = '2014-06-30';
    let mailFunctionArn = constants.MailLambdaFunctionQualifiedArn;
    // Ensures that the most current version of lambda is used:
    mailFunctionArn = mailFunctionArn.substring(0, mailFunctionArn.lastIndexOf(":")); 
    let removeParams = {
        FunctionName: mailFunctionArn, 
        StatementId: "samsabase-userPool-invocation",
    };
    lambda.removePermission(removeParams, function(err, data) {
        if (err && err.code !== "ResourceNotFoundException") console.log(err, err.stack); // an error occurred
        let addParams = {
            Action: "lambda:InvokeFunction", 
            FunctionName: mailFunctionArn, 
            SourceArn: baseConstants.UserPoolArn, 
            StatementId: "samsabase-userPool-invocation",
            Principal: "cognito-idp.amazonaws.com"
        };
        lambda.addPermission(addParams, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
        });
    });
    params = {
        UserPoolId: baseConstants.UserPoolId, /* required */
        LambdaConfig: {
            CustomMessage: mailFunctionArn
        },
        Policies: {
            PasswordPolicy: {
                MinimumLength: 8,
                RequireLowercase: true,
                RequireNumbers: true ,
                RequireSymbols:  false,
                RequireUppercase: true
            }
        },
        AdminCreateUserConfig: {
            AllowAdminCreateUserOnly: false,
            InviteMessageTemplate: {
                EmailMessage: '{username} {####}',
                EmailSubject: '{####}',
                SMSMessage: '{username}{####}'
            },
            UnusedAccountValidityDays: 7
        },
        AutoVerifiedAttributes: [
            "email"
        ],
        VerificationMessageTemplate: {
            DefaultEmailOption: "CONFIRM_WITH_CODE",
        }
    };
    cognitosync.updateUserPool(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
    });
}

async function emptyBucket() {
    let s3 = new awsS3();
    let params = {Bucket: baseConstants ? baseConstants.BucketName : "samsabase-frontendbucket"};
    await s3.listObjects(params, async function(err, data) {
        if (err) {
            return;
        }
        if(!data || !data.Contents || data.Contents.length === 0) return;
        params.Delete = {};
        params.Delete.Objects = data.Contents.map(x => {
            return {Key: x.Key};
        });
        await s3.deleteObjects(params, async function(err, data) {
            if(err) {
                console.log(err, err.stack);
                return;
            }
            delete params.Delete;
            // Check here if bucket is empty and redo if not
            await s3.listObjects(params, async function(err, data) {
                if(err) {
                    return;
                }
                if(data.Contents.length == 0) {
                    return;
                } else {
                    await remove();
                }
            });
        });
    });
    return;
}

exports.postDeploy = series(trigger);
exports.emptyBucket = series(emptyBucket);