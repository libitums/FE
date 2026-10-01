# Android 최소 호스트 수동 확인

## 준비

Android SDK 35, JDK 17, Android 에뮬레이터와 `apps/android` Gradle 프로젝트를 준비한다.
`pnpm bundle:android` 뒤 `pnpm preview`로 빌드된 번들을 제공한다. 원격 서버를 쓰면 Debug 실행 인자
`--es bundle-url https://…/main.lynx.bundle`로 지정한다.

## 절차

| 항목 | 행동 | 통과 기준 |
|---|---|---|
| A1 | Debug APK를 열기 | Duru 첫 화면이 뜨고 미리보기 서버의 번들·이미지를 로드 |
| A2 | `pnpm bundle:android` 뒤 로컬 설치용 `bundled` APK 열기 | 네트워크 개발 서버 없이 첫 화면과 로컬 이미지가 뜸 |
| A3 | 전화번호 로그인으로 세션 저장 후 앱 완전 종료·재실행 | `StorageModule`에서 세션을 읽어 로그인 유지 |
| A4 | 기기 시스템 글자 크기 변경 후 앱 재실행 | 글자 배율이 반영되고 핵심 조작이 가려지지 않음 |

## 2026-10-01 실행 결과

API 35 ARM 에뮬레이터(320×640)에서 확인했다. `pnpm preview`가 3001 포트를 골라
Debug 실행 인자에 `http://10.0.2.2:3001/main.lynx.bundle`를 지정했다.

| 항목 | 결과 | 근거 |
|---|---|---|
| A1 | 통과 | [Debug 화면](evidence/android-debug-preview.png): 첫 화면·이미지 표시. Lynx 로그에서 `StorageModule.get` 호출 확인 |
| A2 | 통과 | [번들 포함 화면](evidence/android-bundled.png): 개발 서버 없이 첫 화면·로컬 이미지 표시. APK 안의 `assets/main.lynx.bundle`, `assets/static/` 확인 |
| A3 | 미실행 | 전화번호 인증에 사용할 계정·서버 설정이 이 작업에 주어지지 않아 세션 유지 판정 불가. 네이티브 저장소의 `get` 호출까지만 확인 |
| A4 | 첫 화면 통과 | [글자 크기 130% 화면](evidence/android-font-130.png): 텍스트가 줄바꿈되고 선택지가 보임. 로그인 뒤 화면은 미검증 |

`pnpm dev`의 HMR 번들은 이 최소 호스트에 WebSocket 지원이 없어 빈 화면을 보였다.
Debug 검증과 사용 절차에는 `pnpm preview`를 사용한다.
