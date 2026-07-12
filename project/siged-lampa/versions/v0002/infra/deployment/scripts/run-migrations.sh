#!/bin/bash
set -Eeuo pipefail

echo "=== [3/7] run-migrations ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
SHARED_DIR="/opt/siged-lampa/shared"
BACKUP_DIR="/opt/siged-lampa/backups"

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre-migration-${RELEASE_ID}.sql"

# Backup before migration
echo "Creating pre-migration backup..."
docker compose -f "$RELEASE_DIR/infra/deployment/docker-compose.production.yml" exec -T postgres \
    pg_dump -U siged -d siged_lampa --clean --if-exists > "$BACKUP_FILE"
echo "Backup saved to $BACKUP_FILE"

# Run migrations inside the backend container
echo "Running database migrations..."
docker compose -f "$RELEASE_DIR/infra/deployment/docker-compose.production.yml" exec -T backend \
    node database/scripts/migrate.js

# Run seeds (idempotent)
echo "Running database seeds..."
docker compose -f "$RELEASE_DIR/infra/deployment/docker-compose.production.yml" exec -T backend \
    node database/scripts/seed.js

echo "MIGRATIONS_COMPLETE"
