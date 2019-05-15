// index.ts
import { Track, Identify } from '@segment/integration-sdk/lib/facade/events'
import { Integration } from '@segment/integration-sdk/lib/integration'
import { Success, EventNotSupported, HttpResponse } from '@segment/integration-sdk/lib/responses'
import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';

interface Settings {
    apiKey: string
}

// update this to your Slack Webhook URL
const WebhookURL = "https://hooks.slack.com/services/<REDACTED>/<REDACTED>/<REDACTED>"

export class MyIntegration extends Integration {
    constructor(public settings: Settings) {
        super()
    }

    async track(event: Track) {
        const evt = event.toJSON()
        const props = event.properties.toJSON()

        const args: IncomingWebhookSendArguments = {
            text: `${evt.email} ${event.event}`,
            attachments: [
                {
                    author_name: `UserID: ${event.userId}`,
                    title: `${props.plan} plan`,
                    fields: [
                        {
                            title: "Plan",
                            value: props.plan as string,
                            short: false,
                        },
                        {
                            title: "Account Type",
                            value: props.accountType as string,
                            short: false,
                        },
                    ],
                },
            ]
        }

        try {
            const h = new IncomingWebhook(WebhookURL)
            const resp = await h.send(args)
            return new Success(resp.text)
        } catch (err) {
            return new HttpResponse({
                statusCode: err.code,
            })
        }
        // console.log('Track event handled...')
    }

    async identify(event: Identify) {
        return new EventNotSupported("identify")
    }
}

export const processEvents = async function (event: any, context: any) {
    // const { apiKey } = "foo";
    const settings = { apiKey: "foo" }
    const integration = new MyIntegration(settings)
    return await integration.handle(event)
}