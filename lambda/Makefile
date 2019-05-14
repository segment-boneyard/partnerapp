export AWS_DEFAULT_REGION ?= us-west-2
APP ?= slacker

deploy: BUCKET = pkgs-$(shell aws sts get-caller-identity --output text --query 'Account')-$(AWS_DEFAULT_REGION)
deploy:
	sam package --output-template-file out.yml --s3-bucket $(BUCKET) --template-file template.yml
	sam deploy --capabilities CAPABILITY_NAMED_IAM --template-file out.yml --stack-name $(APP)
