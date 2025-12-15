# Backend Integration Guide

## Current Status

✅ **2D Sprite Generation** - Connected to GenForgeSprite backend  
⏳ **3D Model Generation** - Still using mock data (integrate your 3D backend)

## Quick Start

### 1. Start the Sprite Backend

```bash
cd "backend 2d sprite/GenForgeSprite-main"
pip install -r requirements.txt
python app.py
```

The backend runs on `http://localhost:5000` by default.

### 2. Start the Frontend

```bash
npm run dev
```

The frontend will automatically detect if the backend is online.

## Environment Configuration (Optional)

Create a `.env` file in the root to customize the backend URL:

```env
VITE_SPRITE_API_URL=http://localhost:5000
```

## 2D Sprite API Endpoints

The frontend connects to these GenForgeSprite endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sprite/health` | Health check |
| GET | `/api/sprite/presets` | List available style presets |
| POST | `/api/sprite/generate` | Generate sprite sheets |

### Generate Request

```typescript
POST /api/sprite/generate
{
  "prompt": "ninja warrior with katana",
  "preset": "anime_action",        // optional, defaults to anime_action
  "animations": ["idle", "run"]    // optional, generates all if omitted
}
```

### Generate Response

```typescript
{
  "job_id": "uuid",
  "status": "completed",
  "prompt": "ninja warrior with katana",
  "preset": "anime_action",
  "frame_size": [512, 512],
  "combined_sheet": "outputs/uuid/combined_sheet.png",
  "animations": {
    "idle": { "sprite_sheet": "...", "gif": "...", "frame_count": 4 },
    "run": { "sprite_sheet": "...", "gif": "...", "frame_count": 6 }
  },
  "download_urls": { ... }
}
```

## Available Presets

- `anime_action` - Dynamic anime-style (512x512)
- `pixel_art_rpg` - Top-down RPG pixel art (64x64)
- `pixel_art_platformer` - Side-scroller pixel art (64x64)
- `cartoon_platformer` - Colorful cartoon (256x256)
- `chibi` - Cute chibi style (256x256)
- `realistic_2d` - High-fidelity art (512x512)

## 3D Generation (TODO)

The 3D generation still uses mock data. To integrate your 3D backend:

1. Update `api.generate3D()` in `services/api.ts`
2. Implement endpoints for `/3d/generate`

## CORS

The Flask backend already has CORS enabled via `flask-cors`. If you need to restrict origins:

```python
# In app.py
CORS(app, origins=["http://localhost:5173"])
