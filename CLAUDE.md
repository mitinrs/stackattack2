# Stack Attack 2 Pro

Retro arcade game built with PixiJS and TypeScript.

## Quick Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # Run linter
npm run test:run # Run tests
```

## Skills

### /deploy
Pre-deployment checks and deployment guide. Run before pushing to production.

See: [docs/skills/deploy.md](docs/skills/deploy.md)

## Architecture

- **Frontend:** TypeScript + PixiJS
- **Build:** Vite
- **Container:** Docker + nginx
- **CI/CD:** GitHub Actions → ghcr.io → Portainer/Watchtower
- **Hosting:** VPS with Traefik reverse proxy

## Key Files

| File | Purpose |
|------|---------|
| `src/main.ts` | Application entry point |
| `src/scenes/GameScene.ts` | Main game scene |
| `src/systems/CrateManager.ts` | Crate physics and grid |
| `nginx.conf` | Production server config |
| `Dockerfile` | Container build |
| `.github/workflows/` | CI/CD pipelines |

## Production

- **URL:** https://stackattack2.pusk365.ru
- **Image:** ghcr.io/mitinrs/stackattack2:latest
