"""
Sprite Service - Generates complete sprite sheets in a SINGLE API call.

The AI generates the entire sprite sheet at once, ensuring natural consistency
across all frames. We then slice the sheet into individual frames using PIL.
"""
import os
import uuid
import json
from PIL import Image, ImageDraw
from typing import Dict, List, Any, Tuple

from services.fibo_client import (
    generate_image_sync,
    generate_spritesheet_simple,
    download_image
)
from services.preset_loader import load_preset, get_all_presets
from dotenv import load_dotenv

# Try to import rembg for AI-based background removal
try:
    from rembg import remove as rembg_remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    print("Warning: rembg not available, using simple background removal")

load_dotenv()

API_KEY = os.getenv("BRIA_API_KEY", "")
USE_MOCK = not API_KEY or API_KEY == "your_bria_api_key_here"


def get_available_presets() -> Dict[str, Any]:
    return get_all_presets()


def remove_background(img: Image.Image) -> Image.Image:
    """Remove background - uses rembg if available, otherwise edge-based removal."""
    # Always prefer rembg for consistent AI-based background removal
    if REMBG_AVAILABLE:
        print("    Using AI background removal (rembg)...")
        result = rembg_remove(img)
        return result.convert("RGBA")
    
    # Try chroma key removal (magenta/green)
    result = remove_chroma_key(img)
    if has_transparency(result):
        print("    Chroma key removal successful")
        return result
    
    # Fall back to edge-based removal
    print("    Using edge-based background removal...")
    return remove_background_edge_based(img)


def has_transparency(img: Image.Image) -> bool:
    """Check if image has any transparent pixels."""
    if img.mode != "RGBA":
        return False
    data = img.getdata()
    for pixel in data:
        if pixel[3] < 255:
            return True
    return False


def remove_chroma_key(img: Image.Image, tolerance: int = 60) -> Image.Image:
    """
    Remove chroma key background - supports MAGENTA (#FF00FF) and GREEN (#00FF00).
    Magenta is preferred as it's rarely used on characters.
    """
    img = img.convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        
        # MAGENTA/PINK detection (#FF00FF) - high red, high blue, low green
        if r > 200 and b > 200 and g < 100 + tolerance:
            new_data.append((255, 255, 255, 0))
        # Lighter magenta/pink shades
        elif r > 180 and b > 180 and g < 120 and r > g + 60 and b > g + 60:
            new_data.append((255, 255, 255, 0))
        # GREEN detection (#00FF00) - high green, low red and blue
        elif g > 200 and r < 100 + tolerance and b < 100 + tolerance:
            new_data.append((255, 255, 255, 0))
        # Darker greens
        elif g > 150 and r < 80 and b < 80 and g > r * 2 and g > b * 2:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    return img


def remove_background_simple(img: Image.Image) -> Image.Image:
    """
    Fallback: Simple background removal.
    Handles: magenta, green, white, light gray, checkerboard.
    """
    img = img.convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        
        # Magenta/Pink (chroma key) - high red & blue, low green
        if r > 200 and b > 200 and g < 100:
            new_data.append((255, 255, 255, 0))
        # Green screen (chroma key)
        elif g > 200 and r < 100 and b < 100:
            new_data.append((255, 255, 255, 0))
        # Pure white or near-white
        elif r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0))
        # Light gray
        elif r > 200 and g > 200 and b > 200 and abs(r-g) < 10 and abs(g-b) < 10:
            new_data.append((255, 255, 255, 0))
        # Checkerboard light squares
        elif r > 195 and r < 210 and g > 195 and g < 210 and b > 195 and b < 210:
            new_data.append((255, 255, 255, 0))
        # Gray tones
        elif (r == g == b) and r > 180:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    return img


def remove_background_edge_based(img: Image.Image) -> Image.Image:
    """
    Remove background by detecting the most common edge color.
    This works for any solid-color background.
    """
    img = img.convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # Sample colors from all edges
    edge_colors = []
    
    # Top and bottom edges
    for x in range(width):
        edge_colors.append(pixels[x, 0][:3])
        edge_colors.append(pixels[x, height - 1][:3])
    
    # Left and right edges
    for y in range(height):
        edge_colors.append(pixels[0, y][:3])
        edge_colors.append(pixels[width - 1, y][:3])
    
    # Find the most common edge color (likely the background)
    from collections import Counter
    color_counts = Counter(edge_colors)
    bg_color, count = color_counts.most_common(1)[0]
    
    # Only proceed if this color appears frequently (>30% of edge pixels)
    total_edge_pixels = len(edge_colors)
    if count < total_edge_pixels * 0.3:
        print(f"    No dominant edge color found, using simple removal")
        return remove_background_simple(img)
    
    print(f"    Detected background color: RGB{bg_color} ({count}/{total_edge_pixels} edge pixels)")
    
    # Remove pixels similar to the background color
    tolerance = 30
    data = img.getdata()
    new_data = []
    
    for item in data:
        r, g, b, a = item
        # Check if pixel is similar to background color
        if (abs(r - bg_color[0]) < tolerance and 
            abs(g - bg_color[1]) < tolerance and 
            abs(b - bg_color[2]) < tolerance):
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    return img


def get_animation_poses(animation: str, frame_count: int) -> List[str]:
    """Get pose descriptions for each frame of an animation."""
    poses = {
        "idle": [
            "standing neutral, arms relaxed at sides",
            "slight chest rise, breathing in",
            "standing neutral, arms relaxed",
            "slight chest fall, breathing out"
        ],
        "run": [
            "right leg forward, left arm forward, contact pose",
            "right leg pushing off, body leaning forward",
            "both feet off ground, mid-stride",
            "left leg forward, right arm forward, contact pose",
            "left leg pushing off, body leaning forward",
            "both feet off ground, opposite mid-stride"
        ],
        "attack": [
            "wind-up pose, weapon raised behind",
            "mid-swing, weapon at shoulder level",
            "full extension, weapon thrust forward",
            "recovery pose, returning to ready stance"
        ],
        "jump": [
            "crouch preparing to jump, knees bent",
            "launching upward, legs extending",
            "peak of jump, body stretched",
            "beginning descent, legs tucking"
        ],
        "walk": [
            "right foot forward, heel strike",
            "weight shifting, mid-stance",
            "left foot forward, heel strike",
            "weight shifting, completing cycle"
        ],
        "hurt": [
            "impact reaction, body recoiling back",
            "stumbling, off balance",
            "recovering, regaining stance"
        ],
        "death": [
            "fatal hit, body jerking",
            "losing balance, tilting sideways",
            "falling, knees buckling",
            "collapsed on ground"
        ]
    }
    
    base_poses = poses.get(animation, [f"pose {i+1}" for i in range(frame_count)])
    # Cycle through poses if we need more frames
    return [base_poses[i % len(base_poses)] for i in range(frame_count)]


def generate_spritesheet_image(
    prompt: str,
    animation: str,
    frame_count: int,
    preset: dict,
    job_id: str
) -> str:
    """
    Generate a complete sprite sheet for one animation in a SINGLE API call.
    Uses SIMPLE prompts like the FIBO platform UI - which gives best results.
    """
    out_dir = f"outputs/{job_id}"
    os.makedirs(out_dir, exist_ok=True)
    out_path = f"{out_dir}/{animation}_raw.png"
    
    if USE_MOCK:
        print(f"  [MOCK] Generating {animation} sprite sheet...")
        return generate_mock_spritesheet(prompt, animation, frame_count, preset, out_path)
    
    print(f"  Calling FIBO API for {animation} ({frame_count} frames)...")
    
    # Use SIMPLE prompt approach - like what works on FIBO platform directly
    style = preset.get("style", "anime")
    image_url = generate_spritesheet_simple(
        subject=prompt,
        animation=animation,
        frame_count=frame_count,
        style=style,
        seed=42
    )
    download_image(image_url, out_path)
    
    return out_path


def generate_mock_spritesheet(
    prompt: str,
    animation: str,
    frame_count: int,
    preset: dict,
    out_path: str
) -> str:
    """Generate mock sprite sheet for testing."""
    frame_size = preset.get("canvas", [128, 128])
    fw, fh = frame_size[0], frame_size[1]
    
    # Create horizontal sprite sheet
    sheet_width = fw * frame_count
    sheet_height = fh
    
    img = Image.new("RGBA", (sheet_width, sheet_height), (240, 240, 240, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw each frame with slightly different poses
    for i in range(frame_count):
        x_offset = i * fw
        cx = x_offset + fw // 2
        cy = fh // 2
        
        # Vary the pose based on frame index
        arm_angle = 20 * (i - frame_count // 2)  # Arms move
        leg_spread = 10 + 5 * (i % 3)  # Legs vary
        
        # Head
        head_size = min(fw, fh) // 6
        draw.ellipse([cx - head_size, cy - fh//3 - head_size, 
                      cx + head_size, cy - fh//3 + head_size], 
                     fill=(100, 150, 200, 255))
        
        # Body
        body_w = min(fw, fh) // 5
        body_h = min(fw, fh) // 3
        draw.rectangle([cx - body_w, cy - fh//6, cx + body_w, cy + body_h//2], 
                       fill=(80, 130, 180, 255))
        
        # Arms (vary position)
        arm_w = body_w // 2
        arm_h = body_h // 2
        # Left arm
        draw.rectangle([cx - body_w - arm_w - abs(arm_angle)//3, cy - fh//8,
                        cx - body_w, cy + arm_h], 
                       fill=(90, 140, 190, 255))
        # Right arm
        draw.rectangle([cx + body_w, cy - fh//8,
                        cx + body_w + arm_w + abs(arm_angle)//3, cy + arm_h], 
                       fill=(90, 140, 190, 255))
        
        # Legs (vary spread)
        leg_w = body_w // 2
        leg_h = body_h
        # Left leg
        draw.rectangle([cx - leg_spread - leg_w, cy + body_h//2,
                        cx - leg_spread + leg_w, cy + body_h//2 + leg_h], 
                       fill=(70, 120, 170, 255))
        # Right leg
        draw.rectangle([cx + leg_spread - leg_w, cy + body_h//2,
                        cx + leg_spread + leg_w, cy + body_h//2 + leg_h], 
                       fill=(70, 120, 170, 255))
        
        # Frame separator line (light, will be removed with bg)
        if i < frame_count - 1:
            draw.line([(i + 1) * fw, 0, (i + 1) * fw, sheet_height], 
                      fill=(220, 220, 220, 255), width=1)
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path)
    return out_path


def detect_grid_layout(sheet_w: int, sheet_h: int, frame_count: int) -> Tuple[int, int]:
    """
    Auto-detect the grid layout (cols, rows) based on sheet dimensions and frame count.
    Returns (cols, rows) that best fits the sheet aspect ratio.
    """
    best_layout = (frame_count, 1)  # Default: horizontal strip
    best_score = float('inf')
    
    # Try all possible grid configurations
    for rows in range(1, frame_count + 1):
        if frame_count % rows == 0:
            cols = frame_count // rows
            
            # Calculate expected aspect ratio for this layout
            cell_w = sheet_w / cols
            cell_h = sheet_h / rows
            cell_aspect = cell_w / cell_h
            
            # Score: how close is cell aspect ratio to 1:1 (square cells are ideal)
            # Also prefer layouts where cells are roughly square
            score = abs(cell_aspect - 1.0)
            
            # Bonus for layouts that match sheet aspect ratio well
            expected_sheet_aspect = cols / rows
            actual_sheet_aspect = sheet_w / sheet_h
            score += abs(expected_sheet_aspect - actual_sheet_aspect) * 0.5
            
            if score < best_score:
                best_score = score
                best_layout = (cols, rows)
    
    return best_layout


def slice_spritesheet(
    sheet_path: str,
    frame_count: int,
    frame_size: Tuple[int, int],
    job_id: str,
    animation: str
) -> List[str]:
    """
    Slice a sprite sheet into individual frames.
    
    Auto-detects grid layout based on sheet dimensions:
    - 2x2 grid (4 frames)
    - 2x3 grid (6 frames)  
    - 3x2 grid (6 frames)
    - Horizontal strip (any count)
    - Vertical strip (any count)
    
    Does NOT stretch/distort images - uses padding.
    """
    out_dir = f"outputs/{job_id}/{animation}"
    os.makedirs(out_dir, exist_ok=True)
    
    sheet = Image.open(sheet_path).convert("RGBA")
    sheet_w, sheet_h = sheet.size
    target_w, target_h = frame_size
    
    print(f"    Sheet: {sheet_w}x{sheet_h}, Frames: {frame_count}")
    
    # Auto-detect grid layout
    cols, rows = detect_grid_layout(sheet_w, sheet_h, frame_count)
    
    cell_w = sheet_w // cols
    cell_h = sheet_h // rows
    
    print(f"    Layout: {cols}x{rows} grid ({cols} cols, {rows} rows)")
    print(f"    Cell size: {cell_w}x{cell_h}")
    
    frame_paths = []
    frame_idx = 0
    for row in range(rows):
        for col in range(cols):
            left = col * cell_w
            top = row * cell_h
            right = left + cell_w
            bottom = top + cell_h
            
            frame = sheet.crop((left, top, right, bottom))
            frame = remove_background(frame)
            frame = fit_to_size_with_padding(frame, target_w, target_h)
            
            frame_path = f"{out_dir}/frame_{frame_idx:02d}.png"
            frame.save(frame_path)
            frame_paths.append(frame_path)
            frame_idx += 1
    
    print(f"    Target frame size: {target_w}x{target_h}")
    return frame_paths


def fit_to_size_with_padding(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """
    Fit image into target size by scaling (preserving aspect ratio) and adding padding.
    Does NOT stretch or distort the image.
    """
    img_w, img_h = img.size
    
    # Calculate scale to fit within target while preserving aspect ratio
    scale_w = target_w / img_w
    scale_h = target_h / img_h
    scale = min(scale_w, scale_h)  # Use smaller scale to fit entirely
    
    # Scale image (preserving aspect ratio)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    
    if scale != 1.0:
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Create target canvas with transparent background
    result = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    
    # Center the scaled image on the canvas
    paste_x = (target_w - new_w) // 2
    paste_y = (target_h - new_h) // 2
    
    result.paste(img, (paste_x, paste_y), img)
    
    return result


def make_sprite_sheet(frame_paths: List[str], out_path: str) -> str:
    """Combine frames into horizontal sprite sheet (after processing)."""
    frames = [Image.open(p).convert("RGBA") for p in frame_paths]
    if not frames:
        raise ValueError("No frames")
    
    w, h = frames[0].size
    sheet = Image.new("RGBA", (len(frames) * w, h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * w, 0), frame)
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    sheet.save(out_path)
    return out_path


def make_gif(frame_paths: List[str], out_path: str, duration: int = 100) -> str:
    """Create animated GIF with transparency."""
    frames = [Image.open(p).convert("RGBA") for p in frame_paths]
    if not frames:
        raise ValueError("No frames")
    
    gif_frames = []
    for frame in frames:
        alpha = frame.split()[3]
        p_frame = frame.convert("RGB").convert("P", palette=Image.Palette.ADAPTIVE, colors=255)
        mask = Image.eval(alpha, lambda a: 255 if a < 128 else 0)
        p_frame.paste(255, mask)
        gif_frames.append(p_frame)
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    gif_frames[0].save(
        out_path,
        save_all=True,
        append_images=gif_frames[1:],
        duration=duration,
        loop=0,
        transparency=255,
        disposal=2
    )
    return out_path


def create_combined_sheet(job_id: str, frame_dict: Dict[str, List[str]]) -> str:
    """Create combined sprite sheet with all animations."""
    all_rows = []
    max_width = 0
    
    for anim, frames in frame_dict.items():
        images = [Image.open(p).convert("RGBA") for p in frames]
        if images:
            w, h = images[0].size
            row = Image.new("RGBA", (len(images) * w, h), (0, 0, 0, 0))
            for i, img in enumerate(images):
                row.paste(img, (i * w, 0), img)
            all_rows.append(row)
            max_width = max(max_width, row.width)
    
    if not all_rows:
        return None
    
    total_height = sum(r.height for r in all_rows)
    combined = Image.new("RGBA", (max_width, total_height), (0, 0, 0, 0))
    
    y = 0
    for row in all_rows:
        combined.paste(row, (0, y), row)
        y += row.height
    
    out_path = f"outputs/{job_id}/combined_sheet.png"
    combined.save(out_path)
    return out_path


def create_metadata(job_id: str, outputs: Dict[str, Any], preset: dict, prompt: str) -> str:
    """Create JSON metadata for game engines."""
    canvas = preset.get("canvas", [128, 128])
    
    meta = {
        "job_id": job_id,
        "prompt": prompt,
        "preset": preset.get("name", "custom"),
        "style": preset.get("style", "anime"),
        "frame_size": canvas,
        "frame_rate": preset.get("frame_rate", 12),
        "frame_duration_ms": preset.get("frame_duration", 100),
        "animations": {},
        "phaser_config": {
            "frameWidth": canvas[0],
            "frameHeight": canvas[1],
            "animations": []
        },
        "unity_config": {
            "pixelsPerUnit": 100,
            "spriteMode": "Multiple",
            "frameSize": {"x": canvas[0], "y": canvas[1]},
            "clips": []
        }
    }
    
    frame_start = 0
    for anim, data in outputs.items():
        meta["animations"][anim] = {
            "frame_count": data["frame_count"],
            "sprite_sheet": data["sprite_sheet"],
            "gif": data["gif"],
            "frames": data["frames"],
            "loop": anim not in ["death", "hurt"]
        }
        meta["phaser_config"]["animations"].append({
            "key": anim,
            "frames": {"start": frame_start, "end": frame_start + data["frame_count"] - 1},
            "frameRate": preset.get("frame_rate", 12),
            "repeat": -1 if anim not in ["death", "hurt"] else 0
        })
        meta["unity_config"]["clips"].append({
            "name": anim,
            "frameCount": data["frame_count"],
            "sampleRate": preset.get("frame_rate", 12),
            "loopTime": anim not in ["death", "hurt"]
        })
        frame_start += data["frame_count"]
    
    path = f"outputs/{job_id}/metadata.json"
    with open(path, "w") as f:
        json.dump(meta, f, indent=2)
    return path


def process_sprite_job(req: dict) -> dict:
    """
    Main entry point for sprite generation.
    
    NEW APPROACH: Generate complete sprite sheet per animation in ONE API call.
    The AI creates all frames together, ensuring natural consistency.
    Then we slice the sheet into individual frames.
    """
    job_id = str(uuid.uuid4())
    
    print(f"\n{'='*60}")
    print(f"SPRITE GENERATION JOB: {job_id}")
    print(f"Mode: {'MOCK' if USE_MOCK else 'FIBO API'}")
    print(f"Method: Full sprite sheet generation (AI creates all frames)")
    print(f"{'='*60}")
    
    prompt = req["prompt"]
    preset_name = req.get("preset", "anime_action")
    requested_anims = req.get("animations", None)
    
    preset = load_preset(preset_name)
    frame_size = tuple(preset.get("canvas", [128, 128]))
    
    print(f"Prompt: {prompt}")
    print(f"Preset: {preset_name}")
    print(f"Frame Size: {frame_size[0]}x{frame_size[1]}")
    
    anim_config = preset.get("animations", {"idle": 4, "run": 6, "attack": 4})
    if requested_anims:
        anim_config = {k: v for k, v in anim_config.items() if k in requested_anims}
    
    print(f"Animations: {list(anim_config.keys())}")
    
    frame_dict = {}
    outputs = {}
    duration = preset.get("frame_duration", 100)
    
    # Generate each animation as a complete sprite sheet
    for anim, frame_count in anim_config.items():
        print(f"\n[{anim}] Generating {frame_count}-frame sprite sheet...")
        
        # Step 1: Generate complete sprite sheet in ONE call
        raw_sheet_path = generate_spritesheet_image(
            prompt, anim, frame_count, preset, job_id
        )
        print(f"  Raw sheet: {raw_sheet_path}")
        
        # Step 2: Slice into individual frames
        print(f"  Slicing into {frame_count} frames...")
        frame_paths = slice_spritesheet(
            raw_sheet_path, frame_count, frame_size, job_id, anim
        )
        frame_dict[anim] = frame_paths
        
        # Step 3: Create processed sprite sheet and GIF
        sheet_path = f"outputs/{job_id}/{anim}_sheet.png"
        gif_path = f"outputs/{job_id}/{anim}.gif"
        
        make_sprite_sheet(frame_paths, sheet_path)
        make_gif(frame_paths, gif_path, duration)
        
        outputs[anim] = {
            "frames": frame_paths,
            "sprite_sheet": sheet_path,
            "gif": gif_path,
            "frame_count": frame_count
        }
        print(f"  Done: {sheet_path}")
    
    # Create combined sheet
    print(f"\nCreating combined sprite sheet...")
    combined = create_combined_sheet(job_id, frame_dict)
    
    # Create metadata
    print(f"Generating metadata...")
    metadata = create_metadata(job_id, outputs, preset, prompt)
    
    print(f"\n{'='*60}")
    print(f"COMPLETE: {job_id}")
    print(f"{'='*60}\n")
    
    return {
        "job_id": job_id,
        "status": "completed",
        "prompt": prompt,
        "preset": preset_name,
        "frame_size": list(frame_size),
        "combined_sheet": combined,
        "animations": {
            anim: {
                "sprite_sheet": data["sprite_sheet"],
                "gif": data["gif"],
                "frame_count": data["frame_count"]
            }
            for anim, data in outputs.items()
        },
        "metadata": metadata,
        "download_urls": {
            "combined_sheet": f"/outputs/{job_id}/combined_sheet.png",
            "metadata": f"/outputs/{job_id}/metadata.json",
            **{f"{a}_sheet": f"/outputs/{job_id}/{a}_sheet.png" for a in outputs},
            **{f"{a}_gif": f"/outputs/{job_id}/{a}.gif" for a in outputs}
        }
    }
