# @libitums/ui-lynx

libitum 디자인 시스템 토큰과 아이콘을 사용하는 ReactLynx 컴포넌트 패키지다. 현재 공개
컴포넌트는 `Button`, `BackHeader`, `StatusIndicator`, `RoundButton` 네 가지다.

시각·상태 계약은 `libitums/design-system`의 대응 `components/**/*.md`가 원본이다. 현재
구현은 revision `87c1b0d2b745429be9b586cef772deb6c8707ab6`을 기준으로 보정했다.

```tsx
import { Button } from "@libitums/ui-lynx/button";
import "@libitums/ui-lynx/styles.css";

<Button label="계속하기" variant="brand" bindtap={handleContinue} />;
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
- `@libitums/ui-lynx/styles.css`

스타일은 소비 앱의 Lynx 진입점에서 한 번 import한다. 패키지는 ReactLynx를 번들하지 않고
`>=0.123.0 <0.126.0` peer로 요구한다. `pnpm --filter @libitums/ui-lynx pack:check`는 실제
tarball에 컴파일된 JSX·선언·CSS와 README만 들어가는지 검증한다.

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

디자인 시스템에는 M icon 18px과 Spinner 12px에 대응하는 size token이 아직 없다. 두 값은
Round Button 원본의 고정 규격을 직접 사용한 비차단 gap이며, FE token이나 `spacing` token을
새로 만들거나 재해석하지 않는다.
