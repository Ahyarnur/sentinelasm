import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Permukaan berjudul: kepala opsional (judul + meta + aksi) lalu isi. */
export function Panel({
  id,
  title,
  meta,
  action,
  flush = false,
  className,
  children,
}: {
  id?: string;
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("panel", flush && "panel-flush", className)}>
      {(title || action) && (
        <header className="panel-head">
          <div className="min-w-0">
            {title ? <h2 className="panel-title">{title}</h2> : null}
            {meta ? <p className="panel-meta">{meta}</p> : null}
          </div>
          {action ? (
            <div className="flex flex-wrap items-center gap-2">{action}</div>
          ) : null}
        </header>
      )}
      {children}
    </section>
  );
}
