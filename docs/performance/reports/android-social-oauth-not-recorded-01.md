# Android 소셜 OAuth 경계 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 시간·프레임·메모리 캡처를 수행하지 않았다.
- 대상 commit: `a4a5e433` 이후 `WebAuthenticationModule` 추가와 Apple의 Android 웹 OAuth 분기.
- 기기: API 35 ARM 에뮬레이터.
- OS: Android 15.
- Lynx SDK: 4.0.1.
- 빌드: Android SDK 35, AndroidX Browser 1.8.0, Debug APK.

## 시나리오

Android Debug APK와 계측 APK를 빌드했다. 계측에서 난수 길이·형태, 잘못된 인증 URL의
즉시 콜백, Custom Tab을 시작한 뒤 모의 딥링크로 돌아온 결과를 확인했다.
임시 `https://example.invalid` 설정으로 Apple 버튼을 눌러 브라우저 시작, 모의 딥링크
복귀, 브라우저 뒤로 취소도 확인했다. 테스트 뒤 임시 설정이 없는 번들로 되돌렸다.
JS에서는 Apple 네이티브 모듈이 없을 때 웹 OAuth authorize URL,
콜백 코드와 PKCE 교환을 가짜 호스트·서버로 검증했다.

## 분석 결과

- Android `assembleDebug`, `assembleDebugAndroidTest`가 성공했다.
- API 35 에뮬레이터의 계측 테스트 3건, 순수 Java URL·콜백 검사가 통과했다.
- Apple 버튼에서 `provider=apple`과 PKCE challenge를 실은 브라우저가 열리고,
  모의 코드 복귀는 교환의 네트워크 오류로 끝났다. 뒤로 취소 시 로그인 화면에 오류가 남지 않았다.
- 소셜 로그인·Apple 접점 단위 테스트 33건과 모바일 TypeScript 검사가 통과했다.
- 실제 제공자 브라우저 왕복·로그인, 렌더링 시간·프레임·메모리 수치는 수집하지 않았다.

## 해석

브리지 입력 경계와 JS 분기의 동작만 확인했다. 성능 수치가 없으므로 브라우저 시작 시간이나
로그인 화면의 메모리 영향을 판정할 수 없다. 실제 제공자와 콜백 동작도 이 결과로 판단할 수 없다.

## 결론과 후속

세 소셜 버튼이 Android 브리지를 사용할 코드 경로가 생겼다. Supabase·제공자 설정과
테스트 계정이 준비되면 A5 브라우저 왕복과 A3 로그인·재시작·갱신을 실기에서 확인한다.
