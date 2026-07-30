from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image, UnidentifiedImageError

from app.core.images.constants import (
    ALLOWED_EXTENSIONS,
    ALLOWED_IMAGE_CONTENT_TYPES,
    MAX_IMAGE_DIMENSION,
    VARIANT_SPECS,
)
from app.utils.exceptions import AppError


@dataclass(frozen=True)
class ImageValidationResult:
    content_type: str
    extension: str
    width: int
    height: int
    file_size: int
    has_alpha: bool


@dataclass(frozen=True)
class ImageVariant:
    name: str
    data: bytes
    width: int
    height: int
    file_size: int
    content_type: str = "image/webp"


@dataclass(frozen=True)
class ProcessedImageSet:
    original: ImageValidationResult
    large: ImageVariant
    medium: ImageVariant
    thumbnail: ImageVariant


def _normalize_content_type(content_type: str | None) -> str:
    value = (content_type or "").split(";")[0].strip().lower()
    if value == "image/jpg":
        return "image/jpeg"
    return value


def _extension_from_filename(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def _resolve_declared_type(
    content_type: str | None, filename: str | None
) -> tuple[str, str]:
    normalized_type = _normalize_content_type(content_type)
    extension = ALLOWED_IMAGE_CONTENT_TYPES.get(normalized_type, "")
    file_ext = _extension_from_filename(filename)

    if file_ext and file_ext not in ALLOWED_EXTENSIONS:
        raise AppError(
            "Unsupported image format. Allowed: JPEG, PNG, WebP, GIF, AVIF",
            400,
        )

    if extension:
        return normalized_type, extension

    if file_ext in {".jpg", ".jpeg"}:
        return "image/jpeg", ".jpg"
    if file_ext == ".png":
        return "image/png", ".png"
    if file_ext == ".webp":
        return "image/webp", ".webp"
    if file_ext == ".gif":
        return "image/gif", ".gif"
    if file_ext == ".avif":
        return "image/avif", ".avif"

    raise AppError(
        "Unsupported image type. Allowed: JPEG, PNG, WebP, GIF, AVIF",
        400,
    )


def validate_image_bytes(
    data: bytes,
    *,
    content_type: str | None,
    filename: str | None,
    max_bytes: int,
) -> ImageValidationResult:
    if not data:
        raise AppError("Uploaded image is empty", 400)
    if len(data) > max_bytes:
        max_mb = max(1, max_bytes // (1024 * 1024))
        raise AppError(f"Image must be {max_mb}MB or smaller", 400)

    declared_type, extension = _resolve_declared_type(content_type, filename)

    try:
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            width, height = image.size
            has_alpha = image.mode in {"RGBA", "LA"} or (
                image.mode == "P" and "transparency" in image.info
            )
            detected_format = (image.format or "").upper()
    except UnidentifiedImageError as exc:
        raise AppError("Invalid or corrupted image file", 400) from exc
    except OSError as exc:
        message = str(exc).lower()
        if "avif" in message or "decoder" in message:
            raise AppError(
                "AVIF is not supported by the current image processing environment",
                400,
            ) from exc
        raise AppError("Invalid or corrupted image file", 400) from exc

    if width <= 0 or height <= 0:
        raise AppError("Invalid image dimensions", 400)
    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise AppError(
            f"Image dimensions must be at most {MAX_IMAGE_DIMENSION}px",
            400,
        )

    format_to_type = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
        "GIF": "image/gif",
        "AVIF": "image/avif",
    }
    detected_type = format_to_type.get(detected_format)
    if detected_type:
        declared_type = detected_type
        extension = ALLOWED_IMAGE_CONTENT_TYPES[detected_type]

    return ImageValidationResult(
        content_type=declared_type,
        extension=extension,
        width=width,
        height=height,
        file_size=len(data),
        has_alpha=has_alpha,
    )


def _prepare_base_image(image: Image.Image) -> Image.Image:
    if image.mode in {"RGBA", "LA"}:
        return image.convert("RGBA")
    if image.mode == "P":
        if "transparency" in image.info:
            return image.convert("RGBA")
        return image.convert("RGB")
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def _resize_contain(image: Image.Image, max_size: int) -> Image.Image:
    width, height = image.size
    longest = max(width, height)
    if longest <= max_size:
        return image.copy()
    scale = max_size / float(longest)
    new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
    return image.resize(new_size, Image.Resampling.LANCZOS)


def _encode_webp(image: Image.Image, quality: int) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=quality, method=4)
    return buffer.getvalue()


def process_uploaded_image(
    data: bytes,
    *,
    content_type: str | None,
    filename: str | None,
    max_bytes: int,
) -> ProcessedImageSet:
    validation = validate_image_bytes(
        data,
        content_type=content_type,
        filename=filename,
        max_bytes=max_bytes,
    )
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            base = _prepare_base_image(image)
            variants: dict[str, ImageVariant] = {}
            for name, spec in VARIANT_SPECS.items():
                resized = _resize_contain(base, spec["max_size"])
                encoded = _encode_webp(resized, spec["quality"])
                variants[name] = ImageVariant(
                    name=name,
                    data=encoded,
                    width=resized.width,
                    height=resized.height,
                    file_size=len(encoded),
                )
    except UnidentifiedImageError as exc:
        raise AppError("Invalid or corrupted image file", 400) from exc
    except OSError as exc:
        message = str(exc).lower()
        if "avif" in message or "decoder" in message:
            raise AppError(
                "AVIF is not supported by the current image processing environment",
                400,
            ) from exc
        raise AppError("Failed to process image", 400) from exc

    return ProcessedImageSet(
        original=validation,
        large=variants["large"],
        medium=variants["medium"],
        thumbnail=variants["thumbnail"],
    )
