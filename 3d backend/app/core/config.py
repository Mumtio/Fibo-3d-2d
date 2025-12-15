import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Fibo 3D Backend"
    
    # API Keys
    BRIA_API_KEY: str = os.getenv("BRIA_API_KEY", "")
    MESHY_API_KEY: str = os.getenv("MESHY_API_KEY", "")
    TRIPO_API_KEY: str = os.getenv("TRIPO_API_KEY", "")  # <--- Ensure this is here for Tripo

# Instantiate the settings once
settings = Settings()