# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Cache buster - invalidates cache for source code changes
ARG CACHEBUST
RUN echo "Cache bust: ${CACHEBUST}"

# Copy source code
COPY . .

# Build the application
RUN npm run build && ls -la dist/

# Stage 2: Production image with nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
