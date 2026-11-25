"use client";

import { useMemo } from "react";
import { EntityLogo } from "../../entity-logo";
import { findCatalogEntry, type CatalogManifest } from "../../../lib/catalog";
import type { TableName } from "../../../lib/tables";
import { amount, money } from "../format";
import type { Row, Screen } from "../types";
import { TransactionTable } from "./transaction-table";

type CategoryTotal = { name: string; colour: string; total: number };
const chartColours = ["#872e70", "#ee4b65", "#ffb13d", "#d0df37", "#85bf47", "#2896e8", "#335dcc"];

export function SummaryScreen({
  catalog, month, setMonth, spent, income, categories, accounts, recent, chartData, rows, onNavigate,
}: {
  catalog: CatalogManifest;
  month: string;
  setMonth: (value: string) => void;
  spent: number;
  income: number;
  categories: CategoryTotal[];
  accounts: Row[];
  recent: Row[];
  chartData: { label: string; value: number }[];
  rows: Record<TableName, Row[]>;
  onNavigate: (value: Screen) => void;
}) {
  const balance = accounts.reduce((total, account) => total + amount(account.balance), 0);
  const budgetRecord = (rows.settings ?? []).find((row) => row.key === "monthlyBudgetSen");
  let budget = 0;
  try { budget = Number(JSON.parse(String(budgetRecord?.value ?? "0"))) || 0; } catch { budget = 0; }
  const budgetCategories = (rows.categories ?? []).filter((category) => amount(category.limit_sen) > 0).map((category) => ({
    name: String(category.name ?? "Category"),
    colour: String(category.colour ?? "#26b2ab"),
    limit: amount(category.limit_sen),
    used: (rows.transactions ?? []).filter((row) =>
      row.type === "expense" && row.category_id === category.id && String(row.occurred_at ?? "").slice(0, 7) === month,
    ).reduce((total, row) => total + amount(row.amount_sen), 0),
  }));
  const goals = (rows.pots ?? []).filter((pot) => !pot.archived_at && amount(pot.target_sen) > 0);
  const incomeCategories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of rows.transactions ?? []) {
      if (row.type !== "income" || String(row.occurred_at ?? "").slice(0, 7) !== month) continue;
      const category = (rows.categories ?? []).find((item) => item.id === row.category_id);
      const name = String(category?.name ?? "Other income");
      totals.set(name, (totals.get(name) ?? 0) + amount(row.amount_sen));
    }
    return [...totals].sort((a, b) => b[1] - a[1]);
  }, [rows, month]);
  return <>
    <div className="page-head dashboard-intro">
      <div><h1>Financial overview</h1><div className="subtitle">Your accounts and activity for the selected month</div></div>
      <label className="date-control"><input aria-label="Choose month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
    </div>
    <div className="dashboard-metrics">
      <DashboardMetric label="Total Balance" value={balance} detail={`${accounts.length} connected ${accounts.length === 1 ? "account" : "accounts"}`} />
      <DashboardMetric label="Monthly Income" value={income} detail="Income recorded this month" />
      <DashboardMetric label="Monthly Expenses" value={spent} detail={`${chartData.filter((day) => day.value > 0).length} days with spending`} />
    </div>
    <div className="dashboard-columns">
      <div className="dashboard-column">
        <section className="card dashboard-panel">
          <div className="card-head"><div className="card-title">Monthly expenses breakdown</div><button className="text-button" onClick={() => onNavigate("reports")}>View report</button></div>
          <Breakdown categories={categories} total={spent} />
        </section>
        <section className="card dashboard-panel">
          <div className="card-head"><div className="card-title">Savings goals</div><button className="text-button" onClick={() => onNavigate("pots")}>View all</button></div>
          {goals.length ? <div className="goal-grid">{goals.slice(0, 4).map((pot) => {
            const saved = amount(pot.current_balance_sen);
            const target = amount(pot.target_sen);
            const percent = Math.min(100, Math.max(0, Math.round(saved / target * 100)));
            return <div className="goal-item" key={String(pot.id)}>
              <div className="goal-ring" style={{ background: `conic-gradient(var(--accent) ${percent}%, var(--surface-muted) 0)` }}><span>{percent}%</span></div>
              <strong>{String(pot.name || "Savings pot")}</strong><small className="sensitive-value">{money(saved)} / {money(target)}</small>
            </div>;
          })}</div> : <div className="empty">No savings goals with a target yet.</div>}
        </section>
        <section className="card table-card dashboard-transactions">
          <div className="card-head"><div><div className="card-title">Recent transactions</div><div className="card-description">Latest account activity</div></div><button className="text-button" onClick={() => onNavigate("transactions")}>View all</button></div>
          <TransactionTable catalog={catalog} rows={recent.slice(0, 6)} accounts={rows.accounts ?? []} categories={rows.categories ?? []} merchants={rows.merchants ?? []} />
        </section>
      </div>
      <div className="dashboard-column">
        <section className="card dashboard-panel">
          <div className="card-head"><div className="card-title">Monthly budgets</div><button className="text-button" onClick={() => onNavigate("budgets")}>Manage</button></div>
          {budget > 0 && <BudgetLine name="Overall budget" used={spent} limit={budget} />}
          {budgetCategories.slice(0, 6).map((category) => <BudgetLine key={category.name} name={category.name} used={category.used} limit={category.limit} />)}
          {!budget && !budgetCategories.length && <div className="empty">Set a monthly or category budget to track your spending.</div>}
        </section>
        <section className="card dashboard-panel">
          <div className="card-head"><div className="card-title">Monthly income breakdown</div><button className="text-button" onClick={() => onNavigate("reports")}>View report</button></div>
          {incomeCategories.length ? <Breakdown categories={incomeCategories.map(([name, total], index) => ({ name, total, colour: index ? "#18b883" : "#008080" }))} total={income} /> : <div className="empty">No income recorded this month.</div>}
        </section>
        <section className="card dashboard-panel">
          <div className="card-head"><div className="card-title">Your accounts</div><button className="text-button" onClick={() => onNavigate("accounts")}>View all</button></div>
          {accounts.slice(0, 5).map((account) => <div className="account-row" key={String(account.id)}>
            <EntityLogo entry={findCatalogEntry(catalog, "bank", account.bank_id)} name={String(account.name || "Account")} />
            <div className="account-info"><strong>{String(account.name || "Account")}</strong><span>{String(account.type || "account")}{account.last4 ? ` ·· ${account.last4}` : ""}</span></div>
            <div className="account-balance">{money(amount(account.balance))}</div>
          </div>)}
          {!accounts.length && <div className="empty">No accounts added yet.</div>}
        </section>
        <section className="card dashboard-panel">
          <div className="card-head"><div className="card-title">Daily expenses</div><button className="text-button" onClick={() => onNavigate("reports")}>View report</button></div>
          <TrendChart values={chartData} />
        </section>
      </div>
    </div>
  </>;
}

function DashboardMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <section className="card dashboard-metric"><div className="metric-label">{label}</div><div className="dashboard-metric-value sensitive-value">{money(value)}</div><div className="metric-note">{detail}</div></section>;
}

function BudgetLine({ name, used, limit }: { name: string; used: number; limit: number }) {
  const percent = Math.min(100, Math.max(0, used / limit * 100));
  return <div className="dashboard-budget"><div className="dashboard-budget-head"><span>{name}</span><span className="sensitive-value"><strong>{money(used)}</strong> / {money(limit)}</span></div><div className="progress"><span style={{ width: `${percent}%`, background: percent >= 100 ? "var(--coral)" : "var(--accent)" }} /></div></div>;
}

function Breakdown({ categories, total }: { categories: CategoryTotal[]; total: number }) {
  return <div className="breakdown">
    <div className="breakdown-bar" aria-label="Share by category">{categories.map((item, index) => <span key={item.name} style={{ width: `${total ? item.total / total * 100 : 0}%`, background: item.colour || chartColours[index % chartColours.length] }} />)}</div>
    <div className="breakdown-list">{categories.slice(0, 7).map((item, index) => <div className="breakdown-row" key={item.name}><span className="breakdown-name"><i className="dot" style={{ background: item.colour || chartColours[index % chartColours.length] }} />{item.name}</span><span className="sensitive-value">{money(item.total)}</span><strong>{total ? Math.round(item.total / total * 100) : 0}%</strong></div>)}</div>
    {!categories.length && <div className="empty">No transactions in this period.</div>}
  </div>;
}

export function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return <div className="card"><div className="metric-label">{label}</div><div className={`metric-value ${tone ?? ""}`}>{value}</div><div className="metric-note">{note}</div></div>;
}

function TrendChart({ values }: { values: { label: string; value: number }[] }) {
  const max = Math.max(1, ...values.map((item) => item.value));
  return <div className="dashboard-chart" role="img" aria-label={`Daily expenses. Highest day ${money(max)}.`}>
    {values.map((item, index) => <div key={item.label} className="dashboard-chart-day" title={`Day ${item.label}: ${money(item.value)}`}><span style={{ height: `${Math.max(2, item.value / max * 100)}%` }} />{(index === 0 || index === values.length - 1 || index % 7 === 0) && <small>{item.label}</small>}</div>)}
  </div>;
}

export function Donut({ categories, total }: { categories: CategoryTotal[]; total: number }) {
  const segments = categories.map((item, index) => {
    const start = total ? categories.slice(0, index).reduce((sum, previous) => sum + previous.total, 0) / total * 100 : 0;
    const end = total ? start + item.total / total * 100 : 0;
    return `${item.colour} ${start}% ${end}%`;
  });
  return <div className="donut-row"><div className="report-donut" style={{ background: segments.length ? `conic-gradient(${segments.join(", ")})` : "var(--surface-muted)" }}><span className="sensitive-value">{money(total)}</span></div><div className="category-list">{categories.map((item) => <div className="category-row" key={item.name}><div className="category-label"><i className="dot" style={{ background: item.colour }} />{item.name}</div><div className="category-amount sensitive-value">{money(item.total)}</div><strong>{total ? Math.round(item.total / total * 100) : 0}%</strong></div>)}{!categories.length && <div className="empty">No spending in this period.</div>}</div></div>;
}
