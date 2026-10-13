# Backend Implementation: Optional IdP refresh token

**ADR:** ADR-1-oauth-optional-refresh-token

## Service Changes

### BaseOAuthDriver
- **File:** `api/src/auth/drivers/baseoauth.ts`
- **Change in `refresh(user)`** (the `else` branch of `if (authData?.['refreshToken'])`, currently
  `logger.error('No [..] Session found'); throw new InvalidCredentialsException();`):

  ```ts
  } else if (this.getConfig()['requireRefreshToken'] === false) {
      // Opt-in: the IdP issued no refresh token (e.g. Google without consent); the Directus session is authoritative
      logger.debug(`[${this.getClientName()}] No refresh token stored; continuing (REQUIRE_REFRESH_TOKEN=false)`);
  } else {
      logger.error(`No [${this.getClientName()}] Session found`);
      throw new InvalidCredentialsException();
  }
  ```
  `login()` delegates to `refresh()`, so both entry points (login + `POST /auth/refresh`) are covered by one change.
- Default: undefined/`true` -> strict, identical to today. A string `'false'` is already cast to boolean by `env.ts`.
- `logout()` is unchanged (already warns and continues without a token).

### Env
- **File:** `api/src/env.ts`: add `'AUTH_.+_REQUIRE_REFRESH_TOKEN'` after `'AUTH_.+_ALLOW_PUBLIC_REGISTRATION'`.

## Tests (vitest)

Matrix against `refresh()`/`login()` of a concrete driver with a mocked `openid-client` and logger:

| requireRefreshToken | stored token | IdP exchange | expected |
|---------------------|--------------|--------------|----------|
| unset | none | n/a | throws `InvalidCredentialsException` |
| `true` | none | n/a | throws |
| `false` | none | n/a | resolves, debug log, no IdP call |
| `false` | present | ok (rotated token) | resolves, token persisted |
| `false` | present | `invalid_grant` | throws |

Existing `openid.test.ts` mocks `openid-client` and `env`; reuse its setup (`createDriver`).

## Docs

- `config-options.md`: `AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN` | "Reject logins/renewals when the identity provider did not issue a refresh token. Set to `false` to rely on the Directus session instead." | `true`.
- `sso.md`: one paragraph on the trade-off.

## Notes

- Do not change `getUserID()`; `auth_data ?? null` from upstream #251 stays.
- Keep log wording stable for the strict path (operators may grep for it).
