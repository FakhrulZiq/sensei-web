import { getBrowserAuth } from "./firebase";
import { signOut } from "firebase/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  if (!API_URL)
    throw new ApiError("Set NEXT_PUBLIC_API_URL to connect to SenSei.");
  const token = await getBrowserAuth().currentUser?.getIdToken();
  if (!token)
    throw new ApiError("This browser is not linked. Scan a new QR code.", 401);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Could not reach the SenSei server. Check your connection.",
    );
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message[0]
      : payload?.message;
    if (response.status === 401) {
      const auth = getBrowserAuth();
      const uid = auth.currentUser?.uid;
      if (uid) {
        const { clearVault } = await import("./vault");
        await clearVault(uid);
        await signOut(auth);
      }
    }
    throw new ApiError(
      message ?? `Server error (${response.status}).`,
      response.status,
    );
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

export async function publicApi<T>(path: string, body?: unknown): Promise<T> {
  if (!API_URL)
    throw new ApiError("Set NEXT_PUBLIC_API_URL to connect to SenSei.");
  const method = body === undefined ? "GET" : "POST";
  const response = await fetch(`${API_URL}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" } }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(
      payload?.message ?? `Server error (${response.status}).`,
      response.status,
    );
  }
  return (await response.json()) as T;
}
