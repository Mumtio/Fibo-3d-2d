"""
API Test Script - Test the Flask endpoints.
Run the server first: python app.py
Then run this script: python test_api.py
"""
import requests
import json

BASE_URL = "http://localhost:5000"


def test_health():
    """Test health endpoints."""
    print("\n=== Testing Health Endpoints ===")
    
    resp = requests.get(f"{BASE_URL}/health")
    print(f"GET /health: {resp.status_code}")
    print(f"  Response: {resp.json()}")
    
    resp = requests.get(f"{BASE_URL}/sprite/health")
    print(f"GET /sprite/health: {resp.status_code}")
    print(f"  Response: {resp.json()}")


def test_presets():
    """Test preset endpoints."""
    print("\n=== Testing Preset Endpoints ===")
    
    resp = requests.get(f"{BASE_URL}/sprite/presets")
    print(f"GET /sprite/presets: {resp.status_code}")
    presets = resp.json()
    print(f"  Available presets: {list(presets.keys())}")
    
    resp = requests.get(f"{BASE_URL}/sprite/presets/anime_action")
    print(f"GET /sprite/presets/anime_action: {resp.status_code}")
    print(f"  Preset style: {resp.json().get('style')}")


def test_generate():
    """Test sprite generation endpoint."""
    print("\n=== Testing Generate Endpoint ===")
    
    payload = {
        "prompt": "robot warrior with laser sword",
        "preset": "anime_action",
        "animations": ["idle", "attack"]
    }
    
    print(f"POST /sprite/generate")
    print(f"  Payload: {json.dumps(payload, indent=2)}")
    
    resp = requests.post(
        f"{BASE_URL}/sprite/generate",
        json=payload
    )
    
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code == 200:
        result = resp.json()
        print(f"  Job ID: {result['job_id']}")
        print(f"  Status: {result['status']}")
        print(f"  Animations generated: {list(result['animations'].keys())}")
        print(f"  Download URLs:")
        for name, url in result['download_urls'].items():
            print(f"    {name}: {url}")
    else:
        print(f"  Error: {resp.text}")


def test_download(job_id: str):
    """Test file download."""
    print(f"\n=== Testing File Download ===")
    
    url = f"{BASE_URL}/outputs/{job_id}/metadata.json"
    resp = requests.get(url)
    print(f"GET {url}: {resp.status_code}")
    
    if resp.status_code == 200:
        print("  Metadata downloaded successfully!")


if __name__ == "__main__":
    print("="*60)
    print("SPRITE GENERATOR API TESTS")
    print("="*60)
    print("Make sure the server is running: python app.py")
    
    try:
        test_health()
        test_presets()
        test_generate()
        print("\n" + "="*60)
        print("ALL TESTS PASSED!")
        print("="*60)
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to server.")
        print("Start the server first: python app.py")
    except Exception as e:
        print(f"\nERROR: {e}")
