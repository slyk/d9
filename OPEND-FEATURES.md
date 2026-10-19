# Open D features

**Open D** ([slyk/d9](https://github.com/slyk/d9)) is a fork of [d9](https://github.com/LaWebcapsule/d9), itself a fork
of Directus 9. Each Open D release is d9 plus the features listed here. Some of them are offered to d9; others belong
only to Open D.

When d9 ships one of these features, it leaves this list and moves to the [history](#merged-into-d9) at the end.

## Version numbers

Open D releases are tagged `v<d9 version>-od<N>.<M>`, for example `v12.0.22-od2.1`:

- `N` is the Open D feature set. It goes up when Open D adds or changes a feature. It counts across all d9 versions: the
  same `odN` on two d9 versions means the same Open D features.
- `M` counts the fixes to that feature set: `od2.1`, `od2.2`, … A new feature set starts again without a fix number
  (`od3`).

Older releases used `-od.<N>` (`v12.0.18-od.1`, `v12.0.19-od.1`, `v12.0.20-od.2`).

## Status in d9

| Status           | Meaning                                              |
| ---------------- | ---------------------------------------------------- |
| 🆕 `new`         | In Open D, not offered to d9 yet                     |
| 💬 `discuss`     | Offered to d9 (issue or discussion), being discussed |
| ⏳ `pending`     | Pull request open in d9, waiting for review or merge |
| 🎯 `milestone`   | Accepted by d9 and planned for a release             |
| ⛔ `declined`    | d9 does not want it; it stays in Open D              |
| 🏠 `not-planned` | Open D only by design, never offered to d9           |

## Features

|     | Feature                                            | d9 status        | In Open D since | Links                                                                                                                                                                     |
| --- | -------------------------------------------------- | ---------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🗂️  | ["Indexed" checkbox for fields](#indexed-checkbox) | ⏳ `pending`     | `v12.0.18-od.1` | [ADR-3](_ai/decisions/ADR-3-field-index-checkbox.md), [d9#402](https://github.com/LaWebcapsule/d9/discussions/402), [d9#435](https://github.com/LaWebcapsule/d9/pull/435) |
| 💎  | [Open D branding](#branding)                       | 🏠 `not-planned` | `v12.0.18-od.1` | —                                                                                                                                                                         |

<a id="indexed-checkbox"></a>

### 🗂️ "Indexed" checkbox for fields

Data Model, then a field, then Advanced Field Creation Mode, then the Schema tab: a new **Indexed** checkbox creates or
drops a single-column database index. The checkbox shows the real database state, so it also reflects indexes created in
SQL. A foreign key column shows it checked and disabled. The flag is `schema.is_indexed` in the fields API, and it is
part of schema snapshot, diff and apply.

<a id="branding"></a>

### 💎 Open D branding

The Open D name and symbol replace the d9 ones in the module bar, the logo on the login and shared pages, the favicon,
the PWA manifest, the page title and emails. They stay in Open D only.

## Coming in the next release

These are merged into Open D `main`. They move to the table above once released.

|              | Feature | d9 status | Links |
| ------------ | ------- | --------- | ----- |
| _(none yet)_ |         |           |       |

## Merged into d9

Features that started in Open D and are now part of d9. Open D no longer lists them as its own: they come with d9.

| Feature                                                                                                                                | In Open D since | Released in d9 | Links                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🎨 Project colour as the admin primary colour                                                                                          | `v12.0.18-od.1` | `v12.0.21`     | [ADR-2](_ai/decisions/ADR-2-project-color-as-primary.md), [d9#431](https://github.com/LaWebcapsule/d9/discussions/431), [d9#432](https://github.com/LaWebcapsule/d9/pull/432)                                                                                                                                                                                                               |
| 🔑 Login with OpenID/OAuth2 providers that return no refresh token (`AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN`, consent retry)            | `v12.0.18-od.1` | `v12.0.22`     | [ADR-1](_ai/decisions/ADR-1-oauth-optional-refresh-token.md), [d9#401](https://github.com/LaWebcapsule/d9/issues/401), [d9#430](https://github.com/LaWebcapsule/d9/pull/430)                                                                                                                                                                                                                |
| ✨ Animated login art (crystal background tinted with the project colour)                                                              | `v12.0.18-od.1` | `v12.0.22`     | [d9#431](https://github.com/LaWebcapsule/d9/discussions/431), [d9#447](https://github.com/LaWebcapsule/d9/pull/447)                                                                                                                                                                                                                                                                         |
| ↔️ Resizable sidebar with grips, first section kept open, click empty area to close, header actions collapse only when they do not fit | `v12.0.20-od.2` | `v12.0.22`     | [ADR-4](_ai/decisions/ADR-4-sidebar-ux.md), [d9#431](https://github.com/LaWebcapsule/d9/discussions/431), [d9#433](https://github.com/LaWebcapsule/d9/pull/433), [d9#434](https://github.com/LaWebcapsule/d9/pull/434), [d9#445](https://github.com/LaWebcapsule/d9/pull/445), [d9#446](https://github.com/LaWebcapsule/d9/pull/446), [d9#449](https://github.com/LaWebcapsule/d9/pull/449) |

## Keeping this file current

- When a fork feature is merged into Open D `main`, add it under "Coming in the next release". After the release, move
  it to the Features table with its `In Open D since` tag.
- When the d9 status changes, update the status and the links (issue, discussion, pull request).
- When a d9 release contains the feature, move it to "Merged into d9", with the d9 version.
- Every Open D release note ends with the short feature list (emoji, name, status) and links to this file.
