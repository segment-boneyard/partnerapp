# Segment Partner App

A Node.js app that demonstrates how to build a Segment Application.

### Create Segment Account and PAT

To use the API, you need a Segment username, password, workspace and access token.

If you don't have a Segment user, [sign up](https://app.segment.com/signup).Then create a personal access token (PAT):

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

### Create Segment App

```shell
$ TOKEN=<token>

$ curl \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "application": {
      "display_name": "myapp",
      "description": "My cool read-only app",
      "client_uri": "https://example.com",
      "scope": "workspace:read",
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
 "scope": "workspace:read",
 "description": "My cool read-only app",
 "display_name": "myapp"
}
```

Save the client_secret as you can't see it again.

```
$ echo CLIENT_ID=d1ce4e85-0a89-4ff9-9180-ec01dfdfee40 > .env
$ echo CLIENT_SECRET=YvpqemW8TI_~ >> .env
```

### OAuth Flow

Now initiate an OAuth flow

```shell
$ node index.js
Example app listening on port 8888!

$ open http://localhost:8888/auth/segment
```

1. You redirect user to `https://id.segmentapis.com/oauth2/auth?client_id=...`
2. If user is logged out, Segment redirects to `https://app.segment.com/login`
3. If user is logged in, Segment redirects to `https://app.segment.com/authorize`
4. If user consents, Segment redirects with a code to `http://localhost:8888/auth/segment/callback`
5. You exchange the code for an install token from `https://id.segmentapis.com/oauth2/token`
6. You save the access token, install name and workspace name for the user

### Install Token

At the end of a successful flow you will get an "Install Token":

```js
{
  access_token: 'YL8a0w-Boz1EgZgmD2ELZvsxakjqSMwO8xe7tV-ToSk.nKaLX2QHocqalHR3O4BdoYdcopk3hjW4izYHMG14cxQ',
  token_type: 'bearer',
  expires_in: 3599,
  scope: 'workspace',
  app_name: 'apps/2',
  install_name: 'installs/7',
  workspace_names: [ 'workspaces/userworkspace' ]
}
```

You can performan API operations on behalf a user as the install:

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

You can refresh the token with the installation token API:

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

## Troubleshooting

### The request is missing a required parameter

If the OAuth code exchange returns:

`The+request+is+missing+a+required+parameter%2C+includes+an+invalid+parameter+value%2C+includes+a+parameter+more+than+once%2C+or+is+otherwise+malformed`

You probably don't have redirect_uri matching