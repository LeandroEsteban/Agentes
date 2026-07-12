# Guía PostgreSQL DEV/QA - SIGED-Lampa v0002

## Prerrequisitos

- Docker Desktop 24+
- Node.js 20+
- `npm install -g pg` (o `npm install pg` en el proyecto)

## Entorno DEV

### Iniciar PostgreSQL

```powershell
docker compose -f project/siged-lampa/versions/v0002/docker-compose.dev.yml up -d
```

### Ejecutar migraciones

```powershell
cd project/siged-lampa/versions/v0002
$env:DATABASE_URL="postgresql://siged_dev:siged_dev_2026@localhost:5432/siged_lampa_dev"
node database/scripts/migrate.js
```

### Ejecutar seeds

```powershell
node database/scripts/seed.js
```

### Verificar esquema

```powershell
node database/scripts/verify-schema.js
```

## Entorno QA

### Iniciar QA (incluye migrador automático)

```powershell
docker compose -f project/siged-lampa/versions/v0002/docker-compose.qa.yml up -d
```

### Health check manual

```powershell
docker exec siged-db-qa pg_isready -U siged_qa -d siged_lampa_qa
```

### Reset QA (requiere --force)

```powershell
$env:DATABASE_URL="postgresql://siged_qa:siged_qa_2026_secret@localhost:5433/siged_lampa_qa"
$env:APP_ENV="qa"
node database/scripts/reset.js --force
```

## Diferencias DEV vs QA

| Aspecto | DEV | QA |
|---------|-----|-----|
| Puerto PostgreSQL | 5432 | 5433 |
| Usuario DB | siged_dev | siged_qa |
| Contraseña | siged_dev_2026 | siged_qa_2026_secret |
| POSTGRES_HOST_AUTH_METHOD | trust | password |
| Volumen | tmpfs (512 MB) | persistente |
| Migraciones automáticas | No | Sí (servicio migrator) |
| Seeds automáticos | No | Sí |
| Health check PostgreSQL | Sí | Sí |
| Health check app | No | No implementado |

## Limitaciones conocidas

1. No implementa aún conexión SSL/TLS
2. No implementa aún connection pooling externo (PgBouncer)
3. No implementa aún backup automatizado
4. No implementa aún replicación
5. contraseñas QA son fijas en docker-compose (mejorar con secrets)
6. Modo memory solo disponible para pruebas unitarias específicas

## CLI WebForge

```powershell
python -m webforge db migrate --work-order examples/work_order_siged_lampa.json --environment qa --output runs/phase4-db
python -m webforge db seed --work-order examples/work_order_siged_lampa.json --environment qa --output runs/phase4-db
python -m webforge db verify --work-order examples/work_order_siged_lampa.json --environment qa --output runs/phase4-db
python -m webforge db test --work-order examples/work_order_siged_lampa.json --environment qa --output runs/phase4-db
```
