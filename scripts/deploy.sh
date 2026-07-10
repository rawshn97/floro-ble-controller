#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORTFOLIO="${PORTFOLIO_ROOT:-$HOME/Projects/rawshn-portfolio}"
SUBMODULE_PATH="public/sign-controller"

cd "$ROOT"

if ! git config user.email | grep -q 'ItsRRM97@users.noreply.github.com'; then
  echo "error: git user.email must be ItsRRM97 GitHub noreply (see ~/.cursor/rules/github-git-identity.mdc)" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "error: floro-ble-controller has uncommitted tracked changes; commit first" >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  echo "error: deploy from main (current: $BRANCH)" >&2
  exit 1
fi

if git rev-parse '@{u}' >/dev/null 2>&1; then
  LOCAL="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse '@{u}')"
  if [[ "$LOCAL" != "$REMOTE" ]]; then
    echo "Pushing floro-ble-controller to origin/main..."
    git push origin main
  fi
fi

FLORO_SHA="$(git rev-parse HEAD)"
FLORO_SHORT="$(git rev-parse --short HEAD)"

if [[ ! -d "$PORTFOLIO/.git" ]]; then
  echo "error: portfolio repo not found at $PORTFOLIO" >&2
  exit 1
fi

echo "Bumping $SUBMODULE_PATH in rawshn-portfolio to $FLORO_SHORT..."
cd "$PORTFOLIO"
git submodule update --init "$SUBMODULE_PATH"
git -C "$SUBMODULE_PATH" fetch origin main
git -C "$SUBMODULE_PATH" checkout main
git -C "$SUBMODULE_PATH" pull --ff-only origin main

SUB_SHA="$(git -C "$SUBMODULE_PATH" rev-parse HEAD)"
if [[ "$SUB_SHA" != "$FLORO_SHA" ]]; then
  echo "error: submodule at $SUB_SHA, expected $FLORO_SHA" >&2
  exit 1
fi

if git diff --quiet "$SUBMODULE_PATH"; then
  echo "Portfolio submodule already at $FLORO_SHORT; skipping portfolio commit."
else
  git add "$SUBMODULE_PATH"
  git commit -m "$(cat <<EOF
chore(sign-controller): bump floro-ble-controller to ${FLORO_SHORT}

Sync rawshn.com/sign-controller with latest FloRo BLE controller release.
EOF
)"
  git push origin main
fi

echo "Deploying rawshn-portfolio (rawshn.com/sign-controller)..."
vercel deploy --prod

echo "Done."
echo "  canonical: https://rawshn.com/sign-controller/"
