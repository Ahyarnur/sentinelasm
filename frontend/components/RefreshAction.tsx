"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";

/** Tombol perbarui manual dengan status sibuk, dipakai di kepala tiap halaman. */
export function RefreshAction({
  onRefresh,
}: {
  onRefresh: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void run()}
      disabled={busy}
      aria-label="Perbarui data"
      title="Perbarui data"
    >
      <RefreshCw size={13} aria-hidden="true" />
      <span className="btn-label">{busy ? "Memperbarui…" : "Perbarui"}</span>
    </Button>
  );
}
