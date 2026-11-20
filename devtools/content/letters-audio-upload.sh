#!/usr/bin/env bash
# 글자 소리 41개와 음성 정보 파일을 버킷에 올립니다(ADR-0172). **사람이 실행합니다** — 에이전트는 운영 버킷에 쓰지 않습니다.
#
#   bash devtools/content/letters-audio-upload.sh <letters-audio-build.mjs의 --out 폴더>
#   DRY_RUN=1 bash devtools/content/letters-audio-upload.sh <폴더>      # 키 없이 검사 · 합친 정보 파일만 만듭니다
#   BUCKET=content-test bash devtools/content/letters-audio-upload.sh <폴더>   # 시험 버킷(ADR-0087)
#
# 순서(계약 13절과 같음): sha256 확인 → 소리 파일(POST · x-upsert · 1년 캐시) → 공개 주소에서 sha256 다시 확인 →
# 지금의 audio/manifest.json을 받아 letters 항목만 더함 → 정보 파일(POST · x-upsert · 60 s 캐시) → 공개 주소로 확인.
# service_role 키는 `supabase projects api-keys`에서 셸 변수로만 받습니다 — 출력 · 파일에 남기지 않습니다.
set -euo pipefail

OUT="${1:?사용법: letters-audio-upload.sh <폴더>}"
REF="${SUPABASE_PROJECT_REF:-wgwnitgyotyvixozwrzu}"
BUCKET="${BUCKET:-content}"
BASE="https://${REF}.supabase.co/storage/v1/object"
HERE="$(cd "$(dirname "$0")" && pwd)"

case "$BUCKET" in
  content | content-*) ;;
  *) echo "BUCKET은 content 또는 content-*만 됩니다: $BUCKET" >&2; exit 2 ;;
esac
for tool in curl shasum node; do command -v "$tool" >/dev/null || { echo "$tool 없음" >&2; exit 1; }; done
[ -f "$OUT/SHA256SUMS" ] && [ -f "$OUT/letters-audio-timings.json" ] || { echo "$OUT에 SHA256SUMS · letters-audio-timings.json이 없습니다" >&2; exit 1; }

echo "1) sha256 확인"
(cd "$OUT" && shasum -a 256 -c SHA256SUMS --quiet)
COUNT="$(wc -l < "$OUT/SHA256SUMS" | tr -d ' ')"
echo "   파일 ${COUNT}개 OK"

echo "2) 지금의 음성 정보 파일 받기 · 합치기"
curl -fsS "${BASE}/public/${BUCKET}/audio/manifest.json?letters=$(date +%s)" -o "$OUT/manifest.live.json"
node "$HERE/letters-audio-merge.mjs" --live "$OUT/manifest.live.json" \
  --timings "$OUT/letters-audio-timings.json" --out "$OUT/manifest.merged.json"

if [ "${DRY_RUN:-0}" = 1 ]; then
  echo "DRY_RUN — 올리지 않았습니다. 올릴 것: ${COUNT}개 + audio/manifest.json → ${BUCKET}"
  exit 0
fi

if grep -q "macOS say" "$OUT/SOURCE.txt" 2>/dev/null && [ "$BUCKET" = content ]; then
  echo "say 엔진(기기 확인용) 파일은 운영 버킷에 올리지 않습니다" >&2; exit 1
fi
command -v supabase >/dev/null || { echo "supabase CLI 없음" >&2; exit 1; }
SERVICE_KEY="$(supabase projects api-keys --project-ref "$REF" -o json \
  | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{const k=JSON.parse(s).find((e)=>e.name==="service_role");if(!k)process.exit(1);process.stdout.write(k.api_key);});')"
[ -n "$SERVICE_KEY" ] || { echo "service_role 키를 못 받았습니다" >&2; exit 1; }

upload() { # <버킷 상대 경로> <로컬 파일> <content-type> <cache-control>
  curl -fsS -o /dev/null -X POST "${BASE}/${BUCKET}/$1" \
    -H "Authorization: Bearer ${SERVICE_KEY}" -H "apikey: ${SERVICE_KEY}" \
    -H "x-upsert: true" -H "content-type: $3" -H "cache-control: $4" \
    --data-binary "@$2"
}
public_sha() { curl -fsS "${BASE}/public/${BUCKET}/$1?v=$2" | shasum -a 256 | cut -d' ' -f1; }

echo "3) 소리 파일 올리기 · 확인"
STAMP="$(date +%s)"
while read -r sha path; do
  upload "$path" "$OUT/$path" "audio/mp4" "max-age=31536000"
  got="$(public_sha "$path" "$STAMP")"
  [ "$got" = "$sha" ] || { echo "   sha256 다름: $path" >&2; exit 1; }
  echo "   $path OK"
done < "$OUT/SHA256SUMS"

echo "4) 음성 정보 파일 올리기 · 확인"
upload "audio/manifest.json" "$OUT/manifest.merged.json" "application/json" "max-age=60"
want="$(shasum -a 256 "$OUT/manifest.merged.json" | cut -d' ' -f1)"
got="$(public_sha "audio/manifest.json" "$STAMP")"
[ "$got" = "$want" ] || { echo "   정보 파일 sha256 다름 — 캐시일 수 있으니 1분 뒤 다시 확인하세요" >&2; exit 1; }
echo "   audio/manifest.json OK"
unset SERVICE_KEY
echo "끝 — ${BUCKET}에 ${COUNT}개 + 정보 파일. 앱은 다음 정보 파일 갱신 때(앱 업데이트 없이) 소리를 냅니다."
