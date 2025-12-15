"""
Preset Loader - Manages sprite style presets.
"""
import os
import json
from typing import Dict, Any

PRESETS_DIR = os.path.join(os.path.dirname(__file__), "..", "presets")

# Default presets defined in code
DEFAULT_PRESETS = {
    "anime_action": {
        "name": "anime_action",
        "display_name": "Anime Action Style",
        "description": "Dynamic anime-style characters with bold outlines and vibrant colors",
        "style": "anime",
        "medium": "digital illustration",
        "canvas": [512, 512],
        "color_scheme": "Vibrant anime colors with bold outlines",
        "frame_rate": 12,
        "frame_duration": 83,
        "animations": {
            "idle": 4,
            "run": 6,
            "attack": 4,
            "jump": 3,
            "hurt": 2,
            "death": 4
        }
    },
    "pixel_art_rpg": {
        "name": "pixel_art_rpg",
        "display_name": "Pixel Art (Top-down RPG)",
        "description": "Classic 16-bit style pixel art for top-down RPG games",
        "style": "pixel art",
        "medium": "pixel art",
        "canvas": [64, 64],
        "color_scheme": "Limited 16-color palette, retro game style",
        "frame_rate": 8,
        "frame_duration": 125,
        "animations": {
            "idle": 2,
            "walk_down": 4,
            "walk_up": 4,
            "walk_left": 4,
            "walk_right": 4
        }
    },
    "pixel_art_platformer": {
        "name": "pixel_art_platformer",
        "display_name": "Pixel Art (Platformer)",
        "description": "Side-scrolling platformer pixel art style",
        "style": "pixel art",
        "medium": "pixel art",
        "canvas": [64, 64],
        "color_scheme": "Bright, limited palette suitable for platformers",
        "frame_rate": 10,
        "frame_duration": 100,
        "animations": {
            "idle": 4,
            "run": 6,
            "jump": 3,
            "fall": 2,
            "attack": 3
        }
    },
    "cartoon_platformer": {
        "name": "cartoon_platformer",
        "display_name": "Cartoon Platformer",
        "description": "Colorful cartoon style for family-friendly platformers",
        "style": "cartoon",
        "medium": "digital illustration",
        "canvas": [256, 256],
        "color_scheme": "Bright, saturated cartoon colors",
        "frame_rate": 12,
        "frame_duration": 83,
        "animations": {
            "idle": 4,
            "run": 8,
            "jump": 4,
            "attack": 4,
            "hurt": 2
        }
    },
    "realistic_2d": {
        "name": "realistic_2d",
        "display_name": "High-res Realistic 2D",
        "description": "Detailed realistic character art for high-fidelity games",
        "style": "realistic",
        "medium": "digital painting",
        "canvas": [512, 512],
        "color_scheme": "Natural, realistic colors with detailed shading",
        "frame_rate": 24,
        "frame_duration": 42,
        "animations": {
            "idle": 8,
            "walk": 12,
            "run": 8,
            "attack": 6,
            "hurt": 3,
            "death": 6
        }
    },
    "chibi": {
        "name": "chibi",
        "display_name": "Chibi Style",
        "description": "Cute chibi-style characters with big heads and small bodies",
        "style": "chibi",
        "medium": "digital illustration",
        "canvas": [256, 256],
        "color_scheme": "Soft, pastel colors with cute aesthetics",
        "frame_rate": 10,
        "frame_duration": 100,
        "animations": {
            "idle": 4,
            "run": 6,
            "jump": 3,
            "attack": 4,
            "happy": 4
        }
    }
}


def load_preset(preset_name: str) -> Dict[str, Any]:
    """
    Load a preset by name.
    First checks JSON files, then falls back to defaults.
    """
    # Try loading from JSON file
    json_path = os.path.join(PRESETS_DIR, f"{preset_name}.json")
    if os.path.exists(json_path):
        with open(json_path, "r") as f:
            return json.load(f)
    
    # Fall back to default presets
    if preset_name in DEFAULT_PRESETS:
        return DEFAULT_PRESETS[preset_name]
    
    # If not found, return anime_action as default
    print(f"Preset '{preset_name}' not found, using anime_action")
    return DEFAULT_PRESETS["anime_action"]


def get_all_presets() -> Dict[str, Any]:
    """
    Get all available presets.
    """
    presets = dict(DEFAULT_PRESETS)
    
    # Load any additional JSON presets
    if os.path.exists(PRESETS_DIR):
        for filename in os.listdir(PRESETS_DIR):
            if filename.endswith(".json"):
                preset_name = filename[:-5]
                if preset_name not in presets:
                    json_path = os.path.join(PRESETS_DIR, filename)
                    with open(json_path, "r") as f:
                        presets[preset_name] = json.load(f)
    
    return presets


def save_preset(preset_name: str, preset_data: Dict[str, Any]) -> str:
    """
    Save a custom preset to JSON file.
    """
    os.makedirs(PRESETS_DIR, exist_ok=True)
    json_path = os.path.join(PRESETS_DIR, f"{preset_name}.json")
    
    with open(json_path, "w") as f:
        json.dump(preset_data, f, indent=2)
    
    return json_path
