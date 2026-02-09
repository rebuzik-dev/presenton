from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    editor = "editor"
    viewer = "viewer"
