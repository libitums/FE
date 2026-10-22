# iOS 추적 허용(ATT) — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 부분 측정 — JS 번들 크기와 iOS SDK 바이너리 크기. 실행 시간 · 렌더 · 메모리는 재지 않았다.
- 기능 PR: iOS 추적 허용 — Airbridge iOS SDK를 일반판 4.12.0으로 바꾸고, 가입 뒤 여정 맵 첫 진입에 한 번 묻는다([ADR-0079](../../adr/0079-ios-tracking-authorization.md)).
- 대상 commit: 이 보고서와 같은 PR의 `feat/ios-att-prompt` 브랜치 HEAD
- 기기: iPhone 17 Pro 시뮬레이터(HostTests), 번들은 로컬 빌드
- OS: macOS 26(Darwin 25.5.0) · iOS 시뮬레이터 런타임
- Lynx SDK: 4.0.1
- 빌드: `pnpm build`(CI 설정, `.env.local` 없음) · `pnpm size:check`, SDK 바이너리는 설치된 pod의 `ios-arm64` 슬라이스
- 측정 일시: 2026-10-22

## 시나리오

- 번들 크기: main `83d0fa30`(#290)의 `budget.json` 근거 값과 비교했다.
- SDK 바이너리: restricted 4.11.1(ADR-0063 기록값)과 일반판 4.12.0의 arm64 `Airbridge` 바이너리.

## 분석 결과

| 항목 | 값 |
| --- | ---: |
| main 83d0fa30 — 번들(CI 설정, #290 `budget.json` 근거 값) | 2,383,452 bytes |
| 이 변경 — 번들(CI 설정) | 2,383,824 bytes(+372) |
| 상한 | 2,385,000 bytes(그대로 — 여유 1,176 bytes) |
| restricted 4.11.1 arm64 `Airbridge` | 2,909,200 bytes |
| 일반판 4.12.0 arm64 `Airbridge` | 2,988,552 bytes(+79,352) |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- main 값은 #290 PR의 기록값이고 같은 기계에서 다시 재지 않았다 — +372는 어림이다.
- 맵 첫 진입 때의 요청 한 번(호스트 모듈 호출)이 맵 렌더에 주는 영향은 재지 않았다. 대화상자는 시스템이 그린다.
- 서명한 Archive의 앱 용량 · 실행 시간은 재지 않았다.

## 결론과 후속

- 상한 안이라 `budget.json`은 고치지 않았다.
- 기기(iPhone 13 mini, Release)에서 [e2e 시나리오 D](../../e2e/airbridge-events.md#d--추적-허용att-대화상자-adr-0079)를 돌린다.
