import { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  info: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}
      {...props}
    />
  );
}

export const BOOKING_STATUS_TONE: Record<string, Tone> = {
  PENDING: "warning",
  CONFIRMED: "info",
  DRIVER_ASSIGNED: "info",
  DRIVER_EN_ROUTE: "info",
  DRIVER_ARRIVED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger",
};
