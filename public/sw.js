/* 또박이 서비스 워커 — 한 번 열어 본 뒤에는 인터넷이 없어도 앱이 뜬다.
   자산 이름이 빌드마다 바뀌므로 «받아온 것을 그때그때 담는» 방식을 쓴다. */

const CACHE = 'ttobagi-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 화면 이동: 온라인이면 새로 받고, 끊겨 있으면 담아 둔 화면을 준다
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // 5xx·404 를 그대로 담으면 다음번 오프라인에서 그 오류 화면이 앱 대신 뜬다
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')).then((r) => r || Response.error())),
    );
    return;
  }

  // 그 밖의 자산: 담아 둔 것을 먼저 주고 뒤에서 조용히 갱신한다
  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
          }
          return res;
        })
        // 끊긴 상태에서 담아 둔 것도 없으면 «아무것도 아닌 것»을 돌려주면 안 된다.
        // undefined 를 respondWith 하면 브라우저가 깨진 응답으로 받아 콘솔에 오류를 남긴다.
        .catch(() => cached || new Response('', { status: 503, statusText: 'offline' }));
      return cached || fresh;
    }),
  );
});
