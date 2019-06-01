const https = require('https');
const url = require('url');
const util = require('util');

const endpoint = "https://hooks.slack.com/services/<REDACTED>"
const method = "POST"

exports.processEvents = function (payload, context, callback) {
    const { event, settings, version } = payload

    // bad: unhandled errors
    if (event.type == "group") {
        throw ("unhandled version error")
    }

    // good: returning known error type
    if (event.type == "identify") {
        return callback(new EventNotSupported("identify not supported"))
    }

    // great: using settings
    let text = `${event.type} event received` // default
    if (settings.textTemplate) {
        try {
            text = eval('`' + settings.textTemplate + '`')
        } catch (err) {
            return callback(new ValidationError(err))
        }
    }

    // great: using event
    const data = {
        text,
        "attachments": [
            {
                "author_name": `UserID: ${event.userId}`,
                "title": `${event.properties.plan} plan`,
                "fields": [
                    {
                        "title": "Plan",
                        "value": event.properties.plan,
                        "short": false
                    },
                    {
                        "title": "Account Type",
                        "value": event.properties.accountType,
                        "short": false
                    }
                ],
            }
        ]
    }

    // success: callback with no error and + HTTP request metadata
    sendRequest(endpoint, method, settings.apiKey, data, callback)
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class EventNotSupported extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class InvalidEventPayload extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

// Helper method to Send the HTTPS Request.
// endpoint: the endpoint to send the request to
// method: the HTTP method (i.e. POST, GET)
// apiKey: the API Key for your service
// data: the Payload to send with the request
// callback: required for completing the function. callback(error, response)
function sendRequest(endpoint, method, apiKey, data, callback) {
    const parsedUrl = url.parse(endpoint)

    if (parsedUrl.protocol !== "https:") {
        callback("endpoint must use HTTPS")
        return
    }

    const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        protocol: parsedUrl.protocol,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    }
    if (apiKey) {
        options.headers['Authorization'] = `Basic ${apiKey}`;
    }

    var output = { "request": options }

    req = https.request(options, (res) => {
        let body = ''
        res.on('data', (chunk) => {
            body += chunk;
        })

        res.on('end', () => {
            output.response = {
                'statusCode': res.statusCode,
                'body': body,
                'headers': res.headers
            }
            callback(null, output)
        })

    })

    req.write(JSON.stringify(data));

    req.on('error', (e) => {
        callback(e, output)
    });

    req.end()
}