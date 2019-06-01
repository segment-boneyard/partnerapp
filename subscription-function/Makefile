default: test

test: node_modules
	yarn jest

node_modules:
	yarn install

invoke:
	AWS_DEFAULT_REGION=us-west-2 sam local invoke --event $(EVENT)