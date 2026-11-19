# RevenueCat에 Airbridge 기기 id 넘기기 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: iOS · Android 호스트가 앱 시작 · 로그인 뒤 Airbridge 기기 id를 비동기로 받아 RevenueCat 고객 속성에 겁니다(ADR-0144).
- 대상 commit: `main` 위의 `feat/revenuecat-airbridge-device-id`
- 기기: iPhone 13 mini에서 동작만 확인(RevenueCat 고객 속성에 기기 id가 붙음). 성능은 재지 않음
- OS: iOS 27.0.1(동작 확인만)
- Lynx SDK: 4.0.1
- 빌드: Debug 기기 빌드로 동작만 확인 — 측정용 빌드는 아님

## 시나리오

- 없음. 앱 시작 · 로그인 뒤 한 번씩 부르는 비동기 SDK 호출이라 화면 렌더링 경로에 닿지 않습니다.

## 이 변경이 무엇을 건드렸나

- iOS `PurchasesAttribution.swift` · `AppDelegate` · `PurchasesModule` · `AirbridgeEvents`, Android `PurchasesAttribution.java` · `DuruApplication` · `PurchasesModule` · `AirbridgeEvents`.
- 번들(`main.lynx.bundle`)은 바뀌지 않았습니다.

## 분석 결과

| 번들   | 크기                           |
| ------ | ------------------------------ |
| `main` | 변경 없음 — JS를 건드리지 않음 |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: 기기 id 받기는 SDK의 비동기 콜백이고 메인 스레드를 막지 않게 짰지만, 시작 시간을 재지 않았으므로 판정하지 않습니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 출시 빌드 시작 시간 측정 때 함께 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키 · 기기 id 값)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
