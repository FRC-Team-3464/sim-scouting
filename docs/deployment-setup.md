# Vercel staging and production deployment

## 1. Deployment model

The `sim-city-scouting` Vercel team contains two projects connected to the
same Git repository:

| Vercel project | Production branch | Stable origin | Firebase project |
|---|---|---|---|
| `sim-city-scouting` | `main` | `https://sim-city-scouting.vercel.app` | Production Firebase project |
| `sim-city-scouting-staging` | `staging` | `https://sim-city-scouting-staging.vercel.app` | Existing development Firebase project |

Each project deploys the complete combined application. React and `/api/*`
remain under the same origin in both environments. The repository-root
`vercel.json` installs both dependency trees, builds `frontend/dist`, and
routes `/api/*` to the concrete `api/index.js` Express Function before applying
the React SPA fallback to browser routes.

Generated Preview deployment origins are not trusted for authenticated
mutations. Use the stable staging project for pre-production authentication
testing.

## 2. Prepare the Git branches

The deployment configuration must be merged into `main` before creating the
projects. Create the long-lived staging branch from that approved commit:

```bash
git switch main
git pull --ff-only
git switch -c staging
git push --set-upstream origin staging
```

If `staging` already exists, update it through the team's normal pull-request
or merge workflow instead of recreating it.

## 3. Prepare Firebase credentials

Production must never use the development Firebase project shared by local
development and hosted staging.

Production requires:

- the production Firebase service-account JSON;
- the production Firebase Web API key;
- a production-only CSRF secret.

Hosted staging uses the existing development Firebase project and therefore
shares its Firebase Authentication users and Firestore data with local
development. Create a separate service-account key within that development
Firebase project for Vercel staging. Do not upload a developer's local
service-account key to Vercel.

Staging may use the development Firebase Web API key because it identifies the
same Firebase project. Generate a separate staging CSRF secret:

```bash
openssl rand -hex 32
```

Generate a different production CSRF secret with the same command. Never copy
either output into Git, documentation, terminal history, chat, or build logs.

## 4. Create the production Vercel project

1. Select the `sim-city-scouting` team in the Vercel dashboard.
2. Select **Add New → Project** and import the Git repository.
3. Set the project name to `sim-city-scouting`.
4. Keep the Root Directory at the repository root; do not select `frontend`.
5. Select the **Other** framework preset.
6. Do not override the install, build, or output settings from `vercel.json`.
7. Configure the Production environment variables from the matrix below.
8. Confirm under **Settings → Git** that the Production Branch is `main`.
9. Deploy and confirm that Vercel assigns
   `https://sim-city-scouting.vercel.app`.

The `.vercel.app` name is allocated first-come, first-served. If Vercel does
not assign the exact expected origin, stop and update the approved origin and
configuration before testing authentication.

## 5. Create the staging Vercel project

1. From the same team, select **Add New → Project** again.
2. Import the same Git repository.
3. Set the project name to `sim-city-scouting-staging`.
4. Keep the Root Directory at the repository root.
5. Select the **Other** framework preset and retain the tracked build settings.
6. Configure the staging values under this project's **Production**
   environment scope. The staging project treats `staging` as its production
   branch, even though it is pre-production for the application.
7. Set **Settings → Git → Production Branch** to `staging`.
8. Deploy the `staging` branch and confirm that Vercel assigns
   `https://sim-city-scouting-staging.vercel.app`.

## 6. Environment variables

Configure these values separately under the Production scope of each Vercel
project:

| Variable | Production project | Staging project |
|---|---|---|
| `SERVICE_ACCOUNT_KEY` | One-line production service-account JSON | One-line staging service-account JSON created in the development Firebase project |
| `FIREBASE_WEB_API_KEY` | Production Firebase Web API key | Development Firebase Web API key |
| `CORS_ALLOWED_ORIGIN` | `https://sim-city-scouting.vercel.app` | `https://sim-city-scouting-staging.vercel.app` |
| `PORT` | `3000` | `3000` |
| `SESSION_DURATION_MINUTES` | `360` | `360` |
| `SESSION_EXPIRATION_WARNING_MINUTES` | `30` | `30` |
| `SESSION_COOKIE_SECURE` | `true` | `true` |
| `SESSION_COOKIE_SAME_SITE` | `lax` | `lax` |
| `CSRF_SECRET` | Unique production 64-character hexadecimal secret | Different staging 64-character hexadecimal secret |
| `VITE_API_BASE_URL` | `/api` | `/api` |

Environment-variable updates affect only new deployments. Redeploy the
corresponding project after adding or changing a value.

## 7. Staging verification

Complete these checks at the staging origin before promoting a release:

1. Load `/`, `/login`, `/signup`, `/match`, `/local-data`, and `/pit`
   directly to verify the SPA fallback. Confirm `/stored` redirects to
   `/local-data` and `/pitScouting` redirects to `/pit`.
2. Register a disposable development Firebase user.
3. Log out and log back in.
4. Reload the page and verify session restoration.
5. Verify anonymous `/api/read` and `/api/write` requests return `401`.
6. Complete an authenticated scouting write with a valid CSRF token.
7. Verify a missing or altered CSRF token is rejected.
8. Confirm the record appears only in the development Firestore database.
9. Log out and verify the session no longer authorizes API requests.
10. Inspect Vercel logs and confirm that passwords, Firebase tokens, session
    cookies, CSRF values, service-account data, and Firestore bodies are absent.

Because local development and hosted staging share Firebase, clearly label and
remove disposable staging users and data when they are no longer needed.

## 8. Production promotion and verification

After staging succeeds, promote the approved commit through the normal pull
request into `main`. Confirm the production project deploys that commit, then
repeat registration, login, reload/session restoration, protected-write,
Firestore-isolation, logout, direct-route, and safe-log checks against the
production origin.

Do not enable a Vercel WAF rate threshold until normal shared-IP login and
registration traffic has been observed. A future rule should protect credential
attempts without counting logout requests.
