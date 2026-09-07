/**
 * 저장소 — localStorage 하나뿐이다.
 *
 * 서버도 계정도 없다. 그래서
 *   · 운영비가 0원이고,
 *   · 아이 답안·필적이 기기 밖으로 나가지 않으며(개인정보 이슈가 구조적으로 사라진다),
 *   · 인터넷이 끊긴 교실에서도 그대로 돌아간다.
 * 대신 «학급 집계»는 서버가 아니라 공유 링크·인쇄로 해결한다(share.ts).
 */

import { DEFAULT_SETTINGS, newId, type AppState, type Attempt, type RunSettings, type WordList } from './types';

const KEY = 'ttobagi.v1';

/** 오래된 기록이 무한정 쌓이지 않게 — 기기 저장 공간은 유한하다 */
const MAX_ATTEMPTS = 300;

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function blank(): AppState {
  return { lists: [], attempts: [], settings: { ...DEFAULT_SETTINGS }, who: '' };
}

export function load(): AppState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      cache = {
        lists: parsed.lists ?? [],
        attempts: parsed.attempts ?? [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        who: parsed.who ?? '',
        lastListId: parsed.lastListId,
      };
      return cache;
    }
  } catch {
    // 저장값이 깨졌으면 빈 상태로 시작한다 — 앱이 못 열리는 것보다 낫다
  }
  cache = blank();
  return cache;
}

/** 마지막 저장이 실제로 디스크에 닿았는가. 화면이 «저장됐다»고 거짓말하지 않으려고 남긴다. */
let lastSaveOk = true;

export function saveFailed(): boolean {
  return !lastSaveOk;
}

export function save(): void {
  if (!cache) return;
  if (cache.attempts.length > MAX_ATTEMPTS) {
    cache.attempts = cache.attempts.slice(-MAX_ATTEMPTS);
  }
  lastSaveOk = persist();
  if (!lastSaveOk) {
    // 용량이 찼다. 기록을 «지금 가진 수의 절반»씩 실제로 줄이며 다시 시도한다.
    // 고정 상수(-150)로 자르면 기록이 150개 미만일 때 한 개도 안 줄어 재시도가 무의미해진다.
    while (!lastSaveOk && cache.attempts.length > 0) {
      cache.attempts = cache.attempts.slice(Math.ceil(cache.attempts.length / 2));
      lastSaveOk = persist();
    }
  }
  for (const fn of listeners) fn();
}

function persist(): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
    return true;
  } catch {
    return false;
  }
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ───────────────────────────── 급수표 ───────────────────────────── */

export function getLists(): WordList[] {
  return [...load().lists].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getList(id: string): WordList | undefined {
  return load().lists.find((l) => l.id === id);
}

export function upsertList(list: WordList): void {
  const s = load();
  const i = s.lists.findIndex((l) => l.id === list.id);
  const next = { ...list, updatedAt: Date.now() };
  if (i >= 0) s.lists[i] = next;
  else s.lists.push(next);
  s.lastListId = list.id;
  save();
}

export function deleteList(id: string): void {
  const s = load();
  s.lists = s.lists.filter((l) => l.id !== id);
  s.attempts = s.attempts.filter((a) => a.listId !== id);
  // 지운 급수표를 가리키는 lastListId 를 남겨 두면 다음 세션의 홈 화면이 빈 곳을 가리킨다
  if (s.lastListId === id) s.lastListId = undefined;
  save();
}

export function createList(title: string, level: string, texts: string[]): WordList {
  const now = Date.now();
  const list: WordList = {
    id: newId('l'),
    title,
    level,
    items: texts.map((t) => ({ id: newId('i'), text: t })),
    createdAt: now,
    updatedAt: now,
  };
  upsertList(list);
  return list;
}

/* ───────────────────────────── 시험 기록 ───────────────────────────── */

export function getAttempts(listId?: string): Attempt[] {
  const all = load().attempts;
  const filtered = listId ? all.filter((a) => a.listId === listId) : all;
  return [...filtered].sort((a, b) => b.finishedAt - a.finishedAt);
}

export function getAttempt(id: string): Attempt | undefined {
  return load().attempts.find((a) => a.id === id);
}

export function saveAttempt(attempt: Attempt): void {
  const s = load();
  const i = s.attempts.findIndex((a) => a.id === attempt.id);
  if (i >= 0) s.attempts[i] = attempt;
  else s.attempts.push(attempt);
  save();
}

export function deleteAttempt(id: string): void {
  const s = load();
  s.attempts = s.attempts.filter((a) => a.id !== id);
  save();
}

/* ───────────────────────────── 설정·이름 ───────────────────────────── */

export function getSettings(): RunSettings {
  return load().settings;
}

export function setSettings(patch: Partial<RunSettings>): void {
  const s = load();
  s.settings = { ...s.settings, ...patch };
  save();
}

export function getWho(): string {
  return load().who;
}

export function setWho(who: string): void {
  load().who = who;
  save();
}

export function getLastListId(): string | undefined {
  return load().lastListId;
}

/** 기기에 남은 모든 학습 기록을 지운다 — 공용 기기에서 다음 학생에게 넘기기 전에 쓴다 */
export function wipeAll(): void {
  cache = blank();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 지우기 실패해도 메모리 상태는 비워졌다 */
  }
  for (const fn of listeners) fn();
}

/** 답안 기록만 지우고 급수표는 남긴다 */
export function wipeAttempts(): void {
  load().attempts = [];
  save();
}

/** 저장 용량 대략치 (KB) — 설정 화면에서 보여 준다 */
export function storageSize(): number {
  try {
    return Math.round((localStorage.getItem(KEY)?.length ?? 0) / 1024);
  } catch {
    return 0;
  }
}
