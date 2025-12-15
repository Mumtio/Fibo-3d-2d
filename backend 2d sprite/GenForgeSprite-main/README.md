# 2D Sprite Generator API

A Flask-based API for generating game-ready sprite sheets and animations using BRIA's FIBO structured image generation.

## Features

- **Multiple Style Presets**: Anime, Pixel Art (RPG/Platformer), Cartoon, Realistic, Chibi
- **Animation Generation**: Idle, Run, Jump, Attack, Hurt, Death animations
- **Output Formats**: PNG sprite sheets, animated GIFs, JSON metadata
- **Game Engine Ready**: Metadata compatible with Unity, Godot, and Phaser.js

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your BRIA_API_KEY
```

### 3. Run the Server

```bash
python app.py
```

Server runs at `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
GET /sprite/health
```

### Generate Sprites
```
POST /sprite/generate
Content-Type: application/json

{
    "prompt": "warrior character with sword",
    "preset": "anime_action",
    "animations": ["idle", "run", "attack"]
}
```

**Response:**
```json
{
    "job_id": "uuid",
    "status": "completed",
    "canonical_image": "outputs/{job_id}/canonical.png",
    "combined_sheet": "outputs/{job_id}/combined_sheet.png",
    "animations": {
        "idle": {
            "sprite_sheet": "outputs/{job_id}/idle_sheet.png",
            "gif": "outputs/{job_id}/idle.gif",
            "frame_count": 4
        }
    },
    "metadata": "outputs/{job_id}/metadata.json",
    "download_urls": {...}
}
```

### List Presets
```
GET /sprite/presets
```

### Get Preset Details
```
GET /sprite/presets/{preset_name}
```

## Available Presets

| Preset | Canvas | Style | Best For |
|--------|--------|-------|----------|
| `anime_action` | 512x512 | Anime | Action games, RPGs |
| `pixel_art_rpg` | 64x64 | Pixel Art | Top-down RPGs |
| `pixel_art_platformer` | 64x64 | Pixel Art | Side-scrollers |
| `cartoon_platformer` | 256x256 | Cartoon | Family games |
| `realistic_2d` | 512x512 | Realistic | High-fidelity games |
| `chibi` | 256x256 | Chibi | Cute/casual games |

## Output Structure

```
outputs/{job_id}/
├── canonical.png          # Reference character image
├── combined_sheet.png     # All animations in one sheet
├── metadata.json          # Game engine metadata
├── idle/
│   ├── frame_00.png
│   ├── frame_01.png
│   └── ...
├── idle_sheet.png
├── idle.gif
├── run/
│   └── ...
├── run_sheet.png
├── run.gif
└── ...
```

## Metadata Format

The `metadata.json` includes:
- Frame dimensions and counts
- Animation timing (frame rate, duration)
- Phaser.js compatible config
- Unity compatible config

## Integration Examples

### Phaser.js
```javascript
// Load sprite sheet
this.load.spritesheet('character', 'combined_sheet.png', {
    frameWidth: metadata.phaser_config.frameWidth,
    frameHeight: metadata.phaser_config.frameHeight
});

// Create animations from metadata
metadata.phaser_config.animations.forEach(anim => {
    this.anims.create({
        key: anim.key,
        frames: this.anims.generateFrameNumbers('character', anim.frames),
        frameRate: anim.frameRate,
        repeat: anim.repeat
    });
});
```

### Unity
Import the sprite sheet and use the Unity config from metadata to set up animation clips.

## Development

### Mock Mode
If `BRIA_API_KEY` is not set, the system runs in mock mode, generating placeholder images for testing.

### Adding Custom Presets
Create a JSON file in `presets/` folder:
```json
{
    "name": "my_preset",
    "display_name": "My Custom Preset",
    "style": "custom",
    "canvas": [128, 128],
    "frame_rate": 12,
    "animations": {
        "idle": 4,
        "run": 6
    }
}
```

## Architecture

```
backend/
├── app.py                 # Flask application entry
├── routes/
│   └── sprite.py          # API endpoints
├── services/
│   ├── sprite_service.py  # Main business logic
│   ├── fibo_client.py     # BRIA API integration
│   └── preset_loader.py   # Preset management
├── presets/               # Style preset JSON files
├── outputs/               # Generated files
└── temp/                  # Temporary files
```

## License

Part of the FIBO Game Asset Generator project.
