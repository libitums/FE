# ADR-0171: 개발용 탐침 화면(손글씨 · 말하기)을 release 번들에서 뺀다 — `__DEV__` + 모듈 하나의 `sideEffects: false`

- 상태: **채택** (2026-11-20)
- 날짜: 2026-11-20
- 관련: [ADR-0149](0149-bundle-size-ceiling-and-report.md)(번들 천장 — 천장 값은 바꾸지 않는다)

## 맥락

- 손글씨 탐침(`screens/handwriting-probe`)과 말하기 탐침(`screens/speech-probe`)은 기기에서 인식기를 확인하려고 만든 개발용 화면이다. **release 사용자는 닿을 수 없다** — 어느 코드도 이 route를 push하지 않고, 제품 부팅 상태(`initialNav` · `entryInitialNav`)에도 없다(`navigation.unit.test.ts` NP2). 닿는 길은 개발자가 `App.tsx`의 `useReducer(navReducer, entryInitialNav)`를 `handwritingProbeNav` · `speechProbeNav`로 잠깐 바꿔 dev 서버로 띄우는 것뿐이다(`dev-probe-nav.ts`).
- 그런데 `render-screen.tsx`가 두 화면을 정적으로 import해서 release `main.lynx.bundle`에 화면 코드 · CSS가 그대로 실렸다(약 40 kB). 번들 천장(ADR-0149)에 남은 여유가 15 kB 안팎이다.

## 결정

### D1. 탐침 화면은 `__DEV__`가 참일 때만 그린다
- `render-screen.tsx`의 두 case는 `__DEV__ ? renderDevProbe(screen.name) : null`이다. `__DEV__`는 ReactLynx 빌드 플러그인이 이미 상수로 바꿔 넣는 값이다(`rspeedy dev` · `--mode development`에서 `true`, `rspeedy build`에서 `false`). 새 define을 더하지 않는다.
- 탐침 화면을 import하는 제품 파일은 `app/render-dev-probe.tsx` 하나다(`render-dev-probe.unit.test.tsx` DP-S1).

### D2. `render-dev-probe.tsx` 하나만 부수 효과 없는 모듈로 표시한다
- 앱 패키지에 `sideEffects` 표시가 없어서, 호출이 죽은 코드가 되어도 번들러가 import된 모듈(과 그 아래 CSS)을 남긴다. `__DEV__`만으로는 약 13 kB만 빠졌다.
- `lynx.config.ts`의 `tools.rspack.module.rules`에 `{ test: /render-dev-probe\.tsx$/, sideEffects: false }`를 둔다. 쓰이지 않는 import가 탐침 화면 · CSS를 통째로 끌고 들어오지 않는다.
- 이 파일에는 모듈 최상위 부수 효과(전역 등록 · CSS import)를 두지 않는다 — 두면 표시가 거짓이 된다.

## 버린 대안

- **앱 패키지 전체에 `sideEffects` 표시**: 줄어드는 폭은 크겠지만 모든 모듈의 부수 효과를 다시 따져야 한다. 이 변경의 범위를 넘는다.
- **build에서 alias로 빈 모듈로 바꿔 끼우기**: 같은 효과지만 코드에서 dev 전용이라는 것이 보이지 않고, 빈 모듈이 진짜 화면과 어긋나도 타입 검사가 못 잡는다.
- **동적 import(lazy)**: dev에서 별도 번들이 생기고 비동기 경계가 붙는다. 개발용 화면에 비해 복잡하다.

## 결과

- release `main.lynx.bundle` 5,835,191 → 5,795,217 bytes(−39,974, .env.local 없는 설정). 번들에 탐침 문자열(`handwriting-probe-screen` · `speech-probe-screen`)이 0건이다. 천장 값(5,850,000)은 그대로다 — 천장은 사용자 결정이다(ADR-0149).
- dev 빌드는 그대로 탐침을 싣는다(`--mode development` 빌드에서 두 문자열 66 · 107건). 닿는 길(`App.tsx` 부팅 상태 바꿔 끼우기)도 그대로다.
- 대가: release 설정으로 지은 번들(스토어 빌드 · 내장 번들)에서는 부팅 상태를 바꿔 끼워도 탐침 자리가 빈 화면이다. 탐침은 dev 번들로만 본다.
