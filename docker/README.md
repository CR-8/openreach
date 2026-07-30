# OpenReach Docker Deployment Guide

Deploy OpenReach locally or on your server in a single command using Docker Compose.

## Prerequisites
- Docker (v24.0+)
- Docker Compose (v2.20+)

## Quickstart

1. **Clone repository & enter docker folder:**
   ```bash
   cp .env.example .env
   ```

2. **Start the OpenReach stack:**
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

3. **Access the application:**
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:4000/api/docs (Swagger UI)
   - **MinIO Console:** http://localhost:9001 (minioadmin / minioadmin)
   - **LiteLLM Gateway:** http://localhost:4001
