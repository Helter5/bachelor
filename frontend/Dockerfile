FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=""
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_LOCAL_SYNC_AGENT_URL=""
ARG VITE_SYNC_MODE=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_LOCAL_SYNC_AGENT_URL=$VITE_LOCAL_SYNC_AGENT_URL
ENV VITE_SYNC_MODE=$VITE_SYNC_MODE

COPY package*.json ./

RUN npm ci --legacy-peer-deps

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
