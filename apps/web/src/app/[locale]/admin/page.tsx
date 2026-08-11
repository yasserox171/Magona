"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { DriverApprovalStatus, FleetStatus, UserRole, VehicleCategory } from "@magona/shared";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/currency-store";
import { RoleGuard } from "@/components/layout/role-guard";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BookingStatusBadge } from "@/components/booking/status-badge";

const TABS = ["overview", "bookings", "drivers", "fleets", "pricing", "commissions", "corporateAccounts"] as const;

export default function AdminPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN]}>
      <AdminContent />
    </RoleGuard>
  );
}

function AdminContent() {
  const t = useTranslations("admin");
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t("title")}</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              tab === tb ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500"
            }`}
          >
            {t(tb)}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "bookings" && <BookingsTable />}
        {tab === "drivers" && <DriversTable />}
        {tab === "fleets" && <FleetsTable />}
        {tab === "pricing" && <PricingRules />}
        {tab === "commissions" && <Commissions />}
        {tab === "corporateAccounts" && <CorporateAccounts />}
      </div>
    </div>
  );
}

function Overview() {
  const t = useTranslations("admin");
  const { data } = useSWR("/admin/overview", () => api.get<any>("/admin/overview"));
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label={t("revenueThisMonth")} value={formatMoney(data.revenueThisMonthCents, "EUR" as any)} />
      <Stat label={t("activeRides")} value={data.activeRides} />
      <Stat label="Bookings today" value={data.bookingsToday} />
      <Stat label="Customers" value={data.customerCount} />
      <Stat label="Drivers" value={data.driverCount} />
      <Stat label="Fleets" value={data.fleetCount} />
      <Stat label="Corporate accounts" value={data.corporateAccountCount} />
      <Stat label={t("pendingApprovals")} value={data.pendingDriverApprovals + data.pendingFleetApprovals} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-bold text-ink-900 dark:text-white">{value}</p>
      </CardBody>
    </Card>
  );
}

function BookingsTable() {
  const { data } = useSWR("/bookings/admin", () => api.get<any>("/bookings/admin"));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-2">Reference</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Trip</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.map((b: any) => (
            <tr key={b.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2 font-medium">{b.reference}</td>
              <td className="px-4 py-2">{b.customer?.firstName} {b.customer?.lastName}</td>
              <td className="px-4 py-2">{b.pickupLabel} → {b.dropoffLabel}</td>
              <td className="px-4 py-2"><BookingStatusBadge status={b.status} /></td>
              <td className="px-4 py-2">{formatMoney(b.totalCents, b.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DriversTable() {
  const { data, mutate } = useSWR("/drivers/admin/all", () => api.get<any[]>("/drivers/admin/all"));

  async function setApproval(id: string, status: DriverApprovalStatus) {
    await api.patch(`/drivers/${id}/approval`, { status });
    mutate();
  }

  return (
    <div className="space-y-3">
      {data?.map((d) => (
        <Card key={d.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-ink-900 dark:text-white">{d.user.firstName} {d.user.lastName}</p>
              <p className="text-sm text-slate-500">{d.user.email} · {d.fleet?.name ?? "Unaffiliated"} · Rating {d.rating.toFixed(1)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{d.approvalStatus}</span>
              {d.approvalStatus !== DriverApprovalStatus.APPROVED && (
                <Button size="sm" onClick={() => setApproval(d.id, DriverApprovalStatus.APPROVED)}>
                  Approve
                </Button>
              )}
              {d.approvalStatus !== DriverApprovalStatus.SUSPENDED && (
                <Button size="sm" variant="danger" onClick={() => setApproval(d.id, DriverApprovalStatus.SUSPENDED)}>
                  Suspend
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function FleetsTable() {
  const { data, mutate } = useSWR("/fleets", () => api.get<any[]>("/fleets"));

  async function setStatus(id: string, status: FleetStatus) {
    await api.patch(`/fleets/${id}/status`, { status });
    mutate();
  }

  return (
    <div className="space-y-3">
      {data?.map((f) => (
        <Card key={f.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-ink-900 dark:text-white">{f.name}</p>
              <p className="text-sm text-slate-500">
                {f.contactEmail} · {f._count?.vehicles ?? 0} vehicles · {f._count?.drivers ?? 0} drivers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{f.status}</span>
              {f.status !== FleetStatus.ACTIVE && (
                <Button size="sm" onClick={() => setStatus(f.id, FleetStatus.ACTIVE)}>
                  Approve
                </Button>
              )}
              {f.status !== FleetStatus.SUSPENDED && (
                <Button size="sm" variant="danger" onClick={() => setStatus(f.id, FleetStatus.SUSPENDED)}>
                  Suspend
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function PricingRules() {
  const { data, mutate } = useSWR("/admin/pricing-rules", () => api.get<any[]>("/admin/pricing-rules"));
  const [form, setForm] = useState({
    vehicleCategory: VehicleCategory.ECONOMY,
    baseFareCents: 800,
    perKmCents: 150,
    perMinuteCents: 25,
    minimumFareCents: 1500,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/pricing-rules", form);
      mutate();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Unable to save pricing rule");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink-900 dark:text-white">Global default pricing</h3>
          <form onSubmit={submit} className="mt-3 grid grid-cols-2 gap-3">
            <Select label="Category" value={form.vehicleCategory} onChange={(e) => setForm({ ...form, vehicleCategory: e.target.value as VehicleCategory })}>
              {Object.values(VehicleCategory).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input label="Base fare (cents)" type="number" value={form.baseFareCents} onChange={(e) => setForm({ ...form, baseFareCents: Number(e.target.value) })} />
            <Input label="Per km (cents)" type="number" value={form.perKmCents} onChange={(e) => setForm({ ...form, perKmCents: Number(e.target.value) })} />
            <Input label="Per minute (cents)" type="number" value={form.perMinuteCents} onChange={(e) => setForm({ ...form, perMinuteCents: Number(e.target.value) })} />
            <Input label="Minimum fare (cents)" type="number" value={form.minimumFareCents} onChange={(e) => setForm({ ...form, minimumFareCents: Number(e.target.value) })} />
            <Button type="submit" className="col-span-2">
              Save rule
            </Button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink-900 dark:text-white">Active rules</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data?.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span>{r.vehicleCategory} {r.city ? `(${r.city})` : "(global)"}</span>
                <span className="text-slate-500">
                  base {r.baseFareCents}¢ · /km {r.perKmCents}¢ · /min {r.perMinuteCents}¢
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function Commissions() {
  const t = useTranslations("admin");
  const { data } = useSWR("/admin/commissions", () => api.get<any>("/admin/commissions"));
  if (!data) return null;
  return (
    <div>
      <Stat label={t("commissions")} value={formatMoney(data.totalCommissionCents, "EUR" as any)} />
      <div className="mt-4 space-y-2">
        {data.byFleet.map((f: any) => (
          <Card key={f.fleetName}>
            <CardBody className="flex justify-between">
              <span className="font-medium">{f.fleetName}</span>
              <span className="text-slate-500">
                {f.rides} rides · commission {formatMoney(f.commissionCents, "EUR" as any)}
              </span>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CorporateAccounts() {
  const { data, mutate } = useSWR("/corporate/accounts", () => api.get<any[]>("/corporate/accounts"));
  const [form, setForm] = useState({ companyName: "", billingEmail: "", adminEmail: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/corporate/accounts", form);
      mutate();
      setForm({ companyName: "", billingEmail: "", adminEmail: "" });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Unable to create account");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink-900 dark:text-white">New corporate account</h3>
          <form onSubmit={submit} className="mt-3 space-y-3">
            <Input label="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
            <Input label="Billing email" type="email" value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} required />
            <Input label="Admin email" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
            <Button type="submit">Create</Button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink-900 dark:text-white">Accounts</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data?.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span>{a.companyName}</span>
                <span className="text-slate-500">{a._count?.employees ?? 0} employees · {a._count?.bookings ?? 0} bookings</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
