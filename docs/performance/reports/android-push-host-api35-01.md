# Android 푸시 호스트 성능 기록

## 실행 조건

- 상태: 부분 측정 — Debug APK 크기와 기능 경로만 기록했다. 원격 FCM 지연·CPU·메모리는 미측정.
- 대상 commit: `1eb2d7f0` (`origin/main` 서버 FCM 병합) 기준 `feat/android-push-notifications` 작업 트리.
- 기기: Android 15 API 35 ARM 에뮬레이터, 390×844·160 dpi·글자 배율 1.0.
- OS: Android 15.
- Lynx SDK: 4.0.1.
- 빌드: Debug APK, 모의 로그인 Lynx 번들, Firebase 프로젝트 설정 없음.
- 실행 회차: 01.

## 시나리오

로그인 상태의 설정에서 알림 권한을 허용하고 시스템 앱 알림 설정을 연다. 로컬 알림을 눌러 Notifications 화면으로 이동한다. Android 계측은 네이티브 브리지·알림 채널·목적지 소비를 확인한다.

## 분석 결과

- Debug APK 크기: 64,937,209 bytes. 같은 조건의 이전 APK가 없어 증가분은 계산하지 않았다.
- JVM 단위 4건, Android 계측 3건, Maestro 권한·설정과 알림 열기 흐름이 통과했다.
- 실제 FCM 토큰 발급·배달·수신 시간은 측정하지 않았다.

## 해석

이 기록은 로컬 권한과 알림 누름 기능에 한정된다. Firebase 프로젝트가 없어 원격 배달, CPU·메모리, 사용자 기기에서의 지연은 판정할 수 없다.

## 결론과 후속

에뮬레이터에서 Android 알림의 앱 진입과 닫힌 목적지 이동을 확인했다. Firebase 설정 후 Google Play 기기에서 실제 발송과 지연을 재측정한다.
