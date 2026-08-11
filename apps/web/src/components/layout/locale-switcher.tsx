"use client";

import { useLocale } from "next-intl";
import { routing, localeLabels, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => {
        const nextLocale = e.target.value as AppLocale;
        router.replace(pathname, { locale: nextLocale });
      }}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {localeLabels[l]}
        </option>
      ))}
    </select>
  );
}
