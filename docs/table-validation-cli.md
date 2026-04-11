# Table Validation CLI

This document defines the command-line entrypoint for validating built-in table
implementations.

## Goal

The CLI makes it possible to run the same validation and analysis checks used
by the codebase without opening the browser editor.

This is intended for:

- local table authoring
- agent workflows
- pre-commit spot checks
- validating shipped built-in tables from the terminal

## Entry Points

Use either:

- `npm run validate-table -- <built-in-table-id>`
- `npm run validate-table -- --all`
- `make validate-table TABLE=<built-in-table-id>`

Examples:

```sh
npm run validate-table -- classic-table
npm run validate-table -- starlight-em --fail-on-warnings
npm run validate-table -- --all
make validate-table TABLE=harlem-globetrotters
```

## Scope

The CLI currently validates built-in tables registered in
`src/boards/table-library.ts`.

Supported ids include:

- `classic-table`
- `harlem-globetrotters`
- `starlight-em`

## Checks Run

For each selected table, the CLI runs:

1. `validateCompiledBoardLayout(...)` from `src/boards/layout-validation.ts`
2. `analyzeBoard(...)` from `src/editor/table-analysis.ts`

That means the CLI reports both:

- layout validation diagnostics
- editor-style advisory analysis warnings

## Output

For each table, the CLI prints:

- the table id and display name
- layout error count
- layout warning count
- analysis warning count
- each issue with its source and code

Issue sources are:

- `layout`
- `analysis`

## Exit Status

Default behavior:

- exits non-zero if any layout errors are found
- does not fail on warnings alone

Optional behavior:

- `--fail-on-warnings` makes any warning or error produce a non-zero exit code

## Constraints

- the CLI only targets built-in table implementations at the moment
- it does not load browser-local custom tables
- it does not yet validate arbitrary module paths
