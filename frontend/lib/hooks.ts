"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, clearToken, getToken, setUnauthorizedHandler } from "./api";

/**
 * Pastikan pengguna punya token sebelum halaman dirender.
 *
 * Kalau token ditolak server (401), token dibuang dan pengguna diarahkan ke
 * /login dengan penanda agar layar masuk bisa menjelaskan sebabnya.
 */
export function useRequireAuth(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUnauthorizedHandler(() => {
      clearToken();
      router.replace("/login?expired=1");
    });
    setReady(true);
    return () => setUnauthorizedHandler(null);
  }, [router]);

  return ready;
}

/** Jam internal untuk timer berjalan (elapsed) dan durasi langsung. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

/**
 * Muat data dari API, dengan polling opsional.
 *
 * `key` menggantikan daftar dependensi: ubah nilainya (mis. gabungan filter)
 * setiap kali loader perlu dijalankan ulang dengan parameter berbeda.
 */
export function useResource<T>(
  loader: () => Promise<T>,
  options: {
    /** Interval polling, atau fungsi yang menurunkannya dari data terakhir. */
    pollMs?: number | ((data: T | null) => number);
    key?: string;
  } = {},
) {
  const { pollMs, key = "" } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async (): Promise<void> => {
    try {
      const next = await loaderRef.current();
      setData(next);
      setError(null);
      setFetchedAt(Date.now());
    } catch (e) {
      // 401 sudah ditangani handler sesi (redirect ke /login).
      if (!(e instanceof ApiError && e.status === 401)) {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, key]);

  const interval = typeof pollMs === "function" ? pollMs(data) : pollMs;

  useEffect(() => {
    if (!interval) return;
    const id = setInterval(() => void reload(), interval);
    return () => clearInterval(id);
  }, [reload, interval]);

  return { data, error, loading, reload, setError, fetchedAt };
}

/** Ganti judul dokumen per halaman. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · SentinelASM`;
  }, [title]);
}
