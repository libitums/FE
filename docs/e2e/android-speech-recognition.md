# Android 음성 인식 호스트 검증

## 범위와 계약

`SpeechRecognitionModule`을 Android `MainActivity`에 등록해 기존 Lynx 접점의
`getStatus`·`requestPermissions`·`start`·`stop` 네 메서드를 연결한다. Android에서는
`RECORD_AUDIO`만 런타임 권한이다. 별도 음성 인식 권한이 없으므로
`speechRecognition` 권한 필드는 `granted`이고, 서비스 사용 가능 여부는
`recognizerAvailable`이 답한다. `getStatus`는 권한 창을 열지 않는다.

`start`의 기본 `requireOnDevice`는 `true`다. API 31 이상에서 온디바이스 서비스가
있으면 전용 인식기를 사용한다. 없고 기본 서비스가 있으면 iOS와 같이 기본 인식기로
시도하며, 결과의 `requestedOnDevice`·`supportsOnDevice`·`requiresOnDevice`·
`onDevice` 네 필드가 보장 여부를 드러낸다. 기본 서비스의 실제 처리 위치는 Android
API가 보장하지 않는다. `stop`은 마지막 결과를 최대 3초 기다린다. 종료 콜백은 한 번만
보내며, 부분 결과를 받은 뒤 오류가 나면 텍스트도 함께 보낸다.

Android `onRmsChanged`는 PCM 샘플을 주지 않는다. `level`·`peakLevel`·
`averageLevel`은 인식 서비스가 제공한 dB 값을 `0...1`로 변환한 **근사치**이고,
`bufferCount`는 `onBufferReceived`가 실제로 준 버퍼만 센다. 인식 서비스에 따라
레벨 알림이나 버퍼가 오지 않을 수 있다. iOS의 원본 PCM RMS와 수치 비교하지 않는다.

## 실행

JDK 17, SDK 35, 전용 Android 15 API 35 AOSP 에뮬레이터와 Maestro가 필요하다.
앱 데이터가 지워진다.

```sh
cd apps/android
ANDROID_HOME=<Android SDK 경로> ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -e class com.libitum.host.SpeechRecognitionModuleTest \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
cd ../..
E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:speech
```

Maestro는 모의 로그인·진행 데이터로 `Say Your Hello` 말하기 화면을 열고 마이크
권한 창을 허용한다. 인식 서비스가 없는 AOSP 이미지에서는 말하기 불가 안내와
건너뛰기 버튼이 나와야 한다. 화면 경로와 네이티브 권한 브리지 호출을 함께 확인한다.
이 절차는 실제 제공자 계정을 쓰지 않는다.

## 결과와 남은 확인

- 2026-10-02, Android 15 API 35 AOSP ARM 에뮬레이터: 단위 3건, 계측 2건,
  Maestro 1건 통과. `android.speech.RecognitionService` 조회 결과는 `No services found`다.
- Maestro에서 실제 Android 마이크 권한 창이 나타나고, 허용 뒤 말하기 화면이
  `Speech recognition isn't available right now` 안내로 전환됐다.
- AOSP Lynx 접근성 트리에 말하기 화면의 `Speak` 버튼 이름이 없어 Maestro는
  고정 좌표와 화면 이미지로 이 구간을 확인했다. 접근성 이름은 별도 조사 대상이다.
- 이 에뮬레이터는 실제 한국어 전사, 부분 결과, 정지 후 최종 결과와 온디바이스
  처리 여부를 검증할 수 없다. 음성 인식 서비스와 한국어 모델이 있는 전용 실기 또는
  Google Play 이미지에서 **마이크 허용·거부**, `안녕하세요` 전사, 정지 후 한 번의
  콜백, 백그라운드 중단, 온디바이스 보장 필드를 확인해야 한다.
