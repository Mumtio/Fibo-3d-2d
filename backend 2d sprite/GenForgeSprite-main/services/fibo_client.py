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


def build_structured_sprite_prompt(
    subject: str,
    animation: str,
    frame_count: int,
    style: str,
    cols: int,
    rows: int
) -> dict:
    """
    Build a FIBO structured prompt for more accurate sprite sheet generation.
    Uses FIBO's structured format for better control over the output.
    """
    pose_sequence = get_animation_pose_sequence(animation, frame_count)
    
    safe_anim_names = {
        "attack": "action swing",
        "hurt": "reaction pose",
        "death": "falling sequence",
        "hit": "reaction",
        "fight": "action sequence"
    }
    safe_anim = safe_anim_names.get(animation, animation)
    
    return {
        "short_description": f"A {style} 2D game sprite sheet showing {frame_count} animation frames of {subject}",
        "objects": [
            {
                "description": f"A {subject} character shown in {frame_count} different {safe_anim} poses",
                "location": "arranged in a grid pattern filling the entire image",
                "relationship": f"Same character repeated {frame_count} times in different poses",
                "relative_size": "each frame takes equal space in the grid",
                "shape_and_color": f"{style} art style with consistent colors across all frames",
                "texture": "clean, flat 2D game art texture",
                "appearance_details": f"Full body visible in each frame, {pose_sequence}"
            }
        ],
        "background_setting": "Solid magenta (#FF00FF) chroma key background for easy removal",
        "lighting": {
            "conditions": "Flat, even lighting",
            "direction": "Front",
            "shadows": "None or minimal"
        },
        "aesthetics": {
            "composition": f"Grid layout: {cols} columns x {rows} rows",
            "color_scheme": f"{style} color palette, vibrant and game-ready",
            "mood_atmosphere": "Dynamic action game character"
        },
        "photographic_characteristics": {
            "camera_angle": "Side view / profile",
            "lens_focal_length": "Standard",
            "depth_of_field": "Flat, no depth blur",
            "focus": "Sharp focus on all frames"
        },
        "style_medium": "digital illustration",
        "context": "2D game sprite sheet for animation",
        "artistic_style": style
    }


def generate_spritesheet_simple(
    subject: str,
    animation: str,
    frame_count: int = 6,
    style: str = "anime",
    seed: int = 42,
    use_structured: bool = False
) -> str:
    """
    Generate sprite sheet with dynamic grid layout based on frame count.
    
    Args:
        use_structured: If True, uses FIBO's structured prompt format for better accuracy
    """
    # Get optimal grid layout
    cols, rows, aspect_ratio = get_grid_layout(frame_count)
    
    print(f"    Grid: {cols}x{rows}, Aspect: {aspect_ratio}, Structured: {use_structured}")
    
    if use_structured:
        # Use structured prompt for better accuracy
        structured_prompt = build_structured_sprite_prompt(
            subject, animation, frame_count, style, cols, rows
        )
        return generate_image_sync(
            structured_prompt=structured_prompt,
            seed=seed,
            aspect_ratio=aspect_ratio,
            num_results=1
        )
    else:
        # Use simple prompt (original behavior)
        pose_sequence = get_animation_pose_sequence(animation, frame_count)
        
        safe_anim_names = {
            "attack": "action swing",
            "hurt": "reaction",
            "death": "falling down",
            "hit": "reaction",
            "fight": "action"
        }
        safe_anim = safe_anim_names.get(animation, animation)
        
        if rows == 1:
            layout_desc = f"horizontal strip with {cols} frames side by side"
        else:
            layout_desc = f"{rows} rows, {cols} columns ({frame_count} frames total)"
        
        prompt = (
            f"{style} 2D game sprite sheet for {safe_anim} animation. "
            f"Show the SAME {subject} character in {frame_count} DIFFERENT POSES arranged in a grid. "
            f"Layout: {layout_desc}. "
            f"Each cell shows the FULL BODY character in a different pose. "
            f"Animation sequence: {pose_sequence} "
            f"SAME character design in every frame, only pose changes. "
            f"Side view, clean solid background, no text, game sprite style."
        )
        
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


def refine_spritesheet(
    original_prompt: str,
    animation: str,
    frame_count: int,
    style: str,
    refinement_instructions: str,
    seed: int = None
) -> str:
    """
    Refine/regenerate a sprite sheet with additional instructions.
    Uses the original prompt plus refinement feedback for better results.
    
    Args:
        original_prompt: The original character description
        animation: Animation type (idle, run, attack, etc.)
        frame_count: Number of frames
        style: Art style
        refinement_instructions: User feedback on what to improve
        seed: Random seed (None for random, or specific for consistency)
    """
    import random
    
    # Get optimal grid layout
    cols, rows, aspect_ratio = get_grid_layout(frame_count)
    
    # Get pose descriptions
    pose_sequence = get_animation_pose_sequence(animation, frame_count)
    
    # Safe animation names
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
    
    # Build refined prompt with user feedback
    prompt = (
        f"{style} 2D game sprite sheet for {safe_anim} animation. "
        f"Character: {original_prompt}. "
        f"Layout: {layout_desc} grid. "
        f"Animation sequence: {pose_sequence} "
        f"IMPORTANT REFINEMENTS: {refinement_instructions}. "
        f"Each cell shows FULL BODY of the SAME character in different pose. "
        f"Consistent character design across all frames. "
        f"Side view, clean magenta (#FF00FF) background for chroma key, no text."
    )
    
    # Use random seed for variation, or specific seed for consistency
    actual_seed = seed if seed is not None else random.randint(1, 99999)
    
    print(f"    Refining with seed: {actual_seed}")
    print(f"    Refinement: {refinement_instructions[:100]}...")
    
    return generate_image_sync(
        simple_prompt=prompt,
        seed=actual_seed,
        aspect_ratio=aspect_ratio,
        num_results=1
    )
