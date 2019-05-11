function handler(data, serverless, options) {
    try {
        console.log('Received Stack Output', data);
    } catch(e) {
        console.log(e);
    }
}

module.exports = {
    handler
};