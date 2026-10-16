"use client";

import { LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";

export function AuthForm({
  onSubmit,
  error,
  defaultEmail = "",
}: {
  onSubmit: (email: string, password: string) => void | Promise<void>;
  error?: string | null;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit(email, password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            <strong>SentinelASM</strong>
            <span>Platform Attack Surface Management</span>
          </span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="input"
              type="email"
              name="email"
              autoComplete="username"
              placeholder="admin@domain.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Kata sandi</label>
            <input
              id="auth-password"
              className="input"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? <p className="alert mb-0">{error}</p> : null}

          <Button type="submit" disabled={busy}>
            <LogIn size={15} aria-hidden="true" />
            {busy ? "Memproses…" : "Masuk"}
          </Button>
        </form>

        <p className="auth-note">
          <ShieldCheck size={13} aria-hidden="true" className="mr-1.5 inline align-[-2px]" />
          Akun dikelola administrator. Hubungi admin bila Anda memerlukan akses.
        </p>
      </div>
    </main>
  );
}
