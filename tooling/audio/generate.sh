#!/usr/bin/env bash
# 듣기 문항의 테스트용 오디오를 만든다.
#
# 왜 macOS `say`인가 (ADR-0017 보류 「오디오 자산의 출처·형식」):
#   - 라이선스가 깨끗해 저장소에 커밋할 수 있다
#   - 문장 목록만 있으면 누구나 같은 파일을 다시 만든다 (ADR-0001 D4)
#   - 서버도 API 키도 없다 (screens.md 「서버가 없다」)
#
# **이것은 테스트 자산이지 컨텐츠가 아니다.** 실제 문항 오디오의 공급 경로는
# 여전히 보류다 — 서사 트랙이 정한다.
#
# 문장의 출처는 apps/mobile/src/screens/listening/listening.ts의 고정 데이터다.
# 문항이 바뀌면 prompts.json을 다시 뽑고 이 스크립트를 다시 돌린다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$HERE/../../apps/ios/Host/audio}"
VOICE="${VOICE:-Yuna}"

command -v say >/dev/null || { echo "macOS `say`가 없다"; exit 1; }
say -v '?' | grep -q "^${VOICE} " || { echo "음성 없음: ${VOICE}"; exit 1; }

mkdir -p "$OUT"
python3 -c "
import json,sys
for q in json.load(open('$HERE/prompts.json')):
    print(q['id'] + '\t' + q['text'])
" | while IFS=$'\t' read -r id text; do
  say -v "$VOICE" -o "$OUT/$id.aiff" "$text"
  afconvert "$OUT/$id.aiff" "$OUT/$id.m4a" -f m4af -d aac >/dev/null
  rm -f "$OUT/$id.aiff"
  printf '%s  %s\n' "$id.m4a" "$text"
done

echo
echo "생성 위치: $OUT"
ls -1 "$OUT"/*.m4a | wc -l | xargs -I{} echo "파일 {}개"
