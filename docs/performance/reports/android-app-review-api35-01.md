# Android 앱 평점 요청 성능 기록

## 실행 조건

- 상태: 부분 측정 — Debug APK 크기와 기능 경로를 기록했다. Play 요청 지연과 메모리는 미측정.
- 대상 commit: `059a3ed3` (`origin/main`) 기준 `feat/android-app-review` 작업 트리.
- 기기: Android 15 API 35 AOSP ARM 에뮬레이터, 390×844·160 dpi·글자 배율 1.0.
- OS: Android 15.
- Lynx SDK: 4.0.1.
- 빌드: Debug APK, 로컬 미리보기 Lynx 번들.
- 실행 회차: 01.

## 시나리오

모의 로그인·진행 상태로 튜토리얼 마지막 활동을 마치고 에피소드 설문에서 5점을 고른다.
Lynx의 네이티브 리뷰 요청 1회와 설치당 한 번 저장값을 확인한다.

## 분석 결과

- Debug APK 크기는 63,487,588 bytes다. 직전 Android 손글씨 작업의 동일 구성
  62,746,069 bytes보다 741,519 bytes 크다. Play Review 의존성이 추가됐다.
- Java 단위 2건, Android 계측 3건, Maestro 1건이 통과했다.
- Play 요청·실행 지연, 메모리, 실제 평점 창 표시 여부는 측정하지 않았다.

## 해석

APK 크기와 호출 연결만 확인됐다. Play 요청 지연과 메모리는 미측정이므로 성능 영향을
판정할 수 없다.

## 결론과 후속

Play 내부 테스트 트랙의 실기에서 요청 지연, 메모리와 실제 평점 창 표시 동작을 확인한다.
