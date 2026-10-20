# 여정 맵 자동 스크롤 · 자리 기억 — iPhone 13 mini — 01

## 실행 조건

- 상태: 부분 측정 — 자동 스크롤 한 번의 프레임 수 · 길이(기기 콘솔 로그)와 번들 크기. 렌더링 · 메모리 캡처(Instruments)는 돌리지 않았다.
- 기능 PR: 여정 맵 — 스택에 있던 맵은 마지막 자리에서, 처음 여는 맵만 main thread가 천천히 옮기는 자동 스크롤, 말풍선이 열린 채 스크롤할 때 맵 본문을 다시 그리지 않음. 사용자 결정 2026-10-20(ADR-0022 적용 기록).
- 대상 commit: 이 보고서와 같은 PR의 `feat/journey-map-smooth-scroll` 브랜치 HEAD
- 기기: iPhone 13 mini, Release 빌드
- OS: iOS 27.0.1
- Lynx SDK: 4.0.1
- 빌드: `pnpm bundle:host` + `xcodebuild -configuration Release`, 번들 크기는 `pnpm build`(CI 설정, `.env.local` 없음) · `pnpm size:check`
- 측정 일시: 2026-10-20

## 시나리오

- 콜드 스타트 → 여정 맵이 다음 유닛으로 자동 스크롤. `xcrun devicectl device process launch --console`로 Lynx 로그를 받아 `scroll` 이벤트(`SendCustomEvent event name:scroll`)의 수와 처음 · 끝 시각을 셌다.
- 번들 크기: main a3c04051 CI 실측과 비교했다.

## 분석 결과

| 항목 | 값 |
| --- | ---: |
| ease-out quint · 0.7~1.1초 빌드 — 스크롤 이벤트 | 58개, 약 0.97초(첫 0.2초에 거리의 약 3분의 2) |
| ease-in-out cubic · 1.0~1.6초 빌드 — 스크롤 이벤트 | 93개, 약 1.54초 |
| main a3c04051 — 번들(CI 설정) | 2,347,549 bytes |
| 이 변경 — 번들(CI 설정) | 2,363,828 bytes(+16,279) |
| 상한 | 2,349,000 → 2,365,000 bytes(kB 올림 + 1 kB, 사용자 사전 승인) |

## 제한 사항

- 번들과 이벤트 수만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 프레임 수는 스크롤 이벤트로 셌다 — 화면에 실제로 그려진 프레임(hitch)은 재지 않았다. 「자연스러움」은 사용자가 기기에서 본 판단이다.
- 손으로 끌 · 튕길 때의 끊김은 측정하지 않았다(말풍선이 닫혀 있으면 스크롤 중 앱 쪽 다시 그리기는 0 — ui 탐침).
- 번들 증가의 몫(worklet 실행 코드 대 이 변경의 코드)을 나눠 재지 않았다.

## 결론과 후속

- 기기에서 [e2e](../../e2e/journey-map.md) AS-M1 ~ AS-M5를 확인한다. 끌기 끊김은 Instruments Animation Hitches로 따로 잰다.
