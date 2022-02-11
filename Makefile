TAGVERSION=$(shell git describe --tag --exact-match 2>/dev/null | sed -e 's/^v//')
DOCKER=docker run \
		-t \
		--rm \
		-v $(shell pwd):/src \
		-w "/src" \
		-u $(shell id -u) \
		-e NODE_OPTIONS"=--openssl-legacy-provider" \
		-e "GRAFANA_API_KEY=$(GRAFANA_API_KEY)"

build:
	$(DOCKER)    node:latest bash -c "yarn install && yarn run build"

buildwatch:
	$(DOCKER)    node:latest bash -c "yarn install && yarn run watch"

buildupgrade:
	$(DOCKER)    node:latest bash -c "yarn upgrade"

buildshell:
	$(DOCKER) -i node:latest bash

buildsign:
	$(DOCKER)    node:latest \
		npx --legacy-peer-deps @grafana/toolkit plugin:sign

grafanadev:
	docker run --rm -it -v $(shell pwd):/var/lib/grafana/plugins/sni-pnp-datasource \
		-p 3000:3000 --name grafana.docker \
		-e "GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=sni-pnp-datasource" \
		-e "GF_USERS_DEFAULT_THEME=light" \
		grafana/grafana

clean:
	rm -rf dist

releasebuild:
	git checkout -b release-$(TAGVERSION)
	make GRAFANA_API_KEY=$(GRAFANA_API_KEY) build buildsign
	git add -f dist
	git commit -m "Release build v$(TAGVERSION)"
	git log -1
	git checkout master

releasepush:
	git push --set-upstream origin release-$(TAGVERSION)
	git checkout master
	git push
	git push --tags
