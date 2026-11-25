"use client";

import Image from "next/image";
import { UiIcon } from "../../ui-icon";

type LinkScreenProps = {
  error: string;
  qr: string;
  linkMessage: string;
  refreshableQr: boolean;
  expiredQr: boolean;
  secondsLeft: number;
  refreshQr: () => void;
  cancelQr: () => void;
};

export function LinkScreen({ error, qr, linkMessage, refreshableQr, expiredQr, secondsLeft, refreshQr, cancelQr }: LinkScreenProps) {
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
                        <UiIcon name="refresh" size={16} /> Refresh code
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
}
