import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:1234@localhost/cognitive_load")
    PORT = os.getenv("PORT", "8000")
    INTERNAL_API_BASE: str = os.getenv("INTERNAL_API_BASE", f"http://localhost:{PORT}")
    
    # Storage directories relative to project root by default
    STUDENT_DIR = os.getenv("STUDENT_DIR", str(BASE_DIR / "data" / "students"))
    TEACHER_DIR = os.getenv("TEACHER_DIR", str(BASE_DIR / "data" / "teachers"))
    EEG_DIR = os.getenv("EEG_DIR", str(BASE_DIR / "output"))

settings = Settings()
