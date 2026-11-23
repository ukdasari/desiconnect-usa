#!/usr/bin/env bash
# One-shot iOS App Store release for 1StopDesi (run in Cloud Shell or any machine with Node 20+).
# Prompts you for your Expo login and Apple ID (with 2FA code) on the first run.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only

command -v eas >/dev/null || npm install -g eas-cli

# The Expo config plugins (expo-router etc.) must be installed locally.
if [ ! -d apps/mobile/node_modules/expo-router ]; then
  echo ">>> Installing dependencies (a few minutes the first time)."
  command -v pnpm >/dev/null || { corepack enable 2>/dev/null || npm install -g pnpm; }
  pnpm install --frozen-lockfile
fi
cd apps/mobile

eas whoami >/dev/null 2>&1 || eas login

# First run only: create the Expo project and save its id to the repo.
if grep -q '"projectId": ""' app.json; then
  eas init --non-interactive --force || eas init
  cd ../..
  git add apps/mobile/app.json
  git commit -m "Add EAS projectId" && git push || echo "Commit/push the projectId change later."
  cd apps/mobile
fi

echo ">>> Building iOS production build (about 20 min). Answer YES to Apple login and certificate prompts."
eas build --platform ios --profile production --wait

echo ">>> Uploading to App Store Connect / TestFlight."
eas submit --platform ios --latest

echo "Done. Finish the listing at https://appstoreconnect.apple.com and click Submit for Review."
