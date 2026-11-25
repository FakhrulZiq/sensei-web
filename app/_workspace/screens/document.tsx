"use client";
import { useState } from "react";
import type { Row } from "../types";

type DocumentKind = "tax" | "will";
const documentFields: Record<DocumentKind, { key: string; label: string; multiline?: boolean }[]> = {
  tax: [
    { key: "year", label: "Assessment year" },
    { key: "fullName", label: "Full name" },
    { key: "income", label: "Income notes", multiline: true },
    { key: "reliefs", label: "Reliefs and deductions", multiline: true },
    { key: "documents", label: "Supporting documents checklist", multiline: true },
    { key: "questions", label: "Questions for your tax adviser", multiline: true },
  ],
  will: [
    { key: "fullName", label: "Full name" },
    { key: "contact", label: "Contact information" },
    { key: "executors", label: "Executors and their contact details", multiline: true },
    { key: "beneficiaries", label: "Beneficiaries", multiline: true },
    { key: "assets", label: "Assets and accounts", multiline: true },
    { key: "distributions", label: "Distribution wishes", multiline: true },
    { key: "instructions", label: "Other instructions and important events", multiline: true },
  ],
};
function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
export function PlanningDocumentScreen({ kind, settings, onSave, busy }: {
  kind: DocumentKind;
  settings: Row[];
  onSave: (row: Row) => Promise<boolean>;
  busy: boolean;
}) {
  const settingKey = kind === "tax" ? "webTaxOrganiserV1" : "webWillOrganiserV1";
  const stored = settings.find((row) => row.key === settingKey);
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    try {
      const value = JSON.parse(String(stored?.value ?? "{}"));
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  });
  const [saved, setSaved] = useState(false);
  const title = kind === "tax" ? "Tax organiser" : "Will organiser";
  const exportDocument = () => {
    const lines = documentFields[kind].map((field) => `<section><h2>${escapeHtml(field.label)}</h2><p>${escapeHtml(draft[field.key] ?? "—").replaceAll("\n", "<br>")}</p></section>`).join("");
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>SenSei ${title}</title><style>body{font:16px/1.5 Arial,sans-serif;max-width:760px;margin:48px auto;color:#161616}h1{font-size:32px}h2{font-size:15px;margin-bottom:4px}section{border-top:1px solid #ddd;padding:12px 0}p{white-space:normal;margin-top:0}</style><h1>SenSei ${title}</h1><p>Prepared ${escapeHtml(new Date().toLocaleDateString("en-MY"))}</p>${lines}<p>This is a personal information summary for review. It is not a tax filing or executed legal document.</p></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sensei-${kind}-organiser.html`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">PRIVATE PLANNING</div><h1>{title}</h1><div className="subtitle">Keep your information together and export a copy for review.</div></div></div>
      <section className="card document-form">
        <div className="banner">Your answers sync as encrypted SenSei settings. The exported file is unencrypted, so save it somewhere you trust.</div>
        <div className="form-grid">
          {documentFields[kind].map((field) => <div className={`field ${field.multiline ? "full" : ""}`} key={field.key}>
            <label htmlFor={`${kind}-${field.key}`}>{field.label}</label>
            {field.multiline ? <textarea id={`${kind}-${field.key}`} value={draft[field.key] ?? ""} onChange={(event) => { setDraft({ ...draft, [field.key]: event.target.value }); setSaved(false); }} /> : <input id={`${kind}-${field.key}`} value={draft[field.key] ?? ""} onChange={(event) => { setDraft({ ...draft, [field.key]: event.target.value }); setSaved(false); }} />}
          </div>)}
        </div>
        <div className="modal-actions">
          {saved && <span className="muted" role="status">Saved and synced</span>}
          <button className="button" onClick={exportDocument}>Download summary</button>
          <button className="button primary" disabled={busy} onClick={async () => { if (await onSave({ key: settingKey, value: JSON.stringify(draft) })) setSaved(true); }}>Save answers</button>
        </div>
      </section>
    </>
  );
}
