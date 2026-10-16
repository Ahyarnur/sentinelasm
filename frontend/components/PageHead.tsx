import type { ReactNode } from "react";

import { formatClock } from "@/lib/format";

/** Kepala halaman: eyebrow + judul + lede di kiri, meta/aksi di kanan. */
export function PageHead({
  eyebrow,
  title,
  lede,
  meta,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="min-w-0">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {meta ? <div className="page-head-meta">{meta}</div> : null}
    </div>
  );
}

/** Waktu pengambilan data terakhir, dalam zona WIB. */
export function UpdatedAt({ at }: { at: number | null }) {
  return (
    <span>
      Diperbarui {at ? formatClock(new Date(at).toISOString()) : "—"} WIB
    </span>
  );
}
