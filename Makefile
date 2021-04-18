.PHONY: build
build:
	snowpack build
	touch $@

.PHONY: test
test: test/unit test/e2e

.PHONY: test/e2e
test/e2e: build test/vendor
	jest test/e2e

.PHONY: test/unit
test/unit: build
	jest test/unit

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
