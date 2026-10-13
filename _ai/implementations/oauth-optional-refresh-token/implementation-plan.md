# Implementation Plan: Optional IdP refresh token for OAuth2/OpenID logins

**ADR:** ADR-1-oauth-optional-refresh-token
**Date:** 2026-10-12
**Status:** Planning

## Scope

Add a per-provider option `AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN` (default `true`). When set to `false`,
`BaseOAuthDriver.refresh()` (used by both `login()` and `POST /auth/refresh`) no longer rejects a user
whose stored `auth_data` has no `refreshToken`; the session is then governed by the Directus session only.
When a refresh token *is* stored it is still exchanged at the IdP, and a failing exchange (e.g.
`invalid_grant`) still ends the session. Applies to `openid` and `oauth2` drivers (shared base class).

Out of scope: IdP liveness checks without a refresh token (ADR Option D), SAML/LDAP drivers, any UI change.

## Acceptance Criteria

- [ ] AC1: Default (option unset or `true`): behavior identical to today: no refresh token -> `InvalidCredentialsException`
      (login and `/auth/refresh`).
- [ ] AC2: `REQUIRE_REFRESH_TOKEN=false`, no stored token: `refresh()`/`login()` resolve without error and log at debug level; the
      Directus session is created and later renewed via `/auth/refresh`.
- [ ] AC3: `REQUIRE_REFRESH_TOKEN=false`, stored token valid: refreshed at the IdP, rotated token persisted (unchanged behavior).
- [ ] AC4: `REQUIRE_REFRESH_TOKEN=false`, stored token revoked (`invalid_grant`): still rejected (unchanged behavior).
- [ ] AC5: The option is accepted by the env whitelist and string `"false"` / boolean `false` are both honored.
- [ ] AC6: `logout()` unchanged (already tolerates missing token).
- [ ] AC7: Unit tests cover AC1-AC4; `pnpm --filter @wbce-d9/api test` and lint pass.
- [ ] AC8: Docs describe the option, default, and the security trade-off; a changeset is added.
- [ ] AC9: Verified end-to-end on tps-side-dev with Google (no `prompt=consent`): fails before the fix, works after, incl. a
      renewal after `ACCESS_TOKEN_TTL` (temporarily 1m).

## Affected Projects

| Project / Module | Type | Role in feature |
|------------------|------|-----------------|
| `@wbce-d9/api` (`api/`) | Package | driver logic, env whitelist, tests |
| `docs/` | Docs | config option documentation |
| `.changeset/` | Release | changeset for `@wbce-d9/api` (patch/minor) |

## Files to Create

| File | Project | Description |
|------|---------|-------------|
| `.changeset/<random-name>.md` | repo | changeset, `'@wbce-d9/api': minor` (new option) |
| `api/src/auth/drivers/baseoauth.test.ts` | api | unit tests for `refresh()`/`login()` matrix (or extend `openid.test.ts` if simpler) |

## Files to Modify

| File | Project | Changes |
|------|---------|---------|
| `api/src/auth/drivers/baseoauth.ts` | api | `refresh()`: read `requireRefreshToken`; when false and no token, `logger.debug(...)` and return instead of throwing |
| `api/src/env.ts` | api | add `'AUTH_.+_REQUIRE_REFRESH_TOKEN'` to `allowedEnvironmentVars` |
| `docs/self-hosted/config-options.md` | docs | add `AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN` row to OAuth2 and OpenID tables |
| `docs/self-hosted/sso.md` | docs | short note: IdPs that do not return refresh tokens (Google without consent, Azure w/o `offline_access`) |

## Database Changes (Proposals)

None.

## Dependencies

- **External:** none new (`openid-client` v6 already used).
- **Internal:** none.

## Build Order

1. Reproduce on tps-side-dev (record log excerpt for the upstream issue).
2. Tests first (red): matrix in AC1-AC4.
3. `env.ts` whitelist + `baseoauth.ts` change (green).
4. Docs + changeset.
5. Lint (`pnpm lint`), unit tests, typecheck/build of `@wbce-d9/api`.
6. E2E on tps-side-dev (AC9), then PR to `slyk/d9`, deploy to tps-side, drop `AUTH_GOOGLE_PARAMS__PROMPT`.

## Git / Contribution Rules

- Branch `feat/oauth-optional-refresh-token`, based on `upstream/main`; never commit `_ai/` on it.
- Every commit signed off: `git commit -s` (DCO). Commit message references the upstream issue once it exists.
- Clean-room: do not consult or copy Directus 10+ code (BSL).

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lenient mode keeps sessions alive after IdP-side disablement | Med | default stays strict; docs explain; recommend short `REFRESH_TOKEN_TTL` and suspending in d9 |
| Maintainers prefer another flag name/semantics | Low | small diff, easy to rename; discuss in upstream issue before PR |
| `oauth2` driver path differs from `openid` | Low | tests run against the shared base class; manual check only for openid (no oauth2 IdP available) |
