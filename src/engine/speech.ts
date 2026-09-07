/**
 * 소리 — 문항을 읽어 준다.
 *
 * 재생 순서(정본): ① 교사 육성 녹음 → ② 브라우저 한국어 음성 → ③ 소리가 없으면 «보여주기»
 *  · 유료 음성 서비스를 쓰지 않는다. 기기에 이미 들어 있는 목소리를 쓰므로 돈이 들지 않고
 *    인터넷 없이도 소리가 난다(음성이 기기 안에 있을 때).
 *  · 한국어 음성이 아예 없는 기기가 있다. 그때는 시험을 멈추지 않고 «선생님이 읽어 주세요»로
 *    넘어가거나, 연습 모드에서는 글자를 잠깐 보여 주는 방식으로 바꾼다.
 */

import { getAudio, putAudio, deleteAudio } from './idb';

export type VoiceStatus = 'ready' | 'no-korean' | 'unsupported';

const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

let voicesLoaded = false;
let cachedVoices: SpeechSynthesisVoice[] = [];

/** 음성 목록은 처음엔 비어 있다가 나중에 채워지는 브라우저가 있다 */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([]);
  if (voicesLoaded && cachedVoices.length) return Promise.resolve(cachedVoices);
  return new Promise((resolve) => {
    const pick = () => {
      cachedVoices = synth.getVoices();
      if (cachedVoices.length) {
        voicesLoaded = true;
        cleanup();
        resolve(cachedVoices);
      }
    };
    const onChange = () => pick();
    const timer = setTimeout(() => {
      cleanup();
      cachedVoices = synth.getVoices();
      voicesLoaded = true;
      resolve(cachedVoices);
    }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      synth?.removeEventListener('voiceschanged', onChange);
    }
    synth.addEventListener('voiceschanged', onChange);
    pick();
  });
}

export function koreanVoices(): SpeechSynthesisVoice[] {
  // 이름을 박아 두면 기기가 바뀔 때 조용히 깨진다 — 반드시 lang 으로 찾는다
  return cachedVoices.filter((v) => v.lang.toLowerCase().startsWith('ko'));
}

export async function voiceStatus(): Promise<VoiceStatus> {
  if (!synth) return 'unsupported';
  await loadVoices();
  return koreanVoices().length ? 'ready' : 'no-korean';
}

/** 기기 안에서 도는 음성을 먼저 고른다 — 인터넷이 끊겨도 소리가 난다 */
export function pickVoice(preferredName?: string): SpeechSynthesisVoice | null {
  const ko = koreanVoices();
  if (!ko.length) return null;
  if (preferredName) {
    const named = ko.find((v) => v.name === preferredName);
    if (named) return named;
  }
  return ko.find((v) => v.localService) ?? ko[0];
}

/* ───────────────────────── 읽어 주기 ───────────────────────── */

export interface SpeakOptions {
  rate?: number;
  /** 몇 번 읽을지 */
  times?: number;
  /** 반복 사이 쉬는 시간(ms) */
  betweenMs?: number;
  voiceName?: string;
  /** 문장부호를 소리 내어 읽을지 */
  readPunct?: boolean;
  signal?: AbortSignal;
}

const PUNCT_WORDS: [RegExp, string][] = [
  [/\./g, ' 마침표 '],
  [/\?/g, ' 물음표 '],
  [/!/g, ' 느낌표 '],
  [/,/g, ' 쉼표 '],
];

export function spokenText(text: string, readPunct: boolean): string {
  if (!readPunct) return text;
  let out = text;
  for (const [re, word] of PUNCT_WORDS) out = out.replace(re, word);
  return out.replace(/\s+/g, ' ').trim();
}

function speakOnce(text: string, opts: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    if (!synth) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(opts.voiceName);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'ko-KR';
    }
    u.rate = opts.rate ?? 0.9;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    // 일부 브라우저가 onend 를 안 주는 사고가 있다 → 길이에 비례한 안전 타이머
    const guard = setTimeout(finish, 2000 + text.length * 260);
    const clear = () => clearTimeout(guard);
    u.addEventListener('end', clear);
    u.addEventListener('error', clear);
    synth.speak(u);
  });
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });

/** 문항을 정해진 횟수만큼 읽어 준다 */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!synth) return;
  const times = Math.max(1, opts.times ?? 1);
  const body = spokenText(text, opts.readPunct ?? false);
  for (let i = 0; i < times; i++) {
    if (opts.signal?.aborted) return;
    await speakOnce(body, opts);
    if (i < times - 1) await wait(opts.betweenMs ?? 900, opts.signal);
  }
}

export function stopSpeaking(): void {
  try {
    synth?.cancel();
  } catch {
    /* 이미 멈춰 있었을 뿐 */
  }
}

/**
 * iOS 는 «사용자가 누른 그 순간»에 소리를 한 번 내야 이후 재생이 열린다.
 * 듣기 버튼 클릭 핸들러 안에서 한 번 불러 준다.
 */
export function unlockAudio(): void {
  if (!synth) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch {
    /* 열지 못해도 다음 시도에서 다시 해 본다 */
  }
}

/* ───────────────────────── 교사 육성 녹음 ───────────────────────── */

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * 브라우저마다 담을 수 있는 소리 형식이 다르다.
 * 사파리는 webm/opus 를 못 만든다 — 아이패드에서 녹음이 통째로 실패하는 원인이다.
 */
export function recordMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', ''];
  for (const type of candidates) {
    if (!type) return '';
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export interface Recorder {
  stop(): Promise<Blob>;
  cancel(): void;
}

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const cleanup = () => stream.getTracks().forEach((t) => t.stop());
  const mimeType = recordMimeType();
  let rec: MediaRecorder;
  const chunks: BlobPart[] = [];
  try {
    rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.start();
  } catch (e) {
    // 여기서 스트림을 놓아 주지 않으면 마이크가 켜진 채로 남는다(빨간 점이 안 꺼진다)
    cleanup();
    throw e;
  }
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        const done = () => {
          cleanup();
          resolve(new Blob(chunks, { type: mimeType || 'audio/webm' }));
        };
        // 이미 멈춘 녹음기에 stop() 을 부르면 onstop 이 오지 않아 영영 기다리게 된다
        if (rec.state === 'inactive') {
          done();
          return;
        }
        rec.onstop = done;
        rec.onerror = done;
        try {
          rec.stop();
        } catch {
          done();
        }
      }),
    cancel: () => {
      try {
        rec.stop();
      } catch {
        /* 이미 멈춤 */
      }
      cleanup();
    },
  };
}

export const recordingKey = (itemId: string) => `rec:${itemId}`;

export async function saveRecording(itemId: string, blob: Blob): Promise<void> {
  await putAudio(recordingKey(itemId), blob);
}

export async function getRecording(itemId: string): Promise<Blob | undefined> {
  return getAudio(recordingKey(itemId));
}

export async function removeRecording(itemId: string): Promise<void> {
  await deleteAudio(recordingKey(itemId));
}

let currentAudio: HTMLAudioElement | null = null;

/** 녹음을 재생한다. 정해진 횟수만큼 반복. */
export async function playRecording(blob: Blob, opts: SpeakOptions = {}): Promise<void> {
  const times = Math.max(1, opts.times ?? 1);
  const url = URL.createObjectURL(blob);
  try {
    for (let i = 0; i < times; i++) {
      if (opts.signal?.aborted) return;
      let failed = false;
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        stopCurrentAudio();
        currentAudio = audio;
        audio.playbackRate = Math.max(0.5, Math.min(2, opts.rate ?? 1));
        let done = false;
        const finish = (bad = false) => {
          if (done) return;
          done = true;
          if (bad) failed = true;
          opts.signal?.removeEventListener('abort', onAbort);
          if (currentAudio === audio) currentAudio = null;
          resolve();
        };
        // pause() 는 ended 를 울리지 않는다. 중단 경로에서 이 약속을 직접 끝내지 않으면
        // 재생 Promise 가 영영 대기하고 blob URL 도 해제되지 않는다.
        function onAbort(): void {
          try {
            audio.pause();
          } catch {
            /* 이미 멈춤 */
          }
          finish();
        }
        stopHooks.add(onAbort);
        audio.onended = () => {
          stopHooks.delete(onAbort);
          finish();
        };
        audio.onerror = () => {
          stopHooks.delete(onAbort);
          finish(true);
        };
        opts.signal?.addEventListener('abort', onAbort, { once: true });
        audio.play().catch(() => {
          stopHooks.delete(onAbort);
          finish(true);
        });
      });
      // 재생이 실패했으면 «들려줬다»고 보고하면 안 된다 — TTS 로 넘어갈 기회를 준다
      if (failed) throw new Error('녹음을 재생할 수 없어요');
      if (i < times - 1) await wait(opts.betweenMs ?? 900, opts.signal);
    }
  } finally {
    URL.revokeObjectURL(url);
    currentAudio = null;
  }
}

export function stopAudio(): void {
  stopSpeaking();
  stopCurrentAudio();
}

/** 재생 중인 오디오를 멈추고, 그것을 기다리던 약속까지 확실히 끝낸다 */
function stopCurrentAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {
      /* 이미 멈춤 */
    }
    currentAudio = null;
  }
  for (const hook of [...stopHooks]) {
    stopHooks.delete(hook);
    hook();
  }
}

/** 지금 재생을 기다리는 약속들의 «끝내기» 갈고리 */
const stopHooks = new Set<() => void>();

/**
 * 한 문항을 «지금 있는 최선의 방법»으로 들려준다.
 * 무엇으로 들려줬는지 돌려준다 — 화면에 표시해서 선생님이 상태를 알 수 있게.
 */
export async function playItem(
  itemId: string,
  text: string,
  opts: SpeakOptions = {},
): Promise<'recording' | 'tts' | 'none'> {
  const rec = await getRecording(itemId);
  if (rec) {
    await playRecording(rec, opts);
    return 'recording';
  }
  if (synth && (await voiceStatus()) === 'ready') {
    await speak(text, opts);
    return 'tts';
  }
  return 'none';
}
