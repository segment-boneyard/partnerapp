const https = require('https');
const url = require('url');
const util = require('util');

// Step 1: Update These Values:
const endpoint = "https://hooks.slack.com/services/<REDACTED>/<REDACTED>/<REDACTED>" // update this to your API Endpoint
const method = "POST"

// Step 2: Determine what data you want!
// The returned object will be sent as the HTTP Request Payload
// to your endpoint (above). If you return null, no request will be sent
const transformEvent = (event) => {
    return {
        "text": `${event.email} ${event.event}`,
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
}


// That's all folks! No need to venture below. *Unless*, of course, your daring heart desires.
// Below you will find helper code. It is meant to make this process easier for you!

// Function Entrypoint. Not required to change
exports.processEvents = function (event, context, callback) {
    if (endpoint === "") {
        callback("You must provide an endpoint to your API Endpoint")
        return
    }

    const data = transformEvent(event)
    if (!data) {
        callback(null, "Ignored due to empty return of transformEvent")
        return
    }

    // const { apiKey } = context.clientContext;
    const apiKey = "FIXME" // context not working with `sam`
    sendRequest(endpoint, method, apiKey, data, callback)
}

// Helper method to Send the HTTPS Request. Not required to change
// endpoint: the endpoint to send the request to
// method: the HTTP method (i.e. POST, GET)
// apiKey: the API Key for your service
// data: the Payload to send with the request
// callback: required for completing the CustomCode function. callback(error, response)
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
