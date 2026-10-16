# Airbridge 앱 이벤트 SDK — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 앱 시작 시간 캡처(`performance:capture`)를 돌리지 않았습니다. 번들 크기와
  호스트 앱 · 출시 산출물 용량만 재었습니다. 이 변경에는 화면이 없고, 값이 없는 빌드에서 런타임에 더해진 것은 동적
  프레임워크 하나의 로드(iOS) · 수명주기 provider 하나(Android)와 설정 판정 한 번뿐입니다.
- 기능 PR: Meta 앱 이벤트 SDK를 Airbridge(MMP) SDK로 교체 — iOS `airbridge-ios-sdk-restricted` 4.11.1 · Android
  `io.airbridge:sdk-android` 4.11.3, 호스트 모듈 `AirbridgeEventsModule`, JS 매핑 · sink 합성(이 보고서와 같은 PR).
  결정은 `docs/adr/0063-airbridge-events.md`. 직전 기록은 `meta-app-events-iphone-17-pro-simulator-01.md`(Meta SDK)입니다.
- 대상 commit: 브랜치 `feat/airbridge-sdk`의 `77cad033`(main `3a33f22e` 위). 번들은 같은 브랜치의 JS 결선 커밋
  `dd2824c0` 이후 바뀌지 않았습니다.
- 기기: iPhone 17 Pro 시뮬레이터 — 앱 용량을 잰 Release 빌드의 대상입니다(성능 캡처는 아닙니다). Android 수치는
  기기와 무관한 `bundled` APK · release AAB 파일의 크기와 bundletool의 arm64 기기 스펙 추정값입니다.
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm build`의 `main.lynx.bundle`(Node 22.23.2). iOS는 값 파일 없는 Release 시뮬레이터 빌드의
  `Host.app`, Android는 값 파일 없는 `./gradlew :app:assembleBundled :app:bundleRelease`(R8)의 산출물입니다.
- 측정 일시: 2026-10-13

## 시나리오

- 번들 크기: 이 브랜치를 빌드해 `apps/mobile/dist/main.lynx.bundle` 크기를 Meta SDK 기록(1,721,929 bytes)과 비교하고
  `pnpm size:check`를 돌렸습니다.
- 스레드 경계 · 잔여 확인: 산출 번들에서 `AirbridgeEventsModule` · `MetaAppEventsModule` · 와이어 값 문자열의 등장 횟수를
  셌습니다.
- iOS 앱 용량: 값 없는 Release 시뮬레이터 `Host.app`의 디렉터리 크기와 `Frameworks/Airbridge.framework`의 크기를
  재었습니다. 배포물의 arm64 바이너리 크기는 pod 배포물에서 읽었습니다.
- Android 앱 용량: `app-bundled.apk` 크기, release AAB의 `base/dex/classes.dex` 크기(산출물 가드 A3), bundletool의 arm64
  기기 다운로드 크기를 main과 비교했습니다. 64비트 `.so` 개수와 16 KB 정렬도 셌습니다.
- 화면 확인: 없음 — 이 PR은 화면을 바꾸지 않습니다.

## 이 변경이 무엇을 건드렸나

- JS: Meta용 모듈 셋을 `git mv`로 옮겨 Airbridge 매핑으로 바꿨습니다(`lib/airbridge-events.contract.ts` 타입 ·
  `lib/airbridge-events.ts` 순수 매핑과 sink 합성 · `lib/airbridge-events-module.ts` `background-only`). 진입점은 import
  경로만 바뀌었습니다. 새 npm 의존성은 없습니다.
- iOS 호스트: pod `FBSDKCoreKit` · `FBSDKCoreKit_Basics` · `FBAEMKit`(동적 프레임워크 셋)이 빠지고
  `airbridge-ios-sdk-restricted`(동적 프레임워크 하나)가 들어왔습니다. Swift 파일 둘의 이름과 내용, `Info.plist`의 키
  (Facebook 키 다섯 · `SKAdNetworkItems` 제거, Airbridge 키 둘).
- Android 호스트: `facebook-core`와 전이 의존이 빠지고 `io.airbridge:sdk-android`와 전이 의존(코루틴 · `play-services-appset`)이
  들어왔습니다. 네이티브 `libairbridgelib.so`가 ABI마다 하나 더해졌고, Airbridge의 소비자 R8 규칙이 Fresco · SoLoader를
  축소에서 뺍니다.
- 새 이미지 · 음원은 없습니다.

## 분석 결과

| 항목 | 값 |
| --- | --- |
| `main.lynx.bundle` 직전 기록(Meta SDK) | 1,721,929 bytes |
| `main.lynx.bundle` 이 브랜치 | 1,721,943 bytes |
| 차 | +14 bytes |
| 상한(`devtools/bundle-size/budget.json`) | 1,722,000 bytes — 수정하지 않음. 여유 57 bytes |
| 최신 main(#240 · #241 · #243 병합 뒤, `e1e2ada2`)에 다시 얹은 값 | 1,903,483 bytes — 상한 1,905,000(수정하지 않음), 여유 1,517 bytes. 위 세 줄은 다시 얹기 전(`3a33f22e` 기준)의 실측이다 |
| 번들 안 `AirbridgeEventsModule` | 1회 |
| 번들 안 `MetaAppEventsModule` · `fb_mobile` | 0회 · 0회 |
| 번들 안 `airbridge.user.signup` · `airbridge.achieveLevel` | 1회 · 2회 |
| iOS Release 시뮬레이터 `Host.app` 이 브랜치 | 50,512 KB |
| iOS Release 시뮬레이터 `Host.app` Meta SDK 기록 | 63,064 KB |
| iOS Release 시뮬레이터 `Host.app` Meta SDK 이전 기록 | 53,260 KB |
| 그중 `Frameworks/Airbridge.framework`(시뮬레이터 슬라이스) | 5,732 KB |
| Airbridge 배포물 arm64 바이너리 · 프레임워크 디렉터리 | 2,909,200 bytes · 3,772 KB |
| Android `app-bundled.apk` 이 브랜치 | 58,760,520 bytes |
| Android `app-bundled.apk` main 대비 | +327,817 bytes |
| release AAB `classes.dex` main | 3,211,016 bytes |
| release AAB `classes.dex` 이 브랜치 | 4,116,320 bytes (+905,304) — 가드 한도 4,300,000(사용자 승인으로 4,000,000에서 올림) |
| 기기 다운로드 arm64(bundletool) main → 이 브랜치 | 17,077,710 → 17,359,578 bytes (+281,868) — 가드 한도 18,000,000 |
| release AAB `base/lib/` `.so` 개수 | 17 · 17 · 17 · 16(arm64-v8a · armeabi-v7a · x86 · x86_64) — 64비트 33개, 16 KB 정렬 실패 0 |

- 상한: `size:check`는 상한 안입니다. 넘지 않았으므로 올리지 않았습니다. 이름이 길어진 만큼(`AirbridgeEventsModule`)과
  와이어 값이 짧아진 만큼이 거의 상쇄됐습니다.
- 스레드 경계: 문자열 `AirbridgeEventsModule`은 번들에 1회 나옵니다. 번들이 바이너리 형식이라 그 한 번이 어느 스레드
  구간에 있는지는 가르지 못했습니다. 메인 스레드에 새지 않았다는 근거는 `background-only`를 첫 줄에 둔 모듈을 낀
  빌드가 성공했다는 것입니다. Meta 쪽 문자열은 0회입니다.
- Android dex 증가의 대부분은 SDK 자체보다 Fresco · SoLoader가 축소에서 빠진 몫으로 보입니다 — Airbridge AAR의
  `classes.jar`는 1,068,296 bytes(축소 전)이고, 원인은 소비자 규칙 `-keep class com.facebook.** { *; }`입니다. 몫을 나눠
  잰 것은 아닙니다.

## 해석

- iOS `Host.app`이 Meta SDK 기록보다 12,552 KB 작습니다(프레임워크 셋 → 하나). 다만 **Meta SDK 이전 기록 53,260 KB보다도
  작은 까닭은 확인하지 못했습니다** — SDK가 하나 더 있으니 그보다 커야 자연스럽습니다. 세 값이 같은 조건(번들 · 빌드 설정 ·
  DerivedData 상태)의 빌드인지 대조하지 않았으므로, 이 표의 iOS 차이는 측정 한계 안의 값입니다 —
  같은 세션에서 다시 빌드해 견주기 전에는 판정할 수 없습니다.
- 시뮬레이터 슬라이스의 프레임워크(5,732 KB)는 arm64와 x86_64를 함께 싣습니다. 기기용 App Store 슬라이스의 증가분은
  배포물 arm64 바이너리(약 2.9 MB)에 가까울 것으로 보지만 Archive로 재지 않았습니다.
- Android는 같은 조건의 main 빌드와 비교했습니다. APK +327,817 bytes는 ABI 넷을 다 싣는 로컬 검증용 산출물의 값이고,
  사용자가 받는 크기에 가까운 것은 arm64 다운로드 +281,868 bytes입니다.

## 결론과 후속

- JS 번들 증가는 +14 bytes로 상한 안이지만 여유가 57 bytes뿐이라, JS를 조금이라도 더하는 다음 변경은 상한을 다시 올려야
  할 것으로 보입니다.
- Android release dex가 약 0.9 MB 커져 가드 한도를 사용자 승인으로 올렸습니다. Fresco를 올리거나 걷어 낼 때, 또는
  Airbridge SDK를 올릴 때 다시 잽니다(ADR-0063 재검토 조건).
- `native-alignment.artifacts.mjs` NA3의 기대(64비트 `.so`)를 31 → 33으로 고쳤고 같은 산출물에서 통과했습니다(정렬 실패 0).
- iOS 용량은 Meta SDK 이전 · Meta SDK · 이 브랜치를 같은 세션에서 다시 빌드해 견주고, 기기 슬라이스는 Archive로 잽니다.
- 동적 프레임워크 로드와 값이 있는 빌드의 SDK 초기화가 앱 시작 시간에 주는 영향은 재지 않았습니다. 실제 값을 넣어 수신을
  확인하는 때에 `performance:capture`로 변경 전후를 잽니다.

## 제한 사항

- 단일 빌드 1회라 빌드 간 변동은 보지 못했습니다. 번들의 직전 값과 iOS의 두 비교 값은 앞선 보고서의 기록을 그대로 썼고
  같은 세션에서 다시 빌드하지 않았습니다.
- iOS 수치는 시뮬레이터 슬라이스의 디렉터리 크기입니다. 기기에 설치되는 크기나 App Store 다운로드 크기로 일반화할 수
  없습니다.
- Android 다운로드 크기는 arm64 기기 스펙 하나만 쟀고(가드 A7은 `BUNDLETOOL_JAR` 없이 건너뜀), Play가 실제로 보여 주는
  크기와 같다는 확인은 없습니다.
- 렌더링 · 메모리 · 앱 시작 시간 · SDK 초기화 시간은 미측정입니다. 이 기록은 기준값이 아닙니다.
