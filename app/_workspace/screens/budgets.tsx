"use client";
import { UiIcon } from "../../ui-icon";
import type { TableName } from "../../../lib/tables";
import { amount, money } from "../format";
import { defaults } from "../defaults";
import type { Row } from "../types";

export function BudgetsScreen({
  month,
  rows,
  spent,
  onEdit,
  onAdd,
}: {
  month: string;
  rows: Record<TableName, Row[]>;
  spent: number;
  onEdit: (table: TableName, row: Row) => void;
  onAdd: () => void;
}) {
  const budgetRow = rows.settings?.find(
    (row) => row.key === "monthlyBudgetSen",
  );
  let budgetSen = 0;
  try {
    budgetSen = Number(JSON.parse(String(budgetRow?.value ?? "0"))) || 0;
  } catch {
    budgetSen = 0;
  }
  const categories = (rows.categories ?? [])
    .filter((category) => amount(category.limit_sen) > 0)
    .map((category) => {
      const used = (rows.transactions ?? [])
        .filter(
          (row) =>
            row.category_id === category.id &&
            row.type === "expense" &&
            String(row.occurred_at ?? "").slice(0, 7) === month,
        )
        .reduce((total, row) => total + amount(row.amount_sen), 0);
      return { category, used };
    });
  const percent = budgetSen ? Math.min(100, (spent / budgetSen) * 100) : 0;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">PLAN YOUR SPENDING</div>
          <h1>Budgets</h1>
          <div className="subtitle">
            Track your monthly limit and category guardrails.
          </div>
        </div>
        <button className="button primary" onClick={onAdd}>
          Set monthly budget
        </button>
      </div>
      <div className="grid main-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Monthly budget</div>
              <div className="card-description">Current month spending</div>
            </div>
            <button
              className="icon-button"
              aria-label="Edit monthly budget"
              onClick={() =>
                budgetRow ? onEdit("settings", budgetRow) : onAdd()
              }
            >
              <UiIcon name="edit" size={17} />
            </button>
          </div>
          <div className="metric-value">
            {budgetSen
              ? `${money(spent)} of ${money(budgetSen)}`
              : "No monthly limit set"}
          </div>
          {budgetSen ? (
            <>
              <div className="progress" style={{ height: 9, marginTop: 16 }}>
                <span
                  style={{
                    width: `${percent}%`,
                    background: percent >= 90 ? "var(--coral)" : "var(--green)",
                  }}
                />
              </div>
              <div className="metric-note" style={{ marginTop: 10 }}>
                {money(Math.max(0, budgetSen - spent))} remaining ·{" "}
                {Math.round(percent)}% used
              </div>
            </>
          ) : (
            <div className="banner" style={{ marginTop: 15 }}>
              Add a monthly budget to see how much is left to spend.
            </div>
          )}
        </section>
        <section className="card">
          <div className="card-title">At a glance</div>
          <div className="account-list" style={{ marginTop: 18 }}>
            <div className="setting-row">
              <div>
                <strong>Spent this month</strong>
                <span>Across all categories</span>
              </div>
              <strong>{money(spent)}</strong>
            </div>
            <div className="setting-row">
              <div>
                <strong>Category limits</strong>
                <span>Personal spending guardrails</span>
              </div>
              <strong>{categories.length}</strong>
            </div>
            <div className="setting-row">
              <div>
                <strong>Tracked commitments</strong>
                <span>Recurring payments</span>
              </div>
              <strong>
                {rows.commitments?.filter((row) => !row.ended_at).length ?? 0}
              </strong>
            </div>
          </div>
        </section>
      </div>
      <section className="card table-card">
        <div className="card-head">
          <div>
            <div className="card-title">Category limits</div>
            <div className="card-description">
              Spending progress for categories with a limit.
            </div>
          </div>
          <button
            className="button"
            onClick={() => onEdit("categories", defaults("categories"))}
          >
            Add category limit
          </button>
        </div>
        <div className="category-list" style={{ padding: "0 20px 20px" }}>
          {categories.map(({ category, used }) => (
            <div className="category-row" key={String(category.id)}>
              <div className="category-label">
                <i
                  className="dot"
                  style={{ background: String(category.colour ?? "#9FB3A0") }}
                />
                {String(category.name)}
              </div>
              <div className="category-amount">
                {money(used)} / {money(amount(category.limit_sen))}
              </div>
              <div className="progress">
                <span
                  style={{
                    width: `${Math.min(100, amount(category.limit_sen) ? (used / amount(category.limit_sen)) * 100 : 0)}%`,
                    background: String(category.colour ?? "var(--green)"),
                  }}
                />
              </div>
            </div>
          ))}
          {!categories.length && (
            <div className="empty">
              No category limits yet. Add one from Categories.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
