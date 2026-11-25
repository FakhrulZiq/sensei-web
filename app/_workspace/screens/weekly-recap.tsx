"use client";
import type { CatalogManifest } from "../../../lib/catalog";
import type { TableName } from "../../../lib/tables";
import { amount, dateLabel, money } from "../format";
import type { Row } from "../types";
import { Metric } from "./home";
import { DataTable } from "./records";

export function WeeklyRecapScreen({ rows, catalog }: { rows: Record<TableName, Row[]>; catalog: CatalogManifest }) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const transactions = (rows.transactions ?? []).filter((row) => {
    const date = new Date(String(row.occurred_at ?? ""));
    return !Number.isNaN(date.getTime()) && date >= start && date <= today;
  });
  const expenses = transactions.filter((row) => row.type === "expense");
  const income = transactions.filter((row) => row.type === "income");
  const spent = expenses.reduce((sum, row) => sum + amount(row.amount_sen), 0);
  const received = income.reduce((sum, row) => sum + amount(row.amount_sen), 0);
  const categoryTotals = new Map<string, number>();
  for (const row of expenses) {
    const key = String(row.category_id ?? "none");
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + amount(row.amount_sen));
  }
  const top = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCategory = (rows.categories ?? []).find((row) => row.id === top?.[0]);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">YOUR LAST SEVEN DAYS</div>
          <h1>Weekly recap</h1>
          <div className="subtitle">{dateLabel(start.toISOString())} – {dateLabel(today.toISOString())}</div>
        </div>
      </div>
      <div className="grid metric-grid">
        <Metric label="Spent" value={money(spent)} note={`${expenses.length} expenses`} />
        <Metric label="Received" value={money(received)} note={`${income.length} income records`} />
        <Metric label="Net change" value={money(received - spent)} note="Income less spending" />
        <Metric label="Top category" value={topCategory ? String(topCategory.name) : "—"} note={top ? money(top[1]) : "No spending this week"} />
      </div>
      <section className="card table-card">
        <div className="card-head"><div><div className="card-title">This week’s transactions</div><div className="card-description">Created from your encrypted SenSei records.</div></div></div>
        <DataTable table="transactions" rows={[...transactions].sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)))} allRows={rows} catalog={catalog} />
      </section>
    </>
  );
}
