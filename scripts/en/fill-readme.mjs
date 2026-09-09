/** README 의 급수·문항 수를 실제 파일에서 세어 채운다 — 손으로 적으면 반드시 낡는다. */
import { readFileSync, writeFileSync } from 'node:fs';
const count = (path, mark) => {
  const s = readFileSync(new URL(path, import.meta.url), 'utf8');
  const body = s.slice(s.indexOf(mark));
  const sheets = [...body.matchAll(/id: '([^']+)',[\s\S]*?items: \[([\s\S]*?)\],\s*\n\s*\}/g)];
  const items = sheets.reduce((n, m) => n + [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].length, 0);
  return { sheets: sheets.length, items };
};
const ko = count('../../src/engine/curriculum.ts', 'export const CURRICULUM');
const en = count('../../src/engine/curriculum-en.ts', 'export const CURRICULUM_EN');
const p = new URL('../../README.md', import.meta.url);
let s = readFileSync(p, 'utf8');
s = s.replaceAll('__KO__', String(ko.sheets)).replaceAll('__KOI__', ko.items.toLocaleString('en-US'))
     .replaceAll('__EN__', String(en.sheets)).replaceAll('__ENI__', en.items.toLocaleString('en-US'));
writeFileSync(p, s);
console.log(`국어 ${ko.sheets}급 ${ko.items}문항 · 영어 ${en.sheets}급 ${en.items}문항`);
