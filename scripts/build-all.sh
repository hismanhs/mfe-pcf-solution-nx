#!/usr/bin/env bash
# Builds both MFEs and the PCF control via Nx, in one command.
# Usage: ./scripts/build-all.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing workspace dependencies (mfe-transformation, mfe-compliance)"
npm install

echo
echo "==> Installing pcf-control's own dependencies"
echo "    (deliberately NOT part of the npm workspace -- pcf-scripts/pcf-start"
echo "     assume a local, non-hoisted node_modules; see README.md's"
echo "     'Nx monorepo' section for why)"
(cd apps/pcf-control && npm install)

echo
echo "==> Building all three projects via Nx (cached -- reruns are near-instant)"
npx nx run-many -t build

echo
echo "==> Build outputs:"
ls -la "$ROOT_DIR/apps/mfe-transformation/dist" "$ROOT_DIR/apps/mfe-compliance/dist" "$ROOT_DIR/apps/pcf-control/out/controls/MfeHostControl" 2>/dev/null || true

echo
echo "Done."
echo "Next steps:"
echo "  1. Host apps/mfe-transformation/dist/* and apps/mfe-compliance/dist/* at"
echo "     stable URLs -- see DEPLOYMENT.md for a free path (Netlify)."
echo "  2. pac pcf push (or add to a solution and import) from apps/pcf-control/."
echo "  3. Set 'MFE Base URL' -> mfe-transformation's URL,"
echo "     'MFE 2 Base URL' -> mfe-compliance's URL."
echo "  4. Optionally bind 'Shared Value' to a Dataverse text column for persistence."
