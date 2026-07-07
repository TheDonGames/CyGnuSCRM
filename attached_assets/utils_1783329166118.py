# utils.py
"""
utils.py
Utility functions for Cygnus Repair Manager
Includes: barcode generation, date helpers, formatting tools, safe type conversion,
and PyInstaller-safe resource/icon helpers.
"""

import sys
import os
from datetime import datetime

import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageTk


# =======================================================
# Global Variables for User/Role Management (ADDED)
# These variables are used by menubar.py and are finalized in main.py
# =======================================================
USER_ROLE = "technician"   # default initial value
TECHNICIAN_NAME = None     # default initial value

# ---- Settings helpers (wrapper to avoid circular imports) ----
def load_settings():
    # Local import to avoid circular import at module load time
    from database import load_settings as _load_settings
    return _load_settings()

def save_settings(s):
    from database import save_settings as _save_settings
    return _save_settings(s)

# =============================
# PyInstaller / Resource Helpers
# =============================
def resource_path(relative_path: str) -> str:
    """
    Return absolute path to a resource.
    Works in normal python runs and in PyInstaller builds (onefile/onedir).
    """
    base_path = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, relative_path)


def apply_window_icon(win) -> None:
    """
    Apply Cygnus icon to any Tk/Toplevel window.
    Fixes the default Tk icon appearing on Invoice/Receipt/Label windows.
    """
    # local import to avoid forcing tkinter import at module import time
    try:
        import tkinter as tk
    except Exception:
        return

    ico_path = resource_path("logo.ico")
    png_path = resource_path("logo.png")

    # Titlebar icon (Windows prefers .ico)
    if os.path.exists(ico_path):
        try:
            win.iconbitmap(ico_path)
        except Exception:
            pass

    # Taskbar / iconphoto (PNG works well)
    if os.path.exists(png_path):
        try:
            img = tk.PhotoImage(file=png_path)
            win.tk.call("wm", "iconphoto", win._w, img)
            # keep a reference to avoid garbage collection
            win._cygnus_icon_ref = img
        except Exception:
            pass


# =============================
# Safe Type Conversions
# =============================
def safe_float(value) -> float:
    """
    Convert a value to float, return 0.0 if conversion fails.
    Handles values like '1,000.00'.
    """
    if value is None:
        return 0.0
    try:
        return float(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return 0.0


def safe_int(value) -> int:
    """
    Convert a value to int, return 0 if conversion fails.
    Handles '1,000', '1.0', etc.
    """
    if value is None:
        return 0

    # Fast path for real ints
    if isinstance(value, int):
        return value

    s = str(value).replace(",", "").strip()
    if not s:
        return 0

    try:
        return int(s)
    except (ValueError, TypeError):
        try:
            return int(float(s))
        except (ValueError, TypeError):
            return 0


def safe_str(value) -> str:
    """
    Convert a value to a safe string (useful for filenames/reports).
    """
    if value is None:
        return ""
    try:
        s = str(value).strip()
        s = s.replace(":", "_").replace("/", "_").replace("\\", "_")
        return s
    except Exception:
        return ""


# =============================
# Barcode Utilities
# =============================
def generate_barcode(code, output_dir="assets/barcodes"):
    """
    Generate a CODE128 barcode image and return the PNG path.
    Tuned for 80x20mm labels @ ~230dpi.
    """
    if not code:
        return None

    try:
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        str_code = str(code).strip()
        if not str_code:
            return None

        # Safe filename
        safe_filename = str_code.replace("/", "_").replace("\\", "_").replace(":", "_")

        code128 = barcode.get_barcode_class("code128")
        writer = ImageWriter()

        # Best settings for small label
        try:
            writer.set_options({
                "write_text": False,      # no text under barcode
                "module_height": 9.0,
                "module_width": 0.25,
                "quiet_zone": 1.0,
                "font_size": 0,
                "text_distance": 1
            })
        except Exception:
            pass

        base_path = os.path.join(output_dir, safe_filename)
        saved_path = code128(str_code, writer=writer).save(base_path)

        # Normalize returned path
        if saved_path and os.path.exists(saved_path):
            return saved_path
        if saved_path and os.path.exists(saved_path + ".png"):
            return saved_path + ".png"
        if os.path.exists(base_path + ".png"):
            return base_path + ".png"

        return None

    except Exception as e:
        print(f"Barcode generation failed: {e}")
        return None


def load_barcode_image(code, output_dir="assets/barcodes"):
    """Load the barcode image for display in Tkinter."""
    if not code:
        return None

    path_with_ext = generate_barcode(code, output_dir)
    if path_with_ext and os.path.exists(path_with_ext):
        try:
            img = Image.open(path_with_ext)
            return ImageTk.PhotoImage(img)
        except Exception:
            return None
    return None


# =============================
# Date Utilities
# =============================
def current_date() -> str:
    """Return current date as YYYY-MM-DD."""
    return datetime.now().strftime("%Y-%m-%d")


def current_timestamp() -> str:
    """Return formatted timestamp for reports."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# =============================
# ID & Formatting Helpers
# =============================
def generate_repair_id(prefix="REP") -> str:
    """Generate repair ID like REP-2025-001."""
    year = datetime.now().strftime("%Y")
    num = int(datetime.now().strftime("%j%H%M%S")) % 999
    return f"{prefix}-{year}-{num:03d}"


def format_currency(value) -> str:
    """Format numeric value into USD format."""
    try:
        f_value = safe_float(value)
        return f"${f_value:,.2f}"
    except Exception:
        return "$0.00"
