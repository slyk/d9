# Upstream issue draft (LaWebcapsule/d9, form: "Report a bug")

## Title

OpenID/OAuth2 login fails with "No [OpenID] Session found" when the provider returns no refresh token (e.g. Google after the first consent)

## Describe the Bug

Logging in through an `openid` (or `oauth2`) provider fails with `INVALID_CREDENTIALS` when the identity provider
does not return a `refresh_token`, even though authentication at the provider succeeded and the user exists in d9.

This is the case that remained after #127 / #251: #251 made `getUserID()` store `auth_data: null` instead of
`undefined` (fixing the "Empty .update() call" crash), but the login then continues into
`BaseOAuthDriver.refresh()`, which rejects any user without a stored refresh token:

```
ERROR: No [OpenID] Session found
WARN: Invalid user credentials.
    at OpenIDAuthDriver.refresh   (api/src/auth/drivers/baseoauth.ts)
    at OpenIDAuthDriver.login
    at AuthenticationService.login
```

Google only returns a refresh token when it shows the consent screen. If the account has already authorized the
OAuth client (for example because the same client is used by another app), Google skips consent and sends no refresh
token, so every login is rejected. Other providers behave similarly (e.g. Azure AD/Entra without `offline_access`
scope, per the last comment on #127).

The same `refresh()` also runs on every `POST /auth/refresh` (`AuthenticationService.refresh`), so the user would also
be logged out at the first access-token renewal even if only the login path were relaxed.

The rejection itself looks intentional (introduced in #45, comment "If no auth connexion, throw user out"), so I am
not suggesting to remove it. Current workaround: `AUTH_<PROVIDER>_PARAMS__PROMPT="consent"`, which forces Google's consent
screen on every login. It is Google-specific and does not help providers that never issue refresh tokens.

**Proposal:** add an opt-in provider option `AUTH_<PROVIDER>_REQUIRE_REFRESH_TOKEN` (default `true`, i.e. unchanged
behavior). With `false`, a missing refresh token no longer rejects login/renewal and the Directus session is
authoritative; if a refresh token *is* stored it is still exchanged at the provider and a failing exchange
(`invalid_grant`) still ends the session. The trade-off (IdP-side revocation is not noticed until the d9 session expires,
`REFRESH_TOKEN_TTL`) would be documented. I have this implemented with tests and docs and am happy to open a PR
(clean-room, DCO sign-off) if the approach and the option name are acceptable.

## To Reproduce

1. Configure an OpenID provider with Google (`AUTH_PROVIDERS="google"`, `AUTH_GOOGLE_DRIVER="openid"`,
   `AUTH_GOOGLE_ISSUER_URL="https://accounts.google.com/.well-known/openid-configuration"`,
   `AUTH_GOOGLE_SCOPE="openid profile email"`, `AUTH_GOOGLE_IDENTIFIER_KEY="email"`, no `PARAMS__PROMPT`).
2. Use a Google account that has already granted access to this OAuth client before (e.g. it is also used by another app),
   so that Google does not show the consent screen again.
3. Create/link a user: `provider='google'`, `external_identifier=<the Google email>`.
4. Click "Google" on the login page and complete the Google sign-in.
5. Observe redirect to `/admin/login?reason=INVALID_CREDENTIALS` and the log lines above.
   (`auth_data` of the user is `null`; Google's token response had no `refresh_token`.)

## Directus Version

d9 `@wbce-d9/api` 12.5.10 / `@wbce-d9/directus9` 12.0.18 (main at 0e72092)

## Hosting Strategy

Self-Hosted (Custom)

<!-- Internal note: if the dev reproduction confirms that a user's 2nd login fails too (auth_data overwritten with null), add it to step 2. -->
