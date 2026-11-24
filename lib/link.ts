import QRCode from "qrcode";
import {
  createLinkKeys,
  decodeLinkQr,
  encodeLinkQr,
  openLinkApproval,
} from "sensei-crypto";
import { signInWithCustomToken } from "firebase/auth";
import { getBrowserAuth } from "./firebase";
import { ApiError, publicApi } from "./api";
import { saveKey } from "./vault";

type Created = { sessionId: string; expiresAt: string };
type Polled = {
  status: "PENDING" | "APPROVED";
  uid?: string;
  customToken?: string;
  approval?: { phonePublicKey: string; iv: string; ct: string };
};

export async function startLink(
  label: string,
  onQr: (value: string, image: string, expiresAt: string) => void,
  onStatus: (value: string) => void,
  cancelled: () => boolean,
): Promise<"linked" | "expired" | "missing" | "cancelled"> {
  const keys = createLinkKeys((length) =>
    crypto.getRandomValues(new Uint8Array(length)),
  );
  const created = await publicApi<Created>("/key-links", { label });
  const qrText = encodeLinkQr({
    sessionId: created.sessionId,
    webPublicKey: keys.publicKey,
  });
  const image = await QRCode.toDataURL(qrText, {
    width: 256,
    margin: 1,
    color: { dark: "#1c2925", light: "#ffffff" },
  });
  onQr(qrText, image, created.expiresAt);
  const { sessionId } = decodeLinkQr(qrText);
  while (Date.now() < Date.parse(created.expiresAt) && !cancelled()) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    if (cancelled()) return "cancelled";
    if (Date.now() >= Date.parse(created.expiresAt)) break;
    let status: Polled;
    try {
      status = await publicApi<Polled>(
        `/key-links/${encodeURIComponent(sessionId)}`,
      );
    } catch (error) {
      const expiresAt = Date.parse(created.expiresAt);
      if (error instanceof ApiError && error.status === 410) {
        onStatus("expired");
        return "expired";
      }
      if (error instanceof ApiError && error.status === 404) {
        if (Date.now() >= expiresAt - 5_000) {
          onStatus("expired");
          return "expired";
        }
        onStatus("missing");
        return "missing";
      }
      throw error;
    }
    if (status.status === "PENDING") continue;
    if (!status.approval || !status.uid || !status.customToken)
      throw new Error(
        "The phone approval was incomplete. Create a new QR code.",
      );
    onStatus("Phone approved. Opening your encrypted account…");
    const dek = openLinkApproval({
      sessionId,
      webPrivateKey: keys.privateKey,
      approval: status.approval,
    });
    await signInWithCustomToken(getBrowserAuth(), status.customToken);
    const user = getBrowserAuth().currentUser;
    if (!user || user.uid !== status.uid)
      throw new Error("The approved account could not be verified.");
    const keyInfo = await (
      await import("./api")
    ).api<{ kid: string }>("/keys/active");
    await saveKey({ uid: user.uid, kid: keyInfo.kid, dek, sessionId });
    onStatus("Linked. Loading your encrypted data…");
    return "linked";
  }
  if (cancelled()) return "cancelled";
  onStatus("expired");
  return "expired";
}
