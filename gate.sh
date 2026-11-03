#!/usr/bin/env bash
# The gate: both halves, the one script the pre-push hook, the README and CI run.
set -euo pipefail
cd "$(dirname "$0")"

(cd typescript && npm run gate)
python/gate.sh
echo "gate: green"
