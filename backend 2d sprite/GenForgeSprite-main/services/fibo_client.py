"""
FIBO Client - Handles communication with BRIA's FIBO API for sprite sheet generation.
Simplified client using simple text prompts (like FIBO platform UI).
"""
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

# API Endpoints
BASE_URL = "https://engine.prod.bria-api.com"
GENERATE_URL = f"{BASE_URL}/v2/image/generate"

API_TOKEN = os.getenv("BRIA_API_KEY", "")


def generate_image_sync(
    structured_prompt: dict = None,
    seed: int = 42,
    aspect_ratio: str = "1:1",
    simple_prompt: str = None,
    num_results: int = 4
) -> str:
    """
    Generate image using FIBO API.
    
    Can use either:
    - structured_prompt: dict with FIBO structured format
    - simple_prompt: plain text prompt (like FIBO platform UI)
    """
    if not API_TOKEN:
        raise ValueError("BRIA_API_KEY not set")
    
    headers = {
        "api_token": API_TOKEN,
        "Content-Type": "application/json"
    }
    
    payload = {
        "aspect_ratio": aspect_ratio,
        "sync": True,
        "seed": seed,
        "num_results": num_results
    }
    
    # Use simple prompt if provided, otherwise use structured
    if simple_prompt:
        payload["prompt"] = simple_prompt
    elif structured_prompt:
        payload["structured_prompt"] = json.dumps(structured_prompt)
    else:
        raise ValueError("Either simple_prompt or structured_prompt required")
    
    print(f"    API Request: aspect_ratio={aspect_ratio}, seed={seed}")
    if simple_prompt:
        print(f"    Prompt: {simple_prompt[:100]}...")
    
    resp = requests.post(GENERATE_URL, headers=headers, json=payload, timeout=120)
    
    if resp.status_code != 200:
        raise Exception(f"BRIA API Error {resp.status_code}: {resp.text}")
    
    result = resp.json()
    return result["result"]["image_url"]


def get_animation_pose_sequence(animation: str, frame_count: int) -> str:
    """
    Get pose descriptions for animation cycle based on frame count.
    Kept short to avoid content moderation issues.
    """
    # Base poses for each animation type
    pose_bases = {
        "run": ["right leg forward", "pushing off", "mid air", "left leg forward", "pushing off opposite", "mid air loop"],
        "idle": ["neutral stance", "slight inhale", "chest up", "exhale start", "settling", "back to neutral"],
        "attack": ["wind up pose", "swing start", "mid swing", "full extend", "follow through", "recovery"],
        "walk": ["right step", "weight shift", "left swing", "left step", "weight shift", "right swing"],
        "jump": ["crouch", "launch up", "rising", "peak height", "descending", "landing"],
        "hurt": ["surprised", "leaning back", "stumble", "recovering", "balancing", "standing again"],
        "death": ["off balance", "tilting", "falling", "almost down", "on ground", "resting"]
    }
    
    base_poses = pose_bases.get(animation, ["pose 1", "pose 2", "pose 3", "pose 4", "pose 5", "pose 6"])
    
    # Adjust poses to match frame count
    if frame_count <= len(base_poses):
        poses = base_poses[:frame_count]
    else:
        # Repeat poses if we need more
        poses = (base_poses * ((frame_count // len(base_poses)) + 1))[:frame_count]
    
    # Build sequence string
    pose_str = ", ".join([f"{i+1}-{p}" for i, p in enumerate(poses)])
    return f"{frame_count} frame {animation}: {pose_str}."


def get_grid_layout(frame_count: int) -> tuple:
    """
    Determine optimal grid layout and aspect ratio for frame count.
    Returns (cols, rows, aspect_ratio)
    
    BRIA API only accepts: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9
    """
    layouts = {
        2: (2, 1, "16:9"),   # 2 columns, 1 row - use wide ratio
        3: (3, 1, "16:9"),   # 3 columns, 1 row - use wide ratio
        4: (2, 2, "1:1"),    # 2x2 grid - square
        5: (3, 2, "3:2"),    # 3x2 grid (one empty)
        6: (3, 2, "3:2"),    # 3x2 grid
        8: (4, 2, "16:9"),   # 4x2 grid - use wide ratio
    }
    return layouts.get(frame_count, (3, 2, "3:2"))  # Default to 3x2 grid


def generate_spritesheet_simple(
    subject: str,
    animation: str,
    frame_count: int = 6,
    style: str = "anime",
    seed: int = 42
) -> str:
    """
    Generate sprite sheet with dynamic grid layout based on frame count.
    """
    # Get pose descriptions
    pose_sequence = get_animation_pose_sequence(animation, frame_count)
    
    # Get optimal grid layout
    cols, rows, aspect_ratio = get_grid_layout(frame_count)
    
    # Safe animation names to avoid content moderation
    safe_anim_names = {
        "attack": "action swing",
        "hurt": "reaction",
        "death": "falling down",
        "hit": "reaction",
        "fight": "action"
    }
    safe_anim = safe_anim_names.get(animation, animation)
    
    # Build layout description
    if rows == 1:
        layout_desc = f"horizontal strip with {cols} frames side by side"
    else:
        layout_desc = f"{rows} rows, {cols} columns ({frame_count} frames total)"
    
    # Clear, explicit prompt for animation frames
    prompt = (
        f"{style} 2D game sprite sheet for {safe_anim} animation. "
        f"Show the SAME {subject} character in {frame_count} DIFFERENT POSES arranged in a grid. "
        f"Layout: {layout_desc}. "
        f"Each cell shows the FULL BODY character in a different pose. "
        f"Animation sequence: {pose_sequence} "
        f"SAME character design in every frame, only pose changes. "
        f"Side view, clean solid background, no text, game sprite style."
    )
    
    print(f"    Grid: {cols}x{rows}, Aspect: {aspect_ratio}")
    
    return generate_image_sync(
        simple_prompt=prompt,
        seed=seed,
        aspect_ratio=aspect_ratio,
        num_results=1
    )


def download_image(url: str, save_path: str) -> str:
    """Download image from URL and save locally."""
    resp = requests.get(url, timeout=60)
    if resp.status_code != 200:
        raise Exception(f"Failed to download: {resp.status_code}")
    
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(resp.content)
    
    return save_path
