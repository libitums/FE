# Android 최소 호스트 확인

## 준비

Android SDK 35, JDK 17, Android 에뮬레이터와 `apps/android` Gradle 프로젝트를 준비한다.
`pnpm bundle:android` 뒤 `pnpm preview`로 빌드된 번들을 제공한다. 원격 서버를 쓰면 Debug 실행 인자
`--es bundle-url https://…/main.lynx.bundle`로 지정한다.

## 절차

| 항목 | 행동 | 통과 기준 |
|---|---|---|
| A1 | Debug APK를 열기 | Duru 첫 화면이 뜨고 미리보기 서버의 번들·이미지를 로드 |
| A2 | `pnpm bundle:android` 뒤 로컬 설치용 `bundled` APK 열기 | 네트워크 개발 서버 없이 첫 화면과 로컬 이미지가 뜸. [Maestro 흐름](../../e2e/android-host.yaml)으로 온보딩→로그인 화면도 검증 |
| A3 | 소셜 로그인으로 세션 저장 후 앱 완전 종료·재실행 | `StorageModule`에서 세션을 읽고 서버 갱신 뒤 로그인 유지 |
| A4 | 기기 시스템 글자 크기 변경 후 앱 재실행 | 글자 배율이 반영되고 핵심 조작이 가려지지 않음 |
| A5 | 소셜 버튼에서 인증 창을 열고 `duru://auth-callback`으로 복귀 | Android 브리지의 `completed` 콜백 뒤 PKCE 교환을 수행. [Maestro 절차](android-social-login.md) 참조 |

## 2026-10-01 실행 결과

API 35 ARM 에뮬레이터(320×640)에서 확인했다. `pnpm preview`가 3001 포트를 골라
Debug 실행 인자에 `http://10.0.2.2:3001/main.lynx.bundle`를 지정했다.

| 항목 | 결과 | 근거 |
|---|---|---|
| A1 | 통과 | [Debug 화면](evidence/android-debug-preview.png): 첫 화면·이미지 표시. Lynx 로그에서 `StorageModule.get` 호출 확인 |
| A2 | 통과 | [번들 포함 화면](evidence/android-bundled.png): 개발 서버 없이 첫 화면·로컬 이미지 표시. APK 안의 `assets/main.lynx.bundle`, `assets/static/` 확인 |
| A3 | 저장소 경계 통과, 실제 로그인·갱신 미검증 | 별도 계측 프로세스에서 테스트용 세션을 저장하고 앱 프로세스를 종료한 뒤 새 프로세스에서 같은 값을 읽었다. 삭제 후 재시작해도 값이 없었다. 제공자 계정으로 로그인한 뒤 재시작·갱신하는 경로는 미실행 |
| A4 | 온보딩·로그인 화면 통과 | [첫 화면 130%](evidence/android-font-130.png), [로그인 100%](evidence/android-login-font-100.png), [로그인 130%](evidence/android-login-font-130.png): 320×640에서 온보딩 3단계를 지나 로그인에 도달했다. 130%에서 Facebook 문구와 로고가 겹치는 문제를 수정해 버튼 3개·약관 링크가 모두 보임. 로그인 뒤 화면은 미검증 |
| A5 | 브리지·모의 왕복 통과, 실제 제공자 로그인 미검증 | 순수 Java URL·콜백 검사와 API 35 계측 3건이 통과했다. 임시 `https://example.invalid` 설정의 번들에서 Apple 버튼을 누르면 `provider=apple`·PKCE challenge를 실은 브라우저가 열렸다. 모의 `duru://auth-callback?code=fake` 복귀 후 교환의 네트워크 오류 문구가 나타났고, 브라우저 뒤로 가기는 오류 없이 로그인 화면으로 돌아왔다. 실제 제공자 코드 교환은 남았다 |

### A2 Maestro 실행

커밋 `c8a47647`, 390×844·160 dpi API 35 전용 에뮬레이터, `bundled` APK,
Maestro 2.11.0에서
`E2E_UDID=<ID> pnpm test:e2e:android:host`가 통과했다. 흐름은 첫 화면의 대화 문구를
확인하고 온보딩 세 단계를 누른 뒤 로그인 화면 기준 이미지와 비교한다. 개발 서버를
켜지 않고 `bundled` APK를 설치해 실행했다. Android 접근성 트리에는 첫 화면의
대화 문구만 잡히고 `Next`와 소셜 버튼 이름이 빠져 있어, 390×844 기준 화면 좌표와
기준 이미지를 사용한다. 화면 크기·글자 배율을 바꾸면 이 흐름도 다시 맞춰야 한다.

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
초기 심사 버전은 소셜 로그인만 사용하며 `productPhoneSignIn = "hidden"`이다. Android
`WebAuthenticationModule`을 추가했고 Apple도 이 호스트에서는 웹 OAuth로 로그인한다.
실제 A3 기기 검증에는 Supabase·Apple·Google·Facebook 제공자 설정과 테스트 계정이 필요하다.

### A5 인증 창 재현

`sh apps/android/test-web-auth-contract.sh`를 실행해 HTTPS authorize URL과 등록된
콜백만 받는지 확인한다. 에뮬레이터에 Debug 앱과 계측 APK를 설치하고
`adb shell am instrument -w -e class com.libitum.host.WebAuthenticationModuleTest,com.libitum.host.WebAuthenticationFlowTest
com.libitum.host.test/androidx.test.runner.AndroidJUnitRunner`를 실행한다. 계측은 난수,
잘못된 요청, Custom Tab 시작 뒤 모의 딥링크의 `completed` 콜백을 확인한다. 실제
제공자 창의 복귀와 코드 교환은 설정·계정이 준비되면 세 버튼 각각에서 수동 확인한다.
임시 `PUBLIC_SUPABASE_URL=https://example.invalid`와 테스트용 anon key로 번들을 빌드해
Apple 버튼의 브라우저 시작·뒤로 취소·모의 딥링크 복귀도 살폈다. `fake` 코드는 실제
서버 코드가 아니므로 교환이 `network`로 끝나는 것까지만 확인했다. 테스트 뒤 임시
설정이 없는 번들로 다시 빌드했다.

### A4 글자 크기 재현

API 35 ARM 에뮬레이터를 320×640 세로 화면으로 맞추고 시스템 `font_scale`을
`1.0`, `1.3`으로 각각 설정했다. `bundled` APK를 재실행한 뒤 온보딩의 `Next`를
두 번, `Get started`를 한 번 눌러 로그인 화면을 비교했다. 130%에서 Facebook
버튼 글자가 로고와 겹치는 문제를 관찰해 글자 영역의 좌우 여백을 늘렸다. 수정 후
문구가 두 줄로 접히고 세 버튼과 약관 링크가 화면 안에 남았다. 전화번호 수단은
현재 제품에서 숨겨져 있어 이 화면 검증에 포함되지 않는다.
