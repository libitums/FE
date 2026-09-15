# @libitums/ui-lynx

libitum 디자인 시스템 토큰과 아이콘을 사용하는 ReactLynx 컴포넌트 패키지다. 현재 공개
컴포넌트는 `Button`, `BackHeader`, `StatusIndicator`, `RoundButton`, `ProgressHeader`,
`PageIndicator`, `BottomNavigator`, `StepIndicator`, `BottomSheet` 아홉 가지다.

시각·상태 계약은 `libitums/design-system`의 대응 `components/**/*.md`가 원본이다. 현재
구현은 revision `87c1b0d2b745429be9b586cef772deb6c8707ab6`을 기준으로 보정했다.
Bottom Navigator는 2026-09-11의 `main` revision
`2144145cd7ffb5777cf2b74e2fec5474eb0adc14`를 기준으로 추가했다.
Bottom Sheet는 `components/bottom-sheet.md` revision
`3f7ed6d17df769e37215adb40f7abfc2e1174fd1`을 기준으로 추가했다.

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
규칙을 따른다. 공개 컴포넌트 아홉 개 모두 `<component>.contract.ts`에 공개
타입과 순수 계약 로직을 함께 두고 PascalCase component test 이름을 쓴다.

일반 소비자는 aggregate `@libitums/ui-lynx/styles.css`를 Lynx 진입점에서 한 번 import한다.
선택적 소비자는 목록의 component 전용 CSS 진입점을 import할 수 있다. 패키지는
ReactLynx를 번들하지 않고 `>=0.123.0 <0.126.0` peer로 요구한다.
`pnpm --filter @libitums/ui-lynx pack:check`는 실제 tarball에 컴파일된 JSX·선언·CSS,
canonical contract, README와 docs만 들어가고 generic contract/logic 산출물이 없는지
검증한다. package integration test도 이 부재 계약을 아홉 subpath 전체에서 확인한다.

StepIndicator는 최신 파일 규칙에 따라 공개 타입과 `getStepIndicatorContract` 순수 로직을
`step-indicator.contract.ts` 하나에서 소유하고 단위 테스트는
`StepIndicator.unit.test.ts`에 둔다.

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
