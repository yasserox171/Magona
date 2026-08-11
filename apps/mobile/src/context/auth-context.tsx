import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, getStoredTokens, storeTokens } from "../api";
import { AuthTokens, AuthenticatedUser } from "../types";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const tokens = await getStoredTokens();
    if (!tokens) {
      setUser(null);
      return;
    }
    try {
      const me = await api.get<AuthenticatedUser>("/auth/me");
      setUser(me);
    } catch {
      await storeTokens(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const signIn = async (tokens: AuthTokens) => {
    await storeTokens(tokens);
    await refreshUser();
  };

  const signOut = async () => {
    await storeTokens(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: Boolean(user), signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
