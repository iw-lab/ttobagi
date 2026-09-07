import { defineConfig } from 'vite';

/**
 * GitHub Pages 는 저장소 이름 아래 경로로 서비스된다 → base 를 그 경로로 맞춘다.
 * 개발·미리보기·빌드가 **같은 base** 를 써야 «미리보기에서는 되는데 배포하면 깨진다»가 없다.
 * 다른 곳(도메인 루트 등)에 올릴 때는 APP_BASE 로 바꾼다.
 */
const base = process.env.APP_BASE ?? '/ttobagi/';

export default defineConfig({
  base,
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
