import os
from utils.get_env import get_app_data_directory_env, get_database_url_env
from urllib.parse import urlsplit, urlunsplit, parse_qsl
import ssl


def get_database_url_and_connect_args() -> tuple[str, dict]:
    app_data_dir = get_app_data_directory_env() or "/tmp/presenton"
    app_data_dir = os.path.abspath(app_data_dir)
    print(f"App Data Directory resolved to: {app_data_dir}")
    
    if not os.path.exists(app_data_dir):
        print(f"Creating directory: {app_data_dir}")
        os.makedirs(app_data_dir, exist_ok=True)
        
    # Normalize path for URI (force forward slashes even on Windows to avoid escaping issues)
    # Also handle the drive letter correctly for SQLAlchemy URI: sqlite:///C:/path
    app_data_dir = app_data_dir.replace("\\", "/")
    
    database_url = get_database_url_env()
    if not database_url:
        db_path = os.path.join(app_data_dir, "fastapi.db").replace("\\", "/")
        # Ensure we don't end up with sqlite:////C:/... if not needed, but sqlite:///C:/... is standard
        database_url = f"sqlite:///{db_path}"

    if database_url.startswith("sqlite://"):
        database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("mysql://"):
        database_url = database_url.replace("mysql://", "mysql+aiomysql://", 1)
    else:
        database_url = database_url

    connect_args = {}
    if "sqlite" in database_url:
        connect_args["check_same_thread"] = False

    try:
        # Only parse query params if needed, avoid full rebuild which might mess up Windows paths
        split_result = urlsplit(database_url)
        if split_result.query:
            query_params = parse_qsl(split_result.query, keep_blank_values=True)
            driver_scheme = split_result.scheme
            for k, v in query_params:
                key_lower = k.lower()
                if key_lower == "sslmode" and "postgresql+asyncpg" in driver_scheme:
                    if v.lower() != "disable" and "sqlite" not in database_url:
                        connect_args["ssl"] = ssl.create_default_context()
            
            # Reconstruct is risky with windows paths in netloc/path mixups, so better to just use original if no changes needed
            # But the logic was just intending to handle ssl context. 
            # We can skip urlunsplit if we didn't modify the url string itself (which we didn't above)
            pass 
    except Exception as e:
        print(f"Error parsing database URL: {e}")
        pass

    print(f"Final Database URL: {database_url}")
    return database_url, connect_args
