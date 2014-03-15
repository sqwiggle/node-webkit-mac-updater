REPORTER = 'dot'

test:
		@NODE_ENV=test ./node_modules/.bin/mocha \
			--reporter $(REPORTER) \
			$(TESTS)

test-w:
		@NODE_ENV=test ./node_modules/.bin/mocha \
			--require should \
			--reporter $(REPORTER) \
			--watch
			$(TESTS)