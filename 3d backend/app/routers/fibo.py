from fastapi import APIRouter, HTTPException
from app.schemas import PromptRequest, FiboStructure, RenderRequest, ImageResponse
from app.services.fibo_service import fibo_service

router = APIRouter()

@router.post("/structured", response_model=FiboStructure)
def get_structured_prompt(request: PromptRequest):
    """
    Step 1: User sends text -> We return structured JSON.
    """
    try:
        data = fibo_service.generate_structure(request.user_text)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/render", response_model=ImageResponse)
def render_fibo_image(request: RenderRequest):
    """
    Step 2: User confirms JSON -> We return an Image URL.
    """
    try:
        result = fibo_service.render_image(request.structure.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))