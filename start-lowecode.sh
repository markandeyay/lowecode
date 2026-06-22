#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "Starting LOWECODE..."
echo "Provider: lowes-mylow"
echo "Model: mylow-1"
echo ""

export LOWES_MYLOW_BASE_URL="${LOWES_MYLOW_BASE_URL:-http://localhost:${LOWECODE_ADAPTER_PORT:-3000}/v1}"
export LOWECODE_MOCK="${LOWECODE_MOCK:-0}"
export LOWECODE_BROWSER_MODE="${LOWECODE_BROWSER_MODE:-0}"

echo "LOWECODE provider: lowes-mylow"
echo "LOWECODE model: mylow-1"
echo "LOWECODE base URL: ${LOWES_MYLOW_BASE_URL}"

if [ "${LOWECODE_MOCK:-0}" = "1" ]; then
  echo "LOWECODE MOCK MODE: test-only adapter responses will be used."
elif [ "${LOWECODE_BROWSER_MODE:-0}" = "1" ]; then
  echo "LOWECODE BROWSER MODE: experimental - a visible browser will open for Mylow access."
  echo "  Mylow URL: ${LOWECODE_MYLOW_URL:-https://www.lowes.com/l/about/ai-at-lowes}"
  echo "  Profile: ${LOWECODE_BROWSER_PROFILE_DIR:-.lowecode-browser-profile}"
  echo "  Complete any login or verification in the browser window manually."
  echo "  LOWECODE will not bypass bot defenses or replay cookies."
elif [ -z "${LOWES_MYLOW_LIVE_ENDPOINT:-}" ]; then
  echo "LOWES_ENDPOINT_NOT_CONFIGURED"
  echo "Configure an authorized Lowe's Mylow endpoint with LOWES_MYLOW_LIVE_ENDPOINT."
  echo "For browser-mediated access, set LOWECODE_BROWSER_MODE=1."
  echo "For local tests only, run with LOWECODE_MOCK=1."
  exit 1
fi

ADAPTER_PID=""
if [ -d "lowes-llm-provider" ]; then
  echo "Starting LOWECODE adapter at ${LOWES_MYLOW_BASE_URL}"
  (cd lowes-llm-provider && npm install --silent 2>/dev/null && npm run dev) &
  ADAPTER_PID=$!
  sleep 2
else
  echo "lowes-llm-provider not found; expecting external adapter at ${LOWES_MYLOW_BASE_URL}"
fi

BUN_BIN="${BUN_BIN:-bun}"
if ! command -v "${BUN_BIN}" >/dev/null 2>&1; then
  if command -v bun.exe >/dev/null 2>&1; then
    BUN_BIN="bun.exe"
  elif [ -x "${HOME:-}/.bun/bin/bun.exe" ]; then
    BUN_BIN="${HOME}/.bun/bin/bun.exe"
  fi
fi

"${BUN_BIN}" run --cwd packages/opencode --conditions=browser src/index.ts "$@"

if [ -n "${ADAPTER_PID:-}" ]; then
  kill "$ADAPTER_PID" 2>/dev/null || true
fi
