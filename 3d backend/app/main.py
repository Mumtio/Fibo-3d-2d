from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import fibo, generation,assets

# Initialize the app 
app = FastAPI(title="Fibo 3D Pipeline")

# Setup CORS (allows Team Member B's frontend to talk to your backend) [cite: 8]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#Register Routers
app.include_router(fibo.router, prefix="/fibo", tags=["FIBO"])
app.include_router(generation.router, prefix="/3d", tags=["3D Generation"])
app.include_router(assets.router, prefix="/assets", tags=["Assets"])

# A simple test route to check if it works
@app.get("/")
def read_root():
    return {"message": f"welcome to {settings.PROJECT_NAME} "}
