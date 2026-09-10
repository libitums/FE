# @libitums/ui-lynx

libitum 디자인 시스템 토큰과 아이콘을 사용하는 ReactLynx 컴포넌트 패키지다. 현재 공개
컴포넌트는 `Button`, `BackHeader`, `StatusIndicator` 세 가지다.

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

`disabled`와 `loading` Button은 tap을 전달하지 않는다. Back Header의 back/info affordance와
Status Indicator에는 Lynx 접근성 label/traits가 포함되어 있다.
