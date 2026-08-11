import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { SearchForm } from "@/components/booking/search-form";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-950 via-ink-900 to-ink-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
            <p className="mt-4 text-base text-slate-300 sm:text-lg">{t("heroSubtitle")}</p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl">
            <SearchForm />
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 text-center text-xs text-slate-300 sm:grid-cols-4 sm:text-sm">
            <TrustBadge label={t("trustBadges.fixedPrice")} />
            <TrustBadge label={t("trustBadges.freeCancellation")} />
            <TrustBadge label={t("trustBadges.support")} />
            <TrustBadge label={t("trustBadges.vetted")} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-ink-900 dark:text-white">{t("howItWorks")}</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <Step number={1} title={t("step1Title")} body={t("step1Body")} />
          <Step number={2} title={t("step2Title")} body={t("step2Body")} />
          <Step number={3} title={t("step3Title")} body={t("step3Body")} />
        </div>
      </section>
    </div>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
      <p>{label}</p>
    </div>
  );
}

function Step({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
        {number}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}
