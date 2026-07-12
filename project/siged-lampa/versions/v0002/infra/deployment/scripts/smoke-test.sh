#!/bin/bash
set -Eeuo pipefail

echo "=== [5/7] smoke-test ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1}"

echo "Smoke testing $BASE_URL"

# Frontend returns index.html
HTTP_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$HTTP_FRONTEND" != "200" ]; then
    echo "SMOKE FAIL: frontend / returned $HTTP_FRONTEND"
    exit 1
fi
echo "frontend /: $HTTP_FRONTEND"

# API health
HTTP_API=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null || echo "000")
if [ "$HTTP_API" != "200" ]; then
    echo "SMOKE FAIL: /api/health returned $HTTP_API"
    exit 1
fi
echo "/api/health: $HTTP_API"

# API health body contains expected keys
BODY=$(curl -s "$BASE_URL/api/health" 2>/dev/null || echo "")
echo "$BODY" | python -c "import sys,json; d=json.load(sys.stdin); assert d.get('status')=='healthy', f'status={d.get(\"status\")}'; assert 'siged-lampa-api' in d.get('service',''), f'service={d.get(\"service\")}'" 2>/dev/null || {
    echo "SMOKE FAIL: /api/health body validation"
    exit 1
}
echo "/api/health body: valid"

# Auth endpoint returns 401 for unauthenticated (confirms router mounted)
HTTP_AUTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/login" -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [ "$HTTP_AUTH" = "000" ] || [ "$HTTP_AUTH" = "503" ]; then
    echo "SMOKE FAIL: /api/auth/login returned $HTTP_AUTH"
    exit 1
fi
echo "/api/auth/login: $HTTP_AUTH (expected non-503)"

echo "SMOKE_TEST_PASS"
