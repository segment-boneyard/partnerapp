# Segment Partner App

This is a Node.js app that demonstrates how a partner integrates with the Segment platform. It covers multiple strategies for receiving event data from Segment:

- Custom Code Subscription -- Segment runs JavaScript you write to POST event data to your public API
- Webhook Subscription -- Segment POSTs event data to an private API endpoint you build
- Lambda Subscriptions -- Segment invokes a Lambda function you write in your AWS account with event data

It also covers a strategy for your users to configure your destination on Segment:

- Enable with Segment -- Your users are directed to "install" your app on Segment via OAuth flows

## Which Subscription Should I Build?

A Custom Code Subscription is designed to be the fastest to get working. You can copy the [custom code reference implementation](custom/index.js), add your existing API endpoint, tweak the logic to translate Segment event data to your API format, and paste the code into the Segment Dev Center. Segment will run the custom JavaScript for you.

If you do not want to write this adapter in JavaScript, you might consider a Lambda Subscription. You can refer to the [custom code reference implementation](custom/index.js), and implement the same interface in any language AWS Lambda supports, and paste the resulting Lambda ARN into the Segment Dev Center. Segment will invoke your Lambda function for you. See the [Segment Lambda docs](https://segment.com/docs/destinations/amazon-lambda/) for more information.

If you do not want to write a destination in a serverless fashion, you should build a Webhook Subscription. You can refer to the [webhook reference implementation](webhook/index.js) and implement the same concepts in any language, deploy it to your infrastructure, and paste the resulting HTTPS URL into the Segment Dev Center. Segment will POST data to your API endpoint.

## What is Enable with Segment?

The Enable with Segment flow is designed to easily and security help your customers set up your destination in Segment. You can refer to the [OAuth reference implementation](oauth/index.js) and add the "Enable With Segment" button and OAuth callbacks into your web app, then set the OAuth callback URL in the Segment Dev Center. When your users click the "Enable With Segment" button they will be prompted to "install" your application, and when they approve you will get an API access token that lets you automatically configure your destination in their Segment workspace.

## Quick Start -- Custom Code

1. Register for the [Segment Developer Center](https://app.segment.com/developer)
2. Create an Segment App
3. Create a Subscription Component and select "I want to build my endpoint on Segment"
4. Customize and upload the following snippet

- Set your API endpoint and method
- Transform data from the Segment Spec into your API format

5. Use the "Send Test Event" and "Test" suite to verify event delivery
6. Fill out the remaining app and destination metadata and submit your destination

```js
// Reference code for translating Segment events into a Slack incoming webhook
const endpoint =
  "https://hooks.slack.com/services/<REDACTED>/<REDACTED>/<REDACTED>";
const method = "POST";

const transformEvent = event => {
  return {
    text: `${event.email} ${event.event}`,
    attachments: [
      {
        author_name: `UserID: ${event.userId}`,
        title: `${event.properties.plan} plan`,
        fields: [
          {
            title: "Plan",
            value: event.properties.plan,
            short: false
          },
          {
            title: "Account Type",
            value: event.properties.accountType,
            short: false
          }
        ]
      }
    ]
  };
};
```

<details>
<summary>Example Segment event...</summary>

```json
{
  "type": "track",
  "event": "Registered",
  "userId": "test-user-23js8",
  "timestamp": "2019-04-08T01:19:38.931Z",
  "email": "test@example.com",
  "properties": {
    "plan": "Pro Annual",
    "accountType": "Facebook"
  }
}
```
</details>

See the [Custom Code directory](custom) for full docs and reference implementation.

## Quick Start -- Webhook Subscription

## Quick Start -- Lambda Subscription

## Quick Start -- Enable with Segment

1. Register for the [Segment Developer Center](https://app.segment.com/developer)
2. Create an Segment App
3. Browse to the App OAuth Settings

- copy the client ID, secret and scope
- set redirect URLs for development (e.g. `http://localhost:8888/auth/segment/callback`) and production (e.g. `https://api.example.com/auth/segment/callback`)

4. Add the "Enable with Segment" button to your user's web management console
5. Initiate the OAuth flow
6. On callback, use the OAuth token and Segment Config API to create or update your destination

```js
// Reference code for implementing Enable with Segment via OAuth
var segmentAuth = new ClientOAuth2({
  clientId: "e5ec2f6e-9774-4bcd-ab5f-c663d1da0683",
  clientSecret: "<REDACTED>",
  accessTokenUri: `https://id.segmentapis.build/oauth2/token`,
  authorizationUri: `https://id.segmentapis.build/oauth2/auth`,
  redirectUri: `http://localhost:8888/auth/segment/callback`,
  scopes: [scope],
  state: crypto.randomBytes(20).toString("hex")
});

app.get("/auth/segment/callback", function(req, res) {
  segmentAuth.code.getToken(req.originalUrl).then(function(installToken) {
    destinationCreate(
      installToken.data.access_token,
      installToken.data.source_names[0]
    )
      .then(function(destination) {
        res.send(destination);
      })
      .catch(function(err) {
        if (err.body.error.includes("destination already exists")) {
          destinationUpdate(
            installToken.data.access_token,
            installToken.data.source_names[0]
          )
            .then(function(destination) {
              res.send(destination);
            })
            .catch(function(err) {
              res.send(err);
            });
        }
      });
  });
});
```

See the [Enable with Segment directory](enable) for full docs and reference implementation.

### OAuth Flow

Clone this git repo

Change these three vars at the top in index.js

```shell
// change this to the dest you are trying to manage for the user
const dest = 'clearbrain'
// change this to the API key provisioned for your customer in your system
const destAPIKey = 'abcd1234'
// destination/<slug> means that the app only has access to that single destination on the user selected source
const scope = `destination/${dest}`
```

Install node.js if you don't have it already. On the mac you can do it by:

```shell
brew install node
cd partnerapp <or wherever you cloned this repo>
npm install
```

And then initiate the OAuth flow

```shell
$ node index.js
Example app listening on port 8888!

$ open http://localhost:8888/auth/segment
```

If you use a standard oauth library in your programming language all of this should be done for you as shown in this demo. These steps are just for illustration.

1. When the user wants to authenticate, you redirect user to `https://id.segmentapis.com/oauth2/auth?response_type=code&scope=workspace:read&client_id=...`. Note that we only accept response_type=code here. That means you’ll get back an auth_code from us that your library will then exchange for an install token in Step 5 below.
2. If user is logged out, Segment redirects to `https://app.segment.com/login`
3. If user is logged in, Segment redirects to `https://app.segment.com/authorize`
4. If user consents, Segment redirects with a code to your redirect_uri `http://localhost:8888/auth/segment/callback`. This app listens for this request and executes step #5 below.
5. You exchange the code with for an install token from `https://id.segmentapis.com/oauth2/token`
6. You save the access token, install name, workspace name and source name for the user

### Install Token

At the end of a successful flow you will get an "Install Token". If you passed in the scope as `destination/clearbrain` the user will be prompted to select a source to install your Enable With Segment App on and it will be returned to you as well

```js
{
  access_token: 'YL8a0w-Boz1EgZgmD2ELZvsxakjqSMwO8xe7tV-ToSk.XXXXXXXXXXXXXX',
  token_type: 'bearer',
  expires_in: 3599,
  scope: 'workspace',
  app_name: 'apps/2',
  install_name: 'installs/7',
  workspace_names: [ 'workspaces/userworkspace' ]
  source_names: ['workspaces/userworkspace/sources/javascript']
}
```

You can then perform API operations on behalf a user as the install.

With `destination/clearbrain` scope you can only change the destination specified (`clearbrain` in this case) on the user selected source. This is the recommended scope for apps trying to control just one destination for a user (Enable With Segment functionality). These apps can only access the Destinations API. Detailed reference is here: https://reference.segmentapis.com/ > Destinations

You can GET a destination if it exists (and you have access to the user workspace and source) as shown below and Create, Update or Delete it too.

```shell
$ INSTALL_TOKEN=YL8a0w-Boz1EgZgmD2ELZvsxakjqSMwO8xe7tV-XXXX.XXXXXXXXXXXXXX
$ curl \
  -H "Authorization: Bearer $INSTALL_TOKEN" \
  https://platform.segmentapis.com/v1beta/workspaces/business/sources/js/destinations/clearbrain \
```

```json
{
    "name": "workspaces/business/sources/js/destinations/clearbrain",
    "parent": "workspaces/business/sources/js",
    "display_name": "ClearBrain",
    "enabled": true,
    "connection_mode": "UNSPECIFIED",
    "config": [
        {
            "name": "workspaces/business/sources/js/destinations/clearbrain/config/apiKey",
            "display_name": "API Key",
            "value": "abcd1234",
            "type": "string"
        }
    ],
    ...
}
```

You can refresh the token with the installation token API. The token expires in an hour so you will want to do this periodically:

```shell
$ INSTALL_NAME=installs/7
$ curl \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  http://localhost/v1beta/$INSTALL_NAME/token
```

```json
{
  "access_token": "4d9ee1b5-b752-XXXX-XXXX-XXXXXXXXXX",
  "token_type": "bearer",
  "expires_in": 3600,
  "scope": "workspace",
  "app_name": "apps/myapp",
  "install_name": "install/10",
  "workspace_names": ["workspaces/userworkspace"]
}
```

## Advanced use cases

If you created an App with a more permissive scope you have access to more APIs:

- With `workspace` scope you can change all resources
- With `workspace:read` you can read all resources, but not change them

Full list of APIs are here: https://segment.com/docs/config-api/

Here is an example of how you would get a users workspace if you had any of the above scopes

```shell
$ INSTALL_TOKEN=YL8a0w-Boz1EgZgmD2ELZvsxakjqSMwO8xe7tV-XXXX.XXXXXXXXXXXXXX
$ curl \
  -H "Authorization: Bearer $INSTAL_TOKEN" \
  http://localhost/v1beta/workspaces
```

```json
{
  "name": "workspaces/userworkspace",
  "display_name": "Business",
  "id": "bb296fce9c",
  "create_time": "2012-08-12T15:40:04.406Z"
}
```

If you created the app with any of these scopes, and then updated the scope in index.js at the top to match it, you can uncomment the lines around sourceList in index.js to see an example of how you could list all sources on the users workspace

## FAQ and Troubleshooting

### Do I need a segment account? What username/password for creating a personal access token?

Yes you need a regular segment account and the username/password to get the access-token are your login credentials for this segment account. Your app will be owned by a workspace in this segment account but as long as you set `public: true` when you create the app, other workspaces (which are globally unique among segment users) can install it.

### What should the exact destination slug/word be?

There are references above for `destination/<slug>` what should the `<slug>` be? Well, that is the destination that you would like to manage for the user. To see the exact slug we are expecting for your destination:

- If you just submitted a destination in partner portal for approval, you can see the slug on the submission form, or once submitted in the URL
- If your destination is already public, look at the Segment Catalog and find destination. That exact slug should appear in the URL. So it would be `clearbrain` for this destination https://segment.com/integrations/clearbrain/

### What should the exact create body be to enable my destination?

The create body will have three fields:

- full path to the apiKey (which includes the users workspace and source, see below)
- the actual apiKey provisioned for the user in your system. It's in the "value" field
- `enabled: true`.

The body will be in this form

```shell
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "destination": {
            "name": "workspaces/userWorkspaceSlug/sources/userSourceSlug/destinations/clearbrain",
            "connection_mode": "CLOUD",
            "config": [
                {
                    "name": "workspaces/userWorkspaceSlug/sources/userSourceSlug/destinations/clearbrain/config/apiKey",
                    "display_name": "API Key",
                    "value": "abcd123"
                }
            ],
            "enabled": true
    }
  https://platform.segmentapis.com/v1beta/workspaces/userworkspace/sources/js/destinations \
}'
```

### Why can't I list all destinations on the source

If you created the app with `destination/<slug>` scope you can only access that one destination on the source. So listing all destinations is not allowed for this scope.

### How do I create or update a destination that requires more configuration than just a API Key?

GET the destination settings using our catalog API first. This will show all the fields the destination supports. Then substitute the field values for the ones you need to specify.

Using this body craft a CREATE request and substitute the appropriate field values. Check out https://reference.segmentapis.com/ > Destination > CREATE request for an example

### What type of OAuth grant do you support?

We support the authorization code grant type. That means you will have to exchange the auth_code returned during the install flow to get the actual access token. https://www.oauth.com/oauth2-servers/access-tokens/authorization-code-request/

The library you use in your programming language should do this automatically for you

### What scopes do you support?

We support `destination/<slug>`, `workspace` and `workspace:read`. You set this in the app creation and when you start the install flow. You have to use the same exact scope in both places otherwise you will get an invalid scope error when you start the error.

### What is the fastest way to get started? Do I have to learn OAuth to make an app?

Run the partner app (you are looking at it!) so you can see all the steps involved in setting up your app, installing it and then accessing resources.

You don’t need to learn OAuth! If you use the standard oauth implementation in your programming language, like we do in the partner app, all this complexity should be hidden away from you.

### During OAuth code exchange I am getting missing a required parameter

You probably dont have redirect_uri matching what you set in the App Create Request

### How many redirect_uris can I have? Can I add more after the app is created?

You can have five redirect_uris on app creation. For now, editing the app info directly is not supported. Please emaul us for now if you want any of your redirect_uris or other info changed.

In the future we will have UIs and APIs so you can update this information on your own.

### I am getting malformed token when I try to access the API. What is wrong?

- Your token could have expired. They expire every hour. You then have to hit the refresh endpoint to get a new access_token. Make sure you pass in the correct install_name and client_id and client_secret in that request
- You are trying to take an action you don’t have permission for. So write to a resource when you only have `workspace:read` permission. If you need write access then create a new app with `workspace` permission and then re-install it.

### Will you send CSRF state back when you redirect?

Yes if you set the `state=123` param in your initial request we will send it back to you.

### Do we still have to send the redirect_uri in the oauth2/token request?

Yes. This confirms to the OAuth spec and is done for security

### I am getting `install already exists` error

You already installed the app on this workspace so you can’t install it again. You can use your current `access_token` to simply access resources on this workspace.

When an install happened you should have received a segment `workspace` and `install_name` so you can store it in your own db along with the user’s info. When the user tries to install this app again, you can check your db and see that they already installed your app, and can skip the install flow.

### OK I managed to create an App. How do I use your APIs?

Here are docs https://segment.com/docs/config-api/

And a postman API reference collection that you can run as-is https://reference.segmentapis.com/#51d965d3-4a67-4542-ae2c-eb1fdddc3df6.

# License

MIT
