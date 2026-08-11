"use client";

import { useTranslations } from "next-intl";
import { UserRole } from "@magona/shared";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/hooks/use-session";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { CurrencySwitcher } from "./currency-switcher";

const PORTAL_LINK: Partial<Record<UserRole, { href: string; labelKey: string }>> = {
  [UserRole.DRIVER]: { href: "/driver", labelKey: "driverPortal" },
  [UserRole.FLEET_ADMIN]: { href: "/fleet", labelKey: "fleetPortal" },
  [UserRole.CORPORATE_ADMIN]: { href: "/corporate", labelKey: "corporatePortal" },
  [UserRole.ADMIN]: { href: "/admin", labelKey: "adminPortal" },
};

export function SiteHeader() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const { user, isAuthenticated } = useSession();
  const logout = useAuthStore((s) => s.logout);

  const portalLink = user ? PORTAL_LINK[user.role] : undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-ink-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-ink-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">M</span>
          {tc("appName")}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
          <Link href="/" className="hover:text-brand-600">
            {t("bookRide")}
          </Link>
          {isAuthenticated && user?.role === UserRole.CUSTOMER && (
            <Link href="/dashboard/bookings" className="hover:text-brand-600">
              {t("myBookings")}
            </Link>
          )}
          {portalLink && (
            <Link href={portalLink.href} className="hover:text-brand-600">
              {t(portalLink.labelKey)}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <CurrencySwitcher />
          <LocaleSwitcher />
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href={user?.role === UserRole.CUSTOMER ? "/dashboard/profile" : "/"}
                className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:block"
              >
                {user?.firstName}
              </Link>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                {tc("signOut")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {tc("signIn")}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">{tc("signUp")}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
