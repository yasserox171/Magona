"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuthTokens } from "@magona/shared";
import { api, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter, Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "" });
  const [gdprConsent, setGdprConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gdprConsent) {
      setError("Please accept the privacy policy to continue.");
      return;
    }
    setIsLoading(true);
    try {
      const tokens = await api.post<AuthTokens>("/auth/register", { ...form, gdprConsent, marketingOptIn }, { auth: false });
      setTokens(tokens);
      const me = await api.get("/auth/me");
      setUser(me as any);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create your account");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t("createAccount")}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("signUpSubtitle")}</p>

      <Card className="mt-6">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label={tc("firstName")} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label={tc("lastName")} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Input label={tc("email")} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={tc("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input
              label={tc("password")}
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="mt-0.5" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} />
              {t("gdprConsent")}
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="mt-0.5" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
              {t("marketingOptIn")}
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {tc("signUp")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              {tc("signIn")}
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
