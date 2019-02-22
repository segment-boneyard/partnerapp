# Segment Partner App

A Node.js app that demonstrates how to build a Segment OAuth App. Installing this app and get a working demo going is the fastest way to understand Segment OAuth and get started with building your app.

This app manages a specific destination on a source that the user consents to. To do that, it will need the _scope_ `destination/<slug>` (for example: `destination/clearbrain`).

### Create Segment Account and PAT

To use the API, you need a Segment username, password, workspace and access token.

If you don't have a Segment user, [sign up](https://app.segment.com/signup).

Then for this demo create a source on Segment first. Login to Segment > Click Sources in the left nav bar > Add source > Javascript > Connect

Then create a personal access token (PAT) using the API. You can find the workspace when you are logged into the Segment Web UI in the URL. If the URL was https://app.segment.com/business/overview, the workspace would be business.

```shell
$ USER=<email>
$ PASS=<Segment pass>
$ WORKSPACE=<Segment workspace>

$ curl https://platform.segmentapis.com/v1beta/access-tokens \
  -u "$USER:$PASS" \
  -d "{
    'access_token': {
      'description': 'partner app',
      'scopes': 'workspace',
      'workspace_names': [
            'workspaces/$WORKSPACE'
        ]
    }
  }"
```

```json
{
 "name": "access-tokens/127",
 "description": "partner app",
 "scopes": "workspace",
 "create_time": "2018-12-19T18:57:39Z",
 "token": "XsRI63dOnUHbtl1RiMqLBvWYO-J3K2n4FakYfZ3u7gg.WLExZ5WctEd2KOk7JKmsuqGy4umHZUB5AF_b8dRE_M4",
 "workspace_names": [
  "workspaces/<userWorkspace>"
 ]
}
```

### Create a Enable With Segment App

Note the scope is `destination/<slug>` which is how you specify what destination you want to get access to. During the oauth flow the user will select the source they are giving you access to.

Change the DEST variable with the slug of your destination. In this example it is clearbrain

```shell
$ TOKEN=<token>
$ DEST=clearbrain

$ curl \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    'app': {
      'display_name': 'myapp',
      'description': 'My cool read-only app',
      'client_uri': 'https://example.com',
      'scope': 'destination/$DEST',
      'public': true,
      'logo_uri': 'https://example.com/logo.gif',
      'tos_uri': 'https://example.com/tos',
      'policy_uri': 'https://example.com/privacy',
      'redirect_uris': ['http://localhost:8888/auth/segment/callback']
    }
  }" \
  https://platform.segmentapis.com/v1beta/workspaces/$WORKSPACE/apps
```

```json
{
 "name": "workspaces/userworkspace/apps/12",
 "parent": "workspaces/userworkspace",
 "client_id": "d1ce4e85-0a89-4ff9-9180-ec01dfdfee40",
 "client_secret": "YvpqemW8TI_~",
 "public": true,
 "redirect_uris": [
  "http://localhost:8888/auth/segment/callback"
 ],
 "client_uri": "https://example.com",
 "logo_uri": "https://example.com/logo.gif",
 "tos_uri": "https://example.com/tos",
 "policy_uri": "https://example.com/privacy",
 "scope": "destination/clearbrain",
 "description": "My cool read-only app",
 "display_name": "myapp"
}
```

_IMPORTANT!_ Save the client_secret as you can't see it again.

```
$ echo CLIENT_ID=d1ce4e85-0a89-4ff9-9180-ec01dfdfee40 > .env
$ echo CLIENT_SECRET=YvpqemW8TI_~ >> .env
```

### OAuth Flow

Change these three vars at the top in index.js
```shell
// change this to the dest you are trying to manage for the user
const dest = 'clearbrain'
// change this to the API key provisioned for your customer in your system
const destAPIKey = 'abcd1234'
// destination/<slug> means that the app only has access to that single destination on the user selected source
const scope = `destination/${dest}`
```

Install node.js if you don't have it already. And then initiate the OAuth flow

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
  access_token: 'YL8a0w-Boz1EgZgmD2ELZvsxakjqSMwO8xe7tV-ToSk.nKaLX2QHocqalHR3O4BdoYdcopk3hjW4izYHMG14cxQ',
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
$ INSTALL_TOKEN=YL8a0w-Boz1EgZgmD2ELZvsxakjqSMwO8xe7tV-ToSk.nKaLX2QHocqalHR3O4BdoYdcopk3hjW4izYHMG14cxQ
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
 "access_token": "4d9ee1b5-b752-4f7f-86d9-5680df6f8ce8",
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
$ INSTALL_TOKEN=YL8a0w-Boz1EgZgmD2ELZvsxakjqSMwO8xe7tV-ToSk.nKaLX2QHocqalHR3O4BdoYdcopk3hjW4izYHMG14cxQ
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
* If you just submitted a destination in partner portal for approval, you can see the slug on the submission form, or once submitted in the URL
* If your destination is already public, look at the Segment Catalog and find destination. That exact slug should appear in the URL. So it would be `clearbrain` for this destination https://segment.com/integrations/clearbrain/

### What should the exact create body be to enable my destination?

The create body will have three fields:
* full path to the apiKey (which includes the users workspace and source, see below)
* the actual apiKey provisioned for the user in your system. It's in the "value" field
* `enabled: true`.

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

We support `destination/<slug>`,  `workspace` and `workspace:read`. You set this in the app creation and when you start the install flow. You have to use the same exact scope in both places otherwise you will get an invalid scope error when you start the error.

### What is the fastest way to get started? Do I have to learn OAuth to make an app?

Run the partner app (you are looking at it!) so you can see all the steps involved in setting up your app, installing it and then accessing resources.

You don’t need to learn OAuth! If you use the standard oauth implementation in your programming language, like we do in the partner app, all this complexity should be hidden away from you.

### During OAuth code exchange I am getting missing a required parameter

You probably dont have redirect_uri matching what you set in the App Create Request

### How many redirect_uris can I have? Can I add more after the app is created?

You can have five redirect_uris on app creation. For now, editing the app info directly is not supported. Please emaul us for now if you want any of your redirect_uris or other info changed.

In the future we will have UIs and APIs so you can update this information on your own.

### I am getting malformed token when I try to access the API. What is wrong?

* Your token could have expired. They expire every hour. You then have to hit the refresh endpoint to get a new access_token. Make sure you pass in the correct install_name and client_id and client_secret in that request
* You are trying to take an action you don’t have permission for. So write to a resource when you only have `workspace:read` permission. If you need write access then create a new app with `workspace` permission and then re-install it.

### Will you send CSRF state back when you redirect?

Yes if you set the `state=123` param in your initial request we will send it back to you.

### Do we still have to send the redirect_uri in the oauth2/token request?

Yes. This confirms to the OAuth spec and is done for security

### I am getting `install already exists` error

You already installed the app on this workspace so you can’t install it again. You can use your current `access_token` to simply access resources on this workspace.

When an install happened you should have received a segment `workspace` and  `install_name` so you can store it in your own db along with the user’s info. When the user tries to install this app again, you can check your db and see that they already installed your app, and can skip the install flow.

### OK I managed to create an App. How do I use your APIs?

Here are docs https://segment.com/docs/config-api/ 

And a postman API reference collection that you can run as-is https://reference.segmentapis.com/#51d965d3-4a67-4542-ae2c-eb1fdddc3df6.