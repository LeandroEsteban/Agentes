#!/bin/bash
set -Eeuo pipefail

echo "=== [1/7] validate-environment ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASE_DIR="/opt/siged-lampa/releases/$RELEASE_ID"
SHARED_DIR="/opt/siged-lampa/shared"
COMPOSE_FILE="$RELEASE_DIR/infra/deployment/docker-compose.production.yml"
ENV_FILE="$RELEASE_DIR/infra/deployment/.env.production"

if [ ! -f "$SHARED_DIR/.env.production" ]; then
    echo "FATAL: $SHARED_DIR/.env.production not found."
    exit 1
fi

if [ ! -d "$RELEASE_DIR" ]; then
    echo "FATAL: $RELEASE_DIR does not exist."
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "FATAL: docker-compose.production.yml not found."
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "FATAL: $ENV_FILE not found."
    exit 1
fi

required_variables=(
    POSTGRES_PASSWORD
    JWT_SECRET
)

for variable in "${required_variables[@]}"; do
    if ! grep -Eq "^${variable}=.+$" "$ENV_FILE"; then
        echo "FATAL: ${variable} is missing or empty in .env.production"
        exit 1
    fi
done

echo "Validating Docker Compose configuration..."

if ! docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    config \
    >/tmp/siged-compose-config.out \
    2>/tmp/siged-compose-config.err
then
    echo "FATAL: docker-compose config validation failed."
    cat /tmp/siged-compose-config.err
    exit 1
fi

echo "Docker Compose configuration valid"
echo "VALIDATE_ENVIRONMENT_PASS"