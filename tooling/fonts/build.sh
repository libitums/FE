#!/usr/bin/env bash
# 앱 본문 글꼴(Duru Sans)과 로마자 기울임 글꼴(Duru Roman)을 만든다(ADR-0107).
#
# 출처는 고정된 배포판이다 — 판을 바꾸면 이 스크립트를 다시 돌리고 ADR의 크기 · 범위 표를 고친다.
#   - Duru Sans  ← pretendard-jp 1.3.9 `dist/public/variable/PretendardJPVariable.ttf` (npm, OFL 1.1)
#   - Duru Roman ← Inter 4.1 `InterVariable-Italic.ttf` (github.com/rsms/inter 릴리스, OFL 1.1)
#
# 왜 이름을 바꾸나: Pretendard JP는 OFL의 예약 글꼴 이름(RFN)이 「Pretendard JP」이고, 글자를 덜어 낸 서브셋은
# OFL이 말하는 수정판이다 — 수정판은 예약 이름을 쓸 수 없다. Inter에는 예약 이름이 없지만 굵기 하나로 고정한
# 정적 판이라 같은 규칙으로 이름을 붙인다.
#
# 글자 범위:
#   - 라틴(Duru Sans): 기본 · Latin-1 · 확장 A/B · 결합 부호 · 확장 추가(베트남어) · 일반 구두점 · 통화 · 문자형 기호 · 화살표
#   - 한글: 호환 자모 + KS X 1001 완성형 2,350자 + 저장소 콘텐츠 · 문구에 쓰인 음절
#   - 일본어: CJK 기호 · 가나(U+3000–30FF) · 전각/반각(U+FF00–FFEF) + JIS X 0208 1수준 한자 + 저장소에 쓰인 한자
#
# 필요: Python 3 + fonttools(`pip install fonttools`).
# 쓰는 법: tooling/fonts/build.sh <PretendardJPVariable.ttf> <InterVariable-Italic.ttf>
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SANS_SRC="${1:?PretendardJPVariable.ttf 경로}"
ROMAN_SRC="${2:?InterVariable-Italic.ttf 경로}"
PY="${PYTHON:-python3}"

"$PY" -c "import fontTools" 2>/dev/null || { echo "fonttools가 없다 — pip install fonttools"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

LATIN="U+0020-007E,U+00A0-024F,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-218F,U+2190-21FF"
# 로마자 줄은 개정 로마자 표기(ASCII)뿐이다 — 기본 · Latin-1 · 일반 구두점만 둔다.
ROMAN_LATIN="U+0020-007E,U+00A0-00FF,U+2000-206F"

# 한글 · 한자 범위 — 표준 완성형 · JIS 1수준에 저장소가 실제로 쓰는 글자를 더한다.
"$PY" - "$ROOT" > "$WORK/cjk.txt" <<'EOF'
import glob, sys
root = sys.argv[1]
chars = set()
for hi in range(0xB0, 0xC9):  # KS X 1001 완성형 한글
    for lo in range(0xA1, 0xFF):
        try: chars.add(bytes([hi, lo]).decode("euc-kr"))
        except UnicodeDecodeError: pass
for hi in range(0x88, 0x99):  # JIS X 0208 1수준 한자(Shift_JIS 0x889F–0x9872)
    for lo in list(range(0x40, 0x7F)) + list(range(0x80, 0xFD)):
        try:
            ch = bytes([hi, lo]).decode("shift_jis")
            if 0x4E00 <= ord(ch) <= 0x9FFF: chars.add(ch)
        except UnicodeDecodeError: pass
files = glob.glob(root + "/apps/mobile/content/**/*.json", recursive=True)
files += glob.glob(root + "/apps/mobile/src/lib/ui-copy-*.ts")
for path in files:
    for ch in open(path, encoding="utf-8").read():
        if 0xAC00 <= ord(ch) <= 0xD7A3 or 0x4E00 <= ord(ch) <= 0x9FFF: chars.add(ch)
print(",".join("U+%04X" % ord(c) for c in sorted(chars)))
EOF

# 글꼴 이름표를 새 이름으로 바꾼다(가족 · 하위 가족 · 전체 · PostScript · 고유 ID).
rename() {
  "$PY" - "$1" "$2" "$3" <<'EOF'
import sys
from fontTools.ttLib import TTFont
path, family, style = sys.argv[1], sys.argv[2], sys.argv[3]
font = TTFont(path)
name = font["name"]
ps = family.replace(" ", "") + "-" + style.replace(" ", "")
for record in list(name.names):
    if record.nameID in (1, 2, 3, 4, 6, 16, 17, 21, 22, 25):
        name.removeNames(nameID=record.nameID)
for platform in ((3, 1, 0x409), (1, 0, 0)):
    for name_id, value in ((1, family), (2, style), (3, ps), (4, family + " " + style), (6, ps), (16, family), (17, style)):
        name.setName(value, name_id, *platform)
if "fvar" in font:
    for instance in font["fvar"].instances:
        instance.postscriptNameID = 0xFFFF
font.save(path)
EOF
}

# Duru Sans — 굵기 축(wght)은 남긴다. 토큰이 500 · 600 · 700을 쓴다.
"$PY" -m fontTools.subset "$SANS_SRC" \
  --unicodes="$LATIN,U+3130-318F,U+3000-30FF,U+FF00-FFEF,$(cat "$WORK/cjk.txt")" \
  --layout-features='*' --no-hinting --output-file="$WORK/DuruSans.ttf"
rename "$WORK/DuruSans.ttf" "Duru Sans" "Regular"

# Duru Roman — 로마자 줄(medium 500 · 본문 크기)에 맞춰 wght 500 · opsz 14로 고정한 정적 기울임 판.
"$PY" -m fontTools.varLib.instancer "$ROMAN_SRC" wght=500 opsz=14 --static -o "$WORK/roman-static.ttf"
"$PY" -m fontTools.subset "$WORK/roman-static.ttf" \
  --unicodes="$ROMAN_LATIN" --layout-features='*' --no-hinting --output-file="$WORK/DuruRoman.ttf"
rename "$WORK/DuruRoman.ttf" "Duru Roman" "Italic"

for dest in "$ROOT/apps/ios/Host/fonts" "$ROOT/apps/android/app/src/main/assets/fonts"; do
  cp "$WORK/DuruSans.ttf" "$WORK/DuruRoman.ttf" "$dest/"
done
ls -l "$ROOT/apps/ios/Host/fonts/DuruSans.ttf" "$ROOT/apps/ios/Host/fonts/DuruRoman.ttf"
