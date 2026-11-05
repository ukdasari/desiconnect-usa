# Infrastructure

- `docker/` — production Dockerfiles for the API and website (used by `docker-compose.yml` and CI).
- `gcp/` — Google Cloud setup and deploy scripts (Cloud Run, Cloud SQL, Secret Manager). Runbook: `docs/deployment/gcp.md`.
- `terraform/` — reserved for cloud environment definitions (database, Redis, bucket, container service). Not written yet;
  see `docs/deployment/deployment.md` for the required resources.
- `github-actions/` — the CI workflow lives in `.github/workflows/ci.yml` (GitHub requires that location).
