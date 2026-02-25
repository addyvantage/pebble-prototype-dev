# SQL Track Placeholder

This folder is a scaffold for Pebble's future SQL curriculum.

## Planned runtime
- Browser-based SQLite WASM (no backend required).

## Planned task shape
Each SQL task will extend `TaskDefinition` with SQL-specific metadata:
- `schema`: table DDL used to initialize the in-browser database.
- `seedData`: deterministic inserts for repeatable evaluation.
- `expectedResult`: canonical query output for run validation.

## Current status
- Architecture placeholder only.
- No SQL runtime or evaluator implemented yet.

