"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { deleteObject, getDownloadURL, ref } from "firebase/storage";
import { decryptBlob } from "sensei-crypto";
import { getBrowserAuth, getBrowserStorage } from "../lib/firebase";
import { api, ApiError } from "../lib/api";
import { startLink } from "../lib/link";
import { deleteAndPush, pullAll, saveAndPush } from "../lib/sync";
import { clearVault, getKey, listRows } from "../lib/vault";
import {
  LABELS,
  TABLE_LABELS,
  TABLES,
  keyOf,
  type TableName,
} from "../lib/tables";

type Row = Record<string, unknown>;
const EMPTY_ROWS: Row[] = [];
type Screen =
  | "summary"
  | "reports"
  | "budgets"
  | TableName
  | "profile"
  | "preferences"
  | "devices";
type Session = { id: string; label: string; createdAt: string };
const money = (sen: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format((sen || 0) / 100);
const dateLabel = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
const amount = (value: unknown) => Number(value ?? 0) || 0;
const pad = (value: number) => String(value).padStart(2, "0");
const nowIso = () => {
  const value = new Date();
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
};
const localMonth = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}`;
const monthNow = () => localMonth(new Date());
const id = () => crypto.randomUUID();
const browserLabel = () => {
  const agent = navigator.userAgent;
  const browser = agent.includes("Edg/")
    ? "Edge"
    : agent.includes("Firefox/")
      ? "Firefox"
      : agent.includes("Chrome/")
        ? "Chrome"
        : agent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const system =
    (navigator as Navigator & { userAgentData?: { platform: string } })
      .userAgentData?.platform ||
    navigator.platform ||
    "computer";
  return `${browser} on ${system}`;
};

function defaults(table: TableName): Row {
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

const groups: {
  title: string;
  items: { id: Screen; label: string; symbol: string }[];
}[] = [
  {
    title: "OVERVIEW",
    items: [
      { id: "summary", label: "Summary", symbol: "◫" },
      { id: "reports", label: "Reports", symbol: "⌁" },
    ],
  },
  {
    title: "MONEY",
    items: [
      { id: "transactions", label: "Transactions", symbol: "⇄" },
      { id: "accounts", label: "Accounts", symbol: "▣" },
      { id: "categories", label: "Categories", symbol: "◌" },
      { id: "merchants", label: "Merchants", symbol: "⌂" },
    ],
  },
  {
    title: "PLANNING",
    items: [
      { id: "budgets", label: "Budgets", symbol: "◉" },
      { id: "commitments", label: "Commitments", symbol: "◷" },
      { id: "pots", label: "Savings pots", symbol: "▤" },
      { id: "preferences", label: "Preferences", symbol: "⚙" },
    ],
  },
  {
    title: "RECORDS",
    items: [
      { id: "receipts", label: "Receipts", symbol: "▧" },
      { id: "commitment_payments", label: "Scheduled payments", symbol: "◉" },
      { id: "pot_updates", label: "Pot history", symbol: "↗" },
      { id: "merchant_printed_names", label: "Merchant aliases", symbol: "≋" },
      { id: "notifications", label: "Notifications", symbol: "♧" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { id: "profile", label: "Profile", symbol: "○" },
      { id: "devices", label: "Linked browsers", symbol: "⌘" },
    ],
  },
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [key, setKey] = useState<{
    uid: string;
    kid: string;
    dek: Uint8Array;
    sessionId: string;
  } | null>(null);
  const [rows, setRows] = useState<Record<TableName, Row[]>>(
    {} as Record<TableName, Row[]>,
  );
  const [screen, setScreen] = useState<Screen>("summary");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [qr, setQr] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [linkMessage, setLinkMessage] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("2026-11");
  const [editing, setEditing] = useState<{
    table: TableName;
    row: Row;
    original?: Row;
  } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<{
    displayName: string;
    photoUrl: string;
  }>({ displayName: "", photoUrl: "" });
  const [receiptUrl, setReceiptUrl] = useState("");
  const linkAttempt = useRef(0);
  const autoLinkStarted = useRef(false);
  const [linkNow, setLinkNow] = useState(0);
  const loadSessions = useCallback(async () => {
    try {
      setSessions(await api<Session[]>("/key-links/sessions"));
    } catch (e) {
      setSessions([]);
      setError(
        e instanceof Error ? e.message : "Could not load linked browsers.",
      );
    }
  }, []);

  const refreshRows = useCallback(async (uid: string) => {
    const next = {} as Record<TableName, Row[]>;
    for (const table of TABLES) next[table] = await listRows(uid, table);
    setRows(next);
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(getBrowserAuth(), async (current) => {
        setUser(current);
        setKey(null);
        setError("");
        if (!current) {
          setRows({} as Record<TableName, Row[]>);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const stored = await getKey(current.uid);
          if (!stored) {
            setKey(null);
            setLoading(false);
            return;
          }
          setKey(stored);
          await pullAll(current.uid, stored.kid, stored.dek);
          await refreshRows(current.uid);
          setProfile({
            displayName: current.displayName ?? "",
            photoUrl: current.photoURL ?? "",
          });
        } catch (e) {
          const message =
            e instanceof Error
              ? e.message
              : "Could not load the encrypted account.";
          setError(message);
          if (e instanceof ApiError && e.status === 401) {
            await clearVault(current.uid);
            await signOut(getBrowserAuth());
          }
        } finally {
          setLoading(false);
        }
      }),
    [refreshRows],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!qr) return;
    const timer = window.setInterval(() => setLinkNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [qr]);
  useEffect(() => {
    if (!user || !key) return;
    const timer = window.setInterval(() => {
      void api("/users/me").catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [user, key]);

  const selectedTable = TABLES.includes(screen as TableName)
    ? (screen as TableName)
    : null;
  const monthRows = useMemo(
    () =>
      rows.transactions?.filter(
        (row) => String(row.occurred_at ?? "").slice(0, 7) === month,
      ) ?? [],
    [rows.transactions, month],
  );
  const spent = monthRows
    .filter((row) => row.type === "expense")
    .reduce((total, row) => total + amount(row.amount_sen), 0);
  const income = monthRows
    .filter((row) => row.type === "income")
    .reduce((total, row) => total + amount(row.amount_sen), 0);
  const expenses = monthRows.filter((row) => row.type === "expense");
  const categories = rows.categories ?? EMPTY_ROWS;
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of expenses)
      map.set(
        String(row.category_id ?? "none"),
        (map.get(String(row.category_id ?? "none")) ?? 0) +
          amount(row.amount_sen),
      );
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([categoryId, total]) => {
        const category = categories.find((item) => item.id === categoryId);
        return {
          name: String(
            category?.name ??
              (categoryId === "none" ? "Uncategorised" : "Category"),
          ),
          colour: String(category?.colour ?? "#9FB3A0"),
          total,
        };
      });
  }, [expenses, categories]);
  const accountBalances = useMemo(
    () =>
      (rows.accounts ?? [])
        .map((account) => {
          let balance =
            amount(account.opening_balance_sen) *
            (account.type === "credit" ? -1 : 1);
          for (const tx of rows.transactions ?? []) {
            const value = amount(tx.amount_sen);
            if (tx.account_id === account.id) {
              if (tx.type === "income") balance += value;
              else if (
                tx.type === "expense" ||
                tx.type === "transfer" ||
                tx.type === "repayment"
              )
                balance -= value;
            }
            if (
              tx.to_account_id === account.id &&
              (tx.type === "transfer" || tx.type === "repayment")
            )
              balance += value;
          }
          return { ...account, balance };
        })
        .sort((a, b) => amount(b.balance) - amount(a.balance)),
    [rows.accounts, rows.transactions],
  );

  const recent = useMemo(
    () =>
      [...(rows.transactions ?? [])]
        .sort((a, b) =>
          String(b.occurred_at).localeCompare(String(a.occurred_at)),
        )
        .slice(0, 8),
    [rows.transactions],
  );
  const chartData = useMemo(() => {
    if (!month) return [];
    const anchor = new Date(`${month}-01T00:00:00`);
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        anchor.getFullYear(),
        anchor.getMonth() - 5 + index,
        1,
      );
      const value = (rows.transactions ?? [])
        .filter(
          (row) =>
            String(row.occurred_at ?? "").slice(0, 7) === localMonth(date) &&
            row.type === "expense",
        )
        .reduce((sum, row) => sum + amount(row.amount_sen), 0);
      return {
        label: date.toLocaleDateString("en", { month: "short" }),
        value,
      };
    });
  }, [rows.transactions, month]);

  const linkBrowser = useCallback(async () => {
    const attempt = ++linkAttempt.current;
    setError("");
    setQr("");
    setExpiresAt("");
    setLinkMessage("Preparing a secure link…");
    try {
      const result = await startLink(
        browserLabel(),
        (_text, image, expiry) => {
          setQr(image);
          setExpiresAt(expiry);
          setLinkNow(Date.now());
          setLinkMessage("Scan this code with SenSei on your phone.");
        },
        setLinkMessage,
        () => linkAttempt.current !== attempt,
      );
      if (linkAttempt.current !== attempt) return;
      if (result === "expired") {
        setLinkMessage("expired");
        return;
      }
      if (result === "missing") {
        setLinkMessage("missing");
        return;
      }
      if (result === "linked") {
        const current = getBrowserAuth().currentUser;
        const stored = current ? await getKey(current.uid) : null;
        if (current && stored) {
          setUser(current);
          setKey(stored);
          setLoading(true);
          await pullAll(current.uid, stored.kid, stored.dek);
          await refreshRows(current.uid);
          setLoading(false);
        }
        setQr("");
        setLinkMessage("");
        setToast("Browser linked");
      }
    } catch (e) {
      if (linkAttempt.current !== attempt) return;
      setLoading(false);
      setLinkMessage("");
      setError(
        e instanceof Error ? e.message : "Could not link this browser.",
      );
    }
  }, [refreshRows]);
  useEffect(() => {
    if (loading || (user && key) || autoLinkStarted.current) return;
    autoLinkStarted.current = true;
    void linkBrowser();
  }, [loading, user, key, linkBrowser]);
  const cancelQr = () => {
    linkAttempt.current += 1;
    setQr("");
    setLinkMessage("");
  };
  const expiredQr = Boolean(
    qr &&
      expiresAt &&
      (linkMessage === "expired" ||
        (linkNow > 0 && linkNow >= Date.parse(expiresAt))),
  );
  const refreshableQr = expiredQr || linkMessage === "missing";
  const secondsLeft = expiresAt
    ? Math.max(0, Math.ceil((Date.parse(expiresAt) - linkNow) / 1000))
    : 0;
  const refreshQr = () => {
    cancelQr();
    void linkBrowser();
  };
  const refreshEverything = async () => {
    if (!key) return;
    setBusy(true);
    setError("");
    try {
      await pullAll(key.uid, key.kid, key.dek);
      await refreshRows(key.uid);
      setToast("Your data is up to date");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  };
  const signOutBrowser = async () => {
    if (key) await clearVault(key.uid);
    setKey(null);
    setRows({} as Record<TableName, Row[]>);
    await signOut(getBrowserAuth());
  };
  const saveRow = async (table: TableName, row: Row, original?: Row) => {
    if (!key) return;
    setBusy(true);
    setError("");
    try {
      if (table === "settings") {
        if (!String(row.key ?? "").trim())
          throw new Error("Enter a preference key.");
        if (typeof row.value === "string") JSON.parse(row.value);
      }
      if (table === "transactions") row = { ...row, updated_at: nowIso() };
      if (original && keyOf(table, original) !== keyOf(table, row))
        await deleteAndPush(key.uid, key.kid, key.dek, table, original);
      await saveAndPush(key.uid, key.kid, key.dek, table, row);
      await refreshRows(key.uid);
      setEditing(null);
      setToast("Saved and synced");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this record.");
    } finally {
      setBusy(false);
    }
  };
  const deleteRow = async (table: TableName, row: Row) => {
    if (
      !key ||
      !window.confirm(
        `Delete this ${TABLE_LABELS[table].toLowerCase()} record?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const current = rows;
      const remove = async (childTable: TableName, child: Row) => {
        if (childTable === "receipts" && child.file_ref) {
          try {
            await deleteObject(
              ref(getBrowserStorage(), String(child.file_ref)),
            );
          } catch {
            /* The encrypted object may already have been removed. */
          }
        }
        await deleteAndPush(key.uid, key.kid, key.dek, childTable, child);
      };
      const update = async (childTable: TableName, child: Row, patch: Row) =>
        saveAndPush(key.uid, key.kid, key.dek, childTable, {
          ...child,
          ...patch,
        });
      if (table === "accounts") {
        const referenced =
          (current.transactions ?? []).some(
            (item) =>
              item.account_id === row.id || item.to_account_id === row.id,
          ) ||
          (current.commitments ?? []).some(
            (item) => item.account_id === row.id,
          ) ||
          (current.pots ?? []).some(
            (item) => item.linked_account_id === row.id,
          );
        if (referenced)
          throw new Error(
            "Reassign this account’s transactions, commitments, and pots before deleting it.",
          );
      }
      if (table === "transactions") {
        for (const receipt of (current.receipts ?? []).filter(
          (item) => item.transaction_id === row.id,
        ))
          await remove("receipts", receipt);
        for (const payment of (current.commitment_payments ?? []).filter(
          (item) => item.transaction_id === row.id,
        ))
          await update("commitment_payments", payment, {
            transaction_id: null,
          });
      }
      if (table === "commitments")
        for (const child of (current.commitment_payments ?? []).filter(
          (item) => item.commitment_id === row.id,
        ))
          await remove("commitment_payments", child);
      if (table === "pots")
        for (const child of (current.pot_updates ?? []).filter(
          (item) => item.pot_id === row.id,
        ))
          await remove("pot_updates", child);
      if (table === "merchants") {
        for (const child of (current.merchant_printed_names ?? []).filter(
          (item) => item.merchant_id === row.id,
        ))
          await remove("merchant_printed_names", child);
        for (const child of (current.transactions ?? []).filter(
          (item) => item.merchant_id === row.id,
        ))
          await update("transactions", child, { merchant_id: null });
      }
      if (table === "categories") {
        for (const child of (current.transactions ?? []).filter(
          (item) => item.category_id === row.id,
        ))
          await update("transactions", child, { category_id: null });
        for (const child of (current.commitments ?? []).filter(
          (item) => item.category_id === row.id,
        ))
          await update("commitments", child, { category_id: null });
        for (const child of (current.merchants ?? []).filter(
          (item) => item.default_category_id === row.id,
        ))
          await update("merchants", child, { default_category_id: null });
      }
      await remove(table, row);
      await refreshRows(key.uid);
      setToast("Record deleted");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete this record.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!user || !key)
    return (
      <main className="link-page">
        <section className="link-card">
          <div className="brand">
            <span className="brand-mark">S</span> SenSei
          </div>
          <div className="eyebrow" style={{ marginTop: 38 }}>
            PRIVATE FINANCE WORKSPACE
          </div>
          <h1>
            See your money
            <br />
            with more clarity.
          </h1>
          <p className="subtitle">
            Link your phone to open your encrypted SenSei data in this browser.
            Your data key stays in your browser.
          </p>
          {error && <div className="inline-error">{error}</div>}
          {!qr ? (
            <div className="qr-preparing" role="status" aria-live="polite">
              <span className="qr-spinner" aria-hidden="true" />
              <span>{error ? "Could not create a link. Reload to try again." : linkMessage || "Preparing your secure QR code…"}</span>
            </div>
          ) : (
            <div className="qr-layout">
              <div className={`qr-box${refreshableQr ? " expired" : ""}`}>
                <Image
                  src={qr}
                  alt="One-time SenSei browser link QR code"
                  width={256}
                  height={256}
                  unoptimized
                />
                {refreshableQr && (
                  <div className="qr-expired-overlay" role="status">
                    <div className="qr-expired-content">
                      <strong>{expiredQr ? "QR code expired" : "Link unavailable"}</strong>
                      <span>{expiredQr ? "Create a fresh code to continue." : "The server could not find this code. Try a fresh one."}</span>
                      <button className="button primary" onClick={refreshQr}>
                        ↻ &nbsp; Refresh code
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="steps">
                <div className="step">
                  <span className="step-num">1</span>
                  <div>
                    <strong>Open SenSei on your phone</strong>
                    <p>Go to Backup & sync, then choose Link a browser.</p>
                  </div>
                </div>
                <div className="step">
                  <span className="step-num">2</span>
                  <div>
                    <strong>Scan and approve</strong>
                    <p>
                      Review the phone confirmation before linking. {expiredQr
                        ? "This code has expired."
                        : linkMessage === "missing"
                          ? "The server could not find this link session."
                          : `Code expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}.`}
                    </p>
                  </div>
                </div>
                <div className="step">
                  <span className="step-num">3</span>
                  <div>
                    <strong>{refreshableQr ? "Ready for a new code" : linkMessage || "Waiting for your phone…"}</strong>
                    <p>
                      Your browser receives the data key only after approval.
                    </p>
                  </div>
                </div>
                <button className="button" onClick={cancelQr}>
                  Cancel link
                </button>
              </div>
            </div>
          )}
          {!qr && (
            <p className="security-line">
              ⌑ &nbsp; End-to-end encrypted · Decrypted only on this device
            </p>
          )}
        </section>
        <div className="link-footer">
          SenSei · Your financial data remains yours.
        </div>
      </main>
    );

  if (loading)
    return (
      <div className="loading-screen">
        <div className="brand">
          <span className="brand-mark">S</span> SenSei
        </div>
        <p>Unlocking your private dashboard…</p>
      </div>
    );

  const pageName = selectedTable
    ? TABLE_LABELS[selectedTable]
    : screen === "summary"
      ? "Summary"
      : screen === "reports"
        ? "Reports"
        : screen === "budgets"
          ? "Budgets"
          : screen === "profile"
            ? "Profile"
            : screen === "preferences"
              ? "Preferences"
              : "Linked browsers";
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">S</span> SenSei
        </div>
        {groups.map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-label">{group.title}</div>
            {group.items.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={screen === item.id}
                onClick={() => {
                  setScreen(item.id);
                  setError("");
                  setSearch("");
                }}
              />
            ))}
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="secure-note">
            ⌑ &nbsp; Your financial data is encrypted on our servers and
            decrypted only in this browser.
          </div>
          <button
            className="nav-item"
            onClick={refreshEverything}
            disabled={busy}
          >
            <span className="nav-symbol">↻</span>{" "}
            {busy ? "Syncing…" : "Sync now"}
          </button>
          <button className="nav-item" onClick={signOutBrowser}>
            <span className="nav-symbol">⇥</span> Sign out
          </button>
        </div>
      </aside>
      <div className="content">
        <div className="mobile-top">
          {groups
            .flatMap((group) => group.items)
            .map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={screen === item.id}
                onClick={() => {
                  setScreen(item.id);
                  setError("");
                }}
              />
            ))}
        </div>
        <header className="topbar">
          <div className="crumb">
            Workspace <span style={{ color: "#c5cbc6" }}> / </span> {pageName}
          </div>
          <div className="user-chip">
            <div className="avatar">
              {(user.displayName || user.email || "S")
                .slice(0, 1)
                .toUpperCase()}
            </div>
            <div className="user-meta">
              <strong>{user.displayName || "SenSei member"}</strong>
              <span>{user.email}</span>
            </div>
            <button
              className="icon-button"
              aria-label="Refresh dashboard"
              onClick={refreshEverything}
            >
              ↻
            </button>
          </div>
        </header>
        <main className="page">
          {error && <div className="inline-error">{error}</div>}
          {screen === "summary" && (
            <SummaryScreen
              month={month}
              setMonth={setMonth}
              spent={spent}
              income={income}
              categories={categoryTotals}
              accounts={accountBalances}
              recent={recent}
              chartData={chartData}
              rows={rows}
              onNavigate={setScreen}
            />
          )}
          {screen === "reports" && (
            <ReportsScreen
              month={month}
              setMonth={setMonth}
              rows={rows}
              categories={categoryTotals}
              spent={spent}
              income={income}
            />
          )}
          {screen === "budgets" && (
            <BudgetsScreen
              month={month}
              rows={rows}
              spent={spent}
              onEdit={(table, row) =>
                setEditing({ table, row: { ...row }, original: row })
              }
              onAdd={() =>
                setEditing({ table: "settings", row: defaults("settings") })
              }
            />
          )}
          {selectedTable && (
            <RecordsScreen
              table={selectedTable}
              rows={rows[selectedTable] ?? []}
              query={search}
              setQuery={setSearch}
              onAdd={() =>
                setEditing({
                  table: selectedTable,
                  row: defaults(selectedTable),
                })
              }
              onEdit={(row) =>
                setEditing({
                  table: selectedTable,
                  row: { ...row },
                  original: row,
                })
              }
              onDelete={(row) => deleteRow(selectedTable, row)}
              onReceipt={async (row) => {
                try {
                  await showReceipt(row, key.uid, key.dek, setReceiptUrl);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not open receipt.",
                  );
                }
              }}
            />
          )}
          {screen === "preferences" && (
            <PreferencesScreen
              rows={rows.settings ?? []}
              onEdit={(row) =>
                setEditing({
                  table: "settings",
                  row: { ...row },
                  original: row,
                })
              }
              onAdd={() =>
                setEditing({ table: "settings", row: defaults("settings") })
              }
              onNavigate={setScreen}
            />
          )}
          {screen === "profile" && (
            <ProfileScreen
              user={user}
              value={profile}
              setValue={setProfile}
              onSave={async () => {
                try {
                  await updateProfile(user, {
                    displayName: profile.displayName || null,
                    photoURL: profile.photoUrl || null,
                  });
                  await api("/users/me", {
                    displayName: profile.displayName || undefined,
                    photoUrl: profile.photoUrl || undefined,
                  });
                  const previous = (rows.settings ?? []).find(
                    (row) => row.key === "displayName",
                  );
                  await saveAndPush(user.uid, key.kid, key.dek, "settings", {
                    ...(previous ?? {}),
                    key: "displayName",
                    value: JSON.stringify(profile.displayName || null),
                  });
                  await refreshRows(user.uid);
                  setToast("Profile updated");
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not update profile.",
                  );
                }
              }}
              onDelete={async () => {
                if (
                  !window.confirm(
                    "Delete your SenSei cloud account data? This removes encrypted sync records, key envelopes, linked browsers, and kept receipts. Data on your phone remains.",
                  )
                )
                  return;
                setBusy(true);
                try {
                  await api("/users/me", {}, "DELETE");
                  await clearVault(user.uid);
                  await signOut(getBrowserAuth());
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not delete cloud data.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
          {screen === "devices" && (
            <DevicesScreen
              sessions={sessions}
              loadSessions={loadSessions}
              onRevoke={async (session) => {
                if (!window.confirm(`Sign out ${session.label}?`)) return;
                await api(
                  `/key-links/sessions/${encodeURIComponent(session.id)}`,
                  {},
                  "DELETE",
                );
                setSessions((items) =>
                  items.filter((item) => item.id !== session.id),
                );
                const claims = (await user.getIdTokenResult()).claims;
                if (claims.webSessionId === session.id) await signOutBrowser();
                else setToast("Browser session revoked");
              }}
            />
          )}
          {selectedTable === "receipts" && (
            <p className="subtitle" style={{ marginTop: 15 }}>
              Kept receipt images are encrypted in cloud storage. Use View to
              decrypt them in this browser. New receipt capture and upload are
              available in the phone app.
            </p>
          )}
        </main>
      </div>
      {editing && (
        <RecordEditor
          table={editing.table}
          initial={editing.row}
          onClose={() => setEditing(null)}
          onSave={(row) => saveRow(editing.table, row, editing.original)}
          busy={busy}
        />
      )}
      {receiptUrl && (
        <div
          className="overlay"
          onClick={() => {
            URL.revokeObjectURL(receiptUrl);
            setReceiptUrl("");
          }}
        >
          <div
            className="receipt-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="button"
              onClick={() => {
                URL.revokeObjectURL(receiptUrl);
                setReceiptUrl("");
              }}
            >
              Close
            </button>
            <Image
              src={receiptUrl}
              alt="Decrypted receipt"
              width={900}
              height={900}
              unoptimized
            />
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: Screen; label: string; symbol: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item${active ? " active" : ""}`} onClick={onClick}>
      <span className="nav-symbol">{item.symbol}</span>
      {item.label}
    </button>
  );
}

function SummaryScreen({
  month,
  setMonth,
  spent,
  income,
  categories,
  accounts,
  recent,
  chartData,
  rows,
  onNavigate,
}: {
  month: string;
  setMonth: (value: string) => void;
  spent: number;
  income: number;
  categories: { name: string; colour: string; total: number }[];
  accounts: Row[];
  recent: Row[];
  chartData: { label: string; value: number }[];
  rows: Record<TableName, Row[]>;
  onNavigate: (value: Screen) => void;
}) {
  const net = accounts.reduce(
    (total, account) => total + amount(account.balance),
    0,
  );
  const totalAssets = accounts
    .filter((account) => account.type !== "credit")
    .reduce((sum, account) => sum + amount(account.balance), 0);
  const debt = Math.abs(
    accounts
      .filter((account) => account.type === "credit")
      .reduce((sum, account) => sum + Math.min(0, amount(account.balance)), 0),
  );
  const top = categories[0];
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">YOUR MONEY AT A GLANCE</div>
          <h1>Good to see you.</h1>
          <div className="subtitle">
            A calm overview of your finances and what changed recently.
          </div>
        </div>
        <label className="date-control">
          ◷{" "}
          <input
            aria-label="Choose month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            style={{ border: 0, outline: 0, width: 125 }}
          />
        </label>
      </div>
      <div className="grid metric-grid">
        <Metric
          label="Net position"
          value={money(net)}
          note={`${accounts.length} accounts included`}
        />
        <Metric
          label="Income this month"
          value={money(income)}
          note={`${(rows.transactions ?? []).filter((row) => row.type === "income" && String(row.occurred_at).slice(0, 7) === month).length} income records`}
          tone="positive"
        />
        <Metric
          label="Spending this month"
          value={money(spent)}
          note={`${(rows.transactions ?? []).filter((row) => row.type === "expense" && String(row.occurred_at).slice(0, 7) === month).length} purchases`}
          tone="negative"
        />
        <Metric
          label="Available after debt"
          value={money(totalAssets - debt)}
          note={`${money(debt)} card debt tracked`}
        />
      </div>
      <div className="grid main-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Spending trend</div>
              <div className="card-description">
                Expenses over the last six months
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="dot" style={{ background: "var(--green)" }} />
                Expenses
              </span>
            </div>
          </div>
          <TrendChart values={chartData} />
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Spending breakdown</div>
              <div className="card-description">
                Where your money went this month
              </div>
            </div>
            <button
              className="icon-button"
              onClick={() => onNavigate("reports")}
            >
              ↗
            </button>
          </div>
          <Donut categories={categories} total={spent} />
        </section>
      </div>
      <div className="grid lower-grid">
        <section className="card table-card">
          <div className="card-head">
            <div>
              <div className="card-title">Recent transactions</div>
              <div className="card-description">
                Latest activity across your accounts
              </div>
            </div>
            <button
              className="button"
              onClick={() => onNavigate("transactions")}
            >
              View all
            </button>
          </div>
          <TransactionTable
            rows={recent}
            accounts={rows.accounts ?? []}
            categories={rows.categories ?? []}
            merchants={rows.merchants ?? []}
          />
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Your accounts</div>
              <div className="card-description">
                {accounts.length} active accounts
              </div>
            </div>
            <button
              className="icon-button"
              onClick={() => onNavigate("accounts")}
            >
              ↗
            </button>
          </div>
          <div className="account-list">
            {accounts.slice(0, 6).map((account) => (
              <div className="account-row" key={String(account.id)}>
                <div className="account-icon">
                  {String(account.name || "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
                <div className="account-info">
                  <strong>{String(account.name || "Unnamed account")}</strong>
                  <span>
                    {String(account.type || "account")}{" "}
                    {account.last4 ? `·· ${account.last4}` : ""}
                  </span>
                </div>
                <div className="account-balance">
                  {money(amount(account.balance))}
                </div>
              </div>
            ))}
            {!accounts.length && (
              <div className="empty">Add an account to see balances.</div>
            )}
          </div>
          {top && (
            <div className="banner" style={{ marginTop: 20 }}>
              Top category · {top.name} · {money(top.total)}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="card">
      <div className="metric-label">
        <i
          className="dot"
          style={{
            background:
              tone === "positive"
                ? "var(--green)"
                : tone === "negative"
                  ? "var(--coral)"
                  : "var(--gold)",
          }}
        />
        {label}
      </div>
      <div className={`metric-value ${tone ?? ""}`}>{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

function TrendChart({
  values,
}: {
  values: { label: string; value: number }[];
}) {
  const width = 640,
    height = 235,
    left = 20,
    bottom = 25,
    top = 12;
  const max = Math.max(1, ...values.map((item) => item.value));
  const points = values.map((item, index) => ({
    x: left + index * ((width - left * 2) / Math.max(1, values.length - 1)),
    y: top + (height - top - bottom) * (1 - item.value / max),
  }));
  const path = points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
  const fillPath = `${path} L ${points.at(-1)?.x ?? 0} ${height - bottom} L ${points[0]?.x ?? 0} ${height - bottom} Z`;
  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Expenses over six months"
      >
        <line className="grid-line" x1="0" x2={width} y1="58" y2="58" />
        <line className="grid-line" x1="0" x2={width} y1="115" y2="115" />
        <line className="grid-line" x1="0" x2={width} y1="172" y2="172" />
        <path className="chart-area" d={fillPath} />
        <path className="chart-line" d={path} />
        {points.map((point, index) => (
          <g key={values[index].label}>
            <circle className="chart-dot" cx={point.x} cy={point.y} r="4" />
            <text
              className="chart-label"
              x={point.x}
              y={height - 4}
              textAnchor="middle"
            >
              {values[index].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Donut({
  categories,
  total,
}: {
  categories: { name: string; colour: string; total: number }[];
  total: number;
}) {
  const colors = categories.map((item) => item.colour);
  const size = 160,
    radius = 55,
    circumference = 2 * Math.PI * radius;
  return (
    <div className="donut-row">
      <svg
        className="donut"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Total spending ${money(total)}`}
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#f0f1ee"
          strokeWidth="18"
        />
        <g transform="rotate(-90 80 80)">
          {categories.map((item, index) => {
            const length = total ? (item.total / total) * circumference : 0;
            const offset = categories
              .slice(0, index)
              .reduce(
                (sum, previous) =>
                  sum + (total ? (previous.total / total) * circumference : 0),
                0,
              );
            return (
              <circle
                key={item.name}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={colors[index]}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </g>
        <text x="80" y="77" textAnchor="middle" fontSize="9" fill="#78817b">
          THIS MONTH
        </text>
        <text
          x="80"
          y="95"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="#202a26"
        >
          {money(total)}
        </text>
      </svg>
      <div className="category-list">
        {categories.slice(0, 4).map((item) => (
          <div className="category-row" key={item.name}>
            <div className="category-label">
              <i className="dot" style={{ background: item.colour }} />
              {item.name}
            </div>
            <div className="category-amount">{money(item.total)}</div>
            <div className="progress">
              <span
                style={{
                  width: `${total ? Math.max(2, (item.total / total) * 100) : 0}%`,
                  background: item.colour,
                }}
              />
            </div>
          </div>
        ))}
        {!categories.length && (
          <div className="empty">No spending in this period.</div>
        )}
      </div>
    </div>
  );
}

function ReportsScreen({
  month,
  setMonth,
  rows,
  categories,
  spent,
  income,
}: {
  month: string;
  setMonth: (v: string) => void;
  rows: Record<TableName, Row[]>;
  categories: { name: string; colour: string; total: number }[];
  spent: number;
  income: number;
}) {
  const commitments = rows.commitments ?? [];
  const budgetRecords = (rows.settings ?? []).filter((row) =>
    ["monthlyBudgetSen", "budgetFromPayday", "paydayDay"].includes(
      String(row.key),
    ),
  );
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">INSIGHTS & TRENDS</div>
          <h1>Reports</h1>
          <div className="subtitle">
            Explore the detail behind your income, spending, budgets and
            commitments.
          </div>
        </div>
        <label className="date-control">
          Period{" "}
          <input
            aria-label="Report month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            style={{ border: 0, outline: 0, width: 125 }}
          />
        </label>
      </div>
      <div className="grid metric-grid">
        <Metric
          label="Income"
          value={money(income)}
          note="Selected month"
          tone="positive"
        />
        <Metric
          label="Expenses"
          value={money(spent)}
          note="Selected month"
          tone="negative"
        />
        <Metric
          label="Net cash flow"
          value={money(income - spent)}
          note="Income less expenses"
        />
        <Metric
          label="Tracked commitments"
          value={String(commitments.length)}
          note={`${commitments.filter((row) => !row.ended_at).length} currently active`}
        />
      </div>
      <div className="grid main-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Category breakdown</div>
              <div className="card-description">
                Expenses for{" "}
                {new Date(`${month}-01`).toLocaleDateString("en-MY", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <Donut categories={categories} total={spent} />
        </section>
        <section className="card">
          <div className="card-title">Budget settings</div>
          <div className="card-description" style={{ marginBottom: 17 }}>
            Your personal limits and payday configuration.
          </div>
          {budgetRecords.length ? (
            budgetRecords.map((row) => (
              <div className="setting-row" key={String(row.key)}>
                <div>
                  <strong>{LABELS[String(row.key)] ?? String(row.key)}</strong>
                  <span>{String(row.value)}</span>
                </div>
                <span className="pill">Synced</span>
              </div>
            ))
          ) : (
            <div className="empty">No budget settings are synced yet.</div>
          )}
          <div className="banner" style={{ marginTop: 15 }}>
            Set a category limit in Categories or your monthly limit in
            Preferences.
          </div>
        </section>
      </div>
      <section className="card table-card">
        <div className="card-head">
          <div>
            <div className="card-title">Commitment schedule</div>
            <div className="card-description">
              Recurring bills, loans and subscriptions
            </div>
          </div>
        </div>
        <DataTable table="commitments" rows={commitments} />
      </section>
    </>
  );
}

function BudgetsScreen({
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
          ＋ Set monthly budget
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
              onClick={() =>
                budgetRow ? onEdit("settings", budgetRow) : onAdd()
              }
            >
              ✎
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
            ＋ Add category limit
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

function TransactionTable({
  rows,
  accounts,
  categories,
  merchants,
}: {
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
            return (
              <tr key={String(row.__recordId ?? row.id)}>
                <td>
                  <div className="row-title">
                    {String(
                      merchant?.display_name ??
                        row.note ??
                        row.type ??
                        "Transaction",
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                    {String(row.type ?? "")}
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

function RecordsScreen({
  table,
  rows,
  query,
  setQuery,
  onAdd,
  onEdit,
  onDelete,
  onReceipt,
}: {
  table: TableName;
  rows: Row[];
  query: string;
  setQuery: (value: string) => void;
  onAdd: () => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
  onReceipt: (row: Row) => void;
}) {
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          JSON.stringify(row).toLowerCase().includes(query.toLowerCase()) &&
          (filter === "all" ||
            String(row.type ?? row.status ?? row.kind) === filter),
      ),
    [rows, query, filter],
  );
  const filterValues = [
    ...new Set(
      rows
        .map((row) => String(row.type ?? row.status ?? row.kind ?? ""))
        .filter(Boolean),
    ),
  ];
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
        <button className="button primary" onClick={onAdd}>
          ＋ Add {table === "transactions" ? "transaction" : "record"}
        </button>
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
        <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>
          {filtered.length} records
        </span>
      </div>
      <section className="card table-card">
        <DataTable
          table={table}
          rows={filtered}
          onEdit={onEdit}
          onDelete={onDelete}
          onReceipt={onReceipt}
        />
      </section>
    </>
  );
}

function DataTable({
  table,
  rows,
  onEdit,
  onDelete,
  onReceipt,
}: {
  table: TableName;
  rows: Row[];
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
  onReceipt?: (row: Row) => void;
}) {
  const columns = useMemo(() => {
    if (table === "transactions")
      return [
        "occurred_at",
        "type",
        "amount_sen",
        "account_id",
        "category_id",
        "note",
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
            {(onEdit || onDelete || onReceipt) && (
              <th style={{ textAlign: "right" }}>Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.__recordId ?? row.id ?? keyOf(table, row))}>
              {columns.map((field) => (
                <td key={field}>{formatCell(field, row[field])}</td>
              ))}
              {(onEdit || onDelete || onReceipt) && (
                <td>
                  <div className="table-actions">
                    {table === "receipts" && onReceipt && (
                      <button className="button" onClick={() => onReceipt(row)}>
                        View
                      </button>
                    )}
                    {onEdit && (
                      <button
                        className="icon-button"
                        aria-label="Edit record"
                        onClick={() => onEdit(row)}
                      >
                        ✎
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="icon-button"
                        aria-label="Delete record"
                        onClick={() => onDelete(row)}
                      >
                        ⌫
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
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
    return money(amount(value));
  if (field.endsWith("_at") || field === "due_date") return dateLabel(value);
  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return stringValue.length > 46 ? `${stringValue.slice(0, 43)}…` : stringValue;
}

function RecordEditor({
  table,
  initial,
  onClose,
  onSave,
  busy,
}: {
  table: TableName;
  initial: Row;
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
  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow">{TABLE_LABELS[table].toUpperCase()}</div>
            <h2>{initial.__recordId ? "Edit record" : "Add a record"}</h2>
            <div className="subtitle">
              Changes are encrypted before they sync.
            </div>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        {formError && <div className="inline-error">{formError}</div>}
        <div className="form-grid">
          {keys.map((field) => (
            <div
              className={`field ${["note", "extracted_text", "body", "value", "meta", "location_captured_at"].includes(field) ? "full" : ""}`}
              key={field}
            >
              <label>{LABELS[field] ?? field.replaceAll("_", " ")}</label>
              {["note", "extracted_text", "body", "value", "meta"].includes(
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

function PreferencesScreen({
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
  const preferences = [
    "monthlyBudgetSen",
    "paydayDay",
    "salaryAmountSen",
    "salaryAccountId",
    "budgetFromPayday",
    "hideBalances",
    "keepReceiptsInCloud",
    "notifyLimitWarnings",
    "notifyCommitments",
    "notifyPayday",
    "displayName",
  ];
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
          {[
            "General",
            "Budget & payday",
            "Privacy",
            "Reminders",
            "Raw settings",
          ].map((label, index) => (
            <div
              key={label}
              className={`nav-item ${index === 0 ? "active" : ""}`}
            >
              {label}
            </div>
          ))}
        </div>
        <section className="card settings-panel">
          <div className="card-head">
            <div>
              <div className="card-title">Finance & privacy</div>
              <div className="card-description">
                Synced settings from your account.
              </div>
            </div>
            <button className="button" onClick={onAdd}>
              ＋ Add preference
            </button>
          </div>
          {rows
            .filter((row) => preferences.includes(String(row.key)))
            .map((row) => (
              <div className="setting-row" key={String(row.key)}>
                <div>
                  <strong>{LABELS[String(row.key)] ?? String(row.key)}</strong>
                  <span>{String(row.value)}</span>
                </div>
                <button className="icon-button" onClick={() => onEdit(row)}>
                  ✎
                </button>
              </div>
            ))}
          {!rows.some((row) => preferences.includes(String(row.key))) && (
            <div className="empty">
              No shared preferences have synced yet. Add one or change it in the
              SenSei phone app.
            </div>
          )}
          <div className="banner">
            Phone-only controls such as biometrics, PIN, location capture, and
            native notifications are managed in the SenSei app.
          </div>
          <div className="setting-row">
            <div>
              <strong>Receipt storage</strong>
              <span>
                New receipts are captured and uploaded from your phone.
              </span>
            </div>
            <button className="button" onClick={() => onNavigate("receipts")}>
              View kept receipts
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function ProfileScreen({
  user,
  value,
  setValue,
  onSave,
  onDelete,
}: {
  user: User;
  value: { displayName: string; photoUrl: string };
  setValue: (v: { displayName: string; photoUrl: string }) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">YOUR SENSei ACCOUNT</div>
          <h1>Profile & account</h1>
          <div className="subtitle">
            Manage your web profile and cloud account data.
          </div>
        </div>
      </div>
      <section className="card" style={{ maxWidth: 760 }}>
        <div className="profile-header">
          <div className="profile-avatar">
            {(value.displayName || user.email || "S").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="card-title">
              {value.displayName || "Your profile"}
            </div>
            <div className="card-description">{user.email}</div>
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: 25 }}>
          <div className="field">
            <label>Display name</label>
            <input
              value={value.displayName}
              onChange={(event) =>
                setValue({ ...value, displayName: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Profile photo URL</label>
            <input
              value={value.photoUrl}
              onChange={(event) =>
                setValue({ ...value, photoUrl: event.target.value })
              }
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="button primary" onClick={onSave}>
            Save profile
          </button>
        </div>
      </section>
      <section
        className="card"
        style={{ maxWidth: 760, marginTop: 16, borderColor: "#edd9d5" }}
      >
        <div className="card-title">Delete cloud data</div>
        <div className="card-description">
          Permanently removes encrypted sync records, recovery key, kept
          receipts, and linked browsers from SenSei cloud storage. Local phone
          data remains on your devices.
        </div>
        <button
          className="button danger"
          style={{ marginTop: 16 }}
          onClick={onDelete}
        >
          Delete cloud account data
        </button>
      </section>
    </>
  );
}

function DevicesScreen({
  sessions,
  loadSessions,
  onRevoke,
}: {
  sessions: Session[];
  loadSessions: () => void;
  onRevoke: (session: Session) => void;
}) {
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">ACCOUNT ACCESS</div>
          <h1>Linked browsers</h1>
          <div className="subtitle">
            A phone can sign out any browser that has access to your encrypted
            data.
          </div>
        </div>
        <button className="button" onClick={loadSessions}>
          ↻ Refresh
        </button>
      </div>
      <section className="card">
        {sessions.map((session) => (
          <div className="setting-row" key={session.id}>
            <div>
              <strong>{session.label}</strong>
              <span>Linked {dateLabel(session.createdAt)}</span>
              <span className="muted">Session {session.id.slice(0, 8)}…</span>
            </div>
            <button className="button danger" onClick={() => onRevoke(session)}>
              Sign out
            </button>
          </div>
        ))}
        {!sessions.length && (
          <div className="empty">No active linked browsers were found.</div>
        )}
      </section>
    </>
  );
}

async function showReceipt(
  row: Row,
  uid: string,
  dek: Uint8Array,
  setUrl: (url: string) => void,
) {
  const storagePath = String(row.file_ref ?? "");
  if (!storagePath || !Number(row.kept_in_cloud))
    throw new Error("This receipt has no kept cloud image.");
  const url = await getDownloadURL(ref(getBrowserStorage(), storagePath));
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not download the receipt file.");
  let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(
    await response.arrayBuffer(),
  );
  if (storagePath.endsWith(".bin"))
    bytes = decryptBlob(
      dek,
      { uid, kind: "receipt", id: String(row.id) },
      bytes,
    );
  const safeBytes = new Uint8Array(bytes.length);
  safeBytes.set(bytes);
  const blob = new Blob([safeBytes.buffer], {
    type: storagePath.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
  });
  setUrl(URL.createObjectURL(blob));
}
