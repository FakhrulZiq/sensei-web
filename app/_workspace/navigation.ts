import type { IconName } from "../ui-icon";
import { TABLES } from "../../lib/tables";
import type { Screen } from "./types";

export const groups: {
  title: string;
  items: { id: Screen; label: string; symbol: IconName }[];
}[] = [
  {
    title: "OVERVIEW",
    items: [
      { id: "summary", label: "Dashboard", symbol: "home" },
      { id: "transactions", label: "Transactions", symbol: "transactions" },
      { id: "accounts", label: "Wallets", symbol: "accounts" },
      { id: "reports", label: "Analytics", symbol: "reports" },
      { id: "budgets", label: "Budgets", symbol: "budgets" },
    ],
  },
  {
    title: "ORGANISE",
    items: [
      { id: "categories", label: "Categories", symbol: "categories" },
      { id: "merchants", label: "Merchants", symbol: "merchants" },
      { id: "commitments", label: "Commitments", symbol: "commitments" },
      { id: "pots", label: "Goals & savings", symbol: "pots" },
      { id: "weekly-recap", label: "Weekly recap", symbol: "weekly" },
    ],
  },
  {
    title: "RECORDS & SETTINGS",
    items: [
      { id: "tax", label: "Tax organiser", symbol: "tax" },
      { id: "will", label: "Will organiser", symbol: "will" },
      { id: "receipts", label: "Receipts", symbol: "receipts" },
      { id: "commitment_payments", label: "Scheduled payments", symbol: "payments" },
      { id: "pot_updates", label: "Pot history", symbol: "history" },
      { id: "merchant_printed_names", label: "Merchant aliases", symbol: "aliases" },
      { id: "notifications", label: "Notifications", symbol: "notifications" },
      { id: "preferences", label: "Settings", symbol: "preferences" },
      { id: "profile", label: "Profile", symbol: "profile" },
      { id: "devices", label: "Linked browsers", symbol: "devices" },
    ],
  },
];

export const screenIds = [...new Set<Screen>([...groups.flatMap((group) => group.items.map((item) => item.id)), ...TABLES, "ai-budget", "plans"])];

export function isScreen(value: string): value is Screen {
  return screenIds.some((screen) => screen === value);
}

