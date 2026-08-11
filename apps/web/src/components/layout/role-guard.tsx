"use client";

import { ReactNode, useEffect } from "react";
import { UserRole } from "@magona/shared";
import { useSession } from "@/hooks/use-session";
import { useRouter } from "@/i18n/navigation";

interface RoleGuardProps {
  roles: UserRole[];
  children: ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && !roles.includes(user.role)) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, user, roles, router]);

  if (!user || !roles.includes(user.role)) {
    return <div className="px-4 py-16 text-center text-sm text-slate-500">…</div>;
  }

  return <>{children}</>;
}
