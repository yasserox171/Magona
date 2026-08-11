"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { SupportedCurrency, SupportedLocale } from "@magona/shared";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const t = useTranslations("common");
  const td = useTranslations("dashboard");
  const setUser = useAuthStore((s) => s.setUser);
  const { data: profile, mutate } = useSWR("/users/me", () => api.get<any>("/users/me"));
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", locale: "en", currency: "EUR" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? "",
        locale: profile.locale,
        currency: profile.currency,
      });
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updated = await api.patch("/users/me", form);
    setUser(updated as any);
    setSaved(true);
    mutate();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900 dark:text-white">{td("profile")}</h2>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("firstName")} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label={t("lastName")} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Input label={t("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label={t("language")} value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}>
                {Object.values(SupportedLocale).map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </Select>
              <Select label={t("currency")} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {Object.values(SupportedCurrency).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">{t("save")}</Button>
            {saved && <span className="ml-3 text-sm text-emerald-600">Saved</span>}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900 dark:text-white">Privacy</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            You can request deletion of your personal data at any time in line with GDPR. Your booking history will be
            anonymized rather than deleted where we have a legal or accounting obligation to retain it.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={async () => {
              if (confirm("Request deletion of your personal data? This cannot be undone.")) {
                await api.post("/users/me/gdpr/delete-request");
                useAuthStore.getState().logout();
                window.location.href = "/";
              }
            }}
          >
            Request data deletion
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
