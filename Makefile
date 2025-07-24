PLUGINNAME=sni-pnp-datasource
TAGVERSION=$(shell git describe --tag --exact-match 2>/dev/null | sed -e 's/^v//')
DOCKER=docker run \
		-t \
		--rm \
		-v $(shell pwd):/src \
		-w "/src" \
		-u $(shell id -u):$(shell id -g) \
		-e "HOME=/src" \
		-e "GRAFANA_ACCESS_POLICY_TOKEN=$(GRAFANA_ACCESS_POLICY_TOKEN)"
NODEVERSION=20
export NODE_PATH=$(shell pwd)/node_modules
YARN=yarn
SHELL=bash

build:
	$(DOCKER)    --name $(PLUGINNAME)-build        node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run build"

buildwatch:
	$(DOCKER) -i --name $(PLUGINNAME)-buildwatch   node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run dev"

buildupgrade:
	rm -f package-lock.json
	$(DOCKER)    --name $(PLUGINNAME)-buildupgrade node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) upgrade $(filter-out $@,$(MAKECMDGOALS))"

buildyarn:
	$(DOCKER)    --name $(PLUGINNAME)-buildyarn    node:$(NODEVERSION) bash -c "$(YARN) $(filter-out $@,$(MAKECMDGOALS))"

buildaudit:
	$(DOCKER)    --name $(PLUGINNAME)-buildaudit   node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) audit"

buildsign:
	$(DOCKER)    --name $(PLUGINNAME)-buildsign    node:$(NODEVERSION) bash -c "$(YARN) install && npx @grafana/sign-plugin"

buildnpm:
	$(DOCKER)    --name $(PLUGINNAME)-buildnpm     node:$(NODEVERSION) bash -c "npm $(filter-out $@,$(MAKECMDGOALS))"

prettier:
	$(DOCKER)    --name $(PLUGINNAME)-buildpret    node:$(NODEVERSION) npx prettier --write --ignore-unknown src/

prettiercheck:
	$(DOCKER)    --name $(PLUGINNAME)-buildprtchck node:$(NODEVERSION) npx prettier --check --ignore-unknown src/

buildshell:
	$(DOCKER) -i --name $(PLUGINNAME)-buildshell   node:$(NODEVERSION) bash

test: build prettiercheck

# start a specific grafana version like:
# GRAFANA_VERSION=11.0.0 make dev
dev:
	@mkdir -p dist
	docker compose build
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
	$(MAKE) GRAFANA_ACCESS_POLICY_TOKEN=$(GRAFANA_ACCESS_POLICY_TOKEN) buildsign
	mv dist/ $(PLUGINNAME)
	rm -f $(PLUGINNAME)-$(TAGVERSION).zip
	zip $(PLUGINNAME)-$(TAGVERSION).zip $(PLUGINNAME) -r
	rm -rf $(PLUGINNAME)
	@echo "release build successful: $(TAGVERSION)"
	ls -la $(PLUGINNAME)-$(TAGVERSION).zip

# just skip unknown make targets
.DEFAULT:
	@if [[ "$(MAKECMDGOALS)" =~ ^buildupgrade ]] || [[  "$(MAKECMDGOALS)" =~ ^buildyarn ]] || [[  "$(MAKECMDGOALS)" =~ ^buildnpm ]] ; then \
		: ; \
	else \
		echo "unknown make target(s): $(MAKECMDGOALS)"; \
		exit 1; \
	fi

