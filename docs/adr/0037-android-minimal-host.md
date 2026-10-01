# ADR-0037 — Android 최소 호스트를 만든다

- 상태: 채택
- 날짜: 2026-10-01
- 다루는 축: 앱 로스터, Android 호스트 경계
- 부분 대체: ADR-0012 D1의 Android 제외 결정

## 맥락

기존 `apps/mobile`은 Android도 지원하는 ReactLynx 번들을 만들지만, 저장소의 자체 호스트는
iOS뿐이다. ADR-0012 D1은 당시 시연 플랫폼이 iOS라 Android 호스트를 제외했다. 이번 요청은
Android 앱을 `/change` 흐름으로 만들되 **최소 호스트부터** 시작하는 것이다.

## 결정

`apps/android`를 별도 Gradle 앱으로 만든다. iOS처럼 pnpm workspace 멤버가 아니며
`apps/mobile` 번들을 소비한다. Android Lynx SDK는 iOS Pod와 같은 **4.0.1**로 고정한다.
Debug는 빌드된 번들의 HTTP 미리보기 서버, Release는 APK 자산을 읽는다. 첫 실행에 필요한 이미지·HTTP 서비스와
XElement, `StorageModule`만 연결한다. 호스트 자체 화면은 만들지 않는다.

## 대가

Android 앱이 생겨도 제품 전체의 플랫폼 동등성은 아직 없다. 오디오·음성·소셜 인증·푸시 등은
`docs/adr/README.md`의 호스트 모듈 표에 남은 이관 항목이다. HMR 번들은 WebSocket 지원이
필요해 현재 Debug 경로에서 사용하지 않는다. 에뮬레이터 판정은
`docs/e2e/android-host.md`에 기록한다.

초기 심사 버전의 소셜 인증 경계는 [ADR-0038](0038-android-social-oauth.md)이 추가한다.
실제 제공자 계정으로 완료한 로그인과 세션 갱신은 계속 별도 검증 항목이다.

## 재검토 조건

Android 제품 흐름을 iOS와 동등하게 시연하기로 결정할 때, 또는 Android 호스트의
첫 화면·자산·저장소 수동 판정에서 실패할 때 모듈 범위와 런타임 설정을 재검토한다.
