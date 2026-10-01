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
| A3 | 저장소 경계 통과, 로그인 흐름 미실행 | 별도 계측 프로세스에서 테스트용 세션을 저장하고 앱 프로세스를 종료한 뒤 새 프로세스에서 같은 값을 읽었다. 삭제 후 재시작해도 값이 없었다. 전화번호 인증 계정·서버 설정이 없어 실제 로그인과 토큰 갱신은 미검증 |
| A4 | 첫 화면 통과 | [글자 크기 130% 화면](evidence/android-font-130.png): 텍스트가 줄바꿈되고 선택지가 보임. 로그인 뒤 화면은 미검증 |

`pnpm dev`의 HMR 번들은 이 최소 호스트에 WebSocket 지원이 없어 빈 화면을 보였다.
Debug 검증과 사용 절차에는 `pnpm preview`를 사용한다.

### A3 저장소 경계 재현

에뮬레이터를 켜고 `apps/android/test-storage-restart.sh`를 실행한다. 스크립트는
Debug 앱과 계측 APK를 설치하고 세 테스트를 각각 다른 계측 프로세스에서 실행한다.
저장과 삭제 사이, 삭제와 재조회 사이에 앱을 강제 종료한다. 테스트 값은 가짜 토큰이며
인증 서버를 호출하지 않는다.

처음에는 세션 키도 `SharedPreferences.Editor.apply()`로 기록했다. 저장 직후 같은
프로세스의 조회는 통과했지만, 프로세스 종료 후 재조회는 `null`이었고 디스크에
저장 파일도 없었다. 세션 키의 저장·삭제에 `commit()`을 사용한 뒤 세 테스트가
모두 통과했다. 다른 저장 키는 `apply()`를 유지한다.

모바일 JS의 기존 IA7·IA8·IA9 통합 테스트도 통과했다. 이 테스트들은 저장된 세션의
재실행 후 토큰 갱신 성공, 갱신 거절 시 삭제, 네트워크 오류 시 보존을 각각 확인한다.
실제 인증 서버와 결합한 기기 검증은 별도 계정·설정이 준비되면 위 A3 절차로 수행한다.
