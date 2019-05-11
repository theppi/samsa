const { series } = require('gulp'),
    del = require('delete'),
    awsS3 = require("aws-sdk").S3,
    fs = require("fs"),
    constants = fs.existsSync("./stack") ? require("./stack") : null;

function clean(cb) {
    del(['stack.json'], cb);
}

async function clearBucket() {
    let s3 = new awsS3();
    let params = {Bucket: constants ? constants.BucketName: "samsabase-frontendbucket"};
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
exports.clean = series(clean);
exports.clearBucket = series(clearBucket);
