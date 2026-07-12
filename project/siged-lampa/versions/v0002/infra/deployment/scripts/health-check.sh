#!/bin/bash
set -Eeuo pipefail

echo "=== [4/7] health-check ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"

check_service() {
    local service=$1
    local max_retries=${2:-12}
    local retry=0
    while [ $retry -lt $max_retries ]; do
        status=$(docker compose -f "$RELEASE_DIR/infra/deployment/docker-compose.production.yml" ps --format json "$service" 2>/dev/null | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health',''))" 2>/dev/null || echo "")
        if [ "$status" = "healthy" ]; then
            echo "$service: healthy"
            return 0
        fi
        retry=$((retry + 1))
        sleep 5
    done
    echo "FATAL: $service not healthy after $((max_retries * 5)) seconds"
    return 1
}

check_service postgres 20
check_service backend 24
check_service frontend 12

echo "All services healthy"

# Verify API health endpoint
API_URL="http://127.0.0.1/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
    echo "FATAL: API health endpoint returned $HTTP_CODE"
    exit 1
fi

echo "API health endpoint: 200 OK"
echo "HEALTH_CHECK_PASS"
