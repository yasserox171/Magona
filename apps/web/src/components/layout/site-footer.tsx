import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tc = useTranslations("common");

  return (
    <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-ink-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6 dark:text-slate-400">
        <p>
          © {new Date().getFullYear()} {tc("appName")}. {t("rights")}
        </p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-brand-600">
            {t("privacy")}
          </a>
          <a href="#" className="hover:text-brand-600">
            {t("terms")}
          </a>
        </div>
      </div>
    </footer>
  );
}
