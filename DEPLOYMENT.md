# GenForge Deployment Guide

## Quick Start (Local Development)

### 1. Start 2D Sprite Backend (Port 5000)
```bash
cd "backend 2d sprite/GenForgeSprite-main"
pip install -r requirements.txt
python app.py
```

### 2. Start 3D Model Backend (Port 8000)
```bash
cd "3d backend"
pip install fastapi uvicorn requests python-dotenv
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Start Frontend (Port 3003)
```bash
npm install
npm run dev
```

---

## Production Deployment Options

### Option 1: Railway (Recommended - Easy)

#### Frontend (React/Vite)
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Create new project → Deploy from GitHub
4. Set build command: `npm run build`
5. Set start command: `npx serve dist -s -l 3000`
6. Add environment variables:
   - `VITE_SPRITE_API_URL=https://your-sprite-backend.railway.app`
   - `VITE_3D_API_URL=https://your-3d-backend.railway.app`

#### 2D Sprite Backend (Flask)
1. Create `Procfile` in `backend 2d sprite/GenForgeSprite-main`:
   ```
   web: gunicorn app:app --bind 0.0.0.0:$PORT
   ```
2. Add `gunicorn` to requirements.txt
3. Deploy to Railway from the subfolder

#### 3D Backend (FastAPI)
1. Create `Procfile` in `3d backend`:
   ```
   web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
2. Deploy to Railway from the subfolder

---

### Option 2: Render.com

#### Frontend
- Build Command: `npm install && npm run build`
- Start Command: `npx serve dist -s`
- Environment: Node

#### Backends
- Build Command: `pip install -r requirements.txt`
- Start Command (2D): `gunicorn app:app`
- Start Command (3D): `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

### Option 3: Vercel + Fly.io

#### Frontend on Vercel
1. Connect GitHub repo
2. Framework: Vite
3. Build: `npm run build`
4. Output: `dist`
5. Add env vars for API URLs

#### Backends on Fly.io
Create `fly.toml` for each backend:

```toml
# 2D Backend fly.toml
app = "genforge-sprite-api"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true

[[services]]
  internal_port = 8080
  protocol = "tcp"
  [[services.ports]]
    port = 443
```

Deploy: `fly deploy`

---

### Option 4: Docker (Self-hosted)

#### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_SPRITE_API_URL=http://sprite-api:5000
      - VITE_3D_API_URL=http://3d-api:8000

  sprite-api:
    build: ./backend 2d sprite/GenForgeSprite-main
    ports:
      - "5000:5000"
    environment:
      - BRIA_API_KEY=${BRIA_API_KEY}

  3d-api:
    build: ./3d backend
    ports:
      - "8000:8000"
    environment:
      - BRIA_API_KEY=${BRIA_API_KEY}
      - TRIPO_API_KEY=${TRIPO_API_KEY}
```

#### Frontend Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

#### Backend Dockerfile (2D Sprite)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt gunicorn
COPY . .
EXPOSE 5000
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000"]
```

#### Backend Dockerfile (3D)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Environment Variables

### Frontend (.env)
```
VITE_SPRITE_API_URL=http://localhost:5000
VITE_3D_API_URL=http://localhost:8000
```

### 2D Sprite Backend (.env)
```
BRIA_API_KEY=your_bria_api_key
```

### 3D Backend (.env)
```
BRIA_API_KEY=your_bria_api_key
TRIPO_API_KEY=your_tripo_api_key
```

---

## CORS Configuration

Both backends already have CORS enabled for all origins. For production, update:

### Flask (2D Backend) - app.py
```python
CORS(app, origins=["https://your-frontend-domain.com"])
```

### FastAPI (3D Backend) - main.py
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    ...
)
```

---

## SSL/HTTPS

All recommended platforms (Railway, Render, Vercel, Fly.io) provide automatic SSL certificates.

For self-hosted Docker, use a reverse proxy like:
- Nginx with Let's Encrypt
- Traefik
- Caddy (automatic HTTPS)
