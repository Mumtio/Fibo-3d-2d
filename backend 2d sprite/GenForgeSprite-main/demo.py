"""
Demo Script - Test the sprite generator locally.
Run this to verify everything works before using the API.
"""
import os
import sys
import json

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.sprite_service import process_sprite_job, get_available_presets


def demo_list_presets():
    """Show all available presets."""
    print("\n" + "="*60)
    print("AVAILABLE PRESETS")
    print("="*60)
    
    presets = get_available_presets()
    for name, preset in presets.items():
        print(f"\n{name}:")
        print(f"  Display Name: {preset.get('display_name', name)}")
        print(f"  Style: {preset.get('style', 'N/A')}")
        print(f"  Canvas: {preset.get('canvas', [512, 512])}")
        print(f"  Animations: {list(preset.get('animations', {}).keys())}")


def demo_generate_sprite(prompt: str, preset: str = "anime_action"):
    """Generate a sprite sheet demo."""
    print("\n" + "="*60)
    print(f"GENERATING SPRITE")
    print("="*60)
    print(f"Prompt: {prompt}")
    print(f"Preset: {preset}")
    print("-"*60)
    
    request = {
        "prompt": prompt,
        "preset": preset,
        "animations": ["idle", "run", "attack"]  # Subset for faster demo
    }
    
    result = process_sprite_job(request)
    
    print("\n" + "-"*60)
    print("RESULT:")
    print("-"*60)
    print(f"Job ID: {result['job_id']}")
    print(f"Status: {result['status']}")
    print(f"Frame Size: {result.get('frame_size', 'N/A')}")
    print(f"Combined Sheet: {result['combined_sheet']}")
    print("\nAnimations:")
    for anim, data in result['animations'].items():
        print(f"  {anim}: {data['frame_count']} frames")
        print(f"    Sheet: {data['sprite_sheet']}")
        print(f"    GIF: {data['gif']}")
    print(f"\nMetadata: {result['metadata']}")
    
    return result


def demo_show_metadata(job_id: str):
    """Display the generated metadata."""
    metadata_path = f"outputs/{job_id}/metadata.json"
    if os.path.exists(metadata_path):
        print("\n" + "="*60)
        print("METADATA CONTENT")
        print("="*60)
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    print("\n" + "#"*60)
    print("# SPRITE GENERATOR DEMO")
    print("#"*60)
    
    # Show available presets
    demo_list_presets()
    
    # Generate a sample sprite
    result = demo_generate_sprite(
        prompt="ninja warrior with katana",
        preset="anime_action"
    )
    
    # Show metadata
    demo_show_metadata(result['job_id'])
    
    print("\n" + "#"*60)
    print("# DEMO COMPLETE")
    print(f"# Check outputs/{result['job_id']}/ for generated files")
    print("#"*60 + "\n")
