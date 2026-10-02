# Android 푸시 호스트 E2E

[ADR-0042](../adr/0042-android-push-host.md)의 시스템 권한·알림 열기 경로를 전용 Android 15 API 35 에뮬레이터에서 Maestro로 검증한다. `google-services.json`과 실제 서버는 필요하지 않다. 모의 로그인 화면과 로컬 테스트 알림을 사용한다.

```sh
E2E_UDID=emulator-5556 pnpm test:e2e:android:push
```

스크립트는 390×844·160 dpi·글자 배율 1.0에서 모의 로그인 번들, Debug APK, 계측 APK를 빌드·설치하고 앱 데이터를 지운다. 설정의 `Notifications`를 눌러 Android 13+ 권한 대화상자를 허용한다. 다시 누르면 앱의 시스템 알림 설정이 열린다. 홈 화면에서 로컬 알림을 띄운 다음 알림을 눌러 앱의 Notifications 화면으로 돌아온다. 테스트 픽스처는 완료 후 종료한다.

2026-10-02 실행: 권한 대화상자, 앱 알림 설정, 로컬 알림 탭 뒤 화면 전이가 통과했다. Notifications 제목은 스크린샷에는 보였지만 이 에뮬레이터의 접근성 계층에서는 텍스트 노드가 노출되지 않아, Maestro는 해당 화면의 `Back to map` 접근성 버튼과 Settings 이탈을 판정한다. 수동 화면 확인도 함께 했다.

실제 FCM 토큰 발급·원격 알림 수신은 Firebase Android 앱 설정과 Google Play 서비스를 사용할 수 있는 테스트 기기를 준비한 뒤 검증한다. 배경 data 메시지 전달, 앱 종료 뒤 탭, 토큰 갱신 후 재등록, 로그아웃 후 해제를 포함한다. 이 로컬 실행을 실서비스 발송 검증으로 간주하지 않는다.
