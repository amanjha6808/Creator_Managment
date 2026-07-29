"use client";

import { clsx } from "clsx";
import { CreatorStatus, STATUS_COLORS } from "@/lib/types";

interface StatusBadgeProps {
  status: CreatorStatus;
  onChange?: (status: CreatorStatus) => void;
  readonly?: boolean;
}

const STATUSES: CreatorStatus[] = [
  "Pending",
  "Contacted",
  "In Negotiation",
  "Confirmed",
  "Live",
  "Dropped",
];

export function StatusBadge({ status, onChange, readonly = false }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS["Pending"];

  if (readonly || !onChange) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          colors.bg,
          colors.text
        )}
      >
        <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", colors.dot)} />
        {status}
      </span>
    );
  }

  return (
    <div className="relative inline-flex">
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as CreatorStatus)}
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          "appearance-none cursor-pointer border-0 outline-none",
          "transition-all duration-150",
          "pr-6",
          colors.bg,
          colors.text
        )}
        style={{ backgroundImage: "none" }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {/* Dropdown chevron */}
      <span
        className={clsx(
          "absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none",
          colors.text
        )}
      >
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
