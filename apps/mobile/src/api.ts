import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthTokens } from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000/api/v1";

const TOKENS_KEY = "magona.tokens";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function storeTokens(tokens: AuthTokens | null) {
  if (tokens) {
    await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } else {
    await AsyncStorage.removeItem(TOKENS_KEY);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  let tokens = auth ? await getStoredTokens() : null;

  const doFetch = (accessToken: string | null) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch(tokens?.accessToken ?? null);

  if (res.status === 401 && auth && tokens?.refreshToken) {
    const refreshed = await refresh(tokens.refreshToken);
    if (refreshed) {
      tokens = refreshed;
      res = await doFetch(refreshed.accessToken);
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = Array.isArray(data.message) ? data.message.join(", ") : (data.message ?? message);
    } catch {
      // ignore body parse errors
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function refresh(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await storeTokens(null);
      return null;
    }
    const tokens: AuthTokens = await res.json();
    await storeTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
};

export { API_URL };
