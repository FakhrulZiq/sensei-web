import type { Row } from "./types";

export const money = (sen: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format((sen || 0) / 100);
export const dateLabel = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export const amount = (value: unknown) => Number(value ?? 0) || 0;
export const pad = (value: number) => String(value).padStart(2, "0");
export const nowIso = () => {
  const value = new Date();
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
};
export const localMonth = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}`;
export const monthNow = () => localMonth(new Date());
export const id = () => crypto.randomUUID();
export const csvCell = (value: unknown) => {
  const raw = value == null ? "" : String(value);
  const text = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
};
export function downloadCsv(filename: string, records: Row[]) {
  const columns = [...new Set(records.flatMap((row) => Object.keys(row).filter((key) => !key.startsWith("__"))))];
  const content = [columns.map(csvCell).join(","), ...records.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
