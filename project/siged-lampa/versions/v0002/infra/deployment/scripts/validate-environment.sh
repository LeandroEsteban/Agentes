#!/bin/bash
set -Eeuo pipefail

echo "=== [1/7] validate-environment ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
SHARED_DIR="/opt/siged-lampa/shared"

if [ ! -f "$SHARED_DIR/.env.production" ]; then
    echo "FATAL: $SHARED_DIR/.env.production not found. Create it before deploying."
    exit 1
fi

if [ ! -d "$RELEASE_DIR" ]; then
    echo "FATAL: $RELEASE_DIR does not exist. Package step must create it."
    exit 1
fi

if [ ! -f "$RELEASE_DIR/infra/deployment/docker-compose.production.yml" ]; then
    echo "FATAL: docker-compose.production.yml not found in release."
    exit 1
fi

echo "docker compose config" > /dev/null
cd "$RELEASE_DIR"
docker compose -f infra/deployment/docker-compose.production.yml config > /dev/null 2>&1 || {
    echo "FATAL: docker-compose config validation failed."
    exit 1
}

echo "VALIDATE_ENVIRONMENT_PASS"
