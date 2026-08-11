"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api-client";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackHandler />
    </Suspense>
  );
}

function AuthCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    if (!accessToken || !refreshToken) {
      router.replace("/login");
      return;
    }
    setTokens({ accessToken, refreshToken, expiresIn: 15 * 60 });
    api.get("/auth/me").then((me) => {
      setUser(me as any);
      router.replace("/");
    });
  }, [searchParams, router, setTokens, setUser]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-slate-500">Signing you in…</p>
    </div>
  );
}
