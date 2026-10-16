"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Asset, AssetDetail } from "@/lib/types";

type DetailState = AssetDetail | "loading" | "error";

export function AssetTable({
  assets,
  targetNames,
}: {
  assets: Asset[];
  targetNames: Record<number, string>;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, DetailState>>({});

  async function toggle(asset: Asset) {
    if (openId === asset.id) {
      setOpenId(null);
      return;
    }
    setOpenId(asset.id);
    if (details[asset.id]) return;
    setDetails((prev) => ({ ...prev, [asset.id]: "loading" }));
    try {
      const detail = await api.asset(asset.id);
      setDetails((prev) => ({ ...prev, [asset.id]: detail }));
    } catch {
      setDetails((prev) => ({ ...prev, [asset.id]: "error" }));
    }
  }

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Host</th>
            <th>IP</th>
            <th>Target</th>
            <th>Ditemukan</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const open = openId === asset.id;
            const detail = details[asset.id];
            return (
              <Fragment key={asset.id}>
                <tr>
                  <td>
                    <button
                      type="button"
                      className="row-toggle"
                      onClick={() => void toggle(asset)}
                      aria-expanded={open}
                    >
                      {open ? (
                        <ChevronDown size={13} aria-hidden="true" />
                      ) : (
                        <ChevronRight size={13} aria-hidden="true" />
                      )}
                      <span className="cell-title">{asset.host}</span>
                    </button>
                  </td>
                  <td className="cell-muted">{asset.ip ?? "—"}</td>
                  <td className="cell-muted">
                    {targetNames[asset.target_id] ? (
                      <Link className="cell-link" href={`/targets/${asset.target_id}`}>
                        {targetNames[asset.target_id]}
                      </Link>
                    ) : (
                      `#${asset.target_id}`
                    )}
                  </td>
                  <td className="cell-muted whitespace-nowrap">
                    {formatDateTime(asset.created_at)}
                  </td>
                </tr>
                {open ? (
                  <tr className="row-detail">
                    <td colSpan={4}>
                      {detail === "loading" ? (
                        <p className="cell-muted">Memuat layanan…</p>
                      ) : detail === "error" ? (
                        <p className="cell-muted">Gagal memuat detail aset.</p>
                      ) : detail && detail.services.length > 0 ? (
                        <table className="tbl tbl-nested">
                          <thead>
                            <tr>
                              <th>Port</th>
                              <th>Layanan</th>
                              <th>Versi</th>
                              <th>Teknologi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.services.map((service) => (
                              <tr key={service.id}>
                                <td className="num">
                                  {service.port}/{service.protocol}
                                </td>
                                <td>{service.name ?? "—"}</td>
                                <td className="cell-muted">{service.version ?? "—"}</td>
                                <td className="cell-muted">
                                  {Array.isArray(service.technologies) &&
                                  service.technologies.length > 0
                                    ? service.technologies.join(", ")
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="cell-muted">Belum ada layanan terdeteksi untuk host ini.</p>
                      )}
                      <p className="row-detail-links">
                        <Link className="cell-link" href={`/findings?asset_id=${asset.id}`}>
                          Lihat temuan aset ini
                        </Link>
                      </p>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {assets.length === 0 && (
            <tr>
              <td colSpan={4} className="empty">
                Belum ada aset. Jalankan scan pada sebuah target.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
