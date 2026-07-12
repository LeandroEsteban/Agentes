# Rollback Procedure

## Automatic Rollback

The GitHub Actions workflow automatically triggers rollback if any of these steps fail:

1. **validate-environment** — missing files or invalid compose config
2. **deploy-release** — docker compose up fails or services crash
3. **run-migrations** — migration or seed script fails
4. **health-check** — any service not healthy after retries
5. **smoke-test** — API or frontend returns unexpected status codes

During rollback, the workflow:
1. Stops the current (failed) release stack
2. Starts the previous release stack
3. Updates the `current` symlink
4. Updates `previous_release.txt`

## Manual Rollback

To manually rollback from the EC2 instance:

```bash
# List available releases
ls -la /opt/siged-lampa/releases/

# Check current symlink
readlink -f /opt/siged-lampa/current

# Find previous release
cat /opt/siged-lampa/previous_release.txt

# Stop current
cd /opt/siged-lampa/releases/<current-failed>
docker compose -f infra/deployment/docker-compose.production.yml down --timeout 30

# Start previous
cd /opt/siged-lampa/releases/<previous-good>
docker compose -f infra/deployment/docker-compose.production.yml up -d --build

# Update symlinks
sudo ln -sfn /opt/siged-lampa/releases/<previous-good> /opt/siged-lampa/current
echo "<previous-good>" | sudo tee /opt/siged-lampa/previous_release.txt
```

## Recovery from Failed Migration

If a migration fails mid-way:

```bash
# Restore pre-migration backup
cd /opt/siged-lampa/releases/<current-failed>
docker compose -f infra/deployment/docker-compose.production.yml exec -T postgres \
  psql -U siged -d siged_lampa < /opt/siged-lampa/backups/pre-migration-<release>.sql

# Then proceed with manual rollback
```

## Persistence Notes

- Database volume persists across deployments (never run `docker compose down -v`)
- `.env.production` is not modified by the workflow
- Failed releases are kept for debugging and cleaned up only by the cleanup script
