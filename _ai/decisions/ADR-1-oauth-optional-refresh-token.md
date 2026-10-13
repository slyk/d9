# ADR-1: Optional IdP refresh token for OAuth2/OpenID logins

**Date:** 2026-10-12
**Status:** Implemented (slyk/d9 PR #1, merged 2026-10-13; deployed to tps-side)
**Deciders:** Kyrylo Kuzmytskyi (approved 2026-10-12: Option B, flag name `REQUIRE_REFRESH_TOKEN`)

## Context

With the `openid` (and `oauth2`) driver, a user can authenticate successfully at the identity provider
and still be rejected by d9 with `INVALID_CREDENTIALS` and the server log
`ERROR: No [OpenID] Session found`.

Reproduced on tps-side with Google as the IdP:

1. Google only returns a `refresh_token` when it shows the consent screen. If the account already granted
   the OAuth client before (here: the same Google client is used by tps-ddev), Google skips consent and
   returns no refresh token.
2. `BaseOAuthDriver.getUserID()` then stores `auth_data = null` (`baseoauth.ts:86`, added by upstream
   #251 for issue #127 to avoid an empty-update crash).
3. `AuthenticationService.login()` calls `provider.login()` which calls `BaseOAuthDriver.refresh()`.
   With no `auth_data.refreshToken` it throws `InvalidCredentialsException` (`baseoauth.ts:196-199`,
   comment "If no auth connexion, throw user out", introduced deliberately in upstream #45).

The same `refresh()` is also called on every `POST /auth/refresh` (`authentication.ts:316`), i.e. every
access-token renewal (`ACCESS_TOKEN_TTL`, 15 min by default). So fixing only the login path would
move the failure to the first renewal.

Upstream #251 only fixed the crash, not the rejection. A commenter on #127 reports the same with
Azure AD. Upstream maintainers stated they cannot copy Directus' own fix because of its Business
Source License, so the solution must be an independent implementation (no code taken from Directus 10+).

Current workaround on tps-side: `AUTH_GOOGLE_PARAMS__PROMPT="consent"` forces the consent screen on every
login so Google always returns a refresh token. It works but is Google-specific and annoying (consent
screen every login).

## Requirements

- [ ] R1: A user authenticated by the IdP can log in and keep a session even when the IdP returns no
      refresh token, **when the operator opts in**.
- [ ] R2: Default behavior is unchanged (backward compatible; strict mode stays the default).
- [ ] R3: Both entry points are covered: login and `/auth/refresh`.
- [ ] R4: If a refresh token *is* stored, it is still validated against the IdP exactly as today
      (a revoked grant still ends the session).
- [ ] R5: Covers both `openid` and `oauth2` drivers (shared base class).
- [ ] R6: Unit tests for strict/lenient x token/no-token; docs and a changeset.
- [ ] R7: Clean-room implementation, GPLv3-compatible, no Directus 10+ code.

## Affected Areas

### Backend
- `api/src/auth/drivers/baseoauth.ts` — `refresh()` (and thereby `login()`) honors the new option;
  `logout()` already tolerates a missing token.
- `api/src/env.ts` — whitelist the new `AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN` variable.

### Docs
- `docs/self-hosted/config-options.md`, `docs/self-hosted/sso.md` — document the option and its
  security trade-off.

### Tests
- `api/src/auth/drivers/baseoauth` / `openid.test.ts` — new cases.

### Database
- None.

## Options Considered

### Option A: Config only (status quo): `AUTH_<P>_PARAMS__PROMPT=consent`

**Description:** Keep the code, force consent on every login.

**Pros:** no code change; already deployed on tps-side.
**Cons:** Google-specific; consent screen on every login; does not help IdPs that never issue refresh
tokens (e.g. Azure AD without `offline_access`); upstream bug remains.

### Option B: Opt-in flag `AUTH_<P>_REQUIRE_REFRESH_TOKEN` (default `true`)

**Description:** When set to `false`, `refresh()` returns successfully if no refresh token is stored
(Directus session only). If a token is stored it is validated as today. Default `true` keeps the
current strict behavior.

**Pros:** backward compatible; small, reviewable diff; fixes login and renewal in one place; fixes both
drivers; upstream-friendly (no silent security change).
**Cons:** a new config option; in lenient mode IdP-side revocation/disablement is not noticed until
the Directus session (`REFRESH_TOKEN_TTL`, default 7 d) expires, unless the user is suspended in d9.

### Option C: Always lenient (remove the throw)

**Description:** Treat a missing refresh token as normal for everyone.

**Pros:** simplest.
**Cons:** silently weakens a deliberate upstream security property for all deployments; unlikely to be
accepted upstream.

### Option D: Validate liveness without a refresh token (userinfo / token introspection)

**Description:** Without a refresh token, call the IdP's userinfo endpoint with the access token on each
renewal.

**Pros:** keeps some IdP-side revocation.
**Cons:** the access token is short-lived and not stored, so it is not available at renewal time; would
require storing it; much bigger scope.

## Decision

**Chosen option:** Option B (approved).

**Rationale:** It removes the failure for operators who accept the trade-off, preserves upstream's
strict default, and is small enough to be a credible upstream PR. Option A remains available as a
per-deployment workaround.

## Consequences

- Operators can disable the refresh-token requirement per provider; no more forced consent screens.
- In lenient mode the IdP is not re-checked at renewal when no token is stored: document this and
  recommend a shorter `REFRESH_TOKEN_TTL` and suspending users in d9.
- tps-side can drop `AUTH_GOOGLE_PARAMS__PROMPT` once the option is deployed.
- The fork will carry this change even if LaWebcapsule/d9 does not accept it; the branch is based on
  `upstream/main` so it merges/rebases cleanly.

## Open Issues & Blockers

### Issue 1: Upstream issue / discussion
**Status:** Filed: LaWebcapsule/d9#401 (awaiting maintainer response; upstream PR not opened yet)
**Description:** Upstream requires an open, labeled issue (or an accepted Discussion) before a PR.
Proposal: open a Discussion referencing #127/#251 and this ADR's context section.

### Issue 2: Option name
**Status:** Resolved
**Description:** `AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN` (default `true`) is proposed. Alternative:
`..._ALLOW_MISSING_REFRESH_TOKEN` (default `false`). Maintainers may prefer either.

### Issue 3: Test environment
**Status:** Resolved
**Description:** Dev instance at https://tps-side-dev.toopro.org (DB `tps_side_dev`, port 8091),
Google client without `prompt=consent`, so the bug is reproducible there before the fix.
