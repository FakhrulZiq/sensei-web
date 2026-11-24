import { decryptRecord, encryptRecord, type Envelope } from "sensei-crypto";
import { api } from "./api";
import { removeRow, saveMeta, saveRows } from "./vault";
import { keyOf, recordIdOf, TABLES, type TableName } from "./tables";

type Pulled = {
  table: string;
  recordId: string;
  envelope: Envelope | null;
  deleted: boolean;
  schemaVersion: number;
  clientUpdatedAt: number;
  deviceId: string;
  serverUpdatedAt: string;
};
type Page = { records: Pulled[]; cursor: string | null; hasMore: boolean };
const SCHEMA_VERSION = 13;

function randomId() {
  return crypto.randomUUID().replaceAll("-", "_");
}
function deviceId() {
  const key = "sensei.web.deviceId";
  let value = localStorage.getItem(key);
  if (!value) {
    value = randomId();
    localStorage.setItem(key, value);
  }
  return value;
}
const stripLocal = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row).filter(([key]) => !key.startsWith("__")),
  );

export async function pullAll(
  uid: string,
  kid: string,
  dek: Uint8Array,
  force = false,
) {
  const meta = await (await import("./vault")).getMeta(uid);
  let cursor = force
    ? null
    : ((meta?.cursor as string | null | undefined) ?? null);
  let hasMore = true;
  let applied = 0;
  let unreadable = 0;
  while (hasMore) {
    const page = await api<Page>("/sync/pull", {
      ...(cursor ? { cursor } : {}),
      pageSize: 500,
    });
    const batches = new Map<TableName, Record<string, unknown>[]>();
    for (const record of page.records) {
      if (!TABLES.includes(record.table as TableName)) {
        unreadable++;
        continue;
      }
      const table = record.table as TableName;
      if (record.deleted || !record.envelope) {
        await removeRow(uid, table, record.recordId);
        applied++;
        continue;
      }
      if (
        record.schemaVersion > SCHEMA_VERSION ||
        record.envelope.kid !== kid
      ) {
        unreadable++;
        continue;
      }
      try {
        const row = decryptRecord<Record<string, unknown>>(
          dek,
          { uid, table, recordId: record.recordId },
          record.envelope,
        );
        const enriched = {
          ...row,
          __recordId: record.recordId,
          __syncAt: record.clientUpdatedAt,
          __schemaVersion: record.schemaVersion,
        };
        batches.set(table, [...(batches.get(table) ?? []), enriched]);
        applied++;
      } catch {
        unreadable++;
      }
    }
    for (const [table, rows] of batches) await saveRows(uid, table, rows);
    cursor = page.cursor;
    hasMore = page.hasMore;
    await saveMeta(uid, { cursor, lastSyncAt: new Date().toISOString() });
  }
  return { applied, unreadable };
}

export async function pushRecord(
  uid: string,
  kid: string,
  dek: Uint8Array,
  table: TableName,
  row: Record<string, unknown> | null,
  recordId: string,
) {
  const clientUpdatedAt = Date.now();
  const envelope = row
    ? encryptRecord(dek, { uid, table, recordId, kid }, stripLocal(row))
    : undefined;
  await api("/sync/push", {
    deviceId: deviceId(),
    records: [
      {
        table,
        recordId,
        deleted: !row,
        schemaVersion: SCHEMA_VERSION,
        clientUpdatedAt,
        ...(envelope ? { envelope } : {}),
      },
    ],
  });
}

export async function saveAndPush(
  uid: string,
  kid: string,
  dek: Uint8Array,
  table: TableName,
  row: Record<string, unknown>,
) {
  const recordId = recordIdOf(table, keyOf(table, row));
  const local = {
    ...row,
    __recordId: recordId,
    __syncAt: Date.now(),
    __schemaVersion: SCHEMA_VERSION,
  };
  await saveRows(uid, table, [local]);
  try {
    await pushRecord(uid, kid, dek, table, local, recordId);
  } catch (error) {
    await pullAll(uid, kid, dek);
    throw error;
  }
  await pullAll(uid, kid, dek);
}

export async function deleteAndPush(
  uid: string,
  kid: string,
  dek: Uint8Array,
  table: TableName,
  row: Record<string, unknown>,
) {
  const recordId = recordIdOf(table, keyOf(table, row));
  await pushRecord(uid, kid, dek, table, null, recordId);
  await removeRow(uid, table, recordId);
  await pullAll(uid, kid, dek);
}
