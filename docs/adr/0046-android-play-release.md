# ADR-0046 — Android Play 출시 설정: 출시 식별자 · targetSdk 36 · 16 KB로 다시 빌드한 AAR을 저장소에 둔다

- 상태: **채택** — 16 KB 페이지 에뮬레이터(Pixel_8 AVD · API 37 · Google Play 이미지) 하나에서 Play 배포 형태(AAB → bundletool 분할 설치)로 실행했다(2026-10-05).
  같은 날 4 KB 페이지 · API 30 에뮬레이터 하나에서도 실행했다(범위가 좁다 — 아래 표).
  ⚠ **API 26 ~ 29 · 31 ~ 32 · 실기 4 KB 기기 · 업로드 키 서명 · Play 재업로드 · 실기는 확인하지 않았다**(「확인한 것과 확인하지 못한 것」).
  이 브랜치로 만든 AAB는 아직 Play에 올라간 적이 없다.
- 날짜: 2026-10-05
- 다루는 축: Android 출시 식별자(`applicationId`와 Java `namespace`의 분리) · `compileSdk`/`targetSdk` · `versionCode` 관리 · 서명의 자리 ·
  64비트 네이티브 라이브러리의 16 KB 페이지 정렬(재빌드한 AAR의 출처와 빌드 게이트) · release 빌드의 Firebase 설정 검사
- 이어받는 결정: [ADR-0038](0038-android-minimal-host.md)(Android 최소 호스트 — 이 ADR은 그 「후속 구현」이다),
  [ADR-0012](0012-native-host-app-minimal.md) D4(Lynx SDK를 정확 버전으로 고정 — **4.0.1을 유지한다**),
  [ADR-0025](0025-duru-service-display-name.md) D3(`libitum` 기술 식별자 유지 — Android `applicationId`는 그 표에 없던 값이고 여기서 처음 정한다),
  [ADR-0043](0043-android-system-back.md)(재검토 조건 「targetSdk 36 이상」이 이 변경으로 걸렸다).
  **바꾸는 결정은 없다** — Java 소스 · 매니페스트 · JS · iOS 호스트 · Lynx/Fresco 버전이 그대로다.
  [ADR 색인의 보류 표](README.md#보류-표) 「배포·릴리스 경계」가 Android에서 열린다(서명 설정은 여전히 저장소에 없다 — D4).

## 맥락

Play Console에는 이 앱이 패키지 `libitum.duru.android`로 등록돼 있고 비공개 테스트 트랙에 `versionCode` 1이 올라가 있다. 그 AAB는 저장소 밖
작업 공간에서 만들어졌고 커밋이 남지 않았다. 이 저장소의 Android 호스트는 `applicationId 'com.libitum.host'` · `targetSdk 34` · `versionCode 1`이라,
저장소에서 만든 AAB는 그 앱의 새 버전으로 올릴 수 없었다. 결정이 딛고 선 사실은 아래다(작업 `android-release-config`의 계약 단계 실측, 2026-10-05).

1. **Firebase 설정은 `libitum.duru.android` 하나만 가진다.** 사용자의 `google-services.json`에 client가 하나다. 디버그 접미사(`.debug`) 앱은 없다.
2. **AGP 8.9.2는 `compileSdk 36`을 그대로 받는다.** SDK Platform 36 · Build Tools 36.0.0이면 되고 AGP · Gradle을 올릴 필요가 없다.
3. **「LOAD 정렬 ≥ 16 KB」만으로는 16 KB 판정이 틀린다.** 변경 전 APK의 Lynx 라이브러리는 `PT_LOAD`가 전부 `0x4000`인데도 16 KB 에뮬레이터에서
   프로세스가 뜰 때마다 「Android App Compatibility」 대화상자가 떴다. `PT_GNU_RELRO`의 끝(`p_vaddr + p_memsz`)이 16 KB 경계가 아니었다.
   변경 전 `assembleBundled` APK는 64비트 `.so` 33개 가운데 21개가 이 판정에서 실패했다.
4. **공개된 어떤 상위 버전도 이것을 풀지 못한다**(Maven Central의 AAR을 받아 같은 판정으로 쟀다).

   | 묶음 | 64비트 `.so` 결과 |
   |---|---|
   | Lynx 4.0.1 · 4.0.2 · 4.0.3 (같은 결과) | `liblynx_v8_bridge` · `liblynxbase` · `liblynxtrace` · `liblynx_service_api`가 RELRO 실패(두 ABI 모두). `liblynx`는 통과. `primjsWasm`의 `libwasm`도 RELRO 실패 |
   | Lynx 4.1.0 | 위 넷이 그대로 실패하고 **실패 라이브러리가 더 는다**(새 `lynx-gfx`, xelement가 끌어오는 `libharfbuzz` · `libc++_shared` 등) |
   | Fresco 2.3.0 (지금) | arm64 넷 RELRO 실패, x86_64 다섯 모두 실패(LOAD `0x1000` 넷) |
   | Fresco 3.4.0 · 3.9.0 | 3.9.0도 arm64 셋 · x86_64 셋이 RELRO 실패 |
   | AndroidX `datastore-core-android` | 1.1.7 · 1.2.0 실패, **1.2.1 통과** |

5. **Fresco 3.x는 정렬과 별개로 쓸 수 없다.** `lynx-service-image` 4.0.1 · 4.1.0이 `CloseableImage.getWidth()`를 클래스 호출(`invokevirtual`)로 부르는데
   Fresco 3에서 `CloseableImage`는 인터페이스다 → `IncompatibleClassChangeError`. 저장소 밖 선행 시도에서 16 KB 에뮬레이터의 로그인 화면 진입 중 충돌했다.
   상류 이슈(lynx#1542 · fresco#2834 · #2836)는 2026-10-05 조회 시점에 열려 있었다.
6. **같은 방식(같은 태그를 16 KB로 다시 빌드)으로 저장소 밖에서 만든 AAB는 Play 비공개 테스트 업로드가 수락됐다**(`versionCode` 1). 이 저장소의
   AAB가 수락된다는 증거는 아니다 — 방식의 선례다.

## 결정

### D1. `applicationId`는 `libitum.duru.android`, Java `namespace`는 `com.libitum.host` 그대로다

| 항목 | 값 | 근거 |
|---|---|---|
| `applicationId` | `libitum.duru.android` | Play Console 등록 값. Firebase 설정이 이 값 하나만 가진다(맥락 1) |
| `namespace` | `com.libitum.host` — **바꾸지 않는다** | Java 패키지 · `R` · `BuildConfig` · 매니페스트 상대 이름(`.MainActivity`)이 그대로라 Java 소스 이동이 0건이다 |
| 계측 APK | AGP 기본 `libitum.duru.android.test` | `testApplicationId`를 따로 두지 않는다 |
| 디버그 접미사 | 두지 않는다 | Firebase에 `.debug` 앱이 없어 google-services 플러그인이 실패한다 |

**이 분리가 만드는 규칙 — 새 스크립트 · 문서가 지킨다.**

1. **패키지를 받는 자리는 `libitum.duru.android`다**: `pm clear` · `am force-stop` · `pidof` · `adb uninstall` · Maestro `appId` · 계측 러너
   (`libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner`) · Firebase `package_name`.
2. **클래스를 받는 자리는 `com.libitum.host`다**: `-e class com.libitum.host.<Test>` · 소스 경로 `app/src/main/java/com/libitum/host/`.
3. **컴포넌트 이름은 축약하지 않는다.** `am start -n <패키지>/.MainActivity`의 `.` 축약은 패키지 기준이라 `libitum.duru.android/.MainActivity`는 없는 클래스다.
   `libitum.duru.android/com.libitum.host.MainActivity`로 쓴다.
4. 픽스처 방송의 동작 문자열(`com.libitum.host.test.STOP_SIGNED_IN_FIXTURE` · `…POST_PUSH_FIXTURE`)은 패키지가 아니라 임의 이름이라 그대로 둔다.

실행 표면(`e2e/android-*.yaml` · `devtools/android-maestro/*.sh` · `apps/android/*.sh`)에 낡은 패키지가 남지 않았는지는
`devtools/android-bundle/package-references.mjs`의 `staleAndroidPackageReferences`와 `pnpm test:android-bundle`이 본다. **문서는 그 검사의 대상이 아니다** — 리뷰가 본다.

패키지와 무관해 그대로인 것: 딥링크 `duru://auth-callback`(scheme · host이고 소셜 로그인은 Supabase 웹 OAuth + PKCE라 패키지 결합 설정이 없다 —
[ADR-0039](0039-android-social-oauth.md)), FCM 서버 쪽(토큰만 쓴다 — [ADR-0041](0041-android-push-transport.md)), 코드의 `getPackageName()`(실행 시 값).

### D2. `compileSdk` 36 · `targetSdk` 36, 코드 변경은 0건이다

`minSdk`는 26 그대로다. 34 → 36은 35 · 36 두 단계의 target 동작 변화를 함께 받는다. 계약 단계가 변화마다 앱 코드를 대조했고 고칠 곳이 없었다.

| 변화 (target) | 이 앱에서 |
|---|---|
| edge-to-edge 강제 · 시스템 바 색 호출 무동작 (35) | 이미 전체 화면으로 그리고 inset을 globalProps로 넘긴다([ADR-0044](0044-android-tappable-inset.md)) |
| 예측형 뒤로가기 기본 · `onBackPressed` 미전달 (36) | `enableOnBackInvokedCallback="true"`로 이미 새 모델이다. API 33 이상은 `OnBackInvokedCallback`, 26 ~ 32는 `onBackPressed()`([ADR-0043](0043-android-system-back.md) D3) |
| 전면이 아닌 앱의 오디오 포커스 요청 거절 (35) | 대사는 전면에서만 요청하고 효과음은 요청하지 않는다([ADR-0045](0045-android-host-audio-assets.md) D3) |
| 백그라운드 Activity 시작 제한 (35) | 알림 탭은 사용자 상호작용 경로다([ADR-0042](0042-android-push-host.md)) |
| `View.announceForAccessibility` deprecated (36) | 동작은 남고 컴파일 경고만 생긴다(TalkBack을 켠 에뮬레이터에서 이벤트 확인). 교체는 범위 밖이다 — 「재검토 조건」 |

「targetSdk 36은 Play의 현행 제출 요건」이라는 전제는 저장소 밖 선행 작업이 Play 정책 문서로 확인한 것을 받아 적은 것이고, **이 작업에서 다시 확인하지 않았다.**
AndroidX Browser 1.9.0 Auth Tab의 전제(`compileSdk 36`)가 이제 서지만 이전은 하지 않았다 — ADR-0039의 재검토 조건은 「36 + Auth Tab 지원 브라우저 검증」 둘 다다.

### D3. `versionCode`는 손으로 올린다 — 지금 2, `versionName`은 `0.1.0` 그대로

Play에 올릴 커밋에서 `app/build.gradle`의 정수를 1 올린다. iOS가 `CURRENT_PROJECT_VERSION`을 출시 커밋에서 손으로 올리는 것과 같다.
빌드 인자(`-PversionCode`)는 두지 않는다 — 저장소 밖 값으로 번호가 갈리면 어느 커밋이 어느 번호인지 저장소가 모른다. `versionName`은 사용자 결정으로 `0.1.0`을 유지한다.

### D4. 서명은 Gradle에 넣지 않는다

`bundleRelease`는 **서명 없는** AAB를 만들고, 업로드 키 서명은 사람이 `jarsigner`로 한다. `release` buildType에 `signingConfig`를 두지 않는다.
비밀 경로 · 조건부 서명 설정이 저장소에 생기지 않고, 테스트가 쓰는 디버그 키 재서명(bundletool) 흐름이 그대로다. 절차는
[Android 출시 설정 절차](../e2e/android-release-config.md)의 R9가 진다.

### D5. release 빌드는 `google-services.json`이 없으면 실패한다

`google-services.json`은 계속 추적하지 않는다(외부 콘솔 설정 파일을 저장소에 두지 않는 기존 관례). 대신 `verifyReleaseFirebaseConfig`를 `preReleaseBuild`에 걸어,
파일이 없으면 `Release build needs apps/android/app/google-services.json for libitum.duru.android …`로 멈춘다. 파일 없이 만든 release AAB는 FCM이 빠진 채
Play에 올라가기 때문이다. `debug` · `bundled`는 지금처럼 파일 없이 빌드된다. 파일에 새 패키지의 client가 없으면 google-services 플러그인이 스스로 멈춘다.

### D6. Lynx 4.0.1 · Fresco 2.3.0을 같은 태그에서 16 KB로 다시 빌드한 AAR 9개를 저장소에 둔다

- 상류의 같은 태그(Lynx `4.0.1` · Fresco `v2.3.0`)를 NDK r28과 링크 옵션 `-Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384`로 다시 빌드하고,
  상류 AAR에서 **64비트 `.so` 20개만** 바꿔 `apps/android/vendor-maven/`(Maven 배치)에 둔다. Java 클래스 · 리소스 · POM · 32비트 `.so`는 상류 그대로다.
- `apps/android/settings.gradle`의 `exclusiveContent`가 그 9개 모듈을 이 디렉터리**에서만** 찾게 한다. 좌표가 상류와 같아(`4.0.1` · `2.3.0`)
  `build.gradle`의 의존 선언은 바뀌지 않고, 상류본이 섞일 길이 없다.
- 소스 변경은 `vendor-maven/patches/`의 두 패치가 정본이고 `vendor-maven/rebuild.sh`가 한 번에 다시 만든다. `pnpm verify`와 Gradle 빌드는 이 스크립트를 부르지 않는다.
  재빌드 산출물은 비트 단위로 재현되지 않을 수 있다 — 「같은 판정을 통과하는 동등물」을 재현한다.
- 모듈 목록 · 바뀐 라이브러리 · 패치 내용 · 도구 버전 · 라이선스 고지는 [`apps/android/vendor-maven/README.md`](../../apps/android/vendor-maven/README.md)가 진다. 여기에 되풀이하지 않는다.
- **Lynx를 올리지 않는다.** 올려도 16 KB가 풀리지 않고(맥락 4), iOS(4.0.1)와 엔진이 갈리며, JS 쪽 호환 검증 비용만 생긴다.
- 의존 조정 둘이 함께 간다: `primjsWasm`(WebAssembly 엔진 — 앱 소스에 사용 0건이고 `libwasm.so`가 정렬되지 않았다)을 **설정 전체에서** 제외하고,
  `androidx.datastore:datastore-core-android`의 하한을 `constraints`로 1.2.1에 둔다(직접 의존을 더하지 않는다).

AAR을 저장소에 넣는 것은 사용자 결정이다(2026-10-05 — 재빌드 스크립트 · 패치와 함께).

### D7. 산출물의 정렬을 빌드가 검사한다 — 판정은 LOAD와 RELRO 끝 둘 다

`apps/android/app/native-alignment.gradle`이 변형마다(`debug` · `release` · `bundled`) 두 태스크를 단다.

| 태스크 | 걸리는 곳 | 검사 대상 |
|---|---|---|
| `verify<V>ApkNativeAlignment` | `assemble<V>` | `*.apk`의 `lib/(arm64-v8a\|x86_64)/*.so` |
| `verify<V>BundleNativeAlignment` | `bundle<V>` | `.aab`의 `base/lib/(arm64-v8a\|x86_64)/*.so` |

- 판정: 64비트 little-endian ELF의 모든 `PT_LOAD`가 `p_align ≥ 0x4000` · `p_offset ≡ p_vaddr (mod 0x4000)`이고 `PT_GNU_RELRO`의 끝이 `0x4000`의 배수다.
  RELRO를 넣은 이유는 맥락 3이다.
- 실패하면 `Native 16 KB page alignment check failed for <파일>: …`로 빌드가 멈춘다. **64비트 `.so`를 하나도 못 찾아도 실패한다**(빈 통과 금지).
- 같은 규칙이 Node 순수 함수 `devtools/android-bundle/elf-page-alignment.mjs`에도 있다(단위 테스트 · `rebuild.sh`의 마지막 검사 · 손으로 돌리는 CLI).
  Gradle이 Node를 부르지 않게 하려고 규칙을 Groovy로 한 번 더 옮겼다 — **규칙이 두 곳에 있다**(「대가」).
- AAB의 `BundleConfig` `PAGE_ALIGNMENT_16K`와 APK의 zip 정렬은 AGP 8.9.2의 기본 동작이라 게이트에 넣지 않았다. `useLegacyPackaging`을 켜지 않는다.

## 버린 대안

| 대안 | 버린 이유 |
|---|---|
| Lynx 4.0.2 · 4.0.3 · 4.1.0, Fresco 3.x로 올린다 | 맥락 4 · 5 — 어느 것도 판정을 통과하지 못하고(4.1.0은 실패가 는다), Fresco 3은 Lynx 4.0.1 · 4.1.0과 이진 호환되지 않으며, iOS와 엔진이 갈린다 |
| 재빌드한 AAR을 저장소 밖(GitHub Packages Maven)에 둔다 | 저장소는 커지지 않지만 **모든** Gradle 빌드(Android Studio · 워크트리 · 오프라인)에 `read:packages` 토큰이 필요해진다 |
| `packaging.jniLibs.useLegacyPackaging true` | 압축 · 추출 방식만 바꾼다. ELF 세그먼트가 그대로라 Play 검사와 기기 호환 판정이 같다 |
| `.so` 헤더의 RELRO `p_memsz`를 16 KB 경계로 깎는 이진 수정 | 비공식이고 RELRO 보호를 줄인다. Fresco x86_64의 LOAD `0x1000`은 재링크 없이 고칠 수 없다. Play가 받는지 근거가 없다 |
| release에서 `x86_64`를 뺀다 | 재빌드가 반으로 줄 뿐 arm64 재빌드는 남는다. ChromeOS · x86 에뮬레이터를 버린다 |
| 상류 수정을 기다린다 | 이슈가 열려 있고 일정이 없다 |
| `namespace`도 `libitum.duru.android`로 바꾼다 | Java 소스 · 테스트 경로 · 클래스 이름 실행 줄 · 문서가 전부 같이 움직이고 얻는 것이 없다. 대가는 `-n` 축약을 못 쓰는 것 하나다(D1) |
| `versionCode`를 빌드 인자로 받는다 | D3 — 어느 커밋이 어느 번호인지 저장소가 모르게 된다 |
| 서명 설정을 Gradle에 넣는다 | D4 — 비밀 경로와 조건부 설정이 저장소에 생긴다 |
| `google-services.json`을 추적한다 | 외부 콘솔 설정 파일을 저장소에 두지 않는 기존 관례를 깬다. 빠진 채 출시되는 위험은 D5의 검사로 막는다 |

## 대가

- **저장소가 약 16M 커졌다.** AAR 9개가 약 16 MiB이고 `apps/android/vendor-maven` 전체가 16M다. 그 전까지 가장 큰 추적 파일은 2.6 MiB짜리 PNG였다 —
  **이진 의존을 저장소에 넣은 첫 선례다.** 갱신할 때마다 같은 크기가 git 이력에 더 쌓인다.
- **Lynx · Fresco 버전을 올릴 때마다 `rebuild.sh`를 다시 돌려야 한다.** `exclusiveContent`가 그 9개 모듈을 `vendor-maven`에서만 찾으므로, `build.gradle`의 버전만
  올리면 의존 해석이 실패한다. 재빌드에는 JDK 11 · CMake 3.19.8 · NDK r28 · 네트워크(의존 약 1 GB)가 필요하고, 2026-10-05 측정으로 1회 약 7분이었다.
  패치가 새 태그에 그대로 붙는다는 보장은 없다.
- **상류가 16 KB를 지원하면 이 디렉터리는 지워야 할 짐이다**(「재검토 조건」). 그때까지 Lynx Android 네이티브 라이브러리는 상류 배포본이 아니라
  이 저장소가 빌드한 것이다 — 상류에 문제를 보고할 때 그 차이를 밝혀야 한다.
- **Lynx 라이브러리의 툴체인이 상류와 다르다**(NDK 21 → 28). 16 KB 에뮬레이터에서 기동 · 그림 · 소리 · 뒤로가기를, 4 KB 에뮬레이터(API 30) 하나에서 로드 · 그림 · 뒤로가기를 확인했지만, 실기 SoC와 실기 4 KB 기기에서의 로드는 확인하지 않았다.
- **정렬 규칙이 두 곳에 있다**(Groovy 게이트와 Node 함수). 한쪽만 고치면 빌드와 CLI의 판정이 갈린다.
- **패키지와 Java 패키지가 다르다.** `am start -n`의 축약형을 쓸 수 없고, 문서 · 스크립트를 쓸 때마다 「패키지 자리인가 클래스 자리인가」를 갈라야 한다(D1의 규칙).
  문서는 자동 검사 대상이 아니다.
- **옛 패키지와 공존한다(개발 기기만).** `com.libitum.host`로 설치된 앱은 지워지지 않고 따로 남는다. 둘 다 `duru://auth-callback`을 선언해 함께 있으면
  콜백에 앱 선택 창이 뜬다 — 소셜 로그인 확인 전에 옛 앱을 지운다. 스크립트는 지우지 않는다. Play 사용자는 처음부터 새 패키지만 가진다.
- **워크트리마다 `google-services.json`을 둬야 release가 빌드된다**(D5).
- **`View.announceForAccessibility` 컴파일 경고가 남는다**(D2).

## 확인한 것과 확인하지 못한 것

절차와 항목 번호(R1 ~ R9)는 [Android 출시 설정 절차](../e2e/android-release-config.md)가 진다.

| 무엇 | 상태 | 증거 |
|---|---|---|
| AAB의 64비트 `.so` 31개(arm64 16 · x86_64 15) 실패 0 · `libwasm` 0 · `PAGE_ALIGNMENT_16K` | 통과 | 같은 문서 R1, 빌드 게이트, `pnpm test:android-bundle` |
| 16 KB 에뮬레이터에서 호환성 대화상자 없음(새 설치 · `pm clear` 뒤 · HOME 복귀) | 에뮬레이터 통과(변경 전에는 매번 떴다) | R1 |
| 설치된 앱의 패키지 `libitum.duru.android` · `versionCode=2` · `targetSdk=36` · `minSdk=26` | 에뮬레이터 통과 | R2, 계측 `ReleaseIdentityTest` |
| 새 패키지 · 새 Firebase 설정으로 FCM 토큰 발급 | 에뮬레이터 통과 | R3, `apps/android/test-live-fcm-token.sh` |
| 딥링크 콜백이 새 패키지에 닿고 선택 창이 없다(옛 앱을 지운 상태) | 에뮬레이터 통과 | R4 |
| 뒤로가기 · 3버튼 탭 바 · 효과음 · 대사 · 서사 배경이 그대로 | 에뮬레이터 통과(API 37 — `OnBackInvokedCallback` 경로만) | R5 |
| 이름을 바꾼 Maestro 흐름과 계측 | 에뮬레이터 통과. 계측 일괄 41건 가운데 40건 통과, 남은 `ButtonAccessibilityTest` 1건은 실행 조건(번들 서빙 · TalkBack 켬)이 빠져 실패했고 조건을 맞춰 따로 돌리자 `OK (1 test)`였다 — 제품 결함이 아니다 | R8, [TalkBack 검증](../e2e/android-talkback.md) |
| `announceForAccessibility`가 targetSdk 36에서 끊기지 않는다 | 에뮬레이터 통과 — TalkBack을 켠 상태에서 `CompletionAnnouncementModuleTest`가 `TYPE_ANNOUNCEMENT` 이벤트를 확인(`OK (3 tests)`). **소리로 들리는지는 확인하지 못했다** | [TalkBack 검증](../e2e/android-talkback.md) |
| 재빌드한 `.so`가 4 KB 페이지에서 로드된다 | **에뮬레이터 하나에서 통과** — 2026-10-05, API 30(Android 11) · `PAGE_SIZE` 4096 · arm64 `google_apis` 에뮬레이터 · `114099e3`. 로드 오류 0, 온보딩과 Fresco 그림이 섰다. 설치된 분할 APK에 오디오 자산 29개, 효과음 호출 logcat, 계측 일괄 `OK (40 tests)`. **실기 4 KB 기기 · 다른 API 수준 · 소리 청음(`-no-audio`)은 확인하지 못했다** | R6 |
| **x86_64 재빌드 `.so` 10개** | **확인하지 못했다** — 어느 기기 · 에뮬레이터에서도 실행된 적 없다(검증 에뮬레이터는 arm64-v8a). 정적 정렬 검사만 통과 | R1(정적) |
| targetSdk 36에서 API 26 ~ 32의 `onBackPressed()` 경로 | **API 30 · 3버튼에서만 통과** — B2 · B5 · B6 · B7(b)(화면의 닫기 · 탭 루트 → 여정 · 떠남 · 온보딩 단계 되돌리기). 3버튼 하단 겹침 없음은 스크린샷 육안이다. **API 26 ~ 29 · 31 ~ 32, 제스처 모드, B3 · B4 · B7(a) · B8 · B9, API 30에서의 `ButtonAccessibilityTest` · session-resume · storage-restart는 확인하지 못했다** | R6 |
| **업로드 키 서명 · Play가 이 저장소의 AAB(`versionCode` 2)를 받는가 · 실기에서의 소리 · 그림 · 탭 바 · 16 KB 경고** | **확인하지 못했다** — 사용자 몫이고 아직 하지 않았다. 수락된 것은 저장소 밖에서 만든 `versionCode` 1뿐이다(맥락 6) | R9 미실행 |
| **음성 인식 Maestro 흐름(`speech`)** | **실행하지 않았다** — 실행기가 AOSP 이미지를 요구하고 FCM 확인은 Google Play 이미지를 요구한다 | R8 |
| **「targetSdk 36이 Play 현행 요건」 · 상류 이슈의 지금 상태** | 이 작업에서 다시 확인하지 않았다 / 2026-10-05 조회 값이다 | — |
| **실기 TalkBack(음성 출력 · 스와이프 초점 순서 · 완료 안내가 들리는가) · 스위치 제어 · 온보딩/로그인 밖 화면의 TalkBack** | **확인하지 못했다** — 에뮬레이터에서 서비스 바인딩 · 노드 · 이벤트만 봤다 | — |

## 재검토 조건

- **상류 Lynx · Fresco가 D7의 판정을 통과하는 `.so`를 내면**(`node devtools/android-bundle/elf-page-alignment.mjs <상류 AAR>...`가 종료 코드 0) → D6.
  `vendor-maven`과 `settings.gradle`의 `exclusiveContent`를 지운다. Fresco는 Lynx의 이미지 서비스가 그 버전과 이진 호환되는지도 함께 본다(맥락 5).
- **Lynx 또는 Fresco 버전을 올릴 때** → D6. 먼저 상류 AAR을 위 CLI로 재고, 통과하지 못하면 `rebuild.sh`와 패치를 그 태그에 맞춰 다시 만든다.
  ADR-0045의 재검토 조건(그림 애니메이션)과 ADR-0012 D4(iOS와 같은 버전)도 같은 사건에 걸린다.
- **R6의 남은 범위(다른 API 수준 · 실기 4 KB 기기)에서 로드 오류가 나오거나 API 26 ~ 32에서 뒤로가기가 어긋나면**(API 30 에뮬레이터 하나에서는 둘 다 통과했다) → D6 · D2. 구현을 고치기 전에 이 ADR로 돌아온다.
- **R9에서 Play가 업로드를 거절하면**(대상 API · 16 KB · 서명) → 거절 사유에 해당하는 결정(D2 · D6 · D7 · D4).
- **Play의 대상 API 요건이 37 이상이 되면** → D2. 그 단계의 target 동작 변화를 같은 표로 다시 대조한다.
- **플랫폼이 `View.announceForAccessibility`의 제거를 예고하면**(또는 Play 대상 API가 37이 되어 D2를 다시 볼 때) → `CompletionAnnouncementModule`의 대체를 검토한다.
  이 API는 API 36에서 deprecated지만 targetSdk 36에서 동작이 끊기지 않는 것을 확인했다(2026-10-05, API 37 에뮬레이터 · TalkBack을 켠 상태에서 `TYPE_ANNOUNCEMENT` 이벤트).
  바꿀 때는 「한 번만 · 원문 그대로」 계약([완료 안내 절차](../e2e/android-completion-announcement.md))을 지킨다.
- **AndroidX Browser Auth Tab으로 옮기게 되면** → ADR-0039의 재검토 조건이 진다. `compileSdk 36` 전제는 이 ADR로 이미 섰다.
