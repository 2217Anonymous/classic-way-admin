from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.exc import IntegrityError

from app.modules.catalog.models.category import Category
from app.modules.catalog.repositories.category_repository import CategoryRepository
from app.modules.catalog.schemas.category import (
    CategoryCreate,
    CategoryTreeNode,
    CategoryUpdate,
)
from app.utils.exceptions import AppError, ConflictError, NotFoundError

UPLOAD_ROOT = Path("uploads")
CATEGORY_UPLOAD_DIR = UPLOAD_ROOT / "categories"
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_IMAGE_BYTES = 2 * 1024 * 1024


def slugify(value: str) -> str:
    slug = value.strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug[:140] or "category"


class CategoryService:
    def __init__(self, repository: CategoryRepository):
        self.repository = repository

    def list_categories(self) -> list[Category]:
        return self.repository.list()

    def list_tree(self) -> list[CategoryTreeNode]:
        categories = self.repository.list()
        # Build nodes without ORM relationship children, then link once.
        # model_validate(category) would copy SQLAlchemy `.children` and
        # cause each child to appear twice after we append below.
        by_id: dict[int, CategoryTreeNode] = {}
        for category in categories:
            node = CategoryTreeNode.model_validate(category)
            node.children = []
            by_id[category.id] = node

        roots: list[CategoryTreeNode] = []
        for category in categories:
            node = by_id[category.id]
            if category.parent_id and category.parent_id in by_id:
                by_id[category.parent_id].children.append(node)
            else:
                roots.append(node)
        return roots

    def get_category(self, category_id: int) -> Category:
        category = self.repository.get(category_id)
        if not category:
            raise NotFoundError("Category not found")
        return category

    def create_category(self, payload: CategoryCreate) -> Category:
        slug = slugify(payload.slug or payload.name)
        if self.repository.get_by_slug(slug):
            raise ConflictError("A category with this slug already exists")
        parent = self._validate_parent(payload.parent_id)
        try:
            return self.repository.create(
                name=payload.name.strip(),
                slug=slug,
                description=(
                    payload.description.strip() if payload.description else None
                ),
                parent_id=parent.id if parent else None,
                is_active=payload.is_active,
                sort_order=payload.sort_order,
            )
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("A category with this slug already exists") from exc

    def update_category(self, category_id: int, payload: CategoryUpdate) -> Category:
        category = self.get_category(category_id)
        changes = payload.model_dump(exclude_unset=True)

        if "name" in changes and changes["name"] is not None:
            category.name = changes["name"].strip()
        if "description" in changes:
            description = changes["description"]
            category.description = description.strip() if description else None
        if "is_active" in changes and changes["is_active"] is not None:
            category.is_active = changes["is_active"]
        if "sort_order" in changes and changes["sort_order"] is not None:
            category.sort_order = changes["sort_order"]
        if "slug" in changes and changes["slug"] is not None:
            slug = slugify(changes["slug"])
            existing = self.repository.get_by_slug(slug)
            if existing and existing.id != category.id:
                raise ConflictError("A category with this slug already exists")
            category.slug = slug
        if "parent_id" in changes:
            parent_id = changes["parent_id"]
            if parent_id == category.id:
                raise ConflictError("A category cannot be its own parent")
            parent = self._validate_parent(parent_id)
            if parent and self._is_descendant(category.id, parent.id):
                raise ConflictError(
                    "Cannot move a category under one of its descendants"
                )
            category.parent_id = parent.id if parent else None

        try:
            return self.repository.save(category)
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("A category with this slug already exists") from exc

    def delete_category(self, category_id: int) -> list[int]:
        category = self.get_category(category_id)
        deleted_ids = self._collect_subtree_ids(category.id)
        image_paths = []
        for deleted_id in deleted_ids:
            item = self.repository.get(deleted_id)
            if item and item.image_url:
                image_paths.append(item.image_url)
        self.repository.delete_ids(deleted_ids)
        for image_url in image_paths:
            self._delete_image_file(image_url)
        return deleted_ids

    async def upload_image(self, category_id: int, upload: UploadFile) -> Category:
        category = self.get_category(category_id)
        content_type = (upload.content_type or "").lower()
        extension = ALLOWED_IMAGE_TYPES.get(content_type)
        if not extension:
            raise AppError("Only JPEG, PNG, or WebP images are allowed", 400)

        data = await upload.read()
        if not data:
            raise AppError("Uploaded image is empty", 400)
        if len(data) > MAX_IMAGE_BYTES:
            raise AppError("Image must be 2MB or smaller", 400)

        CATEGORY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{category.id}_{uuid.uuid4().hex}{extension}"
        destination = CATEGORY_UPLOAD_DIR / filename
        destination.write_bytes(data)

        old_image = category.image_url
        category.image_url = f"/uploads/categories/{filename}"
        saved = self.repository.save(category)
        if old_image:
            self._delete_image_file(old_image)
        return saved

    def _collect_subtree_ids(self, category_id: int) -> list[int]:
        ordered: list[int] = []

        def walk(current_id: int) -> None:
            for child in self.repository.list_children(current_id):
                walk(child.id)
            ordered.append(current_id)

        walk(category_id)
        return ordered

    def _delete_image_file(self, image_url: str) -> None:
        if not image_url.startswith("/uploads/categories/"):
            return
        path = Path(image_url.lstrip("/"))
        if path.exists() and path.is_file():
            path.unlink()

    def _validate_parent(self, parent_id: int | None) -> Category | None:
        if parent_id is None:
            return None
        parent = self.repository.get(parent_id)
        if not parent:
            raise NotFoundError("Parent category not found")
        return parent

    def _is_descendant(self, ancestor_id: int, candidate_id: int) -> bool:
        current = self.repository.get(candidate_id)
        seen: set[int] = set()
        while current and current.parent_id is not None:
            if current.parent_id == ancestor_id:
                return True
            if current.parent_id in seen:
                break
            seen.add(current.parent_id)
            current = self.repository.get(current.parent_id)
        return False
