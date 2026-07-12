#!/bin/bash
set -Eeuo pipefail

echo "=== [2/7] deploy-release ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
COMPOSE_FILE="$RELEASE_DIR/infra/deployment/docker-compose.production.yml"
ENV_FILE="$RELEASE_DIR/infra/deployment/.env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo "FATAL: $ENV_FILE does not exist."
    exit 1
fi

cd "$RELEASE_DIR"

echo "Pulling external images..."
docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    pull

echo "Building and starting production stack..."
docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    up -d --build --remove-orphans

echo "Waiting for PostgreSQL..."
for attempt in $(seq 1 30); do
    if docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_FILE" \
        exec -T postgres \
        pg_isready -U siged -d siged_lampa --quiet
    then
        echo "PostgreSQL is ready"
        echo "DEPLOY_COMPLETE"
        exit 0
    fi

    echo "Waiting for PostgreSQL: attempt ${attempt}/30"
    sleep 3
done

echo "FATAL: PostgreSQL did not become ready"
docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    ps

exit 1