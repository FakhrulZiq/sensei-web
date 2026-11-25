"use client";
import { useEffect, useMemo, useState } from "react";
import { EntityLogo } from "../../entity-logo";
import { UiIcon } from "../../ui-icon";
import { findBrandForMerchant, findCatalogEntry, type CatalogManifest } from "../../../lib/catalog";
import { LABELS, TABLE_LABELS, keyOf, type TableName } from "../../../lib/tables";
import { amount, dateLabel, downloadCsv, money } from "../format";
import type { Row } from "../types";
import { TransactionDetail } from "./transaction-detail";

export function RecordsScreen({
  catalog,
  table,
  uid,
  rows,
  allRows,
  query,
  setQuery,
  onAdd,
  onEdit,
  onDelete,
  onReceipt,
}: {
  catalog: CatalogManifest;
  table: TableName;
  uid: string;
  rows: Row[];
  allRows: Record<TableName, Row[]>;
  query: string;
  setQuery: (value: string) => void;
  onAdd: () => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
  onReceipt: (row: Row) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<Row | null>(null);
  const [viewName, setViewName] = useState("");
  const [selectedView, setSelectedView] = useState("");
  const [savedViews, setSavedViews] = useState<{ name: string; query: string; filter: string; account: string; category: string; from: string; to: string }[]>([]);
  const viewsKey = `sensei.web.transactionViews.${uid}`;
  useEffect(() => {
    if (table !== "transactions") return;
    const frame = requestAnimationFrame(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem(viewsKey) ?? "[]");
        if (Array.isArray(parsed)) setSavedViews(parsed);
      } catch { /* A corrupt local view is ignored. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [table, viewsKey]);
  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const view = { name, query, filter, account: accountFilter, category: categoryFilter, from: fromDate, to: toDate };
    const next = [...savedViews.filter((item) => item.name !== name), view].sort((a, b) => a.name.localeCompare(b.name));
    setSavedViews(next);
    setSelectedView(name);
    setViewName("");
    localStorage.setItem(viewsKey, JSON.stringify(next));
  };
  const chooseView = (name: string) => {
    setSelectedView(name);
    const view = savedViews.find((item) => item.name === name);
    if (!view) return;
    setQuery(view.query);
    setFilter(view.filter);
    setAccountFilter(view.account);
    setCategoryFilter(view.category);
    setFromDate(view.from);
    setToDate(view.to);
  };
  const deleteView = () => {
    const next = savedViews.filter((item) => item.name !== selectedView);
    setSavedViews(next);
    setSelectedView("");
    localStorage.setItem(viewsKey, JSON.stringify(next));
  };
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          JSON.stringify(row).toLowerCase().includes(query.toLowerCase()) &&
          (filter === "all" ||
            String(row.type ?? row.status ?? row.kind) === filter) &&
          (table !== "transactions" ||
            ((accountFilter === "all" || String(row.account_id) === accountFilter) &&
              (categoryFilter === "all" || String(row.category_id ?? "none") === categoryFilter) &&
              (!fromDate || String(row.occurred_at ?? "").slice(0, 10) >= fromDate) &&
              (!toDate || String(row.occurred_at ?? "").slice(0, 10) <= toDate))),
      ).sort((a, b) => {
        if (table !== "transactions") return 0;
        if (sort === "highest") return amount(b.amount_sen) - amount(a.amount_sen);
        if (sort === "lowest") return amount(a.amount_sen) - amount(b.amount_sen);
        const dates = String(b.occurred_at ?? "").localeCompare(String(a.occurred_at ?? ""));
        return sort === "oldest" ? -dates : dates;
      }),
    [rows, query, filter, table, accountFilter, categoryFilter, fromDate, toDate, sort],
  );
  const filterValues = [
    ...new Set(
      rows
        .map((row) => String(row.type ?? row.status ?? row.kind ?? ""))
        .filter(Boolean),
    ),
  ];
  const accountValues = [...new Set(rows.map((row) => String(row.account_id ?? "")).filter(Boolean))];
  const categoryValues = [...new Set(rows.map((row) => String(row.category_id ?? "none")))];
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">YOUR FINANCES</div>
          <h1>{TABLE_LABELS[table]}</h1>
          <div className="subtitle">
            Review and manage your synced {TABLE_LABELS[table].toLowerCase()}.
          </div>
        </div>
        <div className="page-actions">
          <button className="button" onClick={() => downloadCsv(`sensei-${table}-${new Date().toISOString().slice(0, 10)}.csv`, filtered)} disabled={!filtered.length}>
            Export CSV
          </button>
          <button className="button primary" onClick={onAdd}>
            Add {table === "transactions" ? "transaction" : "record"}
          </button>
        </div>
      </div>
      <div className="toolbar">
        <input
          className="search"
          placeholder={`Search ${TABLE_LABELS[table].toLowerCase()}…`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {table === "transactions" && (
          <select
            className="select"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {filterValues.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        )}
        {table === "transactions" && (
          <>
            <select className="select" aria-label="Filter by account" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
              <option value="all">All accounts</option>
              {accountValues.map((value) => <option key={value} value={value}>{String((allRows.accounts ?? []).find((row) => row.id === value)?.name ?? value)}</option>)}
            </select>
            <select className="select" aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categoryValues.map((value) => <option key={value} value={value}>{value === "none" ? "Uncategorised" : String((allRows.categories ?? []).find((row) => row.id === value)?.name ?? value)}</option>)}
            </select>
            <input className="date-control" aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <input className="date-control" aria-label="To date" type="date" min={fromDate || undefined} value={toDate} onChange={(event) => setToDate(event.target.value)} />
            <select className="select" aria-label="Sort transactions" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select>
          </>
        )}
        <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>
          {filtered.length} records
        </span>
      </div>
      {table === "transactions" && <div className="saved-views">
        <select className="select" aria-label="Saved transaction views" value={selectedView} onChange={(event) => chooseView(event.target.value)}>
          <option value="">Saved views</option>
          {savedViews.map((view) => <option key={view.name} value={view.name}>{view.name}</option>)}
        </select>
        <input className="search" aria-label="Name for new view" placeholder="Name this view" value={viewName} onChange={(event) => setViewName(event.target.value)} maxLength={40} />
        <button className="button" onClick={saveView} disabled={!viewName.trim()}>Save view</button>
        {selectedView && <button className="button danger" onClick={deleteView}>Delete view</button>}
      </div>}
      <section className="card table-card">
        <DataTable
          table={table}
          rows={filtered}
          allRows={allRows}
          catalog={catalog}
          onEdit={onEdit}
          onDelete={onDelete}
          onReceipt={onReceipt}
          onSelect={table === "transactions" ? setSelected : undefined}
        />
      </section>
      {selected && table === "transactions" && <TransactionDetail row={selected} accounts={allRows.accounts ?? []} categories={allRows.categories ?? []} merchants={allRows.merchants ?? []} catalog={catalog} onClose={() => setSelected(null)} onEdit={() => { setSelected(null); onEdit(selected); }} onDelete={() => { setSelected(null); onDelete(selected); }} />}
    </>
  );
}

export function DataTable({
  table,
  rows,
  allRows,
  catalog,
  onEdit,
  onDelete,
  onReceipt,
  onSelect,
}: {
  table: TableName;
  rows: Row[];
  allRows: Record<TableName, Row[]>;
  catalog: CatalogManifest;
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
  onReceipt?: (row: Row) => void;
  onSelect?: (row: Row) => void;
}) {
  const columns = useMemo(() => {
    if (table === "transactions")
      return [
        "transaction",
        "occurred_at",
        "type",
        "amount_sen",
        "account_id",
        "category_id",
      ];
    if (table === "accounts")
      return ["name", "type", "opening_balance_sen", "last4", "currency"];
    if (table === "categories")
      return ["name", "kind", "limit_sen", "limit_period", "colour"];
    if (table === "merchants")
      return ["display_name", "brand_id", "default_category_id", "lat", "lng"];
    if (table === "receipts")
      return [
        "transaction_id",
        "extracted_text",
        "kept_in_cloud",
        "upload_state",
        "file_ref",
      ];
    if (table === "commitments")
      return [
        "name",
        "kind",
        "amount_sen",
        "due_day",
        "start_period",
        "method",
      ];
    if (table === "commitment_payments")
      return ["commitment_id", "period", "due_date", "amount_sen", "status"];
    if (table === "pots")
      return [
        "name",
        "type",
        "provider_name",
        "current_balance_sen",
        "target_sen",
        "update_frequency",
      ];
    if (table === "pot_updates")
      return ["pot_id", "recorded_at", "balance_sen", "return_sen", "note"];
    if (table === "settings") return ["key", "value"];
    if (table === "merchant_printed_names")
      return ["merchant_id", "printed_name", "normalised"];
    return ["type", "title", "body", "created_at", "read_at"];
  }, [table]);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((field) => (
              <th key={field}>{LABELS[field] ?? field.replaceAll("_", " ")}</th>
            ))}
            {(onEdit || onDelete || onReceipt || onSelect) && (
              <th style={{ textAlign: "right" }}>{onSelect ? "Details" : "Actions"}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const merchant = (allRows.merchants ?? []).find((item) => item.id === row.merchant_id);
            const leadingName = table === "transactions" ? String(merchant?.display_name ?? row.note ?? row.type ?? "Transaction") : String(row.name ?? row.display_name ?? "");
            const logo = table === "accounts" ? findCatalogEntry(catalog, "bank", row.bank_id) :
              table === "merchants" || table === "commitments" ? findBrandForMerchant(catalog, row.brand_id, row.display_name, row.name) :
                table === "transactions" ? findBrandForMerchant(catalog, merchant?.brand_id, merchant?.display_name, row.note) : null;
            return <tr key={String(row.__recordId ?? row.id ?? keyOf(table, row))} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} onClick={onSelect ? () => onSelect(row) : undefined} onKeyDown={onSelect ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row); } } : undefined}>
              {columns.map((field, index) => (
                <td key={field}>{index === 0 && ["accounts", "merchants", "commitments", "transactions"].includes(table) ?
                  <div className="entity-cell"><EntityLogo entry={logo} name={leadingName} /><span>{leadingName}</span></div> :
                  field === "account_id" ? String((allRows.accounts ?? []).find((item) => item.id === row.account_id)?.name ?? "—") :
                    field === "category_id" ? String((allRows.categories ?? []).find((item) => item.id === row.category_id)?.name ?? "Uncategorised") :
                      field === "brand_id" ? String(findCatalogEntry(catalog, "brand", row.brand_id)?.name ?? "—") :
                        formatCell(field, row[field])}</td>
              ))}
              {(onEdit || onDelete || onReceipt || onSelect) && (
                <td onClick={(event) => event.stopPropagation()}>
                  <div className="table-actions">
                    {onSelect && <button className="button" onClick={() => onSelect(row)}>View</button>}
                    {table === "receipts" && onReceipt && (
                      <button className="button" onClick={() => onReceipt(row)}>
                        View
                      </button>
                    )}
                    {onEdit && !onSelect && (
                      <button
                        className="icon-button"
                        aria-label="Edit record"
                        onClick={() => onEdit(row)}
                      >
                        <UiIcon name="edit" size={17} />
                      </button>
                    )}
                    {onDelete && !onSelect && (
                      <button
                        className="icon-button"
                        aria-label="Delete record"
                        onClick={() => onDelete(row)}
                      >
                        <UiIcon name="trash" size={17} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>;
          })}
          {!rows.length && (
            <tr>
              <td className="empty" colSpan={columns.length + 1}>
                No records yet. Add one to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function formatCell(field: string, value: unknown) {
  if (value === null || value === undefined || value === "")
    return <span className="muted">—</span>;
  if (field.endsWith("_sen") || field === "amount_sen")
    return <span className="sensitive-value">{money(amount(value))}</span>;
  if (field.endsWith("_at") || field === "due_date") return dateLabel(value);
  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return stringValue.length > 46 ? `${stringValue.slice(0, 43)}…` : stringValue;
}
