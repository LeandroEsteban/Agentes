# GitHub Secrets Configuration

## Repository Secrets (must be set in GitHub)

| Secret | Description | Source |
|--------|-------------|--------|
| `EC2_HOST` | Public IP or DNS of the EC2 instance | AWS Console |
| `EC2_USER` | SSH user (typically `ec2-user` or `ubuntu`) | AMI type |
| `EC2_SSH_KEY` | Full private SSH key (PEM) content | Key pair generated for EC2 |

## Environment Variables NOT in GitHub Secrets

These must exist on the EC2 instance in `/opt/siged-lampa/shared/.env.production`:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL superuser password |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default: `1h`) |
| `BODY_LIMIT` | Max request body size (default: `10mb`) |

## Security Rules

1. Never commit `.env.production` to the repository
2. The workflow does not read or transmit application secrets
3. SSH key has minimum necessary permissions (chmod 600)
4. Use `ssh-keyscan` to verify host key, not `StrictHostKeyChecking=no`
5. Workflow uses `contents: read` only
