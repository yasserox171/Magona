"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthenticatedUser, AuthTokens } from "@magona/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (tokens: AuthTokens, user: AuthenticatedUser) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthenticatedUser) => void;
  logout: () => void;
  refresh: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (tokens, user) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user }),
      setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const res = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (!res.ok) {
            set({ user: null, accessToken: null, refreshToken: null });
            return false;
          }
          const tokens: AuthTokens = await res.json();
          set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: "magona-auth" },
  ),
);
