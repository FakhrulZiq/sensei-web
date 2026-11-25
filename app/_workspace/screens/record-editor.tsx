"use client";
import { useState } from "react";
import { EntityLogo } from "../../entity-logo";
import { UiIcon } from "../../ui-icon";
import { findCatalogEntry, type CatalogManifest } from "../../../lib/catalog";
import { LABELS, TABLE_LABELS, type TableName } from "../../../lib/tables";
import { amount } from "../format";
import type { Row } from "../types";

export function RecordEditor({
  catalog,
  table,
  initial,
  rows,
  onClose,
  onSave,
  busy,
}: {
  catalog: CatalogManifest;
  table: TableName;
  initial: Row;
  rows: Record<TableName, Row[]>;
  onClose: () => void;
  onSave: (row: Row) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<Row>(initial);
  const [formError, setFormError] = useState("");
  const keys = Object.keys(form).filter(
    (field) =>
      !field.startsWith("__") &&
      field !== "id" &&
      field !== "created_at" &&
      field !== "updated_at",
  );
  const numeric = (key: string, value: unknown) =>
    typeof value === "number" ||
    key.endsWith("_sen") ||
    [
      "sort_order",
      "due_day",
      "remind_days_before",
      "paid_before",
      "total_payments",
      "is_main",
      "hidden",
      "excluded_from_total",
      "kept_in_cloud",
      "lat",
      "lng",
    ].includes(key);
  const references: Record<string, TableName> = {
    account_id: "accounts",
    to_account_id: "accounts",
    linked_account_id: "accounts",
    category_id: "categories",
    default_category_id: "categories",
    merchant_id: "merchants",
    commitment_id: "commitments",
    transaction_id: "transactions",
    pot_id: "pots",
  };
  return (
    <div
      className={`overlay${table === "transactions" ? " transaction-editor-overlay" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-label={`${initial.__recordId ? "Edit" : "Add"} ${TABLE_LABELS[table].toLowerCase()}`}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{TABLE_LABELS[table].toUpperCase()}</div>
            <h2>{initial.__recordId ? "Edit record" : "Add a record"}</h2>
            <div className="subtitle">
              Changes are encrypted before they sync.
            </div>
          </div>
          <button className="icon-button" aria-label="Close editor" onClick={onClose}>
            <UiIcon name="close" size={17} />
          </button>
        </div>
        {formError && <div className="inline-error">{formError}</div>}
        <div className="form-grid">
          {keys.map((field) => (
            <div
              className={`field ${["note", "extracted_text", "body", "value", "meta", "location_captured_at"].includes(field) ? "full" : ""}`}
              key={field}
            >
              <label>{field.endsWith("_sen") ? `${(LABELS[field] ?? field.replaceAll("_", " ")).replace(" (sen)", "")} (RM)` : LABELS[field] ?? field.replaceAll("_", " ")}</label>
              {field === "bank_id" || field === "brand_id" ? (
                <div className="catalog-select">
                  <EntityLogo entry={findCatalogEntry(catalog, field === "bank_id" ? "bank" : "brand", form[field])} name={String(form.name ?? form.display_name ?? "?")} />
                  <select value={String(form[field] ?? "")} onChange={(event) => setForm({ ...form, [field]: event.target.value || null })}>
                    <option value="">No {field === "bank_id" ? "bank" : "brand"}</option>
                    {(field === "bank_id" ? catalog.banks : catalog.brands).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                  </select>
                </div>
              ) : field === "type" && table === "transactions" ? (
                <select value={String(form[field] ?? "expense")} onChange={(event) => setForm({ ...form, [field]: event.target.value })}>
                  <option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option><option value="repayment">Repayment</option>
                </select>
              ) : field === "type" && table === "accounts" ? (
                <select value={String(form[field] ?? "debit")} onChange={(event) => setForm({ ...form, [field]: event.target.value })}>
                  <option value="debit">Bank or debit</option><option value="credit">Credit</option><option value="cash">Cash</option>
                </select>
              ) : field === "kind" && table === "categories" ? (
                <select value={String(form[field] ?? "spend")} onChange={(event) => setForm({ ...form, [field]: event.target.value })}>
                  <option value="spend">Spending</option><option value="inflow">Income</option>
                </select>
              ) : references[field] ? (
                <select value={String(form[field] ?? "")} onChange={(event) => setForm({ ...form, [field]: event.target.value || null })}>
                  <option value="">{field === "account_id" || field === "commitment_id" ? "Choose one" : "None"}</option>
                  {(rows[references[field]] ?? []).map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name ?? item.display_name ?? item.title ?? item.id)}</option>)}
                </select>
              ) : field.endsWith("_sen") ? (
                <div className="money-field"><span>RM</span><input type="number" min="0" step="0.01" value={form[field] == null ? "" : (amount(form[field]) / 100).toString()} onChange={(event) => setForm({ ...form, [field]: event.target.value === "" ? null : Math.round(Number(event.target.value) * 100) })} /></div>
              ) : ["note", "extracted_text", "body", "value", "meta"].includes(
                field,
              ) ? (
                <textarea
                  value={form[field] == null ? "" : String(form[field])}
                  onChange={(event) =>
                    setForm({ ...form, [field]: event.target.value })
                  }
                  placeholder={
                    field === "value"
                      ? "Enter valid JSON, such as true or 250000"
                      : ""
                  }
                />
              ) : (
                <input
                  type={numeric(field, form[field]) ? "number" : "text"}
                  value={form[field] == null ? "" : String(form[field])}
                  placeholder={form[field] == null ? "Optional" : ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      [field]: numeric(field, form[field])
                        ? event.target.value === ""
                          ? null
                          : Number(event.target.value)
                        : event.target.value,
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              try {
                if (table === "settings") JSON.parse(String(form.value));
                if (
                  table === "transactions" &&
                  (!form.account_id || amount(form.amount_sen) <= 0)
                )
                  throw new Error(
                    "Choose an account and enter an amount greater than zero.",
                  );
                if (table === "accounts" && !form.name)
                  throw new Error("Enter an account name.");
                if (table === "categories" && !form.name)
                  throw new Error("Enter a category name.");
                onSave(form);
              } catch (error) {
                setFormError(
                  error instanceof Error ? error.message : "Check the form.",
                );
              }
            }}
          >
            Save & sync
          </button>
        </div>
      </section>
    </div>
  );
}
