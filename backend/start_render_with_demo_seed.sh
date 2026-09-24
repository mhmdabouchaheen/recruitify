#!/usr/bin/env bash
set -euo pipefail

export ALLOW_DEMO_SEED=true
python scripts/seed_demo_data.py --apply

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
