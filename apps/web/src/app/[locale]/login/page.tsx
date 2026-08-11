"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AuthTokens } from "@magona/shared";
import { api, ApiError, API_URL } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter, Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const tokens = await api.post<AuthTokens>("/auth/login", { email, password }, { auth: false });
      setTokens(tokens);
      const me = await api.get("/auth/me");
      setUser(me as any);
      router.push(searchParams.get("redirect") ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t("welcomeBack")}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("signInSubtitle")}</p>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={tc("email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label={tc("password")} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {tc("signIn")}
            </Button>
          </form>

          <div className="relative py-2 text-center text-xs text-slate-400">
            <span className="bg-white px-2 dark:bg-slate-900">{t("orContinueWith")}</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-slate-200 dark:border-slate-700" />
          </div>

          <a href={`${API_URL}/auth/google`}>
            <Button type="button" variant="outline" className="w-full">
              {t("continueWithGoogle")}
            </Button>
          </a>

          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-brand-600 hover:underline">
              {tc("signUp")}
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
