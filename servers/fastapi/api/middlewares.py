from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from utils.get_env import get_can_change_keys_env
from utils.user_config import update_env_with_user_config


class UserConfigEnvUpdateMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if get_can_change_keys_env() != "false":
            try:
                # update_env_with_user_config() # FIXME: This is blocking and causing socket hang ups
                pass
            except Exception:
                pass
        return await call_next(request)
