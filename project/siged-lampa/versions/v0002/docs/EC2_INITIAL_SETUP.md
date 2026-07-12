# EC2 Initial Setup

Run these commands once on the EC2 instance before the first deployment.

## Prerequisites

```bash
# Install Docker
sudo yum install -y docker  # Amazon Linux
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Install Docker Compose (standalone, not plugin)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Python 3 (for JSON parsing in health check)
sudo yum install -y python3

# Verify
docker --version
docker-compose --version
```

## Directory Structure

```bash
sudo mkdir -p /opt/siged-lampa/{releases,shared,backups,logs}
```

## Environment File

```bash
# Generate secrets
POSTGRES_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 64)

# Create production env file
sudo tee /opt/siged-lampa/shared/.env.production << EOF
POSTGRES_PASSWORD=$POSTGRES_PASS
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=1h
BODY_LIMIT=10mb
EOF

sudo chmod 600 /opt/siged-lampa/shared/.env.production
sudo chown -R root:root /opt/siged-lampa

# Save the PostgreSQL password securely for future reference
echo "POSTGRES_PASSWORD=$POSTGRES_PASS" | sudo tee /opt/siged-lampa/shared/.env.production
```

## Network

Ensure EC2 security group allows:
- Port 80 (HTTP) from 0.0.0.0/0 (or your IP range)
- Port 22 (SSH) from your IP only
- No public access to port 5432

## Verify SSH

```bash
# From local machine
ssh -i /path/to/key.pem ec2-user@<EC2_HOST>
```
