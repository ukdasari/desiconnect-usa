# Deploying to Google Cloud (Cloud Run + Cloud SQL)

This runbook takes 1StopDesi from an empty Google Cloud account to a live website and API. You run the commands
yourself because they need your Google account. Total time is about 45 minutes, mostly waiting for the database.

```
             ┌──────────────── Cloud Run ────────────────┐
browser ───▶ │ prod-web (Next.js)  ──server-side──▶ prod-api (NestJS) │ ──unix socket──▶ Cloud SQL (Postgres 16 + PostGIS)
mobile app ─────────────────────────────────────▶ prod-api            │ ──gcsfuse──────▶ Cloud Storage (uploads, private)
             └────────────────────────────────────────────┘
Secrets (DATABASE_URL, JWT_SECRET, INTERNAL_API_KEY, …) come from Secret Manager. Images live in Artifact Registry.
```

| Piece | What it is | Rough monthly cost at pilot traffic |
|---|---|---|
| `prod-web`, `prod-api` | Cloud Run services, scale to zero, max 4 instances each | US$0–5 (free tier covers most pilots) |
| `prod-migrate` | Cloud Run job: `prisma migrate deploy` + reference/restaurant seed, run on every deploy | cents |
| `prod-db` | Cloud SQL for PostgreSQL 16, `db-f1-micro`, daily backups + point-in-time recovery | about US$10 |
| `<project>-prod-uploads` | Private bucket for resumes and license documents, mounted into the API | cents |

Redis is not used: notifications are processed inline (`NOTIFICATIONS_INLINE=true`). Add Memorystore later only if
notification volume makes requests slow.

## Files

| File | Purpose |
|---|---|
| `infrastructure/gcp/config.env.example` | Settings: project, region, admins, sign-in mode. Copy to `config.env` (git-ignored). |
| `infrastructure/gcp/setup.sh` | One-time: APIs, registry, database, bucket, service accounts, secrets, permissions. Safe to re-run. |
| `infrastructure/gcp/deploy.sh` | Every release: build images, migrate + seed, deploy API and website, smoke test. |
| `infrastructure/gcp/cloudbuild.yaml` | Builds the `api`, `migrate` and `web` images in Cloud Build. |
| `infrastructure/docker/*.Dockerfile` | The images. The API Dockerfile has a `migrate` stage for the release job. |

## Step 1 — Project and tools (10 minutes)

1. Go to <https://console.cloud.google.com>, create a project (for example `desiconnect-prod`), and link a billing account.
   Set a budget alert under **Billing → Budgets & alerts** (for example US$50/month).
2. Open **Cloud Shell** (the `>_` icon, top right). It already has `gcloud`, `git` and `openssl`.
   Working from your laptop instead? Install the Google Cloud CLI and run `gcloud auth login`.
3. Get the code:

   ```bash
   git clone https://github.com/ukdasari/desiconnect-usa.git && cd desiconnect-usa   # private repo: run `gh auth login` first
   gcloud config set project desiconnect-prod
   ```

## Step 2 — Settings (5 minutes)

```bash
cp infrastructure/gcp/config.env.example infrastructure/gcp/config.env
nano infrastructure/gcp/config.env
```

Set at least:

- `PROJECT_ID`: your project ID from step 1.
- `BOOTSTRAP_ADMIN_EMAILS`: your email address. You become an admin the first time you register or sign in with it.
- `AUTH_MODE`:
  - `local` (the default) uses the built-in email and password sign-in. It's fine for a closed pilot, but has no email
    verification or password reset.
  - `oidc` is for a public launch. Set up Auth0 first (see `docs/security/authentication.md`), fill in the `OIDC_*`
    values, and store the client secret:

    ```bash
    printf '%s' 'YOUR_CLIENT_SECRET' | gcloud secrets create oidc-client-secret --data-file=-
    ```

- **Email:**
  - `EMAIL_PROVIDER=log` (the default) sends nothing.
  - To send alerts and account emails:
    1. Create a free account at <https://resend.com>.
    2. Add and verify your domain, which takes about 10 minutes of DNS records.
    3. Set `EMAIL_PROVIDER=resend` and `EMAIL_FROM="1StopDesi <updates@yourdomain.com>"`.
    4. Store the key: `printf '%s' 're_…' | gcloud secrets create resend-api-key --data-file=-`
- `AI_PROVIDER` is optional. To have Desi AI use Claude, set it to `anthropic` and store the key:
  `printf '%s' 'sk-ant-…' | gcloud secrets create anthropic-api-key --data-file=-`

## Step 3 — One-time setup (10–15 minutes, mostly the database)

```bash
infrastructure/gcp/setup.sh
```

This script creates everything except the running services. The database password, JWT secret and internal API key are
generated randomly, written straight into Secret Manager, and never printed. If the script stops partway, for example
because billing isn't linked yet, fix the cause and run it again: it skips anything that already exists.

If you add the `oidc-client-secret` or `anthropic-api-key` secret after running setup, run `setup.sh` again so the
services get permission to read it.

## Step 4 — Deploy (10 minutes)

```bash
infrastructure/gcp/deploy.sh
```

The script:

1. Builds the three images in Cloud Build, tagged with the git commit.
2. Runs the `prod-migrate` job: applies database migrations, then loads categories, places and the 145 DFW restaurants.
   No demo data is loaded in production. Restaurants that owners have claimed are never overwritten.
3. Deploys `prod-api`, then `prod-web`, both public.
4. Creates or updates the `prod-alert-digest` Cloud Scheduler job. It calls the API every Sunday at 9:00 Central so the
   API can send weekly alert digests.
5. Smoke-tests the API health endpoint and `/restaurants`.

At the end it prints the website and API addresses (`https://prod-web-<number>.us-central1.run.app`). Open the website,
then register with the address you put in `BOOTSTRAP_ADMIN_EMAILS` (or sign in, with OIDC). **Moderation** appears in
your account menu.

To preview the commands without running them: `DRY_RUN=1 infrastructure/gcp/deploy.sh`.

## Step 5 — Your domain (optional, 15 minutes + DNS time)

Example below: `1stopdesi.com` for the website and `api.1stopdesi.com` for the API.

```bash
gcloud beta run domain-mappings create --service prod-web --domain 1stopdesi.com --region us-central1
gcloud beta run domain-mappings create --service prod-api --domain api.1stopdesi.com --region us-central1
gcloud beta run domain-mappings describe --domain 1stopdesi.com --region us-central1   # shows the DNS records to add
```

1. Add the DNS records it shows at your registrar. Google issues the HTTPS certificate on its own, which can take up
   to an hour.
2. Set `WEB_URL=https://1stopdesi.com` and `API_URL=https://api.1stopdesi.com` in `config.env`.
3. Redeploy without rebuilding: `SKIP_BUILD=1 TAG=<last tag> infrastructure/gcp/deploy.sh`.
4. With OIDC, update Auth0's callback and logout URLs to the new domain.

Domain mapping is only available in some regions, `us-central1` among them. In other regions, put an external HTTPS
load balancer in front, or use Firebase Hosting rewrites to the `prod-web` service.

## Step 6 — Point the mobile app at production

Set these values for the EAS `production` profile (see `docs/deployment/mobile-release.md`), then build:

```
EXPO_PUBLIC_API_URL=https://api.1stopdesi.com/api/v1     # or the run.app API address
EXPO_PUBLIC_WEBSITE_URL=https://1stopdesi.com
```

## Day-to-day

| Task | Command |
|---|---|
| Release the current commit | `infrastructure/gcp/deploy.sh` |
| Roll back | `SKIP_BUILD=1 TAG=<previous tag> infrastructure/gcp/deploy.sh` (tags: `gcloud artifacts docker images list us-central1-docker.pkg.dev/$PROJECT_ID/desiconnect/api --include-tags`). Migrations are forward-only, so they must stay compatible with the previous release. |
| Send the weekly digest now (testing) | `gcloud scheduler jobs run prod-alert-digest --location us-central1` (only alerts that are due get a digest) |
| API logs | `gcloud run services logs read prod-api --region us-central1 --limit 100` |
| Migration job logs | Console → Cloud Run → Jobs → `prod-migrate` → latest execution |
| Rotate the JWT secret (signs everyone out) | `openssl rand -hex 32 \| gcloud secrets versions add jwt-secret --data-file=-`, then redeploy with `SKIP_BUILD=1` |
| Restore the database | Console → SQL → `prod-db` → Backups (daily, 14 kept) or point-in-time recovery to a new instance |
| Connect with psql | `gcloud sql connect prod-db --user desiconnect --database desiconnect` (password: `gcloud secrets versions access latest --secret database-url`) |

## What was verified

This environment can't reach Google Cloud or container registries, so `setup.sh` and `deploy.sh` haven't been run
against a real project. What was checked:

- Each Dockerfile's steps were run in a clean copy of the repository, without the images themselves:
  - API: install, build, `pnpm deploy`, prisma generate, then `migrate deploy` and the production seed against a fresh
    PostGIS database. The server started with `NODE_ENV=production` and served the health check and restaurant search.
  - Website: the standalone server started and served `/`, `/restaurants` and a listing page using the API above.
- GitHub Actions CI builds the real `api`, `migrate` and `web` images from the same Dockerfiles on every push to `main`;
  they build successfully.
- `deploy.sh` was dry-run, and the generated Cloud Run service YAML parsed with the expected variables and secrets.

On the first real run, watch for these:

- **Organization policy blocks `allUsers`.** Some Workspace organizations forbid public Cloud Run services (the
  `iam.allowedPolicyMemberDomains` policy). Use a project outside that organization, or ask its admin for an exception.
- **The Cloud Build permission error says "artifactregistry.repositories.uploadArtifacts".** Run `setup.sh` again (it
  grants the build account access), then wait a minute for the permission to take effect.
- **Uploads fail with "permission denied".** The bucket is mounted for user ID 1001, which the API image runs as. Check
  that the bucket mount in `prod-api` shows `uid=1001`.
