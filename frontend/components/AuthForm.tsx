"use client";

import { useState } from "react";

export function AuthForm({
  onSubmit,
  error,
  defaultEmail = "admin@example.com",
}: {
  onSubmit: (email: string, password: string) => void | Promise<void>;
  error?: string | null;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("sentinel123");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">SentinelASM</h1>
      <p className="text-slate-400">Platform Attack Surface Management</p>
      <input
        className="rounded border border-slate-700 bg-slate-900 p-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
      />
      <input
        className="rounded border border-slate-700 bg-slate-900 p-2"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
      />
      <button
        onClick={() => onSubmit(email, password)}
        className="rounded bg-indigo-600 p-2 font-medium hover:bg-indigo-500"
      >
        Masuk / Daftar
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
