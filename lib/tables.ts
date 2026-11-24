export const TABLES = [
  "settings",
  "accounts",
  "categories",
  "merchants",
  "merchant_printed_names",
  "transactions",
  "receipts",
  "commitments",
  "commitment_payments",
  "pots",
  "pot_updates",
  "notifications",
] as const;
export type TableName = (typeof TABLES)[number];

export const TABLE_LABELS: Record<TableName, string> = {
  settings: "Finance preferences",
  accounts: "Accounts",
  categories: "Categories",
  merchants: "Merchants",
  merchant_printed_names: "Printed merchant names",
  transactions: "Transactions",
  receipts: "Receipts",
  commitments: "Commitments",
  commitment_payments: "Commitment payments",
  pots: "Savings pots",
  pot_updates: "Pot updates",
  notifications: "Notifications",
};

export const LABELS: Record<string, string> = {
  account_id: "Account",
  to_account_id: "To account",
  linked_account_id: "Linked account",
  category_id: "Category",
  merchant_id: "Merchant",
  commitment_id: "Commitment",
  transaction_id: "Transaction",
  amount_sen: "Amount (sen)",
  opening_balance_sen: "Opening balance (sen)",
  current_balance_sen: "Current balance (sen)",
  allocated_sen: "Allocated (sen)",
  target_sen: "Target (sen)",
  occurred_at: "Date and time",
  due_date: "Due date",
  due_day: "Due day",
  created_at: "Created",
  updated_at: "Updated",
  paid_at: "Paid at",
  read_at: "Read at",
  note: "Note",
  display_name: "Display name",
  default_category_id: "Default category",
  sort_order: "Sort order",
  start_period: "Start period",
  monthlyBudgetSen: "Monthly budget (sen)",
  paydayDay: "Payday",
  salaryAmountSen: "Salary (sen)",
  budgetFromPayday: "Budget follows payday",
  hideBalances: "Hide balances",
  keepReceiptsInCloud: "Keep receipts in cloud",
  notifyLimitWarnings: "Limit warnings",
  notifyCommitments: "Commitment reminders",
};

export function keyOf(table: TableName, row: Record<string, unknown>): string {
  if (table === "settings") return String(row.key ?? "");
  if (table === "merchant_printed_names")
    return `${row.merchant_id ?? ""}|${row.normalised ?? ""}`;
  return String(row.id ?? "");
}
export function recordIdOf(table: TableName, key: string): string {
  if (table === "settings") return `s_${sha256Hex(key).slice(0, 32)}`;
  if (table === "merchant_printed_names") {
    const split = key.indexOf("|");
    return `${key.slice(0, split)}_${sha256Hex(key.slice(split + 1)).slice(0, 32)}`;
  }
  return key;
}
import { sha256Hex } from "sensei-crypto";
