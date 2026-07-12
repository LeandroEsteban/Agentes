#!/bin/bash
set -Eeuo pipefail

echo "=== [6/7] rollback ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
SHARED_DIR="/opt/siged-lampa/shared"
CURRENT_DIR="/opt/siged-lampa/current"
PREVIOUS_FILE="/opt/siged-lampa/previous_release.txt"

if [ ! -f "$PREVIOUS_FILE" ]; then
    echo "FATAL: No previous release to rollback to. $PREVIOUS_FILE not found."
    exit 1
fi

PREVIOUS_RELEASE_ID=$(cat "$PREVIOUS_FILE")
PREVIOUS_RELEASE_DIR="/opt/siged-lampa/releases/$PREVIOUS_RELEASE_ID"

if [ ! -d "$PREVIOUS_RELEASE_DIR" ]; then
    echo "FATAL: Previous release directory $PREVIOUS_RELEASE_DIR does not exist."
    exit 1
fi

echo "Rolling back to release: $PREVIOUS_RELEASE_ID"

# Stop current release stack
docker compose -f "$RELEASE_DIR/infra/deployment/docker-compose.production.yml" down --timeout 30

# Start previous release stack
cp "$SHARED_DIR/.env.production" "$PREVIOUS_RELEASE_DIR/infra/deployment/.env.production"
cd "$PREVIOUS_RELEASE_DIR"
docker compose -f infra/deployment/docker-compose.production.yml up -d --build --remove-orphans

# Update symlink
ln -sfn "$PREVIOUS_RELEASE_DIR" "$CURRENT_DIR"

# Record current as new previous for next rollback
echo "$PREVIOUS_RELEASE_ID" > "$PREVIOUS_FILE"

echo "Rollback to $PREVIOUS_RELEASE_ID complete. Previous release: $RELEASE_ID"
echo "ROLLBACK_COMPLETE"
