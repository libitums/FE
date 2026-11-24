# 다시 듣기 스피커 — 시각 스펙 (ADR-0188 예정, `feat/replay-audio`)

- 이 문서가 정하는 것: 이야기 컷 화면과 레슨 판정 줄의 「다시 듣기」 단추 크기 · 아이콘 · 색 토큰 · 자리 ·
  상태 · 누름 반응. JSX · CSS 구현과 props 이름은 구현 · 스펙 에이전트 몫이다.
- 새 토큰 없음. 전부 `@libitums/design-tokens` 0.5.0의 `var(--libitum-*)`, 아이콘 색은 `current-color`에
  넘기는 TS 상수(`color.*`), 부품은 기존 `@libitums/ui-lynx/round-button`과 `AudioUnavailableControl`이다.
- 대비 숫자는 0.5.0 `dist/css/variables.css`의 값으로 WCAG 2.x 상대 휘도 공식으로 계산했다.

## 1. 공통 — 켜짐 / 꺼짐 짝

| 상태 | 부품 | 면 | 아이콘 | 접근성 |
|---|---|---|---|---|
| 켜짐(소리 있음) | `RoundButton` `variant="neutral"` | `--libitum-color-gray-100` | `@libitums/icons/lynx/volume`, `color.fg["neutral-subtle"]` | traits `button`, 이름 「Play again」 |
| 꺼짐(소리 없음) | `AudioUnavailableControl` | `--libitum-color-gray-100` + 덩어리 `--libitum-opacity-disabled` | `volume`, `color.fg.neutral` | traits `disabled`, 이름 `copy.audioUnavailable.label`(「Audio not available yet」), `bindtap` 없음, `data-state="unavailable"` |

- 아이콘은 `volume` 하나다(Wordbook `.wordbook-play`와 같은 그림). 「다시 듣기」라는 행동은 이름이 지고,
  `play` 삼각형은 「재생/일시정지」 원(듣기 XL)과 헷갈리므로 쓰지 않는다.
- **계약 확장 필요(스펙 에이전트):** `AudioUnavailableControl`은 지금 `play` 아이콘 · 44 면 고정이다.
  `icon?`(기본 `play` — Letters #573 그대로)과 `size?: "m" | "l"`(기본 `l` = 지금 값)을 더한다.
  `m`은 면 36 · 아이콘 18(RoundButton M과 같은 component 값, design-system GAP-RB-01로 토큰 없음).
- 꺼짐을 `RoundButton disabled`로 그리지 않는 이유: 그 꺼짐은 `gray-50` 면 위 `gray-500` 아이콘 35 %라
  아이콘 대비가 약 1.1:1로 거의 빈 원이다. `AudioUnavailableControl`의 덩어리 불투명도는 배경이 무엇이든
  면과 아이콘 사이 밝기 차(0.35 × (gray-100 − fg.neutral))가 남아 「회색 스피커」로 읽힌다(§4 숫자).
- 켜짐 ↔ 꺼짐은 같은 자리 · 같은 크기다. 컷이 바뀌어 상태가 바뀌어도 줄이 움직이지 않는다.
- 꺼짐도 늘 렌더한다(숨기지 않음, ADR-0016 D10 예외 원칙 그대로).

## 2. 이야기 컷 화면 (`CatalogCoverScreen`)

**자리: 대사 상자 위, 오른쪽 끝의 한 줄.** `.catalog-cover-screen-dialogue` 열에서 대사 상자
(`.catalog-cover-screen-line`)의 **앞 형제**로 줄 하나를 둔다.

- 줄: `display: flex; flex-direction: row; justify-content: flex-end; flex-shrink: 0`. 높이는 자식(48)이 정한다.
  줄과 상자 사이 간격은 열의 기존 `gap: var(--libitum-spacing-12)`를 그대로 쓴다(새 값 없음).
- 단추: `RoundButton size="l"` — 누르는 자리 `--libitum-spacing-48` 정사각, 면 44, 아이콘 20
  (`--libitum-icon-size-sm`). 꺼짐은 `AudioUnavailableControl size="l"`(면 44, 아이콘 24 — 기존 값).
  꺼짐 상자는 44라 줄 높이가 4 줄어들지 않게 꺼짐도 48 상자(투명) 안 가운데에 둔다.
- 오른쪽 끝 정렬: 면의 바깥 끝이 화면 끝에서 `layout-screen-padding-x`(16) + 2 안쪽 — 상자 끝(16)과 거의 맞는다.
- 단추 안 단추 금지: 스피커는 `catchtap={handleToggle}`이 걸린 `.catalog-cover-screen-line` **밖** 형제다.
  상자 안 오른쪽 위에 겹치는 안은 버렸다(토글 상자 안에 들어감 + 큰 글자에서 화자 이름을 덮음).

**Next 줄 왼쪽을 고르지 않은 근거 (320 폭 · 큰 글자):**

1. Next는 `Button size="xl" width="fill"`이다. 320 폭에서 글 폭 288 − 48 − 8 = 232로 줄어 큰 글자에서
   「다음 컷 n/m」 · 끝 단계 문구가 줄바꿈되거나 잘린다. 다른 화면의 꽉 찬 Next 리듬도 깨진다.
2. 엄지가 가장 자주 닿는 Next 바로 옆이면 「다시 듣기」를 누르려다 컷을 넘기는 실수가 생긴다 — 되돌릴 수 없는 행동 옆에 두지 않는다.
3. 상자 위 줄은 흐름 안이라 상자를 덮지 않는다. 상자 높이는 기존 `.catalog-cover-screen-scroll`
   `max-height: 40vh`가 그대로 묶으므로 큰 글자에서도 Next가 밀려나지 않고, 대가는 그림 영역 60(48 + 12)뿐이다.
4. 낭독 · 포커스 순서 = 보이는 순서(위 → 아래): 「Play again」 → 대사(토글) → Next (WCAG 2.4.3).

## 3. 레슨 판정 줄 (`LearningShellPrompt`)

판정 뒤 기다리는 화면(문장 조립 · 음절 조립)에서만 판정 배지와 함께 선다. 판정 전에는 없다.

- 자리: `.learning-shell-verdict` 안에서 **[배지][8][스피커]** 한 묶음을 가운데 정렬.
  간격 `--libitum-layout-gap-inline`(8). 배지는 묶음 폭의 절반(28)만큼 왼쪽으로 옮겨 앉는다 — 스피커가
  서는 화면에서는 늘(켜짐이든 꺼짐이든) 같은 자리라 같은 화면 안에서 튀지 않는다.
- 크기: `RoundButton size="m"` — 면 36(배지 36과 같은 높이), 아이콘 18, 누르는 자리 48(`--libitum-spacing-48`).
  꺼짐은 `AudioUnavailableControl size="m"`(면 36, §1 확장)을 48 투명 상자 가운데에.
  스피커는 `flex-shrink: 0`, 배지 쪽이 줄어든다.
- **줄 높이를 바꾸지 않는 방법:** 판정 층은 이미 `position: absolute; top: 0; bottom: 0`이라 흐름에서
  빠져 있다. 줄 높이는 지금처럼 가려진 지시문(하한 `spacing-32 + spacing-4` = 36)이 정한다. 48 누르는
  상자는 36 줄 위아래로 `--libitum-spacing-6`씩 넘친다 — 면(36)은 줄 안에 딱 맞고 넘치는 것은 투명 터치 띠뿐이다.
  - `.learning-shell-verdict`와 `.learning-shell-prompt`에 `overflow: visible`(Lynx 기본은 자름).
  - **기기 확인 필수:** 넘친 6 띠에서 탭이 iOS · Android 모두 단추로 가는지. 안 가면 대안은 줄 높이를
    키우는 것이 아니라 판정 층만 `top/bottom: calc(-1 * var(--libitum-spacing-6))`로 넓히고 그 층을
    가진 프롬프트도 `overflow: visible` — 그래도 안 되면 그 결과를 ADR에 적고 사용자 결정.
  - 위아래 이웃 조작(무대 카드, 칩)과 누르는 자리가 겹치지 않아야 한다 — 프롬프트와 무대 사이 기존 간격이 6 이상인지 구현이 확인.

## 4. 대비 (WCAG AA, 비텍스트 3:1)

| 쌍 | 값 | 판정 |
|---|---|---|
| 켜짐 아이콘 `fg.neutral-subtle` #868B94 / 면 `gray-100` #F7F8F9 | **3.22:1** | 통과 — 면이 불투명이라 컷 그림이 무엇이든 같다 |
| 켜짐 면 `gray-100` / 컷 바탕 `gray-950` #1A1C20 | 16.05:1 | 통과 (밝은 그림 위에서는 면 경계가 옅지만 1.4.11이 요구하는 식별 그림은 아이콘이고 3.22로 닫힘) |
| 꺼짐 합성(바탕 `gray-950`): 면 #67696C / 아이콘 #1A1C20 | 3.10:1 | 비활성은 1.4.11 예외, 참고값 |
| 꺼짐 합성(바탕 흰색): 면 #FCFDFD / 아이콘 #AFB0B1 | 2.13:1 | 〃 — 가장 밝은 그림 위 최저값 |
| 꺼짐 합성(바탕 중간 회색 #808080) | 2.84:1 | 〃 |

- 버린 안: `overlay` 변형(면 없이 흰 아이콘) — 흰 아이콘 / `gray-950`은 17.06:1이지만 밝은 그림 위에서는
  1:1까지 떨어져 보장이 없다. `brand` 변형 — 아이콘 `brand.primary` #F46B18 / `gray-100` = 2.84:1로 미달.
- 포커스 링: RoundButton 기본(안 `--libitum-color-white`, 바깥 `--libitum-color-border-strong`,
  `--libitum-stroke-width-strong`). 꺼짐은 포커스 순서에서 빠지고 링이 없다.

## 5. 상태 표

| 상태 | 시각 |
|---|---|
| default | §1 켜짐 |
| hover | 없음(터치 전용) |
| focus | §4 포커스 링 |
| active(누름) | RoundButton 기본: 면만 `scale(var(--libitum-motion-scale-pressed))`, `--libitum-motion-duration-pressed` · `--libitum-motion-easing-easing`. 누르는 자리 · 줄은 움직이지 않음 |
| 동작 줄이기 | RoundButton 기본: 축소 없음, 면 아래 검정 막 `--libitum-opacity-pressed-shade`. `MotionProvider`의 `useMotion()`을 그대로 받으면 됨 — 새 처리 없음 |
| disabled / empty(소리 없음) | §1 꺼짐. 누름 반응 없음 |
| loading | 쓰지 않는다(스피너 없음). 소리가 준비 중이어도 단추는 켜짐 모양, 재생 중 다시 누르면 처음부터 |
| error(재생 실패) | 시각 변화 없음 — 켜짐 유지(듣기 다시듣기 원과 같은 정책). 소리가 아예 없는 컷만 꺼짐 |

재생 중 표시(물결 · 색 바꿈)는 두지 않는다 — 새 토큰 없이 닫기 위해서이고, 필요하면 후속 결정.

## 6. 낱말 칩 소리 (단어 고르기 · 조립)

칩을 누르면 그 낱말 소리가 나지만 **시각 변화 없음**: 칩의 기존 선택 · 눌림 · 판정 모양을 그대로 두고,
스피커 아이콘 · 재생 중 표시를 칩에 더하지 않는다. 소리 없는 낱말도 칩 모양은 같다(꺼짐 표시 없음).

## 7. 가정 · 미해결

- 가정: 레슨 판정 줄 배경은 밝은 면(흰색 ~ `gray-50`) — 켜짐 대비는 면이 불투명해 배경과 무관하다.
- 미해결 1: §3 넘친 터치 띠의 Lynx 기기 확인(iOS · Android).
- 미해결 2: `AudioUnavailableControl` `l`의 아이콘 24는 켜짐 L의 20과 다르다(Letters #573부터 있던 차이).
  이번 기능에서는 바꾸지 않는다 — 맞추려면 Letters 화면도 함께 바뀌므로 별도 결정.
