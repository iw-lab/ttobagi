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
    req.onerror = () => {
      // 실패한 약속을 캐시에 남기면 저장소가 되살아나도 영원히 못 연다
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise.catch((e) => {
    dbPromise = null;
    throw e;
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    let value: T;
    req.onsuccess = () => {
      value = req.result;
    };
    req.onerror = () => reject(req.error);
    // 요청 성공만으로 resolve 하면 «저장했다»고 말한 뒤 트랜잭션이 용량 초과로
    // 되돌려질 수 있다. 실제로 커밋된 다음에만 성공이라고 말한다.
    t.oncomplete = () => resolve(value);
    t.onabort = () => reject(t.error ?? new Error('저장이 되돌려졌어요'));
    t.onerror = () => reject(t.error ?? new Error('저장에 실패했어요'));
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
