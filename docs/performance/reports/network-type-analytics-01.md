# 분석 이벤트의 연결 종류 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 호스트 모듈 `NetworkStatusModule.current()`(Android · iOS)를 더하고, PostHog 이벤트마다 그때의 `network` · `networkCost`를 싣는다(ADR-0096).
- 대상 commit: `main` 위의 `feat/network-status-analytics`
- 기기: 측정 기기 없음.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-04

## 시나리오

- 번들 크기: CI 설정 빌드 `main.lynx.bundle` 3,492.5 kB(상한 3,740.0 kB 통과).
- 런타임: 미측정. 화면 · 렌더 경로는 바뀌지 않았고, PostHog 이벤트 하나마다 동기 네이티브 호출이 하나 는다.

## 이 변경이 무엇을 건드렸나

- `posthog-client.ts` `createAnalyticsSession` — sink가 쓰는 클라이언트가 capture 직전에 `readNetworkProperties()`를 부른다(background 스레드).
- `network-status.ts` — 문자열 해석과 모듈 조회. 상태를 쌓지 않는다.
- Android `NetworkStatusModule` — `ConnectivityManager`의 기본 네트워크 · 능력 · 데이터 절약 상태 조회.
- iOS `NetworkStatusMonitor` — 앱 시작 때 `NWPathMonitor` 하나를 띄우고, 조회는 잠금 아래 문자열 하나를 읽는다.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 이벤트는 사용자당 하루 수십 건이고 조회는 시스템 상태 읽기 하나라 비용이 작다고 보지만, 재지 않아 수치로 말할 수 없습니다.

## 결론과 후속

- 미측정입니다.
- 후속: 배포 뒤 PostHog에서 `network` · `networkCost` 분포를 보고, 값이 `unknown`에 쏠리면 호스트 조회를 다시 본다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
