#!/usr/bin/env bash
# The gate for the Python half: one script that the pre-push hook, the README and CI run.
# Through the venv when it exists, through the python3 on the path otherwise (CI installs
# requirements.txt into the runner's python).
set -euo pipefail
cd "$(dirname "$0")"

PY="${PYTHON:-}"
if [ -z "$PY" ]; then
  if [ -x .venv/bin/python ]; then PY=.venv/bin/python; else PY=python3; fi
fi
echo "gate (python): $("$PY" --version) at $PY"

"$PY" -m ruff check .
"$PY" -m ruff format --check .
"$PY" check_exercises.py
