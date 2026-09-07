# 문화 퀴즈 — 토큰·시각 스펙

- 대상: 문화 퀴즈 화면(객관식) + 그 보기 · 문화 학습 화면(`CultureScreen`)에 새로 들어오는 액션 행
- 이 문서가 지는 것: **시각 값과 그 근거**. 컴포넌트 구현(`.tsx`)·계약(props·테스트)은 지지 않는다
- 근거로 딛는 것: `docs/adr/0016` D3·D5·D10 · `0020` D5 · `0022` D1·D3·D4·D6 · `0023` D1~D3 ·
  `docs/conventions/code.md` · `docs/screens.md` 「문화 학습과 문화 퀴즈」 ·
  `@libitums/design-tokens` **0.2.0**

## 0. 이 화면은 새로 그리는 것이 아니라 **잇는** 것이다

보기 UI가 이미 둘 있고 **후자가 이미 전자를 잇고 있다.** 그 잇는 방식이 저장소의 표준이다.

| | `ListeningChoice` (LIB-223) | `WordChoiceOption` (LIB-229) |
|---|---|---|
| 공용 클래스로 뺐나 | — | **아니다** |
| 토큰을 새로 만들었나 | — | **아니다** |
| 실제로 한 것 | — | **짝 CSS 파일을 자기 폴더에 복제하고, 갈리는 선언 하나(`align-items`)와 그 이유를 주석에 남겼다** |

**⇒ 문화 퀴즈도 같은 방식이다.** 공용 `.choice` 블록을 만들지 않고, 짝 CSS를 콜로케이트한다.
근거는 `docs/conventions/code.md`가 **「블록 = CSS 파일명」**으로 고정한 것이다 — 공용 블록을 만드는
순간 블록 이름이 어느 컴포넌트와도 짝이 아니게 되고, 그것은 이 저장소에 선례가 0건이다.

**그리고 이번에는 갈리는 선언이 0개다.** `WordChoiceOption`이 듣기에서 갈린 자리
(`align-items: flex-start`)가 문화 퀴즈에도 그대로 필요하다 — 보기 텍스트가 여러 줄이 될 수 있다.
「무엇이 갈리나」의 답이 **「없다」**인 것이 이 문서의 결론 중 하나다(§4.1.1).

## 1. 새로 만드는 토큰 — **없음**

**0건이다.** 아래 §2의 목록이 전부 `@libitums/design-tokens` 0.2.0에 이미 있는 이름이고,
이 화면이 요구하는 시각 값 중 팔레트가 못 내는 것은 **하나도 새 문항이 아니다** —
`docs/adr/README.md` 보류 표 「여정 맵이 요청한 design-system 값 넷」이 이미 지고 있는
그 넷(스크림 · `brand-strong` 위 눌림 색 · 컴포넌트 치수 토큰 · 비활성 표면 이름) 안에 들어간다.
**행을 새로 열지 않는다** — 같은 결핍에 두 번째 행을 만들면 요청 목록이 갈린다.

이 화면에서 그 결핍이 실제로 무는 자리는 하나다: **보기·버튼의 눌림(pressed) 피드백이 없다**
(§4.1.3). 지어내지 않는다(ADR-0014 D4).

## 2. 재사용하는 토큰 — 전부 어디서 왔는지

값은 여기 옮겨 적지 않는다. **이 표는 이름의 목록이고 값의 출처는 패키지 하나다**(ADR-0014 D1).

### 2.1 색

| 토큰 | 쓰는 자리 | 같은 자리의 선례 |
|---|---|---|
| `--libitum-color-background-primary` | 화면 배경 · 보기 행 면 | `.word-choice-screen` · `.word-choice-option` |
| `--libitum-color-fg-neutral` | 제시문 · 보기 라벨 · 판정 낱말 · 완료 문구 · 화면 제목 | `.word-choice-option-label` 외 |
| `--libitum-color-fg-neutral-muted` | `맵으로` 라벨 · 진행 문구 · 지시문 | `.culture-screen-exit-label` · `.word-choice-screen-progress` |
| `--libitum-color-fg-neutral-inverted` | 액션 행 버튼 라벨 | `.word-choice-screen-next-label` |
| `--libitum-color-border-default` | 보기 경계선 · `-scroll`의 `border-top` | `.word-choice-option` · `.culture-screen-scroll` |
| `--libitum-color-brand-strong` | 선택된 보기 경계선 · 액션 행 버튼 면 | `.word-choice-option-selected` · `.step-sheet-start` |
| `color.feedback["correct-text"]` (TS 값) | 정답 표식 아이콘 `current-color` | `WordChoiceOption.tsx` |
| `color.feedback["incorrect-text"]` (TS 값) | 오답 표식 아이콘 `current-color` | 같음 |

마지막 둘만 CSS가 아니라 **TS 값으로 `<svg current-color>`에 넘긴다.** Lynx `<svg>`가 CSS `color`를
읽지 않기 때문이고, **이것이 저장소가 인정한 유일한 예외다**(ADR-0014 D2 ·
`docs/conventions/code.md` — *"이 예외를 선례로 쓰지 않는다"*). 이 화면은 예외를 **넓히지 않고
그대로 재사용한다** — 아이콘 색 두 자리뿐이다.

### 2.2 간격 · 치수 · 선

`--libitum-layout-screen-padding-top` · `-x` · `-bottom` · `--libitum-layout-gap-block` ·
`--libitum-layout-gap-inline` · `--libitum-spacing-4` · `-8` · `-12` · `-16` · `-48` ·
`--libitum-radius-md` · `--libitum-stroke-width-thin` · `--libitum-icon-size-md`.

`spacing-48`은 **치수 토큰이 아니라 간격 토큰을 히트박스 하한에 쓰는 것**이다. 저장소 선례 7건
(`-exit` 넷 · 주 버튼 다섯)과 같고, 옳아서가 아니라 **컴포넌트 치수 토큰이 팔레트에 없어서**다
(§1의 보류 표 행).

### 2.3 타이포

| scale | 쓰는 자리 |
|---|---|
| `heading-s` | 화면 제목 · 완료 문구 |
| `body-l` | **제시문** · 보기 라벨 |
| `body-m` | 지시문 |
| `label-m` | `맵으로` 라벨 · 진행 문구 · 판정 낱말 |
| `button-xl` | 액션 행 버튼 라벨 |

**제시문에서 `dialogue-body`가 아니라 `body-l`을 고른 것이 단어 선택과 갈리는 유일한 자리다.**

- **렌더 결과가 같다** — 0.2.0에서 두 scale은 네 값이 전부 같다(16 / 500 / 24 / 0px).
  **기본 배율에서도 최대 배율에서도 픽셀이 한 자리도 안 움직인다.**
- 갈리는 것은 뜻이다. `dialogue-body`는 **발화**의 scale이고(`.listening-prompt-text`),
  문화 퀴즈가 묻는 것은 발화가 아니라 **맥락**이다 — 짝이 되는 `.culture-screen-paragraph`가
  같은 이유로 `body-l`을 골랐고(*"이 화면이 그리는 것은 발화가 아니라 산문"*), 퀴즈는 그 서사를
  묻는 화면이다.
- **대가**: 패키지가 언젠가 두 scale을 갈라 놓으면 문화 퀴즈는 **단어 선택이 아니라 문화 학습을
  따라 움직인다.** 그것이 의도다.

## 3. 이름 (블록 · 요소 · 상태)

`docs/conventions/code.md`: 블록 = CSS 파일명, 하위는 `블록-요소` **한 겹**, 상태는 예약 목록에서만.

| 파일 | 블록 |
|---|---|
| `apps/mobile/src/screens/culture-quiz/culture-quiz-screen.css` | `culture-quiz-screen` |
| `apps/mobile/src/screens/culture-quiz/culture-quiz-option.css` | `culture-quiz-option` |
| (기존) `apps/mobile/src/screens/culture/culture-screen.css` | `culture-screen` — 액션 행 요소가 **추가**된다 |

> **⚠ 이 이름들은 계약이 진다.** 폴더가 `screens/culture-quiz/`인지 `screens/culture/`인지,
> 블록이 `culture-quiz-*`인지는 계약 에이전트의 몫이고 이 문서는 그 값을 **가정**했다(§9).
> 이름이 갈려도 **이 문서의 값은 한 줄도 안 바뀐다** — 갈리는 것은 셀렉터 문자열뿐이다.

**상태 클래스는 `-selected` 하나다.** 예약 상태어 넷(`selected`·`done`·`current`·`locked`) 중
하나이므로 ADR-0003 D7의 재검토 조건이 **발동하지 않는다.**
**판정(정답/오답)은 클래스가 되지 않는다** — 다섯째 상태어를 열지 않는다(§4.1.2).

## 4. 컴포넌트별 시각 스펙

### 4.1 보기 — `culture-quiz-option`

행 전체가 탭 대상이다. 표식이나 텍스트만 누르게 하지 않는다.

```
┌─────────────────────────────────────────────┐
│ [ 라벨 (flex: 1, 여러 줄 가능) ]  [표식]     │  ← padding 16, border 1, radius md
└─────────────────────────────────────────────┘
      gap: layout-gap-inline          표식 = 아이콘(icon-size-md) + gap spacing-4 + 낱말(label-m)
```

| 속성 | 토큰 |
|---|---|
| 면 | `color-background-primary` |
| 경계선 | `stroke-width-thin` solid `color-border-default` |
| 모서리 | `radius-md` |
| 안쪽 여백 | `spacing-16` (네 방향) |
| 라벨↔표식 간격 | `layout-gap-inline` |
| 라벨 | `body-l` + `color-fg-neutral`, `flex: 1` |
| 표식 아이콘 | `icon-size-md` 정사각 |
| 표식 낱말 | `label-m` + `color-fg-neutral` (**정답·오답이 같은 색**) |
| 교차축 | `align-items: flex-start` |
| 주축 | `flex-shrink: 0` (세로 열의 자식 — 줄면 글자가 사라진다) |

**행 면은 반드시 `background-primary`다.** `background-elevated`(#FFF3EA) 위에서는 판정색 후보가
비텍스트 3:1을 못 넘는다. 제시가 카드가 아니고 보기가 primary인 것은 위계가 아니라 **대비 제약**이다.

**`border-width`가 모든 상태에서 같다.** 굵기를 상태별로 바꾸면 행 높이가 갈리는데
`box-sizing` 기본값이 이 스택에서 확인된 적이 없다(`listening-choice.css:17-18`부터 열려 있는 축).

#### 4.1.1 상태 — `AnswerResult` 한 벌에 정확히 대응한다

**상태 어휘는 `apps/mobile/src/lib/answer-result.ts`의 `AnswerResult = "correct" | "incorrect"`와
`null`(판정 전) 셋이 전부다. 넷째를 만들지 않는다.**

| 상태 | 언제 | 클래스 | `data-result` | 경계선 | 표식 | 아이콘 | 아이콘 색 | 낱말 | 낭독 |
|---|---|---|---|---|---|---|---|---|---|
| **판정 전** | `result === null` | base | `"none"` | `border-default` | **렌더 안 함** | — | — | — | 라벨만 |
| **정답** | `result === "correct"` | base + `-selected` | `"correct"` | `brand-strong` | 있음 | `tick` | `feedback.correct-text` | `정답` | `라벨, 정답` |
| **오답** | `result === "incorrect"` | base + `-selected` | `"incorrect"` | `brand-strong` | 있음 | `cross` | `feedback.incorrect-text` | `오답` | `라벨, 오답` |

- **고르지 않은 보기는 응답 뒤에도 「판정 전」과 시각이 같다.** 정답을 알려 주지 않는다
  (`WordChoiceScreen`이 이미 그렇게 서 있다 — 판정을 지는 보기는 고른 하나뿐이다).
- **낱말 색을 정답/오답으로 가르지 않는다.** 두 후보의 상호 대비가 **1.02:1**이라 회색조에서 문자
  그대로 같은 색이고, 가르면 상태 클래스가 하나 더 필요해진다.
- **낭독 접미사는 ADR-0016 D3의 라벨 접미사 그대로다** — `accessibility-value`를 쓰지 않는다.
  낱말은 `answerResultLabel()` 하나가 낸다. **새 어휘를 열지 않는다.**

#### 4.1.2 판정이 **색만으로** 전달되지 않는다 — 채널이 넷이다

`feedback-correct-text` ↔ `feedback-incorrect-text`는 상호 대비 **1.02:1**, 회색조 **89 ↔ 90**이다.
**색 하나로는 두 판정이 구별되지 않는다**(WCAG 1.4.1 · 2026-09 측정, 0.2.0 그대로).

1. **아이콘 모양** — `tick` / `cross` (TSX가 고르는 import)
2. **낱말** — `정답` / `오답` (아이콘이 크기를 못 받아 안 보여도 판정이 남는다.
   `docs/e2e/design-token-rendering.md`에 그 선례가 있다)
3. **낭독 라벨 접미사** — `, 정답` / `, 오답`
4. (색) — `-text` 변형. 보조 채널이지 판별 채널이 아니다

이 넷 중 **CSS가 지는 것은 하나도 없다.** 그래서 판정에 상태 클래스가 필요 없고,
예약 상태어를 다섯째로 열지 않는다(ADR-0003 D7).

#### 4.1.3 이 컴포넌트에 **없는** 상태와 그 이유

없는 것을 누락으로 읽으면 다음 사람이 아무 데나 만든다.

| 흔히 있는 상태 | 여기 | 왜 |
|---|---|---|
| hover | **없다** | 포인터가 없다 |
| focus | **없다 (CSS 채널)** | 포커스 링은 iOS VoiceOver가 그린다. `:focus`를 쓴 선례가 저장소에 0건이고 Lynx 지원이 확인된 적 없다 |
| active / pressed | **없다** | `brand-strong` 위의 눌림 색이 팔레트에 없다 — `brand-primary-pressed`가 `brand-strong`과 **문자 그대로 같은 값**이다. 지어내지 않는다(ADR-0014 D4 · 보류 표 행) |
| disabled | **없다** | 응답 뒤에도 보기는 눌린다(리듀서가 흡수). ADR-0016 D10의 `disabled`는 **영구히** 조작 불가한 것에만 준다 |
| loading | **없다** | 비동기가 0건이다 — 문항이 고정 데이터다 |
| error | **없다** | 화면 단위 실패는 `ErrorBoundary`가 진다 |
| empty | **화면이 진다** | §4.2.4 |
| 모션 / transition | **없다** | 토큰은 다 있다(`motion-duration-*` 11 · `-easing-*` 6). 막는 것은 토큰이 아니라 **마운트 시점에 transition이 도는지 확인된 적 없다**는 것 — 표식이 조건부 렌더라 판정 표시가 정확히 그 미확인 경로를 탄다. **여기서 그 축을 열지 않는다** |

> `<svg>`는 정지 그림이 아니라 애니메이션이 가능한 요소다. **판정 표식 아이콘에 애니메이션을
> 넣지 않는다** — 위 표의 마지막 행과 같은 이유이고, 넣으면 `prefers-reduced-motion` 대응 축이
> 함께 열리는데 그 축도 이 저장소에 0건이다.

### 4.2 화면 — `culture-quiz-screen`

ADR-0022 D1의 **3분할**이다. 열째 화면이 된다.

```
[고정] 머리      .culture-quiz-screen-header   (맵으로 + 제목)        flex-shrink: 0
[흐름] 내용      .culture-quiz-screen-scroll   (<scroll-view>)        flex: 1
                   └ .culture-quiz-screen-content  (직계 자식 하나)
                        진행 · 제시 · 지시문 · 보기 목록 · 완료 문구
[고정] 액션 행   .culture-quiz-screen-next / -finish                  flex-shrink: 0
```

#### 4.2.1 슬롯별 값

| 슬롯 | 값 | 선례 |
|---|---|---|
| 화면 상자 | column · `flex: 1` · `justify-content: flex-start` · `gap: layout-gap-block` · padding = `screen-padding-top`/`-x`/`-bottom` · 면 `background-primary` | `.word-choice-screen` |
| 머리 | row · `align-items: flex-start` · `gap: layout-gap-inline` · `flex-shrink: 0` | `.word-choice-screen-header` |
| `맵으로` | `min-height: spacing-48` · 좌우 `spacing-12` · `radius-md` · 가운데 정렬 · **`flex-shrink: 0`** | `.culture-screen-exit` |
| `맵으로` 라벨 | `label-m` + `fg-neutral-muted` | 같음 |
| 제목 | `heading-s` + `fg-neutral` · **`margin-top: spacing-12`** · `flex-shrink` 기본값 | `.culture-screen-title` |
| `-scroll` | `flex: 1` · `justify-content: flex-start` · `border-top: stroke-width-thin solid border-default` **뿐** | `.culture-screen-scroll` |
| `-content` | column · `justify-content: flex-start` · `gap: layout-gap-block` | `.culture-screen-content` |
| 진행 문구 | `label-m` + `fg-neutral-muted` | `.word-choice-screen-progress` |
| 제시문 | `body-l` + `fg-neutral` (§2.3) | `.culture-screen-paragraph` |
| 지시문 | `body-m` + `fg-neutral-muted` | `.word-choice-screen-instruction` |
| 보기 목록 | column · `justify-content: flex-start` · `gap: spacing-8` | `.word-choice-screen-options` |
| 완료 문구 | `heading-s` + `fg-neutral` | `.word-choice-screen-complete` |
| 액션 행 버튼 | 면 `brand-strong` · `min-height: spacing-48` · `radius-md` · `width: 100%` · 가운데 정렬 · `flex-shrink: 0` | `.word-choice-screen-next` |
| 버튼 라벨 | `button-xl` + `fg-neutral-inverted` | 같음 |

**제목의 `margin-top: spacing-12`는 토큰 이름이 아니라 산술 결과다** —
`(spacing-48 − heading-s-line-height) / 2 = (48 − 24) / 2 = 12`. `-exit`의 하한이나 제목의 scale이
바뀌면 **조용히 틀린다.** 그 문장을 CSS 주석에 남긴다(ADR-0023 D3 게이트 A의 안 (b) 요구).

**진행은 막대가 아니라 텍스트다.** 트랙에 쓸 색이 없고(`gray-300`이 배경 대비 1.13:1),
막대는 죽은 채널(`accessibility-value`)을 요구한다(ADR-0016 D3).
**보기 개수·문항 수가 모르는 값이라는 것도 같은 방향으로 민다** — 칸 나눈 막대는 총수를 알아야 한다.

#### 4.2.2 `-scroll`에 적지 **않는** 것

`display` · `flex-direction` · `gap` · `flex-shrink` · 배경 · 모서리 · 그림자 · padding.
`<scroll-view>`는 CSS와 무관하게 강제로 `linear`가 되고 linear 알고리즘에 그 어휘가 없어
**무동작으로 죽는다.** 무동작 선언이 의도처럼 읽히는 것이 이 저장소가 이미 한 번 문 병이다.
남는 선언은 `flex: 1`(부모가 읽는다) · `justify-content: flex-start` · `border-top`뿐이다.

#### 4.2.3 액션 행

| 시점 | 무엇이 서나 |
|---|---|
| 판정 전 | **아무것도 없다.** 빈 상자도 두지 않는다 |
| 판정 뒤 | `다음` (`-next`) |
| 완료 | `결과 보기` 또는 그에 준하는 출구 하나 (`-finish`) |

**영구 `disabled` 버튼을 두지 않는다** — 「다음」은 *아직* 불가이지 *영구히* 불가가 아니다
(ADR-0016 D10). 존재 자체가 상태이므로 속성을 또 붙이지 않는다.

> **완료 뒤 출구의 정체는 계약이 정한다.** `docs/screens.md`의 미정 표에 **「진행에 거는 방식」**이
> 아직 열려 있어 문화 퀴즈가 평가로 가는지 맵으로 돌아가는지가 정해지지 않았다.
> **시각은 어느 쪽이든 같다** — 라벨 문자열만 갈린다. 출구를 머리의 `맵으로` 하나로 두기로 하면
> `-finish` 블록을 **지운다**(§9).

**나가는 수단은 어느 시점에도 정확히 하나다**(ADR-0022 D1). 머리의 `맵으로`와 액션 행의
`다음`은 충돌하지 않는다 — 후자는 나아가는 수단이다. `-finish`가 서는 완료 시점에는 머리의
`맵으로`가 빠진다(`WordChoiceScreen`이 이미 그 형태다).

#### 4.2.4 빈 상태 = 문항 0개

문항이 0개면 첫 렌더가 곧 완료다 — 진행·제시·지시문·보기가 **전부 렌더되지 않고** 완료 문구와
출구만 선다. **별도의 빈 상태 화면을 만들지 않는다.** 이것은 §5의 「개수 무관」의 극단값(N=0)이지
다른 상태가 아니다.

### 4.3 `CultureScreen`에 들어오는 액션 행

**따른 선례: `.word-choice-screen-next` / `.listening-screen-next` / `.step-sheet-start` /
`.assessment-screen-exit`.** 네 자리의 값이 문자 그대로 같고, `assessment-screen.css`가
*"버튼이 하나뿐이라 보조 버튼 스타일을 정의하지 않는다"* 라고 이미 적어 뒀다.
**새로 그리지 않는다 — 다섯째로 같은 값을 쓴다.**

| 속성 | 토큰 |
|---|---|
| 면 | `color-brand-strong` |
| 높이 | `min-height: spacing-48` (**고정 아님**) |
| 모서리 | `radius-md` |
| 폭 | `width: 100%` |
| 배치 | `display: flex` · `align-items: center` · `justify-content: center` |
| 주축 | `flex-shrink: 0` |
| 라벨 | `button-xl` + `color-fg-neutral-inverted` |

- **`brand-primary`가 아니라 `brand-strong`이다.** 흰 라벨이 `brand-primary` 위에서 **3.02:1**로
  AA 미달이다. `brand-strong` 위에서는 **5.46:1**.
- 위치: `.culture-screen`의 **직계 셋째 자식**(머리 · `-scroll` · 액션 행). `-scroll` 안에 넣지
  않는다 — 넣으면 흐름과 함께 밀려 최대 배율에서 닿을 수 없게 된다(ADR-0022가 세워진 그 사고).
- 라벨 문자열과 `data-testid`의 역할 낱말은 계약이 정한다. **시각은 낱말과 무관하다.**

> **⚠ 이 액션 행이 들어오면 `culture-screen.css`의 머리 주석 두 문장이 거짓이 된다.**
> (1) *"세로 치수를 선언하는 자리는 `.culture-screen-exit` 하나"* → 둘이 된다.
> (2) *"`width: 100%`를 쓰는 자리도 없다 — 그 갈래는 액션 행의 것이었고 이 화면에는 액션 행이
> 없다"* → 정확히 그 갈래가 들어온다.
> **구현이 이 두 문장을 같은 커밋에서 고친다.** 값만 넣고 주석을 남기면 파일이 자기 자신에 대해
> 거짓을 말한다. 같은 이유로 **`docs/adr/0022` D1 표의 아홉째 행 주석**(*"이 화면에는 액션 행이
> 없다"*)과 **`docs/e2e/culture.md`의 「없는 것」 표**(액션 행 행)도 함께 갱신 대상이다 —
> 이 문서는 그 파일들을 고치지 않는다(범위 밖).

#### 4.3.1 대가 — 문화 학습의 흐름 가용이 **589 → 525로 준다**

액션 행이 들어오면 문화 학습은 2분할에서 **3분할**이 된다. iPhone 13 mini · 기본 배율:

| | 계산 | 흐름 가용 |
|---|---|---|
| 오늘 (2분할) | `654 − 48(머리) − 16(gap ×1)` | **589** (내부 588, `border-top` 1) |
| 액션 행 뒤 (3분할) | `654 − 48 − 16 − 16 − 48` | **525** (내부 524) |

**−64다** (액션 행 48 + `gap`이 한 번 더 드는 16). `body-l` 줄높이 24 기준 **약 2.7줄**이고,
서사가 그만큼 일찍 스크롤로 넘어간다. **결함이 아니다** — 넘치는 것은 스크롤이 받는다.
다만 **기본 배율에서 스크롤이 시작되는 임계가 24.5줄에서 21.8줄로 내려간다** ⟨산술⟩는 것을
서사 컨텐츠가 오는 날 아는 채로 재야 한다(`docs/adr/README.md` 「문화 서사 컨텐츠의 출처」).

## 5. 개수 무관 · 길이 무관을 무엇이 보장하는가

**이 절이 이 문서에서 가장 중요하다.** 보기 개수도 문항 수도 텍스트 길이도 정해지지 않았다.

### 5.1 보기 개수 (2개든 5개든 10개든)

1. **목록이 세로 flex column + `gap: spacing-8` 하나다.** 그리드도, `nth-child`도, 열 나눔도,
   개수에 따른 분기도 없다. 선언이 개수를 **읽지 않는다.**
2. **높이 상한이 없다.** 목록에도 행에도 `height`·`max-height`·`line-clamp`가 없다.
3. **넘치면 스크롤이 받는다.** 목록이 `<scroll-view>` 안에 있고 `contentSize`가 자식 프레임에서
   나오므로 N이 커지면 스크롤 거리가 길어질 뿐 **레이아웃이 깨지지 않는다**(ADR-0022 D4).
4. **행마다 `flex-shrink: 0`이다.** 이것이 없으면 N이 커질 때 행들이 눌려 글자가 사라진다 —
   Lynx flex는 웹의 자동 최소 크기를 만들지 않아 내용이 있어도 계속 줄어든다.
5. **행 사이 간격을 개수로 조절하지 않는다.** `gap`은 컨테이너에 하나이고, 줄이면 모든 행에
   동시에 걸린다.

**기본 배율에서 스크롤이 시작되는 임계** (mini, 흐름 가용 525, 행 58 · 간격 8):

```
N_max = floor((525 − 고정합 + 8) / 66)      고정합 = 진행 16 + 제시 24×줄수 + 지시문 20 + gap 16×3
```

| 제시문 줄 수 | 고정합 | **N_max** |
|---|---|---|
| 1줄 | 108 | **6** |
| 2줄 | 132 | **6** |
| 3줄 | 156 | **5** |

⟨산술⟩이다. **N이 이 수를 넘으면 스크롤이 시작될 뿐 아무것도 깨지지 않는다.**
이 표는 「최대 개수」가 아니라 **「기본 배율에서 한 화면에 들어가는 개수」**다 —
`docs/screens.md`가 *"보기 개수를 지어내지 않는다"* 로 닫아 둔 자리를 이 문서가 열지 않는다.

### 5.2 문항 수 (1개든 여러 개든)

- **한 번에 한 문항만 렌더된다** — 화면이 `questionIndex` 하나를 들고 그 문항만 그린다
  (`WordChoiceScreen`·`ListeningScreen`이 이미 그 형태). **문항 수가 레이아웃에 닿는 자리가
  진행 문구의 문자열 하나뿐이다.**
- 진행이 **텍스트**라 총수가 몇이든 같은 상자에 들어간다(막대였다면 총수로 칸을 나눠야 한다).
- 문항 1개: `다음`이 한 번 서고 곧 완료. 문항 0개: §4.2.4.
- **정답 보기의 위치·개수에 따른 시각 분기가 없다.** 판정을 지는 것은 고른 보기 하나뿐이다.

### 5.3 텍스트 길이 (한 줄이든 여러 줄이든)

- 보기 라벨이 `flex: 1`이고 `width`·`max-width`·`height`·`line-clamp`가 **전부 없다.**
  길어지면 줄바꿈으로 흘러 행이 세로로 자란다.
- **`align-items: flex-start`가 여러 줄에서 표식을 라벨 첫 줄 옆에 붙들어 둔다.**
  `center`면 표식이 행 세로 가운데로 내려간다.
- **표식이 `flex-shrink: 0`이라 라벨이 길어져도 눌리지 않는다.** 반대로 라벨은 기본
  `flex-shrink: 1`이라 줄어들어 흐른다 — ADR-0023 D2가 가른 그 정반대의 답 그대로다.
- **표식이 나타나면 라벨 폭이 줄어 판정 순간 줄바꿈이 생길 수 있다** (mini에서 309 → 247).
  그 행만 한 줄분 커진다. 시각 결함은 아니지만 **문구를 좁은 쪽 폭 기준으로 재는 것이
  계약(고정 데이터)의 몫**이다. 실기 관찰 항목으로 남긴다.
- 제시문·지시문·완료 문구에도 폭·높이·줄 제한이 없다.

## 6. 대비 — WCAG AA 판정 (`background-primary` #FFFDFC 기준, 0.2.0에서 재측정)

| 쌍 | 대비 | 기준 | 판정 |
|---|---|---|---|
| `fg-neutral` / 배경 (제시·라벨·낱말·제목) | **16.82:1** | 4.5 | ✅ |
| `fg-neutral-muted` / 배경 (`맵으로`·진행·지시문) | **6.53:1** | 4.5 | ✅ |
| `feedback-correct-text` / 배경 (정답 아이콘) | **6.90:1** | 3.0 (비텍스트) | ✅ |
| `feedback-incorrect-text` / 배경 (오답 아이콘) | **6.76:1** | 3.0 | ✅ |
| `border-default` / 배경 (보기 경계·hairline) | **3.80:1** | 3.0 | ✅ |
| `brand-strong` / 배경 (선택 경계·버튼 면) | **5.38:1** | 3.0 | ✅ |
| `fg-neutral-inverted` / `brand-strong` (버튼 라벨) | **5.46:1** | 4.5 | ✅ |

**AA를 못 넘어 쓰지 않은 것**(예외로 두지 않고 토큰 레벨에서 피했다):

| 쓸 뻔한 것 | 대비 | 대신 쓴 것 |
|---|---|---|
| `feedback-correct` `#35A66F` 아이콘 | **3.03:1** (배경) / **2.82:1** (elevated) — 경계값·미달 | `-text` 변형 (6.90) |
| `brand-primary` `#F46B18` 버튼 면 | 흰 라벨이 **3.02:1** | `brand-strong` (5.46) |
| `fg-neutral-subtle` `#868B94` 보조 텍스트 | **3.38:1** | `fg-neutral-muted` (6.53) |
| 판정을 면 색으로 칠하기 | `correct-surface`↔`incorrect-surface` **1.06:1** | §4.1.2의 채널 넷 |

**대비만으로 안 닫히는 자리 하나**: 정답/오답은 **어떤 색쌍으로도** 회색조에서 갈리지 않는다.
그래서 §4.1.2가 색을 판별 채널에서 뺐다. **이것은 예외가 아니라 설계다.**

## 7. ADR 셋에 대한 부합 근거

### 7.1 ADR-0020 D5 — 고정 높이는 하한이다

- **텍스트를 품은 상자에 `height` 선언이 0개다.** 세로 치수를 적는 자리는 `-exit`와 액션 행 버튼
  둘뿐이고 **둘 다 `min-height: spacing-48`**이다. 보기 행·제시·지시문·완료 문구는 세로 치수를
  **아예 적지 않는다** — 내용이 정한다.
- **예외는 표식 아이콘 하나**(`width`/`height` 둘 다 `icon-size-md` 고정)다. 규약 위반이 아니다 —
  안에 `<svg>`만 있어 **배율을 받는 자식이 없는** 상자이고, 한 축만 하한으로 바꾸면 최대 배율에서
  알약이 된다. 두 축을 함께 고정으로 둔다(`.word-choice-option-mark-icon`과 같다).
- 배율을 받는 것은 `font-size`·`line-height` 둘뿐이다. `padding`·`gap`·`min-height`·
  `border-width`·`icon-size-*`는 안 받는다. **그래서 최대 배율에서 상자는 그대로인데 글자만
  커지고, 하한 상자는 글자를 따라 자란다.**
- **가로도 같은 규약이다**(ADR-0022 D6): `width`·`max-width`가 텍스트를 품은 상자에 0건.
  `width: 100%`은 액션 행 버튼 하나이고 그것은 **채움**이지 치수가 아니다.
- ⚠ **가로를 하한(`min-width`)으로 바꾸는 자리를 만들지 않았다.** 만들면 사용 폭이 `auto`가 되어
  교차축 stretch가 깨어나고 `align-self` 짝 선언이 함께 필요해진다(`.step-sheet-close`가 그 빚을
  지고 있다). 이 화면에는 그 형태가 없다.

### 7.2 ADR-0022 — 스크롤 규약

- 화면 루트가 **3분할**이다: `[고정] 머리 · [흐름] -scroll · [고정] 액션 행`(D1).
  액션 행이 없는 시점에는 **빈 상자도 두지 않는다.**
- 이름이 **`<블록>-scroll`**이고 클래스와 `data-testid`가 같은 문자열이다(D2).
- **가림 속성을 스크롤 상자에 붙이지 않는다**(D5). `accessibility-elements-hidden`은 **금지**이고,
  이 스펙은 그 상자에 `accessibility-*`를 **하나도** 두지 않는다 — 조작 단위가 아니라 상자다.
- 적는 프롭은 **둘**(`scroll-orientation="vertical"` · `scroll-bar-enable={true}`), 안 적는 것도
  **둘**(`enable-scroll` · **`bounces`** — 후자는 초기값이 **참**인 것이 2026-09-04 실기로
  확인됐다. 다시 적지 않는다)(D3).
- **스크롤 상자의 직계 자식은 하나**(`-content`)이고 flex 어휘와 `gap`은 전부 그 자식이 진다(D4).
  남는 세로를 받는 것도 `-scroll` 하나다 — 안쪽에 `flex: 1`을 남기지 않는다.
- 겹침 레이어가 없다 — `position: relative`를 두지 않는다.

### 7.3 ADR-0023 — 배율 불일치가 flex 상자에 만드는 결함

이 스펙에 배율 불일치 상자가 **셋**이다. 축을 먼저 보고 답을 골랐다(D1).

| 상자 | 축 | 규칙 | 답 | 근거 |
|---|---|---|---|---|
| 머리 (`맵으로` 48 + 제목 24) | **교차축** | D3 | `align-items: flex-start` + 제목 `margin-top: 12` | 게이트 A **Δ=12로 통과 못 함 → 안 (b)로 되갚는다.** `(48−24)/2 = 12`. 게이트 B는 통과(정지 둘: `맵으로`·제목) |
| 보기 행 (라벨 24 + 표식 24) | **교차축** | D3 | `align-items: flex-start` | 게이트 A **Δ=0 → 공짜.** 표식의 교차 크기는 `max(icon-size-md 24, label-m-line-height 16) = 24`. 게이트 B는 **이득 0**(행이 `accessibility-element`이고 표식 래퍼가 가림) — 그래도 건다: 근거는 **시각 순서**(여러 줄에서 표식이 가운데로 내려가지 않는다)와 `.word-choice-option`과의 **어휘 일관성**. D3이 이 갈래를 명시적으로 허용한다 |
| 화면 열 (머리 48 · `-scroll` flex:1 · 액션 48) | **주축** | D2 | 머리·액션 행 `flex-shrink: 0`, 텍스트 제목은 **주지 않는다** | 히트박스는 눌리면 터치 영역이 깨지고(2.5.5/2.5.8) 줄바꿈이 구해 주지 않는다. **가로 행의 제목에 `flex-shrink: 0`을 주면 최대 배율에서 잘린다** — 정반대 방향이다 |

- 보기 행 자체는 세로 열의 자식으로서 **`flex-shrink: 0`**을 받는다(D2 — 세로로 줄면 줄이 잘리고
  내용이 사라진다).
- ⚠ **`align-items: flex-start`는 이 저장소에서 실기로 확인된 적이 없다.** 규칙 3 전체가 Pod 소스
  판독(`flex_layout_algorithm.cc:653-709`의 `// do nothing`) 위에 서 있다 ⟨추정⟩.
  **이 문서는 그 미확인을 물려받는다** — 새로 지지 않고, 지우지도 않는다.

## 8. 시각 자가 점검을 **하지 않은** 이유

렌더 프리뷰(Storybook / Playwright)로 확인하지 않았다. 확인할 수 있는 것과 없는 것이 갈린다.

- **Lynx 렌더를 브라우저가 재현하지 않는다.** `<scroll-view>` 안이 flex가 아니라 linear이고
  `gap`·`flex-shrink`가 무시되는 것, 교차축 기본값이 `stretch`인 것, `justify-content` 기본값이
  `stretch`인 것 — 브라우저는 이 넷을 전부 다르게 그린다. **통과하는 그림이 나와도 근거가 안 된다.**
- **jsdom UI 테스트는 CSS를 적용하지 않는다.** `docs/conventions/code.md`가 *"렌더 결과에는 클래스
  이름만 남는다. 색·간격·정렬은 `docs/e2e/`의 수동 확인 몫"*으로 이미 닫아 뒀다.
- **그래서 이 문서가 낸 것은 산술이다** — §4.3.1과 §5.1의 수치는 토큰 값에서 직접 계산했고
  ⟨산술⟩ 표시를 붙였다. 픽셀 판정은 실기가 진다.
- **대비만은 계산으로 닫힌다** — §6은 sRGB 상대휘도 계산이라 렌더와 무관하게 확정이다.

## 9. 가정과 미해결 질문

**가정 (계약이 뒤집으면 이 문서의 셀렉터만 바뀐다 — 값은 안 바뀐다)**

1. 폴더 `apps/mobile/src/screens/culture-quiz/`, 블록 `culture-quiz-screen` · `culture-quiz-option`,
   컴포넌트 `CultureQuizScreen` · `CultureQuizOption`.
2. 화면이 **한 번에 한 문항**을 그린다(`WordChoiceScreen`과 같은 형태).
3. 보기를 누르는 즉시 판정이 난다 — **별도의 `확인` 버튼이 없다.** 액션 행은 판정 뒤에 선다.
4. 문화 학습의 액션 행은 **주 버튼 하나**이고 문화 퀴즈로 나아간다.

**미해결 (지어내지 않았다)**

| 무엇 | 왜 못 정하나 | 갈 곳 |
|---|---|---|
| 완료 뒤 출구의 정체 (`결과 보기` vs `맵으로`) | **「진행에 거는 방식」이 미정이다** — 문화 퀴즈가 진행을 갱신하는지가 정해지지 않았다. 시각은 어느 쪽이든 같다(§4.2.3) | `docs/screens.md` 미정 표 |
| 보기 개수 · 문항 수 · 텍스트 길이 | 컨텐츠다. **그래서 §5가 개수·길이에 무관한 스펙을 냈다** | 보류 표 「문화 서사 컨텐츠의 출처」 |
| 퀴즈가 서사를 화면에 다시 보여 주는가 | 제시 채널의 개수 문제다. 보여 준다면 제시문 위에 `body-l` 블록이 하나 늘 뿐 값은 안 바뀐다 | 계약 |
| 눌림(pressed) 피드백 | `brand-strong` 위의 눌림 색이 팔레트에 없다 | 보류 표 「여정 맵이 요청한 design-system 값 넷」 (기존 행 — **새 행을 열지 않았다**) |
| 판정 표식의 등장 모션 | 마운트 시점 transition 동작이 미확인이다 | 확인 못 한 CSS 축 |
| `culture-screen.css` 머리 주석 · ADR-0022 D1 표 · `docs/e2e/culture.md` 갱신 | 액션 행이 들어오면 셋 다 거짓이 된다. **이 문서의 범위 밖이다** | 구현 이슈 (§4.3) |
