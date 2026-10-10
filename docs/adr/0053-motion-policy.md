# ADR-0053 — 모션 정책: 토큰만 쓰고, reduced는 호스트에서 Context로 흐르며, 등장만 있는 전환과 한 번뿐인 보상을 둔다

- 상태: **채택.** 네 단계(1단계 reduced 전달 · 2단계 토큰 소비 · 3단계 보상과 문항 전환 · 4단계 scale `var()` · lint 확장 · 진행 바 · 카탈로그)에 걸쳐
  [ADR-0025](0025-ui-lynx-package-and-storybook-catalog.md)의 확장 소절 셋 · [ADR-0044](0044-android-tappable-inset.md) D1 후속 확장 · [ADR-0006](0006-command-interface-and-test-layers.md) 명령표에
  흩어져 있던 결정을 **한 축으로 모은 것**이다. 새로 정한 것은 4단계의 넷(D1의 scale · inline style 규칙, D5의 진행 바, D3의 카탈로그 방식, D7의 가림 선언 정리)이고
  나머지는 그 자리의 결정을 **옮겨 적은 것**이라 뒤집힌 결정은 없다.
  ✔ **4단계 기기 회귀(iOS · Android)는 2026-10-10에 끝났고 전부 기록과 같았다**(keyframe 게이트 두 플랫폼 통과) — 수치는 [`docs/e2e/motion-tokens.md`](../e2e/motion-tokens.md) · [`docs/e2e/motion-reward.md`](../e2e/motion-reward.md)의 「4단계 회차」 소절이 진다. 이 문서는 수치를 되풀이하지 않는다.
  ✔ **`@keyframes` 본문 안 `var()`는 iOS(탐색 · 회귀) · Android(회귀 M2-A2 · M3-A1) 모두 풀렸다**(D6) — fallback은 서지 않았다.
  ⚠ **보조기술은 어느 단계에서도 실기로 재지 않았다**(D7 — M3-I8 · M3-A7 (a)(b)(c) 미확인). 문항 전환 직후 초점 자리의 조건은 열려 있고 5단계 이월이다.
  ⚠ 진행 바 `width` 전환(D5)은 이 빌드의 유닛이 전부 문항 하나라 **기기에서 관찰한 적이 없다**. 안 그려지면 지금처럼 즉시 반영이고 회귀가 아니다.
  ⚠ **2026-10-11 정정 기록 1** — D3의 「Button · Card는 변형을 만들지 않는다」가 사용자 결정으로 뒤집혔다(Button 전 variant · interactive Card · OptionSelector 항목 · 앱의 문장 순서 bank 칩 ·
  롤플레이 카드에 95 % 눌림 축소, reduced는 막 또는 색만). D1의 scale `var()` 자리는 다섯 → 열. 결정 본문은 고치지 않았고 날짜 주와 정정 기록으로만 적었다.
- 날짜: 2026-10-10.
- 다루는 축: 앱 전체의 **모션 정책** — 값의 출처(토큰만), reduced의 전달 경로와 우선순위, reduced에서 걷는 것과 남는 것, 보상 모션의 횟수 · 퇴장, 전환의 꼴(등장만 · 입력 비차단 · 종료 방식 · 진행 바),
  scale 리터럴의 `var()` 전환, 정적 검사(`lint:motion`)의 범위, 모션이 보조기술에 닿는 자리, 모션과 무관한 무동작 가림 선언의 정리, 검증 계층, 카탈로그 노출.
  **다루지 않는 것**: 개별 컴포넌트의 시각 계약(design-system 정본 · `docs/design/*`), 호스트 모듈 배선의 세부(ADR-0044), 패키지 · 카탈로그 구조(ADR-0025), custom 화면 전환(5단계 — 「미확인 · 후속」).
- 이어받는 결정: [ADR-0025](0025-ui-lynx-package-and-storybook-catalog.md) 「2026-10-09 확장」 · 「2단계」 · 「3단계」(세 소절은 그대로 **적용 기록**으로 남고 이 문서가 결정을 진다),
  [ADR-0044](0044-android-tappable-inset.md) D1 「후속 확장 — `reducedMotion`」(호스트 키 계약), [ADR-0016](0016-assistive-technology-semantics.md) D5(가림 선언의 세터 사실 · 장부) · D8(교체 뒤 초점),
  [ADR-0006](0006-command-interface-and-test-layers.md) D1(한 명령은 한 가지 이유로만 실패), [ADR-0014](0014-design-system-consumption-verified.md) D8(저장소를 훑는 검사의 꼴).
  **바꾸는 결정은 없다.** ADR-0025의 세 소절 본문은 고치지 않았다 — 날짜 주만 달았다.

근거 표시: **[정본]** design-system `foundations/motion.md` · `motion.json`(v0.4.0) · **[0.4.0]** 설치된 `@libitums/design-tokens@0.4.0` dist · **[코드]** 저장소 · 벤더된 Lynx Pod 소스 ·
**[Lynx]** 벤더된 Lynx 문서 · **[e2e]** 1 ~ 3단계 기기 관찰(`docs/e2e/motion-reduced.md` · `motion-tokens.md` · `motion-reward.md` 결과 표)과 4단계 iOS 탐색 · **[추론]** 관찰 없이 이어 붙인 것 · **[미확인]**.

## 맥락

1. **정본은 design-system `foundations/motion.md`와 `motion.json`이다** [정본]. 원칙 — 한 화면 한 번의 expressive, 전환 중 입력을 받는다, 진행 바 · Page Indicator는 `duration.progress`로 차오른다.
   Scale 절 「컴포넌트는 scale 값을 직접 쓰지 않고 의미 토큰을 쓴다」(`scale.pressed` 0.95 · `enter` 0.96 · `reward` 0.8). Reduced motion 표 — 이동 · 확대 · 회전 · 너비 · reveal은 즉시,
   색 · 불투명도 · Spinner는 유지. 검증 「모든 전환이 `motion.*` 토큰을 쓰고 임의의 ms · bezier 값이 없는지」.
2. **네 단계가 한 축을 세 ADR에 나눠 적었다** [코드]. 1단계(`MotionProvider` · 호스트 키)는 ADR-0025 「2026-10-09 확장」과 ADR-0044 후속 확장, 2단계(0.4.0 소비 · Spinner · 눌림 막 · `lint:motion`)는
   ADR-0025 「2단계」, 3단계(보상 · 문항 전환 · custom 전환 0)는 ADR-0025 「3단계」에 있다 — 약 255줄의 「확장」 소절이다. ADR-0025의 축은 「공유 ReactLynx 패키지와 브라우저 카탈로그」이고
   모션 정책은 그 축이 덮지 않는 **앱 전체 축**이다. README 규칙 「없던 축을 처음 정하면 … 기존 ADR의 다루는 축이 덮지 않으면 새 번호」가 이 번호의 근거다. 1단계 범위 밖 기록이 「새 ADR」을
   예고했고 3단계 리뷰가 「번호 여부」를 4단계로 넘겼다.
3. **`transform` 안 `var()`는 두 플랫폼에서 풀린다** [e2e]. 일반 규칙에서 — iOS M2-I8(눌림 165 → 157 px) · Android M3-A8(56 → 52 px, 번들 안 `scale( {{--libitum-motion-scale-pressed}})`) ·
   M3-A3 (b)(`translateX(var())` x 오프셋 +8 ~ +1). 2단계 D1 · 3단계의 「전환 조건」이 충족됐다. **`@keyframes` 본문 안**의 `var()`는 저장소 · Lynx 문서 어디에도 기기 기록이 없었다 —
   4단계 구현 전 iOS 탐색이 Dialog enter(첫 프레임 카드 하단 1678 = 2단계 리터럴 기록) · 배지(첫 프레임 86.2 % = 3단계 리터럴 기록) 둘 다 **풀림**을 봤다. Android는 미실행.
4. **이 빌드의 유닛은 전부 문항이 하나다** [코드]. `fillPercent = (questionIndex + 1) / questionCount × 100`이라 진행 바 채움은 마운트부터 100 %이고 폭이 바뀌지 않는다 — 진행 바 전환은
   기기에서 관찰할 수 없다. 문항 전환도 3단계부터 「문항 → 완료 장면」으로 근사하고 있다.
5. **가림 선언 장부와 코드가 어긋나 있었다** [코드]. ADR-0016 D5는 「잎에는 붙이지 않는다. 붙여도 아무 일도 하지 않는다」 · 「자손이 `<svg>` · `<view>`뿐인 래퍼에 붙이는 것은 잎에 붙이는 것과 같다」인데
   `LearningUnit.tsx`의 링 `<svg>`(잎)와 자손이 `<svg>` · `<view>`뿐인 래퍼 다섯(Button spinner-wrap · RoundButton loading · icon · LearningUnit surface · badge)에 선언이 남아 있었다.
   세터는 `view.accessibilityElementsHidden`(자손 가림, Pod 4.0.1 `ui/LynxUI.m` 2603 ~ 2606행)이고 `<view>` · `<svg>`는 `enableAccessibilityByDefault` NO라 여섯 자리 모두 무동작이다.
6. **Storybook은 Lynx Web 번들을 `<lynx-view>`에 띄우고 `args`를 `useInitData()`로 넘긴다** [코드]. 테스트는 node 환경 vitest가 `normalize*` 순수 결과 · `index.json` 스토리 id · 엔트리 소스
   텍스트를 본다 — 브라우저 · 툴바 · 전역 상태는 보지 않는다. reduced 변형이 있는 컴포넌트 열 가운데 넷(Dialog · Bottom Sheet · Overlay · Progress Header)만 `motion` arg + `ReducedMotion`
   스토리가 있었고 `MotionProvider`를 쓰는 엔트리는 0이었다. Button에는 reduced 변형이 없다(Spinner는 reduced에서도 돈다 — D3). *(2026-10-11 주: 이 문장은 쓰인 시점에 참이었다 —
   눌림 확장으로 Button · Card · Option Selector에도 `motion` arg · `ReducedMotion` 스토리가 생겼다. 정정 기록 1.)*
7. **ADR 번호 0043이 두 파일에 쓰였다**(`0043-android-system-back.md` · `0043-landing-static-site.md`) [코드]. README 규칙 「한 번 붙이면 재사용하지 않는다」와 어긋난다. 이 문서는 0052 다음
   번호 0053을 쓰고 중복은 고치지 않는다 — 사용자 결정 자리(「미확인 · 후속」 8).

## 결정

### D1. 모션 값은 토큰만 쓴다 — 시간 · easing · scale · `@media` · inline style까지, `lint:motion`이 다섯 규칙으로 막는다

- CSS `transition*` · `animation*` 선언의 시간 · easing은 `var(--libitum-motion-…)`만 쓴다. `@media (prefers-reduced-motion)`은 쓰지 않는다(Lynx가 미디어 특성을 지원하지 않아 픽셀을
  바꾸지 않는다 [Lynx] · [e2e]). *(2단계에서 정함 — ADR-0025 「2단계」 `lint:motion` 항목.)*
- **`transform`의 scale도 토큰이다**(4단계). `scale(0.95)` · `scale(0.96)` · `scale(0.8)` 다섯 자리(`round-button.css` · `learning-unit.css` `:active`, `dialog.css` enter from · exit to,
  `lesson-complete-screen.css` reward from)를 `scale(var(--libitum-motion-scale-pressed | enter | reward))`로 바꿨다 — D6. *(2026-10-11 주: 눌림 확장이 `button.css` · `card.css` ·
  `option-selector.css` · `sentence-order-chip.css` · `roleplay-card.css`의 `:active`에 같은 꼴 다섯 자리를 더해 **열 자리**다 — 정정 기록 1. 규칙 · allowlist는 그대로다.)*
  **항등값 `scale(1)`은 리터럴로 둔다**(「원상태」이지 토큰의 세 경우가
  아니다). **거울 반전 `scaleX(-1)`도 리터럴이다**(`card.css` RTL 화살표 — 토큰이 없는 방향 반전이지 크기가 아니다). 규칙의 항등 예외는 「숫자 인자의 절댓값이 전부 1」이다.
- **`.ts` · `.tsx`의 inline style도 같은 정책이다**(4단계). 객체 리터럴의 `transition*` · `animation*` 속성(camelCase · kebab 둘 다)의 **문자열 리터럴 값**과 JSX `style="…"` 문자열에
  CSS와 같은 값 검사를 건다. 식별자 · 호출 · 조건식 · 스프레드로 들어온 값과 `*.test.ts(x)` · `.d.ts`는 보지 않는다 — 변수에 담긴 리터럴은 객체 리터럴 속성으로 적힌 자리에서만 잡힌다.
  지금 저장소 위반 0(`style={{ }}`는 전부 `height` · `width` · `marginTop` 류). 서사 데이터의 `transition: "imagination"` 같은 동명 키는 값에 시간 · easing이 없어 위반이 아니다.
- **`lint:motion`(`devtools/motion-literals/`)의 규칙은 다섯이다** — `media-query` · `time-literal` · `easing-function` · `easing-keyword` · `scale-literal`. 세 뿌리(`apps/mobile/src` ·
  `packages/ui-lynx/src` · `apps/storybook-lynx/src`)의 `*.css` + `*.ts` + `*.tsx`를 본다. 값 검사(`valueViolations`)는 CSS · 소스 공용이고, 소스 스캔은 `ui-copy-literals`와 같은
  TypeScript AST 순수 스캐너(`ts`를 인자로 받는다, `apps/mobile`의 `typescript`를 `createRequire`로)다. 출력 형식 · allowlist 형식 · `package.json` scripts는 2단계 그대로. **한 명령은 모션
  리터럴 하나의 이유로만 실패한다**(ADR-0006 D1).
- **Content 예외는 allowlist 한 파일이다** — `episode-narrative/narrative-background.css`(서사 배경 연출, 비항등 scale 13줄 포함). 사유 문장은 allowlist 자체에 있고, 없는 파일 · 위반 0인
  항목은 실패다. `scale(0)` · `scale(1.2)` 같은 새 값은 allowlist 사유로만 들어온다(토큰 추가는 design-system 몫).
- 검증: unit은 숫자 대조 대신 **문자열 단언**(`scale(var(--libitum-motion-scale-pressed))`)과 **비항등 리터럴 0** 개수를 센다 — 토큰 값이 바뀌어도 CSS를 고칠 일이 없고 테스트는
  「토큰을 쓰는가」만 묻는다. 샌드박스 통합 테스트가 `.tsx`의 `style={{ transition: "opacity 150ms" }}` · `style="transition: …"`에서 exit 1, 토큰만 쓴 inline에서 exit 0을 고정한다.

### D2. reduced는 호스트가 boolean 하나로 보내고 앱 루트의 `MotionProvider`가 Context로 내린다 — 명시 prop > 컨텍스트 > `standard`

- 값의 출처는 호스트 globalProps `reducedMotion: boolean` 하나다(iOS · Android 각각, `globalPropsMode: "event"` — ADR-0044 D1 후속 확장). `apps/mobile`의 `App.tsx`가
  `motionFromReducedMotion(reducedMotionFrom(useGlobalProps()))`로 `MotionProvider`를 `AppSession` **밖**에 세운다 — 모션은 세션 key와 무관한 호스트 상태다.
- 타입은 `Motion = "standard" | "reduced"` 문자열 union이다(관찰 채널 `data-motion`이 문자열이고 뒤에 값이 셋 이상이 될 여지를 받는다). 컴포넌트는 `useMotion()`을 **조건 없이 한 번** 부른다.
  Provider 밖에서는 `"standard"`이고 던지지 않는다. `reducedMotion?: boolean` prop(VisualNovelDialog · ChatBubble · `useTypewriter`)과 `motion` prop(Dialog · BottomSheet · Overlay ·
  ProgressHeader)은 **override로만** 남는다 — 순수 `resolveMotion` · `resolveReducedMotion`이 규칙 하나를 진다.
- **standard의 DOM · 클래스 · CSS는 byte 단위로 전과 같다.** reduced일 때만 `<block>-motion-reduced` 클래스와 `data-motion="reduced"`를 낸다 — 구현은 **조건부 spread**다
  (`data-motion={cond ? "reduced" : undefined}`는 테스트 렌더러가 `"null"` 문자열을 남긴다). 넷(Dialog · BottomSheet · Overlay · ProgressHeader)은 전부터 `data-motion="standard"`를 늘 냈다 —
  받아들인 비대칭(ADR-0025 「2026-10-09 확장」).
- *(1단계에서 정함. 4단계가 더한 소비자는 `LearningSessionHeader` 하나 — D5.)*

### D3. reduced에서 걷는 것과 남는 것은 정본 표 그대로다 — Spinner는 예외, 눌림은 막, 변형이 없는 컴포넌트에는 변형을 만들지 않고, 카탈로그는 컴포넌트별 `ReducedMotion` 스토리로 보인다

- 이동 · 확대 · 회전 · 너비 · reveal은 즉시, 색 · 불투명도 전환은 유지(`d2` · `linear`). 문항 전환 · 배지 · Dialog · Bottom Sheet는 reduced에서 불투명도만, Page Indicator · Progress Header ·
  앱 진행 바(D5)는 너비 즉시, Settings Cell knob는 `transition: none`, Typewriter는 Instant.
- **Spinner 회전(Button · RoundButton)은 reduced에서도 유지한다** — 사용자가 시작한 요청의 유일한 진행 표시이고 완료로 끝난다(WCAG 2.2.2 essential 예외 · 정본 「진행 중임을 알리는 유일한
  수단」). 조건: 「Loading은 반드시 끝난다」 — 타임아웃 없는 요청 경로가 생기면 그 화면의 오류 처리 문제가 먼저다.
- **눌림 축소 대신 막**: RoundButton(Overlay 제외) · LearningUnit(`default` 제외)은 reduced에서 surface 첫 자식 `<block>-shade`로 `opacity.pressed-shade`(0.08) 막을 깐다 — 토큰만으로
  「black 8 %」를 만드는 CSS는 Lynx에서 자식 요소뿐이다(`rgba()`는 생값, `color-mix()` · `filter` · `::after` 미지원). 막 위 아이콘 대비(Neutral 2.693:1 등)는 design-system
  `foundations/accessibility.md`의 시각 예외 표 3행(PR #78)이 승인했다 — 2단계 Q2 닫힘.
- **Card · Tooltip · Button은 변형을 만들지 않는다** — 정본 매핑이 「유지」뿐이라 CSS 차이가 0인 변형은 관찰할 것이 없다. Button의 Spinner는 위 예외라 Button에는 reduced 경로 자체가 없다.
  *(2026-10-11 주: **뒤집혔다** — Button · Card에 눌림 축소가 생겨 reduced 변형이 생겼다. 막 목록에 Button neutral(white) · brand(black) · 롤플레이 카드(white)가 더해졌고 Tooltip만 변형이 없다.
  정정 기록 1.)*
- **카탈로그(Storybook)는 컴포넌트별 `motion` arg + `ReducedMotion` 스토리다**(4단계). 새 다섯(Round Button · Learning Unit · Page Indicator · Settings Cell · Chat Bubble)은 **컨텍스트 경로** —
  엔트리가 `<MotionProvider motion={data.motion}>`로 감싸고 컴포넌트에 prop을 주지 않는다(제품 앱과 같은 길). 기존 넷은 prop 경로 그대로, Visual Novel Dialog는 `reducedMotion` prop arg로 스토리만.
  Chat Bubble은 `reveal: "instant" | "typewriter"` arg와 `Typewriter` 스토리를 더했다 — `reveal` 없이는 reduced가 보일 것이 없다. 순수 함수 `normalizeStoryMotion(value)`(`"reduced"`만 reduced)을
  다섯 companion · 엔트리가 공유한다. 전역 툴바를 버린 이유는 「버린 대안」 3.

### D4. 보상 모션은 한 화면에서 한 번이고 순수 파생이며 퇴장이 없다 — 재화 자리는 없다

- 보상 요소는 lesson-complete의 **통과 배지 하나**다(`reward` · `enter-expressive` · `scale.reward`). 미통과 배지는 모션 0 — `LESSON FAILED`는 성취가 아니다. 판정은 순수 함수
  `rewardMotionFor(verdict, motion)`(`"expressive"` · `"fade"` · `"none"`)이고 화면이 `useMotion()`으로 모드를 읽는다.
- **「화면당 한 번」은 배지 클래스가 `(verdict, motion)`의 순수 파생이라는 사실로 보장한다** — ref · phase · `key`가 없다. `verdict`는 라우트에 실려 화면과 함께 죽고 `motion`은 호스트
  globalProps라 바뀌면 트리가 통째로 다시 선다. 반복을 막는 코드를 두면 「왜 있는가」를 다음 사람이 다시 묻는다.
- **`exit-expressive` 퇴장은 적용하지 않았다** — 이 화면의 모든 「다음 입력」이 화면 자체를 떠나므로 퇴장을 보이려면 내비게이션을 400 ms 늦춰야 한다. 정본의 「보상 motion 중에도 다음 입력을
  받는다. 다음 버튼을 누르면 보상 요소는 즉시 사라진다」는 입력을 막지 않는다는 뜻이지 지연을 요구하지 않는다. 조건(사용자 결정 Q1, 5단계): 「맵으로 가는 길을 400 ms 늦추더라도 퇴장을 보이자」가
  답이면 `leave(action)` 꼴로 연다.
- **재화 획득 모션은 자리가 없다** — `gemCount`는 setter 없는 `useState`, 보상 카드의 `+ 0 REWARD`는 placeholder, 젬 칩은 숨긴다. 그 카드는 배지와 같은 화면이라 「한 화면 한 번」에도 걸린다.
  조건(Q2, 5단계): 젬 지급 규칙이 생겨 수가 실제로 갱신되는 날, 「배지와 한 묶음」인지 「그 요소 단독」인지 정본에 묻고 연다.
- *(3단계에서 정함 — ADR-0025 「3단계」.)*

### D5. 전환은 등장만 있고 입력을 막지 않으며 타이머로 끝난다 — 진행 바 채움은 `progress` · `enter`로 차오르고, custom 화면 전환은 0이다

- **문항 전환**은 `LearningShell`의 무대 · 작업 영역에만 붙는 `transition` 기반 3상 기계(`idle → primed → entering → idle`)다. `primed`는 새 내용이 보이지 않는 시작값
  (`opacity: 0; transform: translateX(var(--libitum-spacing-16)); transition: none`), `entering`은 정착값으로 가는 전환(`page` · `enter`), reduced는 `transform: none` + 불투명도만 `d2` · `linear`.
  트리거는 키 `complete ? "complete" : String(questionIndex)`의 변화다.
  - **퇴장이 없는 이유**: 옛 문항을 300 ms 더 보이면 그 동안의 탭이 옛 문항에 간다 — 「전환 중 입력이 다음 문항에 간다」(정본 원칙 2)와 양립하지 않는다. 새 내용은 즉시 DOM에 서서 입력을 받는다.
    정본 짝 규칙(「나타남과 사라짐은 같은 시간」)은 사라짐이 **없는** 전환에는 걸리지 않는다고 읽었다 — DS-Q3(「되묻는 것」).
  - **전환 중 재입력은 `entering`을 유지**해 현재 값에서 이어간다. **종료는 타이머**(`motionDurationMs(page | d2)`)다 — `bindtransitionend`는 벤더된 Lynx 문서에도 저장소에도 없다.
  - 세션 헤더 · 지시문 · 액션 행 · 넘김 층 · Dialog에는 전환 **클래스**가 붙지 않는다(3단계 그대로).
- **진행 바 채움은 `progress` · `enter`로 차오른다**(4단계). `apps/mobile`의 `LearningSessionHeader` 자체 막대(`.learning-shell-progress-fill`)에 `transition: width
  var(--libitum-motion-duration-progress) var(--libitum-motion-easing-enter)`, reduced는 `.learning-shell-progress-fill-motion-reduced { transition: none }`(base 뒤에 서서 이긴다).
  헤더가 `useMotion()`을 읽고 순수 함수 `learningProgressFillClassName(motion)`이 클래스를, reduced일 때만 `data-motion="reduced"`를 조건부 spread로 낸다. standard DOM · 클래스는 byte 불변.
  정본 원칙 3 · 컴포넌트 매핑 「Progress Header 진행 바 너비 — `progress` · `enter` — reduced 즉시 반영」 · ui-lynx `ProgressHeader` · `PageIndicator`가 이미 같은 규칙이다.
  - reduced 표식은 **채움 자체**에 붙인다 — 움직이는 요소이고, 컨테이너 `.learning-shell-progress`는 `accessibility-element` + `label`인 접근성 노드라 거기에 `data-motion`을 더하면 노드 속성이 섞인다.
  - **「0 %에서 그리지 않는다」는 그대로** — 마운트 순간은 전환하지 않는다(새로 선 요소는 시작값이 없다). 문항 n → n+1에서 바 250 ms와 무대 300 ms가 같은 프레임에 시작해 끝나는 시각이 다른 것은
    정본이 두 순간에 다른 토큰을 준 설계다. 채움 색은 전환하지 않는다(바뀌지 않는 값).
  - [미확인] Lynx가 `<view>`의 inline `%` `width` 전환을 두 플랫폼에서 그리는가 — `ProgressHeader` · `PageIndicator`가 같은 선언을 쓰지만 기기 기록이 없다. 안 그려지면 즉시 반영 = 지금과 같다.
    문항 둘 이상 유닛이 생기면 `motion-reward.md` M3-I9 · M3-A9가 닫는다.
- **custom 화면 전환은 0이다.** `AppSession`은 스택 최상단 하나만 그리고 이전 화면은 즉시 언마운트돼 퇴장을 걸 요소가 없으며, `Nav`는 방향을 모른다. 등장만 거는 반쪽 전환은 짝 규칙과 어긋나고
  모든 화면의 첫 프레임을 바꿔 e2e · 성능 보고서의 비교선을 흔든다. 5단계 설계 후보(결정 아님): 들어오는 화면만 crossfade, `app-screen` 호스트(`key` = 화면 정체), outgoing layer 없음, 제외 목록.
  선행: `AppSession` 300줄 해소, DS-Q3 · DS-Q5 답변, 사용자 결정 Q1 · Q3 · Q4, e2e · 성능 기준선 재설정.

### D6. scale 리터럴은 `var()`로 전환했다 — 두 플랫폼의 일반 규칙 근거 · iOS keyframe 탐색 · Android keyframe은 회귀 행이 게이트다

- **2026-10-10 전환.** 근거는 「맥락」 3 — 일반 규칙의 `transform` 안 `var()`가 iOS(M2-I8) · Android(M3-A8 · M3-A3 (b))에서 풀렸다. 값이 토큰과 같아 픽셀 변화 0(눌림 95 % · Dialog 96 % ·
  배지 80 %). fallback(`var(--x, 0.95)`)은 쓰지 않는다 — 엔진이 `var()`를 못 풀면 fallback도 못 읽는다(2단계 D1의 이유 그대로).
- **`@keyframes` 본문 안 `var()`**(Dialog enter from · exit to, 배지 reward from)는 일반 규칙과 다른 자리다 — 안 풀리면 그 step의 `transform`만 무효가 되어 Dialog 등장 · 배지 등장이 fade로
  조용히 열화한다. 그래서 **e2e 회귀 행 가운데 Dialog 첫 프레임 96 %와 배지 첫 프레임 ≤ 90 %(iOS · Android 각각)가 이 전환의 유일한 기기 게이트다** — 회귀이자 판정. 첫 프레임이
  100 %(축소 없음)면 통과가 아니라 **실패**다.
  - **iOS: 풀림** — 구현 전 시뮬레이터 탐색(버리는 워크트리, 2회 동일): Dialog enter 첫 프레임 카드 하단 1678(2단계 리터럴 기록과 일치), 배지 첫 프레임 지름 108.7 css = 86.2 %(3단계 리터럴 기록과
    소수까지 일치). 선언만 무효(100 %)도 keyframe 전체 무효(불투명도 변화 없음)도 관찰되지 않았다. Dialog exit keyframe의 닫힘 모션은 측정하지 않았다.
  - **Android: [미확인]** — 4단계 Android 회차의 M3-A1 (a)(b)(배지) · M2-A2(Dialog) 행이 본다. 결과는 e2e 문서 「4단계 회차」.
- **fallback(어느 플랫폼이든 keyframe 자리에서 100 %면)**: keyframe 자리 셋(`dialog.css` enter from · exit to, `lesson-complete-screen.css` reward from)만 리터럴 + 숫자 대조(3단계 정책 — SC2 ·
  LCR-css2 원형)로 되돌리고, 일반 규칙 둘(`round-button.css` · `learning-unit.css`)은 `var()` 유지. `scale-literal` 규칙은 keyframe 본문을 대상에서 빼지 않고 두 파일을 allowlist에 사유(「keyframe
  본문 `var()` 미지원 — 리터럴 영구, 단언이 토큰과 대조」)와 함께 올린다. 그 경우 이 D에 「keyframe 본문 미지원(플랫폼 · 날짜)」을 정정 기록으로 적는다.
- Dialog **퇴장**의 끝 값도 `scale.enter`(같은 변수)다 — 정본 Scale 표에는 「enter」만 적혀 있다(DS-Q8).

### D7. 모션이 보조기술에 닿는 자리 — iOS `opacity` 전환 중 모델 alpha 0, 교체 뒤 초점은 ADR-0016 D8의 축; 무동작 가림 선언은 두지 않는다

- **iOS에서 `opacity` 전환 중 보조기술은 무대 · 작업 영역을 건너뛴다 — 「접근성 트리 불변」이 아니다.** Lynx iOS의 `opacity`는 `view.layer.opacity`(모델 레이어)에 쓰고(Pod 4.0.1 `ui/LynxUI.m`
  2185 ~ 2203행), `transition`이 선언돼 있으면 세터가 CA 애니메이션으로 넘기고 **모델값은 완료 콜백에서야** 쓰며(`animation/LynxTransitionAnimationManager.m` 157 ~ 181행, 콜백 178행), 그
  애니메이션은 `removedOnCompletion NO` · `fillMode both`로 **표시 레이어만** 0 → 1을 그린다(`animation/LynxAnimationUtils.m` 33 ~ 41행). 즉 entering 동안(standard 300 ms · reduced 100 ms) 두 뷰의
  `alpha`는 0에 머물고 UIKit 보조기술은 alpha 0 뷰를 `hidden`처럼 건너뛴다(UIKit 관례 — 저장소 밖 추론). VoiceOver가 켜져 있으면 Lynx가 레이아웃마다
  `UIAccessibilityLayoutChangedNotification`을 쏘므로(`ui/LynxUIOwner.m` 1036 ~ 1042행) 문항 교체 직후의 초점 재평가가 그 창 안에서 일어난다 — 초점이 새 문항이 아니라 세션 헤더 · 액션 행 ·
  넘김 층에 설 수 있다. 내용은 뷰 계층에 남고 끝나면 돌아온다(모델값 1 복귀). 터치는 alpha와 무관하다(`shouldHitTest`는 `hidden` · `userInteractionEnabled` · `window`만 본다 — M3-I4가 전환 중
  tap이 새 장면에 가는 것을 확인). 교체 뒤 초점 복원은 [ADR-0016](0016-assistive-technology-semantics.md) D8의 축이고 실기 항목은 `motion-reward.md` M3-I8 · M3-A7이다. Android는 AAR뿐이라
  미확인. **조건**: M3-I8이 「초점이 매번 무대 밖에 선다」고 적으면 D8 경로(교체 뒤 새 문항 내용으로 초점 통지)를 연다. 전환을 걷거나 `opacity` 시작값을 0.01로 두는 우회는 실기 근거가 있을 때만
  검토한다. *(3단계 accessibility R1의 사실 — ADR-0025 「3단계」에서 옮겼다.)*
  - **상태(2026-10-10 4단계)**: M3-I8 미확인(VoiceOver 안 켬) · M3-A7 (d) 통과 / (a)(b)(c) 미확인 — 3단계 회차. 4단계 회차 결과는 `motion-reward.md` 「4단계 회차」 소절. **D8 경로를 열 근거도
    닫을 근거도 없다 — 5단계 이월.** 4단계는 이 축의 코드를 건드리지 않았다(`focusable` · `accessibility-*` 증감 0 — diff는 아래 삭제 여섯뿐).
- **진행 바 `width` 전환은 접근성 노드에 걸리지 않는다**(4단계 accessibility 확인). 접근성 노드는 컨테이너 `.learning-shell-progress`(`accessibility-element` · `label` · `data-progress`)이고
  움직이는 채움 `<view>`는 `accessibility-*` 0 · `bindtap` 0이라 트리에 없다. 이름 · `data-progress`는 순수 파생이라 문항이 바뀌는 렌더에서 **즉시** 바뀐다 — 전환은 CSS `width`에만 걸린다.
  iOS `transition: width`는 레이아웃 전환이지만 컨테이너 프레임(트랙 높이 고정)은 바뀌지 않아 `accessibilityFrame` · 정지 수 · 이름 모두 불변. reduced `transition: none`은 WCAG 2.3.3 · 정본
  「너비 즉시 반영」에 맞는다.
- **무동작 가림 선언은 두지 않는다**(4단계). ADR-0016 D5의 두 문장대로 잎 `<svg>` 한 자리(LearningUnit 링)와 자손이 `<svg>` · `<view>`뿐인 래퍼 다섯(Button spinner-wrap · RoundButton
  loading · icon · LearningUnit surface · badge)의 `accessibility-elements-hidden`을 지웠다. 래퍼 요소 자체는 남는다(DOM · 순서 · 클래스 훅 불변). 단언은 두 겹 — 지목한 요소에
  `not.toHaveAttribute` + 컴포넌트 트리 전체 `[accessibility-elements-hidden]` 개수 0. 자손에 `<text>`가 있는 자리(ChatBubble 측정용 숨김 텍스트)와 hit-testing 근거가 있는 D9 scrim 꼴은 그대로.
  낭독 이름 · 순서 · 정지 수 단언은 byte 불변으로 green이고, 같은 꼴에서의 Android TalkBack 정지 수 불변은 3단계 M3-A7 (d)가 봤다 [e2e]. **장부는 ADR-0016 D5 한 곳에만 둔다** — 그 날짜 주가
  저장소에 남은 잎 부착 12자리(예외 후보 다섯 · 5단계 삭제 후보 여섯 · 별도 지적 하나)를 센다. 이 문서는 그 수를 되풀이하지 않는다.

### D8. 검증 계층 — unit은 CSS 텍스트, ui는 속성 · 클래스, integration은 Context 한 줄 · 샌드박스 lint, e2e는 수동 문서 셋, 카탈로그는 Storybook

| 층 | 무엇을 | 어디 |
|---|---|---|
| unit | CSS 텍스트(토큰 `var()` 문자열 · 비항등 scale 리터럴 0 · keyframe 이름 · reduced 규칙 · `@media` 0), `motionDurationMs`, 보상 판정 · 전환 상태 기계 · 진행 바 클래스 · `normalizeStoryMotion` 순수 함수, `lint:motion` 스캔 · 정책 함수 | `packages/ui-lynx/src/motion/motion-css.unit.test.ts` · 컴포넌트 unit · `apps/mobile` 화면 unit · `devtools/motion-literals/*.unit.test.mjs` |
| ui | reduced일 때만 나는 클래스 · `data-motion`, standard DOM byte 불변, 가림 속성 부재 + 트리 개수 0, 전환 속성 · 타이머, 배지 재렌더 불변 | 컴포넌트 · 화면 `*.ui.test.tsx` |
| integration | 앱 ↔ ui-lynx `MotionProvider` Context가 앱 훅 · 헤더까지 하나인지, 통합 25자리의 즉시 호출 불변, `lint:motion` 샌드박스(CSS · `.tsx` 위반 exit 1, 저장소 위반 0), Storybook `index.json` id · 엔트리 소스 텍스트 · companion 정규화 | `App.motion.integration.test.tsx` · `devtools/motion-literals/check.integration.test.mjs` · `apps/storybook-lynx/src/catalog.integration.test.ts` |
| e2e(수동) | 기기 비율 · 중간 프레임 · 막 색 · 전환 중 입력 · reduced 분기 · 보조기술, 「4단계 회차」 회귀 | [`motion-reduced.md`](../e2e/motion-reduced.md) · [`motion-tokens.md`](../e2e/motion-tokens.md) · [`motion-reward.md`](../e2e/motion-reward.md) |
| 카탈로그 | 변형이 있는 컴포넌트마다 `ReducedMotion` 스토리(Dialog · Bottom Sheet · Overlay · Progress Header · Round Button · Learning Unit · Page Indicator · Settings Cell · Chat Bubble · Visual Novel Dialog). *(2026-10-11 주: + Button · Card · Option Selector — 열셋. 정정 기록 1.)* | [`apps/storybook-lynx`](../../apps/storybook-lynx/README.md) |

e2e의 판정 조건은 플랫폼으로 가른다 — 즉시성(정착 전 나가기)은 iOS만 판정하고 Android는 tap 시각이 영상 ±한 프레임으로 맞춰진 회차에서만 판정한다(3단계 Android 회차가 찾은 한계,
`motion-reward.md` 「전제」). 「미확인」 행은 통과로 읽지 않는다.

## 버린 대안

1. **`@media (prefers-reduced-motion)`** — Lynx가 미디어 특성을 지원하지 않아 어느 블록도 픽셀을 바꾸지 않았다(1단계가 죽은 블록 다섯을 지웠다). 호스트 boolean + Context가 유일한 길이다.
2. **inline style(`style={{ transition }}`)로 토큰을 쓴다** — Lynx inline style에서 `var()`가 풀리는지는 확인하지 않았고 정책은 「리터럴을 쓰지 말라」까지다. 모션은 CSS 클래스에 둔다(지금 inline 모션 0건).
3. **Storybook 전역 툴바(`globalTypes.motion` → `createLynxView({ globalProps })` → 엔트리가 `useGlobalProps()`로 Provider)** — (1) Storybook `lynx.config.ts`에 `globalPropsMode: "event"`가 필요하고
   Lynx **Web** 런타임이 `updateGlobalProps`로 `useGlobalProps` 소비자를 다시 그리는지 모른다 [미확인]; (2) prop 경로를 가진 넷은 `resolveMotion`이 prop > 컨텍스트라 툴바 「reduced」 + arg
   「standard」가 standard를 그린다 — 두 조작이 서로 거짓말하는 모양; (3) 23개 스토리 파일이 각자 `render`를 정의해 공통 헬퍼와 둘째 채널(`useGlobalProps`)이 들어온다; (4) node 환경 vitest가
   툴바 상태를 볼 수 없다. 장점(같은 인스턴스에서 전후 비교 · 「차이 0」인 Button · Card · Tooltip이 같게 보이는 것)은 인정한다 — 「재검토 조건」 2. *(2026-10-11 주: 「차이 0」은 이제
   Tooltip뿐이다 — 정정 기록 1.)*
4. **scale 리터럴 영구 유지 + unit 숫자 대조** — 2 · 3단계의 안전한 쪽. 두 플랫폼 근거가 생겨 전환했고, 대조 목록 밖의 새 자리를 잡지 못하던 구멍은 `scale-literal` 규칙이 닫는다. keyframe 본문만
   되돌리는 fallback은 D6에 남아 있다.
5. **진행 바를 ui-lynx `ProgressHeader`로 교체** — 헤더 구조 · 낭독 · 테스트 전부 바뀐다(범위 밖). **0 %에서도 그리기** — 「점이 남는다」는 시각 변경으로 2026-09-28 결정과 충돌.
6. **reduced 표식을 진행 바 컨테이너에 두기** — 컨테이너가 접근성 노드라 속성이 섞인다(D5). 선택자 하나 차이이고 시각은 같다.
7. **가림 선언의 저장소 전체 재집계 · 예외 등록** — 이 작업은 코드가 닿은 세 컴포넌트만 지웠다. 재집계는 5단계(「미확인 · 후속」 5).
8. **`bindtransitionend`로 전환 종료** — 벤더된 Lynx 문서에도 저장소에도 없다. 타이머는 테스트에서 결정적이고 `advance` 자물쇠의 fake timer와 간섭하지 않는다.
9. **`useEffect`로 ref 대입 옮기기(oxlint `react/immutability` 경고 넷)** — 세 자리는 이미 핸들러 · effect 안이고(규칙의 오탐), 훅 자리는 「렌더 중 키 변화를 같은 렌더에서 반영」이 설계라
   effect로 옮기면 한 프레임 늦는다. 규칙 예외 주석(`-- 사유` 접미, 저장소 선례 셋)으로 두고 규칙 설정은 바꾸지 않는다.

## 대가

1. `transform` 안 `var()`에 기댄다 — 엔진이 어느 버전에서 풀지 않게 되면 눌림 · 등장 축소가 조용히 사라진다. 지키는 것은 e2e 회귀 행(눌림 95 % · Dialog 96 % · 배지 ≤ 90 %)뿐이고 자동 검사는 없다.
2. `lint:motion`의 소스 스캔은 **문자열 리터럴 값**만 본다 — 변수 · 호출 · 조건식으로 들어온 리터럴은 잡히지 않는다. `translate*` · `rotate*` · CSS `scale` 단독 속성 · `zoom`도 대상 밖.
3. 「늘 내는 넷 / reduced만 내는 넷(+ 진행 바)」의 비대칭이 남는다 — 통일하려면 어느 한쪽의 standard DOM이 바뀐다.
4. 전환 종료가 타이머라 토큰 값과 CSS 전환 시간이 어긋나면(`motionDurationMs`가 같은 토큰을 읽어 어긋나지 않지만) 종료 시점이 그림과 다를 수 있다.
5. 진행 바 전환 · 문항 n → n+1 전환은 이 빌드로 관찰할 수 없어 「미확인」이 결과 표에 남는다. 문항 둘 이상 유닛이 생길 때까지 기기 근거 없이 코드 근거로 산다.
6. 카탈로그의 reduced 비교는 스토리 둘을 오가며 본다 — 같은 인스턴스 전후 비교가 아니다.
7. 가림 선언 장부(ADR-0016 D5)는 「0건」이 아니라 「남은 12자리」를 적는 상태로 5단계까지 간다.

## 정정 기록

1. **2026-10-11 — D3의 「Card · Tooltip · Button은 변형을 만들지 않는다」는 사용자 결정으로 뒤집혔다. 눌림 축소가 다섯 대상으로 넓어졌고 D1의 scale `var()` 자리는 열이다.**
   사용자 발화(2026-10-10)는 「액션 버튼 등 요소들도 클릭했을 때 scale 애니메이션이 있으면 더 게이미피케이션적으로 좋지 않을까」와 범위 결정 「전부 넣는 쪽으로 진행」이다 —
   이유는 **눌림 피드백의 일관성**: RoundButton · LearningUnit만 줄어들고 액션 버튼 · 선택지 · 카드는 색만 바뀌어 같은 화면에서 반응이 갈렸다. 브랜치 `feat/press-motion`, 기준 `ab1c7994`.
   - **눌림 축소가 생긴 자리 다섯**: ui-lynx `Button`(neutral · brand · outline · subtle · text — loading · disabled 제외) · `Card` interactive · `OptionSelector` 항목(Enabled · Unselected —
     `-item-pressable`만) · 앱 `sentence-order-chip.css` bank 칩(placed · placeholder 제외) · `roleplay-card.css` 열린 카드(잠긴 카드 제외). 다섯 모두 LearningUnit 꼴 — 변형 요소의
     **base 규칙**에 `transition: transform duration.pressed easing.easing`, `:active`에 `transform: scale(var(--libitum-motion-scale-pressed))`. 기존 색 전환 목록이 있는 자리(Card
     longhand · OptionSelector shorthand)는 목록 끝에 `transform`을 덧붙였고 색 전환 시간은 손대지 않았다. RoundButton 꼴(`:active` 안에 전환 — 놓을 때 즉시 복귀)은 쓰지 않았고 RoundButton
     자체도 고치지 않았다(byte 불변).
   - **design-system 정본에서 벗어난다**: 정본 Button 매핑은 「Pressed = 색만」이다. 이 저장소는 벗어남만 기록하고 정본은 고치지 않는다 — DS-Q12(「되묻는 것」).
   - **D3 막 목록이 늘었다**: 막은 「`:active` 색 변화가 없는 면」에만 — **Button neutral · brand**(`ui-lynx-button-shade`, surface 첫 자식) · **롤플레이 열린 카드**(`roleplay-card-pressed-shade`,
     루트 첫 자식 — 기존 `.roleplay-card-shade`는 아래쪽 그러데이션이지 막이 아니라 이름을 달리했다). 색이 이미 바뀌는 자리(Button outline · subtle · text · Card · OptionSelector · bank 칩)에는
     막을 더하지 않는다 — 막과 색이 겹치면 두 번 어두워진다. **어두운 면은 흰 막이다**: neutral `#2A3038`(롤플레이 카드도 같은 면) 위의 black 8 %는 `#272C34`(채널 Δ 3 ~ 4)라 보이지 않고,
     같은 토큰 `opacity.pressed-shade`로 white를 깔면 `#3B4148`(Δ 16 ~ 17)이다. brand `#F46B18`는 black 8 % → `#E06216`(LearningUnit active와 같은 합성). 정본 Reduced 표는 「막」까지만
     적고 색을 정하지 않는다 — DS-Q11. 막의 박스는 네 변 `0`이 아니라 `top/left: 0; width/height: 100%`(아래 로딩 래퍼와 같은 이유).
   - **reduced 표지의 자리**: Button · Card · 칩 · 롤플레이 카드는 루트, OptionSelector는 **컨테이너 루트**(`ui-lynx-option-selector-motion-reduced` — 항목 className · contract 불변).
     reduced `:active` 규칙은 `transform: none` 하나다(`transition: none`을 더하면 Card · OptionSelector의 색 전환까지 걷힌다).
   - **D2 「standard DOM byte 불변」의 예외 하나**: 잠긴 롤플레이 카드에 상태 클래스 `roleplay-card-locked`가 붙는다. Lynx CSS 속성 선택자(`[data-locked="true"]`) 지원 기록이 저장소에
     없어 클래스로 제외했다(순수 `roleplayCardClassName`). 잠긴 카드가 줄어드는 것은 「버튼이 아니라고 낭독하면서 버튼처럼 반응」하는 오신호라 제외는 필요했다. 열린 카드 · 다른 넷의 standard
     DOM은 불변이고 Button loading의 inline `style` 값만 바뀌었다(아래).
   - **Button 로딩 결함 수정(결정 아님 — 정본 0.4.0 「Loading 폭 불변 · 라벨 숨김 · spinner 중앙」을 Lynx에서 지키게 한 것)**: 2026-10-10 시뮬레이터에서 제품의 로딩 버튼(전부 `xl` · `fill`,
     넷은 아이콘)이 스피너를 왼쪽에 붙이고 라벨을 드러냈다. 래퍼의 네 변 `0` 절대 배치가 `fill` surface(`width: 100%`)에서 서지 않았고 `<text>` inline `visibility: hidden`이 글자를 지우지
     않았다. 래퍼는 `top/left: 0; width/height: 100%`로, 숨김은 inline `opacity: 0`으로 바꿨다. 2단계 e2e M2-I3 · M2-A3이 통과였던 이유는 playground 행이 전부 `hug` · size m · 아이콘 없음이라
     제품 조합을 한 번도 보지 않았기 때문이다 — playground `ButtonCatalog`에 「Button · fill · icon · loading」 행을 더했다(dev 전용). RoundButton 로딩은 아이콘을 흐름 안에서 스피너로
     교체하는 꼴이라 같은 결함이 없다.
   - **D8 검증 표**: unit은 다섯 CSS 파일의 선택자 · 토큰 · reduced 규칙 · 비항등 리터럴 0(`motion-css.unit.test.ts` SC4″가 여섯 파일 합본)과 순수 함수 여섯(계약 셋의 `contextMotion` 인자 ·
     `hasPressedShade` · `sentenceOrderChipClassName` · `roleplayCardClassName` · `hasRoleplayCardPressedShade`), ui는 reduced 렌더의 클래스 · `data-motion` · 막 요소와 standard 부재, integration은
     더하지 않았다(`App.motion.integration.test.tsx` IM1 · IM4가 호스트 → Provider → 소비자 경로를 이미 고정 — 새 배선 0). 카탈로그 열은 Button · Card · Option Selector를 더해 열셋.
     e2e는 [`motion-tokens.md`](../e2e/motion-tokens.md) 「눌림 확장 회차」 — **iOS 시뮬레이터 실행**(M5-I1 ~ M5-I5: 축소 94.8 ~ 95.1 %, 로딩 스피너 중앙 · 라벨 숨김 · 폭 불변, reduced에서
     neutral 막 `#3B4048`(기대 `#3B4148` ±2) · brand `#E06216` · 잠긴 카드 막 없음 · OptionSelector 색만), **미측정 셋**(reduced 열린 카드의 흰 막 · reduced bank 칩 — 계정 진행도, M5-I6 —
     playground 엔트리에 `MotionProvider`가 없어 늘 standard), **Android는 절차만**(M5-A1 ~ M5-A6 미실행). 이번 변경의 Lynx 선택자 파싱 실패는 0이다(기존 `:focus-visible` 규칙 10종만).
   - **대가**: ui-lynx dist 상한 500,000 → 507,000 bytes(실측 498,496 → 505,513(최종 HEAD 505,453), `devtools/bundle-size/budget.json` note) · main 번들 1,403,255 → 1,410,167(상한 1,412,000 안, 여유 약 1.8 kB) —
     [성능 보고서](../performance/reports/press-motion-app-launch-iphone-17-pro-simulator-01.md)(렌더링 · 메모리 미측정). 「대가」 3의 비대칭에 줄 하나가 더 붙는다(잠긴 카드 상태 클래스).
   - **바뀌지 않은 것**: D1 규칙 다섯 · allowlist · D2 전달 경로 · Spinner 예외 · RoundButton · LearningUnit · Tooltip · PremiumRoleplayCard · placed 칩 · Card static · disabled bank 칩의
     기존 `:active` 색(disabled 클래스가 없어 색이 걸리는 기존 결함 — 같은 경계로 scale도 걸린다, 고치지 않음) · OptionSelector item/surface 전환 시간 차이(둘 다 150 ms).
   - **기본값으로 닫은 사용자 결정 넷**(답이 오면 이 기록에 덧붙인다): 눌림 확장 **Q1** 어두운 면 막 = white(black이면 CSS 한 줄 · e2e 기대값 두 칸) · **Q2** 잠긴 카드 제외 = 상태 클래스 ·
     **Q3** placed 칩 · disabled bank 칩 = 그대로(줄이지 않음 / 기존 경계) · **Q4** `PremiumRoleplayCard` = 범위 밖(같은 목록에서 혼자 안 줄어든다).

## 되묻는 것 — design-system

| id | 질문 | 출처 | 지금 FE의 읽기 |
|---|---|---|---|
| DS-Q3 | 「내용이 즉시 바뀌는 전환은 등장만」 — 짝 규칙의 예외를 플랫폼 매핑 행(또는 짝 규칙 절)에 적을지 | 3단계 D5(이 문서 D5) | 예외로 읽고 문항 전환에 적용했다. custom 화면 전환(5단계)도 같은 읽기에 기댄다 |
| DS-Q5 | custom 화면 전환의 reduced duration — `d2` · `linear`(저장소 선례) vs 「불투명도는 원래 토큰 유지」로 `page` crossfade | 3단계 design | 5단계 전까지 결정 불필요. 정본 Reduced 표 「화면 전환 — 플랫폼 기본 crossfade」가 custom에는 답이 없다 |
| DS-Q8 | `scale.enter`가 Dialog **퇴장**의 끝 값이기도 함을 `motion.md` Scale 표 설명에 명문화(지금은 `dialog.md` 「역방향」만) | 4단계 design(이 문서 D6) | 같은 토큰으로 쓴다. 토큰 추가 불필요 |
| DS-Q9 | 진행 바가 0 %를 그리지 않는 구현에서 「첫 채움」 규칙 — `progress-header.md`는 「0 % 초과 최소 8px」이고 0 % 표현은 컴포넌트마다 다를 수 있다 | 4단계 design(이 문서 D5) | 세션 안에서는 첫 렌더부터 1/N이라 실제 쟁점 없음. 기록만 |
| DS-Q10 | 카탈로그(Storybook)에서 reduced 변형 노출 규칙을 `CONSUMING.md` ReactLynx 절에 둘지(호스트 키 `reducedMotion`을 카탈로그가 흉내 내는 것이 권장 경로인지) | 4단계 design(이 문서 D3) | 지금은 컴포넌트별 arg(D3). 전역 툴바로 가면 FE가 선례가 된다 |
| DS-Q11 | reduced 눌림 막의 **색 규칙** — 정본 Reduced 표는 「막」까지만 적는다. 어두운 면(Button neutral `gray.900` · 롤플레이 카드)에는 black 8 %가 보이지 않아(Δ 3 ~ 4) **white** 막을 깔았다 | 눌림 확장(정정 기록 1) | 「밝은 면 black · 어두운 면 white, 불투명도는 `opacity.pressed-shade` 하나」로 읽었다. 정본이 색을 정하면 CSS 한 줄만 바뀐다 |
| DS-Q12 | Button Pressed가 정본 매핑 「색만」에서 벗어나 95 % 축소를 더한 것의 승인 — Card interactive · OptionSelector 항목도 같다 | 눌림 확장(정정 기록 1) | 사용자 결정(게이미피케이션 피드백 일관성)으로 벗어났다. 정본이 거부하면 CSS 다섯 파일의 `:active` transform만 걷는다 |
| 닫힘 | 2단계 Q2 — reduced 눌림 막 위 Neutral 아이콘 2.693:1 예외 | PR #78 | **닫힘** — design-system `foundations/accessibility.md` 시각 예외 표 3행(Round Button Neutral 2.693:1 · Brand 2.373:1 · Learning Unit Available 2.267:1) |

사용자 결정 대기(정본 아님, 전부 5단계): **Q1** 배지 퇴장을 위한 맵 이동 400 ms 지연 · **Q2** 재화 획득 자리 · **Q3** custom 화면 전환 여부와 제외 목록 · **Q4** 옛 문항 사라짐을 위한 150 ms 지연.
눌림 확장의 Q1 ~ Q4(막 색 · 잠긴 카드 클래스 · placed 칩 · PremiumRoleplayCard)는 기본값으로 닫혀 있다 — 정정 기록 1.

## 미확인 · 후속

1. **4단계 기기 회귀(iOS · Android)** — 눌림 95 % · Dialog 96 % · 배지 ≤ 90 % · 막 색. Dialog · 배지 행은 keyframe 본문 `var()`의 게이트를 겸한다(D6). 결과는 e2e 두 문서의 「4단계 회차」.
2. **Android `@keyframes` 본문 `var()`** — iOS만 탐색했다. 안 풀리면 D6 fallback.
3. **진행 바 `width` 전환의 기기 관찰 · 문항 n → n+1 전환 · 작업 영역 전환** — 문항 둘 이상 유닛이 없다. M3-I9 · M3-A9 기본값 「미확인」.
4. **보조기술 실기** — M3-I8 · M3-A7 (a)(b)(c). D7의 조건은 열려 있다. 5단계 이월.
5. **가림 선언 재집계 · 예외 등록 · 무동작 잎 여섯 삭제** — ADR-0016 D5 날짜 주의 12자리. 5단계 첫 묶음 후보(E3). `EpisodeNarrativeScreen` 넘기기 층(조작 단위 잎 — 가림이 아니라 요소 여부를 꺼야
   한다)은 별도 지적(E2)으로 5단계 또는 즉시 소형 PR.
6. **custom 화면 전환** — 사용자 결정 Q1 · Q3 · Q4와 DS-Q3 · DS-Q5 뒤 5단계. 선행 조건은 D5.
7. **iOS 실기** — 전 단계 시뮬레이터만.
8. **ADR 번호 0043 중복** — 고치지 않았다. 사용자 결정 자리.
9. **Storybook 브라우저에서 reduced 스토리가 실제로 막 · 즉시 반영을 그리는지** — 테스트는 id · 정규화 · 엔트리 텍스트까지(카탈로그 README 「한계」와 같다).
10. **눌림 확장(정정 기록 1)의 Android 회차** — M5-A1 ~ M5-A6은 절차만 있고 실행하지 않았다. iOS에서도 reduced 열린 롤플레이 카드의 흰 막 · reduced bank 칩 · reduced 로딩 스피너(M5-I6)는
    미측정이다(계정 진행도 · playground에 `MotionProvider` 없음). 결과 칸은 `motion-tokens.md` 「눌림 확장 회차」.

## 재검토 조건

1. **keyframe 본문 `var()`의 기기 결과** — Android 4단계 회차(배지 · Dialog)에서 첫 프레임 100 %가 나오면 D6 fallback을 적용하고 이 D에 정정 기록을 단다. iOS 탐색 결과가 시뮬레이터 밖(실기)에서
   뒤집혀도 같다.
2. **Lynx Web에서 `globalPropsMode: "event"` 재렌더가 확인되면** 전역 툴바를 D3의 컴포넌트별 arg **위에** 얹는다(기구 하나, 진입점 둘) — 「버린 대안」 3의 (1)이 닫힐 때.
3. **문항 둘 이상 유닛이 생기면** M3-I9 · M3-A9(진행 바) · M3-I3 작업 영역 · M3-I4 「새 문항 보기」를 잰다.
4. **보조기술 실기(M3-I8 · M3-A7)에서 「초점이 매번 무대 밖에 선다」가 나오면** D7의 D8 경로를 연다.
5. **design-system이 DS-Q3 · DS-Q5에 답하면** D5의 custom 화면 전환 설계를 다시 본다(사용자 결정 Q1 · Q3 · Q4와 함께 — 5단계).
6. **Lynx에 `bindtransitionend`(또는 전환 종료 이벤트)가 생기면** D5의 타이머 종료를 다시 본다.
7. **타임아웃 없는 요청 경로가 생기면** D3의 Spinner 예외(「Loading은 반드시 끝난다」)를 다시 본다.
8. **젬 지급 규칙이 생기거나 젬 칩이 서면** D4의 재화 모션 자리를 정본에 묻는다.
9. **`motion` 값이 셋 이상이 되면**(플랫폼 crossfade 등) D2의 union과 `data-motion` 채널을 다시 본다.
