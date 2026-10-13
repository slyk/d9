# ADR-3: "Indexed" checkbox for fields (advanced field creation)

**Date:** 2026-10-13
**Status:** Implemented (slyk/d9 `main` a6cea2dec, deployed to tps-side 2026-10-13, create and drop verified in the UI on MariaDB). Upstream Discussion not posted yet.
**Deciders:** Kyrylo Kuzmytskyi (requested 2026-10-13: a checkbox in the advanced field creation mode that makes the DB column indexed; the
state must live in the DB column schema, not in Directus metadata). Built directly on tps-side (only one test table there), then
sent upstream via a GitHub Discussion. Approved 2026-10-13 with all four recommendations; one refinement from the approver: a
foreign key column shows the checkbox **checked and disabled** so the user can see that the index exists.

## Context

Data Model → field → **Advanced Field Creation Mode** → "Schema" tab (`field-detail-advanced-schema.vue`) already has two
column-level flags: *Nullable* and *Unique*. There is no way to ask for a plain (non-unique) index; admins have to create indexes
by hand in SQL, and Directus never shows or preserves them.

How the existing flags travel through the code (the new flag has to follow the same path):

1. **UI:** `syncFieldDetailStoreProperty('field.schema.is_unique', false)` → `v-checkbox` in the schema tab.
2. **API write:** `FieldsService.addColumnToTable(table, field, alter)` (`api/src/services/fields.ts`, ~L648) maps
   `field.schema.is_unique` to `column.unique()` on create and `table.dropUnique([field])` on alter. It is called from
   `createField` (create) and `updateField` (alter, only when `!isEqual(sanitizeColumn(existingColumn), field.schema)`).
3. **API read:** `schemaInspector.columnInfo()` from `packages/schema` (`@wbce-d9/schema`) builds a `Column` object per dialect
   (`mysql`, `postgres`, `cockroachdb`, `sqlite`, `mssql`, `oracledb`; `Column` is in `packages/schema/src/types/column.ts`),
   including `is_unique` (MySQL: `COLUMN_KEY = 'UNI'`, Postgres: `pg_constraint` types `u`/`p`, SQLite: `PRAGMA index_list`,
   MSSQL: `sys.indexes`, Oracle: `USER_CONSTRAINTS`).
4. **Snapshots / diff:** `api/src/utils/sanitize-schema.ts` whitelists the column properties (`sanitizeColumn`, `sanitizeField`),
   which is what `schema snapshot|diff|apply` compare.
5. **GraphQL:** `api/src/services/graphql/index.ts` (~L2475) declares the `schema` object type with `is_unique: GraphQLBoolean`.

Facts that matter for the design:

- The inspector only knows about **constraints** for `is_unique` today. A plain index is not a constraint (in Postgres it is in
  `pg_index`, not `pg_constraint`; in MySQL it is `COLUMN_KEY = 'MUL'`, which is also set for foreign keys and for the first
  column of a composite index), so reading it needs a dedicated query per dialect.
- Knex `column.index()` creates `<table>_<column>_index`; `table.dropIndex([column])` derives the same name.
- A unique column already has an index, so *Unique* and *Indexed* are mutually exclusive in the UI.
- `meta.*` (stored in `directus_fields`) would be simpler but would drift from reality as soon as someone runs `CREATE INDEX` or
  `DROP INDEX` outside Directus. The requester explicitly wants the DB schema as the source of truth.

## Requirements

- [ ] R1: In advanced field creation mode there is an **Indexed** checkbox; when checked on create, the column gets a non-unique
      index.
- [ ] R2: The checkbox reflects the real DB state when an existing field is opened, and un-checking it drops the index (and
      checking it later adds it).
- [ ] R3: Not offered (hidden or disabled) for alias fields, primary keys, generated columns and unique columns.
- [ ] R4: `schema.is_indexed` is exposed by the REST/GraphQL fields API, and is part of `schema snapshot|diff|apply`.
- [ ] R5: No migration and no change to system tables; behaviour for existing instances is unchanged unless the box is used.
- [ ] R6: Works on MariaDB/MySQL (the tps-side database) and SQLite and Postgres at minimum; other dialects best effort.
- [ ] R7: Small and reviewable as an upstream proposal (no unrelated refactoring).

## Affected Areas

### Schema inspector (`packages/schema`)
- `types/column.ts`: `is_indexed: boolean`.
- `dialects/{mysql,postgres,cockroachdb,sqlite,mssql,oracledb}.ts`: fill `is_indexed` = the column is the **only** column of a
  non-unique, non-primary index. Composite indexes do not count (the checkbox cannot represent them and must not drop them).
- `overview()` is not touched (it is a perf-oriented query and the flag is not needed there).

### API (`api`)
- `services/fields.ts` `addColumnToTable`: `is_indexed === true` → `column.index()` (when creating or when `alter.is_indexed` was
  false); `is_indexed === false` and `alter?.is_indexed === true` → `table.dropIndex([field])`. Skipped for primary keys and
  unique columns, same style as the existing `is_unique` block.
- `utils/sanitize-schema.ts`: add `schema.is_indexed` / `is_indexed` to the two whitelists.
- `services/graphql/index.ts`: `is_indexed: GraphQLBoolean`.
- Tests: `fields.test.ts` (create, alter on/off), `sanitize-schema.test.ts`, `specifications.test.ts` fixtures if needed.

### App (`app`)
- `field-detail-advanced-schema.vue`: one more checkbox next to *Unique* (`syncFieldDetailStoreProperty('field.schema.is_indexed',
  false)`), disabled while *Unique* is on or the field is generated, hidden for alias/primary key.
- `lang/translations/en-US.yaml`: `indexed` and `value_indexed` (only English; other locales come from Crowdin).
- `docs/` field reference: the new `schema.is_indexed` property.

### Not touched
- Database migrations, `directus_fields` / `meta`, the simple (non-advanced) field creation flow, relations.

## Options Considered

### Option A: `schema.is_indexed`, real index created and read from the DB (recommended)
Matches the requirement literally and follows the exact path of `is_unique`, so reviewers find nothing unfamiliar.
- Pros: DB is the source of truth, visible in snapshots, works for fields created before the feature if the index already exists.
- Cons: one introspection query to write and test per dialect (6); edge cases listed under Open Issues.

### Option B: Store `meta.indexed` and apply it as DDL
- Pros: no inspector change.
- Cons: two sources of truth that can disagree; contradicts "saved in DB column schema". Rejected.

### Option C: Option A for MySQL/MariaDB only first
- Pros: smallest first step for the fork (tps-side runs MariaDB).
- Cons: unusable as an upstream proposal; the flag would be silently `false` on other dialects. Reasonable as the *build order*
  inside Option A (MySQL → SQLite → Postgres → the rest), not as the scope.

## Decision (proposed)

**Option A**, built in the order MySQL/MariaDB → SQLite → Postgres/Cockroach → MSSQL/Oracle. Open choices for the approver
(recommended answer first):

1. **What counts as indexed:** only a single-column, non-unique, non-primary index **vs.** any index that contains the column
   (MySQL `MUL`). Recommended: single-column only, so composite indexes created by hand are never shown as "checked" nor dropped.
2. **Drop behaviour:** unchecking drops the index by the Knex default name (`<table>_<column>_index`). An index with another name
   (created by hand) will show as checked but dropping it fails with a DB error (translated, nothing half-applied). **vs.** also
   return the real index name from the inspector and drop that. Recommended: default name only, document it; revisit if upstream asks.
3. **Foreign key columns** (MySQL creates an index for every FK automatically): the checkbox is disabled for relational columns
   **vs.** left enabled. Recommended: disabled when the column has a foreign key, because dropping that index is refused by MySQL.
4. **Rollout:** commits made directly on tps-side `main` (as ADR-2), each of them touching only feature files (no `_ai/`, branding
   or `DEPLOY.md`), signed off (`git commit -s`) with a changeset, so they can be cherry-picked onto a branch from `upstream/main`.
   Upstream: a GitHub **Discussion** (features are not accepted as issues, `contributing.md`) with the problem, the UI mock and this
   design; the PR follows only after it is accepted. Nothing is posted upstream without your go-ahead.

## Consequences

- `Column` (a public type of `@wbce-d9/schema`) gains a field; extensions that construct `Column` objects by hand must add it.
- Snapshots taken before this change have no `is_indexed`, so a `schema diff` of an old snapshot against a new instance would see
  every indexed column as changed. Mitigation: treat a missing value as `false` when diffing (to be verified in `get-snapshot-diff`).
- On SQLite, knex `alter()` rebuilds the table; the index must be recreated afterwards (to be covered by a test).
- Index creation on a large table can lock it; the UI gets no warning in this version.

## Open Issues & Blockers

- None blocking. Needs the four choices above.
- To verify while implementing: Postgres/Cockroach `pg_index` query for single-column indexes, MSSQL's existing join in
  `columnInfo` (already exposes `is_unique` per single-column index), Oracle `USER_IND_COLUMNS`.

## Implementation notes (2026-10-13)

- Built as proposed. Inspector: MySQL/MariaDB (`INFORMATION_SCHEMA.STATISTICS`, one extra query per `columnInfo`), Oracle
  (`USER_IND_COLUMNS`), Postgres/Cockroach (`pg_index`, one extra query), SQLite (`PRAGMA index_list`/`index_info`), MSSQL
  (existing index join, new `is_indexed` flag). Tested for real: SQLite (unit tests in `api/src/services/fields.test.ts`) and
  MariaDB (scratch table: create, uncheck, recheck, unique, composite not counted). Postgres, Cockroach, MSSQL and Oracle are
  written but **not run against a live server**; say so in the upstream Discussion.
- UI: the checkbox shows checked + disabled when the field is unique (the unique constraint is an index) and when it is a
  foreign key whose column is already indexed. Unchecked FK columns (e.g. on Postgres, which does not auto-index FKs) stay
  editable.
- API: `is_indexed: true` is ignored for primary key / unique columns; turning *Unique* on drops an existing plain index.
- Snapshot diff ignores `is_indexed` when the target snapshot lacks it (old snapshots).
- `Column.is_indexed` is a required property; test fixtures that build `Column` objects needed `is_indexed: false`.
- Checkbox label shortened to "Add database index" (`value_indexed`), the first wording did not fit the half-width column.
- Verified by the approver in the UI on tps-side: checking the box on `test.title` created `test_title_index`, unchecking it dropped it.
