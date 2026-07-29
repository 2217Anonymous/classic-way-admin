from __future__ import annotations

# MIME → preferred extension for temporary originals
ALLOWED_IMAGE_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}

VARIANT_SPECS: dict[str, dict[str, int]] = {
    "large": {"max_size": 1200, "quality": 85},
    "medium": {"max_size": 600, "quality": 82},
    "thumbnail": {"max_size": 300, "quality": 80},
}

MAX_IMAGE_DIMENSION = 8000
