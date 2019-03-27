#!/usr/bin/env node
const ClientOAuth2 = require('client-oauth2')
const crypto = require('crypto')
const express = require('express')
const request = require("request");

const dotenv = require('dotenv')
dotenv.config()
if (process.env.CLIENT_ID === undefined || process.env.CLIENT_SECRET === undefined) {
    console.log("error", "no CLIENT_ID or CLIENT_SECRET in .env file or environment")
    process.exit(1);
}

const apiUri = 'https://platform.segmentapis.com'
const idUri = 'https://id.segmentapis.com'
// change this to the dest you are trying to manage for the user
const dest = 'clearbrain'
// change this to the API key provisioned for your customer in your system
const destAPIKey = 'abcd1234'
// destination/<slug> means that the app only has access to that single destination on the user selected source
const scope = `destination/${dest}`

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

const app = express()
const port = 8888

var segmentAuth = new ClientOAuth2({
    clientId,
    clientSecret,
    accessTokenUri: `${idUri}/oauth2/token`,
    authorizationUri: `${idUri}/oauth2/auth`,
    redirectUri: 'http://localhost:8888/auth/segment/callback',
    scopes: [scope], 
    state: crypto.randomBytes(20).toString('hex'),
})

async function req(method, url, body, headers, user, pass) {
    var options = { method, url, body, headers, json: true };

    if (user !== undefined)
        options.auth = { user, pass }

    return new Promise(function (resolve, reject) {
        request(options, function (error, response, body) {
            if (error) return reject(error);
            if (response.statusCode >= 400) return reject(response)
            resolve(body)
        });
    })
}

async function reqBearer(token, method, url, body) {
    return req(method, url, body, {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    })
}

// advanced use case
// change the scopes in segmentAuth.scopes to [`workspace`] or [`workspace:read`] and create a new app with these scopes using the REST API
// to access sourceList and other segment APIs
async function sourceList(installToken, workspaceName) {
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${workspaceName}/sources`)
}

// all scopes including destination/xyz scope have access to these two APIs
async function tokenGet(clientId, clientSecret, installName) {
    return req("GET", `${apiUri}/v1beta/${installName}/token`, undefined, undefined, clientId, clientSecret)
}
async function destinationGet(installToken, sourceName) {
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${sourceName}/destinations/${dest}`)
}

async function destinationCreate(installToken, sourceName) {
    if (!sourceName) {
        return "no source specified to create destination on"
    }
    // note: 
    // 1. even though the scope is destination/xyz the APIs use destinations/xyz (plural)
    // 2. The sourcename is fully qualified so it would be something like: workspaces/business/sources/js/destinations/clearbrain
    // 3. Similarly the config[0].name is not just apiKey but the full path to the apiKey so something like: workspaces/business/sources/js/destinations/clearbrain/config/apiKey
    // 4. the config[0].value populates the users provisioned API key in your system that we set up top
    const body = {
        "destination": {
                "name": `${sourceName}/destinations/${dest}`,
                "connection_mode": "CLOUD",
                "config": [
                    {
                        "name": `${sourceName}/destinations/${dest}/config/apiKey`,
                        "value": `${destAPIKey}`
                    }
                ],
                "enabled": true
        }
    }
    return reqBearer(installToken, "POST", `${apiUri}/v1beta/${sourceName}/destinations`, body)
}

async function destinationUpdate(installToken, sourceName) {
    if (!sourceName) {
        return "no source specified to update destination on"
    }
    // note: 
    // 1. look at the notes in destinationCreate
    // 2. the update_mask field is required during updates and tells the API which fields you are going to update. 
    //    Without the update_mask the system wouldnt know whether you want to clear out the rest of the fields you didnt specify, or do a partial update
    const body = {
        "destination": {
                "name": `${sourceName}/destinations/${dest}`,
                "connection_mode": "CLOUD",
                "config": [
                    {
                        "name": `${sourceName}/destinations/${dest}/config/apiKey`,
                        "value": `${destAPIKey}`
                    }
                ],
                "enabled": true
        },
        "update_mask": {
            "paths": [
                "destination.enabled",
                "destination.config",
                "destination.connection_mode"   
            ]
        }
    }
    return reqBearer(installToken, "PATCH", `${apiUri}/v1beta/${sourceName}/destinations/${dest}`, body)
}

app.get('/auth/segment', function (req, res) {
    var uri = segmentAuth.code.getUri()
    res.redirect(uri)
})

app.get('/auth/segment/callback', function (req, res) {
    if (req.query.error)
        return res.send(`Error: ${req.query.error}<br />Description: ${req.query.error_description}<br />Hint: ${req.query.error_hint}`)

    segmentAuth.code.getToken(req.originalUrl)
        .then(function (installToken) {
            // Store the install token into a database. The source_name is only included if you used destination/xyz scope and it indicates which source your app was given permission to.
            // { data: {access_token: "...", app_name: "apps/10", install_name: "installs/123", workspace_names: ["workspaces/myworkspace"], source_names: ["workspaces/myworkspace/source/mysource"]} }
            console.log("install token:", installToken.data)
            console.log("\n")

            // uncomment this block when using scopes 'workspace' or 'workspace:read' to list all the sources on the app
            // Enable with segment apps that have destination/xyz cant access this API
            // sourceList(installToken.data.access_token, installToken.data.workspace_names[0])
            //     .then(function (sources) {
            //         console.log("sources:", sources)
            //         console.log("\n")
            //         res.send(sources)
            //     })
            //     .catch(function (err) {
            //         console.log("SOURCE LIST ERROR:", err.body)
            //         res.send(err)
            //     })

            // Use the refreshed token again to CREATE the destination on the source you your app was given access to
            // - Here we first try to create the destination
            // - If it already exists, then we update the apiKey and set it to enabled
            if (installToken.data.source_names) {
                // create the destination
                destinationCreate(installToken.data.access_token, installToken.data.source_names[0])
                    .then(function (destination) {
                        console.log("created destination:\n", destination)
                        console.log("\n")
                        res.send(destination)
                    })
                    .catch(function (err) {
                        // if it exists try to update the current one
                        console.log("Destination create error. This is expected if destination exists.\nIn this case we update it with your apiKey and set it to enabled\n")
                        if (err.body.error.includes("destination already exists")) {
                            destinationUpdate(installToken.data.access_token, installToken.data.source_names[0])
                                .then(function (destination) {
                                    console.log("updated already existing destination:\n", destination)
                                    console.log("\n")
                                    res.send(destination)
                                })
                                .catch(function (err) {
                                    console.log("DESTINATION UPDATE ERROR:", err)
                                    res.send(err)
                                })
                        }
                    })
            } else {
                console.log("no source present so cant get destination.\nPerhaps you are trying to use an app with workspace scope rather than destination/xyz scope.\nFor workspace apps, you can list all the sources on a workspace to read the sourceName")
                res.send("no source present so cant get destination.\nPerhaps you are trying to use an app with workspace scope rather than destination/xyz scope.\nFor workspace apps, you can list all the sources on a workspace to read the sourceName")
            }

            // Use your client ID and secret to get a new install token
            // Install tokens expire after 1 hour so you will have to do this if you want to regain access to the users resources after 1hr
            // once you refresh the token the old token (installToken in this case) no longer works
            // tokenGet(clientId, clientSecret, installToken.data.install_name)
            //     .then(function (token) {
            //         console.log("token:", token)
            //         console.log("\n")
            //         destinationGet(token.access_token, installToken.data.source_names[0])
            //             .then(function (destination) {
            //                 console.log("getting destination:\n", destination)
            //                 console.log("\n")
            //             })
            //             .catch(function (err) {
            //                 console.log("DESTINATION GET ERROR:", err)
            //                 res.send(err)
            //             })
            //     })
            //     .catch(function (err) {
            //             console.log("INSTALL TOKEN REFRESH ERROR:", err)
            //             res.send(err)
            //     })
        })
        .catch(function (err) {
            console.log("INSTALL TOKEN EXCHANGE ERROR:", err)
            res.send(err)
        })
})

app.listen(port, () => console.log(`Partner app listening on port ${port}!\n`))
console.log(`1. Make sure you have created the Segment App\n2. Set the CLIENT_ID and CLIENT_SECRET in .env\nSee readme if you have any questions\n`)
console.log(`Now for the demo navigate your browser to http://localhost:8888/auth/segment\n`)
console.log(`If everything works, you will be redirected to Segment for consent and then in the console you will see the access_token and the destination you changed\n`)