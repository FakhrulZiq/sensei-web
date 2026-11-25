"use client";
import { useState } from "react";
import { UiIcon } from "../../ui-icon";
import { LABELS } from "../../../lib/tables";
import type { Row, Screen } from "../types";

export function PreferencesScreen({
  rows,
  onEdit,
  onAdd,
  onNavigate,
}: {
  rows: Row[];
  onEdit: (row: Row) => void;
  onAdd: () => void;
  onNavigate: (value: Screen) => void;
}) {
  const [section, setSection] = useState("Budget & payday");
  const sections: Record<string, string[]> = {
    "Budget & payday": ["monthlyBudgetSen", "paydayDay", "salaryAmountSen", "salaryAccountId", "budgetFromPayday"],
    Privacy: ["hideBalances", "keepReceiptsInCloud"],
    Reminders: ["notifyLimitWarnings", "notifyCommitments", "notifyPayday"],
    Other: ["displayName"],
  };
  const visible = rows.filter((row) => section === "All settings" || sections[section]?.includes(String(row.key)));
  const displayValue = (row: Row) => {
    try {
      const value: unknown = JSON.parse(String(row.value));
      if (typeof value === "boolean") return value ? "On" : "Off";
      if (typeof value === "number" && String(row.key).endsWith("Sen")) return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value / 100);
      if (typeof value === "string") return value || "Not set";
    } catch { /* Preserve values that were stored as plain text. */ }
    return String(row.value ?? "Not set");
  };
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">MAKE IT YOURS</div>
          <h1>Preferences</h1>
          <div className="subtitle">
            Finance defaults that sync across your SenSei devices.
          </div>
        </div>
        <button className="button" onClick={() => onNavigate("devices")}>
          Manage linked browsers
        </button>
      </div>
      <div className="settings-grid">
        <div className="settings-tabs">
          {[...Object.keys(sections), "All settings"].map((label) => (
            <button
              key={label}
              className={`nav-item ${section === label ? "active" : ""}`}
              aria-current={section === label ? "true" : undefined}
              onClick={() => setSection(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <section className="card settings-panel">
          <div className="card-head">
            <div>
              <div className="card-title">{section}</div>
              <div className="card-description">
                Synced settings from your account.
              </div>
            </div>
            <button className="button" onClick={onAdd}>
              Add preference
            </button>
          </div>
          {visible.map((row) => (
              <div className="setting-row" key={String(row.key)}>
                <div>
                  <strong>{LABELS[String(row.key)] ?? String(row.key)}</strong>
                  <span>{displayValue(row)}</span>
                </div>
                <button className="icon-button" aria-label={`Edit ${String(row.key)}`} onClick={() => onEdit(row)}>
                  <UiIcon name="edit" size={17} />
                </button>
              </div>
            ))}
          {!visible.length && (
            <div className="empty">
              No shared preferences have synced yet. Add one or change it in the
              SenSei phone app.
            </div>
          )}
          {section === "Privacy" && <div className="banner">
            Phone-only controls such as biometrics, PIN, location capture, and
            native notifications are managed in the SenSei app.
          </div>}
          {section === "Privacy" && <div className="setting-row">
            <div>
              <strong>Receipt storage</strong>
              <span>
                New receipts are captured and uploaded from your phone.
              </span>
            </div>
            <button className="button" onClick={() => onNavigate("receipts")}>
              View kept receipts
            </button>
          </div>}
        </section>
      </div>
    </>
  );
}
