#!/bin/bash
set -Eeuo pipefail

echo "=== [4/7] health-check ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
COMPOSE_FILE="$RELEASE_DIR/infra/deployment/docker-compose.production.yml"
ENV_FILE="$RELEASE_DIR/infra/deployment/.env.production"

check_service() {
    local service="$1"
    local max_retries="${2:-12}"
    local retry=0
    local status=""

    while [ "$retry" -lt "$max_retries" ]; do
        status="$(
            docker compose \
                --env-file "$ENV_FILE" \
                -f "$COMPOSE_FILE" \
                ps --format json "$service" \
                2>/dev/null |
            python -c "
import json
import sys

data = json.load(sys.stdin)

if isinstance(data, list):
    item = data[0] if data else {}
else:
    item = data

print(item.get('Health', ''))
" 2>/dev/null || true
        )"

        if [ "$status" = "healthy" ]; then
            echo "$service: healthy"
            return 0
        fi

        retry=$((retry + 1))
        echo "$service: status=${status:-unknown}, attempt ${retry}/${max_retries}"
        sleep 5
    done

    echo "FATAL: $service not healthy after $((max_retries * 5)) seconds"

    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_FILE" \
        ps || true

    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_FILE" \
        logs --tail=100 "$service" || true

    return 1
}

check_service postgres 20
check_service backend 24
check_service frontend 12

echo "All services healthy"

API_URL="http://127.0.0.1/health"
HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "000")"

if [ "$HTTP_CODE" != "200" ]; then
    echo "FATAL: API health endpoint returned $HTTP_CODE"
    exit 1
fi

echo "API health endpoint: 200 OK"
echo "HEALTH_CHECK_PASS"