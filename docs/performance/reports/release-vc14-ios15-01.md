# 출시 빌드 번호 Android 14 · iOS 15 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: Android `versionCode` 13 → 14(`versionName` 1.3.0 그대로) · iOS 빌드(`CURRENT_PROJECT_VERSION`) 14 → 15(표시 버전 1.0.0 그대로). 코드는 직전 출시(vc13 · 빌드 14)와 같습니다 — 그 두 산출물이 Airbridge 값 파일 없이 지어져(SDK 미시작 → ATT 요청 0) 같은 내용을 새 번호로 다시 올리기 위한 번호입니다.
- 대상 commit: `main` 위의 `chore/release-vc14-ios15`
- 기기: 실행하지 않음
- OS: 실행하지 않음
- Lynx SDK: 4.0.1
- 빌드: 하지 않음 — 측정용 번들 · 호스트를 짓지 않았습니다.

## 시나리오

- 없음. 빌드 번호는 실행 코드 경로를 바꾸지 않아 잴 시나리오가 없습니다.

## 이 변경이 무엇을 건드렸나

- `apps/android/app/build.gradle`의 `versionCode` · `versionName`, 출시 설정 검사 · `ReleaseIdentityTest`의 Play 업로드 기준(12 → 13), README 표, 산출물 검사 정규식.
- `apps/ios/Host.xcodeproj/project.pbxproj`의 `CURRENT_PROJECT_VERSION`(Debug · Release 두 곳).
- 번들(`main.lynx.bundle`) · 네이티브 코드는 바뀌지 않았습니다.

## 분석 결과

| 번들   | 크기                           |
| ------ | ------------------------------ |
| `main` | 변경 없음 — JS를 건드리지 않음 |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: 빌드 번호만 바뀌어 성능에 닿는 경로가 없지만 재지 않았으므로 판정하지 않습니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 없음.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
