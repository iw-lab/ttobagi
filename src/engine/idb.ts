/**
 * 아주 작은 IndexedDB 래퍼 — 교사 육성 녹음(오디오 blob)을 담는다.
 * localStorage 는 문자열만 담고 용량도 작아서 소리 파일에는 맞지 않는다.
 */

const DB_NAME = 'ttobagi';
const STORE = 'audio';
let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAudio(key: string, blob: Blob): Promise<void> {
  await tx('readwrite', (s) => s.put(blob, key) as IDBRequest<IDBValidKey>);
}

export async function getAudio(key: string): Promise<Blob | undefined> {
  try {
    return await tx('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>);
  } catch {
    return undefined;
  }
}

export async function deleteAudio(key: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(key) as IDBRequest<undefined>);
  } catch {
    /* 없는 걸 지우려 한 것뿐 */
  }
}

export async function listAudioKeys(): Promise<string[]> {
  try {
    const keys = await tx('readonly', (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>);
    return keys.map(String);
  } catch {
    return [];
  }
}

/** 공용 기기에서 다음 학생에게 넘기기 전에 소리까지 싹 지운다 */
export async function clearAudio(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.clear() as IDBRequest<undefined>);
  } catch {
    /* 지우지 못해도 화면은 계속 돌아간다 */
  }
}
