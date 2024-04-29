PLUGINNAME=sni-pnp-datasource
TAGVERSION=$(shell git describe --tag --exact-match 2>/dev/null | sed -e 's/^v//')
DOCKER=docker run \
		-t \
		--rm \
		-v $(shell pwd):/src \
		-w "/src" \
		-u $(shell id -u):$(shell id -g) \
		-e "HOME=/src" \
		-e "GRAFANA_ACCESS_POLICY_TOKEN=$(GRAFANA_API_KEY)"
NODEVERSION=20
export NODE_PATH=$(shell pwd)/node_modules
YARN=yarn

build:
	$(DOCKER)    --name $(PLUGINNAME)-build        node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run build"

buildwatch:
	$(DOCKER) -i --name $(PLUGINNAME)-buildwatch   node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run dev"

buildupgrade:
	$(DOCKER)    --name $(PLUGINNAME)-buildupgrade node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) upgrade"

buildaudit:
	$(DOCKER)    --name $(PLUGINNAME)-buildupgrade node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) audit"

buildsign:
	$(DOCKER)    --name $(PLUGINNAME)-buildsign    node:$(NODEVERSION) bash -c "$(YARN) install && npx @grafana/sign-plugin"

prettier:
	$(DOCKER)    --name $(PLUGINNAME)-buildpret    node:$(NODEVERSION) npx prettier --write --ignore-unknown src/

prettiercheck:
	$(DOCKER)    --name $(PLUGINNAME)-buildprtchck node:$(NODEVERSION) npx prettier --check --ignore-unknown src/

buildshell:
	$(DOCKER) -i --name $(PLUGINNAME)-buildshell   node:$(NODEVERSION) bash

test: build prettiercheck

dev:
	@mkdir -p dist
	docker compose up

clean:
	-docker compose rm -f
	-sudo chown $(shell id -u):$(shell id -g) -R dist node_modules
	rm -rf dist
	rm -rf node_modules
	rm -rf .yarnrc
	rm -rf .npm

releasebuild:
	@if [ "x$(TAGVERSION)" = "x" ]; then echo "ERROR: must be on a git tag, got: $(shell git describe --tag --dirty)"; exit 1; fi
	$(MAKE) clean
	$(MAKE) build
	$(MAKE) GRAFANA_ACCESS_POLICY_TOKEN=$(GRAFANA_API_KEY) buildsign
	mv dist/ $(PLUGINNAME)
	rm -f $(PLUGINNAME)-$(TAGVERSION).zip
	zip $(PLUGINNAME)-$(TAGVERSION).zip $(PLUGINNAME) -r
	rm -rf $(PLUGINNAME)
	@echo "release build successful: $(TAGVERSION)"
	ls -la $(PLUGINNAME)-$(TAGVERSION).zip
