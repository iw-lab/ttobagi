/**
 * 소리 — 문항을 읽어 준다.
 *
 * 재생 순서(정본): ① 교사 육성 녹음 → ② 브라우저 한국어 음성 → ③ 소리가 없으면 «보여주기»
 *  · 유료 음성 서비스를 쓰지 않는다. 기기에 이미 들어 있는 목소리를 쓰므로 돈이 들지 않고
 *    인터넷 없이도 소리가 난다(음성이 기기 안에 있을 때).
 *  · 한국어 음성이 아예 없는 기기가 있다. 그때는 시험을 멈추지 않고 «선생님이 읽어 주세요»로
 *    넘어가거나, 연습 모드에서는 글자를 잠깐 보여 주는 방식으로 바꾼다.
 */

import { getAudio, putAudio, deleteAudio, listAudioKeys } from './idb';

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

/**
 * 한 번 읽는다. 돌아오는 값은 «실제로 소리가 시작되었는가».
 *
 * 브라우저 음성은 조용히 실패하는 방법이 여러 가지다:
 *  · 사용자 조작과 이어지지 않으면 not-allowed 로 죽는다(소리도 오류도 안 난다)
 *  · Chrome 은 큐가 한 번 엉키면 speaking=true 인 채로 영원히 멈춘다 — start 도 end 도 안 온다
 *  · 긴 문장을 읽다가 스스로 멈춘다(15초 즈음) → resume 으로 깨워야 한다
 * 그래서 «시작 신호»를 기다렸다가, 안 오면 큐를 비우고 한 번 더 시도한다.
 */
function speakOnce(text: string, opts: SpeakOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!synth) return resolve(false);
    let started = false;
    let done = false;
    let tries = 0;
    let guard: number | undefined;
    let startGuard: number | undefined;
    let beat: number | undefined;

    const clearTimers = () => {
      if (guard) clearTimeout(guard);
      if (startGuard) clearTimeout(startGuard);
      if (beat) clearInterval(beat);
      guard = startGuard = beat = undefined;
    };
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimers();
      resolve(ok);
    };

    const attempt = () => {
      tries++;
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(opts.voiceName);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = 'ko-KR';
      }
      u.rate = opts.rate ?? 0.9;

      u.onstart = () => {
        started = true;
        if (startGuard) clearTimeout(startGuard);
        startGuard = undefined;
      };
      u.onend = () => finish(started);
      u.onerror = () => {
        if (tries < 2) retry();
        else finish(false);
      };

      // 시작 신호가 안 오면 큐가 엉킨 것이다 — 비우고 딱 한 번 더
      startGuard = window.setTimeout(() => {
        if (started || done) return;
        try {
          synth?.cancel();
        } catch {
          /* 비우지 못해도 아래에서 판정한다 */
        }
        if (tries < 2) window.setTimeout(attempt, 150);
        else finish(false);
      }, 1400);

      // 끝 신호를 안 주는 사고 대비 — 길이에 비례한 마감
      guard = window.setTimeout(() => finish(started), 2500 + text.length * 300);

      // Chrome 이 스스로 멈추는 것을 깨운다
      beat = window.setInterval(() => {
        if (synth?.paused) synth.resume();
      }, 4000);

      synth!.speak(u);
    };

    const retry = () => {
      clearTimers();
      try {
        synth?.cancel();
      } catch {
        /* 무시 */
      }
      window.setTimeout(attempt, 150);
    };

    attempt();
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
/** 돌아오는 값은 «한 번이라도 실제로 소리가 났는가» */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<boolean> {
  if (!synth) return false;
  const times = Math.max(1, opts.times ?? 1);
  const body = spokenText(text, opts.readPunct ?? false);
  let heard = false;
  for (let i = 0; i < times; i++) {
    if (opts.signal?.aborted) return heard;
    const ok = await speakOnce(body, opts);
    heard = heard || ok;
    // 첫 번을 아예 못 냈으면 남은 반복도 못 낸다 — 조용히 시간만 끌지 않는다
    if (!ok && i === 0) return false;
    if (i < times - 1) await wait(opts.betweenMs ?? 900, opts.signal);
  }
  return heard;
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
let unlocked = false;

/**
 * 첫 조작 때 소리 엔진을 깨운다(iOS 는 이게 없으면 아예 소리를 안 낸다).
 *
 * 딱 한 번만 한다. 매번 빈 발화를 넣으면 그것이 큐에 쌓이고, 바로 뒤에 오는 cancel() 과
 * 부딪혀 Chrome 에서 다음 발화가 통째로 묵음이 된다.
 */
export function unlockAudio(): void {
  if (!synth || unlocked) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
    unlocked = true;
  } catch {
    /* 열지 못해도 다음 시도에서 다시 해 본다 */
  }
}

/**
 * 소리가 실제로 나는지 검사한다. 설정 화면의 「소리 검사」가 쓴다 —
 * 교실에서 «왜 소리가 안 나지»를 교사가 스스로 1초 만에 확인할 수 있어야 한다.
 */
export async function testSound(): Promise<'ok' | 'no-korean' | 'unsupported' | 'blocked'> {
  if (!synth) return 'unsupported';
  unlockAudio();
  await loadVoices();
  if (!koreanVoices().length) return 'no-korean';
  const heard = await speak('또박또박', { rate: 0.9, times: 1 });
  return heard ? 'ok' : 'blocked';
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

/**
 * 어떤 문항에 녹음이 있는지의 «동기» 색인.
 *
 * 🔴 이게 왜 있나 — 이 앱에서 소리가 안 나던 진짜 이유다.
 * 브라우저는 speechSynthesis.speak() 를 «사용자가 방금 누른 그 순간»에만 허락한다.
 * 예전 코드는 말하기 전에 IndexedDB 를 await 했고, 그 한 번의 비동기 경계에서
 * 클릭의 자격이 사라져 speak() 가 not-allowed 로 조용히 죽었다(Chrome 실측).
 * 그래서 «녹음이 있나?»는 기다리지 않고 답할 수 있어야 한다.
 */
let recordingIndex: Set<string> | null = null;

export async function preloadRecordingIndex(): Promise<void> {
  try {
    const keys = await listAudioKeys();
    recordingIndex = new Set(keys);
  } catch {
    recordingIndex = new Set();
  }
}

export function hasRecordingSync(itemId: string): boolean | null {
  if (!recordingIndex) return null; // 아직 모른다 — 기다려서 확인해야 한다
  return recordingIndex.has(recordingKey(itemId));
}

export async function saveRecording(itemId: string, blob: Blob): Promise<void> {
  await putAudio(recordingKey(itemId), blob);
  recordingIndex?.add(recordingKey(itemId));
}

export async function getRecording(itemId: string): Promise<Blob | undefined> {
  return getAudio(recordingKey(itemId));
}

export async function removeRecording(itemId: string): Promise<void> {
  await deleteAudio(recordingKey(itemId));
  recordingIndex?.delete(recordingKey(itemId));
}

let currentAudio: HTMLAudioElement | null = null;

/** 녹음을 재생한다. 정해진 횟수만큼 반복. */
export async function playRecording(blob: Blob, opts: SpeakOptions = {}): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await playSource(url, opts);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 미리 구워 둔 음원 파일을 재생한다 */
export async function playUrl(url: string, opts: SpeakOptions = {}): Promise<void> {
  await playSource(url, opts);
}

/** 소리 하나를 정해진 횟수만큼 재생한다. 실패하면 던진다 — «들려줬다»고 거짓말하지 않으려고. */
async function playSource(url: string, opts: SpeakOptions): Promise<void> {
  const times = Math.max(1, opts.times ?? 1);
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
        stopHooks.delete(onAbort);
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      // pause() 는 ended 를 울리지 않는다. 중단 경로에서 이 약속을 직접 끝내지 않으면
      // 재생 Promise 가 영영 대기한다.
      function onAbort(): void {
        try {
          audio.pause();
        } catch {
          /* 이미 멈춤 */
        }
        finish();
      }
      stopHooks.add(onAbort);
      audio.onended = () => finish();
      audio.onerror = () => finish(true);
      opts.signal?.addEventListener('abort', onAbort, { once: true });
      audio.play().catch(() => finish(true));
    });
    if (failed) throw new Error('소리를 재생할 수 없어요');
    if (i < times - 1) await wait(opts.betweenMs ?? 900, opts.signal);
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
/**
 * 문항 하나를 들려준다.
 *
 * 🔴 이 함수는 «클릭과 같은 순간에» speak() 에 닿아야 한다.
 * 녹음이 없다는 것을 색인으로 이미 알고 있으면 await 없이 바로 말한다 —
 * 중간에 IndexedDB 를 기다리면 브라우저가 소리를 막는다(위 recordingIndex 주석).
 */
export function playItem(
  itemId: string,
  text: string,
  opts: SpeakOptions & { audio?: string } = {},
): Promise<'recording' | 'builtin' | 'tts' | 'none'> {
  const known = hasRecordingSync(itemId);

  // 내장 음원이 있으면 그게 브라우저 목소리보다 낫다(자연스럽고, 기기를 안 탄다).
  // 교사 녹음만 이보다 앞선다 — 아이에게는 담임 목소리가 가장 좋다.
  if (known === false && opts.audio) {
    return playUrl(opts.audio, opts)
      .then(() => 'builtin' as const)
      .catch(() => speakNow(text, opts));
  }

  if (known === false) {
    // 기다릴 것이 없다 — 지금 이 자리에서 말한다
    return speakNow(text, opts);
  }

  return (async () => {
    const rec = await getRecording(itemId);
    if (rec) {
      try {
        await playRecording(rec, opts);
        return 'recording' as const;
      } catch {
        // 녹음이 깨졌으면 «들려줬다»고 하지 않고 다음 차례로 넘어간다
      }
    }
    if (opts.audio) {
      try {
        await playUrl(opts.audio, opts);
        return 'builtin' as const;
      } catch {
        /* 음원을 못 받았다 — 목소리로 */
      }
    }
    return speakNow(text, opts);
  })();
}

async function speakNow(text: string, opts: SpeakOptions): Promise<'tts' | 'none'> {
  if (!synth) return 'none';
  // 목소리 목록을 아직 못 받았어도 시도는 한다. 기다리면 그 사이에 말할 자격이 사라진다.
  if (voicesLoaded && koreanVoices().length === 0) return 'none';
  const heard = await speak(text, opts);
  return heard ? 'tts' : 'none';
}
