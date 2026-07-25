"use client";

type StatusPillProps = {
  active?: boolean;
  label?: string;
  tone?: "success" | "danger" | "warning" | "neutral" | "info";
  className?: string;
};

const toneClass: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  success: "status-pill status-pill-success",
  danger: "status-pill status-pill-danger",
  warning: "status-pill status-pill-warning",
  neutral: "status-pill status-pill-neutral",
  info: "status-pill status-pill-info",
};

export function StatusPill({
  active,
  label,
  tone,
  className = "",
}: StatusPillProps) {
  const resolvedTone =
    tone ?? (active === undefined ? "neutral" : active ? "success" : "danger");
  const resolvedLabel =
    label ??
    (active === undefined ? "—" : active ? "Active" : "Inactive");

  return (
    <span className={`${toneClass[resolvedTone]} ${className}`.trim()}>
      {resolvedLabel}
    </span>
  );
}
