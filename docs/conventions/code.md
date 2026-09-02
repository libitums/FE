# 코드 규약

무엇을 해야 하는지만 짧게 적는다. 왜 그런지는 링크된 ADR에 있다.

## 폴더

```text
apps/mobile/src/
  app/          진입점. 루트 구성 — 화면 전환, 에러 경계, 프로바이더
  screens/      화면 단위. 확정된 화면 목록과 1:1
  components/   화면 둘 이상이 쓰는 컴포넌트만
  lib/          순수 로직·API 클라이언트. UI를 import하지 않는다
  styles/       전역 스타일. 토큰 값은 여기 두지 않는다 — 패키지에서 온다
```

- 폴더는 **필요해질 때 만든다.** 지금 있는 것은 `app/` · `screens/` · `lib/` 셋이다
  ([ADR-0003 D5](../adr/0003-workspace-and-directory-structure.md)).
- `packages/`와 `tooling/`은 **만들지 않는다.** 두 번째 소비자가 실제로 나타날 때 만든다
  ([ADR-0004 D2](../adr/0004-package-boundaries-and-dependency-direction.md),
  [ADR-0003 D2](../adr/0003-workspace-and-directory-structure.md)).
- 문서는 `docs/` 아래, 산출물은 그것을 만든 앱 안(`apps/mobile/dist/`)
  ([ADR-0003 D4](../adr/0003-workspace-and-directory-structure.md)).
- 스크립트 디렉터리를 만들지 않는다. `package.json`의 `scripts`로 충분하다.

## 네이밍

| 대상 | 규칙 | 예 |
|---|---|---|
| 디렉터리 | kebab-case | `src/screens/order-detail/` |
| React 컴포넌트 파일 | PascalCase, **export 이름과 일치** | `OrderDetailScreen.tsx` |
| 그 외 파일 | kebab-case | `api-client.ts`, `use-navigation.ts` |
| 화면 컴포넌트 | `~Screen` 접미사 | `HomeScreen` |
| 훅 | `use~` 접두사, 파일은 `use-~` | `useNavigation` / `use-navigation.ts` |
| 테스트 파일 | `*.unit.test.ts` / `*.ui.test.tsx` / `*.integration.test.tsx` | 계층이 파일명에 드러난다 |
| CSS 파일 | 짝이 되는 컴포넌트 파일명의 kebab-case, **같은 폴더** | `HomeScreen.tsx` → `home-screen.css` |
| CSS 클래스 | 블록 = CSS 파일명. 하위는 `블록-요소` **한 겹만**. BEM의 `__`·`--`를 쓰지 않는다 | `.home-screen-title` |
| `data-testid` | `블록-역할`. 클래스 블록과 **같은 접두사**를 쓰고 축약하지 않는다 | `home-screen-title` |
| 상대 import | **확장자를 붙이지 않는다** | `./HomeScreen` (`./HomeScreen.js` 아님) |

- **테스트 파일은 소스와 같은 폴더에 둔다.** `test/` 트리를 만들지 않는다 — 계층은
  파일명이 가른다.
- `data-testid`는 **테스트가 실제로 질의하는 요소에만** 붙인다.

([ADR-0003 D6·D7](../adr/0003-workspace-and-directory-structure.md),
[ADR-0006 D4·D7](../adr/0006-command-interface-and-test-layers.md))

## 무엇을 바꾸면 어느 테스트를 쓰나

| 바꾼 것 | 쓸 것 |
|---|---|
| 순수 함수·리듀서를 만들거나 반환값을 바꿈 | `unit` |
| **컴포넌트를 만들거나 렌더 결과·상호작용을 바꿈** | **`ui` — 같은 PR에서** |
| 모듈·훅의 협력, 인터랙션 이후 흐름을 바꿈 | `integration` |
| 내부 리팩터링 — 관찰 가능한 동작이 그대로 | 새로 쓰지 않는다 |

기준은 *"눈에 보이는가"* 가 아니라 **"관찰 가능한 동작이 바뀌는가"** 다.

**`ui`는 어떻게 보이는지를 덮지 못한다.** 계산된 스타일과 레이아웃을 단언할 수 없어
렌더 결과에는 클래스 이름만 남는다. 색·간격·정렬은 `docs/e2e/`의 수동 확인 몫이다.

강제 수단은 없다. PR diff를 읽을 때 컴포넌트 변경에 `ui` 테스트가 따라왔는지 본다.

([ADR-0006 D4](../adr/0006-command-interface-and-test-layers.md))

## jest-dom 매처는 절반만 쓴다

`ui`·`integration`은 `@testing-library/jest-dom` 매처를 쓴다. Lynx 요소는
`LynxElement extends HTMLElement`이고 실제로 jsdom 트리에 붙어서
(`document.body.contains(el)` → true) 구조 매처가 그대로 동작한다.

| 쓴다 | 쓰지 않는다 |
|---|---|
| `toBeInTheDocument` · `not.toBeInTheDocument` | `toBeVisible` |
| `toHaveAttribute` | `toHaveStyle` |
| `toHaveTextContent` | `toHaveClass` |
| `toContainElement` | 폼 계열 (`toBeChecked` · `toHaveValue`) |

오른쪽은 **계산된 스타일에 의존한다.** jsdom은 Lynx 스타일을 계산하지 않으므로 통과해도
의미가 없고, 더 나쁘게는 **거짓 확신을 준다** — jsdom 기본값으로 항상 통과할 수 있다.
바로 위 절이 말한 "`ui`는 어떻게 보이는지를 덮지 못한다"와 같은 선이다.

### 쿼리를 무엇으로 고르나

| 하려는 것 | 쓰는 것 |
|---|---|
| 존재 기대 | `getByTestId(...)` — **쿼리 자체가 단언이다** |
| 부재 단언 | `expect(queryByTestId(...)).not.toBeInTheDocument()` |
| 속성·텍스트 | `expect(getByTestId(...)).toHaveAttribute(...)` |

`getByTestId`는 못 찾으면 예외를 던지고, 그 메시지가 **무엇을 찾으려 했는지와 그 시점에
실제로 무엇이 있었는지를 DOM째로** 보여준다. 존재를 기대하는 자리에서는 이게 가장 좋은
실패 메시지다.

부재는 `getBy`로 확인할 수 없다 — 못 찾는 순간 예외가 나서 단언까지 가지 못한다.
그때만 `queryBy`를 쓴다. 반대로 존재를 `queryBy`로 확인하면 실패 메시지가
`Received has value: null` 한 줄로 줄어든다.

**`expect(screen.getByTestId(X)).toBeTruthy()`를 쓰지 않는다.** `getByTestId`가 이미
예외를 던지므로 아무것도 확인하지 않는다. 대신 그 요소에 대한 **실제 단언**
(`toHaveAttribute`·`toHaveTextContent`)을 쓴다.

`getBy` 뒤의 `toBeInTheDocument()`도 같은 의미에서 실패 조건을 더하지는 않는다.
**읽는 사람에게 "이 요소가 있는지 보는 중"이라고 알리는 표시**로만 쓴다 — 검사를
강화하는 것으로 착각하지 않는다.

**강제 수단은 없다.** oxlint 규칙으로 막을 수 없어 PR diff를 읽을 때 본다.
등록 위치는 `apps/mobile/vitest.setup.ts`이고 이유가 그 주석에 있다.

## import

- 워크스페이스 내부 참조는 항상 `workspace:*`. 버전 범위를 쓰지 않는다.
- 방향은 `apps/* → packages/*` 한 쪽뿐. `packages/* → apps/*`와 `apps/* → apps/*`는 금지.
- 패키지 진입점은 `exports`로 명시한다. `@libitums/x/src/...` 같은 내부 경로를 열지 않는다.
- `lib/`는 UI를 import하지 않는다.

([ADR-0004 D3·D4·D5](../adr/0004-package-boundaries-and-dependency-direction.md))

## 스타일

- 토큰은 **CSS 커스텀 프로퍼티로 쓴다.** 변수 이름은 패키지가 정의한 것만 —
  **접두사는 예외 없이 `--libitum-`이다.** `var(--libitum-color-background-primary)`이지
  `var(--color-bg-surface)`가 아니다. **다른 이름 계열을 만들지 않는다.**
- **예외는 아이콘 색 하나.** Lynx `<svg>`는 CSS `color`를 읽지 않으므로
  `current-color` 속성에 TS 상수를 넘긴다 — `import { color } from '@libitums/design-tokens'`.
  **이 예외를 선례로 쓰지 않는다.** 나머지 시각 값은 전부 CSS다.
- 시각 값은 **컴포넌트와 1:1인 CSS 파일**에만 둔다. TSX에는 `className`만 두고
  **인라인 `style`을 쓰지 않는다.**
- **값을 하드코딩하지 않는다.** 필요한 토큰이 패키지에 없으면 이름을 지어내지 말고
  design-system에 변경을 요청한다.
- 원본 JSON·Markdown·SVG를 복사하거나 fork하지 않는다. 패키지로만 소비한다.
- 컴포넌트 스펙과 구현이 다르면 **design-system의 스펙이 기준**이다.
- `var(--오타)`는 조용히 무시된다. 접두사가 틀린 것은 **`pnpm lint`의 접두사 검사**가
  잡는다 (ADR-0014 D8 — `lint:tokens`. `apps/mobile/src/**/*.css`를 훑는다).
  **접두사가 맞는 오타는 여전히 눈으로만** 발견된다(`docs/e2e/`).

([ADR-0014 D1·D2·D4·D8](../adr/0014-design-system-consumption-verified.md),
[ADR-0015 D2](../adr/0015-component-primitives-and-style-application.md))

## 컴포넌트

- **Lynx 내장 요소(`<view>`·`<text>`·`<svg>`)를 화면에서 직접 쓴다.** 래퍼
  프리미티브를 만들지 않는다.
- 승격은 사용처가 늘 때만 — **화면 1개면 그 화면 폴더, 화면 2개면 `src/components/`,
  앱 2개면 `packages/`.** 미리 올리지 않는다. 세는 단위는 **화면**이지 렌더 횟수가 아니다.

([ADR-0015 D1·D3](../adr/0015-component-primitives-and-style-application.md))

## 앱 내부

- **상태**: React 내장(`useState`·`useReducer`·`useContext`)만 쓴다. 서버 상태와
  클라이언트 상태를 개념적으로 구분해서 부른다. 영속 저장소에 넣는 것은 로그인 토큰뿐이다.
- **데이터**: `src/lib/api-client.ts` 한 파일에 모은다. **서버 응답을 전역 store에
  저장하지 않는다.** Lynx의 `fetch`는 CORS·redirect·keepalive·FormData·Blob이 없다.
- **화면 전환**: `src/app/navigation.ts`의 리듀서가 소유한다. 화면 파라미터는 union의
  필드로만 넘긴다. 화면이 스택 배열을 직접 읽거나 쓰지 않는다.
- **에러 경계**: 루트에 하나뿐이다. 네트워크 실패는 여기로 올리지 않고 화면 안에서 재시도한다.
- 모든 화면에 **화면 내 back 수단**을 둔다. 하드웨어 뒤로가기에만 의존하지 않는다.

([ADR-0007](../adr/0007-app-internals-state-routing-data-errors.md))

라이브러리(zustand · TanStack Query · 라우터)를 넣는 조건은 ADR-0007에 수치로 적혀 있다.
조건이 오면 넣고, 오기 전에 넣지 않는다.
