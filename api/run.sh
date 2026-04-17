#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
exec .venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
