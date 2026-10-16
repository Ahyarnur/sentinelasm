"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthForm } from "@/components";
import { api, getToken } from "@/lib/api";
import { useTitle } from "@/lib/hooks";

const EXPIRED_MESSAGE = "Sesi Anda berakhir. Silakan masuk kembali.";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useTitle("Masuk");

  useEffect(() => {
    // Dibaca dari window (bukan useSearchParams) agar halaman tetap statis.
    if (window.location.search.includes("expired=1")) {
      setError(EXPIRED_MESSAGE);
    }
    if (getToken()) router.replace("/");
  }, [router]);

  async function handleAuth(email: string, password: string) {
    try {
      await api.login(email, password);
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return <AuthForm onSubmit={handleAuth} error={error} />;
}
