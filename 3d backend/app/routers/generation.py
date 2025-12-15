from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.services.image_service import image_service
from app.services.tripo_service import tripo_service
import uuid
import os
import requests
from typing import Optional

router = APIRouter()

# In-memory storage for job results (use Redis/DB in production)
job_results = {}

# Directory to store downloaded models
MODELS_DIR = "assets_storage/models"
os.makedirs(MODELS_DIR, exist_ok=True)

class GenerationRequest(BaseModel):
    prompt: str 

class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, generating_image, generating_3d, completed, failed
    image_url: Optional[str] = None
    model_url: Optional[str] = None
    error: Optional[str] = None

@router.post("/generate-full-pipeline")
async def generate_pipeline(request: GenerationRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    job_results[job_id] = {
        "status": "pending",
        "image_url": None,
        "model_url": None,
        "error": None
    }
    
    def run_hybrid_pipeline(jid, user_prompt):
        print(f"\n🚀 STARTING FIBO -> TRIPO PIPELINE (Job {jid})")
        
        try:
            # 1. FIBO (Phase 1)
            job_results[jid]["status"] = "generating_image"
            image_url = image_service.generate_single_image(user_prompt)
            
            if not image_url:
                job_results[jid]["status"] = "failed"
                job_results[jid]["error"] = "Failed to generate image"
                print("❌ Pipeline Stopped at Phase 1 (Fibo)")
                return
            
            job_results[jid]["image_url"] = image_url

            # 2. TRIPO (Phase 2)
            print(f"--- PHASE 2: TRIPO 3D CONVERSION ---")
            job_results[jid]["status"] = "generating_3d"
            glb_url = tripo_service.generate_3d_model(image_url)

            if glb_url:
                # Download the GLB file to serve locally (avoids CORS issues)
                print(f"   📥 Downloading GLB file...")
                local_filename = f"{jid}.glb"
                local_path = os.path.join(MODELS_DIR, local_filename)
                
                try:
                    resp = requests.get(glb_url, timeout=120)
                    if resp.status_code == 200:
                        with open(local_path, 'wb') as f:
                            f.write(resp.content)
                        # Use local URL instead of remote
                        local_model_url = f"/3d/models/{local_filename}"
                        job_results[jid]["model_url"] = local_model_url
                        print(f"   💾 Saved to: {local_path}")
                    else:
                        # Fallback to remote URL
                        job_results[jid]["model_url"] = glb_url
                        print(f"   ⚠️ Could not download, using remote URL")
                except Exception as download_err:
                    print(f"   ⚠️ Download failed: {download_err}, using remote URL")
                    job_results[jid]["model_url"] = glb_url
                
                job_results[jid]["status"] = "completed"
                print(f"\n✨ SUCCESS!")
                print(f"   🖼️ Input Image: {image_url}")
                print(f"   📦 Final 3D Model: {job_results[jid]['model_url']}")
            else:
                job_results[jid]["status"] = "failed"
                job_results[jid]["error"] = "Failed to generate 3D model"
                print("❌ Pipeline Stopped at Phase 2 (Tripo)")
        except Exception as e:
            job_results[jid]["status"] = "failed"
            job_results[jid]["error"] = str(e)
            print(f"❌ Pipeline Error: {e}")

    background_tasks.add_task(run_hybrid_pipeline, job_id, request.prompt)
    
    return {
        "message": "Hybrid Pipeline started (Fibo -> Tripo).",
        "job_id": job_id
    }

@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a generation job"""
    if job_id not in job_results:
        raise HTTPException(status_code=404, detail="Job not found")
    
    result = job_results[job_id]
    return {
        "job_id": job_id,
        **result
    }

@router.post("/generate-sync")
async def generate_sync(request: GenerationRequest):
    """
    Synchronous generation - waits for completion and returns the result.
    Use this for simpler frontend integration.
    """
    print(f"\n🚀 STARTING SYNC FIBO -> TRIPO PIPELINE")
    
    # 1. FIBO (Phase 1)
    print("--- PHASE 1: FIBO IMAGE GENERATION ---")
    image_url = image_service.generate_single_image(request.prompt)
    
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to generate image")

    # 2. TRIPO (Phase 2)
    print(f"--- PHASE 2: TRIPO 3D CONVERSION ---")
    glb_url = tripo_service.generate_3d_model(image_url)

    if not glb_url:
        raise HTTPException(status_code=500, detail="Failed to generate 3D model")
    
    print(f"\n✨ SUCCESS!")
    print(f"   🖼️ Input Image: {image_url}")
    print(f"   📦 Final 3D Model: {glb_url}")
    
    return {
        "status": "completed",
        "image_url": image_url,
        "model_url": glb_url
    }


@router.get("/models/{filename}")
async def get_model(filename: str):
    """Serve downloaded GLB model files"""
    filepath = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Model not found")
    
    return FileResponse(
        filepath,
        media_type="model/gltf-binary",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Content-Disposition": f"inline; filename={filename}"
        }
    )
