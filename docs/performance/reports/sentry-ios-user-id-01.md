# Sentry iOS 연결 · 이벤트의 내부 사용자 id — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 앱 크기만 재었습니다.
- 기능 PR: [ADR-0207](../../adr/0207-sentry-ios-and-user-id.md) — iOS에 Sentry 9.19.1(CocoaPods)을 넣고, 두 플랫폼 이벤트에 내부 사용자 id 하나를 싣습니다.
- 대상 commit: `main` 위의 `feat/sentry-ios-user`
- 기기: 크기는 `generic/platform=iOS` Release 빌드(서명 없음)의 링크 맵, 시작 확인은 iPhone 17 시뮬레이터(Debug, DSN 없음)
- OS: iOS 26.5 SDK
- Lynx SDK: 4.0.1
- 빌드: Release(크기) · Debug(시작 확인)

## 시나리오

- 크기: Release 링크 맵에서 `libSentry.a`와 새 Swift 파일 넷(`CrashScrub` · `CrashReportPayload` · `CrashReporting` · `CrashReportingModule`)이 실행 파일에 더한 바이트를 셉니다.
- 시작: DSN이 없는 빌드를 실행해 SDK가 서지 않는지 로그로 봅니다.

## 이 변경이 무엇을 건드렸나

- iOS 시작 경로: `AppDelegate`가 Airbridge 바로 뒤에서 `CrashReporting.start`를 부릅니다 — DSN이 없거나 Debug면 설정 판정(정규식 하나)만 하고 끝납니다.
- JS: 로그인 · 로그아웃 결선에서 호스트 모듈 호출 하나(`setUser` · `clearUser`)가 늡니다.

## 분석 결과

| 항목 | 값 |
|---|---|
| Host 실행 파일(arm64, Release) | 43.95 MB |
| 그 가운데 Sentry | 약 2,645 KiB |
| 새 Swift 넷 | 약 38 KiB |
| JS 번들 | 5,761.5 kB / 천장 6,180 kB |
| DSN 없는 Debug 시작 | SDK 시작 안 함(`[DuruCrash] disabled` 한 줄) |

렌더링 · 메모리 · 시작 시간 값은 **없습니다** — 재지 않았습니다.

## 해석

- **크기만 잰 기록입니다.** App Store 내려받기 크기는 압축 뒤라 위 수보다 작을 것으로 봅니다(추론, 재지 않음).
- DSN이 있는 빌드에서 SDK 시작이 콜드 스타트에 더하는 시간은 재지 않았습니다 — 측정 한계입니다.

## 결론과 후속

- 성능 판정이 아닙니다. 실행 파일이 약 2.6 MB 늡니다.
- 후속: DSN 값 파일이 생긴 뒤 Release 빌드로 콜드 스타트를 한 번 재어 이 보고서의 02로 남깁니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키 · DSN)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
