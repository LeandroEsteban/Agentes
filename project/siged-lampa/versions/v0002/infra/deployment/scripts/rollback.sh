#!/bin/bash
set -Eeuo pipefail

echo "=== [6/7] rollback ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
SHARED_DIR="/opt/siged-lampa/shared"
CURRENT_LINK="/opt/siged-lampa/current"
PREVIOUS_FILE="/opt/siged-lampa/previous_release.txt"

if [ ! -f "$PREVIOUS_FILE" ]; then
    echo "WARN: No previous release is recorded. Rollback skipped."
    exit 0
fi

PREVIOUS_RELEASE_ID="$(tr -d '[:space:]' < "$PREVIOUS_FILE")"

if [ -z "$PREVIOUS_RELEASE_ID" ] || [ "$PREVIOUS_RELEASE_ID" = "current" ]; then
    echo "WARN: Invalid previous release ID. Rollback skipped."
    rm -f "$PREVIOUS_FILE"
    exit 0
fi

PREVIOUS_RELEASE_DIR="/opt/siged-lampa/releases/$PREVIOUS_RELEASE_ID"
PREVIOUS_COMPOSE_FILE="$PREVIOUS_RELEASE_DIR/infra/deployment/docker-compose.production.yml"
PREVIOUS_ENV_FILE="$PREVIOUS_RELEASE_DIR/infra/deployment/.env.production"

if [ ! -d "$PREVIOUS_RELEASE_DIR" ]; then
    echo "WARN: Previous release directory does not exist: $PREVIOUS_RELEASE_DIR"
    rm -f "$PREVIOUS_FILE"
    exit 0
fi

if [ ! -f "$PREVIOUS_COMPOSE_FILE" ]; then
    echo "WARN: Previous release Compose file does not exist."
    exit 0
fi

ln -sfn \
    "$SHARED_DIR/.env.production" \
    "$PREVIOUS_ENV_FILE"

echo "Rolling back to release: $PREVIOUS_RELEASE_ID"

if [ -f "$RELEASE_DIR/infra/deployment/docker-compose.production.yml" ]; then
    docker compose \
        --env-file "$RELEASE_DIR/infra/deployment/.env.production" \
        -f "$RELEASE_DIR/infra/deployment/docker-compose.production.yml" \
        down --timeout 30 || true
fi

cd "$PREVIOUS_RELEASE_DIR"

docker compose \
    --env-file "$PREVIOUS_ENV_FILE" \
    -f "$PREVIOUS_COMPOSE_FILE" \
    up -d --build --remove-orphans

ln -sfn "$PREVIOUS_RELEASE_DIR" "$CURRENT_LINK"

echo "Rollback to $PREVIOUS_RELEASE_ID complete"
echo "ROLLBACK_COMPLETE"