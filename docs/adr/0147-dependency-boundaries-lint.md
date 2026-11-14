# ADR-0147 — 모노레포 의존 방향을 린트로 강제 (core의 브라우저 전역 · UI · 어댑터 import 금지)

- 상태: **채택.**
- 날짜: 2026-11-14.
- **사용자 결정:** 「모노 레포 의존 방향 규칙 린트로 추가하고 core에서 브라우저 전역이나 어댑터 · UI 가져오는 import 금지 CI 추가」.
- 이어받는 결정: [ADR-0004](0004-package-boundaries-and-dependency-direction.md) D1 · D4(앱은 잎, packages → apps 금지), [ADR-0083](0083-web-trial-and-episode-core.md)(episode-core 금지 import).

## 맥락
ADR-0004의 의존 방향 가운데 도구가 지키던 것은 순환 금지(`import/no-cycle` · `cycle:check`)뿐이었다. 앱 → 앱 · 패키지 → 앱은 문서 규칙이었고,
core 패키지(`episode-core` · `companion-contract`)의 금지 import는 패키지 안 단위 테스트(`package-boundary.unit.test.ts`)가 일부(Lynx · ui-lynx · node · 앱 경로)만 봤다.
**브라우저 · 호스트 전역**(`window` · `fetch` · `lynx` …)은 아무도 보지 않았다 — core가 웹(랜딩) · 앱(Lynx) · 서버에서 함께 읽혀야 하는데 한쪽 전역에 기대면 다른 쪽에서 런타임에 깨진다.

## 결정
`pnpm lint:boundaries`(`devtools/dependency-boundaries/check.mjs`)를 `pnpm lint`에 넣는다 — CI 「Format, types, lint」가 돈다. 규칙의 테스트(`test:dependency-boundaries`)는 `test:rest`(CI 「Tests · rest」).

| 규칙 | 대상 | 막는 것 |
|---|---|---|
| **D1** package.json | 모든 workspace의 dependencies · peer · optional | 앱(`apps/*`) 의존(앱은 잎), core → core 밖 workspace, core → UI · 어댑터 외부 패키지 |
| **D2** import 방향 | 모든 workspace 소스(테스트 포함) | 다른 workspace를 상대 경로로 import, 앱 패키지 import |
| **D3** core import | core 비테스트 소스 | `@lynx-js/*` · `@libitums/ui-lynx` · `@libitums/icons` · `@libitums/design-tokens` · `react` · `react-dom` · `astro` · `@supabase/*` · `node:*` |
| **D4** core 전역 | core 비테스트 소스 | `window` · `document` · `navigator` · `localStorage` · `sessionStorage` · `location` · `history` · `fetch` · `XMLHttpRequest` · `WebSocket` · `EventSource` · `indexedDB` · `requestAnimationFrame` · `cancelAnimationFrame` · `lynx` · `NativeModules` · `SystemInfo` |

- 층: core = `packages/episode-core` · `packages/companion-contract`, ui = `packages/ui-lynx`, app = `apps/*`(package.json이 있는 것). 새 패키지는 기본 ui 층 — core로 둘 때 `policy.mjs`의 `LAYERS`에 적는다.
- 소스는 TypeScript 구문 트리로 읽는다(주석 · 문자열 · 속성 이름 · 지역 선언은 세지 않음). `.astro`는 import 문만 글자로.
- 테스트 · 테스트 지원 파일은 D3 · D4에서 빠진다(node:fs 등). D2(방향)는 테스트도 지킨다.
- core에 전역 · 어댑터가 필요하면 **인자로 주입**한다(예: 앱 · 랜딩이 fetch를 넘김).

## 버린 대안
1. **oxlint `no-restricted-imports` · `no-restricted-globals`(overrides)** — 쓰는 oxlint 1.80에서 두 규칙 설정을 확인하지 못했고, package.json 방향(D1) · workspace 사이 상대 경로(D2)는 어차피 따로 봐야 한다. 한 도구로 모은다.
2. **dependency-cruiser · eslint-plugin-boundaries 도입** — 새 의존성 · 설정이 늘고, 우리 규칙(층 셋 · 전역 목록)은 작다.
3. **패키지별 `package-boundary.unit.test.ts`만 넓히기** — 패키지마다 복사되고 workspace 사이 방향은 못 본다. 기존 테스트는 그대로 두고(zod 범위 · background-only 같은 패키지 고유 규칙) 공통 규칙은 이 검사로.

## 대가
- 전역 판정은 이름 기준이다 — core에서 같은 이름을 지역으로 선언하면(매개변수 `location` 등) 그 파일에서 그 이름은 세지 않는다.
- 동적 문자열로 만든 import(`import(name)`)는 보지 않는다.

## 테스트
- unit DB-U1 ~ U7(`policy.unit.test.mjs`), integration DB-I1 · I2(`check.integration.test.mjs` — 임시 저장소에 규칙마다 위반을 심어 모두 잡고 종료 1, 깨끗하면 0)
- 실제 저장소: 위반 0(2026-11-14). core에 위반 파일을 잠시 넣어 D3 · D4가 잡히는 것을 확인했다.
