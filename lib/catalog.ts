import { publicApi } from "./api";

export type CatalogEntry = {
  id: string;
  name: string;
  short: string;
  aliases?: string[];
  colour: string;
  logo: { url: string; width: number; height: number } | null;
};

export type CatalogManifest = {
  banks: CatalogEntry[];
  brands: CatalogEntry[];
};

export const EMPTY_CATALOG: CatalogManifest = { banks: [], brands: [] };

export const loadCatalog = () => publicApi<CatalogManifest>("/catalog/manifest");

export function findCatalogEntry(catalog: CatalogManifest, kind: "bank" | "brand", id: unknown) {
  if (!id) return null;
  return (kind === "bank" ? catalog.banks : catalog.brands).find((entry) => entry.id === id) ?? null;
}

const normaliseName = (value: string) =>
  value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Resolve legacy merchants with no brand_id only when a catalog name matches exactly. */
export function findBrandForMerchant(catalog: CatalogManifest, brandId: unknown, ...names: unknown[]) {
  const linked = findCatalogEntry(catalog, "brand", brandId);
  if (linked) return linked;
  for (const name of names) {
    if (typeof name !== "string") continue;
    const wanted = normaliseName(name);
    if (!wanted) continue;
    const match = catalog.brands.find((entry) =>
      [entry.id, entry.name, entry.short, ...(entry.aliases ?? [])].some((candidate) => normaliseName(candidate) === wanted),
    );
    if (match) return match;
  }
  return null;
}
