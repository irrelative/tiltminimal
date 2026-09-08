.PHONY: help install dev build lint test cloc fmt clean validate-table playtest-classic

help:
	@printf "Available targets:\n"
	@printf "  make install  Install npm dependencies\n"
	@printf "  make dev      Start the Vite dev server\n"
	@printf "  make build    Type-check and build production assets\n"
	@printf "  make lint     Run ESLint\n"
	@printf "  make test     Run Vitest\n"
	@printf "  make cloc     Count repository lines of code\n"
	@printf "  make validate-table TABLE=<id>  Run validation against a built-in table implementation\n"
	@printf "  make playtest-classic  Run Classic timing sweeps and seeded games\n"
	@printf "  make fmt      Format the repository with Prettier\n"
	@printf "  make clean    Remove generated build output\n"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

test:
	npm test

cloc:
	cloc --exclude-dir=node_modules,dist,.git .

validate-table:
	npm run validate-table -- $(TABLE)

fmt:
	npm run format

clean:
	rm -rf dist coverage

playtest-classic:
	npm run playtest:classic -- $(ARGS)
