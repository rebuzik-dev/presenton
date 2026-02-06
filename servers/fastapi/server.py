import uvicorn
import argparse

from dotenv import load_dotenv
import os

if __name__ == "__main__":
    # Load .env from project root (2 levels up)
    load_dotenv("../../.env")
    parser = argparse.ArgumentParser(description="Run the FastAPI server")
    parser.add_argument(
        "--port", type=int, required=True, help="Port number to run the server on"
    )
    parser.add_argument(
        "--reload", type=str, default="false", help="Reload the server on code changes"
    )
    args = parser.parse_args()
    reload = args.reload == "true"
    
    # Run icon extraction on startup
    print("Running startup tasks...")
    try:
        from utils.extract_icons import extract_icons
        extract_icons()
    except Exception as e:
        print(f"Error extracting icons: {e}")
    
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=args.port,
        log_level="debug",
        reload=reload,
    )
