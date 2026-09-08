# Table Validation CLI

This document defines the command-line entrypoint for validating built-in table
implementations.

## Goal

The CLI makes it possible to run the same validation and analysis checks used
by the codebase without opening the browser.

This is intended for:

- local table authoring
- agent workflows
- pre-commit spot checks
- validating shipped built-in tables from the terminal

## Entry Points

Use the Makefile entrypoint:

```sh
make validate-table TABLE=classic-table
make validate-table TABLE=harlem-globetrotters
make validate-table TABLE='classic-table --deep-playability --fail-on-warnings'
make validate-table TABLE='--all --deep-playability --fail-on-warnings'
```

The underlying npm entrypoint remains `npm run validate-table -- <arguments>`.
For layout acceptance, use the all-table command and follow the
[shared layout requirements](conventional-layout-guidelines.md).

## Scope

The CLI currently validates built-in tables registered in
`src/boards/table-library.ts`.

Supported ids include:

- `classic-table`
- `andromeda`
- `double-crossed`
- `harlem-globetrotters`
- `mirror-match`
- `starlight-em`

## Checks Run

For each selected table, the CLI runs:

1. `validateCompiledBoardLayout(...)` from `src/boards/layout-validation.ts`
2. `analyzeBoard(...)` from `src/validation/table-analysis.ts`
3. `analyzePlayability(...)` from `src/validation/table-playability.ts`

That means the CLI reports both:

- layout validation diagnostics
- advisory geometry analysis warnings
- simulation-based playability errors and warnings

## Output

For each table, the CLI prints:

- the table id and display name
- layout error count
- layout warning count
- analysis warning count
- playability error and warning counts
- each issue with its source and code

Issue sources are:

- `layout`
- `analysis`
- `playability`

## Exit Status

Default behavior:

- exits non-zero if any layout or playability errors are found
- does not fail on warnings alone

Optional behavior:

- `--fail-on-warnings` makes any warning or error produce a non-zero exit code
- `--deep-playability` uses denser dropped-ball sampling for manual review

## Coverage limits

Route checks execute only the contracts present on a board. A passing report
cannot prove an undeclared center drain or feed works. Authors must supply
center-drain routes and held feeds for every flipper, then inspect them in the
browser. Deep mode adds passive-drop sampling, not exhaustive player inputs.

## Constraints

- the CLI only targets built-in table implementations at the moment
- it does not load browser-local custom tables
- it does not yet validate arbitrary module paths


## Assembly routes

Normal and deep validation both execute any `board.routes` contracts. Failures
appear as `playability:route-failed`, identifying the route, sample, and unmet
goal. They count as errors, so a broken feed or return fails the command even
without `--fail-on-warnings`. See [board-assemblies.md](board-assemblies.md).
