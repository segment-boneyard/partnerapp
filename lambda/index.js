"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// index.ts
const integration_1 = require("@segment/integration-sdk/lib/integration");
const webhook_1 = require("@slack/webhook");
const responses_1 = require("@segment/integration-sdk/lib/responses");
// update this to your Slack Webhook URL
const WebhookURL = "https://hooks.slack.com/services/<REDACTED>/<REDACTED>/<REDACTED>";
class MyIntegration extends integration_1.Integration {
    constructor(settings) {
        super();
        this.settings = settings;
    }
    async track(event) {
        const h = new webhook_1.IncomingWebhook(WebhookURL);
        try {
            const resp = await h.send({
                text: event.event,
            });
            return new responses_1.Success(resp.text);
        }
        catch (err) {
            return new responses_1.HttpResponse({
                statusCode: err.code,
            });
        }
        // console.log('Track event handled...')
    }
    async identify(event) {
        return new responses_1.EventNotSupported("identify");
    }
}
exports.MyIntegration = MyIntegration;
exports.processEvents = async function (event, context) {
    const { apiKey } = context.clientContext;
    const settings = { apiKey };
    const integration = new MyIntegration(settings);
    return await integration.handle(event);
};
