# @libitums/ui-lynx

libitum 디자인 시스템 토큰과 아이콘을 사용하는 ReactLynx 컴포넌트 패키지다. 현재 공개
컴포넌트는 `Button`, `BackHeader`, `StatusIndicator`, `RoundButton`, `ProgressHeader`,
`PageIndicator`, `BottomNavigator`, `StepIndicator`, `BottomSheet`, `CompactNumericInput`,
`Card`, `ChatBubble`, `VisualNovelDialog`, `TextField`, `AnswerLabel`, `Overlay`, `Fog`, `Tooltip`,
`Avatar`, `Dialog`, `OptionSelector`, `LearningUnit` 스물두 가지다.

시각·상태 계약은 `libitums/design-system`의 대응 `components/**/*.md`가 원본이다. 현재
구현은 revision `87c1b0d2b745429be9b586cef772deb6c8707ab6`을 기준으로 보정했다.
Bottom Navigator는 2026-09-11의 `main` revision
`2144145cd7ffb5777cf2b74e2fec5474eb0adc14`를 기준으로 추가했다.
Bottom Sheet는 `components/bottom-sheet.md` revision
`3f7ed6d17df769e37215adb40f7abfc2e1174fd1`을 기준으로 추가했다.
Text Field는 `components/text-field.md` revision
`1ba6b55103663c407f073f9ede3a2e700bf9b722`을 기준으로 한다.
Visual Novel Dialog는 `components/visual-novel-dialog.md` revision
`99d1bfbef981d3cdf225a0bad337f3aa3a7b0d55`를 기준으로 한다.
Round Button·Bottom Navigator·Bottom Sheet·Overlay의 불투명도는 `foundations/opacity.json`과
각 컴포넌트 문서를 갱신한 revision `133322d7b080e464303a38456f4da45c8accdda9`를 기준으로 한다.
Tooltip은 `components/tooltip.md` revision
`5c7bce3eb2c0d214de78bcec0c52d7b7395e8a19`을 기준으로 한다.
Fog는 최신 `main`의 `components/fog.md` revision
`456a121fdfee60dfceaba2ac8f9e989a1275c066`을 기준으로 한다.
Avatar는 `components/avatar.md` revision
`666d2fc6e50a8cc3aaf49aaad7148e94a4abc14e`을 기준으로 한다.
Option Selector는 `components/option-selector.md` revision
`456a121fdfee60dfceaba2ac8f9e989a1275c066`을 기준으로 한다.
Learning Unit은 `components/learning-unit.md` revision
`01d3a3c`을 기준으로 한다.

```tsx
import { Button } from "@libitums/ui-lynx/button";
import { ProgressHeader } from "@libitums/ui-lynx/progress-header";
import { PageIndicator } from "@libitums/ui-lynx/page-indicator";
import "@libitums/ui-lynx/styles.css";

<Button label="계속하기" variant="brand" bindtap={handleContinue} />;
<ProgressHeader
  title="오늘의 학습"
  activity="1단계"
  progress={42}
  exitAccessibilityLabel="학습 나가기"
  motion="standard"
  onExit={handleExit}
/>;
<PageIndicator pageCount={4} currentPage={2} />;
```

`AnswerLabel`은 한 문제의 답안 판정을 나타내는 비조작 표시 요소다. Pending에는 과제별
`label`이 필요하고 Correct·Incorrect는 각각 `정답이에요`, `오답이에요`를 기본으로 쓴다.
`result`, `emphasis`, `size`는 독립적으로 조합하며 판정 tone과 icon은 component가 결정한다.

```tsx
import { AnswerLabel } from "@libitums/ui-lynx/answer-label";

<AnswerLabel result="pending" label="잘 들어 보세요" />;
<AnswerLabel result="correct" emphasis="subtle" size="s" contextLabel="3번 문제" />;
```

`OptionSelector`는 2개 이상의 텍스트 선택지를 묶는 controlled 선택 control이다. `selectedIds`와
`onChange`로 선택을 소유하고, Variant·Size·Selection·Commit·Layout·Content language를 독립적으로
조합한다. Multiple은 Deferred만, Immediate는 Single만 허용하며 Immediate는 선택 직후
`onCommit(id)`을 호출한다. 제출 뒤에는 `committed`로 모든 항목을 Disabled로 전환한다.

```tsx
import { OptionSelector } from "@libitums/ui-lynx/option-selector";

<OptionSelector
  groupLabel="알맞은 응답을 고르세요"
  options={[
    { id: "coffee", label: "Coffee, please" },
    { id: "tea", label: "Tea, please" },
  ]}
  selectedIds={selectedIds}
  onChange={setSelectedIds}
  contentLanguage="learning"
  languageTag="en-US"
/>;
```

`LearningUnit`은 학습 목록의 원형 단위 control이다. 제목·진행 문구·연결선은 상위 목록이
조합하며, 컴포넌트는 상태별 Ring·Surface·Icon과 선택적인 Narrative 배지만 소유한다.
ReactLynx의 focus-visible 상태는 제품 host가 `focused`로 전달한다.

```tsx
import headset from "@libitums/icons/lynx/headset";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

<LearningUnit
  accessibilityLabel="1단원 쇼핑 표현 듣기"
  icon={headset}
  status="active"
  narrative="narrative"
  bindtap={startUnit}
/>;
```

`Avatar`는 이미지가 성공하기 전까지 이름의 Initials 또는 Placeholder를 유지한다. 옆에 이름이
함께 보이는 조합에서는 중복 낭독을 피하도록 `accessibility="hidden"`을 사용한다.

```tsx
import { Avatar } from "@libitums/ui-lynx/avatar";
import "@libitums/ui-lynx/avatar/styles.css";

<Avatar imageSource={profileUrl} name="Kim Ray" size="md" />;
```

Correct·Incorrect로 바뀔 때의 정중한 announcement는 제품 host가 결과 전환과 함께 한 번
호출한다. `contextLabel`은 여러 문제가 한 화면에 있을 때 판정의 접근성 문맥을 제공한다.

`CompactNumericInput`은 0–9 중 한 자리 숫자만 받는 native input이다. Placeholder는 예시일
뿐 값으로 전달되지 않으며 접근성 이름은 반드시 제공한다.

```tsx
import { CompactNumericInput } from "@libitums/ui-lynx/compact-numeric-input";
import "@libitums/ui-lynx/styles.css";

<CompactNumericInput
  accessibilityLabel="반복 횟수"
  placeholder="0"
  size="m"
  bindinput={handleInput}
/>;
```

`BottomSheet`는 Scrim 탭, 닫기 버튼, Handle을 아래로 48px 이상 끌기로 닫을 수 있다.
첫 번째 Action은 Brand Button M/Fill로 렌더되며, 두 번째 이후 Action은 Subtle Button
M/Fill로 8px 간격을 두고 세로 배치된다.
본문만 스크롤되고 action 영역은 safe area 위의 시트 하단에 고정된다.
시트가 열린 동안 배경 subtree를 접근성 트리에서 숨기고 닫힌 뒤 trigger focus를 복원하는 일은
제품 host가 맡으며, VoiceOver/TalkBack의 modal focus 이동은 제품 route에서 실기기로 검증한다.

```tsx
import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import "@libitums/ui-lynx/bottom-sheet/styles.css";

<BottomSheet
  overline="학습 도구"
  title="잠깐 쉬어 갈까요?"
  description="오디오를 다시 듣고 이어서 학습할 수 있어요"
  closeAccessibilityLabel="복습 시트 닫기"
  actions={[{ id: "replay", label: "오디오 다시 듣기", bindtap: handleReplay }]}
  ondismiss={handleDismiss}
/>;
```

`BottomNavigator`는 3~5개의 icon-only 목적지를 표시하며 enabled item 하나를 `selectedId`로
가리킨다. disabled 목적지는 비어 있지 않은 `disabledReason`을 함께 제공해야 한다.

```tsx
import home from "@libitums/icons/lynx/house";
import map from "@libitums/icons/lynx/map";
import { BottomNavigator } from "@libitums/ui-lynx/bottom-navigator";
import "@libitums/ui-lynx/bottom-navigator/styles.css";

<BottomNavigator
  items={[
    { id: "home", accessibilityLabel: "홈", icon: home },
    { id: "journey", accessibilityLabel: "여정", icon: map },
  ]}
  selectedId="home"
  bindselect={handleSelect}
/>;
```

`StepIndicator`는 2–5단계의 고정된 순서형 흐름을 표시한다. `totalSteps`는 2–5 정수이고
`currentStep`은 1–`totalSteps` 정수다. 원은 이동 control이 아니다. 전체 줄은
`4단계 중 2단계`처럼 하나의 상태로 노출된다. root와 전용 subpath는 같은 구현과 타입을
내보낸다.

```tsx
import { StepIndicator } from "@libitums/ui-lynx/step-indicator";
import "@libitums/ui-lynx/styles.css";

<StepIndicator currentStep={2} totalSteps={4} />;
```

`Dialog`는 사용자가 1~2개 action 중 하나를 선택할 때까지 진행을 막는 modal이다. Scrim
탭으로 닫히지 않으며 공용 `Overlay`의 Screen · Dialog · Dismiss None 조합을 사용한다. 두
action은 제품 결정에 따라 위에서부터 Brand, Subtle 순서다. `phase`는 진입·표시·퇴장 전환을
명시하고 `data-cancelactionid`는
뒤로가기·ESC를 연결할 때 실행할 아래쪽 action id를 노출한다. 배경 접근성 숨김과 닫힌 뒤
focus 복원은 Dialog를 여는 소비 화면이 소유한다.

```tsx
import { Dialog } from "@libitums/ui-lynx/dialog";
import "@libitums/ui-lynx/dialog/styles.css";

<Dialog
  title="학습을 그만둘까요?"
  description="지금까지의 진행 내용이 사라져요"
  actions={[
    { id: "continue", label: "계속 학습하기" },
    { id: "quit", label: "그만두기" },
  ]}
  bindaction={handleDialogAction}
/>;
```

`Overlay`는 dim/blur와 입력 차단만 소유한다. foreground surface는 sibling으로 두며 Screen은
`sheet | dialog`, Area는 부모의 bounded 영역을 따른다. Area 부모는 `position: relative`와
`overflow: hidden`을 제공해야 한다.

```tsx
import { Overlay } from "@libitums/ui-lynx/overlay";
import "@libitums/ui-lynx/overlay/styles.css";

<Overlay scope="screen" surface="sheet" dismiss="tap" binddismiss={handleDismiss} />;
```

`Fog`는 스크롤 영역 가장자리의 콘텐츠가 이어짐을 알리는 비조작 gradient다. 표시 여부와
스크롤 가능성 판단은 host가 소유하며, Start/End는 `layoutDirection`에 따라 논리 방향으로
배치된다.

```tsx
import { Fog } from "@libitums/ui-lynx/fog";
import "@libitums/ui-lynx/fog/styles.css";

<Fog direction="bottom" size="m" color="surface-default" visibility="visible" />;
```

`Card`는 Media, Content, Header, Body, BodyText, Footer를 필요한 만큼 조합하는 compound
component다. Interactive Card는 접근성 이름과 role, tap handler가 필수이며 Header에 이동
화살표를 자동으로 표시한다. Interactive 안에는 Footer나 별도 trailing control을 둘 수 없다.

```tsx
import { Card } from "@libitums/ui-lynx/card";
import "@libitums/ui-lynx/card/styles.css";

<Card
  interaction="interactive"
  accessibilityLabel="오늘의 학습"
  accessibilityDescription="새로운 표현 5개"
  accessibilityRole="link"
  bindtap={handleOpen}
>
  <Card.Content>
    <Card.Header overline="추천" title="오늘의 학습" />
    <Card.Body>
      <Card.BodyText>카페에서 쓰는 표현을 연습해 보세요</Card.BodyText>
    </Card.Body>
  </Card.Content>
</Card>;
```

`ChatBubble`은 Bubble 안에 Message만 렌더하고 speaker는 접근성 이름에 사용한다. Speaker,
Avatar, Timestamp, Delivery status, Action의 시각 요소는 상위 Message item이 조합한다.

```tsx
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";
import "@libitums/ui-lynx/chat-bubble/styles.css";

<ChatBubble direction="outgoing" message="곧 도착해요" speaker="나" size="m" delivery="sent" />;
```

`VisualNovelDialog`는 장면 위의 대사 패널과 텍스트만 소유한다. 진행 timer, tap/keyboard
입력, 선택지와 장면 이미지는 제품 host가 소유하며, Avatar는 32px slot으로 조합한다.

```tsx
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";
import "@libitums/ui-lynx/visual-novel-dialog/styles.css";

<VisualNovelDialog
  variant="speech"
  speakerName="Aria"
  line="We meet again under the moonlight."
  accessibilityLabel="Aria: We meet again under the moonlight."
/>;
```

Typewriter의 `visibleCharacterCount`는 대사 전환 시점의 상태 경합에도 안전하도록 현재 문장 길이
범위로 clamp한다. 번역된 접근성 문장 형식이 필요하면 호스트가 `accessibilityLabel`을 제공한다.

`TextField`는 native 단일 행 입력을 사용하며 label 또는 `accessibilityLabel` 중 하나를
필수로 받는다. Prefix/Suffix/Icon/Action, Helper/Error, Counter를 선택적으로 조합하고
Disabled → ReadOnly → Error → Focused → Content 순서로 시각 상태를 결정한다.

```tsx
import { TextField } from "@libitums/ui-lynx/text-field";
import "@libitums/ui-lynx/text-field/styles.css";

<TextField
  label="이메일 주소"
  qualifier="필수"
  purpose="email"
  placeholder="예: name@example.com"
  supporting={{ kind: "helper", message: "로그인할 주소를 입력해 주세요." }}
/>;
```

`Tooltip`은 Message와 배치 표현만 소유한다. 트리거와 pointer/focus/press/programmatic 열기,
ESC·뒤로가기·outside tap dismiss, Auto timer는 제품 host가 소유한다. host가 trigger, bubble,
boundary의 측정을 모두 완료한 뒤 geometry를 `resolveTooltipLayout`에 넘기면 Flip·Shift와 Arrow
fallback 결과를 `layout`으로 전달할 수 있다. 측정 전에는 resolver를 호출하지 않고 CSS 배치를 쓴다.

```tsx
import { Tooltip, resolveTooltipLayout } from "@libitums/ui-lynx/tooltip";
import "@libitums/ui-lynx/tooltip/styles.css";

const layout = resolveTooltipLayout({ trigger, bubble, boundary, placement: "top" });
<Tooltip message="힌트를 확인해 보세요" placement="top" tone="brand" layout={layout} />;
```

`RoundButton`은 root와 전용 subpath에서 같은 구현과 타입을 내보낸다. 아이콘 전용 control이므로
비어 있지 않은 `accessibilityLabel`을 반드시 제공한다.

```tsx
import info02 from "@libitums/icons/lynx/info-02";
import { RoundButton } from "@libitums/ui-lynx/round-button";
// 또는: import { RoundButton } from "@libitums/ui-lynx";
import "@libitums/ui-lynx/styles.css";

<RoundButton
  accessibilityLabel="정보"
  icon={info02}
  variant="brand"
  size="m"
  bindtap={handleInfo}
/>;
```

## 공개 진입점

- `@libitums/ui-lynx`
- `@libitums/ui-lynx/button`
- `@libitums/ui-lynx/back-header`
- `@libitums/ui-lynx/status-indicator`
- `@libitums/ui-lynx/round-button`
- `@libitums/ui-lynx/round-button/styles.css`
- `@libitums/ui-lynx/progress-header`
- `@libitums/ui-lynx/page-indicator`
- `@libitums/ui-lynx/bottom-navigator`
- `@libitums/ui-lynx/bottom-navigator/styles.css`
- `@libitums/ui-lynx/bottom-sheet`
- `@libitums/ui-lynx/bottom-sheet/styles.css`
- `@libitums/ui-lynx/step-indicator`
- `@libitums/ui-lynx/step-indicator/styles.css`
- `@libitums/ui-lynx/dialog`
- `@libitums/ui-lynx/dialog/styles.css`
- `@libitums/ui-lynx/overlay`
- `@libitums/ui-lynx/overlay/styles.css`
- `@libitums/ui-lynx/answer-label`
- `@libitums/ui-lynx/answer-label/styles.css`
- `@libitums/ui-lynx/avatar`
- `@libitums/ui-lynx/avatar/styles.css`
- `@libitums/ui-lynx/card`
- `@libitums/ui-lynx/card/styles.css`
- `@libitums/ui-lynx/compact-numeric-input`
- `@libitums/ui-lynx/compact-numeric-input/styles.css`
- `@libitums/ui-lynx/fog`
- `@libitums/ui-lynx/fog/styles.css`
- `@libitums/ui-lynx/chat-bubble`
- `@libitums/ui-lynx/chat-bubble/styles.css`
- `@libitums/ui-lynx/visual-novel-dialog`
- `@libitums/ui-lynx/visual-novel-dialog/styles.css`
- `@libitums/ui-lynx/text-field`
- `@libitums/ui-lynx/text-field/styles.css`
- `@libitums/ui-lynx/tooltip`
- `@libitums/ui-lynx/tooltip/styles.css`
- `@libitums/ui-lynx/option-selector`
- `@libitums/ui-lynx/option-selector/styles.css`
- `@libitums/ui-lynx/learning-unit`
- `@libitums/ui-lynx/learning-unit/styles.css`
- `@libitums/ui-lynx/styles.css`
- `@libitums/ui-lynx/progress-header.css`
- `@libitums/ui-lynx/page-indicator.css`

`ProgressHeader` 구현은 `src/progress-header/`에서 공개 타입과 순수 함수를 함께
소유하는 `progress-header.contract.ts`, ReactLynx component, barrel, stylesheet,
PascalCase unit/UI tests를 함께 관리한다. 공개 subpath는 폴더 구조와 무관하게
`@libitums/ui-lynx/progress-header`로 유지한다.

`PageIndicator`도 `src/page-indicator/`에서 공개 타입과 순수 함수를 합친
`page-indicator.contract.ts`, ReactLynx component, barrel, stylesheet, PascalCase unit/UI tests를
함께 관리한다. 방어적 렌더
상한은 공개 `PAGE_INDICATOR_MAX_PAGE_COUNT` 100이며 더 큰 입력은 item, 현재 위치와 접근성
label을 같은 canonical count로 clamp한다.

## 컴포넌트 파일 규칙

새 컴포넌트와 기존 컴포넌트 정리는
[`docs/component-file-conventions.md`](./docs/component-file-conventions.md)의 디렉터리·파일명
규칙을 따른다. 공개 컴포넌트 스물두 개 모두 `<component>.contract.ts`에 공개
타입과 순수 계약 로직을 함께 두고 PascalCase component test 이름을 쓴다.

일반 소비자는 aggregate `@libitums/ui-lynx/styles.css`를 Lynx 진입점에서 한 번 import한다.
선택적 소비자는 목록의 component 전용 CSS 진입점을 import할 수 있다. 패키지는
ReactLynx를 번들하지 않고 `>=0.123.0 <0.126.0` peer로 요구한다.
`pnpm --filter @libitums/ui-lynx pack:check`는 실제 tarball에 컴파일된 JSX·선언·CSS,
canonical contract, README와 docs만 들어가고 generic contract/logic 산출물이 없는지
검증한다. package integration test도 이 부재 계약을 스물두 subpath 전체에서 확인한다.

AnswerLabel은 `components/indicator/answer-label.md`의 Result·Emphasis·Size 독립 조합을
따른다. Solid는 고대비 strong surface, Subtle은 semantic feedback surface를 사용하고 S/M/L은
각각 32/40/48px 최소 높이와 16/20/24px icon을 사용한다. Pending은 icon 공간 자체를
렌더하지 않으며 Correct·Incorrect icon은 장식 자손으로 숨긴다. 기준 design-system revision은
`261f525f7b4eb7c09994ef31ee40455e3e881d28`이다.

StepIndicator는 최신 파일 규칙에 따라 공개 타입과 `getStepIndicatorContract` 순수 로직을
`step-indicator.contract.ts` 하나에서 소유하고 단위 테스트는
`StepIndicator.unit.test.ts`에 둔다.

Dialog는 `components/dialog.md` revision `133322d7b080e464303a38456f4da45c8accdda9`의
중앙 배치, 1~2개 세로 action과 reduced motion 계약을 따른다. surface는 제품 결정에 따라
원본 floating surface 대신 `color.white`를 사용한다. action이
하나면 Brand, 둘이면 Brand/Subtle 순서이며 이는 main action을 `brand.primary`로 사용하라는
제품 결정을 원본 Neutral 규칙보다 우선한 예외다. 모든 action이 비활성인 진행 불가능한 계약은
거부한다. Scrim은 공용 Overlay를 사용하고 tap handler를 연결하지 않는다.
Card는 design-system `components/card.md` revision
`b53b03ac887bd89ab246f8de1c1d4716900d1c4d`를 따른다. M/L content padding, surface/shadow,
Header·Body·Footer 간격, optional Media clipping과 Interactive pressed/focus 상태를 토큰으로
구현한다. Static은 내부 조합을 그대로 노출하고 Interactive는 Card 하나만 접근성 control로
노출한다.

ChatBubble은 design-system `components/chat-bubble.md` revision
`979e57fec7b38533129da65166109984d2f16686`을 따른다. Incoming/Outgoing, S/M/L, Outgoing의
Default/Sending/Sent/Read/Failed를 닫힌 계약으로 제공하며 Incoming delivery는 항상 Default다.
기본 크기는 M이다. 최대 너비는 280px이고 큰 글자와 긴 문자열도 말줄임하지 않는다.
`speaker`는 보이지 않는 실제 발화자 이름으로 Message와 하나의 접근성 label을 구성한다.
학습 콘텐츠는 비어 있지 않은 `languageTag`를 요구하지만 현재 ReactLynx 0.125 타입과 공식
element API에는 native `lang` 매핑이 없어 `data-language`/`data-lang` metadata까지만 보존한다. 제품
route 채택 때 host의 언어 semantics 연결과 VoiceOver/TalkBack 발음을 별도로 검증해야 한다.

VisualNovelDialog는 Speech/Narration/Thought, Opaque/Translucent, Instant/Typewriter,
Tap/Auto를 독립 축으로 제공한다. Narration은 화자와 Avatar를 허용하지 않고 Auto는 사용자가
멈출 수 있는 host control이 있을 때만 허용한다. Typewriter 중에도 접근성 이름은 전체 문장을
유지한다. 현재 배포 토큰 0.2.0에는 새 `opacity.surface` 변수가 없어
`var(--libitum-opacity-surface, 0.9)` fallback을 사용한다.

TextField는 uncontrolled `defaultValue`를 시작값으로 사용하고 native input event를
`bindinput`, `bindfocus`, `bindblur`, `bindconfirm` callback으로 전달한다. Counter는 Unicode
code point 단위로 계산하며 native `maxlength`와 같은 최댓값을 공유한다. URL purpose는 현재
Lynx input type 지원 범위 때문에 text로, Search는 text와 `confirm-type="search"`로 매핑한다.

Tooltip은 Top/Bottom/Start/End와 Start/Center/End alignment를 논리 방향으로 제공한다. 기본
Bubble ↔ Trigger 간격은 8px이고 최대 너비는 240px이다. Brand는 `brand.primary`, Neutral은
`gray.950`을 사용한다. Bubble과 Arrow는 동일한 surface token을 공유한다. `resolveTooltipLayout`은 16px
경계 안에서 Flip·Shift하고 Arrow가 모서리 12px 여백을 지킬 수 없으면 Arrow를 끈다.

`disabled`와 `loading` Button은 tap을 전달하지 않는다. Back Header의 아이콘·제목 묶음
전체는 일반 tap에 반응한다. ReactLynx/iOS 접근성 트리에서는 중첩 접근성 요소를 피하기 위해
48px 뒤로가기 button과 sibling title header로 분리하며, info는 별도 control로 둔다. Status
Indicator는 점·라벨을 함께 표시하고 줄 전체를 하나의 상태로 알린다.

Brand Button은 design-system의 `brand.primary` #F46B18 surface와 `white` #FFFFFF label·icon·spinner를 사용한다. 이 3.016:1 조합은 design-system Accessibility 문서에서 Default·Pressed·Loading에만 승인한 예외이며, WCAG AA 통과로 기록하지 않는다.
Neutral Button은 원본 `gray.800` 대신 `gray.900` surface를 사용한다.
Loading spinner는 각 variant의 label 색을 따른다. `loading`과 `disabled`를 함께 주면 두
상태를 모두 유지하고 label·spinner를 `border.default`로 표시하되 tap은 전달하지 않는다.

RoundButton은 `neutral | brand` variant와 `s | m | l | xl` size를 제공한다. Default와
Pressed에는 icon을 표시하고, Pressed 동안 원형 surface만 95%로 줄인다. Loading에서는 icon을
12px Spinner로 대체하며 Loading과 Disabled는 tap handler를 연결하지 않는다. 두 상태가 함께면
Disabled trait와 tap 차단이 우선하고 Spinner는 유지한다.

RoundButton의 focusable hit area와 접근성 node는 하나다. S/M/L은 48px, XL은 56px 정사각이며
icon과 Spinner는 장식 자손으로 숨긴다. Loading 접근성 이름에는 `, 로딩 중`이 붙는다. Lynx Web
Storybook은 시각·tap만 확인하므로 native focus ring과 VoiceOver/TalkBack은 제품 route 채택 때
실기기로 검증해야 한다.

StepIndicator는 32px 원과 남는 폭을 같은 비율로 나누는 2px 연결선을 사용한다. Completed,
Current, Upcoming은 현재 단계에서 순수하게 파생되고 연결선은 왼쪽 원의 상태를 따른다. 단계별
원과 선은 접근성 트리에서 숨기며 전체 줄만 현재/전체 단계를 알린다. 시각·상태 계약은
`libitums/design-system`의 `components/indicator/step-indicator.md` revision
`3f7ed6d17df769e37215adb40f7abfc2e1174fd1`을 기준으로 한다.

BottomNavigator item은 최소 48 × 48px focus/tap 영역을 가지며 선택 pill은 60 × 40px이고 bar
배경은 white token을 사용한다. label은 화면에 그리지 않고 선택·badge·disabled reason은
접근성 이름에 합친다. PC에서는 disabled item을 건너뛰어 좌우 이동하며 양 끝 focus를 유지한다.
native 키보드/D-pad 이동과 VoiceOver/TalkBack 낭독은 제품 route 채택 시 실기기로 검증한다.

디자인 시스템에는 M icon 18px과 Spinner 12px에 대응하는 size token이 아직 없다. 두 값은
Round Button 원본의 고정 규격을 직접 사용한 비차단 gap이며, FE token이나 `spacing` token을
새로 만들거나 재해석하지 않는다.

`ProgressHeader`는 `progress`를 0–100으로 한 번 정규화해 percentage와 fill에 같이 쓴다.
fill은 입력 소수 정밀도를 유지하고 보이는 percentage 문자열만 소수 첫째 자리로 제한한다.
0은 fill을 렌더하지 않고, 양수는 최소 8px, 100은 전체 폭이다. exit는 진행 값과 무관하게
항상 활성인 48px button이며 tap마다 `onExit`를 한 번 호출한다. `motion`은 `"standard" |
"reduced"`이고 생략하면 `standard`다. reduced는 progress 전환을 없애지만 host OS 설정을
자동으로 읽지 않으므로 소비 앱이 명시적으로 매핑해야 한다.

Progress Header의 `:focus` ring은 ReactLynx의 best-effort fallback이며 native focus를
보장하지 않는다. 진행 값은 `accessibility-value` 대신 activity와 percentage를 합친 label로
전달한다. `gray.300` track과 `background.secondary`의 대비 1.078:1은 알려진
design-system gap이다. 계약에 없는 token이나 hex로 우회하지 않으며 native focus,
reduced-motion 매핑, 최대 텍스트 크기는 실제 host에서 확인한다.
