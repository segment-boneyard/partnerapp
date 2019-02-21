# Segment Partner App

A Node.js app that demonstrates how to build a Segment OAuth App. Installing this app and getting a working demo going is the fastest way to understand Segment OAuth and getting started with building your app.

This app in it's default state demonstrates how to write a Enable With Segment App. This is a segment app with scope `destination/xyz` (say `destination/google-analytics`) and the purpose of this app is to manage that specified destination on the source that the user consents to.

By changing the scope below and uncommenting the lines in index.js you can also change this to a Segment App that can access all resources on behalf of the user and not just that specified destination. However, for Enable With Segment function, which is giving you the partner to control one destination on one source, all you need is `destination/xyz` scope.

### Create Segment Account and PAT

To use the API, you need a Segment username, password, workspace and access token.

If you don't have a Segment user, [sign up](https://app.segment.com/signup). Then for this demo also create a javascript source and a Google Analytics destination using the Web UI.

Create a source on Segment first: Login to Segment > Click Sources in the left nav bar > Add source > Javascript > Connect

Then create a destination: Open your source if it's not already open using the Sources tab in the left nav bar > Add Destination > Google Analytics > Configure > Enable

Now if you navigate to Sources, and select the source you just created, you will see the source on the left and Google Analytics on the right. We are not really going to be using this destination, its just for demo, so you can click through to Google Analytics on the right and turn the checkbox off at the top thereby deactivating it.

Then create a personal access token (PAT):

```shell
$ USER=user@example.com
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
 "scopes": "workspace:read",
 "create_time": "2018-12-19T18:57:39Z",
 "token": "XsRI63dOnUHbtl1RiMqLBvWYO-J3K2n4FakYfZ3u7gg.WLExZ5WctEd2KOk7JKmsuqGy4umHZUB5AF_b8dRE_M4",
 "workspace_names": [
  "workspaces/userworkspace"
 ]
}
```

### Create a Enable With Segment App

Note the scope `destination/xyz` which is how you specify what destination you want to get access to. During the oauth flow the user will select the source they are giving you access to.

```shell
$ TOKEN=<token>

$ curl \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "app": {
      "display_name": "myapp",
      "description": "My cool read-only app",
      "client_uri": "https://example.com",
      "scope": "destination/google-analytics",
      "public": true,
      "logo_uri": "https://example.com/logo.gif",
      "tos_uri": "https://example.com/tos",
      "policy_uri": "https://example.com/privacy",
      "redirect_uris": ["http://localhost:8888/auth/segment/callback"]
    }
  }' \
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
 "scope": "destination/google-analytics",
 "description": "My cool read-only app",
 "display_name": "myapp"
}
```

IMPORTANT! Save the client_secret as you can't see it again.

If you need wider access than just managing one destination, you can change the scope to `workspace` or `workspace:read`. That allows you to access all of the users resources rather than just the one destination they consent to

```
$ echo CLIENT_ID=d1ce4e85-0a89-4ff9-9180-ec01dfdfee40 > .env
$ echo CLIENT_SECRET=YvpqemW8TI_~ >> .env
```

### OAuth Flow

Install node.js if you don't have it already. And then initiate the OAuth flow

```shell
$ node index.js
Example app listening on port 8888!

$ open http://localhost:8888/auth/segment
```

 If you use a standard oauth library in your programming language all of this should be done for you as shown in this demo. These steps are just for illustration.

1. When the user wants to authenticate, you redirect user to `https://id.segmentapis.com/oauth2/auth?response_type=code&scope=workspace:read&client_id=...`. Note that we only accept response_type=code here. That means you’ll get back an auth_code from us that you’ll then exchange for an install token in Step 5 below.
2. If user is logged out, Segment redirects to `https://app.segment.com/login`
3. If user is logged in, Segment redirects to `https://app.segment.com/authorize`
4. If user consents, Segment redirects with a code to your redirect_uri `http://localhost:8888/auth/segment/callback`. This app listens for this request, gets token in Step #5 and accesses the users resources for demo.
5. You exchange the code with for an install token from `https://id.segmentapis.com/oauth2/token`
6. You save the access token, install name, workspace name and source name for the user

### Install Token

At the end of a successful flow you will get an "Install Token". If you passed in the scope as `destination/xyz` the user will be prompted to select a source to install your Enable With Segment App on and it will be returned to you.

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

With destination/xyz scope you can only change the single destination on the user selected source. This is the recommended scope for apps trying to control just one destination for a user (Enable With Segment functionality). These apps can only access the Destinations API.

Full list of APIs are here: https://segment.com/docs/config-api/

Detailed reference is here: https://reference.segmentapis.com/

All Apps can GET a destination (make sure you created it using the Web UI in the first step below). You can also Create, Update or Delete this destination if it exists

```shell
$ INSTALL_TOKEN=YL8a0w-Boz1EgZgmD2ELZvsxakjqSMwO8xe7tV-ToSk.nKaLX2QHocqalHR3O4BdoYdcopk3hjW4izYHMG14cxQ
$ curl \
  -H "Authorization: Bearer $INSTAL_TOKEN" \
  https://platform.segmentapis.build/v1beta/workspaces/business/sources/javascripts/destinations/google-analytics \
```

```json
{
    "name": "workspaces/business/sources/js/destinations/google-analytics",
    "parent": "workspaces/business/sources/js",
    "display_name": "Google Analytics",
    "enabled": false,
    "connection_mode": "CLOUD",
    "config": [
        {
            "name": "workspaces/business/sources/js/destinations/google-analytics/config/classic",
            "display_name": "Use Classic Analytics on Your Site",
            "value": false,
            "type": "boolean"
            ...
        }
        ...
    ]
}
```

If you created an App with a more permissive scope you have access to more APIs:
- With workspace scope you can change all resources
- With workspace:read you can read all resources, but not change them

Here is an example of how you would get a users workspace

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

## FAQ and Troubleshooting

### Do I need a segment account? What username/password for creating a personal access token?

Yes you need a regular segment account and the username/password to get the access-token are your login credentials for this segment account. Your app will be owned by a workspace in this segment account but as long as you set `public: true` when you create the app, other workspaces (which are globally unique among segment users) can instal it.

### What type of OAuth grant do you support?

We support the authorization code grant type. That means you will have to exchange the auth_code returned during the install flow to get the actual access token. https://www.oauth.com/oauth2-servers/access-tokens/authorization-code-request/

### What scopes do you support?

We support `destination/xyz`,  `workspace` and `workspace:read`. You set this in the app creation and when you start the install flow. You have to use the same exact scope in both places.

### What is the fastest way to get started? Do I have to learn OAuth to make an app?

Run the starter app (https://github.com/segmentio/partnerapp) we have written so you can see all the steps involved in setting up your app, installing it and then accessing resources.

You don’t need to learn OAuth! If you use the standard oauth implementation in your programming language, like we do in the partner app, all this complexity should be hidden away from you.

### During OAuth code exchange I am getting missing a required parameter

You probably don't have redirect_uri matching what you said in the App Create Request

### How many redirect_uris can I have? Can I add more after the app is created?

You can have five redirect_uris on app creation. For now, editing the app info directly is not supported. Please write in to have any of your redirect_uris or other info changed.

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

When an install happened you should have received a segment `workspace` and  `install_name` so you can store it in your own db along with the user’s info. When the user tries to install this app again, you can check your db and see that they already installed your app, and can skip the install flow.

### OK I managed to create an App. How do I use your APIs?

Here are docs https://segment.com/docs/config-api/ and some detailed reference https://reference.segmentapis.com/#51d965d3-4a67-4542-ae2c-eb1fdddc3df6. If you are trying to setup a specific destination and don’t know what the body should be, you can first query the catalog to get all of it’s settings, and then change the body to your own settings.