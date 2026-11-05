#!/usr/bin/env bash
# Build and deploy DesiConnect to Cloud Run. Run setup.sh once first.
#   infrastructure/gcp/deploy.sh            # build images, migrate + seed, deploy API and website
#   SKIP_BUILD=1 TAG=<tag> infrastructure/gcp/deploy.sh   # redeploy (or roll back to) an existing image tag
#   DRY_RUN=1 infrastructure/gcp/deploy.sh  # print what would happen
source "$(dirname "$0")/lib.sh"
cd "$ROOT"

if [[ "${DRY_RUN:-}" == "1" ]]; then PROJECT_NUMBER=123456789012; else
  PROJECT_NUMBER="$(gc projects describe "$PROJECT_ID" --format 'value(projectNumber)')"
fi
# Cloud Run's deterministic URLs, used until a custom domain is set in config.env.
WEB_URL="${WEB_URL:-https://${WEB_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app}"
API_URL="${API_URL:-https://${API_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app}"
WEB_URL="${WEB_URL%/}"; API_URL="${API_URL%/}"

if [[ -z "${TAG:-}" ]]; then
  TAG="$(git rev-parse --short=12 HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
  git diff --quiet HEAD 2>/dev/null || TAG="${TAG}-dirty-$(date +%H%M%S)"
fi
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  say "Building images $TAG with Cloud Build (about 5–8 minutes)"
  gc builds submit --region "$REGION" --config infrastructure/gcp/cloudbuild.yaml \
    --substitutions "_REGISTRY=${REGISTRY},_TAG=${TAG}" .
fi

say "Migrations and reference data"
gc run jobs deploy "$MIGRATE_JOB" --region "$REGION" --image "${REGISTRY}/migrate:${TAG}" \
  --service-account "$API_SA" --set-cloudsql-instances "$SQL_CONNECTION" \
  --set-secrets DATABASE_URL=database-url:latest --set-env-vars NODE_ENV=production,SEED_DEMO=false \
  --max-retries 0 --task-timeout 15m --cpu 1 --memory 1Gi
gc run jobs execute "$MIGRATE_JOB" --region "$REGION" --wait

# ---- service definitions -------------------------------------------------------------------------
yaml_str() { local v="${1//\\/\\\\}"; printf '"%s"' "${v//\"/\\\"}"; }
env_block() { # KEY=VALUE lines on stdin → container env entries (empty values skipped)
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    local k="${line%%=*}" v="${line#*=}"
    [[ -z "$v" ]] && continue
    printf '            - name: %s\n              value: %s\n' "$k" "$(yaml_str "$v")"
  done
}
secret_block() { # ENV_NAME=secret-name pairs; secrets that don't exist are skipped
  for pair in "$@"; do
    local k="${pair%%=*}" s="${pair#*=}"
    if [[ "${DRY_RUN:-}" == "1" ]] || secret_exists "$s"; then
      printf '            - name: %s\n              valueFrom:\n                secretKeyRef:\n                  name: %s\n                  key: latest\n' "$k" "$s"
    fi
  done
}

oidc_client_ids="${OIDC_CLIENT_ID}${OIDC_MOBILE_CLIENT_ID:+,${OIDC_MOBILE_CLIENT_ID}}"
local_auth=""; [[ "$AUTH_MODE" == "local" ]] && local_auth=true

cat > "$OUT/api.yaml" <<YAML
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${API_SERVICE}
  labels:
    cloud.googleapis.com/location: ${REGION}
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      labels:
        app: desiconnect-api
        release: "${TAG}"
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "4"
        run.googleapis.com/cloudsql-instances: ${SQL_CONNECTION}
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/startup-cpu-boost: "true"
    spec:
      serviceAccountName: ${API_SA}
      containerConcurrency: 80
      timeoutSeconds: 60
      containers:
        - image: ${REGISTRY}/api:${TAG}
          command: ["node"]
          args: ["dist/main.js"]
          ports:
            - name: http1
              containerPort: 4000
          resources:
            limits:
              cpu: "1"
              memory: 1Gi
          startupProbe:
            httpGet:
              path: /api/v1/health
            periodSeconds: 5
            failureThreshold: 12
          env:
$(env_block <<ENV
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=${WEB_URL}
AUTH_MODE=${AUTH_MODE}
ALLOW_LOCAL_AUTH_IN_PRODUCTION=${local_auth}
OIDC_ISSUER=${OIDC_ISSUER:-}
OIDC_AUDIENCE=${OIDC_AUDIENCE:-}
OIDC_CLIENT_IDS=${oidc_client_ids}
BOOTSTRAP_ADMIN_EMAILS=${BOOTSTRAP_ADMIN_EMAILS:-}
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/mnt/uploads
NOTIFICATIONS_INLINE=true
AI_PROVIDER=${AI_PROVIDER:-none}
PUSH_PROVIDER=${PUSH_PROVIDER:-none}
ENV
)
$(secret_block DATABASE_URL=database-url JWT_SECRET=jwt-secret INTERNAL_API_KEY=internal-api-key \
  ANTHROPIC_API_KEY=anthropic-api-key EXPO_ACCESS_TOKEN=expo-access-token)
          volumeMounts:
            - name: uploads
              mountPath: /mnt/uploads
      volumes:
        - name: uploads
          csi:
            driver: gcsfuse.run.googleapis.com
            readOnly: false
            volumeAttributes:
              bucketName: ${BUCKET}
              mountOptions: "uid=1001,gid=1001,file-mode=600,dir-mode=700"
YAML

cat > "$OUT/web.yaml" <<YAML
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${WEB_SERVICE}
  labels:
    cloud.googleapis.com/location: ${REGION}
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      labels:
        app: desiconnect-web
        release: "${TAG}"
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "4"
        run.googleapis.com/startup-cpu-boost: "true"
    spec:
      serviceAccountName: ${WEB_SA}
      containerConcurrency: 80
      timeoutSeconds: 60
      containers:
        - image: ${REGISTRY}/web:${TAG}
          ports:
            - name: http1
              containerPort: 3000
          resources:
            limits:
              cpu: "1"
              memory: 512Mi
          env:
$(env_block <<ENV
NODE_ENV=production
API_URL=${API_URL}/api/v1
APP_URL=${WEB_URL}
AUTH_MODE=${AUTH_MODE}
SESSION_COOKIE_SECURE=true
OIDC_ISSUER=${OIDC_ISSUER:-}
OIDC_AUDIENCE=${OIDC_AUDIENCE:-}
OIDC_CLIENT_ID=${OIDC_CLIENT_ID:-}
OIDC_SCOPES=$([[ "$AUTH_MODE" == oidc ]] && echo "openid profile email offline_access")
ENV
)
$(secret_block INTERNAL_API_KEY=internal-api-key OIDC_CLIENT_SECRET=oidc-client-secret)
YAML

if [[ "${DRY_RUN:-}" == "1" ]]; then
  say "Generated api.yaml"; cat "$OUT/api.yaml"; say "Generated web.yaml"; cat "$OUT/web.yaml"
  cp "$OUT/api.yaml" "$OUT/web.yaml" "${DRY_RUN_OUT:-/tmp}/" 2>/dev/null || true
fi

say "Deploying API ($API_URL)"
gc run services replace "$OUT/api.yaml" --region "$REGION"
gc run services add-iam-policy-binding "$API_SERVICE" --region "$REGION" --member allUsers --role roles/run.invoker >/dev/null

say "Deploying website ($WEB_URL)"
gc run services replace "$OUT/web.yaml" --region "$REGION"
gc run services add-iam-policy-binding "$WEB_SERVICE" --region "$REGION" --member allUsers --role roles/run.invoker >/dev/null

if [[ "${DRY_RUN:-}" != "1" ]]; then
  say "Smoke test"
  curl -fsS "${API_URL}/api/v1/health" && echo
  curl -fsS -o /dev/null -w "website: HTTP %{http_code}\n" "${WEB_URL}/restaurants"
fi
say "Released ${TAG}"
echo "  Website: ${WEB_URL}"
echo "  API:     ${API_URL}/api/v1  (docs: ${API_URL}/api/docs)"
