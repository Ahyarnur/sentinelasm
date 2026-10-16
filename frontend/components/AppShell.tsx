"use client";

import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { API_URL, clearToken, getIdentity } from "@/lib/api";
import { Button } from "./Button";

const NAV = [
  { href: "/", label: "Ikhtisar" },
  { href: "/targets", label: "Target" },
  { href: "/assets", label: "Aset" },
  { href: "/findings", label: "Temuan" },
  { href: "/scans", label: "Scan" },
  { href: "/reports", label: "Laporan" },
  { href: "/settings", label: "Pengaturan" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [identity, setIdentity] = useState<string | null>(null);

  useEffect(() => {
    setIdentity(getIdentity());
  }, []);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <div className="shell">
        <header className="float-nav">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">
              <strong>SentinelASM</strong>
              <span>Attack Surface Management</span>
            </span>
          </Link>

          <nav className="nav-tabs" aria-label="Navigasi utama">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="nav-end">
            {identity ? (
              <span className="user-chip" title={identity}>
                <b aria-hidden="true">{identity.slice(0, 1).toUpperCase()}</b>
                <span>{identity}</span>
              </span>
            ) : null}
            <Button
              variant="soft"
              size="sm"
              onClick={logout}
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut size={13} aria-hidden="true" />
              <span className="btn-label">Keluar</span>
            </Button>
          </div>
        </header>
      </div>

      <main className="shell page-body">{children}</main>

      <footer className="shell site-foot">
        <span>SentinelASM · Platform Attack Surface Management</span>
        <nav>
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
            Dokumentasi API
            <ExternalLink size={11} aria-hidden="true" className="ml-1 inline align-[-1px]" />
          </a>
          <a href={`${API_URL}/health`} target="_blank" rel="noreferrer">
            Status API
            <ExternalLink size={11} aria-hidden="true" className="ml-1 inline align-[-1px]" />
          </a>
        </nav>
      </footer>
    </div>
  );
}
