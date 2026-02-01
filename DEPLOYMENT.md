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

---

# Руководство по развёртыванию (RU)

Это руководство описывает развёртывание Stack Attack 2 Pro на вашем сервере с использованием Docker и GitHub Actions.

## Архитектура

```
Push в main/master
    ↓
GitHub Actions:
    ├→ Тесты (lint, test, build)
    └→ Сборка и push образа в ghcr.io
        ↓
Ваш сервер:
    └→ Docker-контейнер (ручное или автообновление)
        ↓
    Reverse proxy (Traefik/Nginx) + HTTPS
        ↓
    https://your-domain.com
```

## Быстрый старт (готовый образ)

Публичный Docker-образ доступен по адресу:
```bash
docker pull ghcr.io/mitinrs/stackattack2:latest
```

Запуск локально:
```bash
docker run -p 8080:80 ghcr.io/mitinrs/stackattack2:latest
# Открыть http://localhost:8080
```

## Развёртывание на своём сервере

### Вариант 1: Форк и свой CI/CD

1. **Сделайте форк репозитория** на GitHub

2. **Включите GitHub Actions** в форке (вкладка Actions → Enable)

3. **GitHub Actions автоматически:**
   - Запускает тесты при каждом push
   - Собирает и публикует Docker-образ в `ghcr.io/<ваш-username>/stackattack2:latest`

4. **Сделайте пакет публичным** (опционально, но рекомендуется):
   - Перейдите в форк → Packages → stackattack2 → Package settings
   - Измените visibility на Public

5. **Разверните на сервере** используя образ `ghcr.io/<ваш-username>/stackattack2:latest`

### Вариант 2: Использовать оригинальный образ

Развёртывание с использованием готового образа из этого репозитория.

## Настройка сервера с Docker Compose

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

### С Traefik (HTTPS)

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

## Настройка Portainer

### 1. Добавление Registry (обязательно для ghcr.io)

Даже для публичных пакетов ghcr.io требует аутентификации:

1. **Portainer** → **Settings** → **Registries** → **Add registry**
2. Выберите **Custom registry**
3. Заполните:
   - **Name:** `GitHub Container Registry`
   - **Registry URL:** `ghcr.io`
   - **Authentication:** Включить
   - **Username:** Ваш GitHub username
   - **Password:** GitHub Personal Access Token с правом `read:packages`

### 2. Создание Stack

1. **Portainer** → **Stacks** → **Add stack**
2. **Name:** `stackattack2`
3. **Build method:** Выберите один из вариантов:
   - **Web editor:** Вставьте содержимое docker-compose.yml
   - **Repository:** Используйте Git URL `https://github.com/mitinrs/stackattack2`
4. **Deploy the stack**

### 3. Обновление контейнера

- **Вручную:** Stacks → stackattack2 → "Pull and redeploy"
- **Автоматически:** Используйте [Watchtower](https://containrrr.dev/watchtower/) для автообновления

## Создание GitHub PAT

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. **Generate new token (classic)**
3. Выберите scope: `read:packages`
4. Скопируйте токен (он больше не будет показан)

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Запуск тестов
npm run test

# Сборка для production
npm run build

# Сборка Docker-образа локально
docker build -t stackattack2 .

# Запуск локальной Docker-сборки
docker run -p 8080:80 stackattack2
```

## Решение проблем

### Ошибка при pull образа

```
Error: denied: denied
```

**Решение:** Добавьте ghcr.io registry с аутентификацией в Portainer (см. выше).

### Контейнер не обновляется

```bash
# Принудительный pull и пересоздание
docker pull ghcr.io/mitinrs/stackattack2:latest
docker compose up -d --force-recreate
```

### Просмотр логов контейнера

```bash
docker logs stackattack2
```

### Проверка версии образа

```bash
docker inspect ghcr.io/mitinrs/stackattack2:latest | grep -i created
```

## Ссылки

- **Демо:** https://stackattack2.pusk365.ru
- **Репозиторий:** https://github.com/mitinrs/stackattack2
- **Docker-образ:** https://ghcr.io/mitinrs/stackattack2
