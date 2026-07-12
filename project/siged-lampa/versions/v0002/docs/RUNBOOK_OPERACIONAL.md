# Runbook Operacional — SIGED Lampa

## 1. Despliegue

### Despliegue manual (GitHub Actions)

1. Ir a GitHub → Actions → "Deploy to EC2"
2. Click "Run workflow"
3. Seleccionar rama/ref (ej: `main`)
4. Monitorear progreso en la UI de Actions

### Verificar estado del despliegue

```bash
# Desde EC2
cd /opt/siged-lampa/current
docker compose -f infra/deployment/docker-compose.production.yml ps

# Health check directo
curl -f http://localhost/ && echo "Frontend OK"
curl -f http://localhost/api/health && echo "Backend OK"
```

## 2. Monitoreo

### Logs

```bash
# Todos los servicios (follow)
docker compose -f /opt/siged-lampa/current/infra/deployment/docker-compose.production.yml logs -f

# Servicio específico
docker compose -f /opt/siged-lampa/current/infra/deployment/docker-compose.production.yml logs -f backend
docker compose -f /opt/siged-lampa/current/infra/deployment/docker-compose.production.yml logs -f frontend
docker compose -f /opt/siged-lampa/current/infra/deployment/docker-compose.production.yml logs -f postgres
```

### Sistema

```bash
# Recursos
docker stats --no-stream

# Espacio en disco
df -h /opt/siged-lampa

# Volumen PostgreSQL
docker volume ls | grep pgdata_production
```

## 3. Backup y Restauración

### Backup manual

```bash
docker exec -t siged-db-production pg_dump -U siged -d siged_lampa \
  --clean --if-exists | gzip > /opt/siged-lampa/backups/manual-$(date +%Y%m%d%H%M%S).sql.gz
```

### Restauración

```bash
gunzip -c /opt/siged-lampa/backups/<backup-file>.sql.gz | \
  docker exec -i siged-db-production psql -U siged -d siged_lampa
```

## 4. Incidentes Comunes

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| 502 Bad Gateway | Backend no disponible | `docker compose logs backend` |
| Frontend blank page | Build corrupto | Revisar logs Nginx: `docker compose logs frontend` |
| Migrations fail | DB schema conflict | Restaurar backup, rollback |
| Backend crash loop | DB connection | Verificar POSTGRES_PASSWORD en `.env.production` |
| Puerto 80 ocupado | Otro servicio | `sudo lsof -i :80`, detener conflicto |

## 5. Mantenimiento

### PostgreSQL vacuum

```bash
docker exec siged-db-production psql -U siged -d siged_lampa -c "VACUUM ANALYZE;"
```

### Limpieza de releases antiguos

```bash
# Manual
sudo ls /opt/siged-lampa/releases/
sudo rm -rf /opt/siged-lampa/releases/<old-release>

# Automático (vía cleanup-releases.sh)
sudo CLEANUP_KEEP=3 bash /opt/siged-lampa/current/infra/deployment/scripts/cleanup-releases.sh
```

### Rotación de logs de Docker

```bash
sudo crontab -l 2>/dev/null; echo "0 3 * * * docker system prune -af --filter 'until=72h' >> /var/log/docker-cleanup.log 2>&1" | sudo crontab -
```
