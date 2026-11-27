# ADR-0212: 답하면 흰 카드가 펼쳐진다 — 공용 `RevealOnAnswer` · 잰 높이까지 전환 · 토큰 시간 · 측정 실패와 저사양은 A안

- 상태: **채택 — PR `feat/answer-card-expand`**.
- 날짜: 2026-11-27
- **사용자 결정(2026-11-27)**: 시안 「Listening card expand」(Artifact `EvHvbkvCN2NGixPX5wc63X`)의 A · B · C 가운데 **C안**(높이 + 글이 차례로)으로 「진행」.
- 이어받는 결정: [ADR-0053](0053-motion-policy.md)(모션은 토큰만 · reduced 규칙 · `lint:motion`) · [ADR-0016](0016-assistive-technology-semantics.md)(대본은 CSS로 숨기지 않고 렌더를 거름) ·
  [ADR-0018](0018-lynx-performance-analysis-boundary.md)(성능 기록).

## 맥락

- 듣기 문항은 답하면 카드에 구분선 · 한글 · 로마자가 한 번에 붙어 카드가 툭 커지고, 아래 보기가 한 번에 밀린다. 아래에서 올라오는 해설 판과 겹쳐 눈이 어디를 봐야 할지 놓친다.
- 시안 C안: 카드 높이가 280 ms ease-out으로 늘고, 120 ms부터 60 ms 간격으로 구분선 · 한글 · 로마자가 각각 200 ms 동안 6px 떠오르며 진해진다. 보기는 같은 동안 흐름대로 밀린다.
- Lynx는 `height: auto`로 전환하지 못한다.

## 결정

### D1. 공용 상자 `RevealOnAnswer` — 적용 범위

`apps/mobile/src/components/RevealOnAnswer.tsx`(+ 순수 함수 `reveal-on-answer.ts`, 짝 CSS). `shown`이 false면 아무것도 그리지 않는다(렌더를 거르는 규칙 그대로).
안의 글은 `RevealOnAnswer.Item order={n}`으로 차례를 받는다.

「답하면 흰 카드에 정답 · 대본이 붙어 카드가 커지는」 자리를 찾아 넷에 적용했다.

| 화면 | 붙는 것 | 적용 |
| --- | --- | --- |
| 듣기(`ListeningPrompt`) | 구분선 · 한글 · 로마자(3) | 적용 |
| 타자 입력(`TypingActivity`) | 정답 상자 `AnswerReveal`(1) | 적용 |
| 음절 조립(`SyllableBuildActivity`) | 정답 상자(1) | 적용 |
| 짝 맞추기(`PairMatchActivity`) | 틀린 짝 정답 상자(1) | 적용 |
| 문장 순서 듣고 조립(`SentenceOrderListenReveal`) | 정답 상자 · 로마자 · 뜻 | **버림** — 줄 배치는 무대가 `bare`라 흰 카드가 아니다 |
| 단어 선택 문화 확인(`CultureCheckScene`) | 내 말풍선 | **버림** — 그림이 걷히며 카드가 줄고 늘어 모양이 다르고, 말풍선에 이미 등장 모션이 있다 |
| 단어 선택 빈칸 · 그림 | 로마자 교체 · 이름표 | **버림** — 카드 높이가 바뀌지 않는다 |
| 최종 테스트(`CatalogFinalScreen`) | 정답 상자 | **버림** — 어두운 판이고 해설 판이 없다 |
| 말하기 · 소리 내 읽기 | 결과 시트 | **버림** — 정답이 카드가 아니라 시트에 선다 |

해설 판(`LearningShellFeedbackPanel`)은 바꾸지 않는다 — 같은 순간에 시작할 뿐이다.

### D2. 시간은 가장 가까운 토큰 — `calc()`를 쓰지 않는다

처음에는 시안 값을 토큰 배수(`calc(d2 * 2.8)` 등)로 적었으나 **Lynx는 `transition` 시간 · 지연의 `calc()`를 0으로 읽었다**(iOS 시뮬레이터 녹화 — 높이가 한 프레임에 섰고, 같은 자리를 토큰 하나로 바꾸자 여러 프레임에 걸쳐 늘었다).
그래서 토큰 하나씩으로 옮겼다.

| 시안 | 적용 | 토큰 |
| --- | --- | --- |
| 높이 280 ms ease-out | 300 ms | `d6` · `enter` |
| 첫 글 120 ms, 간격 60 ms | 100 · 150 · 200 · 250 ms | `d2` · `d3` · `d4` · `d5` |
| 글 하나 200 ms, 6px | 200 ms, 6px | `d4` · `enter`, `spacing-6` |

`reveal-on-answer.css.unit.test.ts`가 전환 선언에 `calc(`가 없음을 지킨다. ⚠ `ranking-motion.css`의 `animation-delay: calc(...)`도 같은 이유로 기기에서 0일 수 있다 — 이 PR에서는 고치지 않았다(후속).

### D3. 높이 재기 — 넉넉한 틀 안에서 한 번, 펼치는 동안 고정, 끝나면 auto

단계: 닫힘 → **재는 중** → **펼침** → 열림(높이 auto). 측정은 안쪽 글 칸의 `bindlayoutchange` 한 번이다.

기기에서 본 Lynx 레이아웃의 두 성질 때문에 틀(frame)을 하나 더 둔다.

1. 높이가 내용보다 작은 상자 안의 흐름 자식은 그 높이로 줄어든다 — 높이 0 상자 안의 글 칸은 `flex-shrink: 0`이어도 0으로 재어졌다.
2. `position: absolute` 상자의 높이 auto는 내용이 아니라 부모 높이를 따른다.

그래서 재는 중에는 틀을 `absolute` + 넉넉한 높이(2000px)로 띄워 글 칸이 제 높이로 서게 하고(시뮬레이터에서 약 10 ms 뒤 답), 펼치는 중에는 틀을 잰 높이로 고정해 글이 눌리지 않게 하며
바깥 상자만 0 → 잰 높이로 전환한다(`overflow: hidden`). 끝나면(높이 전환과 마지막 글 중 늦은 쪽 — 듣기 400 ms) 높이 지정을 풀어 글꼴 크기 변경 · 회전에 따라간다.

- 0 · 숫자 아닌 답은 「아직 자리가 안 잡힘」으로 보고 다음 답을 기다린다. **100 ms(`d2`) 안에 쓸 만한 높이가 오지 않으면 A안**(높이는 바로, 글만 차례로)으로 물러선다.
- **대본을 켜 둔 세션 · 처음부터 보이는 화면은 움직이지 않는다**(처음 상태가 열림).
- **움직임 줄이기**(`useMotion() === "reduced"`)는 바로 열림 — 높이 지정 · 대기 모양 · 타이머 없음.
- 다음 문항으로 넘어가면(숨김) 상자가 걷히고, 단계마다 하나인 타이머는 effect 정리에서 `clearTimeout`(인자 1개, 화살표 안)으로 풀린다.

### D4. main-thread script를 쓰지 않는다

움직임은 전부 CSS 전환이라 매 프레임 스크립트가 돌지 않는다. 배경 스레드는 단계가 바뀔 때만(재는 중 · 펼침 · 열림, 문항당 세 번) 렌더한다.
새 모듈은 `@libitums/ui-lynx/motion` · `@libitums/design-tokens`만 값으로 부르며 둘 다 이미 렌더 경로에 있다 — `pnpm build` 통과.

### D5. 저사양에서 C안을 기본으로 둔다

AVD `R6_API30`(2 GB) `assembleBundled`: 실제 듣기 화면의 정답 한 번은 C안 끊김 0(3/3), 카드만 20번 되풀이하면 프레임 약 17 %가 18 ms 안팎(예산 +1~2 ms), Missed Vsync 0.
A안은 되풀이에서 0 %. 실화면에서 끊김이 없어 C안을 기본으로 두고, 실기기에서 끊기면 A안으로 내린다 — [성능 기록](../performance/reports/answer-card-expand-android-r6-api30-01.md).

## 대가

- 시안의 280 · 120 · 60 ms와 다르다(300 · 100 · 50 ms) — 토큰 밖 리터럴을 allowlist로 두는 대신 토큰을 골랐다.
- 재는 중에 넉넉한 틀(2000px)이 카드 안에 한 프레임 떠 있다(투명 · 잘림). 2000px보다 긴 내용은 잘린 높이까지 펼친 뒤 auto로 풀릴 때 나머지가 선다.
- 높이 전환 동안 매 프레임 레이아웃이 다시 돈다(D5).

## 검증

- unit: `reveal-on-answer.unit.test.ts`(단계 · 시간표 · 클래스 · 틀) · `reveal-on-answer.css.unit.test.ts`(calc 없음 · 토큰).
- ui: `RevealOnAnswer.ui.test.tsx`(닫힘 · 처음부터 열림 · 재는 중 → 펼침 → 열림 · 시간 초과 A안 · 0 답 · 줄이기 · 숨김 때 타이머 정리 · 다시 답함) · 화면별 `*.expand.ui.test.tsx` 넷.
- integration: `App.answer-card-expand.integration.test.tsx`(앱 트리에서 듣기 답 → 펼침 → auto, 호스트 `reducedMotion` → 바로 열림).
- 기기: iOS 시뮬레이터 iPhone 17 Pro · Android `R6_API30` `assembleBundled` 연속 캡처(표준 · 줄이기) — `docs/e2e/evidence/*answer-card-expand*`.
