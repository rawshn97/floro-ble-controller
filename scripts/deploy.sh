#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORTFOLIO="${PORTFOLIO_ROOT:-$HOME/Projects/rawshn-portfolio}"
TARGET_DIR="$PORTFOLIO/public/floro-remote"

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

echo "Syncing FloRo Remote into rawshn-portfolio ($FLORO_SHORT)..."
mkdir -p "$TARGET_DIR"
rsync -av --delete \
  --exclude='.git' \
  --exclude='.vercel' \
  --exclude='.gstack' \
  --exclude='node_modules' \
  "$ROOT/" "$TARGET_DIR/"

echo "$FLORO_SHA" > "$TARGET_DIR/.source-pin"

if [[ -d "$PORTFOLIO/public/sign-controller" ]]; then
  rm -rf "$PORTFOLIO/public/sign-controller"
fi

cd "$PORTFOLIO"
git add public/floro-remote public/sign-controller vercel.json scripts/vercel-install.sh src/config/hustle.ts src/pages/hustle/ docs/ 2>/dev/null || true

if git diff --cached --quiet; then
  echo "Portfolio already up to date; skipping portfolio commit."
else
  git commit -m "$(cat <<EOF
chore(floro-remote): sync FloRo Remote to ${FLORO_SHORT}

Cut over from /sign-controller/ to /floro-remote/ with redirect and sync latest release.
EOF
)"
  git push origin main
fi

echo "Deploying rawshn-portfolio (rawshn.com/floro-remote)..."
vercel deploy --prod

echo "Done."
echo "  canonical: https://rawshn.com/floro-remote/"
