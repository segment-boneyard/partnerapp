const custom = require('./index');
var nock = require('nock');

test('transforms to Slack event and performs POST with auth', async () => {
    const segmentEvent = {
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

    const slackEvent = {
        "text": "test@example.com Registered",
        "attachments": [
            {
                "author_name": "UserID: test-user-23js8",
                "title": "Pro Annual plan",
                "fields": [
                    {
                        "title": "Plan",
                        "value": "Pro Annual",
                        "short": false
                    },
                    {
                        "title": "Account Type",
                        "value": "Facebook",
                        "short": false
                    }
                ],
            }
        ]
    }

    const context = {
        clientContext: {
            apiKey: "abcd1234"
        }
    }

    const cb = function (error, result) { }

    const slack = nock("https://hooks.slack.com")
    .post(/\/services\/.*\/.*\/.*/, slackEvent, {
        reqHeaders: {
            "Authorization": "Basic abcd1234",
        },
    })
    .reply(200);

    custom.processEvents(segmentEvent, context, cb)
    expect(await slack.done())
});
