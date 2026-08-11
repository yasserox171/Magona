"use client";

import useSWR from "swr";
import { useEffect } from "react";
import { AuthenticatedUser } from "@magona/shared";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

export function useSession() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const storedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data, isLoading } = useSWR(accessToken ? "/auth/me" : null, () => api.get<AuthenticatedUser>("/auth/me"));

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  return {
    user: data ?? storedUser,
    isLoading: Boolean(accessToken) && isLoading,
    isAuthenticated: Boolean(accessToken),
  };
}
