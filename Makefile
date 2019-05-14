.PHONY: build watch clean install
default: build

TYPESCRIPT_VERSION=3.4.5
INSTALL_DIR=./node_modules/typescript/bin/
TSC=$(INSTALL_DIR)tsc

build:
	$(TSC)

install:
	yarn add -D typescript@$(TYPESCRIPT_VERSION)

test: build
	npm test