"use client";

import { ReactNode } from "react";
import clsx from "clsx";
import { Link, usePathname } from "@/i18n/navigation";

interface DashboardShellProps {
  title: string;
  tabs: { href: string; label: string }[];
  children: ReactNode;
}

export function DashboardShell({ title, tabs, children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{title}</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              pathname === tab.href
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
