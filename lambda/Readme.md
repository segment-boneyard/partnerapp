# Lambda Destination

This is the same code as the Custom Destination, but packaged with AWS SAM for deploying in your own AWS account and allowing Segment to invoke it.

## Deploy

Make sure to deploy to us-west-2.

```shell
$ brew tap aws/tap
$ brew install awscli aws-sam-cli
```

```shell
$ export AWS_DEFAULT_REGION=us-west-2
$ make deploy
$ aws cloudformation describe-stacks --stack-name slacker | jq .Stacks[].Outputs
[
  {
    "OutputKey": "LambdaARN",
    "OutputValue": "arn:aws:lambda:us-east-1:572007530218:function:slacker-ProcessEventsFunction-JR6KBP98ZIQ2"
  },
  {
    "OutputKey": "RoleARN",
    "OutputValue": "arn:aws:iam::572007530218:role/slacker-InvokeLambdaRole-G2QU8ONURXL6"
  }
]
```

## Local Testing

```shell
$ sam local invoke --event event.json
2019-05-13 18:07:39 Found credentials in shared credentials file: ~/.aws/credentials
2019-05-13 18:07:39 Invoking index.processEvents (nodejs10.x)

Fetching lambci/lambda:nodejs10.x Docker container image......
2019-05-13 18:07:40 Mounting /Users/noah/dev/partnerapp/lambda as /var/task:ro,delegated inside runtime container
START RequestId: 52fdfc07-2182-154f-163f-5f0f9a621d72 Version: $LATEST
END RequestId: 52fdfc07-2182-154f-163f-5f0f9a621d72
REPORT RequestId: 52fdfc07-2182-154f-163f-5f0f9a621d72      Duration: 443.67 ms     Billed Duration: 500 ms Memory Size: 128 MB     Max Memory Used: 48 MB  
{"request":{"hostname":"hooks.slack.com","path":"/services/%3CREDACTED%3E/%3CREDACTED%3E/%3CREDACTED%3E","protocol":"https:","method":"POST","headers":{"Content-Type":"application/json","Authorization":"Basic FIXME"}},"response":{"statusCode":302,"body":"","headers":{"content-type":"text/html","content-length":"0","connection":"close","date":"Tue, 14 May 2019 01:07:41 GMT","server":"Apache","vary":"Accept-Encoding","strict-transport-security":"max-age=31536000; includeSubDomains; preload","referrer-policy":"no-referrer","x-frame-options":"SAMEORIGIN","location":"https://api.slack.com/","x-via":"haproxy-www-aen8","x-cache":"Miss from cloudfront","via":"1.1 941cbd1049a1cc3d6d633dce8d55cf36.cloudfront.net (CloudFront)","x-amz-cf-id":"lWPgnMdR4TkmVrVc_UxiPoRMMN5G-dPW26iTrUY_-X5mtDaUJPoLyg=="}}}
```

