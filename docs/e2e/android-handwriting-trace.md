# Android 손글씨 안내·판정 검증

## 범위

기존 Lynx `HandwritingTraceModule.guide`·`compare` 접점을 Android 호스트에 연결한다.
`WritingScreen`과 최종 테스트 쓰기 패널은 동일한 요청을 사용한다. 안내 PNG와 판정의
글자 마스크는 같은 래스터화·잉크 경계 중앙 정렬 함수에서 나온다. `coverage`는 안내 잉크
중 팽창한 획에 닿은 비율, `stay`는 획 중 팽창한 안내에 닿은 비율이다. 문턱값은 JS
화면의 기존 판정 기준이 결정한다.

Android에는 `AppleSDGothicNeo-Regular`가 없으므로 시스템 `sans-serif` 계열을
사용하고 응답의 `font`에도 이를 적는다. 화면에는 호스트 PNG를 그대로 깔아
글꼴 차이가 안내와 판정의 좌표 차이로 이어지지 않게 한다. 모든 래스터화는 전용
워커에서 실행한다. 입력은 1024×1024·100만 픽셀, 100획·1만 점 이하로 제한한다.

## 실행

JDK 17, SDK 35, 전용 Android 15 API 35 AOSP 에뮬레이터와 Maestro가 필요하다.
스크립트가 앱 데이터를 지우고 390×844·160 dpi·글자 배율 1.0으로 맞춘다.

```sh
cd apps/android
ANDROID_HOME=<Android SDK 경로> ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s <전용 에뮬레이터 ID> shell am instrument -w \
  -e class com.libitum.host.HandwritingTraceModuleTest \
  com.libitum.host.test/androidx.test.runner.AndroidJUnitRunner
cd ../..
E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:handwriting
```

계측 테스트는 한국어 음절의 PNG가 실제로 생성되는지, PNG의 불투명 픽셀 수와
`compare`의 `guideArea`가 같은지, 안내의 잉크 픽셀을 찍은 획이 양의 겹침 비율을
받는지 확인한다. 잘못된 인자·과도한 크기·빈 획도 구분한다. Maestro는 모의
로그인·진행 상태로 `Trace One Letter`를 열어 안내·터치 획·판정 화면을 비교하고
네이티브 `guide`와 `compare` 호출을 각각 한 번 확인한다. 실제 제공자 계정은 쓰지 않는다.

## 결과와 남은 확인

- 2026-10-02, Android 15 API 35 AOSP ARM 에뮬레이터: 순수 Java 단위 3건,
  계측 3건, Maestro 1건 통과.
- 안내 `나` PNG가 작업 영역 가운데에 보였고, 표면을 그은 뒤 `Check`가 나타나
  판정 화면으로 바뀌었다. 모듈 등록을 뺀 비교 실행에서는 네이티브 호출 검사가 실패했다.
- 이 AOSP의 Lynx 접근성 트리에는 맵의 쓰기 표식과 `Start`·`Check` 이름이 없어
  Maestro는 고정 화면 크기의 좌표와 화면 이미지로 확인했다. TalkBack으로 쓰기 흐름을
  조작할 수 있는지는 별도 실기 확인이 필요하다.
- Android와 iOS 글꼴 모양이 다르고 문턱값은 기존 임시 값이다. 다양한 글자·손글씨·화면
  크기의 통과율과 오탐률, 응답 지연·메모리는 배포 후보 기기에서 추가로 측정해야 한다.
