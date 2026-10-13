# Progress: Optional IdP refresh token for OAuth2/OpenID logins

**ADR:** ADR-1-oauth-optional-refresh-token
**Started:** 2026-10-12
**Status:** Complete in fork; upstream PR pending

## Phase 1: DECIDE
- [x] ADR created and approved (Option B, `REQUIRE_REFRESH_TOKEN`)

## Phase 2: PLAN
- [x] Implementation plan created
- [x] Backend implementation spec created
- [x] Plan approved by user (2026-10-12)

## Phase 3: BUILD

### Upstream
- [x] Upstream issue filed (bug report): https://github.com/LaWebcapsule/d9/issues/401

### Reproduce
- [x] Reproduce on tps-side-dev (no prompt=consent): 3 failed Google logins 2026-10-13 02:46/02:47/03:03, log `ERROR: No [OpenID] Session found`, `auth_data` stays NULL

### Backend
- [x] Tests written first (red)
- [x] `env.ts` whitelist
- [x] `baseoauth.ts` change (green)
- [x] Lint + unit tests + api build pass

### Docs / Release
- [x] docs/self-hosted/config-options.md
- [x] docs/self-hosted/sso.md
- [x] changeset

### Integration
- [x] E2E on tps-side-dev incl. renewal after short ACCESS_TOKEN_TTL (AC9)
- [x] PR to slyk/d9, merged
- [x] Deployed to tps-side (main d4ab304, API-only rebuild); `AUTH_GOOGLE_PARAMS__PROMPT` removed, `AUTH_GOOGLE_REQUIRE_REFRESH_TOKEN=false` set (Google login re-verification: see notes)
- [ ] PR to LaWebcapsule/d9 (after the issue is accepted)
- [x] Architecture docs updated (_ai/architecture.md)

## Blockers

| Date | Blocker | Resolution |
|------|---------|------------|
| | | |

## Notes

- Dev instance: https://tps-side-dev.toopro.org (DB tps_side_dev, port 8091), worktree /var/www/tps-side-dev
- Commit 998b559 on feat/oauth-optional-refresh-token (signed off). api: 683 tests pass, eslint + tsc clean; docs md files were already unformatted at HEAD so prettier was not applied to them.
- Dev instance now has AUTH_GOOGLE_REQUIRE_REFRESH_TOKEN=false and ACCESS_TOKEN_TTL=1m for AC9; restore ACCESS_TOKEN_TTL to 15m afterwards.
- Note: invalid_grant surfaces as InvalidTokenException (not InvalidCredentialsException).
- 2026-10-13: slyk/d9 PR #1 merged (d4ab304). Prod .env was backed up before the switch. Dev ACCESS_TOKEN_TTL restored to 15m.
