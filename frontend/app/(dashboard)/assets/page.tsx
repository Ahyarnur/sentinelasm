"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { AssetTable, PageHead, Panel, RefreshAction, UpdatedAt } from "@/components";
import { api } from "@/lib/api";
import { useResource, useTitle } from "@/lib/hooks";
import type { Asset, Target } from "@/lib/types";
import { domainById } from "@/lib/ui";

type AssetsData = { assets: Asset[]; targets: Target[] };

export default function AssetsPage() {
  useTitle("Aset");

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  // Tunda permintaan supaya tidak menembak API pada tiap ketukan tombol.
  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  const { data, error, loading, reload, fetchedAt } = useResource<AssetsData>(
    async () => {
      const [assets, targets] = await Promise.all([
        api.assets(search ? { search } : {}),
        api.targets(),
      ]);
      return { assets, targets };
    },
    { key: search, pollMs: 30000 },
  );

  const assets = data?.assets ?? [];
  const targets = data?.targets ?? [];

  return (
    <>
      <PageHead
        eyebrow="Inventaris · host"
        title="Aset"
        lede="Host dan subdomain yang ditemukan dari seluruh target. Buka satu baris untuk melihat port, layanan, dan teknologi yang terdeteksi."
        meta={
          <>
            <UpdatedAt at={fetchedAt} />
            <RefreshAction onRefresh={reload} />
          </>
        }
      />

      {error ? <p className="alert">{error}</p> : null}

      <Panel
        title="Daftar aset"
        meta={`${assets.length} host${search ? ` cocok dengan “${search}”` : ""}`}
        flush
        action={
          <div className="field w-full sm:w-64">
            <label className="sr-only" htmlFor="asset-search">
              Cari host
            </label>
            <div className="input-search">
              <Search size={14} aria-hidden="true" />
              <input
                id="asset-search"
                className="input"
                placeholder="Cari host…"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        }
      >
        {loading && !data ? (
          <p className="empty">Memuat aset…</p>
        ) : (
          <AssetTable assets={assets} targetNames={domainById(targets)} />
        )}
      </Panel>
    </>
  );
}
