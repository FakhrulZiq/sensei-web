import type { TableName } from "../../lib/tables";

export type Row = Record<string, unknown>;
export type Screen =
  | "summary"
  | "reports"
  | "budgets"
  | "weekly-recap"
  | "ai-budget"
  | "plans"
  | "tax"
  | "will"
  | TableName
  | "profile"
  | "preferences"
  | "devices";
export type Session = { id: string; label: string; createdAt: string };
