# Deployment Pipeline — GitHub Actions → EC2

## Architecture

```
GitHub Actions
    │
    ├── 1. Checkout (ref specified in workflow_dispatch)
    ├── 2. Generate RELEASE_ID (YYYYMMDDHHMMSS-commit7)
    ├── 3. Package release (.tar.gz, excluding dev artifacts)
    ├── 4. Copy to EC2 via SCP
    ├── 5. Extract on EC2
    ├── 6. validate-environment.sh
    ├── 7. deploy-release.sh (docker compose up --build)
    ├── 8. run-migrations.sh (pg_dump backup, migrate, seed)
    ├── 9. health-check.sh (all services healthy + API endpoint)
    ├── 10. smoke-test.sh (HTTP 200 on / and /api/health)
    ├── 11. Finalize (symlink, cleanup)
    └── 12. On failure → rollback.sh
```

## Release Directory Structure on EC2

```
/opt/siged-lampa/
├── current → /opt/siged-lampa/releases/<active>  (symlink)
├── previous_release.txt                           (stores previous release ID)
├── shared/
│   └── .env.production                            (secrets, NOT in repo)
├── releases/
│   ├── 20250712000000-abc1234/
│   │   ├── backend/
│   │   ├── frontend/
│   │   ├── database/
│   │   └── infra/deployment/
│   │       ├── docker-compose.production.yml
│   │       └── scripts/
│   ├── 20250711120000-def5678/
│   └── 20250711000000-ghi9012/
├── backups/
│   └── pre-migration-<release>.sql
└── logs/
```

## Concurrency

The workflow uses `concurrency.group: siged-lampa-production` with
`cancel-in-progress: false` to prevent interrupting running migrations.

## Trigger

Only `workflow_dispatch` is enabled. No automatic triggers on push.

## Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `EC2_HOST` | EC2 public IP or DNS |
| `EC2_USER` | SSH username |
| `EC2_SSH_KEY` | Private key for SSH authentication |

## Security

- Application secrets are NEVER stored in GitHub Secrets
- The workflow does not print or expose any secret values
- SSH uses key-based authentication with known host verification
- No `StrictHostKeyChecking=no` — uses `ssh-keyscan` instead
