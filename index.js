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

var segmentAuth = new ClientOAuth2({
    clientId,
    clientSecret,
    accessTokenUri: `${idUri}/oauth2/token`,
    authorizationUri: `${idUri}/oauth2/auth`,
    redirectUri: 'http://localhost:8888/auth/segment/callback',
    scopes: ['workspace:read'],
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

async function tokenGet(clientId, clientSecret, installName) {
    return req("GET", `${apiUri}/v1beta/${installName}/token`, undefined, undefined, clientId, clientSecret)
}

async function workspaceGet(installToken, workspaceName) {
    return reqBearer(installToken, "GET", `${apiUri}/v1beta/${workspaceName}`)
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
            // Store the install token into a database
            // { data: {access_token: "...", app_name: "apps/10", install_name: "installs/123", workspace_names: ["workspaces/myworkspace"]} }
            console.log("install token:", installToken.data)

            // Use the install token to access the workspace the app was installed on
            workspaceGet(installToken.data.access_token, installToken.data.workspace_names[0])
                .then(function (workspace) {
                    console.log("workspace:", workspace)
                    res.send(workspace)
                })
                .catch(function (err) {
                    console.log("WORKSPACE GET ERROR:", err.body)
                    res.send(err)
                })

            // Optionally use your client ID and secret to get a new install token
            // Install tokens expire after 1 hour
            tokenGet(clientId, clientSecret, installToken.data.install_name)
                .then(function (token) {
                    console.log("token:", token)

                    // Use the refreshed token to request the users API
                    sourceList(token.access_token, installToken.data.workspace_names[0])
                        .then(function (sources) {
                            console.log("sources:", sources)
                        })
                        .catch(function (err) {
                            console.log("SOURCE LIST ERROR:", err)
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

app.listen(port, () => console.log(`Partner app listening on port ${port}!`))