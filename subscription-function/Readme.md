# Subscription Function Reference

Segment Functions allow Partners to write Javascript code that:

* receive data from a webhook and translate it to a Segment event ("Stream")
* receive Segment events and send them to existing APIs ("Subscription")

This is a Javascript project that demonstrates how to build and test a Subscription Function. It translates a Segment event into a [Slack Incoming Webhook](https://api.slack.com/incoming-webhooks) API call.

For full documentation of building a function for the Segment Catalog, please see the "Building Function Subscriptions" docs:

> [View "Enable with Segment" docs](https://segment.com/docs/partners/build-function/)

## Quick Start

Run tests with:

```shell
$ make test
```

## Subscription Function Interface

You must export a `processEvents` function for Segment to call. It is passed a `payload` object that contains `event` data, `settings` metadata and a semantic payload `version`. You must call a `callback(error, response)` function with results.

```js
exports.processEvents = function(payload, context, callback) {
    { event, settings, version } = payload

    // do stuff

    // call back with no error and request / response metadata
    callback(null, { 
        request: options,
        response: metadata,
    })

    // or call back with one of ValidationError, EventNotSupported or InvalidEventPayload
    callback(new EventNotSupported("identify not supported"))
}
```

Failure to call the callback within 3 seconds, or returning or throwing an untyped error is considered a BadRequestError.

## Local Lambda

If you install the [AWS SAM CLI](https://github.com/awslabs/aws-sam-cli) you can emulate how your function runs in Lambda:

```shell
$ make invoke EVENT=fixtures/track.json
```
