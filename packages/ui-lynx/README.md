# @libitums/ui-lynx

libitum 디자인 시스템 토큰과 아이콘을 사용하는 ReactLynx 컴포넌트 패키지다. 현재 공개
컴포넌트는 `Button`, `BackHeader`, `StatusIndicator` 세 가지다.

시각·상태 계약은 `libitums/design-system`의 대응 `components/**/*.md`가 원본이다. 현재
구현은 revision `87c1b0d2b745429be9b586cef772deb6c8707ab6`을 기준으로 보정했다.

```tsx
import { Button } from "@libitums/ui-lynx/button";
import "@libitums/ui-lynx/styles.css";

<Button label="계속하기" variant="brand" bindtap={handleContinue} />;
```

## 공개 진입점

- `@libitums/ui-lynx`
- `@libitums/ui-lynx/button`
- `@libitums/ui-lynx/back-header`
- `@libitums/ui-lynx/status-indicator`
- `@libitums/ui-lynx/styles.css`

스타일은 소비 앱의 Lynx 진입점에서 한 번 import한다. 패키지는 ReactLynx를 번들하지 않고
`>=0.123.0 <0.126.0` peer로 요구한다. `pnpm --filter @libitums/ui-lynx pack:check`는 실제
tarball에 컴파일된 JSX·선언·CSS와 README만 들어가는지 검증한다.

`disabled`와 `loading` Button은 tap을 전달하지 않는다. Back Header의 아이콘·제목 묶음
전체는 일반 tap에 반응한다. ReactLynx/iOS 접근성 트리에서는 중첩 접근성 요소를 피하기 위해
48px 뒤로가기 button과 sibling title header로 분리하며, info는 별도 control로 둔다. Status
Indicator는 점·라벨을 함께 표시하고 줄 전체를 하나의 상태로 알린다.

FE override로 Brand Button은 `brand.strong` surface와 `white` label·icon·spinner를 사용한다.
Neutral Button은 원본 `gray.800` 대신 `gray.900` surface를 사용한다.
Loading spinner는 각 variant의 label 색을 따른다. `loading`과 `disabled`를 함께 주면 두
상태를 모두 유지하고 label·spinner를 `border.default`로 표시하되 tap은 전달하지 않는다.
