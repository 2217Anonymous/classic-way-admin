"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";

type ActionIconButtonsProps = {
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
};

export function ActionIconButtons({
  viewLabel = "View",
  editLabel = "Edit",
  deleteLabel = "Delete",
  onView,
  onEdit,
  onDelete,
  className = "",
}: ActionIconButtonsProps) {
  return (
    <div className={`flex justify-end gap-1 ${className}`.trim()}>
      {onView ? (
        <button
          type="button"
          onClick={onView}
          className="action-icon-btn action-icon-view"
          aria-label={viewLabel}
          title={viewLabel}
        >
          <Eye size={15} />
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="action-icon-btn action-icon-edit"
          aria-label={editLabel}
          title={editLabel}
        >
          <Pencil size={15} />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="action-icon-btn action-icon-delete"
          aria-label={deleteLabel}
          title={deleteLabel}
        >
          <Trash2 size={15} />
        </button>
      ) : null}
    </div>
  );
}
