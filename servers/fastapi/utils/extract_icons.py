
import json
import os
import sys

# Adjust paths relative to this script or project root
# Assuming this script is at servers/fastapi/utils/extract_icons.py
# Project root is ../../../

# Script is at servers/fastapi/utils/extract_icons.py
# We want project root: .../presenton

# .../servers/fastapi/utils/extract_icons.py -> .../servers/fastapi/utils
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# .../servers/fastapi
FASTAPI_DIR = os.path.dirname(CURRENT_DIR)
# .../servers
SERVERS_DIR = os.path.dirname(FASTAPI_DIR)

FASTAPI_ASSETS_DIR = os.path.join(FASTAPI_DIR, "assets")
# servers/nextjs/public...
NEXTJS_STATIC_ICONS_DIR = os.path.join(SERVERS_DIR, "nextjs", "public", "static", "icons", "bold")

ICONS_JSON_PATH = os.path.join(FASTAPI_ASSETS_DIR, "icons.json")

def extract_icons():
    print(f"Reading icons from {ICONS_JSON_PATH}")
    if not os.path.exists(ICONS_JSON_PATH):
        print("Error: icons.json not found")
        return

    try:
        with open(ICONS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return

    icons = data.get("icons", [])
    print(f"Found {len(icons)} total icons.")

    if not os.path.exists(NEXTJS_STATIC_ICONS_DIR):
        print(f"Creating directory {NEXTJS_STATIC_ICONS_DIR}")
        os.makedirs(NEXTJS_STATIC_ICONS_DIR, exist_ok=True)

    count = 0
    skipped = 0
    for icon in icons:
        name = icon.get("name")
        content = icon.get("content")
        
        # Check if it is a bold icon
        if name and name.endswith("-bold"):
            file_path = os.path.join(NEXTJS_STATIC_ICONS_DIR, f"{name}.svg")
            
            # Optimization: Skip if file already exists
            if os.path.exists(file_path):
                skipped += 1
                continue
                
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            count += 1
            if count % 100 == 0:
                print(f"Extracted {count} new icons...")

    print(f"Extraction check complete. Extracted {count} new icons, skipped {skipped} existing.")

if __name__ == "__main__":
    extract_icons()
