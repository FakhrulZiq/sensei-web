"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { deleteObject, ref } from "firebase/storage";
import { getBrowserAuth, getBrowserStorage } from "../lib/firebase";
import { api, ApiError } from "../lib/api";
import { startLink } from "../lib/link";
import { deleteAndPush, pullAll, saveAndPush } from "../lib/sync";
import { clearVault, getKey, listRows } from "../lib/vault";
import { EMPTY_CATALOG, loadCatalog, type CatalogManifest } from "../lib/catalog";
import {
  TABLE_LABELS,
  TABLES,
  keyOf,
  type TableName,
} from "../lib/tables";

import { amount, monthNow, nowIso, pad } from "./_workspace/format";
import { defaults } from "./_workspace/defaults";
import { groups, isScreen } from "./_workspace/navigation";
import { WorkspaceShell } from "./_workspace/workspace-shell";
import type { Row, Screen, Session } from "./_workspace/types";
import { SummaryScreen } from "./_workspace/screens/home";
import { LinkScreen } from "./_workspace/screens/link";
import { ReportsScreen } from "./_workspace/screens/reports";
import { WeeklyRecapScreen } from "./_workspace/screens/weekly-recap";
import { PreviewScreen } from "./_workspace/screens/preview";
import { PlanningDocumentScreen } from "./_workspace/screens/document";
import { BudgetsScreen } from "./_workspace/screens/budgets";
import { RecordsScreen } from "./_workspace/screens/records";
import { RecordEditor } from "./_workspace/screens/record-editor";
import { PreferencesScreen } from "./_workspace/screens/preferences";
import { ProfileScreen } from "./_workspace/screens/profile";
import { DevicesScreen } from "./_workspace/screens/devices";
import { showReceipt } from "./_workspace/receipt";

const EMPTY_ROWS: Row[] = [];
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

export default function Dashboard({ initialScreen = "summary" }: { initialScreen?: Screen }) {
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
  const [catalog, setCatalog] = useState<CatalogManifest>(EMPTY_CATALOG);
  const [screen, setScreenState] = useState<Screen>(initialScreen);
  const setScreen = useCallback((next: Screen) => {
    setScreenState(next);
    window.history.pushState({}, "", next === "summary" ? "/" : `/${next}`);
  }, []);
  useEffect(() => {
    const onPopState = () => {
      const slug = decodeURIComponent(window.location.pathname.slice(1));
      setScreenState(isScreen(slug) ? slug : "summary");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [qr, setQr] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [linkMessage, setLinkMessage] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const monthManuallySelected = useRef(false);
  const [darkMode, setDarkMode] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);
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
    let active = true;
    void loadCatalog().then((manifest) => {
      if (active) setCatalog(manifest);
    }).catch(() => {
      // Names and monograms remain usable when the public catalog is offline.
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMonth(monthNow());
      setDarkMode(localStorage.getItem("sensei.web.darkMode") === "true");
      setPrivacyMode(localStorage.getItem("sensei.web.privacyMode") === "true");
      setAppearanceLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!appearanceLoaded) return;
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("sensei.web.darkMode", String(darkMode));
  }, [darkMode, appearanceLoaded]);
  useEffect(() => {
    if (!appearanceLoaded) return;
    localStorage.setItem("sensei.web.privacyMode", String(privacyMode));
  }, [privacyMode, appearanceLoaded]);
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
  const paydayDay = Number(JSON.parse(String(rows.settings?.find((row) => row.key === "paydayDay")?.value ?? "null"))) || null;
  const paydayCycleEnabled = JSON.parse(String(rows.settings?.find((row) => row.key === "budgetFromPayday")?.value ?? "false")) === true && !!paydayDay;
  useEffect(() => {
    if (!user || loading || !month || !paydayCycleEnabled || !paydayDay || monthManuallySelected.current) return;
    const today = new Date();
    const actualPayday = Math.min(paydayDay, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
    if (today.getDate() < actualPayday || month !== monthNow()) return;
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    setMonth(`${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}`);
  }, [user, loading, month, paydayCycleEnabled, paydayDay]);
  const selectMonth = (value: string) => {
    monthManuallySelected.current = true;
    setMonth(value);
  };
  const [selectedYear, selectedMonth] = month.split("-").map(Number);
  const cycleDate = (year: number, monthIndex: number, day: number) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.min(day, lastDay));
  };
  const selectedPayday = paydayCycleEnabled ? cycleDate(selectedYear, selectedMonth - 1, paydayDay) : null;
  const cycleStart = paydayCycleEnabled
    ? cycleDate(selectedYear, selectedMonth - 2, paydayDay)
    : new Date(selectedYear, selectedMonth - 1, 1);
  const cycleEnd = paydayCycleEnabled
    ? selectedPayday!
    : new Date(selectedYear, selectedMonth, 1);
  const cycleLastDay = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), cycleEnd.getDate() - 1);
  const cycleLabel = `${cycleStart.getDate()} ${cycleStart.toLocaleDateString("en-MY", { month: "short" })} – ${cycleLastDay.getDate()} ${cycleLastDay.toLocaleDateString("en-MY", { month: "short" })} ${cycleLastDay.getFullYear()}`;
  const rangeStart = `${cycleStart.getFullYear()}-${pad(cycleStart.getMonth() + 1)}-${pad(cycleStart.getDate())}`;
  const rangeEnd = `${cycleEnd.getFullYear()}-${pad(cycleEnd.getMonth() + 1)}-${pad(cycleEnd.getDate())}`;
  const monthRows = useMemo(() => rows.transactions?.filter((row) => {
    const date = String(row.occurred_at ?? "").slice(0, 10);
    return date >= rangeStart && date < rangeEnd;
  }) ?? [], [rows.transactions, rangeStart, rangeEnd]);
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
    const days: Date[] = [];
    for (const date = new Date(cycleStart); date < cycleEnd; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date));
    }
    return days.map((date) => {
      const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      const value = (rows.transactions ?? [])
        .filter(
          (row) =>
            String(row.occurred_at ?? "").slice(0, 10) === day &&
            row.type === "expense",
        )
        .reduce((sum, row) => sum + amount(row.amount_sen), 0);
      return {
        label: String(date.getDate()),
        value,
      };
    });
  }, [rows.transactions, month, cycleStart, cycleEnd]);

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
    if (!key) return false;
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
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this record.");
      return false;
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

  if (!user || !key) return <LinkScreen error={error} qr={qr} linkMessage={linkMessage} refreshableQr={refreshableQr} expiredQr={expiredQr} secondsLeft={secondsLeft} refreshQr={refreshQr} cancelQr={cancelQr} />;

  if (loading)
    return (
      <div className="loading-screen">
        <div className="brand">
          <span className="brand-mark">S</span> SenSei
        </div>
        <p>Unlocking your private dashboard…</p>
      </div>
    );

  const pageName = groups.flatMap((group) => group.items).find((item) => item.id === screen)?.label ?? (selectedTable ? TABLE_LABELS[selectedTable] : screen === "ai-budget" ? "AI budget" : screen === "plans" ? "Plans" : "Home");
  return (
    <>
      <WorkspaceShell
        screen={screen}
        pageName={pageName}
        userName={user.displayName || ""}
        userEmail={user.email || ""}
        privacyMode={privacyMode}
        darkMode={darkMode}
        busy={busy}
        onNavigate={(next) => { setScreen(next); setError(""); setSearch(""); }}
        onSync={refreshEverything}
        onSignOut={signOutBrowser}
        onPrivacy={() => setPrivacyMode((value) => !value)}
        onTheme={() => setDarkMode((value) => !value)}
        onAddTransaction={() => setEditing({ table: "transactions", row: defaults("transactions") })}
      >
          {error && <div className="inline-error">{error}</div>}
          {screen === "summary" && (
            <SummaryScreen
              catalog={catalog}
              month={month}
              setMonth={selectMonth}
              spent={spent}
              income={income}
              categories={categoryTotals}
              accounts={accountBalances}
              recent={recent}
              chartData={chartData}
              rows={rows}
              paydayCycleEnabled={paydayCycleEnabled}
              cycleLabel={cycleLabel}
              onNavigate={setScreen}
            />
          )}
          {screen === "reports" && (
            <ReportsScreen
              catalog={catalog}
              month={month}
              setMonth={selectMonth}
              rows={rows}
              categories={categoryTotals}
              spent={spent}
              income={income}
            />
          )}
          {screen === "weekly-recap" && <WeeklyRecapScreen rows={rows} catalog={catalog} />}
          {screen === "ai-budget" && <PreviewScreen kind="ai" onNavigate={setScreen} />}
          {screen === "plans" && <PreviewScreen kind="plans" onNavigate={setScreen} />}
          {screen === "tax" && <PlanningDocumentScreen kind="tax" settings={rows.settings ?? []} onSave={(row) => saveRow("settings", row)} busy={busy} />}
          {screen === "will" && <PlanningDocumentScreen kind="will" settings={rows.settings ?? []} onSave={(row) => saveRow("settings", row)} busy={busy} />}
          {screen === "budgets" && (
            <BudgetsScreen
              month={month}
              rows={rows}
              spent={spent}
              onEdit={(table, row) =>
                setEditing({ table, row: { ...row }, original: row })
              }
              onAdd={() =>
                setEditing({ table: "settings", row: { key: "monthlyBudgetSen", value: "0" } })
              }
            />
          )}
          {selectedTable && (
            <RecordsScreen
              catalog={catalog}
              table={selectedTable}
              uid={user.uid}
              rows={rows[selectedTable] ?? []}
              allRows={rows}
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
      </WorkspaceShell>
      {editing && (
        <RecordEditor
          catalog={catalog}
          table={editing.table}
          initial={editing.row}
          rows={rows}
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
    </>
  );
}
