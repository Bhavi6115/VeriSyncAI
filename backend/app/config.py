import os
from dotenv import load_dotenv

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

BIFROST_BASE_URL = os.getenv(
    "BIFROST_BASE_URL",
    "http://localhost:8080"
)

BIFROST_MODEL = os.getenv(
    "BIFROST_MODEL",
    "gemini-2.5-flash"
)

BIFROST_API_KEY = os.getenv("BIFROST_API_KEY")

BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000"
)