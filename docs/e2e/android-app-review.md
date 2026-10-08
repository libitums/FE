# Android 앱 평점 요청 검증

## 범위

에피소드 완료 뒤 설문에서 4점 이상을 고르면 설치당 한 번 `AppReviewModule.requestReview()`를
요청한다. Android 호스트는 Google Play In-App Review의 요청 정보를 받은 뒤 현재 Activity로
흐름을 실행한다. 결과 콜백이나 사용자에게 보이는 성공·실패 상태는 없다.

## 실행

JDK 17, SDK 35, 전용 Android 15 API 35 AOSP 에뮬레이터와 Maestro가 필요하다.
스크립트는 앱 데이터를 지우고 390×844·160 dpi·글자 배율 1.0으로 맞춘다.

```sh
cd apps/android
ANDROID_HOME=<Android SDK 경로> ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s <전용 에뮬레이터 ID> shell am instrument -w \
  -e class com.libitum.host.AppReviewModuleTest \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
cd ../..
E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:review
```

Maestro는 모의 로그인·완료 상태로 튜토리얼 마지막 활동을 마치고, 지도에 돌아와 설문
`5 · Love it`을 고른다. 화면 전환과 Lynx의 네이티브 `requestReview` 호출 1회를 확인한다.
모듈의 계측 테스트는 `FakeReviewManager`로 요청·실행·실패 후 재시도를 확인한다.

## 결과와 남은 확인

- 2026-10-02, Android 15 API 35 AOSP ARM 에뮬레이터: Java 단위 2건, 계측 3건,
  Maestro 1건 통과. 설문 완료 키와 평점 요청 키 `"1"`이 저장됐다.
- 초기 Maestro 실행은 호출 0회로 실패했다. Android Lynx가 없는 `String` 저장값을
  빈 문자열로 돌려주는 것을 확인했고, JS의 한 번 요청 조건을 실제 기록값 `"1"`로 고쳤다.
- AOSP 에뮬레이터에는 실제 Play 평점 창의 표시를 판정할 수 없다. Google의
  [테스트 지침](https://developer.android.com/guide/playcore/in-app-review/test)에 따라 Play
  내부 테스트 트랙으로 설치한 테스트 계정·기기에서 표시 여부를 별도 확인해야 한다.
  Play API 완료만으로 표시나 제출을 알 수 없다.
