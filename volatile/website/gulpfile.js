const { task, series, src, dest } = require('gulp'),
    awsCred = require("../aws-credentials.json"),
    s3 = require('gulp-s3-upload')(awsCred),
    awsS3 = require("aws-sdk").S3,
    
    del = require('delete'),
    fs = require("fs"),
    replace = require('gulp-string-replace'),

    properties = require("./properties.json"),
    baseStack = require("../../stacks/persistent.json"),
    stack = require("../../stacks/volatile.json"),
    codeReplaces = [
        ["ServiceEndpoint", stack.ServiceEndpoint],
        ["UserPoolId", baseStack.UserPoolId],
        ["ClientId", baseStack.UserPoolClient]
    ];

async function upload() {
    return src("dist/**/*")
        .pipe(s3({
            Bucket: baseStack.BucketName, //  Required
            ACL:    'public-read'
        }, {
            maxRetries: 5
        },{uploadNewFilesOnly: false}))
        // .pipe(dest('test'))
    ;
}
async function copyLib(lib, type) {
    return src('res/node_modules/' + lib)
        .pipe(dest('dist/vendor/' + type));
}

async function idsReplace() {
    let task = src('dist/controllers/_rootController.js');
    for(let i = 0, rep = codeReplaces[0]; i < codeReplaces.length; rep = codeReplaces[++i]) {
        task = task.pipe(replace(new RegExp("%" + rep[0] + "%", 'g'), rep[1]));
    }
    return task.pipe(dest('dist/controllers'));
}

async function libsReplace() {
    let task = src('dist/index.html');
    let libname = [];
    type = [];
    let libs = properties.libs;
    for(let i=0, lib = libs[0]; i < libs.length; lib = libs[++i]) {
        libname[i] = lib.substring(lib.lastIndexOf("/") + 1);
        type[i] =  lib.substring(lib.lastIndexOf(".") + 1);
        task = task.pipe(replace(new RegExp('node_modules/' + lib + "(.*)<!--" + type[i] + "Lib-->", 'g'), function(a,b) { 
            return "/vendor/"+ type[i] + "/" + libname[i] + arguments[1];
        }));
        await copyLib(lib, type[i]);
    }
    return task.pipe(dest('dist'));
}

let copy = series(
    function() {
        return src('res/**/*', {ignore: ["**/node_modules/**", "**/package.json", "**/package-lock.json"]})
            .pipe(dest('dist'));
    },
    function(){
        return src('res/node_modules/@fortawesome/fontawesome-free/webfonts/*')
            .pipe(dest('dist/vendor/webfonts'));
    });

let clean = async function() {
    return del(['dist/*']);
};

let build = series(clean, copy, libsReplace, idsReplace);

exports.default = build;
exports.upload = upload;