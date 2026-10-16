PLUGINNAME=sni-pnp-datasource
TAGVERSION=$(shell git describe --tag --exact-match 2>/dev/null | sed -e 's/^v//')
DOCKER=docker run \
		-t \
		--rm \
		-v $(shell pwd):/src \
		-w "/src" \
		-u $(shell id -u):$(shell id -g) \
		-e "HOME=/src" \
		-e "COREPACK_ENABLE_DOWNLOAD_PROMPT=0" \
		-e "GRAFANA_ACCESS_POLICY_TOKEN=$(GRAFANA_ACCESS_POLICY_TOKEN)"
NODEVERSION=24
# grafana version to check compat against for buildgrafanacompat (a bare version, "latest", etc.)
GRAFANA_COMPAT_TARGET ?= latest
export NODE_PATH=$(shell pwd)/node_modules
YARN=corepack yarn
SHELL=bash

build:
	$(DOCKER)    --name $(PLUGINNAME)-build        node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run build"

buildwatch:
	$(DOCKER) -i --name $(PLUGINNAME)-buildwatch   node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run dev"

# the only targets allowed to modify package.json/yarn.lock (immutable installs are off for them)
buildupgrade:
	$(DOCKER)    --name $(PLUGINNAME)-buildupgrade node:$(NODEVERSION) bash -c "YARN_ENABLE_IMMUTABLE_INSTALLS=false $(YARN) install && YARN_ENABLE_IMMUTABLE_INSTALLS=false $(YARN) upgrade $(filter-out $@,$(MAKECMDGOALS))"

buildyarn:
	$(DOCKER)    --name $(PLUGINNAME)-buildyarn    node:$(NODEVERSION) bash -c "YARN_ENABLE_IMMUTABLE_INSTALLS=false $(YARN) $(filter-out $@,$(MAKECMDGOALS))"

# re-resolve and prune yarn.lock after manual package.json edits (removes orphaned entries)
buildlockfile:
	$(DOCKER)    --name $(PLUGINNAME)-buildlockfile node:$(NODEVERSION) bash -c "YARN_ENABLE_IMMUTABLE_INSTALLS=false $(YARN) install --mode=update-lockfile"

buildgrafanacompat:
	$(DOCKER)    --name $(PLUGINNAME)-buildsign    node:$(NODEVERSION) bash -c "$(YARN) install && npx --yes @grafana/levitate@latest is-compatible --path /src/src//module.ts --target @grafana/data@$(GRAFANA_COMPAT_TARGET),@grafana/ui@$(GRAFANA_COMPAT_TARGET),@grafana/runtime@$(GRAFANA_COMPAT_TARGET)"

buildaudit:
	$(DOCKER)    --name $(PLUGINNAME)-buildaudit   node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) npm audit"

# runs the same lockfile scan the grafana release validator runs (osv-scanner / osv.dev)
buildosv:
	$(DOCKER)    --name $(PLUGINNAME)-buildosv     ghcr.io/google/osv-scanner:latest --lockfile /src/yarn.lock

buildsign:
	$(DOCKER)    --name $(PLUGINNAME)-buildsign    node:$(NODEVERSION) bash -c "$(YARN) install && npx --yes @grafana/sign-plugin@3.3.3"

buildnpm:
	$(DOCKER)    --name $(PLUGINNAME)-buildnpm     node:$(NODEVERSION) bash -c "npm $(filter-out $@,$(MAKECMDGOALS))"

# --no-install: only use the lockfile-pinned local binaries, never a downloaded @latest
prettier:
	$(DOCKER)    --name $(PLUGINNAME)-buildpret    node:$(NODEVERSION) bash -c "$(YARN) install && npx --no-install prettier --write --ignore-unknown src/"

prettiercheck:
	$(DOCKER)    --name $(PLUGINNAME)-buildprtchck node:$(NODEVERSION) bash -c "$(YARN) install && npx --no-install prettier --check --ignore-unknown src/"

eslint:
	$(DOCKER)    --name $(PLUGINNAME)-buildeslint    node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run lint"

eslintfix:
	$(DOCKER)    --name $(PLUGINNAME)-buildeslint    node:$(NODEVERSION) bash -c "$(YARN) install && $(YARN) run lint --fix"

buildshell:
	$(DOCKER) -i --name $(PLUGINNAME)-buildshell   node:$(NODEVERSION) bash

jesttest:
	$(DOCKER)    --name $(PLUGINNAME)-buildprtchck node:$(NODEVERSION) bash -c "$(YARN) install && npx --no-install jest test"

test: build prettiercheck jesttest eslint buildaudit
	-$(MAKE) buildosv

# start a specific grafana version like:
# GRAFANA_VERSION=11.0.0 make dev
dev:
	@mkdir -p dist
	docker compose build
	docker compose up

clean:
	-docker compose rm -f
	-sudo chown $(shell id -u) -R dist node_modules >/dev/null 2>&1 || true
	rm -rf dist
	rm -rf node_modules
	rm -rf .yarn/install-state.gz .yarn/berry
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

