#!/bin/bash
set -Eeuo pipefail

echo "=== [2/7] deploy-release ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
SHARED_DIR="/opt/siged-lampa/shared"
CURRENT_DIR="/opt/siged-lampa/current"
PREVIOUS_FILE="/opt/siged-lampa/previous_release.txt"

# Copy .env.production into release
cp "$SHARED_DIR/.env.production" "$RELEASE_DIR/infra/deployment/.env.production"

# Pull images and start stack
cd "$RELEASE_DIR"
docker compose -f infra/deployment/docker-compose.production.yml pull
docker compose -f infra/deployment/docker-compose.production.yml up -d --build --remove-orphans

# Wait for services to become healthy
echo "Waiting for postgres health..."
docker compose -f infra/deployment/docker-compose.production.yml exec -T postgres pg_isready -U siged -d siged_lampa --quiet

echo "DEPLOY_COMPLETE"
