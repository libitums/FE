# ADR-0039 — Android 소셜 로그인은 브라우저 OAuth로 연다

- 상태: 채택
- 날짜: 2026-10-01
- 다루는 축: Android 호스트의 인증 창과 콜백 진입
- 부분 대체: ADR-0028 D4·D7의 모든 플랫폼에 대한 Apple 네이티브 시트·URL scheme 미등록 결정

## 맥락

초기 심사 버전의 로그인 화면은 Apple·Google·Facebook만 제공한다. Android 최소 호스트에는
저장소만 있어 세 버튼이 모두 로그인할 수 없었다. iOS는 Apple 네이티브 시트와 Google·Facebook
웹 인증 세션을 사용한다. Android에는 Apple 네이티브 시트가 없다.

## 결정

Android `WebAuthenticationModule`이 `SecureRandom`의 동기 난수와 AndroidX Browser
Custom Tab의 인증 창을 제공한다. `start`는 한 번에 하나만 열고 `duru://auth-callback`을
받거나 앱으로 돌아와 창이 닫히면 콜백을 한 번 보낸다. `https` authorize URL과 등록된
`duru` 스킴만 받아들인다. Android manifest에 이 콜백의 `VIEW` intent filter를 등록한다.
JS는 PKCE verifier를 한 로그인 시도의 지역 변수에 두고, 돌아온 코드를 Supabase와 교환한다.

Apple은 `AppleSignInModule`이 있는 iOS에서 기존 네이티브 ID 토큰 경로를 유지한다.
그 모듈이 없는 Android에서는 Google·Facebook과 같은 웹 OAuth + PKCE 경로를 사용한다.
소셜 로그인 결과는 기존 세션 저장·갱신 경로로 들어간다.

## 버린 대안

- Android에서 Apple 버튼을 비활성화: 초기 심사 버전의 세 소셜 수단 요구를 충족하지 못한다.
- AndroidX Browser 1.9.0 Auth Tab: 현재 앱의 `compileSdk 35`보다 높은 36을 요구한다.
  SDK·빌드 설정 확장 없이 AndroidX Browser 1.8.0 Custom Tab과 딥링크를 사용한다.

## 대가

Android 콜백 scheme은 다른 앱도 선언할 수 있다. PKCE verifier는 앱 안의 시도에만 보관하며,
콜백의 scheme·host·path를 확인하지만 외부 앱의 선점 자체를 막지는 못한다. Custom Tab의
닫힘은 Activity가 다시 전면에 올 때 관찰하므로 브라우저가 전면인 채 앱이 별도로 재개되면
시도가 취소될 수 있다. 실제 제공자 로그인은 Supabase와 각 제공자의 설정 및 테스트 계정이
준비될 때까지 미검증이다. Apple 웹 OAuth에는 Apple Services ID·웹용 secret 설정이 필요하다.
Apple 계정 삭제는 현재 `AppleSignInModule`의 재인증·authorization code 경로를 사용하므로
Android에서 아직 완료할 수 없다.

## 재검토 조건

Android `compileSdk 36`으로 올리고 Auth Tab 지원 브라우저를 검증할 때 취소·콜백 처리를
Auth Tab 결과 API로 바꿀지 비교한다. 실제 제공자 중 하나라도 인증 창에서 앱으로 돌아오지
못하거나, 두 앱의 scheme 충돌이 확인되면 HTTPS App Links 기반 콜백을 검토한다.
