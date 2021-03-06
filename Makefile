.PHONY: build
build: build/production
	web-ext build --source-dir=build/production --overwrite-dest

.PHONY: build/production
build/production: node_modules
	snowpack build --out=$@
	cp -f manifest.json $@
	touch $@

.PHONY: build/development
build/development: node_modules
	snowpack build --out=$@
	cp -f manifest.json $@
	touch $@

.PHONY: build/test
build/test: node_modules
	snowpack build --out=$@
	jq '. * {"options_ui": {"open_in_tab": true}}' manifest.json > $@/manifest.json
	touch $@

.PHONY: clean
clean:
	rm -rf build out web-ext-artifacts

.PHONY: run
run: build/production
	web-ext run --source-dir=build/production

.PHONY: format
format:
	prettier --write src test/unit test/e2e

.PHONY: check
check: build lint test

.PHONY: lint
lint: build/production test/vendor
	tsc --noEmit
	web-ext lint --source-dir=build/production
	prettier --check src test/unit test/e2e

.PHONY: test
test: test/unit test/e2e

.PHONY: test/e2e
test/e2e: build/test test/vendor
	jest test/e2e

.PHONY: test/unit
test/unit:
	jest test/unit

.PHONY: test/e2e/cookie-server
test/e2e/cookie-server:
	find test/e2e/cookie-server | entr -rs './node_modules/.bin/tsc --incremental && node out/test/e2e/cookie-server/main.js'

test/vendor: test/vendor/web-ext/src/firefox/preferences.ts test/vendor/web-ext/src/firefox/remote.ts
	touch $@

test/vendor/web-ext/src/errors.ts: node_modules
	mkdir -p $$(dirname $@)
	(echo '// @ts-nocheck' && flow-to-ts node_modules/web-ext/src/errors.js) > $@

test/vendor/web-ext/src/firefox/preferences.ts: node_modules test/vendor/web-ext/src/errors.ts test/vendor/web-ext/src/util/logger.ts
	mkdir -p $$(dirname $@)
	(echo '// @ts-nocheck' && flow-to-ts node_modules/web-ext/src/firefox/preferences.js) > $@

test/vendor/web-ext/src/firefox/rdp-client.ts: node_modules test/vendor/web-ext/src/errors.ts test/vendor/web-ext/src/util/logger.ts
	mkdir -p $$(dirname $@)
	(echo '// @ts-nocheck' && flow-to-ts node_modules/web-ext/src/firefox/rdp-client.js) > $@

test/vendor/web-ext/src/firefox/remote.ts: node_modules test/vendor/web-ext/src/errors.ts test/vendor/web-ext/src/firefox/rdp-client.ts test/vendor/web-ext/src/util/logger.ts
	mkdir -p $$(dirname $@)
	(echo '// @ts-nocheck' && flow-to-ts node_modules/web-ext/src/firefox/remote.js) > $@

test/vendor/web-ext/src/util/logger.ts: node_modules
	mkdir -p $$(dirname $@)
	(echo '// @ts-nocheck' && flow-to-ts node_modules/web-ext/src/util/logger.js) > $@

node_modules: package.json
	npm install
	touch $@
