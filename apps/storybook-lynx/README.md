# Storybook Lynx catalog

브라우저 Storybook manager와 Controls/Actions를 사용하되, Canvas는 DOM으로 흉내 내지 않고
Rspeedy가 만든 Lynx Web bundle을 `<lynx-view>`에서 실행한다. 기반 통합 방식은
[`lynx-community/storybook-lynx`](https://github.com/lynx-community/storybook-lynx)의
`storybook-lynx-rsbuild` framework다.

컴포넌트의 시각·상태 계약은 `libitums/design-system`의 `components/button.md`,
`components/header/back-header.md`, `components/header/progress-header.md`,
`components/indicator/status-indicator.md`, `components/indicator/page-indicator.md`를
비롯해 `components/round-button.md`, `components/bottom-navigator.md`를 기준으로 하며, 최초 보정 revision은
`87c1b0d2b745429be9b586cef772deb6c8707ab6`이다.
Step Indicator는 `components/indicator/step-indicator.md` revision
`3f7ed6d17df769e37215adb40f7abfc2e1174fd1`을 기준으로 한다.
Bottom Navigator는 2026-09-11의 `main` revision
`2144145cd7ffb5777cf2b74e2fec5474eb0adc14`를 기준으로 추가했다.
Chat Bubble은 `components/chat-bubble.md` revision
`979e57fec7b38533129da65166109984d2f16686`을 기준으로 한다.
Text Field는 `components/text-field.md` revision
`1ba6b55103663c407f073f9ede3a2e700bf9b722`을 기준으로 한다.

```sh
nvm use
pnpm storybook:lynx
```

기본 URL은 `http://localhost:6006`이다. 포트가 점유되면 Storybook이 출력한 URL을 따른다.
명령은 Button·Back Header·Status Indicator·Round Button·Progress Header·Page Indicator·Bottom
Navigator·Step Indicator·Chat Bubble·Text Field의 실제 `.web.bundle` 열 개를 만들고, Rspeedy watch와 Storybook dev
server를 함께 유지한다.

Storybook의 dev/build는 `@libitums/ui-lynx`를 먼저 build하고 package의 공개 `dist` export를
소비한다. `tsconfig.typecheck.json`의 source mapping은 코드 생성을 하지 않는 타입 검사에만
쓰며 Rspeedy 기본 설정에는 적용하지 않는다.

`pnpm --filter @libitums/storybook-lynx test`도 먼저 `@libitums/ui-lynx`와 정적 Storybook을
build한 뒤 산출물을 검사하므로 이전 실행에서 남은 `dist` 없이 동작한다.

## 카탈로그

- Components/Button — Default, Brand, Loading, Disabled
- Components/Back Header — Default, Title Only
- Components/Status Indicator — Completed, In Progress, Needs Retry, Locked
- Components/Round Button — Default, Brand, Loading, Disabled
- Components/Progress Header — Default, Zero, Minimum Fill, Complete, Reduced Motion
- Components/Page Indicator — Default, First, Last, Single, Empty
- Components/Bottom Navigator — Default, Long Accessibility Label, All Items, Disabled
- Components/Step Indicator — First, Middle, Last
- Components/Chat Bubble — Incoming, Outgoing, Small, Large, Failed, Learning Language, Long Content
- Components/Text Field — Default, Filled, Error, ReadOnly, Disabled, Prefix And Suffix, Trailing Action, Counter

Controls 변경은 `<lynx-view>.updateData()`를 통해 ReactLynx `useInitData()`에 전달된다.
Button·Round Button tap과 Back Header back/info tap은
`NativeModules.bridge.call("STORYBOOK_ACTION", …)`로 Storybook Actions에 돌아온다.
Round Button Controls는 `accessibilityLabel`, 닫힌 icon key `info-02`, variant, size, disabled,
loading을 제공한다. 활성 tap은 `onTap` Action을 한 번 기록하고 Loading·Disabled tap은 기록하지
않는다. 함수와 SVG XML은 init data 직렬화 경계를 넘지 않는다.
Progress Header는 `title`, `activity`, `progress`,
`exitAccessibilityLabel`, `motion` Controls를 직렬화해 같은 경계로 전달하고, exit tap은
`onExit` bridge Action으로 돌아온다. Lynx entry는
`@libitums/ui-lynx/progress-header` 공개 subpath를 import하며 Canvas는
`progress-header.web.bundle`을 실행한다. `NativeModules`가 없는 정적 분석·테스트 환경에서는
guard가 bridge 호출을 건너뛴다.

Bottom Navigator Controls는 preset, selectedId, disabledLast와 320/390px viewport를 제공한다.
enabled item tap은 선택 pill을 해당 item으로 옮기고 `onSelect` Action에 id를 한 번 기록한다.
disabled item은 선택 상태와 Action을 변경하지 않으며 별도 `disabledReason`을 접근성 이름에
합친다. runtime은 `@libitums/ui-lynx/bottom-navigator` 공개 subpath만 소비한다.

Step Indicator Controls는 `currentStep`과 `totalSteps` 정수만 전달하며 runtime에서 2–5단계,
1-based 현재 단계 계약으로 정규화한다. `totalSteps`가 2–5 정수가 아니면 4를 사용하고,
`currentStep`이 1–정규화된 `totalSteps` 정수가 아니면
`Math.min(2, totalSteps)`를 사용한다. Action bridge는 제공하지 않는다.

Chat Bubble Controls는 message, speaker, direction, size, delivery, contentLanguage와 languageTag를
직렬화한다. Incoming delivery는 runtime에서 Default로 고정한다. 학습 언어인데 languageTag가
비어 있으면 Storybook 전용 fallback `en`을 사용한다. Bubble은 정적 텍스트이므로 Action bridge를
제공하지 않는다.

Text Field Controls는 label, qualifier, defaultValue, placeholder, purpose, availability,
supporting, counter와 adornment를 JSON 값으로 전달한다. icon과 Trailing Action callback은 Lynx
runtime 안에서 조립하며 실제 입력은 native `<input>`이 소유한다.

## 한계

Lynx Web은 props, 상태, 레이아웃, 토큰과 bridge 상호작용을 빠르게 확인하는 카탈로그다.
Canvas는 시각·tap 확인 표면이며 브라우저 DOM의 키보드·스크린리더 접근성 검증으로 세지
않는다. iOS/Android 고유 글꼴 렌더링, VoiceOver/TalkBack의 실제 읽기 순서, native gesture
차이, safe-area/host 통합도 검증하지 않는다. 현재 제품 소비 route가 없어 native 접근성은
미검증이지만 이번 package/catalog 납품에는 비차단이다. package 채택 릴리스에서는 실제
native host와 실기기 검증이 필수다. 특히 Progress Header의 ReactLynx `:focus` fallback,
host OS reduced-motion→`motion` prop 매핑, `accessibility-value` 대신 쓰는 caption label,
최대 텍스트 크기는 Storybook 통과로 닫지 않는다. `gray.300` track과
`background.secondary`의 1.078:1 대비도 알려진 design-system gap이며 카탈로그에서 임의
token이나 hex로 보정하지 않는다.
Bottom Navigator의 native D-pad 이동, 양 끝 focus 유지와 선택 상태 낭독도 Storybook 통과로
대체하지 않는다.
Step Indicator의 단일 상태 label 낭독과 숫자 원·연결선 자손 가림도 제품 route 채택 전에는
native VoiceOver/TalkBack 검증이 남으며 이번 package/catalog 납품에는 비차단이다.
Chat Bubble의 실제 화자+Message 단일 낭독, delivery value, RTL 논리 방향과 학습 언어 발음도
제품 route 채택 전 native 검증이 남는다.
Text Field의 키보드 종류, selection/copy, focus ring, invalid/required 관계와 VoiceOver/TalkBack
낭독도 제품 route 채택 전 native 검증이 남는다.
