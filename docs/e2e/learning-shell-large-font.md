# 학습 껍데기 큰 글꼴 — 좁은 화면에서 한 스크롤로 합쳐도 보기에 닿고, 보통 글꼴의 모습은 그대로인가

학습 화면(`LearningShell`)이 **작업 영역 스크롤의 실제 높이가 96dp 미만**이면(`learningShellMergeBelow`) 지시문 · 무대 카드 · 작업 영역을 **스크롤 하나**(`learning-shell-scroll` 안의 `learning-shell-flow`)로 합치는 변경(작업 `learning-shell-large-font`)을 **기기에서 본다.** 글꼴 2.35 · 글꼴 2.0 + 밀도 540(adb 강제 — 설정 UI의 「화면 크기」 최대 단계가 540인지는 확인하지 않았다)처럼 작업 영역이 0dp가 되는 조건에서 보기에 닿지 못하고 지시문이 카드에 눌리던 것(accessibility의 E1)이 고쳐졌는지, 그러면서 **글꼴 2.0 이하의 모습 · 동작이 한 행도 달라지지 않았는지**를 본다.

ui 테스트는 구조를 본다 — 높이 0이 보고되면 `learning-shell-flow`가 서는가, 96 이상이면 안 서는가, 문항이 바뀌어도 같은 요소인가. 그러나 CSS가 계산되지 않아 **실제로 높이가 0이 되는가 · `layoutchange`가 기기에서 오는가 · 합친 뒤 끌리는가 · 음수 여백이 서는가 · 멈춘 화면의 픽셀 · 소리가 한 번 나는가**는 못 본다. 이 문서는 그것만 진다. 근거 · 수치는 작업의 `spec.md`(계약 · r02) · `design.md`(§12 기기에서 확인할 것 열 건) · `spike.md`(기기에서 통한 측정)이고, 이 문서는 **절차**다.

**이 절차는 2026-10-09에 Android 에뮬레이터 한 대(Pixel_8 · API 37)에서 세 회차 돌았다**(아래 「실행 상태」 · 「실행 결과」). 첫 회차는 합친 흐름의 아래 흐림이 그려지지 않는 제품 결함으로 FAIL이었고, 그 수정(`f55e6412`) 뒤 재실행이 결함 · 회귀 범위를 다시 봐 PASS였다. 3회차는 계약 r03(답하면 맨 위로 · 흐름 안 카드의 `z-index` 0)의 판정 L10 · L11과 회귀를 봐 PASS였다. 세 회차가 찾은 절차 결함은 이 개정에서 고쳤지만, **고친 판은 기기에서 돌지 않았다**(「실행 결과」의 「절차 결함 — 이 개정에서 고친 것」). 특히 r03 함수(`l10` · `l10top` · `l11` · `l11ans` · `rg3` · `so_enter`)와 부록 `badge.py`는 3회차 실행 뒤에 스크립트를 옮겨 적은 것이라 **이 판 그대로 기기에서 돈 적이 없다**(문법 확인 · 저장 캡처 재현뿐 — `evidence.yaml` documentation 기록). 3회차의 L10은 실행 중에 새로 만든 `badge.py`로 판정됐고(`e2e-run-3.md`), 문서에 부록으로 옮긴 `badge.py`는 그 복사본이지 그때 돈 파일이 아니다. 좌표 · 임계값 가운데 세 회차가 기기에서 쓴 값은 [실측(1회차)] · [실측(2회차)] · [실측(3회차)]로, 스파이크 캡처에서 읽은 값은 [실측(스파이크)]로, 읽지 않고 이어 붙인 값은 [추론]으로 표시한다.

## 실행 상태

**세 회차, 모두 Android 에뮬레이터 Pixel_8 · API 37 한 대**(1080x2400 · 밀도 420, L2 · L10의 2.0 + 최대만 adb로 밀도 540). **iOS는 실행된 회차가 없다. 미실행 · 미확인 · 도달 실패는 통과가 아니다.** 다시 돌리면 이 표와 아래 「실행 결과」를 같은 날 함께 고친다.

**미실행 판**: 아래 표의 판정은 세 회차가 당시 스크립트로 얻은 것이다. L10 · L11 · RG3 행(**미실행 판** 표기)의 절차 함수 `l10` · `l10top` · `l11` · `l11ans` · `rg3` · `so_enter`와 `badge.py` 부록은 옮겨 적은 판이라 이 문서 그대로는 기기에서 돈 적이 없고, 표의 통과는 그 판의 통과가 아니다. 이 판으로 한 번 돌려 보기 전까지 이 함수들의 판정은 미확인으로 읽는다.

| 항목 | 무엇 | 판정 방식 | 수정 전 번들(재현) | 수정 뒤 번들 |
|---|---|---|---|---|
| R | 재현 — 수정 전 번들에서 글꼴 2.35 · 2.0 + 밀도 540: 보기 0개 · 끌기 0행 · 지시문 잘림 | 픽셀 | **성립**(1회차) | 해당 없음 |
| L0 (a) | 글꼴 2.35에서 측정이 와서(높이 0) 보기에 닿는다 | 픽셀 | 재현(1회차) | **통과**(1회차) |
| L0 (b) | 음수 여백: 글꼴 2.2에서 화면 왼쪽 끝 끌기 · 세션 헤더 아랫변에서 잘림 · 카드 옆 그림자 열 | 픽셀 | 해당 없음 | **통과**(1회차) |
| L0 (c) | `scrollTo` — L9에 닿으면 거기서 | L9 | 해당 없음 | **미확인** — L9 도달 불가 |
| L0 (d) | 아래 띠가 카드 위에 그려진다(글꼴 2.35) | 픽셀 + 눈 | 해당 없음 | 1회차 **FAIL**(제품 결함) → 수정 뒤 2회차 **통과** |
| L1 | 글꼴 2.35 듣기: 끌어서 보기 둘이 온전히 보이고 눌러서 판정이 난다 | 픽셀 | 재현(1회차) | **통과**(1회차) |
| L2 | 글꼴 2.0 + 화면 크기 최대: L1과 같다 | 픽셀 | 재현(1회차, 밀도 540 adb 강제) | **통과**(1회차, adb 강제 — 설정 UI의 최대 단계는 읽지 않았다) |
| L3 | 지시문의 모든 줄이 카드 위에 온전하다(2.35 · 2.0 + 최대) | 눈 + 픽셀 보조 | 재현(1회차) | **통과**(1회차) |
| L4 | 글꼴 1.0 · 1.3 · 2.0 멈춘 화면이 수정 전후 같다 · 2.0에서 무대가 제자리 · 2.0 끝까지 내리면 마지막 보기가 통째로 | 픽셀 | — | **통과**(1회차 · 2회차) |
| L5 | 글꼴 2.2: 멈춘 화면 같음(그림자 열 포함) · 끌면 무대가 함께 움직임 · **끝까지 내려도 마지막 보기 라벨이 안 가려짐(AC22 — 사용자 결정)** | 픽셀 + 눈 | 재현(1회차) | (a) 1회차 **FAIL**(띠 결함) → 2회차 **통과** · (b)(c) **통과**(1회차) |
| L6 | 글꼴 2.35 · 2.2 완료 화면: 버튼이 배지를 덮지 않고 자리가 수정 전과 같다 | 픽셀 + 눈 | 재현(1회차, 2.2) | **통과**(1회차 — 2.35는 배지 글자 온전 여부 미확인) |
| L7 | 진입 직후 연속 8장 · 듣기 재생이 한 번 시작된다 | 픽셀(장 분류) + 로그 | JS 1회(1회차) | 8장: **통과** · 재생: JS 1회 **통과** · **네이티브 횟수는 못 셌다**(1회차) |
| L8 | 쓰기 · 말하기 · 문장 만들기 · 96 이상의 좁은 `split` — 기록만 | 기록 | — | 기록(1회차 · 2회차) |
| L9 | 문항 둘 이상인 학습 스텝: 아래로 내린 채 답하고 넘어가면 다음 문항이 맨 위 | 픽셀 | — | **도달 불가 — 제품 데이터에 문항 둘 이상인 학습 스텝이 없다**(2회차 확인). AC19의 기기 쪽 미확인 |
| L10 **(미실행 판)** | **판정(AC25 — 3회차부터)**: 글꼴 2.2 · 2.35 · 2.0 + 밀도 540에서 보기로 내려 답한 직후 판정 배지가 세션 헤더 아래에 온전하고 자동 넘김까지 남는다 | 픽셀(`badge.py`) + 눈 | 1회차는 기록만(2.0 + 540 배지 없음) · 3회차 r03 수정 전 `47c52a7f`: 2.35 잘림 · 2.0 + 540 없음(**red 재현**) | **통과**(3회차) |
| L11 **(미실행 판)** | **판정(AC16 — 3회차 신설)**: 글꼴 2.2 · 2.35에서 TalkBack 오른쪽 쓸기만으로 지시문 → 무대 → 보기, 화면 밖 보기로 가면 스크롤이 따라온다 | 픽셀(`ring.py`) + 눈 | C1 수정 전 `dd413834`: 2.35 보기에 못 닿음 · 2.2 순서 뒤집힘(**red 재현**) | **통과**(3회차 — 2.2 · 2.35 각 3/3, 첫 걷기 이상 1건). ⟨2026-10-10⟩ 절차 밖 accessibility r2: 2.2 6/6 · 2.35 2/2 · **2.0 + 밀도 540 2/2** 같은 순서, 이상 재현 0 → 「재현 1/17 · 원인 미확인」 |
| RG3 **(미실행 판)** | r03 회귀: 글꼴 1.0 · 2.0(`split`)의 멈춘 화면 · 답한 1초 뒤가 r03 전후 같다 · 문장 만들기 2.35에서 조각을 채우는 동안 튀지 않고 `Check` 뒤 맨 위 | 픽셀 | — | **통과**(3회차) |
| T | 문턱 근처: 글꼴 2.0(117dp) `split` 유지 · 글꼴 2.2(78dp) `merged` | 픽셀 | — | **통과**(1회차 — 추가로 2.1 `split` · 2.15 `merged`) |

2회차는 수정(`f55e6412` — 흐림 상자의 `z-index` 한 값)의 범위만 다시 돌렸다: L0(d) · L5(a) · 띠 안의 탭 · 끌기 · L4 회귀 · L8 쓰기 · 말하기 · L9의 도달 조사. **1회차에서 통과한 나머지(L0(a)(b) · L1 · L2 · L3 · L5(b)(c) · L6 · L7 · T)는 수정 뒤 번들에서 기기로 다시 보지 않았다** — 바뀐 것이 CSS 한 값이고 1회차의 수정 뒤 번들이 2회차의 `mid`와 같은 sha라는 것이 근거의 전부다. 3회차(`aaa58aad`)는 L10 · L11 · RG3만 돌렸다 — 바뀐 것은 맨 위로 보내는 때(답한 순간)와 흐름 안 카드의 `z-index`이고, 그 밖의 항목은 3회차 번들에서 다시 보지 않았다.

판정 방식: **픽셀** = 이 문서의 도구(`barscan.py diff` · `fogband.py` · `lsfont.py` · `bandrows.py`)가 캡처에서 재는 것. **로그** = `logcat` · `dumpsys audio`로 세는 것. **눈** = 캡처를 열어 사람이 읽는 것 — 눈으로만 서는 판정은 「눈」이라고 표에 적고, 숫자로 보조되는 것은 그 숫자를 같이 적는다.

## 이 절차로 확인되지 않는 것

- **iOS.** 이 절차는 Android 에뮬레이터 한 대다. iOS에는 로그인 뒤 학습 화면에 닿는 픽스처가 없다 — 이 문서는 iOS 절차를 두지 않았다(준비는 `hide-scrollbars.md` S5의 「준비」). ⟨2026-10-09⟩ **절차 밖에서 한 점을 봤다**: 성능 측정 세션이 iPhone 17 Pro 시뮬레이터(iOS 26.5) · 최대 Dynamic Type(`content_size accessibility-extra-extra-extra-large`) · dev playground 듣기에서, 합침을 끈 번들(`learningShellFlow`가 늘 `split`)은 무대 카드가 지시문을 덮고 **보기 · 재생에 닿지 않고**(접근성 트리에도 없다 — 재현), `aaa58aad`는 한 흐름으로 합쳐져 **쓸기로 마지막 보기까지 닿는 것**을 스크린샷 · 접근성 트리로 확인했다 [실측 — [성능 보고서](../performance/reports/learning-shell-large-font-learning-entry-iphone-17-pro-simulator-01.md)]. 그 범위는 시뮬레이터 한 대 · AX3XL 한 단계 · playground 번들이다. **여전히 미확인**: 실기 · 제품 번들, 합쳐지기 시작하는 배율, `layoutchange`의 값 · 단위(합쳐졌으니 도착은 했다고 본다 [추론]), L1의 판정(눌러서 판정이 나는가) · 음수 여백 · 흐림의 픽셀, VoiceOver. 같은 화면에서 상단 바의 칩이 상태 바와 겹쳐 보였다 — 판정 아님, 큰 글꼴 겹침(E4 류)의 후속.
- **쓰기 화면.** 쓰기(`workspaceScrolls={false}`)는 높이가 0이어도 합치지 않는다(사용자 결정 「후속」, 계약 §7). 큰 글꼴에서 그리기 면이 보이는지는 L8이 **기록만** 하고 판정하지 않는다. 쓰기의 큰 글꼴 문제는 이 작업에서 고쳐지지 않는다.
- **보기 4개 문항 · 두 줄 라벨.** 픽스처 `tutorial-listening`은 보기 둘 · 한 줄 라벨이다. 보기 칸이 더 높은 문항(단어 선택의 보기 4 · 두 줄로 꺾이는 라벨)에서 문턱 96 근처의 `split`이 어떻게 보이는지는 못 본다(design §10: 96 이상의 좁은 `split`에서 두 줄 라벨의 첫 줄이 가려질 수 있다 [추론]).
- **TalkBack의 낭독 글자** — L11은 쓸기 순서를 초점 테두리의 상자(`ring.py`)로만 본다. 큰 글꼴에서 「Display speech output」 상자가 화면을 가려 끄고 돈다. 그래서 **답해도 판정이 낭독되지 않는 것(accessibility W1 — 기존, main과 같다)**은 이 절차가 보지 않는다. 2.0 + 밀도 540의 TalkBack, TalkBack을 앱이 뜬 뒤 켜는 경우, iOS VoiceOver도 보지 않는다. ⟨2026-10-10⟩ 2.0 + 밀도 540의 TalkBack은 **절차 밖에서** accessibility 재확인(작업 폴더의 `accessibility-r2.md`)이 봤다 — 쓸기 순서가 2.2 · 2.35와 같고(2/2), TalkBack으로 답하면 스크롤 72px · 초점이 카드 글자로 옮겨 가며 배지는 온전했다 [실측]. 이 절차의 L11에는 그 조건을 더하지 않았다. TalkBack을 켜는 것은 L11뿐이다(끌기가 접근성 제스처로 가로채이므로 다른 케이스는 끈 채 돈다).
- ~~**판정 배지가 보이는가(1.4.1)** — L10은 기록만 한다. 판정은 accessibility 단계가 한다.~~ ⟨2026-10-09⟩ L10이 판정 케이스가 됐다(계약 r03 — 사용자 결정 「답하면 맨 위로」). 지시문이 아주 길어 배지가 첫 화면 아래로 밀리는 문항은 제품에서 닿지 않아 보지 못한다.
- **단어 선택의 큰 글꼴 답함** — 보기 4개 문항이 제품에서 닿지 않아 L10은 듣기 · 문장 만들기만 본다.
- **글꼴 3.0 · 2.35 초과 · 다른 에뮬레이터 · API 37 밖** — 한 기기 · 한 API만 본다. 글꼴 2.0 ~ 2.2 사이의 배율(L8)은 기록만 한다.
- **문턱 96의 흔들림**: 스파이크가 관측한 높이는 281 · 117 · 78 · 0 네 점뿐이다. 이 절차는 그 네 점에서 판정이 갈리는지만 본다(T). 96 근처 값은 L8의 배율 탐색이 기록만 한다.
- **소리가 귀에 들렸는가**: L7은 호출 수 · 플레이어 이벤트로 센다. 스피커 출력을 듣지 않는다.
- **네이티브 재생 시작 횟수**: 1회차에서 `dumpsys audio`의 플레이어 이력이 가득 차 있어 조작 전후 `event:started`의 차이가 세 번 다 0으로 읽혔다 — 이 기기 상태에서는 수단이 서지 않는다. L7은 **JS의 `AudioPlaybackModule.play` 호출 수만** 판정에 쓰고 네이티브 쪽은 「미확인」으로 적는다(L7).
- **문항 전환 뒤 맨 위(L9 · L0(c))**: 제품 데이터에 문항이 둘 이상인 학습 스텝이 없어 기기에서 문항 전환을 일으킬 수 없다(L9). ui 테스트(MG13 · MG14)가 결선을 본다.
- **ui 테스트가 이미 지키는 것**(다시 안 본다): 합친 구조의 요소 순서 · 걸쇠 · 쓰기와 말하기 제외 · 액션 행의 `-in-flow` · `ui-lynx-fog` 개수 · mount 횟수 · `scrollTo` 호출 인자.

## 비교 번들

| 이름 | 커밋 | 무엇 |
|---|---|---|
| `before`(수정 전) | `fa3b261e` | 이 작업의 첫 커밋(`22b02e8f`) 바로 앞. `hide-scrollbars`의 fog · `user-interaction-enabled` 수정과 `learning-item-guides`의 안내까지 들어간 번들이다 — 띠 안의 탭 · 끌기와 첫 열기 안내가 두 번들에서 같은 조건이어야 비교가 선다. 계약 test-plan이 정한 것이다 |
| `after`(수정 뒤) | 이 작업의 HEAD(`git rev-parse --short HEAD` — 실행 결과에 적는다) | 합친 흐름 구현 |

수정을 한 번 더 거친 뒤 그 수정만 가르려면 셋째 번들 `mid`(수정 직전 커밋)를 더한다 — 2회차는 `mid` = `35ab98c0`(흐림 결함이 있는 번들, 1회차의 `after`와 sha 같음) · `after` = `f55e6412`로 돌았다. 이름이 셋이어도 판정 쌍은 표에 적힌 두 번들끼리다.

**L10 · L11 · RG3(계약 r03)의 번들은 다르다** — 판정 쌍이 「r03 수정 전 ↔ 뒤」이기 때문이다. 3회차의 값: `before` = `47c52a7f`(C1 수정은 들었고 답한 순간의 맨 위로는 없다 — L10 · RG3의 짝), `c1` = `dd413834`(C1 수정 직전 — L11의 red 재현, accessibility 감사 번들과 sha 같음), `after` = 실행 HEAD. 한 실행 안에서 `before`라는 이름이 두 커밋을 가리키지 않게 r03 케이스는 따로 서버 루트를 만든다.

`26d2e671`(판정 함수만 들어가고 껍데기에는 안 이어진 커밋)도 껍데기의 동작은 `fa3b261e`와 같아 수정 전으로 쓸 수 있다. 다만 듣기의 재생 주인을 화면으로 올린 순수 이동(`e6cc66f3`)이 들어 있어 L7의 재생 횟수 기준선은 `fa3b261e`가 더 순수하다. **한 실행 안에서 `before`는 하나만 쓰고 커밋을 적는다.**

번들은 `hide-scrollbars.md`의 「기기 · 빌드」 절차로 짓는다(모의 값 · 임시 워크트리 · `shasum`이 서로 달라야 함 · 서버 18790 · 서버 루트의 `static` 링크). 그 문서의 코드를 복사하지 않는다 — 다만 이 문서의 이름은 `before` · `after` 둘이다(`nofog`는 안 쓴다). `pnpm verify`가 `apps/mobile/dist`를 덮어쓰므로 verify 뒤에는 번들을 다시 만든다. 호스트 APK · 계측 APK는 기기에 깔린 것을 쓰고, **설치된 APK의 커밋을 실행 결과에 적는다.**

```sh
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
ID="${ID:?adb devices가 보여 준 에뮬레이터 ID를 ID에 넣는다}"
A() { adb -s "$ID" "$@"; }       # 함수다 — `A shell …`. 문자열 변수는 zsh에서 깨진다
PKG=libitum.duru.android
: "${OUT:?OUT에 증거 폴더의 절대 경로를 넣는다}"
case "$OUT" in /*) ;; *) echo "OUT은 절대 경로여야 한다: $OUT" ;; esac
TOOLS="$OUT/tools"; mkdir -p "$OUT" "$TOOLS"
A shell getprop ro.build.version.sdk        # 37
curl -sI http://localhost:18790/before/main.lynx.bundle | head -1     # 200
curl -sI http://localhost:18790/after/main.lynx.bundle | head -1      # 200
```

## 환경 — 에뮬레이터를 같이 쓰고 있지 않은가

에뮬레이터는 한 대이고 다른 작업이 같은 기기를 쓸 수 있다. 이 절차는 **글꼴 배율 · 화면 크기(밀도) · 앱 데이터를 바꾼다.** 스파이크는 단계마다 `guard`로 확인했고 남의 흔적은 없었지만 그것이 항상 그렇다는 보장은 아니다.

- **단계 앞에서마다 `guard`를 부른다** — `wm size` · `wm density` · 포커스를 읽어 기대와 다르면 멈춘다. 기대는 크기 1080x2400 · 재정의 없음 · 밀도 420(L2의 밀도 540 단계만 `guard 이름 540`). 다른 값이 나오면 다른 세션이 바꾼 것일 수 있으니 **되돌리지 말고 멈추고 보고한다.**
- 3000 포트는 쓰지도 건드리지도 않는다(다른 워크트리의 개발 서버일 수 있다).
- 시작 전에 `night`는 `Night mode: no`, `font_scale` 기록, TalkBack 꺼짐이어야 한다(`hide-scrollbars.md`의 「시작 전 전역 설정」 표). 그 문서의 `globals` 함수를 그대로 쓴다.
- 이 절차가 바꾸는 전역 설정: **글꼴 배율**(`font_scale` — 2.35 · 2.0 · 2.2 · 1.3 · 1.0, L8은 2.0과 2.2 사이) · **밀도**(L2 — `wm density`). 화면 크기(`wm size`)는 바꾸지 않는다.

```sh
# hide-scrollbars.md 「시작 전 전역 설정」의 globals 함수 블록을 한 셸에 정의한 뒤 — 그 문서의 코드를 복사하지 않는다
globals | tee "$OUT/globals-before.txt"
A shell settings list global | tr -d '\r' | sort > "$OUT/settings-global-before.txt"
A shell settings list system | tr -d '\r' | sort > "$OUT/settings-system-before.txt"
A shell settings list secure | tr -d '\r' | sort > "$OUT/settings-secure-before.txt"
```

**끝에서(케이스가 끝나거나 중간에 멈출 때마다 부른다)**: 글꼴 · 밀도를 원래대로 되돌리고, **`wm density reset` · `wm size reset` 뒤 남는 빈 `display_density_forced=` · `display_size_forced=` 행을 global과 secure 둘 다에서 지운다.** 1회차는 global만 지우는 판으로 돌았고, 밀도 540을 되돌린 뒤 **secure에 빈 `display_density_forced=`가 남아** 손으로 지웠다 [실측(1회차)]. 2회차는 아래 판(global · secure 둘 다)으로 돌아 전역 설정 diff 0이었다 [실측(2회차)]. 지운 뒤 두 목록에서 `display_*_forced`가 0줄인지 본다.

```sh
restore_all() {
  A shell settings put system font_scale "$(grep '^font_scale:' "$OUT/globals-before.txt" | awk '{print $2}')"; sleep 2
  A shell wm density reset; A shell wm size reset
  local K N
  for K in global secure; do
    for N in display_density_forced display_size_forced; do
      A shell settings list "$K" | tr -d '\r' | grep -q "^$N=" && A shell settings delete "$K" "$N"
    done
  done
  for K in global secure; do
    echo "$K display_*_forced: $(A shell settings list "$K" | tr -d '\r' | grep -c '^display_.*_forced=')줄"     # 0줄이어야 한다
  done
  fixture_stop; DENS=420
}
# 맨 끝: restore_all 뒤
globals > "$OUT/globals-after.txt"; diff "$OUT/globals-before.txt" "$OUT/globals-after.txt" && echo "전역 설정 diff 0"
for K in global system secure; do A shell settings list $K | tr -d '\r' | sort > "$OUT/settings-$K-after.txt"; diff "$OUT/settings-$K-before.txt" "$OUT/settings-$K-after.txt" && echo "settings $K diff 0"; done
```

## 도구

도구는 이 저장소의 다른 문서에서 **꺼내 쓴다**(복사하지 않는다). 새로 필요한 것 셋(`lsfont.py` · `bandrows.py` · `badge.py`)만 이 문서 부록에 있다. `bandrows.py`는 2회차가 L0(d)의 변별을 위해, `badge.py`는 3회차가 L10의 판독을 위해 만든 보조 도구를 옮겨 selftest를 붙인 것이다.

| 도구 | 어디서 | 이 문서가 쓰는 곳 |
|---|---|---|
| `barscan.py` (`diff` = 두 캡처의 다른 행 수) · `fogband.py` (`band` · `split` · `fade` · `px` · `shift`) | [`hide-scrollbars.md`](hide-scrollbars.md) 부록 | 행 비교 · 스크롤 양 · 점의 색 |
| 함수 `shot` · `waitre` · `fixture_stop` · `burst`(탭 직후 연속 8장) · `globals` | 같은 문서 「도구」 · 「r02 — 공통 함수」 · 「시작 전 전역 설정」 | 전부 |
| `colorxy.py` (색의 중심 — 맵의 유닛 원 · 시트의 Start) | [`learning-item-guides.md`](learning-item-guides.md) 부록의 `file=colorxy.py` 블록 | 맵 진입 |
| `aevents` (`dumpsys audio`의 플레이어 이력) · `calls` (Lynx 모듈 호출 수) | [`android-assets.md`](android-assets.md)의 `events` · [`android-release-config.md`](android-release-config.md)의 `calls` | L7 |
| 문장 만들기 · 말하기 · 쓰기의 진입 · 첫 열기 안내를 닫는 법 | `learning-item-guides.md`의 「단원별 도달 — Android」 표 · 「저장 기록 읽고 지우고 심기」 | L4 · L8 · L9 |
| `lsfont.py` (`choices` · `pick` · `diffx` · `runs` · `shadowcol` · `darkest`) | **이 문서 부록** | 보기 개수 · 그림자 제외 행 비교 · 가장자리 그림자 · 띠 안의 농도 |
| `bandrows.py` (행마다 가장 어두운 점 · 평균 밝기) | **이 문서 부록** | L0(d) · L5(a) — 띠 안에서 위에서 아래로 옅어지는 기울기 |
| `badge.py` (판정 배지 채움색의 y 범위) | **이 문서 부록** | L10 · RG3 — 배지가 헤더 아래에 온전한가 |
| `ring.py` (TalkBack 초점 테두리의 상자) · `tb-idioms.sh` (`tb_on` · `tb_off` · `afocus` · `swiperight` · `dtap` — 에뮬레이터 하드웨어 터치) | [`learning-item-guides.md`](learning-item-guides.md) 부록의 `file=ring.py` · `file=tb-idioms.sh` 블록 | L11 |

한 번만 — 추출 · 컴파일 · selftest(저장소 루트에서 연 셸 기준. 기기를 쓰지 않는다):

```sh
DOC="$PWD/docs/e2e/learning-shell-large-font.md"
DOC_HS="$PWD/docs/e2e/hide-scrollbars.md"
DOC_GUIDE="$PWD/docs/e2e/learning-item-guides.md"
python3 - "$DOC" "$DOC_HS" "$DOC_GUIDE" "$TOOLS" <<'PY'
import pathlib, re, sys
doc, doc_hs, doc_guide, out = sys.argv[1], sys.argv[2], sys.argv[3], pathlib.Path(sys.argv[4])
out.mkdir(parents=True, exist_ok=True)
def put(name, text):
    (out / name).write_text(text, encoding='utf-8'); print('wrote', out / name)
def titled(path, name):    # 「### `이름`」 제목 아래 첫 python 블록
    t = open(path, encoding='utf-8').read()
    m = re.search(r'^### `' + re.escape(name) + r'`[^\n]*\n.*?^```python\n(.*?)^```$', t, re.S | re.M)
    assert m, (path, name)
    return m.group(1)
for name in ('barscan.py', 'fogband.py'):
    put(name, titled(doc_hs, name))
put('lsfont.py', titled(doc, 'lsfont.py'))
put('bandrows.py', titled(doc, 'bandrows.py'))
put('badge.py', titled(doc, 'badge.py'))
guide = open(doc_guide, encoding='utf-8').read()
for name, lang in (('colorxy.py', 'python'), ('ring.py', 'python'), ('tb-idioms.sh', 'sh')):
    m = re.search(r'^```' + lang + r' file=' + re.escape(name) + r'\n(.*?)^```$', guide, re.S | re.M)
    assert m, name
    put(name, m.group(1))
PY
python3 -m py_compile "$TOOLS/barscan.py" "$TOOLS/fogband.py" "$TOOLS/colorxy.py" "$TOOLS/lsfont.py" "$TOOLS/bandrows.py" "$TOOLS/badge.py" "$TOOLS/ring.py" && echo tools-ok
bash -n "$TOOLS/tb-idioms.sh" && echo tb-idioms-ok
python3 "$TOOLS/barscan.py" selftest | tail -1     # selftest PASS
python3 "$TOOLS/fogband.py" selftest | tail -1     # selftest PASS
python3 "$TOOLS/colorxy.py" selftest | tail -1     # selftest PASS
python3 "$TOOLS/lsfont.py" selftest | tail -1      # selftest PASS
python3 "$TOOLS/bandrows.py" selftest | tail -1    # selftest PASS
python3 "$TOOLS/badge.py" selftest | tail -1       # selftest PASS
python3 "$TOOLS/ring.py" selftest | tail -1        # selftest PASS
```

## 함수 묶음 — 한 셸에 정의한다 (**bash로 돌린다**)

**이 절차는 bash로 돌린다.** zsh는 따옴표 없는 변수를 낱말로 가르지 않아 `A shell input tap $XY`(좌표 둘이 한 인자로 간다)와 `set -- $P`(쌍이 갈리지 않는다)가 깨진다 — 세 회차가 모두 겪었다 [실측(1 · 2 · 3회차) — 3회차는 `set -- $cfg`가 안 갈려 한 번 빈 실행이 됐다]. macOS의 기본 셸이 zsh이므로 `bash`를 먼저 띄우고 그 안에서 아래를 정의한다.

`hide-scrollbars.md`의 `shot` · `waitre` · `fixture_stop` · `burst`를 먼저 정의한다. 아래는 이 문서의 것이다. **픽스처는 약 180초 뒤 끝나므로 진입부터 캡처까지를 한 호출 안에서 끝낸다**(끝난 뒤의 캡처는 런처이니 폐기한다).

```sh
cxy() { python3 "$TOOLS/colorxy.py" "$@"; }
LSF() { python3 "$TOOLS/lsfont.py" "$@"; }
setfont() { A shell settings put system font_scale "$1"; sleep 3; }     # 픽스처를 시작하기 **전에** — 화면이 켜진 채 바꾸면 Activity가 다시 만들어진다

# guard 이름 [기대 밀도, 기본 420] — 다른 세션이 기기를 바꿨는지 본다. 어긋나면 1(멈춘다)
guard() {
  local S D F WANT=${2:-420}
  S=$(A shell wm size | tr -d '\r' | tr '\n' ' '); D=$(A shell wm density | tr -d '\r' | tr '\n' ' ')
  F=$(A shell dumpsys window | tr -d '\r' | grep mCurrentFocus)
  echo "guard[$1]: $S| $D| $F"
  case "$S" in *Override*) echo "FOREIGN: size override"; return 1;; esac
  case "$S" in *1080x2400*) ;; *) echo "FOREIGN: size"; return 1;; esac
  if [ "$WANT" = 420 ]; then
    case "$D" in *Override*) echo "FOREIGN: density override"; return 1;; esac
    case "$D" in *420*) ;; *) echo "FOREIGN: density"; return 1;; esac
  else
    case "$D" in *"Override density: $WANT"*) ;; *) echo "FOREIGN: density (기대 $WANT)"; return 1;; esac
  fi
  ps -Ao pid,etime,command | grep -E "adb( -s $ID)? " | grep -v grep | cut -c1-160    # 같은 기기를 쓰는 다른 adb가 있으면 보인다(이 셸의 것도 보일 수 있다) — 사람이 판단한다
  return 0
}

# 알림 권한 창이 앱을 가리면(mCurrentFocus가 GrantPermissionsActivity) 그 태스크를 치운다
killperm() {
  local T
  T=$(A shell dumpsys activity activities | tr -d '\r' | grep -o "GrantPermissionsActivity t[0-9]*" | head -1 | grep -o "[0-9]*$")
  [ -n "$T" ] && { A shell am stack remove "$T"; echo "removed perm task $T"; sleep 1; }
  return 0
}

# lsfx before|after [-e 옵션 true …] — 새 상태로 계측 픽스처를 띄운다(고정 대기 — uiautomator를 쓰지 않는다)
lsfx() {
  local W=$1; shift
  fixture_stop; sleep 1; A shell pm clear "$PKG" >/dev/null; A logcat -c
  A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest "$@" \
    -e bundleUrl "http://10.0.2.2:18790/$W/main.lynx.bundle" \
    "$PKG.test/androidx.test.runner.AndroidJUnitRunner" >"$OUT/fixture-$W.log" 2>&1 &
  sleep 14; killperm
  A shell dumpsys window | tr -d '\r' | grep mCurrentFocus
}

# 맵의 주황 유닛 원 — 크기 n이 UNMIN~UNMAX(기본 2500~3200 = 밀도 420)이고 x가 520~560이어야 한다.
# 밀도 540은 아래 「밀도 540의 값」(UNMIN=3000 UNMAX=5600 …)을 쓴다 [실측(1회차)]
unitxy() {
  shot nav; local C N X
  C=$(XMIN=420 XMAX=700 cxy "$OUT/nav.png" '#F56C14' 8 250 1900); N=${C##* }; X=${C%% *}
  [ "$C" != none ] && [ "$N" -gt "${UNMIN:-2500}" ] && [ "$N" -lt "${UNMAX:-3200}" ] && [ "$X" -gt 520 ] && [ "$X" -lt 560 ] && echo "$C"
}
# styfor 글꼴 — 시트의 Start를 찾는 y 범위(밀도 420)를 STY0 · STY1에 넣는다. enter가 부른다.
#   1.0 · 1.3 → 1700 ~ 2150 [실측(1회차 · 2회차)] · 2.0 → 2000 ~ 2380 [실측(2회차) — 기본 범위는 3회 중 2회 놓쳤다]
#   2.2 · 2.35 → 2100 ~ 2380 [실측(1회차 · 2회차) — 2.2는 기본 범위로 놓쳤다] · 2.05 ~ 2.15 → 같은 범위 [추론]
#   밀도 540(L2)이면 비운다 — lsgo의 기본(유닛 y+600 ~ 2380)으로 1회차가 닿았다
styfor() {
  unset STY0 STY1
  [ "${DENS:-420}" = 420 ] || return 0
  case "$1" in
    1.0|1.3) STY0=1700; STY1=2150 ;;
    2.0) STY0=2000; STY1=2380 ;;
    *) STY0=2100; STY1=2380 ;;
  esac
}

# lsgo — 픽스처가 떠 있는 상태에서 맵의 첫 주황 유닛을 열고 시트의 Start를 눌러 학습 화면으로 들어간다.
# Start의 y 범위는 STY0 · STY1(styfor), x는 300~800(그보다 넓으면 유닛 원이 섞인다).
# 맵을 미는 거리 SW0 → SW1(기본 1700 → 500)과 Start 크기의 하한 STMIN(기본 6000)은 밀도 540에서 바꾼다(아래 「밀도 540의 값」)
lsgo() {
  sleep 3; local I=0 C="" C2="x" X Y
  while [ "$I" -lt 20 ]; do
    if C=$(unitxy); then sleep 2; C2=$(unitxy); [ "$C" = "$C2" ] && break
    else A shell input swipe 540 "${SW0:-1700}" 540 "${SW1:-500}" 450; sleep 1.6; fi
    I=$((I + 1))
  done
  [ -n "$C" ] && [ "$C" = "$C2" ] || { echo "도달 실패: 맵에서 유닛을 못 찾았다(UNMIN · UNMAX를 캡처의 n으로 고친다)"; return 1; }
  read -r X Y _ <<<"$C"; echo "unit: $C (iter $I)"
  A shell input tap "$X" "$Y"; sleep 3.5; shot nav-sheet
  C=$(XMIN=300 XMAX=800 cxy "$OUT/nav-sheet.png" '#F56C14' 8 "${STY0:-$((Y + 600))}" "${STY1:-2380}"); echo "start: $C"
  [ "$C" = none ] && { echo "도달 실패: 시트의 Start가 없다"; return 1; }
  [ "${C##* }" -gt "${STMIN:-6000}" ] || { echo "도달 실패: Start가 너무 작다(탭 바의 깃발일 수 있다)"; return 1; }
  read -r X Y _ <<<"$C"; A shell input tap "$X" "$Y"; sleep 4
  shot nav-entered; echo "진입 캡처 $OUT/nav-entered.png 를 눈으로 한 번 본다(Listening 라벨 · 주황 진행 막대). 「still on map」 자동 판정은 주황 진행 막대 때문에 오탐이라 쓰지 않는다"
}

# 듣기의 자동 재생이 끝날 때까지 기다린다(최대 20초) — rest 캡처에 재생 중 표시가 섞이지 않게
aevents() { A shell dumpsys audio | tr -d '\r' | grep -E "player piid:[0-9]+ event:"; }
audio_settle() {
  local I=0
  while [ "$I" -lt 20 ]; do aevents | tail -1 | grep -q 'event:stopped' && return 0; sleep 1; I=$((I + 1)); done
  echo "재생 끝이 안 읽혔다 — dumpsys audio의 줄 모양을 android-assets.md의 events 주의로 본다(없으면 8초 더 기다리고 캡처는 재생 아이콘이 일시정지가 아닌지 눈으로)"; sleep 8; return 1
}

# enter before|after 글꼴 [옵션 …] — 글꼴 → guard → 픽스처 → 듣기 유닛 → 재생이 끝나길 기다린다. 이름 변수 RESTNAME이 있으면 rest 캡처를 뜬다.
# Start 검출이 가끔 놓치므로(글꼴 2.0에서 3회 중 2회 [실측(2회차)]) 픽스처부터 ENTER_TRIES번(기본 3) 다시 한다
enter() {
  local W=$1 F=$2 N=0; shift 2
  setfont "$F"; guard "enter-$W-$F" "${DENS:-420}" || return 1
  styfor "$F"
  while :; do
    lsfx "$W" "$@"; lsgo && break
    N=$((N + 1)); [ "$N" -ge "${ENTER_TRIES:-3}" ] && return 1
    echo "진입 재시도 $N"
  done
  case " $* " in *" audioProgress "*) audio_settle;; *) sleep 3;; esac
  [ -n "${RESTNAME:-}" ] && shot "$RESTNAME"; return 0
}

# 첫 열기 안내를 닫는다 — 문장 만들기 · 말하기 · 쓰기는 이 기기에서 처음 열면 안내가 먼저 뜬다(learning-item-guides.md).
# 앱 데이터를 매번 지우므로(pm clear) 매 진입마다 뜬다 [실측(2회차) — 쓰기 · 말하기]
guide_close() { A shell input tap 540 1200; sleep 2.5; }

# so_enter before|after 글꼴 — 새 상태에서 문장 만들기 「Your First Hello」(조각 하나)로 들어가 첫 열기 안내를 닫는다.
# 진행 시드 없이 픽스처를 띄우면 Episode 0 소개가 먼저 선다: Skip → 확인 창의 Skip → 완료 화면의 Back to map → 맵에 그
# 단원의 시트가 열린 채 선다 → 시트의 Start. lsgo는 쓰지 않는다 — 이 시트의 Start(글꼴 1.0에서 y 1504, 2.35에서 y 1990)는
# styfor의 범위와 맞지 않았다 [실측(3회차)]. 기본 좌표는 3회차가 글꼴 2.35 · 밀도 420의 캡처에서 읽은 것이다 — 다른 글꼴은
# so-*.png를 열어 SO_SKIP · SO_SKIPOK · SO_BACK · SO_STY0 · SO_STY1을 고친다. **글꼴은 진입 전에만 바꾼다** — 진행 도중에 바꾸면
# 앱이 다시 시작해 진행이 사라진다 [실측(3회차)]
so_enter() {
  local W=$1 F=$2 C X Y
  setfont "$F"; guard "so-$W-$F" || return 1
  lsfx "$W"; sleep 3; shot so-intro                                # Episode 0. Tutorial. — 아래에 Skip · Next
  A shell input tap ${SO_SKIP:-200 2158}; sleep 2; shot so-confirm      # 「Skip the story?」 창
  A shell input tap ${SO_SKIPOK:-540 1428}; sleep 4; shot so-done       # PERFECT LESSON! 화면
  A shell input tap ${SO_BACK:-540 2300}; sleep 4; shot so-sheet        # 맵 + 「Your First Hello」 시트
  C=$(XMIN=300 XMAX=800 cxy "$OUT/so-sheet.png" '#F56C14' 8 "${SO_STY0:-1800}" "${SO_STY1:-2150}"); echo "start: $C"
  [ "$C" = none ] && { echo "도달 실패: 시트의 Start가 없다(so-sheet.png로 SO_STY0 · SO_STY1을 고친다)"; return 1; }
  read -r X Y _ <<<"$C"; A shell input tap "$X" "$Y"; sleep 4
  guide_close; shot "so-$W-$F-rest"
}
```

**밀도 540의 값**(L2 · L10) [실측(1회차)]: 맵의 유닛 원 크기 `UNMIN=3000 UNMAX=5600`, 맵을 미는 거리를 줄인 `SW0=1500 SW1=1000`(기본 거리로는 유닛을 지나친다), 시트의 Start 크기 하한 `STMIN=4000`(그 밀도에서 Start의 n이 5118 ~ 10578로 읽혔다 — 기본 6000은 놓친다). Start의 y 범위는 기본(유닛 y+600 ~ 2380)이다. 이 문서의 첫 판이 적었던 `UNMIN=4000`(원이 1.65배라는 산술)과 Start 하한 6000은 맞지 않았다.

```sh
export UNMIN=3000 UNMAX=5600 SW0=1500 SW1=1000 STMIN=4000       # 밀도 540 단계에서만. 끝나면 unset UNMIN UNMAX SW0 SW1 STMIN
```

모든 캡처는 **무손실 PNG**(`screencap -p`)다. 캡처 이름은 `<케이스>-<번들>-<무엇>.png`. 끌기는 `input swipe x1 y1 x2 y2 600`, 끝난 뒤 3초(관성이 멈춘 뒤) 캡처한다. 판정에 쓰는 `diff` · `diffx`는 **같은 번들이 아니라 같은 번들의 rest ↔ drag 또는 두 번들의 rest끼리**다.

### 좌표 · 숫자의 출처

- Pixel_8 1080x2400 · 밀도 420(1dp = 2.625px) · 글꼴별 세션 헤더 아랫변 · 무대 카드 · 작업 영역 스크롤의 자리는 design §2다 [실측 — 저장 캡처의 픽셀 판독 ±1px]: 헤더 아랫변 1.0 575 · 2.0 656 · 2.2 680 · 2.35 698. 무대 카드 2.0 1163~1923 · 2.2 1231~2026. 작업 영역 스크롤 2.0 1966~2273 · 2.2 2069~2273. 아래 띠 y 2169~2273(40dp = 105px).
- **작업 영역 스크롤의 높이**(스파이크가 `layoutchange`로 잰 dp [실측(스파이크)]): 1.0 281.52 · 2.0 117.33 · 2.2 78.10 · 2.35 0. 문턱 96. 합친 뒤 스크롤 높이 2.2 606.1 · 2.35 599.2.
- 보기 상자의 테두리는 `#EEEFF1`(gray-300, 3px, 한 행만 정확히 이 색이고 위아래 한 행은 안티앨리어싱) — `hide-scrollbars`의 저장 캡처에서 읽은 값이다. 고른 뒤에는 맞음 `#35A66F` · 틀림 `#DF4D54`(`listening-choice.css`). 배경 `#FEFCFB`~`#FFFDFC`(캡처마다 한 단계 다르다).
- 보기 한 칸의 높이: 1.0 124px · 2.0 195px · 2.2 207px · 2.35 216px [실측(스파이크 · `lsfont.py choices`로 읽음)].

## R — 재현: 수정 전 번들에서 같은 절차가 실패한다

bugfix의 재현 단계다. **L1 · L2 · L3을 `before` 번들에서 먼저 돌려** 아래가 나오는지 본다. 이 재현이 서지 않으면(수정 전에 보기가 보이면) 절차가 틀린 것이고 **수정 뒤의 통과는 판정 불가**다 — 통과로 적지 않고 글꼴 · 밀도 · 끌기 좌표를 고쳐 다시 한다.

| 조건 | 수정 전 번들에서 기대하는 것 | 근거 |
|---|---|---|
| 글꼴 **2.35** · 듣기(답하기 전) | rest 캡처에 보기가 없다. 가운데에서 위로 두 번 끌어도 **다른 행 0**, 보기 **0개**(`choices` 종료 코드 1). 지시문이 카드에 눌려 마지막 줄이 카드 윗변에서 잘린다(L3) | accessibility의 `learning-f235-rest` — 작업 영역 높이 0 |
| 글꼴 **2.0 + 화면 크기 최대**(밀도 540일 수 있다) | 같다: 보기 0개 · 끌기 0행 · 지시문 잘림 | accessibility의 `learning-f20d540-rest` |
| 글꼴 2.2 · 끝까지 내림(L5 (c)) | 마지막 보기 라벨의 윗부분이 무대 카드에 가려진다 — `choices`가 온전한 보기를 2개 못 낸다(위 테두리만 보이는 칸이 있다) | `hide-scrollbars`의 `S8-drag-after-end`(2.2 · 보기 「Hello」 위 테두리 y 2069만 있고 아래가 잘림) — 이 문서의 도구가 그 저장 캡처를 「온전한 0 · 위만 `[2069]`」로 읽는다 |

도구의 재현 판독(저장 캡처 · 기기 아님): 스파이크가 수정 뒤 모습을 저장한 `sp-f2.2-drag-end.png` · `sp-f2.35-drag3-end.png`는 `lsfont.py choices`가 온전한 보기 **2개**로 읽고, 같은 도구가 수정 전의 `S8-drag-after-end.png`는 **0개**로 읽는다. 기기에서 새로 돌린 값이 아니라 **판독 도구가 두 상태를 가른다**는 확인이다.

## 케이스

### L0 — 전제: 측정 · 음수 여백 · `scrollTo` · 띠의 겹침 (design §12의 1 · 2 · 9)

**L0의 (a)가 실패하면 나머지를 돌리지 않고 계약으로 되돌린다**(`layoutchange`가 높이 0에서 오지 않으면 합치기가 시작되지 않는다 — 계약 §6.6 P0). (b)가 실패하면 계약 r02.3의 대체(음수 여백 여섯 줄을 빼고 L5(a)에서 그림자 열을 제외)로 내려가 root가 기록한 뒤 계속한다.

**(a) 측정이 와서 글꼴 2.35에서 보기에 닿는다** — 픽셀

```sh
l0a() {                      # l0a before|after — 글꼴 2.35, 듣기
  local W=$1; RESTNAME="L0a-$W-rest" enter "$W" 2.35 -e audioProgress true || return 1
  for K in 1 2; do A shell input swipe 540 1500 540 600 600; sleep 1; done; sleep 3; shot "L0a-$W-drag"
  LSF diffx "$OUT/L0a-$W-rest.png" "$OUT/L0a-$W-drag.png"      # after: > 0
  LSF choices "$OUT/L0a-$W-drag.png"                            # after: 온전한 보기 2개
}
l0a before; l0a after; restore_all
```

- **판정(after)**: `diffx` > 0(끌렸다)이고 `choices`가 **온전한 보기 2개**(「Hello」 · 「Thank you」 — 눈으로 라벨을 확인한다). 이것이 「높이 0이 보고돼 합쳐졌다」의 기기 쪽 증거다.
- **재현(before)**: `diffx` 0, `choices` 0개(종료 코드 1). 안 그러면 R이 안 선 것이다.

**(b) 음수 여백** — 픽셀 · 글꼴 2.2

```sh
l0b() {                      # l0b after — 글꼴 2.2. 카드가 화면 가운데에 남도록 300px만 끈다
  local W=$1; RESTNAME="L0b-$W-rest" enter "$W" 2.2 -e audioProgress true || return 1
  A shell input swipe 10 1500 10 1200 600; sleep 3; shot "L0b-$W-edge"                # 화면 왼쪽 끝(x=10)에서 시작
  A shell input swipe 540 600 540 1800 400; sleep 3                                     # 아래로 크게 끌어 맨 위로 되돌린다
  A shell input swipe 1070 1500 1070 1200 600; sleep 3; shot "L0b-$W-edgeR"           # 오른쪽 끝(x=1070)에서 시작
  LSF diffx "$OUT/L0b-$W-rest.png" "$OUT/L0b-$W-edge.png"            # > 0 (왼쪽 끝 끌기에 화면이 움직였다)
  LSF diffx "$OUT/L0b-$W-rest.png" "$OUT/L0b-$W-edge.png" 132 676    # = 0 (세션 헤더 아랫변 y≈680 위는 안 움직인다 — 내용이 헤더 아랫변에서 잘린다)
  LSF diffx "$OUT/L0b-$W-rest.png" "$OUT/L0b-$W-edgeR.png"          # > 0 (오른쪽 끝도)
  LSF shadowcol "$OUT/L0b-$W-edge.png" 1500                           # 0 (카드 옆 x 16~40의 그림자가 살아 있다) — 1500은 카드 가운데 행. 카드 밖이면 캡처에서 카드 행을 읽어 고친다
}
l0b after; restore_all
```

- **판정(after)**: ① 왼쪽 끝 끌기 `diffx` > 0 ② 헤더 아랫변 위 `diffx 132 676`이 **0**(헤더 아랫변 y를 캡처에서 읽어 676을 맞춘다 — 2.2에서 680) ③ `shadowcol` 종료 코드 0: 카드 옆 열(x 16~40)이 `x=4`의 배경보다 4 이상 어두운 점이 네 점 가운데 셋 이상(스파이크 캡처에서 이 도구가 읽은 모양: 배경보다 어두운 정도 `[1, 4, 8, 12]`) ④ 오른쪽 끝(x=1070) 끌기도 `diffx` > 0.
- 스파이크는 같은 것을 한 번 봤다: 합친 스크롤 `left: 0 · width: 411.43`(전폭), 카드 옆 열 `(254,252,251) → (243,241,241)` 그라디언트가 살아 있고 말하기 참조 캡처의 같은 열은 전부 배경색(잘림), 화면 왼쪽 끝 근처(x=30)에서 시작한 끌기가 움직였다. 그 값이 이 절차에서도 나와야 한다.
- 대조(눈): 말하기(`-e speechProgress true`)의 카드 옆 열은 잘려 있다(design §2) — 이 케이스가 그 판독의 짝으로 쓸 수 있다. 필수 아님.

**(c) `scrollTo`** — L9에 닿으면 거기서 판정한다(문항 전환 뒤 맨 위). 닿지 못하면 「미확인」.

**(d) 띠가 카드 위에 그려진다** — 픽셀 + 눈 · 글꼴 2.35

```sh
l0d() {                      # l0d after — 글꼴 2.35의 멈춘 화면과 끌어서 컨트롤이 띠 밖으로 올라온 화면
  local W=$1; RESTNAME="L0d-$W-rest" enter "$W" 2.35 -e audioProgress true || return 1
  sleep 2; shot "L0d-$W-rest2"                                   # 재생이 안정된 뒤 한 장 더 — 판독은 이 장으로 한다
  echo -n "잡음 rest ↔ rest2: "; python3 "$TOOLS/barscan.py" diff "$OUT/L0d-$W-rest.png" "$OUT/L0d-$W-rest2.png"
  LSF darkest "$OUT/L0d-$W-rest2.png" 60 1020 2190 2260          # 띠 안 — 재생 컨트롤(x≈532, y 2201~2245)의 가장 어두운 점
  python3 "$TOOLS/bandrows.py" "$OUT/L0d-$W-rest2.png" 2000 2274 10   # 행마다 가장 어두운 점 — 띠 안에서 아래로 갈수록 커져야(옅어져야) 한다
  A shell input swipe 540 1500 540 1000 600; sleep 3; shot "L0d-$W-up"
  LSF darkest "$OUT/L0d-$W-up.png" 60 1020 1500 2160             # 같은 컨트롤이 띠 밖으로 올라온 뒤
}
l0d after; restore_all       # 결함과 가르려면 수정 직전 번들(mid)에서도 같은 것을 돈다: l0d mid
```

- **판독 창은 y 2190 ~ 2260 · x 60 ~ 1020이다.** 첫 판의 창(`280 680 2170 2272`)은 띠 시작선 근처(y 2170)를 읽어, 띠 위쪽의 진한 점이 가장 어두운 값으로 잡힐 수 있었다 — 1회차는 같은 값을 세 번 얻었지만 첫 시도(재생 안정 전)에 이상치 125가 났고 원인을 모른다. 2회차가 창을 띠 안쪽으로 좁히고 행별 기울기(`bandrows.py`)를 함께 봐 결함 번들과 수정 번들을 갈랐다 [실측(2회차)].
- **판정(after)**: ① 띠 안 `darkest`가 up의 띠 밖 `darkest`보다 **30 이상 크다**(더 옅다) ② `bandrows`에서 띠 안(y 2210 ~ 2240)의 행별 최소 밝기가 **아래로 갈수록 커진다** ③ 눈으로 rest2의 카드 아랫부분 재생 · 다시 듣기 버튼이 옅다. 2회차의 값: after 띠 안 98(행별 118 / 139 / 160 / 182) · up 29 — 차 69. 결함 번들(mid) 띠 안 29(행 모두 29) · up 29 — 차 0.
- 이것은 design §5의 「띠가 카드보다 위」를 확인하는 것이다. 띠가 카드 **아래**에 그려지면 두 값이 같다(FAIL) — 1회차가 실제로 그렇게 FAIL했고(흐림 상자와 합친 스크롤이 같은 `z-index`), 흐림 상자의 `z-index`를 한 단계 올린 수정(`f55e6412`) 뒤 2회차가 통과했다.

### L1 — 글꼴 2.35, 듣기: 끌어서 보기에 닿고 눌러서 판정이 난다 (AC11)

```sh
l1() {                       # l1 before|after [글꼴 [밀도]] — 기본 2.35. L2는 l1 W 2.0 540(밀도를 바꾼 뒤)
  local W=$1 F=${2:-2.35}; DENS=${3:-420}
  RESTNAME="L1-$W-rest" enter "$W" "$F" -e audioProgress true || return 1
  for K in 1 2; do A shell input swipe 540 1500 540 600 600; sleep 1; done; sleep 3; shot "L1-$W-drag"
  echo -n "rest ↔ drag: "; LSF diffx "$OUT/L1-$W-rest.png" "$OUT/L1-$W-drag.png"
  echo -n "rest 보기: "; LSF choices "$OUT/L1-$W-rest.png"
  echo -n "drag 보기: "; LSF choices "$OUT/L1-$W-drag.png"
  local XY; XY=$(LSF pick "$OUT/L1-$W-drag.png" 1) || { echo "보기에 닿지 못했다(첫 보기가 없다)"; return 1; }
  A shell input tap $XY; sleep 1; shot "L1-$W-tapped"
  echo -n "판정(맞음 색): "; LSF choices "$OUT/L1-$W-tapped.png" 400 2300 '#35A66F'
  echo -n "판정(틀림 색): "; LSF choices "$OUT/L1-$W-tapped.png" 400 2300 '#DF4D54'
}
l1 before; l1 after; restore_all
```

- **판정(after)**: (a) rest의 다른 행 수는 기록. (b) `rest ↔ drag` > 0이고 `drag 보기`가 **온전한 2개**, 눈으로 「Hello」 · 「Thank you」. (c) 첫 보기(「Hello」 — 제시문 「안녕하세요」의 뜻)를 누르면 그 상자의 테두리가 **맞음 색**으로 바뀐다(`tapped`의 맞음 색 `choices` 온전한 ≥ 1). 틀림 색으로 읽히면 어느 보기를 눌렀는지 눈으로 확인한다.
- 판정 배지(무대 안)가 화면에 있는지는 여기서 판정하지 않는다(L10 기록).
- **재현(before)**: (b)에서 `diffx` **0**, `drag 보기` **0개**. (c)에 닿지 못한다 — 「도달 불가」가 재현의 일부다.

### L2 — 글꼴 2.0 + 화면 크기 최대 (AC11)

1. 설정 앱의 디스플레이 → 화면 크기를 **최대 단계**로 올린다(UI 조작). 그 뒤 `A shell wm density`를 읽어 **실제 값을 결과에 적는다**(540인가 — accessibility의 캡처는 540이었다). `wm size`는 1080x2400 그대로여야 한다. ⚠ **1회차는 이 단계를 하지 못했다** — 설정 앱 경로를 이 문서가 단계로 적지 않았고, 밀도 540을 adb로 강제해 돌렸다(아래 3). 설정 UI의 최대 단계가 540인지는 아직 아무도 읽지 않았다.
2. 그 값이 540이면 `guard 이름 540` 아래에서 위 「밀도 540의 값」을 `export`한 뒤 `l1 before 2.0 540`, `l1 after 2.0 540`을 돌린다(함수가 `DENS`를 `guard`에 넘기고, `styfor`가 Start 범위를 기본으로 둔다).
3. **설정 UI로 닿지 못하거나 최대 단계가 540보다 작아 수정 전에도 재현되지 않으면** 그 사실을 적고 `A shell wm density 540; sleep 2`로 강제한 뒤 2를 돈다. 그 실행은 **「설정으로 닿지 않는 조건」으로 표시**한다(밀도를 adb로 강제했다) — 1회차가 이 경우다.
4. 끝: `unset UNMIN UNMAX SW0 SW1 STMIN` · `restore_all`(밀도 reset + global · secure의 `display_*_forced` 정리).

판정은 L1과 같다. 재현(before): 보기 0개 · 끌기 0행(`learning-f20d540-rest`와 같은 모습).

### L3 — 지시문의 모든 줄이 카드 위에 온전하다 (AC12)

L1 · L2의 `rest` 캡처에서 본다(글꼴 2.35, 2.0 + 최대). 지시문이 카드에 눌려 있었는지가 핵심이다.

```sh
# 헤더 아랫변 ~ 카드 아랫변 사이의 행을 BG(배경) · FAINT(그림자) · INK(글자)로 나눠 본다
LSF runs "$OUT/L1-after-rest.png" 700 1700
LSF runs "$OUT/L1-before-rest.png" 700 1700
```

- **판정(after)**: 지시문 글자 줄(INK 연속 구간)들이 이어지고, **마지막 INK 줄 뒤에 BG 행이 1 이상 있고 그 뒤에 FAINT(카드 위쪽 그림자 18px → 카드 윗변)가 온다**. 마지막 줄이 INK로 이어진 채 카드 영역으로 들어가거나 줄이 중간에서 끊기면 FAIL. **눈**으로도 마지막 줄의 글자가 온전한지(윗 · 아랫부분이 안 잘렸는지) 본다 — 숫자는 보조다.
- 한 화면에 다 안 들어가면(2.0 + 최대) 끌어서(`l1`의 drag 캡처) 지시문이 올라가기 전의 모습으로 확인한다: **rest가 정본이다**(지시문은 스크롤의 맨 위에 있다).
- **재현(before)**: 마지막 줄이 카드 윗변에서 잘린다 — INK가 BG 없이 카드로 이어진다.

### L4 — 글꼴 1.0 · 1.3 · 2.0: 멈춘 화면이 수정 전후 같고, 2.0에서 무대가 제자리다 (AC13)

가장 중요한 회귀 가드다. **구조가 새면 FAIL**이다.

```sh
l4rest() {                   # l4rest before|after 글꼴 종류 [옵션…] — 듣기 · 말하기 · 쓰기 등의 멈춘 화면
  local W=$1 F=$2 N=$3; shift 3
  RESTNAME="L4-$N-$F-$W-rest" enter "$W" "$F" "$@"
}
# Start 검출 범위는 enter가 styfor로 정한다(1.0 · 1.3 → 1700 ~ 2150, 2.0 → 2000 ~ 2380 + 재시도)
for F in 1.0 1.3 2.0; do
  for W in before after; do
    l4rest "$W" "$F" listening -e audioProgress true || echo "도달 실패 $W $F"
  done
  echo -n "듣기 $F 수정 전 ↔ 뒤: "; python3 "$TOOLS/barscan.py" diff "$OUT/L4-listening-$F-before-rest.png" "$OUT/L4-listening-$F-after-rest.png"
done
restore_all
```

- **판정**: 각 `diff`가 **다른 행 0**(`barscan.py diff`는 상태바 아래 y 132~2400만 센다 — 시계 행 제외). 0이 아니면 FAIL — 같은 번들을 한 번 더 돌려 잡음(같은 번들 rest끼리의 흔들림)을 재고, 잡음의 양 밖이면 FAIL.
- **닿는 학습형마다**: 듣기(위) · **말하기**(`-e speechProgress true`) · **쓰기**(`-e writingProgress true`)는 위 `l4rest`에 옵션만 바꿔 같은 방식으로(말하기 · 쓰기는 이 번들에서 합쳐지지 않으므로 **대조군** — 0이 정상이다). **문장 만들기**는 `learning-item-guides.md`의 도달 표(`greeting`)로 열고, 첫 열기 안내가 먼저 뜨므로 안내를 닫은 뒤(화면 가운데 탭 `A shell input tap 540 1200`, 2초) rest를 뜬다 — 두 번들 모두 안내를 닫은 뒤의 캡처끼리 비교한다. **단어 선택**이 닿으면 같은 방식으로, 닿지 못하면 「도달 실패」. 닿지 못한 종류는 표에 적는다.
- **글꼴 2.0 듣기에서 보기 칸을 끈다**(`split` 유지의 확인 — 문턱 근처 T와 같다):

```sh
l4drag() {                   # l4drag before|after — 글꼴 2.0. 작업 영역(y 1966~2273)에서 끝까지
  local W=$1; RESTNAME="L4d-$W-rest" enter "$W" 2.0 -e audioProgress true || return 1
  for K in 1 2; do A shell input swipe 540 2120 540 600 600; sleep 1; done; sleep 3; shot "L4d-$W-end"
  echo -n "무대(헤더 아래 ~ 카드 아랫변)가 제자리인가 — rest ↔ end, y 660~1930: "; LSF diffx "$OUT/L4d-$W-rest.png" "$OUT/L4d-$W-end.png" 660 1930
  echo -n "끝까지 내린 보기: "; LSF choices "$OUT/L4d-$W-end.png"
}
l4drag before; l4drag after; restore_all
```

  **판정(after)**: `diffx 660 1930`이 **0**(무대 카드가 안 움직였다 = `split`). 재생 아이콘이 재생 중이었다면 카드 안 아이콘 행이 다를 수 있다 — `audio_settle`이 끝난 뒤에 rest를 떴으므로 0이어야 하고, 다르면 카드 안 아이콘 행인지 눈으로 보고 같은 번들을 한 번 더 돌린다. `choices`가 **온전한 보기 1개**이고 그것이 마지막 보기(「Thank you」)다 — 위 테두리부터 아래 테두리까지 통째로 있다(117 − 40 ≥ 74dp, 1회차 1개 · 2회차 `[(1974, 2168)]` [실측]). 117dp 창에는 보기가 한 칸만 든다 — 첫 판의 「온전한 보기 2개」는 오기였다(1회차가 찾았다). 수정 전 · 뒤의 `end` 캡처끼리 `barscan.py diff`도 0이어야 한다. 2.0에서 합쳐지면(무대가 움직이면) **FAIL**(문턱 여유 21dp가 깨졌다).

### L5 — 글꼴 2.2: 멈춘 화면 같음 · 끌면 무대가 함께 · 끝까지 내려도 마지막 보기 라벨이 안 가려진다 (AC14 · AC22)

```sh
l5() {                       # l5 before|after — 글꼴 2.2(작업 영역 78dp → 합친다). Start 범위는 styfor가 2100 ~ 2380으로 준다
  local W=$1; RESTNAME="L5-$W-rest" enter "$W" 2.2 -e audioProgress true || return 1
  A shell input swipe 540 1500 540 900 600; sleep 3; shot "L5-$W-cardDrag"        # (b) 무대(카드) 위에서 끈다
  echo -n "(b) rest ↔ cardDrag: "; python3 "$TOOLS/barscan.py" diff "$OUT/L5-$W-rest.png" "$OUT/L5-$W-cardDrag.png"
  echo "(b) 카드 윗변 — rest · cardDrag의 runs에서 카드 위 그림자(FAINT) 뒤 첫 구간의 y를 읽는다:"
  LSF runs "$OUT/L5-$W-rest.png" 700 2100 | head -12; LSF runs "$OUT/L5-$W-cardDrag.png" 700 2100 | head -12
  A shell input swipe 540 900 540 1500 600; sleep 3                                  # 되돌린다
  for K in 1 2; do A shell input swipe 540 2120 540 600 600; sleep 1; done; sleep 3; shot "L5-$W-end"   # (c) 끝까지
  echo -n "끝 화면 보기: "; LSF choices "$OUT/L5-$W-end.png"
}
l5 before; l5 after; restore_all
echo -n "(a) 멈춘 화면 수정 전 ↔ 뒤(그림자 열 포함): "; python3 "$TOOLS/barscan.py" diff "$OUT/L5-before-rest.png" "$OUT/L5-after-rest.png"
python3 "$TOOLS/bandrows.py" "$OUT/L5-before-rest.png" 2170 2210 10    # (a) 띠 안 행별 최소 밝기 — 두 번들이 같아야 한다
python3 "$TOOLS/bandrows.py" "$OUT/L5-after-rest.png" 2170 2210 10
```

- **(a) 멈춘 화면**: `barscan.py diff`가 **다른 행 0 — 카드 옆 그림자 열 포함**. L0(b)가 대체로 내려갔으면 카드가 선 행에서 x 13~41 · 1039~1067을 빼고 센다: `LSF diffx "$OUT/L5-before-rest.png" "$OUT/L5-after-rest.png" 132 2400 13:41 1039:1067`. 재생 아이콘 잡음은 `audio_settle` 뒤라 없어야 한다. 0이 아니면 같은 번들을 한 번 더 돌려 잡음을 잰다. **다른 행이 y 2169 ~ 2273(띠 구간)에 모여 있으면 합친 흐름에서 띠가 안 그려진 것이다** — 1회차가 그렇게 105행으로 FAIL했다(제품 결함, L0(d)와 같은 원인). 2회차의 값: before ↔ after 0행, 띠 안 행별 최소 밝기(y 2170 / 2180 / 2190 / 2200) after 52 / 71 / 91 / 110 = before와 같다, 결함 번들(mid) 49 / 49 / 49 / 49.
- **(b) 무대 위에서 끌면 무대가 함께 움직인다**: after에서 `rest ↔ cardDrag`가 **다른 행 > 0**이고 카드 윗변 y가 위로 옮겨 갔다(1회차: 1231 → 894, 337px) — 눈으로도 카드가 올라갔는지 본다. **재현(before)**: 무대 위에서 끌면 아무것도 안 움직인다(`rest ↔ cardDrag` 0행). ⚠ 첫 판은 `fogband.py shift`(카드 영역의 이동량)로 판정했는데 **카드 면이 균일해 24px로 잘못 읽혔다** [실측(1회차)] — 쓰지 않는다.
- **(c) 끝까지 내린 화면 — AC22(사용자 결정)**: after의 `end`에서 `choices`가 **온전한 보기 2개**여야 하고, **눈**으로 마지막 보기 「Thank you」의 라벨 글자가 온전하며 그 위로 무대 카드가 이어져 있다(카드가 마지막 보기 위에서 끊기지 않는다). 수정 전(before)의 같은 캡처는 `hide-scrollbars`의 `S8-drag-after-end`와 같은 모습 — 마지막 보기 라벨의 윗부분이 카드에 가려진다(`choices`가 온전한 보기 2개를 못 낸다). 이것이 (c)의 red다. 1회차의 값: after 온전 2개 `[(1732, 1939), (1961, 2168)]`, 라벨 온전 · 위로 카드가 이어짐 / before 온전 0개 · 아래 테두리만 `[2168]`, 「Thank you」 윗부분이 카드에 가려짐 [실측(1회차)] — **해소됐다**(사용자에게 다시 물을 일이 없다).
  - **사용자 결정(2026-10-09, `hide-scrollbars` 리뷰 W1)**: 「학습 2.2의 끝 상자 대가(마지막 보기 라벨이 카드에 가려짐)는 이 작업에서 해소 — L5 (c)가 판정, **사라지지 않으면 사용자에게 다시 묻는다**.」 (c)가 FAIL이면 **통과로 쓰지 말고** 캡처와 `choices` 출력을 붙여 사용자에게 올린다. 해소되는 이유(design §10): 2.2(78dp)는 문턱 아래라 합쳐지고, 합친 스크롤에서는 마지막 보기 위로 무대가 이어져 가려질 것이 없다. **96 이상의 좁은 `split`에는 남는다**(글꼴 2.0 이하 한 줄 라벨에서는 위 여백만 최대 18dp 가려진다 — L4의 2.0 끝 화면과 L8의 배율 탐색이 본다).

### L6 — 완료 화면: 버튼이 배지를 덮지 않는다 (AC15)

듣기 픽스처는 문항이 **하나**라 보기를 고르고 약 4초 뒤 「All questions done / See results」가 선다(`hide-scrollbars`의 r02b 실측). 그 화면이 액션 행 화면이다. **수정 전에는 글꼴 2.2에서만 닿는다**(2.35는 보기에 닿지 못한다).

```sh
l6() {                       # l6 before|after 글꼴 — 2.2 또는 2.35
  local W=$1 F=$2 XY
  RESTNAME="L6-$F-$W-rest" enter "$W" "$F" -e audioProgress true || return 1
  if [ "$F" = 2.2 ]; then
    A shell input tap 540 2200
  else
    for K in 1 2; do A shell input swipe 540 1500 540 600 600; sleep 1; done; sleep 3; shot "L6-$F-$W-drag"
    XY=$(LSF pick "$OUT/L6-$F-$W-drag.png" 1) || { echo "도달 실패: 보기에 못 닿았다"; return 1; }
    A shell input tap $XY
  fi
  sleep 5; shot "L6-$F-$W-done"
  LSF runs "$OUT/L6-$F-$W-done.png" 1500 2400
}
l6 before 2.2; l6 after 2.2; l6 after 2.35; restore_all
echo -n "2.2 수정 전 ↔ 뒤 완료 화면: "; python3 "$TOOLS/barscan.py" diff "$OUT/L6-2.2-before-done.png" "$OUT/L6-2.2-after-done.png"
```

- **판정(after)**: `runs`에서 **버튼(주황 면 — 마지막 INK 구간) 바로 위의 구간이 INK가 아니다**(BG 또는 FAINT가 4행 이상 — 완료 카드의 배지(「1 of 1 question completed」)가 버튼에 안 닿는다). **눈**으로 배지 글자가 온전한지 본다. 버튼은 화면 안에 온전히 있다.
- **버튼의 자리가 수정 전의 떠 있는 버튼과 같다**(2.2): 버튼 y 범위가 두 번들에서 같다(design 판독 2059~2265). 액션 행이 흐름 안이어도 같은 자리다. 수정 전 완료 화면(`S8-answer-nofog-answered-2`와 같은 모습)에서는 **버튼이 배지의 아랫부분을 덮는다** — 이것이 재현이다. 수정 뒤에는 덮지 않는다.
- 눌러서 다음으로 간다: 버튼을 누르면(`A shell input tap 540 2160`) 맵으로 돌아온다(`waitre '^Journey, selected'`).
- 닿지 못하면(2.35에서 보기에 못 닿음 등) 「도달 실패」로 적는다(통과가 아니다).

### L7 — 진입 직후 연속 8장 · 듣기 재생이 한 번 시작된다 (design §9)

**기록 + 수용 범위 판정 + 로그**. 합치기는 mount 뒤 약 6ms에 일어나므로 연속 캡처는 진입 탭 직후부터 뜬다(`burst`는 기기 안에서 `screencap` 8장을 잇달아 뜬다).

**(1) 연속 8장**

```sh
l7burst() {                  # l7burst after — 글꼴 2.35. Start를 누른 직후부터 8장. lsgo의 마지막 탭 대신 burst가 탭한다
  local W=$1 C X Y
  setfont 2.35; guard "L7-$W" || return 1
  lsfx "$W" -e audioProgress true
  sleep 3; local I=0
  while [ "$I" -lt 20 ]; do C=$(unitxy) && break; A shell input swipe 540 1700 540 500 450; sleep 1.6; I=$((I + 1)); done
  read -r X Y _ <<<"$C"; A shell input tap "$X" "$Y"; sleep 3.5; shot "L7-$W-sheet"
  C=$(XMIN=300 XMAX=800 cxy "$OUT/L7-$W-sheet.png" '#F56C14' 8 $((Y + 600)) 2380); read -r X Y _ <<<"$C"
  burst "L7-$W" "$X" "$Y"            # 파일 L7-<번들>-1..8.png · L7-<번들>-times.txt
  sleep 4; audio_settle; shot "L7-$W-settled"
  for N in 1 2 3 4 5 6 7 8; do echo -n "장 $N ↔ settled: "; LSF diffx "$OUT/L7-$W-$N.png" "$OUT/L7-$W-settled.png" 132 2160; done
}
l7burst after; restore_all
```

- **판독**: `diffx`가 **0**이면 그 장은 합친 모습(settled와 같다). 0이 아니면 캡처를 열어 **맵(진입 전)인지 합치기 전 모습인지**를 눈으로 가른다 — 합치기 전 모습: 세션 헤더가 있고 지시문이 눌려 있으며 무대 카드가 넘쳐 보기가 없다.
- **판정**: 합치기 전 모습이 **0장 또는 첫 장 하나**(장 간격으로 약 0.5초 이내)면 받아들인다(design §9.2). **둘째 장 이후에도 있으면 FAIL이 아니라 design으로 되돌린다**(처방 후보: 세션 안에서 마지막 흐름 기억). **1.5초 뒤의 장부터는 합친 모습이어야 한다**(`times.txt`로 확인 — 아니면 FAIL). 몇 장 · 몇 ms인지 기록한다. 스파이크는 글꼴 2.2에서 8장(36 · 607 · 1022 … 3298ms) 가운데 합치기 전 모습 0장(1장은 맵, 2장부터 합친 화면)이었다 [실측(스파이크)].

**(2) 재생이 한 번 시작된다 — 세는 수단 먼저 확인한다**

수단: ① JS가 부른 네이티브 모듈 호출 — logcat의 `AudioPlaybackModule.play`(호출마다 `will fire`와 `call platform implementation` 두 줄이라 `android-release-config.md`의 `calls`가 뒤의 것만 센다) · `AudioPlaybackModule.stop` ② 네이티브 플레이어 이력 — `dumpsys audio`의 `event:started` · `event:stopped`(`android-assets.md`의 `events` — 조작 **전후 이력의 차이**로 센다, 직전에 있던 piid를 새 시작으로 세지 않는다). 제품 코드에 로그를 더하지 않는다.

```sh
calls() { grep -F "InvokeMethod, method: ($1" "$2" | grep -c "call platform implementation"; }     # android-release-config.md의 calls와 같은 규칙
astarts() { aevents | grep -c 'event:started'; }
l7sound() {                  # l7sound before|after 글꼴 — 듣기 진입 한 번의 재생 호출 수
  local W=$1 F=$2 S0 S1
  setfont "$F"; guard "L7s-$W-$F" || return 1
  lsfx "$W" -e audioProgress true; S0=$(astarts); A logcat -c
  lsgo || return 1
  audio_settle; sleep 2
  A logcat -d > "$OUT/L7s-$F-$W.logcat"; S1=$(astarts)
  echo "글꼴 $F $W: JS play $(calls AudioPlaybackModule.play "$OUT/L7s-$F-$W.logcat") · stop $(calls AudioPlaybackModule.stop "$OUT/L7s-$F-$W.logcat") · 네이티브 started $((S1 - S0)) · stopped $(aevents | grep -c 'event:stopped')(누적)"
}
l7sound before 1.0          # ① 수단이 서는지: 수정 전 번들 · 글꼴 1.0에서 먼저 「1회로 읽힌다」를 확인한다
l7sound after 1.0
l7sound after 2.35          # ② 판정: 글꼴 2.35(합친다)에서도 1회
restore_all
```

- **먼저**: 수정 전 번들 · 글꼴 1.0에서 `play`가 **1**, `started`가 **1**로 읽혀야 수단이 선다. 안 읽히면(0이거나 2 이상) 수단이 틀린 것이다 — 줄 모양은 Android 버전마다 다르다(`android-assets.md`의 `events` 주의: `grep -n -i "playback\|piid"`로 플레이어 절을 먼저 찾는다). **수단이 서지 않으면 귀로 듣고 「호출 수 미확인」으로 적는다(통과로 적지 않는다).**
- **네이티브 횟수는 이 기기에서 못 센다 — ② 수단이 서지 않았다** [실측(1회차)]. `dumpsys audio`의 플레이어 이력이 가득 차 있어 조작 전후 `event:started`의 차이가 수정 전 1.0 · 수정 뒤 1.0 · 수정 뒤 2.35 세 번 다 **0**으로 읽혔다(새 이벤트가 들어와도 오래된 줄이 밀려나 개수가 그대로다). 그래서 **판정은 ① JS의 `play` · `stop` 호출 수로만 하고, 네이티브 쪽은 「미확인」으로 적는다.** `astarts`의 출력은 기록으로만 남긴다. 이력을 비우는 수단(재부팅 등)은 이 절차가 쓰지 않는다 — 다른 작업과 기기를 같이 쓴다.
- **판정(after · 2.35)**: JS `play` **1회** · `stop` 0회(진입마다) — 1회차: 수정 전 1.0 · 수정 뒤 1.0 · 수정 뒤 2.35 모두 `play` 1 · `stop` 0 [실측(1회차)]. 네이티브 `started` 1회는 위 이유로 미확인이다. 합칠 때 재호출 · 정지가 없다 — `stop`은 문항이 사라질 때(세션을 나갈 때)뿐이다. 스파이크의 값: 진입마다 JS 1회 · 네이티브 started 1 · stopped 1, 합칠 때 재호출 · 정지 없음 [실측(스파이크 — 그 번들의 임시 로그와 `dumpsys audio`로 셌다, 제품 로그가 아니다)].
- **눈**: 재생 중 표시(일시정지 아이콘)가 합친 뒤에도 유지되고 끝나면 재생 아이콘으로 돌아간다 — 진입 1.5초 · `audio_settle` 뒤 캡처 둘로 본다.

### L8 — 기록만: 쓰기 · 말하기 · 문장 만들기 · 96 이상의 좁은 `split` (design §12)

**판정하지 않는다 — 본 것을 적는다.**

- **글꼴 2.35**에서 쓰기(`-e writingProgress true`) · 말하기(`-e speechProgress true`) · 문장 만들기를 한 장씩 뜬다(닿는 것만): 쓰기의 그리기 면이 보이는가(쓰기는 이 작업이 고치지 않는다) · 말하기의 지시문이 가려지는가(카드 스크롤 — 합치지 않는다) · 문장 만들기가 합쳐져 조각에 닿는가 · 글자가 겹치는가. **셋 다 첫 열기 안내가 먼저 뜬다** — 안내를 닫은 뒤(`guide_close`) 뜬다(안내와의 공존: design §9.4 — 닫은 뒤 화면은 합친 흐름의 맨 위여야 한다). 1회차는 쓰기 · 말하기를 안내 때문에 보지 못했고, 2회차가 아래처럼 닫고 봤다 [실측(2회차)].

```sh
l8() {                       # l8 after writing|speech — 글꼴 2.35, 안내를 닫은 뒤 멈춘 화면과 카드 위 끌기
  local W=$1 K=$2
  RESTNAME="L8-$K-2.35-$W-guide" enter "$W" 2.35 -e "${K}Progress" true || return 1
  guide_close; shot "L8-$K-2.35-$W-rest"
  A shell input swipe 540 1500 540 900 600; sleep 3; shot "L8-$K-2.35-$W-drag"
  echo -n "$K rest ↔ drag: "; python3 "$TOOLS/barscan.py" diff "$OUT/L8-$K-2.35-$W-rest.png" "$OUT/L8-$K-2.35-$W-drag.png"
}
l8 after writing; l8 after speech; restore_all
so_enter after 2.35; restore_all     # 문장 만들기 — 함수 묶음의 so_enter(안내까지 닫는다). learning-item-guides.md의 도달 표는 다른 단원도 연다
```
- **96 이상의 좁은 `split`**에 닿는 배율이 있는지: 글꼴 2.0과 2.2 사이(예: `settings put system font_scale 2.05 / 2.1 / 2.15`)에서 듣기를 열고 끝까지 내린 화면을 한 장씩 뜬다. `layoutchange`의 높이를 로그로 못 읽으므로 **합쳐졌는가**는 L5의 (b) 방식(카드 위에서 끌어 카드가 움직이는가)으로 가르고, `choices`로 마지막 보기가 온전한가를 적는다. 합쳐지지 않는 가장 큰 배율과 합쳐지는 가장 작은 배율을 적는다(문턱 근처의 흔들림 기록 — 스파이크는 2.0 · 2.2의 두 점만 봤다).
- 보기 4개 · 두 줄 라벨은 만들 수 없어 **못 본다**(위 「확인되지 않는 것」).

### L9 — 문항 전환 뒤 맨 위 (AC19 · design §8.2 · L0(c))

**지금 제품 데이터로는 닿지 못한다 — 도달 불가(조건 미충족).** 2회차가 기기보다 데이터에서 이유를 찾았다 [코드 · 실측(2회차)]: 맵의 학습 스텝 배정표(`journey-map-learning-form.ts`의 `learningFormsByStep`)가 여덟 스텝 모두 활동 하나이고, 그 활동의 문항 표도 스텝마다 문항 하나다(`tutorial-listening` · `tutorial-speaking` · `tutorial-writing` · 문장 만들기 다섯 스텝 각 1). 문항이 셋인 낱말 고르기 · 쓰기 `directions`의 데이터는 있지만 배정표에 이어지지 않아 맵에서 열리지 않는다. 문항이 셋인 최종 시험(`tutorial-final-test`)은 열리지만 `LearningShell`이 아니라 비주얼 노벨 화면이다(세션 머리 「Lesson i / N」이 없다). 기기에서 「Lesson i / N」의 N ≥ 2는 한 번도 보지 못했다.

**문항이 둘 이상인 학습 스텝이 배정되면 그때 아래를 돈다.** 그 전에는 AC19 · L0(c)의 기기 쪽을 **「미확인」**으로 적는다(통과가 아니다). 결선은 ui 테스트(MG13 · MG14)가 보고, `scrollTo`(offset 0 · 모션 없음)가 이 스크롤에서 먹는다는 것은 측정 스파이크가 기기에서 봤다 — 문항 전환에서 불리는지는 기기로 본 적이 없다. 다시 돌리기 전에 위 두 파일을 열어 문항이 둘 이상인 스텝이 생겼는지 먼저 본다(듣기 픽스처 `tutorial-listening`은 지금 문항 하나다).

0. **먼저 확인한다**: 열린 화면의 세션 머리 `Lesson i / N`에서 **N ≥ 2**인가, 그리고 이 글꼴에서 **합쳐지는가**(작업 영역 높이 < 96 — 문장 만들기의 작업 영역은 듣기와 다르다). 합쳐졌는지는 L5(b)의 방식으로 본다: 카드 위(y≈1500)에서 위로 끌어 무대가 움직이면 합쳐진 것이다. N=1이거나 합쳐지지 않으면 **「도달 실패 — 조건 미충족」**이고, AC19의 기기 쪽은 **미확인**으로 닫는다(통과가 아니다). 첫 열기 안내가 먼저 뜨면 닫는다(`A shell input tap 540 1200`).
1. 첫 문항의 rest를 뜬다(`L9-after-q1-rest`). `runs`로 **지시문 첫 줄(헤더 아래 첫 INK 구간)의 시작 y를 읽어 적는다**.
2. 합친 스크롤을 **아래로 내린다**(`input swipe 540 1700 540 700 600` 두 번 — 지시문이 위로 올라간 상태).
3. **그 상태에서 답한다**: 조각을 누르고 `Check` → `Next`(조각 글자를 캡처에서 읽어야 한다 — 정답이 아니어도 `Next`가 서는지 먼저 본다. 안 서면 정답 순서를 읽는다).
4. 다음 문항이 뜨면 멈춘 캡처(`L9-after-q2-rest`)를 뜬다. `runs`로 지시문 첫 줄의 시작 y를 다시 읽는다.

```sh
LSF runs "$OUT/L9-after-q1-rest.png" 700 1100      # 지시문 첫 줄의 시작 y
LSF runs "$OUT/L9-after-q2-rest.png" 700 1100      # 같아야 한다(±2)
```

- **판정**: 둘째 문항의 지시문 첫 줄이 **세션 헤더 바로 아래**, 즉 첫 문항 rest의 첫 줄과 같은 y(±2)다(= 맨 위에서 시작한다 = `scrollTo(0, smooth:false)`가 먹었다 — L0(c)의 기기 쪽 증거다). 보기부터 보이면(지시문 · 제시문이 위로 사라져 있으면) FAIL.
- **재현(before)**: 그 글꼴에서 문항에 답할 수 없어 닿지 못한다(R의 근거는 L1) — 「도달 실패」가 정상이다.
- 완료 화면이 서면 같은 방식으로 맨 위인가(완료 카드가 헤더 아래에 온전한가)도 한 장 본다.

### L10 — 답한 직후 판정 배지가 화면 안에 온전하다 (AC25 · 계약 r03 · design §8.1 · §12-10)

⟨2026-10-09⟩ **3회차부터 판정 케이스다.** 1 · 2회차에는 기록만이었다(1회차 — 2.0 + 540에서 누른 1초 뒤 배지 없음). 그 기록과 accessibility의 1.4.1 판정(C2) 뒤 사용자가 「답하면 맨 위로」를 골랐고([ADR-0022](../adr/0022-scroll-regions-and-fixed-affordances.md) D1-2 갈래의 규칙 3), 이 케이스가 그 기기 쪽 판정이다. 고른 보기가 화면 아래로 밀려나는 것은 감수한 대가라 판정하지 않고 적기만 한다.

```sh
# l10 before|after 글꼴 [밀도] — 듣기에서 보기로 두 번 끌어 내린 뒤 첫 온전한 보기(Hello)를 눌러 burst 8장
l10() {
  local W=$1 F=$2 D=${3:-420} TAG XY
  unset UNMIN UNMAX SW0 SW1 STMIN                                  # 앞 단계의 밀도 540 값이 남지 않게 — restore_all은 지우지 않는다
  [ "$D" = 540 ] && { A shell wm density 540; sleep 2; DENS=540; export UNMIN=3000 UNMAX=5600 SW0=1500 SW1=1000 STMIN=4000; }
  TAG="L10-$W-$F$([ "$D" = 540 ] && echo -540)"
  RESTNAME="$TAG-rest" enter "$W" "$F" -e audioProgress true || return 1
  guard "$TAG" "$D" || return 1
  for K in 1 2; do A shell input swipe 540 1500 540 600 600; sleep 1; done; sleep 3; shot "$TAG-drag"
  XY=$(LSF pick "$OUT/$TAG-drag.png" 1) || { echo "보기에 닿지 못했다"; return 1; }
  burst "$TAG-b" $XY                                              # bash — 좌표 둘이 두 인자로 간다
  python3 "$TOOLS/badge.py" "$OUT/$TAG"-b-?.png                     # 프레임마다 배지 y 범위
}
# 이미 맨 위일 때(끌지 않고 일부 보이는 Hello를 누른다 — 글꼴 2.2에서 y 2120 [실측(3회차)]): 제자리에서 부를 때 흔들리는가
l10top() {
  local W=$1 F=$2 TAG="L10top-$1-$2"
  RESTNAME="$TAG-rest" enter "$W" "$F" -e audioProgress true || return 1
  guard "$TAG" || return 1
  burst "$TAG-b" 540 "${TOPY:-2120}"
  for I in 2 3 4 5 6; do echo -n "b$((I - 1)) ↔ b$I: "; python3 "$TOOLS/barscan.py" diff "$OUT/$TAG-b-$((I - 1)).png" "$OUT/$TAG-b-$I.png"; done
}
for W in before after; do l10 "$W" 2.2; restore_all; l10 "$W" 2.35; restore_all; l10 "$W" 2.0 540; restore_all; done
l10top after 2.2; restore_all
```

- **판정(after)**: 세 조건 모두 burst의 배지 프레임(약 0.03 ~ 2.3초)에서 `badge.py`의 y 범위가 ① **세션 헤더 아랫변보다 아래에서 시작하고**(헤더 아랫변 2.2 = 680 · 2.35 = 698 · 2.0 + 540 ≈ 812) ② **높이가 온전한 배지의 높이**다(2.2 = 158 · 2.35 = 165 · 2.0 + 540 = 189px [실측(3회차)] — 낮으면 헤더에 잘린 것이다) ③ 자동 넘김(약 2.5초) 전 마지막 배지 프레임까지 같다. 눈으로 `-b-3.png`의 아이콘 · 낱말(「Correct」)이 온전한지 한 번 본다.
- **재현(before = r03 수정 전 `47c52a7f`)**: 2.35는 배지가 헤더에 잘리고(높이 < 165) 2.0 + 540은 `none`이어야 한다. 2.2는 수정 전에도 온전할 수 있다(두 번 끌어 내린 자리에서 배지가 헤더 아래에 남았다 [실측(3회차)]) — 2.2는 재현 조건이 아니다.
- `l10top`: rest ↔ b1은 배지 · 색으로 크게 다르고, b2 이후 이웃 프레임 차이가 0행이면 제자리 호출이 흔들리지 않은 것이다.
- **틀림**을 보려면 `BADGE_COLOR=#DF4D54`로 부른다(3회차는 맞음만 봤다).
- `burst`의 프레임은 0.3 · 1 · 2초의 정확한 시각이 아니다 — 3회차는 약 0.03 · 0.6 · 1.0 · 1.4 · 1.9 · 2.3초였다. 시각은 `-times.txt`에 남는다.

### L11 — TalkBack 오른쪽 쓸기만으로 지시문 → 무대 → 보기 (AC16 · 계약 r03.5)

⟨2026-10-09⟩ **3회차에 신설.** 흐름 안 무대 카드의 `z-index: 0`([ADR-0022](../adr/0022-scroll-regions-and-fixed-affordances.md) D1-2 갈래의 규칙 5)을 지키는 유일한 판정이다 — ui는 선택자가 기대는 클래스만 보고(MG17), 규칙이 지워지거나 값이 바뀌면 이 케이스만 잡는다.

준비: `tb-idioms.sh`(위 「도구」)를 이 셸에서 `source "$TOOLS/tb-idioms.sh"` 한다 — `killperm`은 이 문서의 것과 같다. **TalkBack을 앱을 띄우기 전에 켠다**(뜬 뒤 켜면 Lynx 낭독 트리가 다르다 — `learning-item-guides.md`). TalkBack이 켜진 동안 `uiautomator`를 부르지 않는다. 「Display speech output」은 켜지 않는다 — 큰 글꼴에서 상자가 시트의 Start · 탭바를 덮는다. 초점은 걸음마다 캡처의 초록 테두리 상자(`ring.py`)로 읽는다.

```sh
# l11 after|c1 글꼴 [걸음 수, 기본 22] [회차 이름] — TalkBack을 켜고 듣기에 들어가 맨 위부터 오른쪽으로만 쓴다
l11() {
  local W=$1 F=$2 N=${3:-22} TAG="L11-$1-$2${4:+-$4}" K=0 I
  guard "$TAG-pre" || return 1
  tb_on; afocus                                                   # Bound services에 TalkBack · touchExplorationEnabled true
  setfont "$F"; guard "$TAG" || return 1; styfor "$F"
  while :; do lsfx "$W" -e audioProgress true; lsgo && break; K=$((K + 1)); [ "$K" -ge 3 ] && return 1; done
  audio_settle; sleep 2
  shot "$TAG-00"
  for I in $(seq -w 1 "$N"); do swiperight 1200; shot "$TAG-$I"; done
  python3 "$TOOLS/ring.py" "$OUT/$TAG"-[0-9][0-9].png | tee "$OUT/$TAG-rings.txt"
}
# l11ans after 글꼴 — 14걸음 쓸어 Hello 상자에 초점을 둔 뒤 두 번 탭해 답하고 0.1초 간격으로 뜬다(답한 뒤 초점 · 스크롤)
l11ans() {
  local W=$1 F=$2 TAG="L11ans-$1-$2" K=0 I
  guard "$TAG-pre" || return 1
  tb_on; setfont "$F"; guard "$TAG" || return 1; styfor "$F"
  while :; do lsfx "$W" -e audioProgress true; lsgo && break; K=$((K + 1)); [ "$K" -ge 3 ] && return 1; done
  audio_settle; sleep 2
  for I in $(seq 1 "${ANS_STEPS:-14}"); do swiperight 1200; done
  shot "$TAG-pre"; python3 "$TOOLS/ring.py" "$OUT/$TAG-pre.png"      # Hello 상자여야 한다 — 아니면 ANS_STEPS를 고친다
  tdown 540 1300; tup; sleep 0.12; tdown 540 1300; tup              # 두 번 탭 — 자리와 무관하게 초점 요소가 눌린다
  for I in 01 02 03 04 05 06 07 08 09 10; do shot "$TAG-w$I"; sleep 0.1; done
  sleep 1; shot "$TAG-w11"
  python3 "$TOOLS/ring.py" "$OUT/$TAG"-w*.png; python3 "$TOOLS/badge.py" "$OUT/$TAG"-w*.png
}
for R in r1 r2 r3; do l11 after 2.2 22 "$R"; l11 after 2.35 22 "$R"; done
l11 c1 2.35 22 r1; l11 c1 2.2 22 r1                               # red 재현 — C1 수정 전 번들
l11ans after 2.2; l11ans after 2.35
tb_off; afocus; restore_all                                        # Bound services 없음 · touchExplorationEnabled false
```

- **판정(after)**: 걸음 09(세션 헤더 뒤)부터 한 바퀴 안에 **지시문 → 카드 글자(제시문) → 로마자 → 다시 듣기 → 재생 → Hello 상자 → Hello 글자 → Thank you 상자 → Thank you 글자 → 상단 바**가 이 순서로 서고, 화면 밖이던 보기로 갈 때 스크롤이 따라온다(그 걸음의 캡처에서 보기가 화면 안). 글꼴마다 세 번이 같은 모양이어야 한다. 3회차는 상자 순서를 `rings.txt`의 y와 캡처로 맞췄다 — 상자의 y는 스크롤에 따라 움직이므로 숫자만으로 가르지 않는다.
- **재현(c1 = `dd413834`)**: 2.35는 재생 뒤 「재생 그대로(스크롤만)」 → 상단 바로 돌아가 보기에 닿지 않는다. 2.2는 지시문 다음에 Hello가 카드보다 먼저 선다. 안 나오면 절차가 틀린 것이다.
- **답한 뒤(`l11ans`)** — 기록만: 배지가 온전한가(`badge.py`), 초점이 어디 남는가, TalkBack이 스크롤을 되돌리는가. 맨 위로를 TalkBack이 취소해 배지가 다시 화면 밖이 되면 accessibility로 되돌린다(차단 여부는 그 단계).
- **이상이 한 번 나면 같은 조건을 세 번 더 돈다.** 3회차의 첫 걷기(TalkBack을 막 켠 직후, 2.2)가 Hello 뒤에 카드 글자로 돌아갔고 이후 여섯 번은 재현되지 않았다 — 「재현 n/m」으로 적고 결함으로 판정하지 않는다. 재현이 둘 이상이면 accessibility로 넘긴다.
- 쓸기 시작 높이 `swiperight 1200`은 화면 가운데다. 쓸기가 터치 탐색으로 읽히면(초점이 손가락 아래 요소로 튄다) 걸음 사이 대기를 늘린다.

### RG3 — r03 회귀: 보통 글꼴은 그대로, 문장 만들기는 채우는 동안 안 튄다 (AC23 · 계약 r03.2)

```sh
# 글꼴 1.0 · 2.0(split): 멈춘 화면과 Hello를 누른 1초 뒤가 r03 전후 같다 — split에서는 답해도 스크롤을 보내지 않는다
rg3() {
  local F=$1 W XY
  for W in before after; do
    RESTNAME="RG3-$W-$F-rest" enter "$W" "$F" -e audioProgress true || return 1
    XY=$(LSF pick "$OUT/RG3-$W-$F-rest.png" 1) && { A shell input tap $XY; sleep 1; shot "RG3-$W-$F-tapped"; }
    restore_all >/dev/null
  done
  echo -n "rest $F: "; LSF diffx "$OUT/RG3-before-$F-rest.png" "$OUT/RG3-after-$F-rest.png"           # 0
  echo -n "tapped $F: "; LSF diffx "$OUT/RG3-before-$F-tapped.png" "$OUT/RG3-after-$F-tapped.png"     # 0
}
rg3 1.0; rg3 2.0
# 문장 만들기 2.35: so_enter 뒤 조각이 보이도록 끌고, 조각 · Check의 좌표를 캡처에서 읽어 누른다
so_enter after 2.35
A shell input swipe 540 1500 540 900 600; sleep 3; shot RG3-so-s1                    # 조각 · Check 좌표를 이 캡처에서 읽는다
A shell input tap $SO_CHIP; sleep 2; shot RG3-so-filled                               # SO_CHIP="x y"
echo -n "조각을 채우는 동안 헤더 아래 윗부분: "; LSF diffx "$OUT/RG3-so-s1.png" "$OUT/RG3-so-filled.png" 700 1700   # 0 — 화면이 안 튄다
burst RG3-so-chk $SO_CHECK                                                            # SO_CHECK="x y" — Check
python3 "$TOOLS/badge.py" "$OUT"/RG3-so-chk-?.png                                     # 첫 프레임부터 배지 온전 · 맨 위
restore_all
```

- **판정**: 1.0 · 2.0의 rest · tapped 모두 r03 전후 **0행**. 문장 만들기 2.35에서 조각을 채우는 동안 헤더 아래 윗부분 0행(변화는 조각 · `Check` 영역뿐) · `Check`를 누른 첫 프레임부터 맨 위이고 배지(「Correct」)가 온전하다(3회차: 1073 ~ 1237, 높이 165) · 버튼이 `Next`로 바뀐다(눈).
- 이 단원은 조각이 하나다 — 칸을 여러 번 채우는 경우와 `Next` 뒤는 보지 못한다.

### T — 문턱 근처: 2.0 = 117dp에서 `split` 유지 · 2.2 = 78dp에서 `merged` (design §12-9 · 계약 §6.6 P0)

문턱 96이 맞는 쪽에 서는지는 **단위가 dp(레이아웃 px)라는 전제**에 걸려 있다 — 스파이크는 `layoutchange`의 값을 로그로 읽어 이 전제를 확인했다 [실측(스파이크): 1.0 281.52 · 2.0 117.33 · 2.2 78.10 · 2.35 0, 루트 `width` 411.43 = 1080/2.625]. **제품 번들은 높이를 로그로 내지 않으므로** 이 절차는 그 결과(어느 쪽으로 판정했는가)를 **구조의 모습**으로 읽는다:

| 글꼴 | 작업 영역 높이(스파이크) | 기대 흐름 | 기기에서 읽는 것 |
|---|---|---|---|
| 2.0 | 117.33dp | `split` | L4의 `l4drag`: 보기 칸을 끌어도 **무대가 제자리**(`diffx 660 1930` = 0) + 마지막 보기가 통째로 |
| 2.2 | 78.10dp | `merged` | L5 (b): 카드 위에서 끌면 **무대가 함께 움직인다**(`rest ↔ cardDrag` > 0행 + 카드 윗변 y가 위로) + 끝 화면의 보기 둘 온전 |

- **둘이 반대로 나오면**(2.0이 합쳐지거나 2.2가 안 합쳐지면) 문턱의 전제가 깨졌다 — **FAIL**이고 계약으로 되돌린다(단위 · 문턱 값).
- 같은 에뮬레이터 · 같은 시드라서 문턱 여유(2.0과 21dp, 2.2와 18dp)는 다른 기기에서 보장되지 않는다. 이 케이스는 **Pixel_8 한 대의 두 점**이다.

## 한 번에 돌리는 순서(권장)

번들이 둘이고 픽스처가 180초라 케이스별 호출로 나눈다. **돌리는 순서**: 환경 점검(`guard` · `globals` 기록) → 도구 추출 · selftest → **R(L1 · L2 · L3을 before에서)** → L0(a) → (a)가 서면 L0 (b) · (d) → L1 → L2 → L3 → L4 → L5 → L6 → L7 → L8 → L9(문항이 둘 이상인 학습 스텝이 있을 때만) → L10(r03 번들 — 위 「비교 번들」) → RG3 → **L11은 맨 끝**(TalkBack을 켜는 유일한 케이스 — 끝나면 `tb_off` · `afocus`로 꺼졌는지 본다) → T는 L4 · L5의 판정에서 따라 나온다 → `restore_all` → 전역 설정 diff 0.

## 실행 결과

세 회차 모두 기록의 정본은 하네스 작업 폴더(`.agent-harness/work/learning-shell-large-font/` — 저장소 밖)의 `e2e-run.md` · `e2e-run-2.md` · `e2e-run-3.md`이고, 캡처 · 스크립트는 그 폴더의 `artifacts/e2e/` · `artifacts/e2e-2/` · `artifacts/e2e-3/`다. 아래는 그 세 기록의 판정을 옮긴 것이다. 근거는 전부 [실측] 기기 관찰이고 숫자는 `barscan.py diff`(다른 행 수 / 2268) · `lsfont.py` · `bandrows.py` · `badge.py` · `ring.py`다.

### 1회차 (2026-10-09) — FAIL(e2e-green 미충족) · 재현은 성립

실행자 test-runner. 시작 HEAD `acc6bbeb`(번들은 이 커밋으로 지었다). 번들(모의 값, 서버 18790): `before` `fa3b261e` sha256 `bbc5b9d1…` · `after` `acc6bbeb` sha256 `0155b68a…`. 기기 emulator-5554 Pixel_8 API 37, 1080x2400 · 420. 호스트 · 계측 APK는 기기에 있던 것(커밋 미확인). 매 단계 `guard` 통과 · 남의 흔적 없음.

| 케이스 | 판정 | 관찰 |
|---|---|---|
| R 2.35 듣기 | 재현 성립 | before: rest ↔ drag 0행, 보기 0개(`choices` 종료 코드 1), 지시문 마지막 줄이 카드 윗변에서 잘림(INK 20px에서 FAINT로) |
| R 2.0 + 밀도 540(adb 강제) | 재현 성립 | before: 0행 · 보기 0개, 첫 줄 INK 36px에서 FAINT |
| R 2.2 끝까지 | 재현 성립 | before: 온전한 보기 0 · 아래 테두리만 `[2168]`, 「Thank you」 윗부분이 카드에 가려짐 |
| L0(a) 2.35 | 통과 | after: `diffx` 1530행, 온전한 보기 2개 `[(1714,1930),(1952,2168)]` Hello / Thank you |
| L0(b) 음수 여백 2.2 | 통과 | 왼쪽 끝 끌기 1385행 · 헤더 위 132 ~ 676 0행 · 오른쪽 끝 1486행 · `shadowcol` 종료 코드 0 `[1,4,8,12]` |
| L0(c) | 미확인 | L9에 닿지 못했다 |
| L0(d) 2.35 띠가 카드 위 | **FAIL** | 띠 안 재생 아이콘의 가장 어두운 값 29 · 띠 밖 29 — 차 0(기준 ≥ 30). 같은 픽셀 3회. 첫 시도의 125는 재생 안정 전의 이상치로 버렸다(원인 불명) |
| L1 2.35 | 통과(after) | `diffx` 1530, 보기 2개, Hello 탭 → 맞음 색 1개. before는 0행 · 0개 · 도달 불가 |
| L2 2.0 + 밀도 540 | 통과(after) — **adb 강제, 설정 UI로 닿지 않았다** | before 0행 / 0개, after `diffx` 1427 · 보기 2개 `[(1579,1825),(1855,2101)]` · Hello 탭 → 맞음 1. 설정 앱의 최대 화면 크기 값은 읽지 않았다 |
| L3 지시문 | 통과 | 2.35 after: 마지막 줄 INK 83px 뒤 BG 55 → FAINT(카드). before는 20px에서 잘림. 2.0 + 540 after: 넷째 줄 뒤 BG 68 → FAINT |
| L4 1.0 · 1.3 · 2.0 멈춘 화면 | 통과 | 수정 전 ↔ 뒤 다른 행 모두 0 / 2268 |
| L4 2.0 끌기(`split` 유지) | 통과 | 무대 y 660 ~ 1930 `diffx` 0(before · after), 마지막 보기 「Thank you」 통째로. `choices`는 온전한 1개(절차의 「2개」는 오기 — 이 개정에서 고쳤다) |
| L5(a) 2.2 멈춘 화면 | **FAIL** | 다른 행 105 / 2268, 전부 y 2169 ~ 2273(열 제외해도 같다). before는 「Hello」 아래가 띠에서 옅어지고 after는 옅어지지 않고 잘린다 |
| L5(b) 카드 위 끌기 | 통과 | after rest ↔ cardDrag 1486행, 카드 윗변 1231 → 894(337px). before 0행. `fogband shift`는 24px로 읽혀 신뢰 불가 |
| L5(c) 2.2 끝 화면 라벨 | **통과 — 가려지지 않음(AC22 · 사용자 결정의 확인)** | after 온전 2개 `[(1732,1939),(1961,2168)]`, 라벨 온전 · 위로 카드가 이어짐. before는 R의 2.2 행 |
| L6 2.2 완료 화면 | 통과 | 버튼 y 2051 ~ 2273 두 번들 같다. before: 배지와 버튼 사이 FAINT 7px뿐 — 버튼이 배지 아래를 덮음(눈). after: BG 42행 간격 |
| L6 2.35 완료 화면 | 통과 | 보기에 닿아 완료 화면 도달, 버튼 2042 ~ 2273, 버튼이 배지를 덮지 않음. **배지 글자가 온전한지는 미확인**(스크롤해 보지 않았다) |
| L7(1) 연속 8장 2.35 | 통과 | 캡처 시작 ms `[39, 684, 1106, 1608, 2245, 2669, 3096, 3507]`. 1장은 맵(시트), 2 ~ 8장은 settled와 다른 행 0 — 합치기 전 모습 0장 |
| L7(2) 재생 | 부분 | JS `play` 1 · `stop` 0 — before 1.0 · after 1.0 · after 2.35 모두. **네이티브 `started` 차이는 세 번 다 0으로 읽혔다**(이력이 가득 참 — 수단이 서지 않음) → 네이티브 1회는 미확인 |
| L8 | 기록 | 문장 만들기 2.35: 합쳐져 조각 「만나요」 「내일」에 끌어서 닿음, 글자 겹침 없음. 쓰기 · 말하기 2.35는 안내 때문에 보지 못했다. 배율 탐색: 2.05 · 2.1 `split`(카드 안 움직임, 끝 화면 아래 테두리만 `[2168]` — 「Thank you」 위 여백이 카드에 가려짐, 라벨은 읽힘), 2.15 `merged`(카드 이동, 보기 2개 온전). 2.1 ~ 2.15 사이는 안 봤다 |
| L9 | 도달 실패(조건 미충족) | 문장 만들기 `Making plans`가 `Lesson 1 / 1`(N = 1). 다른 문장 만들기 스텝은 열어 보지 않았다 |
| L10 | 기록 | 2.0 + 540에서 Hello 탭 1초 뒤: 보기 테두리 · 글자는 맞음 색, **판정 배지는 화면 안에 없음**(무대 윗부분이 스크롤 위로 올라가 있음) — `L1-2.0-after-tapped.png` |
| T 문턱 | 통과 | 2.0 `split` 유지(L4) · 2.2 `merged`(L5 b). 추가로 2.1 `split` · 2.15 `merged` |

제품 결함 1건: **합친 흐름에서 아래 흐림 띠가 그려지지 않는다**(L0(d) · L5(a)). 스파이크(`26d2e671` 위 버린 코드)에서는 그려졌다. → 수정 `f55e6412`(흐림 상자의 `z-index` `elevation-z-default` → `elevation-z-sticky`, 구현자가 같은 결함을 재현한 뒤 그 값 하나만 바꿔 기기에서 확인). 원복: 글꼴 1.0 · 밀도 · 크기 reset, 전역 설정 diff 0 — **단 secure에 남은 빈 `display_density_forced=`는 손으로 지웠다**(절차 결함 — 이 개정에서 고쳤다).

### 2회차 (2026-10-09) — PASS(재실행 범위) · 흐림 결함 수정 확인

실행자 test-runner. 시작 HEAD `f55e6412`. 번들(모의 값, 일회용 worktree에서 `pnpm bundle:android`, 서버 18790): `before` `fa3b261e` sha `bbc5b9d1…`(1회차와 같다) · `mid` `35ab98c0` sha `0155b68a…`(1회차의 `after`와 같은 sha = 결함 번들) · `after` `f55e6412` sha `7a6498a2…`. 기기 · APK · `guard`는 1회차와 같은 조건.

| 케이스 | 수치 | 판정 |
|---|---|---|
| L5(a) 2.2 멈춘 화면 before(`split`) ↔ after | **0행**(그림자 열 제외도 0) | 통과 |
| 〃 mid ↔ after · before ↔ mid | 105행(y 2169 ~ 2273) · 105행 | 결함 재현 |
| 2.2 띠 안 행별 최소 밝기(y 2170 / 2180 / 2190 / 2200) | after 52 / 71 / 91 / 110(그 아래 254) — before와 전부 같다 · mid 49 / 49 / 49 / 49 | 통과 / 결함 |
| L0(d) 2.35 띠 안 컨트롤 `darkest`(y 2190 ~ 2260, x 60 ~ 1020) | after **98**(y 2210 ~ 2240 행별 118 / 139 / 160 / 182) · mid **29**(행 모두 29) | 통과 / 결함 |
| 〃 끌어서 띠 밖에 올린 같은 컨트롤 | after 29 · mid 29 — 차 **69** / **0**(기준 ≥ 30) | 통과 / 결함 |
| 2.2 띠 안(540, 2230)에서 끌기 | rest ↔ 끌기 1483행, 되돌린 뒤 0행 | 통과 |
| 2.2 띠 안(540, 2225) 탭 | 996행 — 「Hello」가 눌려 「Correct」 · 맞음 색 | 통과(터치 통과) |
| 2.35 띠 안(540, 2230)에서 끌기 | 1541행, 되돌린 뒤 0행 | 통과 |
| 2.35 띠 안 재생 버튼(544, 2225) 탭 | JS `play` 1 · `stop` 0 — mid도 같다, 화면 변화 52행 같다 | 통과 |
| 회귀 — 듣기 1.0 · 1.3 · 2.0 멈춘 화면 before ↔ mid ↔ after 세 쌍 | 모두 0행(잡음 rest ↔ rest2 0) | 통과 |
| 회귀 — 2.0 `split` 끌기 끝 화면 · 멈춘 화면 | before ↔ after · mid ↔ after 0행, 무대 y 660 ~ 1930 제자리 0행, `choices` 온전 1개 `[(1974,2168)]` | 통과 |
| 회귀 — 2.0 `split`의 띠 | after y 2250 / 2260 / 2270 최소 밝기 207 / 227 / 246(「Thank you」가 옅어짐) — before · mid와 픽셀 같다 | 통과(`z-index` 변경이 `split`의 모습을 안 바꿈) |
| `hide-scrollbars` S8(학습 듣기 2.2)에의 영향 | 2.2는 이제 합치는 배율이고, 합친 흐름의 띠 모양이 `split`(`fa3b261e`)과 0행 같다. 그 작업의 끝 상자 대가(2.2 끝 라벨 가림)는 1회차 L5(c)로 해소 | 영향 없음 |
| L9 · L0(c) | 제품 데이터에 문항 둘 이상인 학습 스텝이 없다(L9의 첫 문단). 최종 시험은 기기에서 열어 봤으나 `LearningShell`이 아니다(`L9-final-t4.png`) | **도달 불가 — 미확인** |
| L8 2.35 쓰기(안내를 닫은 뒤) | 합치지 않음, 카드 위 끌기 0행(스크롤 없음), **그리기 면이 화면 아래에서 잘림** | 기록(이 작업이 고치지 않는다 — 사용자 결정 「후속」) |
| L8 2.35 말하기(안내를 닫은 뒤) | 합치지 않음, 지시문 3줄 온전, 카드 안이 스크롤(끌기 725행), Skip · Speak 고정 | 기록 |

다시 돌리지 않은 1회차 통과 항목(L0(a)(b) · L1 · L2 · L3 · L5(b)(c) · L6 · L7 · T): 위 「실행 상태」의 둘째 문단. 원복: 글꼴 1.0, 밀도 · 크기는 바꾸지 않음, global · system · secure 전후 diff 0, `display_*_forced` 0줄. 다른 세션과 에뮬레이터를 조율해 이 실행 뒤 넘겼다.

### 3회차 (2026-10-09) — PASS(r03 범위: L10 · L11 · RG3)

실행자 test-runner. 시작 · 끝 HEAD `aaa58aad`. 기기 emulator-5554 Pixel_8 API 37, 1080x2400 · 420. 호스트 · 계측 APK를 HEAD 사본에서 지어 설치했다(이 회차부터 설치 APK의 커밋이 확인된다). 번들(모의 값, 서버 18790): `after` `aaa58aad` sha `32fc3fb1…` · `before` `47c52a7f` `c976843e…` · `c1` `dd413834` `48788c30…`(accessibility 감사 번들과 같은 sha). 매 단계 `guard` 통과 · 남의 adb 없음.

**L10 — 답한 직후 배지**(듣기 Hello, burst 8장 · `badge.py`):

| 조건 | before `47c52a7f` | after | 판정 |
|---|---|---|---|
| 2.2 | 33 ~ 2307ms 전부 936 ~ 1093(높이 158, 온전 — 두 번 끌어 내린 자리에서 헤더 아래였다) | 21 ~ 2228ms 전부 1273 ~ 1430(158), 맨 위 | 통과(2.2는 재현 조건 아님) |
| 2.35 | 31 ~ 2361ms 전부 701 ~ 804(**높이 104 — 165 중 헤더에 잘림**) | 32 ~ 2148ms 전부 1319 ~ 1483(165) | **red 재현 → 통과** |
| 2.0 + 540 | 8장 전부 **배지 없음** | 36 ~ 2211ms 전부 1513 ~ 1701(189) | **red 재현 → 통과** |

- 첫 프레임(21 ~ 36ms)부터 최종 자리 — 모션 없이 즉시 간다. 자동 넘김(약 2.5초) 전 마지막 배지 프레임(1.8 ~ 2.3초)까지 남고, 2.8초부터 완료 화면.
- 이미 맨 위일 때(2.2, 끌지 않고 y 2120의 Hello): rest ↔ b1 996행(배지 · 색), b1 ↔ b2 24행(y 1340 ~ 1363), b2 ~ b6 0행 — 흔들림 없음.
- 고른 보기: 2.2는 위 테두리 한 줄(y 2144, 흐림 띠 안)만, 2.35 · 2.0 + 540은 화면 밖(`choices` 0개) — 계약이 감수한 대가.
- 캡처: `cap/L10-after-2.35-b-3.png` ↔ `cap/L10-before-2.35-b-3.png`, `cap/L10-after-2.0-540-b-3.png` ↔ `cap/L10-before-2.0-540-b-3.png`.

**L11 — TalkBack 오른쪽 쓸기만**(앱 실행 전에 TalkBack을 켬, 발화 표시 끔, `ring.py` 상자 + 캡처):

| 조건 | 순서(걸음 09부터) | 판정 |
|---|---|---|
| after 2.2 × 3 | 지시문 → 카드 글자 → 로마자 → 다시 듣기 → 재생 → Hello 상자 → Hello 글자(스크롤 한 걸음 따라옴) → Thank you 상자 → Thank you 글자 → 상단 바 | 통과 3/3(같은 모양) |
| after 2.35 × 3 | 같다 | 통과 3/3 |
| c1 `dd413834` 2.35 | … 재생(걸음 13) → 재생 그대로(스크롤만) → **상단 바로 돌아감**, 보기에 닿지 않음 | red 재현 |
| c1 `dd413834` 2.2 | 지시문 → **Hello 상자 · 글자가 카드보다 먼저** → 카드 글자 … | red 재현 |

- **이상 1건 — 재현 1/17, 원인 미확인.** 맨 처음 걸은 2.2 after(26걸음, TalkBack을 막 켠 직후)가 Hello 상자 · 글자까지 닿은 뒤 Thank you가 아니라 카드 글자로 돌아가 한 바퀴 안에 Thank you가 나오지 않았다(걸음 12/13 · 17/18이 같은 상자). 같은 번들 · 같은 절차의 여섯 번(2.2 셋 · 2.35 셋)은 재현되지 않았다. ⟨2026-10-10⟩ accessibility 재확인(`accessibility-r2.md`, 같은 앱 코드)의 열 번(2.2 여섯 — TalkBack을 막 켠 직후 셋 포함 · 2.35 둘 · 2.0 + 밀도 540 둘)에서도 0회였다. 결함으로 판정하지 않았다.
- **답한 뒤**(`l11ans`, 기록): 2.2 — 배지 1273 ~ 1430 온전, 초점은 답한 Hello 상자에 그대로(y 2144 ~ 2272, 화면 아래 걸침), TalkBack이 스크롤을 되돌리지 않음, 약 2.5초 뒤 넘김 → 초점이 상단 바로. 2.35 — 즉시 배지 1319 ~ 1483(맨 위) → TalkBack이 **스크롤을 116px 내리고 초점을 재생 버튼으로 옮김**(배지는 1203 ~ 1367로 여전히 헤더 아래 온전) → 넘김 뒤 완료 화면 본문으로. 맨 위 취소는 아니다. 판정 낭독은 듣지 않았다(발화 표시 끔).

**RG3 — 회귀**: 글꼴 1.0 · 2.0 rest before ↔ after 0행 / 0행, Hello를 누른 1초 뒤 0행 / 0행(`split`은 답해도 스크롤을 보내지 않는다). 문장 만들기 2.35(「Your First Hello」, 합쳐짐, 조각 하나): 조각을 누르는 동안 헤더 아래 윗부분 0행(변화는 y 1707 ~ 2273의 조각 · `Check` 영역뿐), `Check` 뒤 첫 프레임(34ms)부터 맨 위 · 「Correct」 배지 1073 ~ 1237(165) 온전, 버튼이 `Next`로 바뀜 — 통과.

제품 결함 0. 원복: TalkBack 끔(Bound services 없음 · touchExploration false), 발화 표시는 건드리지 않음, 글꼴 1.0, 크기 · 밀도 reset, `display_*_forced` global · secure 0줄, globals · settings global · system · secure 전후 diff 0, 서버 종료, 사본 제거.

### 세 회차가 확인하지 못한 것

iOS(⟨2026-10-09⟩ 절차 밖의 시뮬레이터 · AX3XL 한 점만 — 위 「이 절차로 확인되지 않는 것」) · VoiceOver, L0(c) · L9(위), 네이티브 재생 횟수, 2.35 완료 화면의 배지 글자 온전 여부, 설정 UI의 최대 화면 크기(밀도 540은 adb 강제), 2.1 ~ 2.15 사이의 문턱, 보기 4개 · 두 줄 라벨(단어 선택의 큰 글꼴 답함), TalkBack의 낭독 글자 · **판정 낭독(accessibility W1 — 기존)**, 2.0 + 540의 TalkBack(⟨2026-10-10⟩ 절차 밖 `accessibility-r2.md`가 봤다 — 쓸기 순서 2/2 · 답한 뒤 배지 온전, 낭독 글자는 못 받음), 2.2 · 2.35 밖 배율(2.15 ~ 2.3)의 TalkBack, L11 이상 1건의 원인, 문장 만들기의 조각 여러 개 · `Next` 뒤, 틀린 답의 배지(L10은 맞음만), 1 · 2회차 설치 APK의 커밋.

### 후속 — 이 작업이 고치지 않는 것 (소유자 implementation)

accessibility 감사(`accessibility.md`)가 main(`296e2eac`) 번들과 대조해 **기존 문제**로 확인한 것이다. 이 작업이 만든 것도 넓힌 것도 아니라 판정에서 빼고, 별도 작업으로 넘긴다. 일정은 정해지지 않았다. S2만은 예외다 — 재확인(`accessibility-r2.md`)이 이 작업의 동작에서 찾은 제안이고, W1과 함께 다룰 것이라 여기 둔다.

| id | 무엇 | 근거 | 첫 처방(accessibility의 권고) |
|---|---|---|---|
| W1 | TalkBack으로 답해도 판정(「Correct」 · 「Incorrect」)이 낭독되지 않는다 — WCAG 4.1.3 | main과 같다(글꼴 1.0, 두 번들) [실측]. 맨 위로(r03)는 시각 단서만 고친다 | `AnswerVerdict`의 판정음 효과에서 판정 문구를 한 번 알린다(`announce`) — 듣기 · 단어 선택 · 문장 만들기가 한 번에 덮인다. 확인: TalkBack + 발화 표시에서 답한 직후 상자에 판정 낱말 |
| W2 | 글꼴 1.0 `split`의 쓸기 순서가 보이는 순서와 다르다(hide-scrollbars의 N1) | main과 낭독 글자 · 걸음별 상자가 전부 같다 [실측] — [ADR-0055](../adr/0055-scroll-bars-off.md) 「미확인 · 후속」 11 | L11을 고친 처방(카드 `z-index` 풀기)을 1.0 학습 · 피드백에서 기기로 시험한다 — `split`에서는 무대 카드가 작업 영역 위로 겹쳐 그려지는 문제를 함께 본다 |
| S1 | 상단 바의 연속 · 트로피 칩이 두 걸음씩(「0-day streak」 · 「0」) 읽힌다 — 위반 아님 | 모든 화면, main과 같다 [실측] | 칩 안 숫자 글자를 접근성 요소에서 뺀다(`accessibility-element={false}`) |
| S2 | ⟨2026-10-10⟩ **이 작업이 만든 동작 — 결함 아님**(기존 문제가 아닌 유일한 행). 합친 배치에서 TalkBack으로 답하면 맨 위로가 답한 보기를 화면 밖으로 밀고 TalkBack이 초점을 무대 요소로 옮긴다. W1(판정 낭독)을 넣을 때 그 초점 이동의 발화(「Play, Button」 등)가 판정 낭독을 끊거나 앞설 수 있다 — 아직 듣지 못했다 | accessibility 재확인(`accessibility-r2.md`): 2.35 스크롤 116px · 초점 재생 버튼, 2.0 + 밀도 540 스크롤 72px · 초점 카드 글자, 배지는 온전 [실측]. 낭독은 발화 표시를 꺼 못 들었다 | 지금 고칠 것은 없다. W1을 구현할 때 `announce`를 맨 위로 스크롤 **뒤에** 보내고, 기기에서 발화 표시를 켠 채 글꼴 1.0(`split`) · 합친 배치(2.35) 둘 다 상자에 「Correct」 / 「Incorrect」가 끊기지 않고 남는지 확인한다. 끊기면 `announce`를 다음 프레임(또는 `scrollTo` 완료 뒤)로 미룬다. 초점을 보기로 되돌리는 처방은 권하지 않는다(배지가 다시 화면 밖으로 간다) |

### 절차 결함 — 이 개정에서 고친 것

| # | 결함(찾은 회차) | 고친 곳 |
|---|---|---|
| 1 | L0(d)의 판독 창(`280 680 2170 2272`)이 띠 시작선을 읽어 변별이 흔들렸다(2회차) | L0(d): 창 y 2190 ~ 2260 · x 60 ~ 1020, `rest2`로 판독, 보조 도구 `bandrows.py`(부록 — `artifacts/e2e-2/tools/`에서 옮겨 selftest를 붙였다) |
| 2 | L9가 현 데이터로 닿지 못한다(1 · 2회차) | L9: 「제품 데이터상 도달 불가 — 문항 둘 이상인 학습 스텝이 생기면」 |
| 3 | 2.0 Start 검출이 기본 범위로 3회 중 2회 실패(2회차) | `styfor`(2.0 → 2000 ~ 2380) + `enter`의 재시도(`ENTER_TRIES`, 기본 3) |
| 4 | 쓰기 · 말하기도 첫 열기 안내가 먼저 뜬다(1 · 2회차) | `guide_close` · L8의 `l8` |
| 5 | zsh에서 `A shell input tap $XY` · `set -- $P`가 안 갈라진다(1 · 2회차) | 「함수 묶음」: bash로 돌린다 |
| 6 | L4 2.0 끌기의 「온전한 보기 2개」는 오기 — 117dp 창에는 한 칸만 든다(1회차) | L4: 온전한 보기 1개(마지막 보기) |
| 7 | 2.2 · 2.35 Start 검출이 기본 범위로 놓쳤다(1 · 2회차) | `styfor`(2.2 · 2.35 → `STY0=2100 STY1=2380`) |
| 8 | 밀도 540에서 `UNMIN=4000`(산술)과 Start 하한 6000이 맞지 않았다(1회차) | 「밀도 540의 값」: `UNMIN=3000 UNMAX=5600 SW0=1500 SW1=1000 STMIN=4000`, `lsgo`가 `SW0` · `SW1` · `STMIN`을 읽는다 |
| 9 | `restore_all`이 secure의 빈 `display_density_forced=`를 안 지웠다(1회차) | `restore_all`: global · secure 둘 다 |
| 10 | L7의 네이티브 `started` 차이가 이력이 가득 차 늘 0(1회차) | L7(2): 네이티브 횟수는 못 센다 — JS 호출 수만 판정 |
| 11 | L5(b)의 `fogband.py shift`가 균일한 카드에서 24px로 읽혔다(1회차) | L5(b) · T: `rest ↔ cardDrag` 다른 행 + 카드 윗변 y |
| 12 | L2의 설정 앱 경로가 단계로 없다(1회차) | L2: 1회차가 adb 강제였다는 사실과 그 표시 규칙. **설정 앱 경로 자체는 아직 단계로 적지 못했다** — 그 화면을 기기에서 본 사람이 없다 |
| 13 | 문장 만들기 진입: `lsgo`의 Start 범위(styfor)가 그 단원의 시트(1.0 y 1504 · 2.35 y 1990)와 맞지 않아 손으로 좌표를 읽었다(3회차) | 함수 묶음의 `so_enter`(Episode 0 소개 Skip `200 2158` → 확인 `540 1428` → `Back to map` `540 2300` → 시트의 Start, 2.35 기준 좌표) · L8 · RG3가 그것을 쓴다 |
| 14 | L10이 「기록만」이었고 배지 판독 도구가 없었다(3회차) | L10을 판정 케이스로, 부록 `badge.py`(`artifacts/e2e-3/tools/`에서 옮겨 인자 검사 · `selftest`를 붙였다) |
| 15 | TalkBack 순서(L11)의 절차가 없었다(3회차가 accessibility의 도구로 돌렸다) | L11 · `l11` · `l11ans`, 도구는 `learning-item-guides.md`의 `ring.py` · `tb-idioms.sh`를 추출 블록이 꺼낸다 |
| 16 | zsh에서 `set -- $cfg`가 안 갈려 빈 실행이 한 번 났다(3회차) | 「함수 묶음」의 bash 문단에 3회차 사례를 더했다(고칠 것은 없다 — 문서 문구 그대로 bash로 돈다) |
| 17 | 글꼴을 진행 도중에 바꾸면 앱이 다시 시작해 진행이 사라진다(3회차) | `so_enter`의 주석 — 글꼴은 진입 전에만 바꾼다 |
| 18 | `burst`의 프레임이 0.3 · 1 · 2초가 아니다(3회차: 약 0.03 · 0.6 · 1.0 · 1.4 · 1.9 · 2.3초) | L10: 프레임 시각을 `-times.txt`에서 읽는다 |

3회차의 2.0 + 540 Start 검출이 한 번 놓친 뒤 재시도로 닿은 것은 `enter`의 재시도(결함 3)가 한 일이다 — 고칠 것이 없다.

## 부록 — 도구

### `lsfont.py`

아래 블록을 `$OUT/tools/lsfont.py`로 저장한다(`barscan.py`와 같은 폴더 — 위 「한 번만 — 추출」이 한다). Python 3 표준 라이브러리 + `barscan.py`의 PNG 디코더. `selftest`는 합성 캡처로 기기 없이 돈다.

- `choices` — 보기 상자를 센다: **위 테두리와 아래 테두리가 같은 색이고 안쪽이 흰 면인 쌍**만 「온전한 보기」로 센다(`#EEEFF1` ±2 — 그림자 · 안티앨리어싱 행은 걸러진다). 위나 아래 테두리만 있는 것은 따로 낸다(잘린 보기).
- `pick N` — N번째 온전한 보기의 가운데 좌표(탭용).
- `diffx` — 다른 행의 수. 뒤에 `X0:X1`을 주면 그 열 구간은 비교에서 뺀다(카드 옆 그림자 열 · L5(a)의 대체 판정).
- `runs` — 행을 BG · FAINT · INK의 연속 구간으로 나눠 낸다(지시문 줄 · 버튼 위 간격).
- `shadowcol` — 행 Y의 왼쪽 · 오른쪽 가장자리 열(x 16~40)에 카드 옆 그림자가 있는가.
- `darkest` — 상자 안에서 가장 어두운 픽셀의 밝기(띠 안 · 밖의 같은 컨트롤 농도 비교).

판독 임계값(`#EEEFF1` ±2 · 그림자 4 이상 · 병합 간격 3행 · 500px 구간)은 **저장 캡처(스파이크 · `hide-scrollbars`)에서 이 도구가 보기를 맞게 센 값**으로 정했다 — 1.0 rest 보기 2(둘 다 온전), 2.0 rest 1(둘째는 잘림), 2.2 · 2.35 끝 화면 보기 2, 수정 전 2.2 끝 화면 0(위 테두리만 `[2069]`). **새 번들의 캡처로 확인한 적은 없다.**

```python
#!/usr/bin/env python3
"""학습 껍데기 큰 글꼴 판독 도구 (L1 ~ L10). barscan.py와 같은 폴더에 저장한다(barscan의 PNG 디코더를 쓴다).
  lsfont.py choices <png> [Y0 Y1] [#RRGGBB]  보기 상자(흰 면 + 그 색의 위 · 아래 테두리)를 센다: 온전한 것 · 위만 · 아래만. 색 기본 #EEEFF1(gray-300을 Pixel_8 캡처에서 읽은 값)
  lsfont.py diffx   <a.png> <b.png> [Y0 Y1] [X0:X1 ...]   다른 행의 수. 뒤의 X0:X1 구간의 열은 비교에서 뺀다(그림자 열 등)
  lsfont.py runs    <png> [Y0 Y1] [X0 X1]    행을 BG(배경) · FAINT(옅음, 그림자 · 띠) · INK(글자 · 테두리)의 연속 구간으로 나눠 낸다
  lsfont.py pick    <png> N [Y0 Y1] [#RRGGBB]   N번째(위에서, 1부터) 온전한 보기의 가운데 "x y" - 탭 좌표. 없으면 종료 코드 1
  lsfont.py shadowcol <png> Y                  행 Y의 왼쪽 · 오른쪽 가장자리 열(x 16 ~ 40)이 x=4의 배경색보다 어두운가(카드 옆 그림자). 있으면 0
  lsfont.py darkest <png> X0 X1 Y0 Y1        그 상자 안에서 가장 어두운 픽셀의 밝기(0~255)와 자리. 띠 안 · 밖의 같은 아이콘 농도를 비교한다
  lsfont.py selftest                         합성 PNG로 도구를 검사한다. 기기 없이 돈다
상태바(y < 132)는 비교에서 뺀다. 환경변수: LSF_TOL(테두리 색 허용 오차, 기본 2 - 그림자 · 안티앨리어싱 행을 거른다) · LSF_MINRUN(테두리 가로 구간의 최소 길이 px, 기본 500).
고른 보기의 테두리는 정오 색이다: 맞음 #35A66F · 틀림 #DF4D54(listening-choice.css의 토큰 값)."""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png

TOP = 132


def px(rows, bpp, x, y):
    i = x * bpp
    return (rows[y][i], rows[y][i + 1], rows[y][i + 2])


def dist(a, b):
    return max(abs(a[k] - b[k]) for k in range(3))


def border_runs(rows, bpp, w, y0, y1, want):
    """행마다: 가로로 LSF_MINRUN 이상 이어지는, want 색(±LSF_TOL)의 구간이 있으면 (y, 색, 시작x, 끝x)."""
    tol = int(os.environ.get("LSF_TOL", 2))
    minrun = int(os.environ.get("LSF_MINRUN", 500))
    out = []
    for y in range(y0, y1):
        x = 40
        best = None
        while x < w - 40:
            c = px(rows, bpp, x, y)
            s = x
            while x < w - 40 and dist(px(rows, bpp, x, y), c) <= 6:
                x += 1
            if x - s >= minrun and dist(c, want) <= tol:
                if best is None or x - s > best[2] - best[1]:
                    best = (c, s, x - 1)
            if x == s:
                x += 1
        if best:
            out.append((y, best[0], best[1], best[2]))
    return out


def choices(rows, bpp, w, h, y0, y1, want=(238, 239, 241)):
    """위 테두리와 아래 테두리(같은 색 ±8, 안쪽이 흰 면)를 짝지은 온전한 상자 · 짝이 없는 위 · 아래."""
    lines = []
    for y, c, xs, xe in border_runs(rows, bpp, w, y0, y1, want):
        if lines and y - lines[-1]["y1"] <= 3 and dist(c, lines[-1]["c"]) <= 8:
            lines[-1]["y1"] = y
            lines[-1]["xs"] = min(lines[-1]["xs"], xs)
            lines[-1]["xe"] = max(lines[-1]["xe"], xe)
        else:
            lines.append({"y0": y, "y1": y, "c": c, "xs": xs, "xe": xe})

    def white_at(l, y):
        return 0 <= y < h and dist(px(rows, bpp, l["xs"] + 60, y), (255, 255, 255)) <= 1

    tops = [l for l in lines if white_at(l, l["y1"] + 6) and not white_at(l, l["y0"] - 6)]
    bots = [l for l in lines if white_at(l, l["y0"] - 6) and not white_at(l, l["y1"] + 6)]
    full, used = [], set()
    for t in tops:
        for i, b in enumerate(bots):
            if i not in used and b["y0"] > t["y1"] and dist(t["c"], b["c"]) <= 8 \
                    and b["y0"] - t["y1"] < 500 and abs(t["xs"] - b["xs"]) <= 12:
                full.append((t["y0"], b["y1"]))
                used.add(i)
                break
    topfull = {f[0] for f in full}
    botfull = {f[1] for f in full}
    only_top = [t["y0"] for t in tops if t["y0"] not in topfull]
    only_bot = [b["y1"] for b in bots if b["y1"] not in botfull]
    return full, only_top, only_bot


def diffx(ra, rb, w, h, y0, y1, skips, bpp):
    ys = []
    for y in range(max(y0, TOP), min(y1, h)):
        if ra[y] == rb[y]:
            continue
        if not skips:
            ys.append(y)
            continue
        a, b = ra[y], rb[y]
        for x in range(w):
            if any(s0 <= x < s1 for s0, s1 in skips):
                continue
            if a[x * bpp:x * bpp + 3] != b[x * bpp:x * bpp + 3]:
                ys.append(y)
                break
    return ys


def runs(rows, bpp, w, h, y0, y1, x0, x1):
    def cls(y):
        bg = px(rows, bpp, 4, y)
        m = max(dist(px(rows, bpp, x, y), bg) for x in range(x0, x1, 2))
        return "BG" if m <= 6 else ("FAINT" if m <= 60 else "INK")

    out = []
    for y in range(y0, min(y1, h)):
        c = cls(y)
        if out and out[-1][0] == c:
            out[-1][2] = y
        else:
            out.append([c, y, y])
    return out


def main(argv):
    if len(argv) < 2:
        raise SystemExit(__doc__)
    cmd = argv[1]
    if cmd == "choices":
        w, h, bpp, rows = read_png(argv[2])
        y0 = int(argv[3]) if len(argv) > 3 else 400
        y1 = int(argv[4]) if len(argv) > 4 else h - 100
        want = tuple(int(argv[5].lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) if len(argv) > 5 else (238, 239, 241)
        full, ot, ob = choices(rows, bpp, w, h, y0, y1, want)
        print(f"온전한 보기 {len(full)}개 {full} · 위 테두리만 {ot} · 아래 테두리만 {ob}")
        return 0 if full else 1
    if cmd == "diffx":
        wa, ha, ba, ra = read_png(argv[2])
        wb, hb, bb, rb = read_png(argv[3])
        if (wa, ha, ba) != (wb, hb, bb):
            raise SystemExit("크기가 다르다 -> 비교 불가")
        rest = argv[4:]
        nums = [r for r in rest if ":" not in r]
        sk = [tuple(map(int, r.split(":"))) for r in rest if ":" in r]
        y0 = int(nums[0]) if len(nums) > 0 else TOP
        y1 = int(nums[1]) if len(nums) > 1 else ha
        ys = diffx(ra, rb, wa, ha, y0, y1, sk, ba)
        print(f"다른 행 {len(ys)} / {min(y1, ha) - max(y0, TOP)}"
              + (f" · y {ys[0]}~{ys[-1]}" if ys else "") + (f" · 뺀 열 {sk}" if sk else ""))
        return 0 if not ys else 1
    if cmd == "runs":
        w, h, bpp, rows = read_png(argv[2])
        a = [int(v) for v in argv[3:]]
        y0, y1, x0, x1 = (a + [TOP, h, 60, w - 60][len(a):])[:4]
        for c, s, e in runs(rows, bpp, w, h, y0, y1, x0, x1):
            print(f"{c:5s} y {s}~{e} ({e - s + 1}px)")
        return 0
    if cmd == "pick":
        w, h, bpp, rows = read_png(argv[2])
        n = int(argv[3])
        y0 = int(argv[4]) if len(argv) > 4 else 400
        y1 = int(argv[5]) if len(argv) > 5 else h - 100
        want = tuple(int(argv[6].lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) if len(argv) > 6 else (238, 239, 241)
        full = choices(rows, bpp, w, h, y0, y1, want)[0]
        if len(full) < n:
            print("none")
            return 1
        print(f"{w // 2} {(full[n - 1][0] + full[n - 1][1]) // 2}")
        return 0
    if cmd == "shadowcol":
        w, h, bpp, rows = read_png(argv[2])
        y = int(argv[3])
        out = []
        for side, xs in (("왼쪽", (16, 24, 32, 40)), ("오른쪽", tuple(w - 1 - x for x in (16, 24, 32, 40)))):
            bg = px(rows, bpp, 4 if side == "왼쪽" else w - 5, y)
            ds = [sum(bg) // 3 - sum(px(rows, bpp, x, y)) // 3 for x in xs]
            out.append((side, ds))
        print(" · ".join(f"{s} 배경보다 어두운 정도 {ds}" for s, ds in out))
        return 0 if all(sum(1 for d in ds if d >= 4) >= 3 for _, ds in out) else 1
    if cmd == "darkest":
        w, h, bpp, rows = read_png(argv[2])
        x0, x1, y0, y1 = (int(v) for v in argv[3:7])
        best = (999, None)
        for y in range(y0, min(y1, h)):
            for x in range(x0, min(x1, w)):
                p = px(rows, bpp, x, y)
                v = (p[0] + p[1] + p[2]) / 3
                if v < best[0]:
                    best = (v, (x, y))
        print(f"가장 어두운 밝기 {best[0]:.0f} at {best[1]}")
        return 0
    if cmd == "selftest":
        return selftest()
    raise SystemExit(__doc__)


def w_edge(x):
    return 1080 - 41 <= x <= 1080 - 17


def selftest():
    d = tempfile.mkdtemp()
    ok = True

    def check(name, cond):
        nonlocal ok
        print(("ok   " if cond else "FAIL ") + name)
        ok = ok and cond

    BG, BD = (255, 253, 252), (238, 239, 241)

    def boxes(spec, cut=None):
        def paint(x, y):
            if cut is not None and y >= cut:
                return BG
            for t, b in spec:
                if 40 <= x < 1040:
                    if t <= y < t + 3 or b - 3 < y <= b:
                        return BD
                    if t + 3 <= y <= b - 3:
                        return (255, 255, 255)
            return BG
        return paint

    def load(name, paint, h=1200):
        p = os.path.join(d, name)
        write_png(p, 1080, h, paint)
        return read_png(p)

    w, h, bpp, rows = load("two.png", boxes([(300, 420), (460, 580)]))
    full, ot, ob = choices(rows, bpp, w, h, 200, 1000)
    check("보기 둘 - 온전한 2", len(full) == 2 and not ot and not ob)
    w, h, bpp, rows = load("cut.png", boxes([(300, 420), (460, 560)], cut=540))
    full, ot, ob = choices(rows, bpp, w, h, 200, 1000)
    check("둘째가 아래에서 잘림 - 온전한 1, 위만 1", len(full) == 1 and len(ot) == 1)
    w, h, bpp, rows = load("none.png", lambda x, y: BG)
    full, ot, ob = choices(rows, bpp, w, h, 200, 1000)
    check("빈 화면 - 0", not full and not ot and not ob)
    w, h, bpp, rows = load("sh.png", lambda x, y: (243, 241, 241) if 600 <= y < 640 and 40 <= x < 1040 else BG)
    full, ot, ob = choices(rows, bpp, w, h, 200, 1000)
    check("카드 그림자는 보기가 아니다", not full and not ot and not ob)
    wa, ha, ba, ra = load("a.png", lambda x, y: BG, 600)
    _, _, _, rb = load("b.png", lambda x, y: (200, 200, 200) if 300 <= y < 310 and 20 <= x < 30 else BG, 600)
    check("diffx 10행", len(diffx(ra, rb, wa, ha, 132, 600, [], ba)) == 10)
    check("diffx 열을 빼면 0", len(diffx(ra, rb, wa, ha, 132, 600, [(13, 41)], ba)) == 0)

    def txt(x, y):
        if 200 <= y < 230 and 100 <= x < 900:
            return (30, 30, 30)
        return (243, 241, 241) if 260 <= y < 280 and x >= 20 else BG

    w, h, bpp, rows = load("t.png", txt, 600)
    kinds = [c for c, _, _ in runs(rows, bpp, w, h, 150, 320, 60, w - 60)]
    check("runs - BG INK BG FAINT BG", kinds == ["BG", "INK", "BG", "FAINT", "BG"])
    w, h, bpp, rows = load("pk.png", boxes([(300, 420), (460, 580)]))
    check("pick 2 - 가운데 (540, 520)", choices(rows, bpp, w, h, 200, 1000)[0][1] == (460, 580))
    load("sc.png", lambda x, y: (243, 241, 241) if 16 <= x <= 40 or w_edge(x) else BG)
    load("sc0.png", lambda x, y: BG)
    check("shadowcol - 그림자 열이 있으면 0, 없으면 1",
          main(["x", "shadowcol", os.path.join(d, "sc.png"), "500"]) == 0 and main(["x", "shadowcol", os.path.join(d, "sc0.png"), "500"]) == 1)
    w, h, bpp, rows = load("dk.png", lambda x, y: (40, 40, 40) if (x, y) == (500, 300) else ((120, 120, 120) if (x, y) == (510, 310) else BG), 600)
    best = min(((sum(px(rows, bpp, x, y)) / 3, (x, y)) for y in range(290, 320) for x in range(490, 520)))
    check("darkest - (500, 300)의 40", best[0] == 40 and best[1] == (500, 300))
    print("selftest PASS" if ok else "selftest FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

### `bandrows.py`

아래 블록을 `$OUT/tools/bandrows.py`로 저장한다(위 「한 번만 — 추출」이 한다). 2회차가 L0(d)의 변별을 위해 만든 도구(`artifacts/e2e-2/tools/bandrows.py`)를 출력 형식 그대로 옮기고 인자 검사와 `selftest`를 붙였다. `barscan.py`의 PNG 디코더를 쓴다.

- 행 y마다(Y0부터 step 간격, Y1 미만) x 범위의 **가장 어두운 점의 밝기**(`min`)와 **평균 밝기**(`mean`)를 낸다. 밝기는 R · G · B의 평균이다.
- 띠 안의 같은 컨트롤이 위에서 아래로 옅어지면 `min`이 아래로 갈수록 커진다(2회차 2.35 after: y 2210 ~ 2240에서 118 → 182). 띠가 안 그려지면 `min`이 행마다 같다(결함 번들: 29 고정).

```python
#!/usr/bin/env python3
"""bandrows.py <png> Y0 Y1 [step] [X0 X1] : 행 y마다 x 범위의 최소 밝기(가장 어두운 점)와 평균 밝기. 띠 안의 농도 변화를 수치로 본다
  기본 step 10 · X0 60 · X1 (폭 - 60). 밝기는 (R + G + B) / 3이다.
  bandrows.py selftest                          합성 PNG로 도구를 검사한다. 기기 없이 돈다"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png


def rowstats(rows, bpp, y, x0, x1):
    r = rows[y]
    v = [(r[x * bpp] + r[x * bpp + 1] + r[x * bpp + 2]) / 3 for x in range(x0, x1)]
    return min(v), sum(v) / len(v)


def scan(path, y0, y1, step=10, x0=60, x1=None):
    w, h, bpp, rows = read_png(path)
    x1 = w - 60 if x1 is None else x1
    if not (0 <= y0 < y1 <= h and 0 <= x0 < x1 <= w and step > 0):
        raise SystemExit(f"범위가 캡처 밖이다: y {y0}~{y1} · x {x0}~{x1} · 캡처 {w}x{h}")
    return [(y,) + rowstats(rows, bpp, y, x0, x1) for y in range(y0, y1, step)]


def main(argv):
    if len(argv) >= 2 and argv[1] == "selftest":
        return selftest()
    if len(argv) < 4:
        raise SystemExit(__doc__)
    step = int(argv[4]) if len(argv) > 4 else 10
    x0 = int(argv[5]) if len(argv) > 5 else 60
    x1 = int(argv[6]) if len(argv) > 6 else None
    for y, mn, mean in scan(argv[1], int(argv[2]), int(argv[3]), step, x0, x1):
        print(f"y {y}: min {mn:.0f} mean {mean:.1f}")
    return 0


def selftest():
    d = tempfile.mkdtemp()
    ok = True

    def check(name, cond):
        nonlocal ok
        print(("ok   " if cond else "FAIL ") + name)
        ok = ok and cond

    BG = (255, 253, 252)

    def faded(x, y):              # 아이콘(x 500~560)이 y 200부터 아래로 갈수록 옅어진다 — 띠가 위에 그려진 모습
        if 500 <= x < 560 and 200 <= y < 240:
            v = 30 + (y - 200) * 4
            return (v, v, v)
        return BG

    def flat(x, y):               # 같은 아이콘이 행마다 같은 농도 — 띠가 안 그려진 모습
        return (29, 29, 29) if 500 <= x < 560 and 200 <= y < 240 else BG

    def edge(x, y):               # x 범위 밖(왼쪽 끝)에만 진한 점
        return (0, 0, 0) if x < 20 else BG

    for name, paint in (("faded.png", faded), ("flat.png", flat), ("edge.png", edge)):
        write_png(os.path.join(d, name), 1080, 400, paint)
    f = scan(os.path.join(d, "faded.png"), 200, 240, 10)
    check("옅어지는 띠 - 행 넷", [r[0] for r in f] == [200, 210, 220, 230])
    check("옅어지는 띠 - min이 아래로 커진다", all(a[1] < b[1] for a, b in zip(f, f[1:])))
    check("옅어지는 띠 - 첫 행 min 30", round(f[0][1]) == 30)
    g = scan(os.path.join(d, "flat.png"), 200, 240, 10)
    check("안 그려진 띠 - min이 행마다 같다", len({round(r[1]) for r in g}) == 1 and round(g[0][1]) == 29)
    e = scan(os.path.join(d, "edge.png"), 100, 110, 10)
    check("x 범위 밖은 안 본다 - min은 배경", round(e[0][1]) == round(sum(BG) / 3))
    e2 = scan(os.path.join(d, "edge.png"), 100, 110, 10, 0, 1080)
    check("x 범위를 넓히면 진한 점을 본다", round(e2[0][1]) == 0)
    try:
        scan(os.path.join(d, "edge.png"), 300, 500)
        check("캡처 밖 범위는 멈춘다", False)
    except SystemExit:
        check("캡처 밖 범위는 멈춘다", True)
    print("selftest PASS" if ok else "selftest FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

### `badge.py`

아래 블록을 `$OUT/tools/badge.py`로 저장한다(위 「한 번만 — 추출」이 한다). 3회차가 L10을 판독하려고 만든 도구(`artifacts/e2e-3/tools/badge.py`)를 판정 규칙 그대로 옮기고 인자 검사와 `selftest`를 붙였다. `barscan.py`의 PNG 디코더를 쓴다.

- 행마다 x 300 ~ 800(2px 간격)에서 배지 채움색(맞음 `#35A66F` ±10, 틀림은 `BADGE_COLOR=#DF4D54`)인 점을 세고, 50점 이상인 행이 이어진 **가장 긴 구간**을 배지의 y 범위로 낸다. 상태바(y < 132)는 보지 않는다. 구간이 40행 미만이면 `none`.
- 같은 초록을 쓰는 보기의 맞음 테두리(3px)는 구간이 짧아 걸리지 않는다. 완료 화면의 큰 초록 원도 같은 색이라 넘김 뒤 프레임은 판독에 쓰지 않는다(배지 프레임만 본다).

```python
#!/usr/bin/env python3
"""badge.py PNG... : 판정 배지(채움색, x 300 ~ 800)의 y 범위 — 행마다 그 색 점이 50개 이상(2px 간격)인 행의 가장 긴 연속 구간.
  40행 미만이면 none. 색 기본 맞음 #35A66F(listening-choice.css의 맞음색을 Pixel_8 캡처에서 읽은 값), 틀림은 BADGE_COLOR=#DF4D54
  badge.py selftest          합성 PNG로 도구를 검사한다. 기기 없이 돈다"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png

TOP = 132          # 상태바 아래부터 본다
X0, X1 = 300, 800  # 배지가 서는 가로 범위(무대 카드 가운데)
MIN_ROW = 50       # 한 행에서 그 색 점의 최소 개수(2px 간격 표본)
MIN_H = 40         # 이보다 짧은 구간은 배지가 아니다(보기 테두리 · 잡음)
TOL = 10


def parse_color(text):
    c = text.lstrip('#')
    if len(c) != 6:
        raise SystemExit(f"색은 #RRGGBB여야 한다: {text}")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def badge_range(path, want):
    """(y0, y1, h) 또는 None."""
    w, h, bpp, rows = read_png(path)
    if w < X1:
        raise SystemExit(f"캡처 폭이 {X1}보다 좁다: {w}")
    best = (0, 0, 0)
    cur = None
    for y in range(TOP, h):
        r = rows[y]
        n = 0
        for x in range(X0, X1, 2):
            if all(abs(r[x * bpp + k] - want[k]) <= TOL for k in range(3)):
                n += 1
        if n >= MIN_ROW:
            if cur is None:
                cur = y
            run = (y - cur + 1, cur, y)
            if run > best:
                best = run
        else:
            cur = None
    return (best[1], best[2], best[0]) if best[0] >= MIN_H else None


def main(argv):
    if len(argv) >= 2 and argv[1] == "selftest":
        return selftest()
    if len(argv) < 2:
        raise SystemExit(__doc__)
    want = parse_color(os.environ.get('BADGE_COLOR', '#35A66F'))
    for png in argv[1:]:
        b = badge_range(png, want)
        print(f"{os.path.basename(png):34s}", f"badge y {b[0]}-{b[1]} h={b[2]}" if b else "none")
    return 0


def selftest():
    d = tempfile.mkdtemp()
    ok = True

    def check(name, cond):
        nonlocal ok
        print(("ok   " if cond else "FAIL ") + name)
        ok = ok and cond

    BG = (254, 252, 251)
    GREEN = (0x35, 0xA6, 0x6F)
    RED = (0xDF, 0x4D, 0x54)

    def badge(color, y0, y1):
        return lambda x, y: color if 400 <= x < 700 and y0 <= y < y1 else BG

    write_png(os.path.join(d, "full.png"), 1080, 600, badge(GREEN, 200, 358))       # 높이 158의 배지
    write_png(os.path.join(d, "cut.png"), 1080, 600, badge(GREEN, 100, 204))        # 위가 상태바(132) 밑으로 잘린 배지
    write_png(os.path.join(d, "none.png"), 1080, 600, lambda x, y: BG)
    write_png(os.path.join(d, "border.png"), 1080, 600, badge(GREEN, 300, 303))     # 맞음 테두리 3px — 배지가 아니다
    write_png(os.path.join(d, "red.png"), 1080, 600, badge(RED, 200, 300))
    write_png(os.path.join(d, "narrow.png"), 1080, 600, lambda x, y: GREEN if 400 <= x < 480 and 200 <= y < 300 else BG)
    g = parse_color('#35A66F')
    check("온전한 배지 - 200~357 h158", badge_range(os.path.join(d, "full.png"), g) == (200, 357, 158))
    check("상태바 밑은 안 본다 - 132~203 h72", badge_range(os.path.join(d, "cut.png"), g) == (132, 203, 72))
    check("배지 없음 - None", badge_range(os.path.join(d, "none.png"), g) is None)
    check("3px 테두리는 배지가 아니다", badge_range(os.path.join(d, "border.png"), g) is None)
    check("틀림 배지는 맞음색으로 안 잡힌다", badge_range(os.path.join(d, "red.png"), g) is None)
    check("틀림 배지는 틀림색으로 잡힌다", badge_range(os.path.join(d, "red.png"), parse_color('#DF4D54')) == (200, 299, 100))
    check("좁은 초록(행마다 50점 미만)은 배지가 아니다", badge_range(os.path.join(d, "narrow.png"), g) is None)
    try:
        parse_color('#12345')
        check("잘못된 색은 멈춘다", False)
    except SystemExit:
        check("잘못된 색은 멈춘다", True)
    print("selftest PASS" if ok else "selftest FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

### 도구 검사(selftest) — 기기 없이

```sh
python3 -m py_compile "$TOOLS/lsfont.py" && python3 "$TOOLS/lsfont.py" selftest     # 합성 10건 — choices(둘 · 잘림 · 빈 화면 · 그림자) · diffx(전체 · 열 제외) · runs · pick · shadowcol · darkest
python3 -m py_compile "$TOOLS/bandrows.py" && python3 "$TOOLS/bandrows.py" selftest # 합성 7건 — 옅어지는 띠(행 · 기울기 · 값) · 안 그려진 띠 · x 범위 · 캡처 밖 범위
python3 -m py_compile "$TOOLS/badge.py" && python3 "$TOOLS/badge.py" selftest       # 합성 8건 — 온전 · 상태바 밑 · 없음 · 테두리 · 틀림색 둘 · 좁은 초록 · 잘못된 색
```

**기대**: 마지막 줄이 `selftest PASS`, 종료 코드 0. 저장 캡처가 있으면(작업 폴더의 `artifacts/spike/` · `hide-scrollbars`의 `artifacts/e2e-r02/` — git에 없다) 다음도 확인한다:

```sh
SPIKE="<작업 폴더>/artifacts/spike"; HIDE="<hide-scrollbars 작업 폴더>/artifacts/e2e-r02"      # 저장소 밖의 하네스 작업 폴더(.agent-harness/work/…) — 절대 경로로 바꾼다
LSF() { python3 "$TOOLS/lsfont.py" "$@"; }
LSF choices "$SPIKE/sp-f2.2-drag-end.png"                 # 온전한 보기 2개 (수정 뒤 모습)
LSF choices "$HIDE/S8-drag-after-end.png"         # 온전한 0 · 위 테두리만 [2069] (수정 전 모습)
LSF shadowcol "$SPIKE/sp-f2.35-drag1.png" 1300             # 종료 코드 0 — [1, 4, 8, 12]
E2="<작업 폴더>/artifacts/e2e-2"                                    # 2회차의 캡처
python3 "$TOOLS/bandrows.py" "$E2/L0d-after-rest2.png" 2210 2250 10    # min 118 · 139 · 160 · 182 (띠가 카드 위 — 아래로 옅어진다)
python3 "$TOOLS/bandrows.py" "$E2/L0d-mid-rest2.png" 2210 2250 10      # min 29 · 29 · 29 · 29 (결함 번들 — 띠가 안 그려졌다)
python3 "$TOOLS/bandrows.py" "$E2/band-after-2.2-rest2.png" 2170 2210 10   # min 52 · 71 · 91 · 110
E3="<작업 폴더>/artifacts/e2e-3/cap"                                # 3회차의 캡처
python3 "$TOOLS/badge.py" "$E3/L10-after-2.35-b-3.png"     # badge y 1319-1483 h=165 (맨 위 · 온전)
python3 "$TOOLS/badge.py" "$E3/L10-before-2.35-b-3.png"    # badge y 701-804 h=104 (헤더에 잘림)
python3 "$TOOLS/badge.py" "$E3/L10-before-2.0-540-b-3.png" # none (화면 밖)
```
