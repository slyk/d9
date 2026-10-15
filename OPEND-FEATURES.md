# Open D features

**Open D** ([slyk/d9](https://github.com/slyk/d9)) is a fork of [d9](https://github.com/LaWebcapsule/d9), itself a fork
of Directus 9. Each Open D release is d9 plus the features listed here. Some of them are offered to d9; others belong
only to Open D.

When d9 ships one of these features, it leaves this list and moves to the [history](#merged-into-d9) at the end.

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

|     | Feature                                                                           | d9 status        | In Open D since | Links                                                                                                                 |
| --- | --------------------------------------------------------------------------------- | ---------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| 🔑  | [Login with OpenID/OAuth2 providers that return no refresh token](#refresh-token) | 💬 `discuss`     | `v12.0.18-od.1` | [ADR-1](_ai/decisions/ADR-1-oauth-optional-refresh-token.md), [d9#401](https://github.com/LaWebcapsule/d9/issues/401) |
| 🎨  | [Project colour as the admin primary colour](#project-colour)                     | 🆕 `new`         | `v12.0.18-od.1` | [ADR-2](_ai/decisions/ADR-2-project-color-as-primary.md)                                                              |
| 🗂️  | ["Indexed" checkbox for fields](#indexed-checkbox)                                | 🆕 `new`         | `v12.0.18-od.1` | [ADR-3](_ai/decisions/ADR-3-field-index-checkbox.md)                                                                  |
| 💎  | [Open D branding and animated login art](#branding)                               | 🏠 `not-planned` | `v12.0.18-od.1` | —                                                                                                                     |

<a id="refresh-token"></a>

### 🔑 Optional refresh token for OpenID and OAuth2 logins

Google and some other identity providers send a refresh token only when the user sees the consent screen. In d9, the
next login of an account that already consented fails with "No [OpenID] Session found".

Open D handles this in two ways:

- **Default:** when no refresh token is stored, the login retries once with `prompt=consent`, which gets a new token.
- **Optional:** `AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN=false` lets users in without a refresh token. Their Directus
  session alone then keeps them logged in.

In both cases a token received earlier is kept on re-login, not erased. Changes since the first version: review
follow-up [slyk/d9#2](https://github.com/slyk/d9/pull/2), in `v12.0.19-od.1`.

<a id="project-colour"></a>

### 🎨 Project colour as the admin primary colour

The "Project Color" from Settings becomes the primary colour of the whole admin UI, not just the logo: buttons, links,
toggles, focus rings and selections. It is used exactly as chosen, in the light and dark themes. Nothing needs to be
configured.

<a id="indexed-checkbox"></a>

### 🗂️ "Indexed" checkbox for fields

Data Model, then a field, then Advanced Field Creation Mode, then the Schema tab: a new **Indexed** checkbox creates or
drops a single-column database index. The checkbox shows the real database state, so it also reflects indexes created in
SQL. A foreign key column shows it checked and disabled. The flag is `schema.is_indexed` in the fields API, and it is
part of schema snapshot, diff and apply.

<a id="branding"></a>

### 💎 Open D branding and animated login art

- The Open D name and symbol replace the d9 ones in the module bar, favicon, PWA manifest and emails.
- The login and other public pages get an animated "crystal parallax" background, tinted with the project colour. A
  custom public background set in Settings still replaces it.

## Coming in the next release

These are merged into Open D `main` or under review. They move to the table above once released.

|     | Feature                                                                                                                                              | d9 status | Links                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------ |
| ↔️  | Resizable sidebar with visible grips, roomier header actions, click the empty sidebar area to close it, first sidebar section kept open across pages | 🆕 `new`  | [ADR-4](_ai/decisions/ADR-4-sidebar-ux.md) |

## Merged into d9

Features that started in Open D and are now part of d9. Open D no longer lists them as its own.

| Feature      | Merged in d9 | Links |
| ------------ | ------------ | ----- |
| _(none yet)_ |              |       |

## Keeping this file current

- When a fork feature is merged into Open D `main`, add it under "Coming in the next release". After the release, move
  it to the Features table with its `In Open D since` tag.
- When the d9 status changes, update the status and the links (issue, discussion, pull request).
- When a d9 release contains the feature, move it to "Merged into d9", with the d9 version.
- Every Open D release note starts with the short feature list (emoji, name, status) and links to this file.
