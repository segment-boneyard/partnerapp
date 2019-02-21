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

const apiUri = 'https://platform.segmentapis.build'
const idUri = 'https://id.segmentapis.build'

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
    // you can use workspace or workspace:read scope instead of destination/xyz for creating an app that has access to all of the user's resources
    // destination/xyz means that the app only has access to that single destination on the user selected source
    scopes: ['destination/google-analytics'], 
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

// change the scopes in segmentAuth.scopes to [`workspace`] or [`workspace:read`] to access these and other api endpoints
// these two apis, sourceList, workspaceGet, dont work with destination/xyz scope
async function sourceList(installToken, workspaceName) {
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${workspaceName}/sources`)
}

async function workspaceGet(installToken, workspaceName) {
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${workspaceName}`)
}

// all scopes including destination/xyz scope have access to these two APIs
async function tokenGet(clientId, clientSecret, installName) {
    return req("GET", `${apiUri}/v1beta/${installName}/token`, undefined, undefined, clientId, clientSecret)
}
async function destinationGet(installToken, sourceName) {
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${sourceName}/destinations/google-analytics`)
    // note: even though the scope is destination/xyz the APIs use destinations/xyz (plural)
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
            // Store the install token into a database. The source_name is only included if you used destination/xyz scope and it indicates which scope your app was given permission to.
            // { data: {access_token: "...", app_name: "apps/10", install_name: "installs/123", workspace_names: ["workspaces/myworkspace"], source_names: ["workspaces/myworkspace/source/mysource"]} }
            console.log("install token:", installToken.data)
            console.log("\n")

            // uncomment this block when using scopes 'workspace' or 'workspace:read' to access the workspace the app was installed on
            // Enable with segment apps that have destination/xyz cant access this API
            // workspaceGet(installToken.data.access_token, installToken.data.workspace_names[0])
            //     .then(function (workspace) {
            //         console.log("workspace:", workspace)
            //         console.log("\n")
            //         res.send(workspace)
            //     })
            //     .catch(function (err) {
            //         console.log("WORKSPACE GET ERROR:", err.body)
            //         res.send(err)
            //     })

            // Use your client ID and secret to get a new install token
            // Install tokens expire after 1 hour so you will have to do this every hour
            tokenGet(clientId, clientSecret, installToken.data.install_name)
                .then(function (token) {
                    console.log("token:", token)
                    console.log("\n")

                    // uncomment this block when using scopes 'workspace' or 'workspace:read' to get a list of all sources on the workspace
                    // Enable with segment apps that have destination/xyz cant access this API
                    // sourceList(token.access_token, installToken.data.workspace_names[0])
                    //     .then(function (sources) {
                    //         console.log("sources:", sources)
                    //         console.log("\n")
                    //     })
                    //     .catch(function (err) {
                    //         console.log("CANNOT LIST SOURCES as expected with destination/google-anyalytics scope:", err)
                    //         res.send(err)
                    //     })

                    // Use the refreshed token again to GET the destination your app was installed on
                    // this destination may: 
                    // - not exist in which case you would want to use the CREATE API to create it (for this demo if you get a not found error make sure you create a destination using the Segment Web UI)
                    // - may already exist in which case you may want to update it or perhaps delete it and re-create it
                    destinationGet(token.access_token, installToken.data.source_names[0])
                        .then(function (destination) {
                            console.log("destination:", destination)
                            console.log("\n")
                        })
                        .catch(function (err) {
                            console.log("DESTINATION GET ERROR:", err)
                            res.send(err)
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

app.listen(port, () => console.log(`Partner app listening on port ${port}!\n`))
console.log(`1. Make sure you have created the Segment App\n2. Set the CLIENT_ID and CLIENT_SECRET in .env\n3. Set up the segment account with a source and destination\nSee readme if you have any questions\n`)
console.log(`Now for the demo navigate your browser to http://localhost:8888/auth/segment\n`)
console.log(`If everything works, you will be redirected to Segment for consent and then in the console you will see the access_token and the destination you created returned\n`)