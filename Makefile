PLUGINNAME=sni-pnp-datasource
TAGVERSION=$(shell git describe --tag --exact-match 2>/dev/null | sed -e 's/^v//')
DOCKER=docker run \
		-t \
		--rm \
		-v $(shell pwd):/src \
		-w "/src" \
		-u $(shell id -u) \
		-e "GRAFANA_API_KEY=$(GRAFANA_API_KEY)"
NODEVERSION=16
export NODE_PATH=$(shell pwd)/node_modules
YARN=yarn --no-default-rc

build:
	$(DOCKER)    --name $(PLUGINNAME)-build        node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run build"

buildwatch:
	$(DOCKER) -i --name $(PLUGINNAME)-buildwatch   node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run watch"

buildupgrade:
	$(DOCKER)    --name $(PLUGINNAME)-buildupgrade node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) upgrade"

buildsign:
	$(DOCKER)    --name $(PLUGINNAME)-buildsign    node:$(NODEVERSION) npx --legacy-peer-deps @grafana/toolkit plugin:sign

prettier:
	$(DOCKER)    --name $(PLUGINNAME)-buildpret    node:$(NODEVERSION) npx prettier --write --ignore-unknown src/

prettiercheck:
	$(DOCKER)    --name $(PLUGINNAME)-buildprtchck node:$(NODEVERSION) npx prettier --check --ignore-unknown src/

buildshell:
	$(DOCKER) -i --name $(PLUGINNAME)-buildshell   node:$(NODEVERSION) bash

grafanadev:
	docker run --rm -it -v $(shell pwd)/dist:/var/lib/grafana/plugins/$(PLUGINNAME) \
		-p 3000:3000 --name $(PLUGINNAME)-grafana \
		-e "GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=$(PLUGINNAME)" \
		-e "GF_USERS_DEFAULT_THEME=light" \
		grafana/grafana

test: build prettiercheck

clean:
	rm -rf dist
	rm -rf node_modules

releasebuild:
	@if [ "x$(TAGVERSION)" = "x" ]; then echo "ERROR: must be on a git tag, got: $(shell git describe --tag --dirty)"; exit 1; fi
	make clean
	make GRAFANA_API_KEY=$(GRAFANA_API_KEY) build buildsign
	mv dist/ $(PLUGINNAME)
	zip $(PLUGINNAME)-$(TAGVERSION).zip $(PLUGINNAME) -r
	rm -rf $(PLUGINNAME)
