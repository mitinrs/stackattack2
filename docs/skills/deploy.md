# Deploy Skill

Deploy the application to production with pre-flight checks.

## Usage

```
/deploy
```

## Pre-deployment Checklist

### 1. Run Lint
```bash
npm run lint
```
- Fix all **errors** before deploying (warnings are OK)
- Common fixes:
  - Unused variables: prefix with `_` (e.g., `_unusedVar`)
  - Prettier formatting: run `npm run lint -- --fix`

### 2. Run Tests
```bash
npm run test:run
```
- All tests must pass
- If tests fail, fix the code, not the tests

### 3. Build Check
```bash
npm run build
```
- Verify build completes without errors
- Check output files are generated in `dist/`

### 4. Commit and Push
```bash
git add <files>
git commit -m "Description"
git push
```

## Post-deployment Verification

### 1. Check GitHub Actions
- Go to: https://github.com/{owner}/{repo}/actions
- Verify both workflows pass:
  - **Test** workflow: lint, tests, build
  - **Deploy** workflow: Docker build and push

### 2. Verify Docker Image Updated
- Check ghcr.io package page for new timestamp
- If timestamp unchanged:
  - Problem: Docker cache not invalidated
  - Solution: Ensure `no-cache: true` in deploy.yml or proper CACHEBUST

### 3. Update Container (Portainer)
- Go to Portainer → Stacks → {stack-name}
- Click "Pull and redeploy"
- Or wait for Watchtower auto-update

### 4. Verify Production
- Open production URL
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
- Check browser console for errors

## Common Issues

### Black/White Page on Prod
**Cause:** Content Security Policy blocking scripts
**Solution:** Add `'unsafe-eval'` to `script-src` in nginx.conf for WebGL/PixiJS apps:
```nginx
add_header Content-Security-Policy "... script-src 'self' 'unsafe-eval'; ..." always;
```

### Docker Image Not Updating
**Cause:** GitHub Actions cache
**Solution:** Use `no-cache: true` in build-push-action:
```yaml
- uses: docker/build-push-action@v5
  with:
    no-cache: true
```

### Lint Errors in CI but Not Locally
**Cause:** Different Node versions or stale local dependencies
**Solution:**
```bash
rm -rf node_modules
npm ci
npm run lint
```

### Portainer "Pull Denied"
**Cause:** Missing registry authentication
**Solution:** Add ghcr.io registry in Portainer:
- Settings → Registries → Add registry
- URL: `ghcr.io`
- Username: GitHub username
- Password: GitHub PAT with `read:packages` scope

## Files Reference

| File | Purpose |
|------|---------|
| `.github/workflows/test.yml` | CI tests workflow |
| `.github/workflows/deploy.yml` | Docker build & push |
| `Dockerfile` | Container build instructions |
| `nginx.conf` | Production server config |
| `docker-compose.yml` | Deployment stack definition |
