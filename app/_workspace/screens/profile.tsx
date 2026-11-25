"use client";
import type { User } from "firebase/auth";

export function ProfileScreen({
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
