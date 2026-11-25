"use client";

import { useEffect, useRef } from "react";
import { EntityLogo } from "../../entity-logo";
import { UiIcon } from "../../ui-icon";
import { findBrandForMerchant, type CatalogManifest } from "../../../lib/catalog";
import { amount, dateLabel, money } from "../format";
import type { Row } from "../types";

export function TransactionDetail({ row, accounts, categories, merchants, catalog, onClose, onEdit, onDelete }: {
  row: Row;
  accounts: Row[];
  categories: Row[];
  merchants: Row[];
  catalog: CatalogManifest;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const account = accounts.find((item) => item.id === row.account_id);
  const category = categories.find((item) => item.id === row.category_id);
  const merchant = merchants.find((item) => item.id === row.merchant_id);
  const name = String(merchant?.display_name ?? row.note ?? row.type ?? "Transaction");
  const brand = findBrandForMerchant(catalog, merchant?.brand_id, merchant?.display_name, row.note);
  return <div className="detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title">
      <div className="detail-head"><span className="eyebrow">TRANSACTION DETAILS</span><button ref={closeRef} className="icon-button" aria-label="Close transaction details" onClick={onClose}><UiIcon name="close" size={18} /></button></div>
      <div className="detail-heading"><EntityLogo entry={brand} name={name} /><div><h2 id="transaction-detail-title">{name}</h2><span className="subtitle">{String(row.type ?? "Transaction")}</span></div></div>
      <div className="detail-amount sensitive-value">{row.type === "income" ? "+" : "−"}{money(amount(row.amount_sen))}</div>
      <dl className="detail-list">
        <div><dt>Date</dt><dd>{dateLabel(row.occurred_at)}</dd></div>
        <div><dt>Account</dt><dd>{String(account?.name ?? "Unknown account")}</dd></div>
        <div><dt>Category</dt><dd>{String(category?.name ?? "Uncategorised")}</dd></div>
        {Boolean(row.note) && <div><dt>Note</dt><dd>{String(row.note)}</dd></div>}
      </dl>
      <div className="detail-actions"><button className="button primary" onClick={onEdit}>Edit transaction</button><button className="button danger" onClick={onDelete}>Delete</button></div>
    </section>
  </div>;
}
