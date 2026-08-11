"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { UserRole } from "@magona/shared";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/currency-store";
import { RoleGuard } from "@/components/layout/role-guard";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookingStatusBadge } from "@/components/booking/status-badge";

export default function CorporatePortalPage() {
  return (
    <RoleGuard roles={[UserRole.CORPORATE_ADMIN]}>
      <CorporateContent />
    </RoleGuard>
  );
}

function CorporateContent() {
  const t = useTranslations("corporate");
  const [tab, setTab] = useState<"employees" | "bookings" | "invoices">("employees");
  const { data: account } = useSWR("/corporate/me", () => api.get<any>("/corporate/me"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t("title")}</h1>
      {account && <p className="mt-1 text-sm text-slate-500">{account.companyName} · {(account.discountRate * 100).toFixed(0)}% discount</p>}

      <div className="mt-4 flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {(["employees", "bookings", "invoices"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === tb ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500"
            }`}
          >
            {tb === "employees" ? t("employees") : tb === "bookings" ? t("companyBookings") : "Invoices"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "employees" && <EmployeesPanel account={account} />}
        {tab === "bookings" && <BookingsPanel />}
        {tab === "invoices" && <InvoicesPanel />}
      </div>
    </div>
  );
}

function EmployeesPanel({ account }: { account: any }) {
  const t = useTranslations("corporate");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", costCenter: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/corporate/employees", form);
      setShowForm(false);
      window.location.reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Unable to add employee");
    }
  }

  return (
    <div>
      <Button size="sm" onClick={() => setShowForm((s) => !s)}>
        {t("addEmployee")}
      </Button>
      {showForm && (
        <Card className="mt-3">
          <CardBody>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label={t("costCenter")} value={form.costCenter} onChange={(e) => setForm({ ...form, costCenter: e.target.value })} />
              <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Button type="submit" className="sm:col-span-2">
                Save
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
      <div className="mt-4 space-y-3">
        {account?.employees?.map((e: any) => (
          <Card key={e.id}>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-900 dark:text-white">
                  {e.user.firstName} {e.user.lastName}
                </p>
                <p className="text-sm text-slate-500">{e.user.email} {e.costCenter ? `· ${e.costCenter}` : ""}</p>
              </div>
              <span className="text-xs text-slate-500">{e.isActive ? "Active" : "Inactive"}</span>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BookingsPanel() {
  const { data } = useSWR("/corporate/bookings", () => api.get<any[]>("/corporate/bookings"));
  return (
    <div className="space-y-3">
      {data?.map((b) => (
        <Card key={b.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-ink-900 dark:text-white">
                {b.pickupLabel} → {b.dropoffLabel}
              </p>
              <p className="text-sm text-slate-500">
                {b.customer?.firstName} {b.customer?.lastName} · {new Date(b.pickupDateTime).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <BookingStatusBadge status={b.status} />
              <span className="text-sm font-semibold">{formatMoney(b.totalCents, b.currency)}</span>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function InvoicesPanel() {
  const { data } = useSWR("/corporate/invoices", () => api.get<any[]>("/corporate/invoices"));
  return (
    <div className="space-y-3">
      {data?.length === 0 && <p className="text-sm text-slate-500">No invoices yet — these are generated monthly.</p>}
      {data?.map((inv) => (
        <Card key={inv.id}>
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink-900 dark:text-white">{inv.number}</p>
              <p className="text-sm text-slate-500">
                {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatMoney(inv.amountCents, inv.currency)}</p>
              <p className="text-xs text-slate-500">{inv.status}</p>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
