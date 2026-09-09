#!/usr/bin/env bash
# 교차검증이 끝나면 «확정 → 급수표 파일 → 검사 → 음원 → 빌드 → QA»까지 한 번에 간다.
#
# 🔴 마감 시각을 둔다. 레인 하나가 영영 안 끝나도 공정 전체가 멈추면 안 된다 —
#    그때는 «검사된 만큼»으로 확정하고, 검사 안 된 문항 수를 보고서에 남긴다.
#    「검사에 실패했다」와 「깨끗하다」는 다른 상태이므로 숫자로 밝힌다.
set -uo pipefail
cd "$(dirname "$0")/../.."
DEADLINE="${DEADLINE:-0245}"     # HHMM
say() { printf '\n== %s %s ==\n' "$(date +%H:%M)" "$*"; }

say "레인이 끝나기를 기다린다 (마감 $DEADLINE)"
while :; do
  left=$(node scripts/en/resume-xval.mjs 2>/dev/null | awk -F'남음 ' '{print $2}' | awk '{s+=$1} END {print s+0}')
  now=$(date +%H%M)
  [ "${left:-999}" -eq 0 ] && { say "세 레인 전부 완료"; break; }
  if [ "$now" -ge "$DEADLINE" ]; then say "마감 도달 — 남은 배치 $left 건은 미검사로 둔다"; break; fi
  sleep 60
done

say "① 병합"      ; node scripts/en/merge-xval.mjs      || exit 1
say "② 확정"      ; node scripts/en/finalize-sheets.mjs || exit 1
say "③ 급수표 파일"; node scripts/en/emit-curriculum.mjs || exit 1
say "④ 타입·테스트"; npx tsc --noEmit && npx vitest run 2>&1 | tail -5
say "⑤ 음원"      ; node scripts/en/build-audio.mjs --jobs 6 || exit 1
say "⑥ 음원 검사"  ; node scripts/en/check-audio.mjs | tail -6 || exit 1
say "⑦ 빌드·QA"   ; APP_BASE=/ npx vite build >/dev/null 2>&1 && node scripts/visual-qa.mjs 2>&1 | tail -4
say "⑧ 상태"      ; node scripts/en/report.mjs
say "여기까지. 배포는 사람이 확인하고 돌린다."
