#!/usr/bin/env bash
# One-time setup of a DesiConnect environment on Google Cloud. Safe to re-run: existing resources are kept.
#   infrastructure/gcp/setup.sh
# Creates: APIs, Artifact Registry, Cloud SQL (Postgres 16) + database + user, uploads bucket, service accounts,
# Secret Manager secrets (DATABASE_URL, JWT_SECRET, INTERNAL_API_KEY) and the IAM bindings between them.
source "$(dirname "$0")/lib.sh"

say "Enabling APIs (takes a minute the first time)"
gc services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com iam.googleapis.com storage.googleapis.com cloudscheduler.googleapis.com

say "Artifact Registry repository: $REPO"
gc artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1 \
  || gc artifacts repositories create "$REPO" --location "$REGION" --repository-format docker --description "DesiConnect images"

say "Service accounts"
for sa in "${ENV_NAME}-api" "${ENV_NAME}-web"; do
  gc iam service-accounts describe "${sa}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 \
    || gc iam service-accounts create "$sa" --display-name "DesiConnect ${sa}"
done
gc projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${API_SA}" --role roles/cloudsql.client --condition=None >/dev/null
# Cloud Build runs as the Compute Engine default service account in new projects. It only builds and pushes
# images (deploy.sh does the deploying with your own credentials), so give it just what that needs.
PROJECT_NUMBER="$(gc projects describe "$PROJECT_ID" --format 'value(projectNumber)')"
BUILD_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for role in roles/artifactregistry.writer roles/logging.logWriter roles/storage.objectViewer; do
  gc projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${BUILD_SA}" --role "$role" --condition=None >/dev/null
done

say "Cloud SQL instance: $SQL_INSTANCE ($SQL_TIER) — 5–10 minutes the first time"
if ! gc sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  ha=(); [[ "${SQL_HA:-false}" == "true" ]] && ha=(--availability-type REGIONAL)
  gc sql instances create "$SQL_INSTANCE" --database-version POSTGRES_16 --edition ENTERPRISE \
    --tier "$SQL_TIER" --region "$REGION" --storage-auto-increase --backup --backup-start-time 08:00 \
    --enable-point-in-time-recovery --retained-backups-count 14 --deletion-protection "${ha[@]}"
fi
gc sql databases describe "$SQL_DB" --instance "$SQL_INSTANCE" >/dev/null 2>&1 \
  || gc sql databases create "$SQL_DB" --instance "$SQL_INSTANCE"

if ! secret_exists database-url; then
  say "Database user and DATABASE_URL secret"
  pw="$(random_token 24)"
  if gc sql users list --instance "$SQL_INSTANCE" --format 'value(name)' | grep -qx "$SQL_USER"; then
    gc sql users set-password "$SQL_USER" --instance "$SQL_INSTANCE" --password "$pw"
  else
    gc sql users create "$SQL_USER" --instance "$SQL_INSTANCE" --password "$pw"
  fi
  # Cloud Run reaches Cloud SQL through a unix socket mounted at /cloudsql/<connection name>.
  printf 'postgresql://%s:%s@localhost/%s?host=/cloudsql/%s' "$SQL_USER" "$pw" "$SQL_DB" "$SQL_CONNECTION" | ensure_secret database-url
fi

say "Secrets"
random_token 32 | ensure_secret jwt-secret
random_token 32 | ensure_secret internal-api-key
for s in database-url jwt-secret internal-api-key; do
  gc secrets add-iam-policy-binding "$s" --member "serviceAccount:${API_SA}" --role roles/secretmanager.secretAccessor >/dev/null
done
gc secrets add-iam-policy-binding internal-api-key --member "serviceAccount:${WEB_SA}" --role roles/secretmanager.secretAccessor >/dev/null
for s in oidc-client-secret anthropic-api-key expo-access-token resend-api-key google-client-secret facebook-app-secret x-client-secret; do
  if secret_exists "$s"; then
    sa="$API_SA"; [[ "$s" == oidc-client-secret ]] && sa="$WEB_SA"
    gc secrets add-iam-policy-binding "$s" --member "serviceAccount:${sa}" --role roles/secretmanager.secretAccessor >/dev/null
  fi
done

say "Uploads bucket: gs://$BUCKET (resumes and license documents; private)"
gc storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 \
  || gc storage buckets create "gs://$BUCKET" --location "$REGION" --uniform-bucket-level-access --public-access-prevention
gc storage buckets add-iam-policy-binding "gs://$BUCKET" --member "serviceAccount:${API_SA}" --role roles/storage.objectAdmin >/dev/null

say "Done. Next: infrastructure/gcp/deploy.sh"
