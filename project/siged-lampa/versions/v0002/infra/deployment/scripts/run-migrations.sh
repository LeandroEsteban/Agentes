#!/bin/bash
set -Eeuo pipefail

echo "=== [3/7] run-migrations ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
BACKUP_DIR="/opt/siged-lampa/backups"
COMPOSE_FILE="$RELEASE_DIR/infra/deployment/docker-compose.production.yml"
ENV_FILE="$RELEASE_DIR/infra/deployment/.env.production"

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/pre-migration-${RELEASE_ID}.sql"

echo "Creating pre-migration backup..."

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    exec -T postgres \
    pg_dump -U siged -d siged_lampa --clean --if-exists \
    > "$BACKUP_FILE"

echo "Backup saved to $BACKUP_FILE"

echo "Running database migrations..."

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    exec -T backend \
    node database/scripts/migrate.js

echo "Running database seeds..."

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    exec -T backend \
    node database/scripts/seed.js

echo "MIGRATIONS_COMPLETE"