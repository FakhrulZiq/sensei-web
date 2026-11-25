"use client";

import { useState, type CSSProperties } from "react";
import type { CatalogEntry } from "../lib/catalog";

export function EntityLogo({ entry, name, className = "" }: { entry: CatalogEntry | null; name: string; className?: string }) {
  const [failedUrl, setFailedUrl] = useState("");
  const url = entry?.logo?.url;
  const showImage = Boolean(url && failedUrl !== url);
  return <span className={`entity-logo ${className}`} aria-hidden="true" style={entry?.colour ? { "--logo-colour": entry.colour } as CSSProperties : undefined}>
    {showImage ? (
      // Catalog URLs may point to Firebase Storage or a local emulator.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" loading="lazy" onError={() => setFailedUrl(url ?? "")} />
    ) : <span>{(entry?.short || name || "?").trim().slice(0, 1).toUpperCase()}</span>}
  </span>;
}
