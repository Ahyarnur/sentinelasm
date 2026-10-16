"use client";

import { AppShell } from "@/components";
import { useRequireAuth } from "@/lib/hooks";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useRequireAuth();

  if (!ready) {
    return (
      <div className="shell page-body">
        <p className="cell-muted">Memeriksa sesi…</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
