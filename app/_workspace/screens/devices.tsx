"use client";
import { useEffect } from "react";
import { UiIcon } from "../../ui-icon";
import { dateLabel } from "../format";
import type { Session } from "../types";

export function DevicesScreen({
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
          <UiIcon name="refresh" size={16} /> Refresh
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
