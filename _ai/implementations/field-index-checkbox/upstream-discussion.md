# Draft: upstream GitHub Discussion (Ideas) for LaWebcapsule/d9

**Title:** "Indexed" checkbox when creating a field (advanced mode)

## Problem

In Data Model → field → advanced field creation mode, the Schema tab offers *Nullable* and *Unique*, but no way to ask for a
plain database index. On tables with many items, filtering and sorting by a field is slow until someone creates an index by hand
in SQL, and d9 neither shows nor preserves that index (snapshots ignore it).

## Proposal

- New checkbox **Indexed** next to *Unique*. Checked on create → the column gets a single-column, non-unique index
  (Knex default name `<table>_<column>_index`). Unchecking on an existing field drops it.
- The state lives in the database: the schema inspector reports a new `schema.is_indexed` boolean for every column
  (single-column, non-unique, non-primary index). It is therefore also available in the fields REST API, GraphQL and
  `schema snapshot|diff|apply`. Snapshots taken before the property existed do not produce a diff.
- Not offered for alias, primary key or generated fields; shown checked and locked for unique columns and for indexed foreign
  keys (MySQL needs that index for the constraint).
- No migration, no change to system tables, nothing changes unless the box is used.

## Status

Implemented and running on a fork (https://github.com/slyk/d9, commit 1fe29969d) on MariaDB. Unit tests for SQLite; the
queries for Postgres, CockroachDB, MSSQL and Oracle are written but not yet run against live servers. Happy to open a PR
based on `upstream/main` if the idea is accepted.

## Questions for maintainers

1. Is a new required `Column.is_indexed` property acceptable (it touches the `@wbce-d9/schema` public type)?
2. Should unchecking drop only the Knex-named index (current behaviour), or any single-column index?
