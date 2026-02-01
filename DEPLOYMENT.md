# Deployment Guide

## Architecture

```
Push to main/master
    ↓
GitHub Actions:
    ├→ Test (lint, test, build)
    └→ Build & push image: ghcr.io/mitinrs/stackattack2:latest
        ↓
Portainer (VPS):
    └→ stackattack2 container (auto-updated by Watchtower)
        ↓
    Traefik (reverse proxy + HTTPS)
        ↓
    https://stackattack2.pusk365.ru
```

## Initial Setup on Portainer

### 1. Create Stack

1. Go to Portainer → Stacks → Add stack
2. Name: `stackattack2`
3. Paste contents of `docker-compose.yml`
4. Deploy the stack

### 2. Configure Registry Access (if repo is private)

1. Portainer → Registries → Add registry
2. Select "GitHub Container Registry"
3. Username: `mitinrs`
4. Password: GitHub Personal Access Token with `read:packages` scope

## Deployment Methods

### Automatic (Recommended)

Push to `main` or `master` branch → GitHub Actions builds image → Watchtower auto-updates container

### Manual via GitHub

1. Go to repository → Actions → "Deploy to VPS"
2. Click "Run workflow"

### Manual via Portainer

1. Portainer → Stacks → stackattack2
2. Click "Pull and redeploy"

## Monitoring

- **GitHub Actions logs:** Repository → Actions → Deploy to VPS
- **Portainer logs:** Containers → stackattack2 → Logs
- **Health check:** https://stackattack2.pusk365.ru/health
- **Application:** https://stackattack2.pusk365.ru

## Troubleshooting

### Image not updating

```bash
# Force pull and recreate
docker pull ghcr.io/mitinrs/stackattack2:latest
docker compose up -d --force-recreate
```

### Check container status

```bash
docker logs stackattack2
docker inspect stackattack2
```

## Local Development

```bash
# Build image locally
docker build -t stackattack2 .

# Run locally
docker run -p 8080:80 stackattack2

# Open http://localhost:8080
```
