export AWS_DEFAULT_REGION ?= us-west-2
APP ?= slacker

TYPESCRIPT_VERSION=3.4.5
INSTALL_DIR=./node_modules/typescript/bin/
TSC=$(INSTALL_DIR)tsc

build:
	$(TSC)

deps:
	yarn add -D typescript@$(TYPESCRIPT_VERSION)
	yarn install

deploy: BUCKET = pkgs-$(shell aws sts get-caller-identity --output text --query 'Account')-$(AWS_DEFAULT_REGION)
deploy: build
	sam package --output-template-file out.yml --s3-bucket $(BUCKET) --template-file template.yml
	sam deploy --capabilities CAPABILITY_NAMED_IAM --template-file out.yml --stack-name $(APP)

invoke: build
	sam local invoke --event event.json

test: build
	npm test
