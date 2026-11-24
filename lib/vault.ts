const DB_NAME = "sensei-web-vault";
const DB_VERSION = 1;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("keys", { keyPath: "uid" });
      db.createObjectStore("rows", { keyPath: "key" });
      db.createObjectStore("meta", { keyPath: "uid" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function write(storeName: string, value: unknown) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await database();
  const value = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () =>
      resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

export type StoredKey = {
  uid: string;
  kid: string;
  dek: Uint8Array;
  sessionId: string;
};
export const saveKey = (value: StoredKey) => write("keys", value);
export const getKey = (uid: string) => get<StoredKey>("keys", uid);
export const saveMeta = (uid: string, values: Record<string, unknown>) =>
  write("meta", { uid, ...values });
export const getMeta = (uid: string) =>
  get<Record<string, unknown>>("meta", uid);

export async function saveRows(
  uid: string,
  table: string,
  rows: Record<string, unknown>[],
) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("rows", "readwrite");
    const store = tx.objectStore("rows");
    for (const row of rows)
      store.put({ key: `${uid}:${table}:${row.__recordId}`, uid, table, row });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function removeRow(uid: string, table: string, recordId: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("rows", "readwrite");
    tx.objectStore("rows").delete(`${uid}:${table}:${recordId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listRows(
  uid: string,
  table?: string,
): Promise<Record<string, unknown>[]> {
  const db = await database();
  const result = await new Promise<Record<string, unknown>[]>(
    (resolve, reject) => {
      const tx = db.transaction("rows", "readonly");
      const request = tx.objectStore("rows").getAll();
      request.onsuccess = () =>
        resolve(
          (
            request.result as {
              uid: string;
              table: string;
              row: Record<string, unknown>;
            }[]
          )
            .filter(
              (item) => item.uid === uid && (!table || item.table === table),
            )
            .map((item) => item.row),
        );
      request.onerror = () => reject(request.error);
    },
  );
  db.close();
  return result;
}

export async function clearVault(uid: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["keys", "rows", "meta"], "readwrite");
    tx.objectStore("keys").delete(uid);
    tx.objectStore("meta").delete(uid);
    const request = tx.objectStore("rows").getAll();
    request.onsuccess = () => {
      for (const row of request.result as { key: string; uid: string }[])
        if (row.uid === uid) tx.objectStore("rows").delete(row.key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
