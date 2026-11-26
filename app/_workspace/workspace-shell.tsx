"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { UiIcon, type IconName } from "../ui-icon";
import { groups } from "./navigation";
import type { Screen } from "./types";

export function WorkspaceShell({
  screen, pageName, userName, userEmail, privacyMode, darkMode, busy,
  onNavigate, onSync, onSignOut, onPrivacy, onTheme, onAddTransaction, children,
}: {
  screen: Screen;
  pageName: string;
  userName: string;
  userEmail: string;
  privacyMode: boolean;
  darkMode: boolean;
  busy: boolean;
  onNavigate: (screen: Screen) => void;
  onSync: () => void;
  onSignOut: () => void;
  onPrivacy: () => void;
  onTheme: () => void;
  onAddTransaction: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<{ screen: Screen; group: string | null }>(() => ({
    screen,
    group: groups.slice(1).find((group) => group.items.some((item) => item.id === screen))?.title ?? null,
  }));
  const expandedGroup = expanded.screen === screen
    ? expanded.group
    : groups.slice(1).find((group) => group.items.some((item) => item.id === screen))?.title ?? null;
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const navigate = (next: Screen) => {
    setExpanded({ screen: next, group: groups.slice(1).find((group) => group.items.some((item) => item.id === next))?.title ?? null });
    onNavigate(next);
    setMenuOpen(false);
  };
  return <div className={`shell${privacyMode ? " privacy-mode" : ""}`}>
    {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`} aria-label="Main navigation">
      <div className="brand"><Image className="brand-mark" src="/sensei-mark.svg" alt="" width={32} height={32} unoptimized /><span>SenSei</span><button className="mobile-menu-close icon-button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><UiIcon name="close" size={18} /></button></div>
      <nav className="sidebar-nav">
        {groups.map((group, index) => <div className="nav-group" key={group.title}>
          {index === 0
            ? <div className="nav-label">{group.title}</div>
            : <button className={`nav-group-toggle${expandedGroup === group.title ? " expanded" : ""}`} aria-expanded={expandedGroup === group.title} onClick={() => setExpanded({ screen, group: expandedGroup === group.title ? null : group.title })}>
                <span>{group.title}</span><span aria-hidden="true">{expandedGroup === group.title ? "−" : "+"}</span>
              </button>}
          {(index === 0 || expandedGroup === group.title) && <div className="nav-group-items">
            {group.items.map((item) => <button key={item.id} className={`nav-item${screen === item.id ? " active" : ""}`} aria-current={screen === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>
              <span className="nav-symbol"><UiIcon name={item.symbol} size={18} /></span>{item.label}
            </button>)}
          </div>}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-add-transaction" onClick={onAddTransaction}><UiIcon name="plus" size={17} /><span>Add transaction</span></button>
        <button className="nav-item" onClick={onSync} disabled={busy}><span className="nav-symbol"><UiIcon name="refresh" size={17} /></span>{busy ? "Syncing…" : "Sync now"}</button>
        <button className="nav-item" onClick={onSignOut}><span className="nav-symbol"><UiIcon name="logout" size={17} /></span>Sign out</button>
      </div>
    </aside>
    <div className="content">
      <header className="topbar">
        <div className="topbar-leading"><button className="mobile-menu-button icon-button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><span className="menu-glyph">☰</span></button><div className="topbar-title">{screen === "summary" ? "Dashboard" : pageName}</div></div>
        <div className="topbar-actions">
          <button className="icon-button utility-button" aria-label={privacyMode ? "Show amounts" : "Hide amounts"} title={privacyMode ? "Show amounts" : "Hide amounts"} onClick={onPrivacy}><UiIcon name={privacyMode ? "eye" : "eye-off"} size={18} /></button>
          <button className="icon-button utility-button" aria-label={darkMode ? "Use light theme" : "Use dark theme"} title={darkMode ? "Use light theme" : "Use dark theme"} onClick={onTheme}><UiIcon name={darkMode ? "sun" : "moon"} size={18} /></button>
          <button className="profile-control" onClick={() => navigate("profile")} aria-label="Open profile"><span className="avatar">{(userName || userEmail || "S").slice(0, 1).toUpperCase()}</span><span className="user-meta"><strong>{userName || "SenSei member"}</strong><span>{userEmail}</span></span></button>
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      {groups[0].items.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} aria-current={screen === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><UiIcon name={item.symbol as IconName} size={20} /><span>{item.label}</span></button>)}
    </nav>
  </div>;
}
