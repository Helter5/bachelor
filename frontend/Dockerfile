# syntax=docker/dockerfile:1.4
# Frontend Dockerfile - Multi-stage build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Use Docker BuildKit cache for npm to speed up repeated builds.
# This requires BuildKit enabled (DOCKER_BUILDKIT=1 or Docker Desktop default).
RUN --mount=type=cache,id=npm,target=/root/.npm npm ci --legacy-peer-deps

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
