from enum import Enum


class UserRole(str, Enum):
    superadmin = "superadmin"
    admin = "admin"
    editor = "editor"
    viewer = "viewer"
