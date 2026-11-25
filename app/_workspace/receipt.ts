import { getDownloadURL, ref } from "firebase/storage";
import { decryptBlob } from "sensei-crypto";
import { getBrowserStorage } from "../../lib/firebase";
import type { Row } from "./types";

export async function showReceipt(
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
