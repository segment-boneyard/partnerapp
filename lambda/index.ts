// index.ts
import { Integration } from '@segment/integration-sdk/lib/integration'
import { Track, Identify } from '@segment/integration-sdk/lib/facade/events'
import { IncomingWebhook } from '@slack/webhook';
import { Context } from 'aws-lambda'

import { Success, EventNotSupported, HttpResponse } from '@segment/integration-sdk/lib/responses'

interface Settings {
    apiKey: string
}

// update this to your Slack Webhook URL
const WebhookURL = "https://hooks.slack.com/services/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"

export class MyIntegration extends Integration {
    constructor(public settings: Settings) {
        super()
    }

    async track(event: Track) {
        const h = new IncomingWebhook(WebhookURL)
        try {
            const resp = await h.send({
                text: event.event,
            })
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

// const integration = new MyIntegration({
//     apiKey: 'sdfasfs'
// })

export const processEvents = async function (event: any, context: any) {
    console.log(context)
    const { apiKey } = context.clientContext.custom;
    const settings = { apiKey }
    const integration = new MyIntegration(settings)
    return await integration.handle(event)
}

processEvents(
    {
        event: "track"
    },
    {
        clientContext: {
            custom: {
                apiKey: "abcd1234"
            }
        }
    },
)
