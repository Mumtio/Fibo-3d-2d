import json
import requests
import os
from app.core.config import settings

class ImageService:
    BASE_URL = "https://engine.prod.bria-api.com/v2/image/generate"

    def _build_prompt(self, subject: str):
        """
        Creates a single, high-quality prompt for 3D reference.
        """
        return {
            "short_description": f"A technical studio photo of a {subject}.", 
            "objects": [
                {
                    "description": f"A {subject} with clear details.",
                    "location": "center",
                    "relationship": "Primary subject.",
                    "relative_size": "large within frame",
                    "shape_and_color": "Standard structure, uniform color.", 
                    "texture": "Smooth, clean material.",
                    "appearance_details": "Symmetrical design.",
                }
            ],
            "background_setting": "Solid white background.",
            "lighting": {
                "conditions": "Studio lighting",
                "direction": "Front",
                "shadows": "Minimal"
            },
            "aesthetics": {
                "composition": "Centered",
                "color_scheme": "Neutral",
                "mood_atmosphere": "Technical",
            },
            "photographic_characteristics": {
                "camera_angle": "Front view", 
                "lens_focal_length": "50mm",
                "depth_of_field": "Deep focus",
                "focus": "Sharp focus"
            },
            "style_medium": "photograph",
            "context": "3D asset generation reference.", 
            "artistic_style": "realistic"
        }

    def generate_single_image(self, subject: str):
        """
        Generates ONE image via Fibo and returns its URL.
        """
        headers = {
            "api_token": settings.BRIA_API_KEY,
            "Content-Type": "application/json"
        }

        print(f"📸 Calling Fibo to generate: {subject}")

        # Note: We are strictly asking for ONE image.
        payload = {
            "structured_prompt": json.dumps(self._build_prompt(subject)),
            "aspect_ratio": "1:1",
            "sync": True,
            "seed": 42, 
            "variation_strength": 0
        }

        try:
            response = requests.post(self.BASE_URL, headers=headers, json=payload)
            
            if response.status_code != 200:
                print(f"❌ Fibo Error: {response.text}")
                return None

            result = response.json()
            img_url = result["result"]["image_url"]
            print(f"   ✅ Fibo Image Created: {img_url}")
            
            return img_url

        except Exception as e:
            print(f"   ❌ Exception: {str(e)}")
            return None

image_service = ImageService()