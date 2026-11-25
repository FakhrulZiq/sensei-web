"use client";
import { UiIcon } from "../../ui-icon";
import type { Screen } from "../types";

export function PreviewScreen({ kind, onNavigate }: { kind: "ai" | "plans"; onNavigate: (value: Screen) => void }) {
  const ai = kind === "ai";
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{ai ? "BUDGET PLANNING" : "SENSEI MEMBERSHIP"}</div>
          <h1>{ai ? "Create a budget with AI" : "Choose your plan"}</h1>
          <div className="subtitle">{ai ? "A preview of guided budget creation." : "A preview of SenSei membership options."}</div>
        </div>
      </div>
      <section className="card feature-preview">
        <div className="preview-mark"><UiIcon name={ai ? "ai" : "plans"} size={26} /></div>
        <div>
          <div className="card-title">{ai ? "AI budgets are coming later" : "Subscriptions are coming later"}</div>
          <p className="subtitle">{ai ? "Budget generation needs a future backend AI integration. You can set a monthly budget and category limits now." : "Plan purchases will become available after the RevenueCat billing phase. Your current SenSei workspace remains available."}</p>
          <button className="button primary" onClick={() => onNavigate(ai ? "budgets" : "summary")}>{ai ? "Set a budget manually" : "Back to home"}</button>
        </div>
      </section>
    </>
  );
}
