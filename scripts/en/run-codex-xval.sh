#!/usr/bin/env bash
# codex(gpt-6-astra) 레인을 배치 파일대로 돌린다.
#
# 🔴 codex 는 --batch 가 없다. 그래서 여기서 한 건씩 돌리되,
#    ① 이미 «쓸 만한» 답이 있는 건 건너뛰고(재개 가능)
#    ② 응답에서 마지막 JSON 줄만 뽑아 저장한다(codex 는 사고 과정도 같이 뱉는다).
#
# 사용: scripts/en/run-codex-xval.sh /tmp/gen-en/xval-codex.jsonl
set -uo pipefail
JSONL="${1:?배치 파일 경로가 필요하다}"
BRIDGE="$HOME/.claude/bin/codex-validate.sh"

total=$(grep -c . "$JSONL")
i=0; done_=0; skip=0; fail=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  i=$((i+1))
  out=$(printf '%s' "$line" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).out))')
  name=$(printf '%s' "$line" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).name))')

  # 이미 쓸 만한 답이 있으면 건너뛴다 — 「파일이 있다」가 아니라 「파싱되고 bad 가 있다」로 본다
  if [ -f "$out" ] && node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.exit(Array.isArray(d.bad)?0:1)' "$out" 2>/dev/null; then
    skip=$((skip+1)); continue
  fi

  printf '[%d/%d] %s … ' "$i" "$total" "$name" >&2
  t0=$(date +%s)
  resp=$(printf '%s' "$line" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).prompt))' \
    | "$BRIDGE" 2>/dev/null)
  # 마지막 JSON 객체 줄만 남긴다
  json=$(printf '%s' "$resp" | grep -E '^\{"n":' | tail -1)
  if [ -n "$json" ] && printf '%s' "$json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);process.exit(Array.isArray(d.bad)?0:1)})' 2>/dev/null; then
    printf '%s' "$json" > "$out"
    done_=$((done_+1))
    printf '✅ %s초\n' "$(( $(date +%s) - t0 ))" >&2
  else
    fail=$((fail+1))
    printf '✗ 형식 불일치 %s초\n' "$(( $(date +%s) - t0 ))" >&2
  fi
done < "$JSONL"

printf '\ncodex 레인 종료 — 성공 %d · 건너뜀 %d · 실패 %d / %d\n' "$done_" "$skip" "$fail" "$total" >&2
