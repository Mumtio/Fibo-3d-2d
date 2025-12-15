# GenForge - AI-Powered Game Asset Generator

> 🏆 **FIBO Hackathon Submission** | Category: **Best New User Experience or Professional Tool**

GenForge is a unified game asset generation platform that leverages **Bria FIBO's JSON-native structured prompts** to create production-ready 2D sprite sheets and 3D models from simple text descriptions.

![GenForge](https://img.shields.io/badge/Powered%20by-Bria%20FIBO-blue)
![React](https://img.shields.io/badge/Frontend-React%2019-61dafb)
![Three.js](https://img.shields.io/badge/3D%20Viewer-Three.js-black)
![Python](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Flask-green)

---

## 🎯 What It Does

GenForge transforms natural language prompts into game-ready assets through FIBO's deterministic JSON control:

| Mode | Input | Output | FIBO Features Used |
|------|-------|--------|-------------------|
| **2D Sprites** | "ninja warrior with katana" | Animated sprite sheets (PNG, GIF) | Structured prompts, style control, composition |
| **3D Models** | "cyberpunk robot with neon wings" | GLB/OBJ models | Camera angle, lighting, studio setup |

---

## 🔥 FIBO Integration Highlights

### JSON-Native Structured Prompts

GenForge uses FIBO's structured prompt format for precise, reproducible output:

```json
{
  "short_description": "A anime style 2D game sprite sheet showing 6 animation frames",
  "objects": [{
    "description": "ninja warrior character in different run poses",
    "location": "arranged in a grid pattern",
    "texture": "clean, flat 2D game art texture"
  }],
  "background_setting": "Solid magenta (#FF00FF) chroma key background",
  "lighting": { "conditions": "Flat, even lighting", "shadows": "None" },
  "aesthetics": { "composition": "Grid layout: 3 columns x 2 rows" },
  "photographic_characteristics": { "camera_angle": "Side view / profile" },
  "artistic_style": "anime"
}
```

### Professional Camera & Lighting Control (3D Pipeline)

For 3D asset generation, we use FIBO's pro-grade parameters:

```python
{
    "camera_angle": "Front view",
    "lens_focal_length": "50mm",
    "depth_of_field": "Deep focus",
    "lighting": {
        "conditions": "Studio lighting",
        "direction": "Front",
        "shadows": "Minimal"
    }
}
```

### Controllable Style Presets

6 built-in presets with JSON-defined parameters:
- `anime_action` - Dynamic anime style (512×512)
- `pixel_art_rpg` - Top-down RPG (64×64)
- `pixel_art_platformer` - Side-scroller (64×64)
- `cartoon_platformer` - Colorful cartoon (256×256)
- `chibi` - Cute chibi style (256×256)
- `realistic_2d` - High-fidelity art (512×512)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GenForge Frontend                        │
│              React + Three.js + Framer Motion               │
└─────────────────────┬───────────────────┬───────────────────┘
                      │                   │
          ┌───────────▼───────┐   ┌───────▼───────────┐
          │  2D Sprite Backend │   │  3D Model Backend │
          │   Flask + Python   │   │  FastAPI + Python │
          └─────────┬─────────┘   └─────────┬─────────┘
                    │                       │
          ┌─────────▼─────────┐   ┌─────────▼─────────┐
          │    BRIA FIBO API   │   │    BRIA FIBO API   │
          │  (Structured Gen)  │   │  (Reference Image) │
          └───────────────────┘   └─────────┬─────────┘
                                            │
                                  ┌─────────▼─────────┐
                                  │    TRIPO API      │
                                  │  (Image → 3D)     │
                                  └───────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Bria API Key ([Get one here](https://bria.ai))

### 1. Clone & Install Frontend

```bash
git clone https://github.com/your-repo/genforge
cd genforge
npm install
```

### 2. Start 2D Sprite Backend

```bash
cd "backend 2d sprite/GenForgeSprite-main"
pip install -r requirements.txt

# Set your API key
echo "BRIA_API_KEY=your_key_here" > .env

python app.py
# Runs on http://localhost:5000
```

### 3. Start 3D Model Backend

```bash
cd "3d backend"
pip install -r requirements.txt

# Set your API keys in .env
# BRIA_API_KEY=your_bria_key
# TRIPO_API_KEY=your_tripo_key

uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

### 4. Start Frontend

```bash
npm run dev
# Opens http://localhost:5173
```

---

## 📸 Demo

### 2D Sprite Generation
1. Select "2D SPRITE" mode
2. Enter prompt: "ninja warrior with katana, red outfit"
3. Choose style preset (e.g., `anime_action`)
4. Select animations: idle, run, attack
5. Click Generate → Get animated sprite sheets

### 3D Model Generation
1. Select "3D MODEL" mode
2. Enter prompt: "cyberpunk robot with neon wings"
3. Click Generate → FIBO creates reference image → TRIPO converts to 3D
4. View and download GLB model

---

## 🎮 Game Engine Integration

GenForge outputs include ready-to-use metadata for popular engines:

### Phaser.js
```javascript
this.load.spritesheet('character', 'combined_sheet.png', {
    frameWidth: 512, frameHeight: 512
});
```

### Unity
- Import sprite sheet as Sprite (Multiple)
- Use metadata JSON for automatic animation clip setup

### Godot
- Load metadata.json for animation configuration
- Automatic frame timing from preset

---

## 📁 Project Structure

```
genforge/
├── App.tsx                 # Main React app
├── pages/
│   ├── Home.tsx           # Landing page
│   └── Generator.tsx      # Generation interface
├── services/
│   └── api.ts             # Backend API client
├── components/
│   ├── three/             # 3D model viewer (Three.js)
│   ├── sprite/            # Sprite animator
│   └── ui/                # UI components
├── backend 2d sprite/
│   └── GenForgeSprite-main/
│       ├── services/
│       │   └── fibo_client.py    # FIBO API integration
│       └── presets/              # Style preset JSONs
└── 3d backend/
    └── app/
        ├── services/
        │   ├── image_service.py  # FIBO structured prompts
        │   └── tripo_service.py  # 3D conversion
        └── routers/
            └── generation.py     # Pipeline orchestration
```

---

## 🔧 API Endpoints

### 2D Sprite Backend (localhost:5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sprite/health` | Health check |
| GET | `/api/sprite/presets` | List style presets |
| POST | `/api/sprite/generate` | Generate sprite sheets |
| POST | `/api/sprite/refine` | Refine with feedback |

### 3D Model Backend (localhost:8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/fibo/structured` | Get structured prompt |
| POST | `/3d/generate-full-pipeline` | Start async generation |
| GET | `/3d/status/{job_id}` | Check job status |
| POST | `/3d/generate-sync` | Synchronous generation |

---

## 🎨 Why FIBO?

| Feature | Benefit for GenForge |
|---------|---------------------|
| **JSON-Native Control** | Reproducible sprite sheets with exact grid layouts |
| **Structured Prompts** | Consistent character design across animation frames |
| **Camera Parameters** | Perfect reference images for 3D conversion |
| **Style Disentanglement** | Clean separation between character and background |
| **Commercial License** | Production-ready assets with full indemnity |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Three.js, Framer Motion, Zustand, TailwindCSS
- **2D Backend**: Flask, Pillow, BRIA FIBO API
- **3D Backend**: FastAPI, BRIA FIBO API, TRIPO API
- **3D Viewer**: @react-three/fiber, @react-three/drei

---

## 📄 License

MIT License - Built for FIBO Hackathon 2024

---

## 👥 Team

Built with ❤️ using Bria FIBO

---

## 🔗 Links

- [Bria FIBO Documentation](https://docs.bria.ai)
- [FIBO on Hugging Face](https://huggingface.co/briaai)
- [Bria GitHub](https://github.com/bria-ai)
