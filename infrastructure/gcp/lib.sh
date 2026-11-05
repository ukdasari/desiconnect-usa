# Shared helpers for setup.sh and deploy.sh. Not meant to be run directly.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
if [[ ! -f "$HERE/config.env" ]]; then
  echo "Missing $HERE/config.env. Copy config.env.example to config.env and fill it in." >&2
  exit 1
fi
# shellcheck disable=SC1091
source "$HERE/config.env"

: "${PROJECT_ID:?set PROJECT_ID in config.env}" "${REGION:?set REGION in config.env}" "${ENV_NAME:=prod}"
SQL_INSTANCE="${ENV_NAME}-db"
SQL_DB="desiconnect"
SQL_USER="desiconnect"
REPO="desiconnect"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"
BUCKET="${PROJECT_ID}-${ENV_NAME}-uploads"
API_SERVICE="${ENV_NAME}-api"
WEB_SERVICE="${ENV_NAME}-web"
MIGRATE_JOB="${ENV_NAME}-migrate"
API_SA="${ENV_NAME}-api@${PROJECT_ID}.iam.gserviceaccount.com"
WEB_SA="${ENV_NAME}-web@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

# DRY_RUN=1 prints gcloud commands instead of running them (read-only lookups return placeholders).
if [[ "${DRY_RUN:-}" == "1" ]]; then
  gc() { echo "[dry-run] gcloud $*" >&2; }
else
  gc() { gcloud --project "$PROJECT_ID" --quiet "$@"; }
fi
say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
secret_exists() { gc secrets describe "$1" >/dev/null 2>&1; }
# Create a secret from stdin if it doesn't exist yet (never overwrites).
ensure_secret() {
  local name="$1"
  if secret_exists "$name"; then echo "  secret $name exists"; cat >/dev/null; return; fi
  gc secrets create "$name" --replication-policy=automatic >/dev/null
  gc secrets versions add "$name" --data-file=- >/dev/null
  echo "  secret $name created"
}
random_token() { openssl rand -hex "${1:-24}"; }
