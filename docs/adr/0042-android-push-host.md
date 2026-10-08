# ADR-0042 — Android 푸시 호스트

- 상태: 채택 (2026-10-02).
- 이어받는 결정: [ADR-0034](0034-server-push-notifications.md)의 네 메서드와 권한 진입, [ADR-0041](0041-android-push-transport.md)의 저장 토큰·FCM HTTP v1 계약.

## 결정

Android `PushNotificationModule`은 iOS와 같은 `getStatus`·`register`·`takeOpened`·`openSettings`를 Lynx에 노출한다. Android 13 이상에서 `POST_NOTIFICATIONS`가 처음 필요할 때 `register`만 시스템 권한을 묻는다. 요청 여부는 앱의 Activity preferences에 저장해 미요청과 거절을 구분한다. 이미 거절했거나 알림을 끈 상태에서 재요청하지 않고 시스템 앱 알림 설정을 연다. Android 12 이하는 알림 사용 설정으로 상태를 읽는다.

Firebase Android 앱 설정이 들어오면 SDK의 현재 FCM 토큰을 받아 [ADR-0041](0041-android-push-transport.md)의 `fcm.` 저장 형태로 돌려준다. 앱은 기존 RPC로 등록하고 로그아웃 때 해제한다. Firebase 설정이 없는 로컬 빌드는 권한 및 알림 누름 경로를 실행하지만 토큰이 없어 기기를 등록하지 않는다. 실제 토큰 갱신은 다음 앱 실행의 `getToken()`·RPC 재등록 때 반영한다.

`duru-updates` 채널은 앱 시작에 만든다. FCM의 높은 우선순위 data 메시지를 받으면 `FirebaseMessagingService`가 전경과 배경에서 같은 채널로 알림을 즉시 만든다. 알림 탭은 외부에서 열 수 없는 `PushNotificationTapActivity`로 들어와 목적지를 앱 전용 저장소에 한 번 기록한 후 `MainActivity`를 연다. `MainActivity`는 저장소의 목적지만 읽으며 외부 Intent의 `target` extras는 무시한다. 실행 중 탭이면 `pushNotificationOpened` 전역 이벤트를 보낸다. JS가 기존 닫힌 목적지 목록과 유닛 ID를 다시 검증한다. URL 입구는 추가하지 않는다.

기존 Lynx 화면은 바꾸지 않는다. JVM 단위 테스트, Android 계측, Maestro의 시스템 권한·설정·로컬 알림 탭 흐름으로 검증한다. 2026-10-02에 `com.libitum.host` Firebase 앱 설정을 적용한 Google Play 에뮬레이터에서 실제 FCM 토큰 발급과 브리지 반환을 확인했다. 원격 FCM 발송·수신은 서버 인증이 준비된 뒤 별도로 검증한다.

2026-10-05에 Android 패키지가 `libitum.duru.android`로 바뀌어 Firebase Android 앱도 그 패키지의 것을 쓴다([ADR-0046](0046-android-play-release.md) D1 · D5). 위 문장의 `com.libitum.host`는 그때의 사실이다. 같은 날 새 설정으로 Google Play 에뮬레이터(API 37)에서 FCM 토큰 발급을 다시 확인했다. 원격 발송·수신은 여전히 검증하지 않았다.

2026-10-06 적용 기록(결정을 바꾸지 않는다): 위 「실제 토큰 갱신은 다음 앱 실행의 `getToken()`·RPC 재등록 때 반영한다」에 [ADR-0048](0048-android-push-token-refresh.md)이 **실행 중** 한 경로를 더했다. 앱 프로세스가 살아 있는 동안 FCM이 새 토큰을 알리면(`onNewToken`) 살아 있는 `MainActivity`가 인자 없는 전역 이벤트 `pushTokenRefreshed`를 보내고 JS가 묻지 않고 다시 등록한다. 다음 실행의 재등록은 그대로 있다 — 대체가 아니라 보완이다. 서비스만 깨어난 경우에는 아무것도 저장하지 않고, 그 경우와 앱을 열지 않는 동안의 갱신은 여전히 다음 실행에서 반영된다. 호스트 → JS 전역 이벤트가 `pushNotificationOpened`에 더해 둘이 됐고 모듈의 네 메서드는 그대로다. 근거 · 남는 틈 · 확인하지 못한 것은 그 ADR이 진다.
