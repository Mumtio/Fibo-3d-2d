import requests
import time
import json
from app.core.config import settings

class TripoService:
    # 🔴 DISABLE MOCK MODE (Set to True only if you run out of credits)
    MOCK_MODE = False
    
    BASE_URL = "https://api.tripo3d.ai/v2/openapi/task"

    def generate_3d_model(self, image_url: str):
        # --- MOCK PATH (Safety Net) ---
        if self.MOCK_MODE:
            print(f"⚠️ [Tripo] MOCK MODE: Returning pre-made colored model.")
            time.sleep(2)
            # This is a public colored GLB for testing
            return "https://model-viewer.googleusercontent.com/models/astronaut.glb"
        # -----------------------------

        headers = {
            "Authorization": f"Bearer {settings.TRIPO_API_KEY}",
            "Content-Type": "application/json"
        }

        # 1. Start Task
        payload = {
            "type": "image_to_model",
            "file": {
                "type": "jpg",
                "url": image_url
            },
            # ✅ ENABLE COLOR
            "texture": True,
            # PBR adds realistic lighting/materials. 
            # If this crashes your quota, set pbr: False (you still get color).
            "pbr": True  
        }

        print(f"☁️ [Tripo] Sending image to 3D pipeline (Color Enabled)...")
        
        try:
            resp = requests.post(self.BASE_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                print(f"❌ Tripo Error ({resp.status_code}): {resp.text}")
                return None
            
            # Safe parsing
            resp_data = resp.json()
            if "data" not in resp_data:
                 print(f"❌ Unexpected Response: {resp_data}")
                 return None
                 
            task_id = resp_data["data"]["task_id"]
            print(f"   ⏳ Task ID: {task_id}")

        except Exception as e:
            print(f"❌ Connection Failed: {e}")
            return None

        # 2. Poll for Completion
        max_retries = 100 
        
        for _ in range(max_retries):
            time.sleep(5) 
            
            check_url = f"{self.BASE_URL}/{task_id}"
            try:
                status_resp = requests.get(check_url, headers=headers)
                status_data = status_resp.json()
                
                # Safe Access using .get()
                data = status_data.get("data", {})
                status = data.get("status")
                
                if status == "success":
                    output = data.get("output", {})
                    
                    # 🔍 DEBUG: See exactly what Tripo sent back
                    # print(f"   🔎 Keys received: {list(output.keys())}")

                    # 🛡️ SMART FETCH: Look for ANY valid model key
                    glb_url = output.get("model") or output.get("pbr_model") or output.get("base_model")

                    if glb_url:
                        print(f"   🎉 3D Model Ready: {glb_url}")
                        return glb_url
                    else:
                        print("   ⚠️ Success reported, but model URL is missing from output.")
                        print(f"   Dump: {json.dumps(output)}")
                        return None
                
                elif status == "failed":
                    print(f"   ❌ Task Failed: {data.get('task_error', 'Unknown error')}")
                    return None
                
                # Progress
                progress = data.get("progress", 0)
                print(f"   ... processing ({progress}%) ...")

            except Exception as e:
                print(f"   ⚠️ Polling Error: {e}")

        print("❌ Timeout waiting for Tripo")
        return None

tripo_service = TripoService()