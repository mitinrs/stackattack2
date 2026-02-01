# Deployment Guide

This guide covers deploying Stack Attack 2 Pro to your own server using Docker and GitHub Actions.

## Architecture

```
Push to main/master
    ↓
GitHub Actions:
    ├→ Test (lint, test, build)
    └→ Build & push image to ghcr.io
        ↓
Your Server:
    └→ Docker container (manual or auto-updated)
        ↓
    Reverse proxy (Traefik/Nginx) + HTTPS
        ↓
    https://your-domain.com
```

## Quick Start (Using Pre-built Image)

The public Docker image is available at:
```bash
docker pull ghcr.io/mitinrs/stackattack2:latest
```

Run locally:
```bash
docker run -p 8080:80 ghcr.io/mitinrs/stackattack2:latest
# Open http://localhost:8080
```

## Self-Hosted Deployment

### Option 1: Fork and Deploy Your Own

1. **Fork the repository** on GitHub

2. **Enable GitHub Actions** in your fork (Actions tab → Enable)

3. **GitHub Actions will automatically:**
   - Run tests on every push
   - Build and push Docker image to `ghcr.io/<your-username>/stackattack2:latest`

4. **Make the package public** (optional but recommended):
   - Go to your fork → Packages → stackattack2 → Package settings
   - Change visibility to Public

5. **Deploy to your server** using the image `ghcr.io/<your-username>/stackattack2:latest`

### Option 2: Use Original Image

Deploy using the pre-built image from this repository.

## Server Setup with Docker Compose

### docker-compose.yml

```yaml
services:
  stackattack2:
    image: ghcr.io/mitinrs/stackattack2:latest
    container_name: stackattack2
    restart: unless-stopped
    ports:
      - "8080:80"
```

### With Traefik (HTTPS)

```yaml
services:
  stackattack2:
    image: ghcr.io/mitinrs/stackattack2:latest
    container_name: stackattack2
    restart: unless-stopped
    networks:
      - traefik_public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.stackattack2.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.stackattack2.entrypoints=websecure"
      - "traefik.http.routers.stackattack2.tls.certresolver=letsencrypt"
      - "traefik.http.services.stackattack2.loadbalancer.server.port=80"

networks:
  traefik_public:
    external: true
```

## Portainer Setup

### 1. Add Registry (Required for ghcr.io)

Even for public packages, ghcr.io requires authentication:

1. **Portainer** → **Settings** → **Registries** → **Add registry**
2. Select **Custom registry**
3. Fill in:
   - **Name:** `GitHub Container Registry`
   - **Registry URL:** `ghcr.io`
   - **Authentication:** Enable
   - **Username:** Your GitHub username
   - **Password:** GitHub Personal Access Token with `read:packages` scope

### 2. Create Stack

1. **Portainer** → **Stacks** → **Add stack**
2. **Name:** `stackattack2`
3. **Build method:** Choose one:
   - **Web editor:** Paste docker-compose.yml contents
   - **Repository:** Use Git URL `https://github.com/mitinrs/stackattack2`
4. **Deploy the stack**

### 3. Update Container

- **Manual:** Stacks → stackattack2 → "Pull and redeploy"
- **Automatic:** Use [Watchtower](https://containrrr.dev/watchtower/) to auto-update

## Creating GitHub PAT

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. **Generate new token (classic)**
3. Select scope: `read:packages`
4. Copy the token (you won't see it again)

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Build Docker image locally
docker build -t stackattack2 .

# Run local Docker build
docker run -p 8080:80 stackattack2
```

## Troubleshooting

### Image pull denied

```
Error: denied: denied
```

**Solution:** Add ghcr.io registry with authentication in Portainer (see above).

### Container not updating

```bash
# Force pull and recreate
docker pull ghcr.io/mitinrs/stackattack2:latest
docker compose up -d --force-recreate
```

### Check container logs

```bash
docker logs stackattack2
```

### Verify image version

```bash
docker inspect ghcr.io/mitinrs/stackattack2:latest | grep -i created
```

## Links

- **Demo:** https://stackattack2.pusk365.ru
- **Repository:** https://github.com/mitinrs/stackattack2
- **Docker Image:** https://ghcr.io/mitinrs/stackattack2
