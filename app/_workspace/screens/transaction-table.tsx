"use client";
import { EntityLogo } from "../../entity-logo";
import { findBrandForMerchant, type CatalogManifest } from "../../../lib/catalog";
import { amount, dateLabel, money } from "../format";
import type { Row } from "../types";

export function TransactionTable({
  catalog,
  rows,
  accounts,
  categories,
  merchants,
}: {
  catalog: CatalogManifest;
  rows: Row[];
  accounts: Row[];
  categories: Row[];
  merchants: Row[];
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Account</th>
            <th>Category</th>
            <th>Date</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const account = accounts.find((a) => a.id === row.account_id);
            const category = categories.find((c) => c.id === row.category_id);
            const merchant = merchants.find((m) => m.id === row.merchant_id);
            const brand = findBrandForMerchant(catalog, merchant?.brand_id, merchant?.display_name, row.note);
            return (
              <tr key={String(row.__recordId ?? row.id)}>
                <td>
                  <div className="entity-cell">
                    <EntityLogo entry={brand} name={String(merchant?.display_name ?? row.note ?? row.type ?? "Transaction")} />
                    <div><div className="row-title">{String(merchant?.display_name ?? row.note ?? row.type ?? "Transaction")}</div>
                      <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{String(row.type ?? "")}</div></div>
                  </div>
                </td>
                <td>{String(account?.name ?? "—")}</td>
                <td>{String(category?.name ?? "Uncategorised")}</td>
                <td>{dateLabel(row.occurred_at)}</td>
                <td
                  className={`amount ${row.type === "income" ? "positive" : ""}`}
                >
                  {row.type === "income" ? "+" : "−"}
                  {money(amount(row.amount_sen))}
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td className="empty" colSpan={5}>
                No transactions to show yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
