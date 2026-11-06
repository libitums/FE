# iOS 추적 허용 요청의 활성 대기 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: iOS 호스트의 추적 허용(ATT) 요청이 앱이 활성이 아닐 때 들어오면 `didBecomeActive` 한 번을 기다렸다가 묻고, 대화상자 없이 돌아오면 다음 활성화에 재시도(상한 2)합니다 — App Store 심사 거절(Guideline 2.1) 보강, ADR-0079 적용 기록 2026-11-06.
- 대상 commit: `fix/ios-att-prompt-wait-active`(origin/main cc886146 위)
- 기기: 측정 기기 없음. HostTests는 iPhone 17 Pro 시뮬레이터(Debug)에서 23개 통과.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `xcodebuild test -workspace Host.xcworkspace -scheme Host`(시뮬레이터, 서명 없음) — JS 번들 변경 0
- 측정 일시: 2026-11-06

## 시나리오

- 번들 크기: 변경 없음 — `apps/mobile/src` 변경 0이라 `main.lynx.bundle` · `ui-lynx/dist`는 그대로입니다(CI `size:check` 통과).
- 런타임: 미측정. 여정 맵 첫 진입 때 호스트가 `UIApplication.shared.applicationState`를 한 번 읽고, 활성이 아니면 알림 옵저버 하나를 걸었다가 활성화 때 떼어 냅니다. 요청 완료 콜백에서 상태를 한 번 더 읽습니다.

## 이 변경이 무엇을 건드렸나

- `apps/ios/Host/AirbridgeEvents.swift` — `requestTrackingAuthorizationIfUndetermined`가 순수 판정 `trackingPromptStep(isStarted:isUndetermined:isActive:)`를 거쳐 `request · waitForActive · skip`으로 갈립니다. 활성 대기 옵저버는 한 번에 하나만 두고 활성화 때 제거합니다.
- `apps/ios/HostTests/AirbridgeEventsTests.swift` — N-I15(판정 표 · 재시도 상한).
- JS · Android · 번들: 변경 0.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다. 추가되는 일은 메인 큐에서 앱 상태 읽기 1회 · 알림 옵저버 등록/해제 1회 · ATT 상태 읽기 최대 3회(첫 판정 + 재시도 2)뿐이고, 모두 맵 진입 뒤 한 세션에 한 번입니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 맵 첫 그리기와 같은 순간에 도는 코드가 한 줄 늘었지만(앱 상태 읽기), 재지 않아 수치로 말할 수 없습니다(미측정의 한계).
- 활성 대기는 시스템 대화상자가 뜨는 때를 「앱이 활성이 된 뒤」로 미루는 것이지 화면 작업을 더하는 것이 아니라, 맵 진입 지연에 영향이 없어야 한다는 것은 추론이지 측정이 아닙니다.

## 결론과 후속

- 미측정입니다.
- 후속: 실기 D-6(`docs/e2e/airbridge-events.md`)에서 Apple 로그인 시트 → 맵 → 대화상자 순서를 본 뒤, 맵 진입이 눈에 띄게 늦어 보이면 맵 첫 그리기 시나리오를 측정 빌드로 잽니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
