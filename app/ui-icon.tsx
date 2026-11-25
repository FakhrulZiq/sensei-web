import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "home" | "transactions" | "accounts" | "reports" | "budgets"
  | "categories" | "merchants" | "commitments" | "pots" | "notifications"
  | "weekly" | "ai" | "tax" | "will" | "receipts" | "payments"
  | "history" | "aliases" | "preferences" | "profile" | "devices" | "plans"
  | "refresh" | "logout" | "sun" | "moon" | "eye" | "eye-off"
  | "arrow-up-right" | "edit" | "trash" | "close" | "plus";

export function UiIcon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let shape: ReactNode;
  switch (name) {
    case "home": shape = <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></>; break;
    case "transactions": shape = <><path d="M4 7h16M16 3l4 4-4 4M20 17H4m4-4-4 4 4 4"/></>; break;
    case "accounts": shape = <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M7 6V4h10v2"/></>; break;
    case "reports": shape = <><path d="M4 20V4m0 16h16"/><path d="m7 15 4-4 3 2 5-7"/></>; break;
    case "budgets": shape = <><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 6"/></>; break;
    case "categories": shape = <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>; break;
    case "merchants": shape = <><path d="M3 10h18l-2-6H5zM5 10v11h14V10M9 21v-7h6v7"/></>; break;
    case "commitments": shape = <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h4"/></>; break;
    case "pots": shape = <><path d="M4 9h16l-2 12H6zM8 9V5h8v4M7 5h10"/><path d="M12 13v4"/></>; break;
    case "notifications": shape = <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>; break;
    case "weekly": shape = <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-12 4h6m-6 4h3"/></>; break;
    case "ai": shape = <><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9zM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z"/></>; break;
    case "tax": shape = <><path d="M6 2h9l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM15 2v5h4M8 12h8m-8 4h8"/></>; break;
    case "will": shape = <><path d="M4 20h16M7 17l10-10 3 3-10 10H7zM15 9l3 3"/></>; break;
    case "receipts": shape = <><path d="M5 2h14v20l-3-2-4 2-4-2-3 2zM9 7h6M9 11h6M9 15h4"/></>; break;
    case "payments": shape = <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20m-16 5h4"/></>; break;
    case "history": shape = <><path d="M3 12a9 9 0 1 0 3-7M3 4v5h5M12 7v5l3 2"/></>; break;
    case "aliases": shape = <><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-4 2-6 6-6s6 2 6 6m0-6c5 0 8 2 8 6"/></>; break;
    case "preferences": shape = <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>; break;
    case "profile": shape = <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>; break;
    case "devices": shape = <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>; break;
    case "plans": shape = <><path d="m12 2 9 8-9 12L3 10zM3 10h18M8 2l-2 8m10-8 2 8"/></>; break;
    case "refresh": shape = <><path d="M20 11a8 8 0 0 0-14-5L3 9m0-5v5h5M4 13a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/></>; break;
    case "logout": shape = <><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m6-4 4-4-4-4m4 4H9"/></>; break;
    case "sun": shape = <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/></>; break;
    case "moon": shape = <path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5z"/>; break;
    case "eye": shape = <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>; break;
    case "eye-off": shape = <><path d="m3 3 18 18M10 6.2A12 12 0 0 1 12 6c6 0 10 6 10 6a14 14 0 0 1-3.1 3.4M6.2 6.2C3.5 8 2 12 2 12s4 6 10 6c1.3 0 2.6-.3 3.7-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>; break;
    case "arrow-up-right": shape = <><path d="M5 19 19 5M8 5h11v11"/></>; break;
    case "edit": shape = <><path d="M4 20h4l11-11-4-4L4 16zM13 7l4 4"/></>; break;
    case "trash": shape = <><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></>; break;
    case "close": shape = <path d="M5 5 19 19M19 5 5 19"/>; break;
    case "plus": shape = <path d="M12 4v16M4 12h16"/>; break;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common} {...props}>{shape}</svg>;
}
