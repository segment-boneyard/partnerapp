# Custom Code Subscription

## Interface

Your code **must** export this function definition:

```js
exports.processEvents = function (event, context, callback)
```

Segment will invoke this function with:

* `event` containing Segment event data
* `context.clientContext.apiKey` containing the Segment user's API key
* `callback(Error error, Object result)` function for returning information back to the caller

This function **must** call the callback with one of these forms:

```js
callback();                 // Indicates success but no information returned to the caller.
callback(null);             // Indicates success but no information returned to the caller.
callback(null, "success");  // Indicates success with information returned to the caller.
callback("error message");  // Indicates error with error information returned to the caller.
```
