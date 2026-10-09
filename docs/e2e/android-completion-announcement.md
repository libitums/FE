# Android 완료 안내 검증

## 범위

기존 `apps/mobile/src/lib/accessibility.ts`의 `announceCompletion(content)` 경로를
Android `CompletionAnnouncementModule.announce(content, callback)`에 연결한다.
문구는 변경하지 않고 Android 뷰의 `announceForAccessibility`로 한 번 요청한다.
잘못된 인자는 읽지 않고 콜백으로 종료한다. 완료 전용 모듈이 등록되면 JS가 일반
`LynxAccessibilityModule.accessibilityAnnounce`를 추가로 호출하지 않는다.

## 실행

JDK 17, Android SDK 35, API 35 전용 에뮬레이터, Maestro를 준비한다.

```sh
cd apps/android
./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -e class com.libitum.host.CompletionAnnouncementModuleTest \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
cd ../..
E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:completion
```

Maestro는 모의 인증·진행 데이터를 넣고 실제 듣기 한 문항을 끝까지 진행한다.
390×844·160 dpi·글자 배율 1.0에서 듣기와 완료 화면을 스크린샷으로 비교하고
Lynx의 완료 안내 호출이 정확히 한 번이며 일반 발화 fallback 호출이 없음을
로그로 확인한다. 앱 데이터를 지우며 제공자 로그인은 호출하지 않는다.

## 결과와 남은 실기 확인

- 2026-10-02, Android 15 API 35 ARM 에뮬레이터: 단위 2건, 계측 3건, Maestro 1건 통과.
- 계측은 원문 보존·메인 스레드 호출·콜백 한 번·잘못된 인자 무발화와
  `TYPE_ANNOUNCEMENT` 이벤트의 원문을 확인했다.
- 모듈 등록을 제거한 대조 빌드는 Maestro의 호출 검사에서 0건으로 실패했고,
  등록을 복원하자 한 번 호출로 통과했다.
- AOSP 에뮬레이터의 Lynx 접근성 트리에는 듣기 보기와 완료 버튼이 없어
  Maestro는 고정 좌표와 화면 이미지를 사용한다. 별도 접근성 조사 대상이다.
- 이 테스트는 실제 TalkBack 음성의 시작·중단·완주·중복을 판정하지 않는다.
  실기에서 완료 직전 다른 발화를 듣는 상태로 전이해 확인해야 한다.
  [Android 16에서 두 API가 사용 중단 대상으로 지정됐다](https://developer.android.com/about/versions/16/behavior-changes-all#accessibility-announcements).
  완료 화면의 의미 있는 뷰에 live region을 붙이는 전환도 후속 검토 대상이다.
