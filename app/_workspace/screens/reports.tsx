"use client";
import { LABELS, type TableName } from "../../../lib/tables";
import type { CatalogManifest } from "../../../lib/catalog";
import { money } from "../format";
import type { Row } from "../types";
import { DataTable } from "./records";
import { Donut, Metric } from "./home";

export function ReportsScreen({
  catalog,
  month,
  setMonth,
  rows,
  categories,
  spent,
  income,
}: {
  catalog: CatalogManifest;
  month: string;
  setMonth: (v: string) => void;
  rows: Record<TableName, Row[]>;
  categories: { name: string; colour: string; total: number }[];
  spent: number;
  income: number;
}) {
  const commitments = rows.commitments ?? [];
  const budgetRecords = (rows.settings ?? []).filter((row) =>
    ["monthlyBudgetSen", "budgetFromPayday", "paydayDay"].includes(
      String(row.key),
    ),
  );
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">INSIGHTS & TRENDS</div>
          <h1>Analytics</h1>
          <div className="subtitle">
            Explore the detail behind your income, spending, budgets and
            commitments.
          </div>
        </div>
        <label className="date-control">
          Period{" "}
          <input
            aria-label="Report month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            style={{ border: 0, outline: 0, width: 125 }}
          />
        </label>
      </div>
      <div className="grid metric-grid">
        <Metric
          label="Income"
          value={money(income)}
          note="Selected month"
          tone="positive"
        />
        <Metric
          label="Expenses"
          value={money(spent)}
          note="Selected month"
          tone="negative"
        />
        <Metric
          label="Net cash flow"
          value={money(income - spent)}
          note="Income less expenses"
        />
        <Metric
          label="Tracked commitments"
          value={String(commitments.length)}
          note={`${commitments.filter((row) => !row.ended_at).length} currently active`}
        />
      </div>
      <div className="grid main-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Category breakdown</div>
              <div className="card-description">
                Expenses for{" "}
                {new Date(`${month}-01`).toLocaleDateString("en-MY", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <Donut categories={categories} total={spent} />
        </section>
        <section className="card">
          <div className="card-title">Budget settings</div>
          <div className="card-description" style={{ marginBottom: 17 }}>
            Your personal limits and payday configuration.
          </div>
          {budgetRecords.length ? (
            budgetRecords.map((row) => (
              <div className="setting-row" key={String(row.key)}>
                <div>
                  <strong>{LABELS[String(row.key)] ?? String(row.key)}</strong>
                  <span>{String(row.value)}</span>
                </div>
                <span className="pill">Synced</span>
              </div>
            ))
          ) : (
            <div className="empty">No budget settings are synced yet.</div>
          )}
          <div className="banner" style={{ marginTop: 15 }}>
            Set a category limit in Categories or your monthly limit in
            Preferences.
          </div>
        </section>
      </div>
      <section className="card table-card">
        <div className="card-head">
          <div>
            <div className="card-title">Commitment schedule</div>
            <div className="card-description">
              Recurring bills, loans and subscriptions
            </div>
          </div>
        </div>
        <DataTable table="commitments" rows={commitments} allRows={rows} catalog={catalog} />
      </section>
    </>
  );
}
