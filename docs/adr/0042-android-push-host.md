# ADR-0042 — Android 푸시 호스트

- 상태: 채택 (2026-10-02).
- 이어받는 결정: [ADR-0034](0034-server-push-notifications.md)의 네 메서드와 권한 진입, [ADR-0041](0041-android-push-transport.md)의 저장 토큰·FCM HTTP v1 계약.

## 결정

Android `PushNotificationModule`은 iOS와 같은 `getStatus`·`register`·`takeOpened`·`openSettings`를 Lynx에 노출한다. Android 13 이상에서 `POST_NOTIFICATIONS`가 처음 필요할 때 `register`만 시스템 권한을 묻는다. 요청 여부는 앱의 Activity preferences에 저장해 미요청과 거절을 구분한다. 이미 거절했거나 알림을 끈 상태에서 재요청하지 않고 시스템 앱 알림 설정을 연다. Android 12 이하는 알림 사용 설정으로 상태를 읽는다.

Firebase Android 앱 설정이 들어오면 SDK의 현재 FCM 토큰을 받아 [ADR-0041](0041-android-push-transport.md)의 `fcm.` 저장 형태로 돌려준다. 앱은 기존 RPC로 등록하고 로그아웃 때 해제한다. Firebase 설정이 없는 로컬 빌드는 권한 및 알림 누름 경로를 실행하지만 토큰이 없어 기기를 등록하지 않는다. 실제 토큰 갱신은 다음 앱 실행의 `getToken()`·RPC 재등록 때 반영한다.

`duru-updates` 채널은 앱 시작에 만든다. FCM의 높은 우선순위 data 메시지를 받으면 `FirebaseMessagingService`가 전경과 배경에서 같은 채널로 알림을 즉시 만든다. 알림 탭은 외부에서 열 수 없는 `PushNotificationTapActivity`로 들어와 목적지를 앱 전용 저장소에 한 번 기록한 후 `MainActivity`를 연다. `MainActivity`는 저장소의 목적지만 읽으며 외부 Intent의 `target` extras는 무시한다. 실행 중 탭이면 `pushNotificationOpened` 전역 이벤트를 보낸다. JS가 기존 닫힌 목적지 목록과 유닛 ID를 다시 검증한다. URL 입구는 추가하지 않는다.

기존 Lynx 화면은 바꾸지 않는다. JVM 단위 테스트, Android 계측, Maestro의 시스템 권한·설정·로컬 알림 탭 흐름으로 검증한다. 2026-10-02에 `com.libitum.host` Firebase 앱 설정을 적용한 Google Play 에뮬레이터에서 실제 FCM 토큰 발급과 브리지 반환을 확인했다. 같은 프로젝트의 서비스 계정 키로 직접 보낸 data 메시지의 원격 수신·탭은 선택 실행 Maestro 절차로 검증한다. Supabase `send-push` 왕복은 별도다.
