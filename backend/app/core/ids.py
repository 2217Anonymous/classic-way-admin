from __future__ import annotations

import uuid

from sqlalchemy import Uuid
from sqlalchemy.orm import mapped_column


def uuid_pk():
    return mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)


def uuid_fk(
    target: str,
    *,
    nullable: bool = False,
    index: bool = True,
    ondelete: str | None = None,
    unique: bool = False,
):
    from sqlalchemy import ForeignKey

    kwargs = {"nullable": nullable, "index": index, "unique": unique}
    fk_kwargs: dict[str, str] = {}
    if ondelete is not None:
        fk_kwargs["ondelete"] = ondelete
    return mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(target, **fk_kwargs),
        **kwargs,
    )
