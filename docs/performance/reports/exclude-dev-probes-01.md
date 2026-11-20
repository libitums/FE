# 개발용 탐침 화면 release 번들 제외 — 01

## 실행 조건

- 측정 일시: 2026-11-20T22:00:00+09:00
- 상태: 미측정 — 런타임 성능(Rendering · Memory · Trace)은 수집하지 않았다. 번들 크기만 쟀다
- 기능 PR: 브랜치 `perf/exclude-dev-probes`
- 대상 commit: `origin/main` `7195e723` 위의 변경
- 기기: 측정 기기 없음 — vitest · 빌드만
- OS: 해당 없음(기기 측정 없음, 빌드는 macOS)
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(.env.local 없음 — CI와 같은 설정)
- 실행 회차: 01

## 시나리오

- 단계: 같은 설정으로 변경 전 · 뒤를 각각 빌드하고 `apps/mobile/dist/main.lynx.bundle` 크기와 탐침 고유 문자열(`handwriting-probe-screen` · `speech-probe-screen`, 두 화면의 testid · 클래스 접두사) 건수를 센다. dev 쪽은 `rspeedy build --mode development`로 같은 문자열이 남는지 본다.
- 하지 않은 것: 프레임 시간 · 메모리 · 첫 실행 시간 계측.

## 이 변경이 무엇을 건드렸나

- 화면 동작은 바뀌지 않는다 — 탐침은 release 사용자가 닿을 수 없는 개발용 화면이다(어느 코드도 push하지 않고 제품 부팅 상태에 없음, `navigation.unit.test.ts` NP2).
- release 번들에서 탐침 화면 코드 · CSS가 빠진다(`__DEV__` 상수 + `render-dev-probe.tsx`의 `sideEffects: false`, ADR-0171).

## 분석 결과

| 대상 | 앞(main `7195e723`) | 뒤 | 증감 |
|---|---|---|---|
| `main.lynx.bundle` (release) | 5,835,191 B | 5,795,217 B | −39,974 B |
| 탐침 문자열 `handwriting-probe-screen` (release) | 34건 | 0건 | — |
| 탐침 문자열 `speech-probe-screen` (release) | 50건 | 0건 | — |
| 탐침 문자열 (dev, `--mode development`) | — | 66 · 107건 | 그대로 실림 |
| `static/image` · `packages/ui-lynx/dist` | 변화 없음 | 변화 없음 | 0 |

중간 확인: `__DEV__` 삼항만 둔 빌드는 5,822.2 kB(−13 kB)였고 탐침 문자열이 32 · 45건 남았다. 모듈 하나에 `sideEffects: false`를 더해야 import가 통째로 빠졌다.

런타임 성능 값은 수집하지 않았다.

## 해석

- 천장(5,850,000 B, ADR-0149) 여유가 약 15 kB에서 약 55 kB로 는다. 천장 값은 바꾸지 않았다.
- 측정 한계: 첫 실행 시간 변화는 재지 않았다. 번들이 0.7% 작아진 만큼의 차이로 예상하지만 확인은 아니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아니다.
- 후속: 없음. 탐침을 새로 더하면 `render-dev-probe.tsx`에만 import한다(`render-dev-probe.unit.test.tsx` DP-S1이 지킨다).

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
