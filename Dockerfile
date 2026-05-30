# ============================================
# Stage 1: Build React Frontend
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for layer caching
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./

# API URL: use relative path so it works regardless of domain
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Clerk publishable key (optional - for Clerk sign-in integration)
ARG REACT_APP_CLERK_PUBLISHABLE_KEY=
ENV REACT_APP_CLERK_PUBLISHABLE_KEY=$REACT_APP_CLERK_PUBLISHABLE_KEY

RUN npm run build

# ============================================
# Stage 2: Node.js Backend
# ============================================
FROM node:18-alpine AS backend

WORKDIR /app

# Copy backend package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY . .

# Copy built frontend from Stage 1 into the public directory
COPY --from=frontend-builder /app/frontend/build ./public

EXPOSE 5500

CMD ["node", "index.js"]
