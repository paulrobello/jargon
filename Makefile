.PHONY: install dev run build test lint fmt typecheck checkall pre-commit pre-commit-update

install:
	npm install

dev:
	npm run dev

run: dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

fmt:
	npm run fmt

typecheck:
	npm run typecheck

checkall:
	npm run checkall

pre-commit:
	pre-commit run --all-files

pre-commit-update:
	pre-commit autoupdate
