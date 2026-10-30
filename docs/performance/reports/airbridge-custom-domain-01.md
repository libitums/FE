# Airbridge 커스텀 도메인 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 딥링크를 받는 도메인에 Airbridge 커스텀 도메인 `go.k-duru.com`을 더하는 변경(이 보고서와 같은 PR)
- 대상 commit: `main` 위의 `feat/airbridge-custom-domain`
- 기기: 실행하지 않음 — 성능 측정용 실행을 하지 않았습니다.
- OS: 실행하지 않음
- Lynx SDK: 4.0.1
- 빌드: 하지 않음 — 측정용 번들 · 호스트를 짓지 않았습니다.

## 시나리오

- 없음. entitlements와 매니페스트 intent filter는 실행 코드 경로를 바꾸지 않아 잴 시나리오가 없습니다.

## 이 변경이 무엇을 건드렸나

- `apps/ios/Host/Host.entitlements`에 `applinks:go.k-duru.com`을 더했습니다.
- `apps/android/app/src/main/AndroidManifest.xml`에 `http` · `https://go.k-duru.com`을 받는 `autoVerify` intent filter를 더했습니다.
- 번들(`main.lynx.bundle`) · 네이티브 코드는 바뀌지 않았습니다(`SceneDelegate.swift`는 주석 한 줄).

## 분석 결과

| 번들         | 크기                           |
| ------------ | ------------------------------ |
| `main`       | 변경 없음 — JS를 건드리지 않음 |
| 이 작업 트리 | 변경 없음                      |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** entitlements와 intent filter는 렌더링 경로에 들어가지 않으므로 성능이 달라질 이유가 없지만 재지 않았습니다.

## 결론과 후속

- 번들 변경 없음. 렌더링 · 메모리는 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 없음.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
