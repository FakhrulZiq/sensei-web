import type { TableName } from "../../lib/tables";
import { id, monthNow, nowIso } from "./format";
import type { Row } from "./types";

export function defaults(table: TableName): Row {
  const created_at = nowIso();
  const idValue = id();
  switch (table) {
    case "settings":
      return { key: "", value: "null" };
    case "accounts":
      return {
        id: idValue,
        name: "",
        type: "debit",
        opening_balance_sen: 0,
        currency: "RM",
        last4: null,
        sort_order: 0,
        created_at,
        colour: "#315E4A",
        image_uri: null,
        bank_id: null,
        is_main: 0,
        excluded_from_total: 0,
      };
    case "categories":
      return {
        id: idValue,
        name: "",
        icon: "help-circle",
        colour: "#D9B48C",
        sort_order: 0,
        kind: "spend",
        hidden: 0,
        group_name: null,
        image_uri: null,
        limit_sen: null,
        limit_period: null,
        limit_reset_weekday: null,
        limit_account_ids: null,
        created_at,
      };
    case "merchants":
      return {
        id: idValue,
        display_name: "",
        default_category_id: null,
        lat: null,
        lng: null,
        created_at,
        brand_id: null,
      };
    case "merchant_printed_names":
      return { merchant_id: "", printed_name: "", normalised: "" };
    case "transactions":
      return {
        id: idValue,
        type: "expense",
        amount_sen: 0,
        occurred_at: created_at,
        account_id: "",
        to_account_id: null,
        merchant_id: null,
        category_id: null,
        status: "paid",
        note: null,
        lat: null,
        lng: null,
        location_accuracy: null,
        location_captured_at: null,
        receipt_id: null,
        created_at,
        updated_at: created_at,
      };
    case "receipts":
      return {
        id: idValue,
        transaction_id: "",
        extracted_text: "",
        file_ref: null,
        kept_in_cloud: 0,
        upload_state: "none",
      };
    case "commitments":
      return {
        id: idValue,
        name: "",
        brand_id: null,
        kind: "bill",
        loan_type: null,
        amount_sen: null,
        due_day: 1,
        account_id: "",
        category_id: null,
        method: "manual",
        remind_days_before: 2,
        total_payments: null,
        paid_before: 0,
        start_period: monthNow(),
        icon: "receipt",
        colour: "#D9B48C",
        ended_at: null,
        sort_order: 0,
        created_at,
      };
    case "commitment_payments":
      return {
        id: idValue,
        commitment_id: "",
        period: monthNow(),
        due_date: new Date().toISOString().slice(0, 10),
        amount_sen: null,
        status: "upcoming",
        paid_at: null,
        transaction_id: null,
        source: "manual",
        created_at,
      };
    case "pots":
      return {
        id: idValue,
        name: "",
        type: "regular",
        provider_name: "",
        provider_type: "bank",
        linked_account_id: "",
        allocated_sen: 0,
        current_balance_sen: 0,
        target_sen: null,
        update_frequency: "monthly",
        next_update_at: created_at,
        archived_at: null,
        colour: "#9FB3A0",
        image_uri: null,
        sort_order: 0,
        created_at,
      };
    case "pot_updates":
      return {
        id: idValue,
        pot_id: "",
        balance_sen: 0,
        return_sen: 0,
        note: null,
        recorded_at: created_at,
      };
    case "notifications":
      return {
        id: idValue,
        type: "welcome",
        title: "",
        body: "",
        meta: null,
        created_at,
        read_at: null,
      };
  }
}

