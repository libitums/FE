# Airbridge 딥링크 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 부분 측정 — JS 번들 크기만. 실행 시간 · 렌더 · 메모리는 재지 않았다.
- 기능 PR: Airbridge 딥링크 · 지연 딥링크 — `duru://journey` · `roleplay` · `settings`를 앱 구간에 들어선 뒤 그 탭으로 연다([ADR-0080](../../adr/0080-airbridge-deeplink.md)).
- 대상 commit: 이 보고서와 같은 PR의 `feat/airbridge-deeplink` 브랜치 HEAD
- 기기: iPhone 17 Pro 시뮬레이터(HostTests), 번들은 로컬 빌드
- OS: macOS 26(Darwin 25.5.0) · iOS 시뮬레이터 런타임
- Lynx SDK: 4.0.1
- 빌드: `pnpm build`(CI 설정, `.env.local` 없음) · `pnpm size:check`
- 측정 일시: 2026-10-22

## 시나리오

- 번들 크기: 이 브랜치의 바탕인 #292(ATT)의 같은 설정 실측과 비교했다.

## 분석 결과

| 항목 | 값 |
| --- | ---: |
| #292 — 번들(CI 설정) | 2,383,824 bytes |
| 이 변경 — 번들(CI 설정) | 2,385,702 bytes(+1,878) |
| 상한 | 2,385,000 → 2,387,000 bytes(kB 올림 + 1 kB, 사용자 사전 승인) |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 앱 구간에 들어설 때 호스트 꺼내기 한 번(비동기 콜백)이 첫 화면에 주는 영향은 재지 않았다.
- 기기에서 링크가 앱을 여는 시간은 재지 않았다.

## 결론과 후속

- 기기에서 [e2e 시나리오 E](../../e2e/airbridge-events.md#e--딥링크--지연-딥링크-adr-0080)를 돌린다.
