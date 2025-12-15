from fastapi import APIRouter
from fastapi.responses import FileResponse
import os

router = APIRouter()

ASSETS_DIR = "assets_storage"

@router.get("/{filename}")
async def get_asset(filename: str):
    """Serve stored assets (GLB files, images, etc.)"""
    filepath = os.path.join(ASSETS_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath)
    return {"error": "Asset not found"}
