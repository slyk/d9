# Architecture notes (fork-specific)

Only what matters for fork changes; the upstream docs live in `docs/`.

## External-provider authentication (openid / oauth2)

- Drivers: `api/src/auth/drivers/{openid,oauth2}.ts`, both extend `baseoauth.ts` (`BaseOAuthDriver`).
- Login: `GET /auth/login/<provider>` -> IdP -> `GET /auth/login/<provider>/callback` ->
  `getUserID()` (matches `directus_users.external_identifier`; no matching by email; the user's `provider` must equal the
  provider name) -> `AuthenticationService.login()` -> `driver.login()` which calls `refresh()`.
- Renewal: `POST /auth/refresh` -> `AuthenticationService.refresh()` -> `driver.refresh()` again, on every access-token renewal
  (`ACCESS_TOKEN_TTL`). So login and renewal share one check.
- `getUserID()` overwrites `directus_users.auth_data` with the token set's refresh token, or `null` if the IdP returned none.
- `refresh()` exchanges the stored refresh token at the IdP. With no stored token it rejects, unless
  `AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN=false` (ADR-1), in which case the Directus session
  (`directus_sessions`, `REFRESH_TOKEN_TTL`) alone keeps the user logged in. Revocation at the IdP is then not noticed until
  that session expires.
- Gotchas: a user with `provider != 'default'` cannot use password login; Google returns a refresh token only on the
  consent screen; env values `"true"/"false"` are cast to booleans by `api/src/env.ts`, and every new `AUTH_*` option must be
  whitelisted in `allowedEnvironmentVars` there.

## Deployment

See `DEPLOY.md` on the server (not part of this repository).
