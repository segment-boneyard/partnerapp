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

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

const app = express()
const port = 8888

var savedInstallToken

var segmentAuth = new ClientOAuth2({
    clientId,
    clientSecret,
    accessTokenUri: `${idUri}/oauth2/token`,
    authorizationUri: `${idUri}/oauth2/auth`,
    redirectUri: 'http://localhost:8888/auth/segment/callback',
    scopes: ['config:destination:google-analytics'],
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

async function sourceList(installToken, workspaceName) {
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${workspaceName}/sources`)
}
async function workspaceGet(installToken, workspaceName) {
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${workspaceName}`)
}

async function destinationGet(installToken, workspaceName, sourceName) {
    destinationName = `workspaces/${workspaceName}/sources/${sourceName}/destinations/${destinationName}`
    console.log("destinationNameInGet")
    console.log(destinationName)
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${destinationName}`)
}

async function destinationCreate(installToken, workspaceName, sourceName) {
    destinationType = "google-analytics"
    destinationName = `workspaces/${workspaceName}/sources/${sourceName}/destinations/${destinationName}`
    console.log("destinationNameInCreate")
    console.log(destinationName)
    body = `{
        "destination": {
            "name": "${destinationName}",
            "connection_mode": "CLOUD",
            "config": [
                {
                    "value": "UA-970311111-1",
                    "type": "string",
                    "name": "${destinationName}/config/trackingId"
                }
            ]
        }
    }`
    console.log("body")
    console.log(body)
    return reqBearer(installToken, "POST", `${apiUri}/v1beta/${destinationName}`, body)
}

async function destinationUpdate(installToken, workspaceName, sourceName) {
    destinationType = "google-analytics"
    destinationName = `workspaces/${workspaceName}/sources/${sourceName}/destinations/${destinationName}`
    console.log("destinationNameInUpdate")
    console.log(destinationName)
    body = `{
        "destination": {
            "enabled": "true",
            "config": [
                {
                    "name": "${destinationName}/config/enableServerIdentify",
                    "type": "boolean",
                    "value": true
                }
            ]
        },
        "update_mask": {
            "paths": [
                "destination.enabled",
                "destination.config"
            ]
        }
    }`
    console.log("body")
    console.log(body)
    return reqBearer(installToken, "PATCH", `${apiUri}/v1beta/${destinationName}`, body)
}

async function tokenGet(clientId, clientSecret, installName) {
    return req("GET", `${apiUri}/v1beta/${installName}/token`, undefined, undefined, clientId, clientSecret)
}

app.get('/auth/segment', function (req, res) {
    var uri = segmentAuth.code.getUri()
    res.redirect(uri)
})

// This won't work for now as the scope is restricted to destination:config:google-analytics
// fixme so there are two separate files one with restricted scope and one with workspace:read scope so this method works
app.get('/test', function (req, res) {
    // Use the saved install token to access the workspace the app was installed on
    workspaceGet(savedInstallToken.data.access_token, savedInstallToken.data.workspace_names[0])
        .then(function (workspace) {
            console.log("workspace:", workspace)
            res.send(workspace)
        })
        .catch(function (err) {
            console.log("WORKSPACE GET ERROR:", err.body)
            res.send(err)
        })

    // Use the saved install token to request the sources API
    sourceList(savedInstallToken.access_token, savedInstallToken.data.workspace_names[0])
        .then(function (sources) {
            console.log("sources:", sources)
        })
        .catch(function (err) {
            console.log("SOURCE LIST ERROR:", err)
            res.send(err)
        })
})

app.get('/auth/segment/callback', function (req, res) {
    if (req.query.error)
        return res.send(`Error: ${req.query.error}<br />Description: ${req.query.error_description}<br />Hint: ${req.query.error_hint}`)

    segmentAuth.code.getToken(req.originalUrl)
        .then(function (installToken) {
            savedInstallToken = installToken;
            // Store the install token into a database
            // { data: {access_token: "...", app_name: "apps/10", install_name: "installs/123", workspace_names: ["workspaces/myworkspace"]} }
            console.log("install token:", installToken.data)

            // Optionally use your client ID and secret to get a new install token
            // Normally you would need to do this after 1 hr as the original Install Token expires in an hr
            tokenGet(clientId, clientSecret, installToken.data.install_name)
                .then(function (token) {
                    console.log("token:", token)
                    savedInstallToken = token

                    // Use the refreshed token to create a destination
                    destinationCreate(token.access_token, installToken.data.workspace_names[0], installToken.data.source_names[0])
                        .then(function (destination) {
                            console.log("destinationCreate:", sources)
                        })
                        .catch(function (err) {
                            console.log("DESTINATION CREATE ERROR IS EXPECTED IF IT EXISTS:", err)
                            res.send(err)
                            // if err == 409 conflict, which means user already has destination configured so you can't create a new destination on that source
                            // you can only change it's settings. In this case we are going to change it to enabled
                            if (err == 409) { // PSEUDO CODE FIX ME
                                destinationUpdate(token.access_token, installToken.data.workspace_names[0], installToken.data.source_names[0])
                                    .then(function (destination) {
                                    console.log("destinationUpdate:", sources)
                                    })
                                    .catch(function (err) {
                                        console.log("DESTINATION UPDATE ERROR:", err)
                                        res.send(err)
                                    })
                            }
                        })
                })
                .catch(function (err) {
                    console.log("INSTALL TOKEN REFRESH ERROR:", err)
                })
        })
        .catch(function (err) {
            console.log("INSTALL TOKEN EXCHANGE ERROR:", err)
            res.send(err)
        })
})

app.listen(port, () => console.log(`Partner app listening on port ${port}!`))