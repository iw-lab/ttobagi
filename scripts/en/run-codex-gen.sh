#!/usr/bin/env bash
# codex(gpt-6-astra) 로 문항을 «만든다». 검증용 run-codex-xval.sh 와 판정 조건만 다르다.
#
# 🔴 웹 브릿지가 다른 세션에 물려 있을 때 쓰는 길이다. 통이 달라 서로 안 밀린다.
# 🔴 「파일이 있다」가 아니라 «급수 id 아래에 문장 배열이 들어 있다»로 재개를 판정한다.
#
# 사용: scripts/en/run-codex-gen.sh /tmp/gen-en2/all.jsonl
set -uo pipefail
JSONL="${1:?배치 파일 경로가 필요하다}"
BRIDGE="$HOME/.claude/bin/codex-validate.sh"
ok=$(cat <<'JS'
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try{const d=JSON.parse(s);const k=Object.keys(d)[0];
    // 🔴 프롬프트의 «출력 예시»를 그대로 돌려주는 일이 있다("문장1","문장2"…).
    //    JSON 으로는 멀쩡해서 그냥 통과한다 — 한글이 섞였으면 답이 아니다(2026-09-10).
    const v=d[k];
    const real=Array.isArray(v)&&v.length>=1&&v.every(t=>typeof t==="string"&&!/[가-힣]/.test(t));
    process.exit(real?0:1);}catch{process.exit(1);}
});
JS
)
total=$(grep -c . "$JSONL"); i=0; done_=0; skip=0; fail=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  i=$((i+1))
  out=$(printf '%s' "$line" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).out))')
  name=$(printf '%s' "$line" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).name))')
  if [ -f "$out" ] && node -e "$ok" < "$out" 2>/dev/null; then skip=$((skip+1)); continue; fi
  printf '[%d/%d] %s … ' "$i" "$total" "$name" >&2
  t0=$(date +%s)
  resp=$(printf '%s' "$line" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).prompt))' \
    | "$BRIDGE" 2>/dev/null)
  # 🔴 codex 는 «프롬프트를 되울린 뒤» 사고 과정과 답을 함께 뱉는다.
  #    통짜 정규식 /\{[\s\S]*\}/ 로 집으면 프롬프트에 적어 둔 **출력 예시**부터
  #    물어서 통째로 깨진다(2026-09-10 실측). 뒤에서부터 «파싱되는 줄»을 찾는다.
  json=$(printf '%s' "$resp" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const lines=s.split(/\r?\n/).filter(l=>l.trim().startsWith("{"));
  for(let i=lines.length-1;i>=0;i--){
    try{const d=JSON.parse(lines[i].trim());const k=Object.keys(d)[0];
      const v=d[k];
      if(Array.isArray(v)&&v.length>=1&&v.every(t=>typeof t==="string"&&!/[가-힣]/.test(t))){
        process.stdout.write(lines[i].trim());return;}}catch{}
  }
  process.stdout.write("");});')
  if [ -n "$json" ] && printf '%s' "$json" | node -e "$ok" 2>/dev/null; then
    printf '%s' "$json" > "$out"; done_=$((done_+1)); printf '✅ %s초\n' "$(( $(date +%s) - t0 ))" >&2
  else
    fail=$((fail+1)); printf '✗ 형식 불일치 %s초\n' "$(( $(date +%s) - t0 ))" >&2
  fi
done < "$JSONL"
printf '\ncodex 생성 종료 — 성공 %d · 건너뜀 %d · 실패 %d / %d\n' "$done_" "$skip" "$fail" "$total" >&2
