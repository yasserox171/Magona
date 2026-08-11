"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { UserRole, VehicleCategory } from "@magona/shared";
import { api, ApiError } from "@/lib/api-client";
import { RoleGuard } from "@/components/layout/role-guard";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function FleetPortalPage() {
  return (
    <RoleGuard roles={[UserRole.FLEET_ADMIN]}>
      <FleetPortalContent />
    </RoleGuard>
  );
}

function FleetPortalContent() {
  const t = useTranslations("fleet");
  const [tab, setTab] = useState<"vehicles" | "drivers" | "unassigned">("unassigned");
  const { data: fleet } = useSWR("/fleets/me", () => api.get<any>("/fleets/me"));
  const { data: performance } = useSWR("/fleets/me/performance", () => api.get<any>("/fleets/me/performance"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t("title")}</h1>
      {fleet && <p className="mt-1 text-sm text-slate-500">{fleet.name} · {fleet.status}</p>}

      {performance && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Vehicles" value={performance.vehicleCount} />
          <Stat label="Drivers" value={performance.driverCount} />
          <Stat label="Completed rides" value={performance.completedBookings} />
          <Stat label="Avg. rating" value={performance.averageDriverRating?.toFixed(1) ?? "—"} />
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {(["unassigned", "vehicles", "drivers"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === tb ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500"
            }`}
          >
            {tb === "unassigned" ? t("unassignedBookings") : tb === "vehicles" ? t("vehicles") : t("drivers")}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "unassigned" && <UnassignedBookings />}
        {tab === "vehicles" && <VehiclesPanel />}
        {tab === "drivers" && <DriversPanel />}
      </div>
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

function UnassignedBookings() {
  const t = useTranslations("fleet");
  const { data: bookings, mutate } = useSWR("/bookings/fleet/unassigned", () => api.get<any[]>("/bookings/fleet/unassigned"));
  const { data: drivers } = useSWR("/drivers/mine", () => api.get<any[]>("/drivers/mine"));
  const { data: vehicles } = useSWR("/vehicles/mine", () => api.get<any[]>("/vehicles/mine"));
  const [selection, setSelection] = useState<Record<string, { driverId?: string; vehicleId?: string }>>({});

  async function assign(bookingId: string) {
    const sel = selection[bookingId];
    if (!sel?.driverId || !sel?.vehicleId) return;
    try {
      await api.post(`/bookings/${bookingId}/assign`, sel);
      mutate();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Unable to assign");
    }
  }

  return (
    <div className="space-y-3">
      {bookings?.length === 0 && <p className="text-sm text-slate-500">No unassigned bookings right now.</p>}
      {bookings?.map((b) => (
        <Card key={b.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-ink-900 dark:text-white">
                {b.pickupLabel} → {b.dropoffLabel}
              </p>
              <p className="text-sm text-slate-500">{new Date(b.pickupDateTime).toLocaleString()} · {b.vehicleCategory}</p>
            </div>
            <div className="flex items-center gap-2">
              <Select onChange={(e) => setSelection((s) => ({ ...s, [b.id]: { ...s[b.id], driverId: e.target.value } }))} defaultValue="">
                <option value="" disabled>
                  Driver
                </option>
                {drivers?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.firstName} {d.user.lastName}
                  </option>
                ))}
              </Select>
              <Select onChange={(e) => setSelection((s) => ({ ...s, [b.id]: { ...s[b.id], vehicleId: e.target.value } }))} defaultValue="">
                <option value="" disabled>
                  Vehicle
                </option>
                {vehicles?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.licensePlate})
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={() => assign(b.id)}>
                {t("assign")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function VehiclesPanel() {
  const t = useTranslations("fleet");
  const { data: vehicles, mutate } = useSWR("/vehicles/mine", () => api.get<any[]>("/vehicles/mine"));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: VehicleCategory.ECONOMY, make: "", model: "", year: 2023, color: "", licensePlate: "", capacity: 4, luggageCapacity: 3 });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/vehicles", form);
      setShowForm(false);
      mutate();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Unable to add vehicle");
    }
  }

  return (
    <div>
      <Button size="sm" onClick={() => setShowForm((s) => !s)}>
        {t("addVehicle")}
      </Button>
      {showForm && (
        <Card className="mt-3">
          <CardBody>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as VehicleCategory })}>
                {Object.values(VehicleCategory).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input label="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
              <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
              <Input label="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
              <Input label="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} required />
              <Input label="License plate" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} required />
              <Input label="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
              <Input label="Luggage capacity" type="number" value={form.luggageCapacity} onChange={(e) => setForm({ ...form, luggageCapacity: Number(e.target.value) })} />
              <Button type="submit" className="sm:col-span-2">
                Save
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
      <div className="mt-4 space-y-3">
        {vehicles?.map((v) => (
          <Card key={v.id}>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-900 dark:text-white">
                  {v.color} {v.make} {v.model} ({v.year})
                </p>
                <p className="text-sm text-slate-500">{v.licensePlate} · {v.category}</p>
              </div>
              <span className="text-xs text-slate-500">{v.status}</span>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DriversPanel() {
  const t = useTranslations("fleet");
  const { data: drivers, mutate } = useSWR("/drivers/mine", () => api.get<any[]>("/drivers/mine"));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", phone: "", licenseNumber: "", licenseExpiry: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/drivers", form);
      setShowForm(false);
      mutate();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Unable to add driver");
    }
  }

  return (
    <div>
      <Button size="sm" onClick={() => setShowForm((s) => !s)}>
        {t("addDriver")}
      </Button>
      {showForm && (
        <Card className="mt-3">
          <CardBody>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Input label="License number" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} required />
              <Input label="License expiry" type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} required />
              <Button type="submit" className="sm:col-span-2">
                Save
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
      <div className="mt-4 space-y-3">
        {drivers?.map((d) => (
          <Card key={d.id}>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-900 dark:text-white">
                  {d.user.firstName} {d.user.lastName}
                </p>
                <p className="text-sm text-slate-500">{d.user.email} · Rating {d.rating.toFixed(1)}</p>
              </div>
              <span className="text-xs text-slate-500">{d.approvalStatus}</span>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
