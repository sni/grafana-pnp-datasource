PLUGINNAME=sni-pnp-datasource
TAGVERSION=$(shell git describe --tag --exact-match 2>/dev/null | sed -e 's/^v//')
DOCKER=docker run \
		-t \
		--rm \
		-v $(shell pwd):/src \
		-w "/src" \
		-u $(shell id -u) \
		-e "GRAFANA_API_KEY=$(GRAFANA_API_KEY)"

build:
	$(DOCKER)    --name $(PLUGINNAME)-build        node:latest bash -c "yarn install && yarn run build"

buildwatch:
	$(DOCKER) -i --name $(PLUGINNAME)-buildwatch   node:16 bash -c "yarn install && yarn run watch"

buildupgrade:
	$(DOCKER)    --name $(PLUGINNAME)-buildupgrade node:latest bash -c "yarn install && yarn upgrade"

buildsign:
	$(DOCKER)    --name $(PLUGINNAME)-buildsign    node:latest npx --legacy-peer-deps @grafana/toolkit plugin:sign

buildshell:
	$(DOCKER) -i --name $(PLUGINNAME)-buildshell   node:latest bash

grafanadev:
	docker run --rm -it -v $(shell pwd)/dist:/var/lib/grafana/plugins/$(PLUGINNAME) \
		-p 3000:3000 --name $(PLUGINNAME)-grafana \
		-e "GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=$(PLUGINNAME)" \
		-e "GF_USERS_DEFAULT_THEME=light" \
		grafana/grafana

clean:
	rm -rf dist

releasebuild:
	@if [ "x$(TAGVERSION)" = "x" ]; then echo "ERROR: must be on a git tag, got: $(shell git describe --tag --dirty)"; exit 1; fi
	make clean
	make GRAFANA_API_KEY=$(GRAFANA_API_KEY) build buildsign
	mv dist/ $(PLUGINNAME)
	zip $(PLUGINNAME)-$(TAGVERSION).zip $(PLUGINNAME) -r
	rm -rf $(PLUGINNAME)
