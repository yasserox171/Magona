"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { UserRole } from "@magona/shared";
import { RoleGuard } from "@/components/layout/role-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("dashboard");

  return (
    <RoleGuard roles={[UserRole.CUSTOMER]}>
      <DashboardShell
        title={t("upcoming")}
        tabs={[
          { href: "/dashboard/bookings", label: t("upcoming") + " / " + t("past") },
          { href: "/dashboard/profile", label: t("profile") },
        ]}
      >
        {children}
      </DashboardShell>
    </RoleGuard>
  );
}
