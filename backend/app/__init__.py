"""
backend/app/__init__.py
========================
Purpose:
    Marks the `app/` directory as a Python package so that sub-modules can
    be imported with the `app.*` namespace (e.g. `from app.config import settings`).

    In most FastAPI projects this file is intentionally kept empty (or contains
    only a version string). Heavy initialisation logic belongs in `main.py`.

What to implement here (optional):
    - You may define a `__version__` string:
        __version__ = "1.0.0"
    - No other logic should live here; keep it minimal to avoid circular imports.
"""

# Package marker — intentionally minimal
