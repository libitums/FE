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

- 폴더는 **필요해질 때 만든다.** 지금 있는 것은 `app/`과 `screens/`뿐이다
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

([ADR-0003 D6](../adr/0003-workspace-and-directory-structure.md),
[ADR-0006 D4](../adr/0006-command-interface-and-test-layers.md))

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

## import

- 워크스페이스 내부 참조는 항상 `workspace:*`. 버전 범위를 쓰지 않는다.
- 방향은 `apps/* → packages/*` 한 쪽뿐. `packages/* → apps/*`와 `apps/* → apps/*`는 금지.
- 패키지 진입점은 `exports`로 명시한다. `@libitums/x/src/...` 같은 내부 경로를 열지 않는다.
- `lib/`는 UI를 import하지 않는다.

([ADR-0004 D3·D4·D5](../adr/0004-package-boundaries-and-dependency-direction.md))

## 스타일

- 토큰은 **CSS 커스텀 프로퍼티로만** 쓴다. `var(--color-bg-surface)`이지
  `import { spacing } from '@libitum/design-tokens'`가 아니다.
- **값을 하드코딩하지 않는다.** 새 토큰이 필요하면 design-system에 변경을 요청한다.
- 원본 JSON·Markdown·SVG를 복사하거나 fork하지 않는다. 패키지로만 소비한다.
- 컴포넌트 스펙과 구현이 다르면 **design-system의 스펙이 기준**이다.
- `var(--오타)`는 조용히 무시된다. 테스트가 못 잡으므로 **눈으로 확인한다.**

([ADR-0011 D1·D4](../adr/0011-design-system-consumption.md))

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
