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
| A6 | 작은 화면에서 버튼 가림·진입 문구 대비·접근성 클릭 확인 | 고정 버튼과 소셜 수단을 조작할 수 있고, 안내 문구를 읽을 수 있음. Android 접근성 트리의 버튼 이름과 `ACTION_CLICK`을 확인 |

## 2026-10-01 실행 결과

API 35 ARM 에뮬레이터(320×640)에서 확인했다. `pnpm preview`가 3001 포트를 골라
Debug 실행 인자에 `http://10.0.2.2:3001/main.lynx.bundle`를 지정했다.

| 항목 | 결과 | 근거 |
|---|---|---|
| A1 | 통과 | [Debug 화면](evidence/android-debug-preview.png): 첫 화면·이미지 표시. Lynx 로그에서 `StorageModule.get` 호출 확인 |
| A2 | 통과 | [번들 포함 화면](evidence/android-bundled.png): 개발 서버 없이 첫 화면·로컬 이미지 표시. APK 안의 `assets/main.lynx.bundle`, `assets/static/` 확인 |
| A3 | 모의 인증 응답으로 재시작·갱신 통과, 실제 제공자 미검증 | 저장소 경계 테스트에 더해 실제 Lynx 화면에서 서로 다른 앱 프로세스의 두 차례 갱신·토큰 교체·여정 화면, 400 거부 시 세션 삭제·로그인 화면을 확인했다. 제공자 계정으로 로그인한 뒤 실제 서버에서 갱신하는 경로는 미실행 |
| A4 | 온보딩·로그인 화면 통과 | [첫 화면 130%](evidence/android-font-130.png), [로그인 100%](evidence/android-login-font-100.png), [로그인 130%](evidence/android-login-font-130.png): 320×640에서 온보딩 3단계를 지나 로그인에 도달했다. 130%에서 Facebook 문구와 로고가 겹치는 문제를 수정해 버튼 3개·약관 링크가 모두 보임. 로그인 뒤 화면은 미검증 |
| A5 | 브리지·모의 왕복 통과, 실제 제공자 로그인 미검증 | 순수 Java URL·콜백 검사와 API 35 계측 3건이 통과했다. 임시 `https://example.invalid` 설정의 번들에서 Apple 버튼을 누르면 `provider=apple`·PKCE challenge를 실은 브라우저가 열렸다. 모의 `duru://auth-callback?code=fake` 복귀 후 교환의 네트워크 오류 문구가 나타났고, 브라우저 뒤로 가기는 오류 없이 로그인 화면으로 돌아왔다. 실제 제공자 코드 교환은 남았다 |
| A6 | 작은 화면·문구 대비·접근성 노드와 클릭 통과, TalkBack 미검증 | 320×640·160 dpi에서 온보딩 카드가 `Next` 위에 그려지는 현상을 재현해 고정 버튼을 전면에 배치했다. 100%·130%에서 세 단계와 로그인 화면에 도달했다. 온보딩 안내·로그인 안내·약관 일반 문구를 `fg-neutral-muted`로 바꿔 배경 대비 약 6.53:1로 높였다. 온보딩·로그인 텍스트와 링크의 Android 접근성 노드 및 버튼·링크의 `ACTION_CLICK`을 계측했다 |

### A2 Maestro 실행

커밋 `c8a47647`, 390×844·160 dpi API 35 전용 에뮬레이터, `bundled` APK,
Maestro 2.11.0에서
`E2E_UDID=<ID> pnpm test:e2e:android:host`가 통과했다. 흐름은 첫 화면의 대화 문구를
확인하고 온보딩 세 단계를 누른 뒤 로그인 화면 기준 이미지와 비교한다. 개발 서버를
켜지 않고 `bundled` APK를 설치해 실행했다. 처음에는 Android 접근성 트리에 첫
화면의 대화 문구만 잡히고 `Next`와 소셜 버튼 이름이 빠져 있어 화면 좌표로 눌렀다.
공통 `Button`에 `flatten={false}`를 적용한 뒤에는 이 이름들이 트리에 나타나고
Maestro가 이름으로 누른다. 화면 크기·글자 배율이 바뀌면 기준 이미지를 다시 확인한다.

`pnpm dev`의 HMR 번들은 이 최소 호스트에 WebSocket 지원이 없어 빈 화면을 보였다.
Debug 검증과 사용 절차에는 `pnpm preview`를 사용한다.

### A6 작은 화면·접근성 재현

`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:small`은 320×640·160 dpi에서
글자 배율 1.0과 1.3을 각각 설정한다. 첫째·둘째 온보딩의 고정 `Next`가 카드 위에
보이는 기준 이미지와 이름 선택자 탭, 마지막 단계 뒤 소셜 로그인 화면을 확인한다. 종료할 때
390×844·1.0으로 복원한다. 화면 기준 이미지는 `e2e/screenshots/android-small-*.png`다.

기존 Android `uiautomator dump`에서는 로그인 `Back`만 `content-desc`가 있었고
`Next`와 Apple·Google·Facebook 버튼 이름이 빠져 있었다. Button 표면에 접근성
속성을 중복하거나 Lynx의 기본 접근성 요소 설정을 켜도 달라지지 않았다. 공통
`Button` 루트에 `flatten={false}`를 적용하자 `Next`와 세 소셜 버튼의 `content-desc`가
나타났다. 390×844·320×640에서 Maestro 이름 선택으로 온보딩과 로그인 진입이 통과했다.
전용 에뮬레이터에는 TalkBack이 없어 실제 낭독과 순차 탐색 검증은 남아 있다.

### A6 접근성 클릭 재현

API 35 에뮬레이터에서 `UiAutomation`으로 `ACTION_CLICK`을 실행했다. 처음에는 버튼 이름만
보이고 `isClickable=false`였으며 `ACTION_CLICK`도 없었다. ReactLynx가 사용하는
Android View 기반 접근성 경로에서 Lynx의 `accessibility-enable-tap` 속성이 자동으로
클릭 동작으로 연결되지 않았다. 공통 `Button`·`RoundButton`은 활성 상태에만 이 속성을
설정하고, 최소 호스트의 `AccessibilityTapBridge`가 해당 View에 클릭 동작을 연결한다.
계측 테스트는 `Next`→`Back`→`Next`→`Next`→`Get started`를 접근성 클릭만으로
실행한 뒤 Apple·Google·Facebook 버튼의 `isClickable`과 `ACTION_CLICK`을 확인한다.
온보딩 진행 상태·제목·본문과 로그인 제목·설명·약관 문구·인증 실패 문구는 Lynx의
텍스트 평탄화를 해제해 Android 접근성 노드로 노출한다. 약관 링크 두 개는
`ACTION_CLICK`도 노출한다. 독립된 약관 텍스트 노드 사이의 시각적 간격은 CSS로 유지한다.
계측 테스트는 로그인 노드의 읽기 순서가 뒤로 가기→제목→설명→소셜 버튼 3개→약관
문구→이용약관→구분자→개인정보처리방침인지 확인한다. Android 접근성 노드의 순서만
검사했으며 TalkBack의 실제 음성 낭독·스와이프 초점 이동을 뜻하지 않는다.
2026-10-01 API 35 계측 1건과 Maestro 호스트 1건·소셜 3건·작은 화면 2건이 통과했다.
소셜 Maestro는 모의 콜백 후 인증 실패 문구가 접근성 노드에 나타날 때까지 기다린 뒤
오류 화면 이미지를 비교한다.
모의 인증 설정을 제거하고 재빌드한 APK에서도 호스트 Maestro가 다시 통과했다.

현재 전용 AOSP 에뮬레이터에는 TalkBack과 Google Play가 없다. 실제 TalkBack
검증에는 Google Play 시스템 이미지 또는 Android Accessibility Suite가 설치된 기기가
필요하다. Google Play 이미지를 설치하려는 SDK Manager가
`android-sdk-arm-dbt-license` 동의를 요구해 설치를 보류했다. 테스트 가능 환경이
준비되면 온보딩 각 단계와 로그인 화면에서 좌우 스와이프로 위 순서의 음성 낭독을 듣고,
두 약관 링크를 두 번 탭해 각각의 문서로 이동하는지 확인한다. Lynx의
`accessibility-traits="header"`만으로는 Android `isHeading()`이 켜지지 않아
온보딩·로그인 제목에 `accessibility-heading={true}`를 명시했다. API 35 계측에서
온보딩 세 제목과 로그인 제목의 `isHeading()`이 모두 참이었다. 실제 TalkBack의
제목 단위 탐색은 서비스가 설치된 환경에서 별도로 확인해야 한다. 이 변경 후
Maestro 호스트 1건·모의 소셜 로그인 3건·작은 화면 2건이 통과했고, 모의 설정을 제거한
최종 APK에서도 호스트·작은 화면 흐름이 통과했다.

Debug 앱을 로컬 미리보기 번들로 실행할 때 다음처럼 재현한다.

```sh
pnpm bundle:android
pnpm preview
cd apps/android
./gradlew assembleDebug assembleDebugAndroidTest
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s <전용 에뮬레이터 ID> shell am instrument -w \
  -e class com.libitum.host.ButtonAccessibilityTest \
  -e bundleUrl http://10.0.2.2:<preview 포트>/main.lynx.bundle \
  com.libitum.host.test/androidx.test.runner.AndroidJUnitRunner
```

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
추가로 API 35 에뮬레이터에서 `E2E_UDID=<ID> sh apps/android/test-session-resume.sh`의
계측 4건을 통과했다. 스크립트는 테스트용 HTTPS 설정을 번들에 주입하고 Lynx HTTP
서비스를 계측 프로세스 안에서 모의한다. 세션을 저장한 뒤 앱을 강제 종료하고 새
프로세스에서 refresh 요청 본문의 토큰, 저장된 새 토큰과 여정 화면을 확인한다. 다시
강제 종료·재실행해 두 번째 토큰 교체를 확인하고, 마지막 재시작에서는 400 응답에 따라
저장 세션이 삭제되고 소셜 로그인 화면이 표시되는지 확인한다. 실제 서버나 제공자
계정은 쓰지 않는다. 스크립트가 앱 데이터를 지우므로 전용 에뮬레이터에서 실행하고,
일반 번들이 필요하면 완료 후 `pnpm bundle:android`를 다시 실행한다.
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
Maestro 소셜 흐름은 모의 딥링크 복귀 후 로딩 표시가 끝나기를 기다린 다음 오류 화면
이미지를 비교한다. 네트워크 종료 전에 이미지를 찍으면 로딩 표시가 남아 비교가 흔들린다.

### A4 글자 크기 재현

API 35 ARM 에뮬레이터를 320×640 세로 화면으로 맞추고 시스템 `font_scale`을
`1.0`, `1.3`으로 각각 설정했다. `bundled` APK를 재실행한 뒤 온보딩의 `Next`를
두 번, `Get started`를 한 번 눌러 로그인 화면을 비교했다. 130%에서 Facebook
버튼 글자가 로고와 겹치는 문제를 관찰해 글자 영역의 좌우 여백을 늘렸다. 수정 후
문구가 두 줄로 접히고 세 버튼과 약관 링크가 화면 안에 남았다. 전화번호 수단은
현재 제품에서 숨겨져 있어 이 화면 검증에 포함되지 않는다.
