.PHONY: lint run

lint:
	@for f in $$(find . -path ./vendor -prune -o -name '*.php' -print); do php -l "$$f" || exit 1; done

run:
	php -S localhost:8000
