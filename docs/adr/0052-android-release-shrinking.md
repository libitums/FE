# ADR-0052 — Android 출시 빌드의 코드 축소: release를 R8로 축소 · 난독화하고, ABI는 4개를 그대로 싣는다

- 상태: **채택.** minify의 범위와 ABI는 **사용자 결정이다**(2026-10-07 — 아래 「사용자 결정」 U1 · U2). **ABI 쪽은 계약 단계의 권고(arm64-v8a만)와 다른 선택이다.**
  ⚠ **축소한 빌드가 돈 곳은 arm64 에뮬레이터 둘(Pixel_8 AVD · API 37 · 16 KB, R6_API30 AVD · API 30 · 4 KB)뿐이다.** 실기 · 다른 API 수준 · 업로드 키로 서명한 AAB · Play에서는 한 번도 돌지 않았다.
  ⚠ **로그인 뒤 경로의 증거는 출시 바이너리의 것이 아니다.** 축소한 빌드에는 계측 픽스처가 붙지 않아, 일회용 사본에 탐침 훅을 넣어 다시 빌드한 AAB로 봤다 — 그 dex는 출시 바이너리와 같지 않다(「검증」의 표가 케이스마다 가른다).
  ⚠ **ABI를 유지하기로 했으므로 `armeabi-v7a` · `x86` · `x86_64` 라이브러리가 지금처럼 그 기기들에 내려간다 — 이 저장소의 어떤 검증에서도 실행된 적이 없는 라이브러리이고, x86_64에는 `libserval_svg.so`가 없다**(「미확인 · 후속」 4).
  ⚠ keep 규칙 둘 가운데 **K2는 충돌을 관찰하지 못한 방어 규칙이다**(D2). 어노테이션 없이 JNI로 불리는 메서드의 누락은 정적 검사가 잡지 못한다(「대가」 1).
  ⚠ **accessibility 단계는 차단 지적 없이 끝났으나**(「검증」의 「accessibility 단계의 결과」) **TalkBack이 실제로 읽는 문장 · 스와이프 포커스 순서 · 로그인 뒤 화면은 보지 못했고**, 접근성 활성화의 근거는 손으로 한 더블탭이며 **그것은 출시 바이너리가 아니라 축소한 `bundled`에서 본 것이다**(「미확인 · 후속」 9).
  ⚠ **`bundled`의 dex는 `google-services.json`이 있는 빌드에서 release의 dex와 바이트가 같다**(sha256 `b751b2f5…` — 리뷰 뒤 test-runner의 재현). **파일 없이 빌드한 `bundled`만 다르다**(`24ac3ed6…`). 이 문서의 직전 판은 「둘은 같지 않다」고 적었다 — **그 일반화는 틀렸고 거둔다**(「검증」의 「release와 `bundled`의 dex — 리뷰 뒤의 재현」).
  `bundled`로 본 것(TalkBack 흐름 · 스플래시 반복 · 접근성 더블탭)은 **release와 같은 dex의 관찰이다 — 그 빌드에 파일이 있었을 때.** 보존된 APK로 그것을 확인한 것은 e2e의 TalkBack 흐름(E7)과 리뷰 뒤의 판정 실행이고, 나머지는 Gradle 로그 수준이다.
  ⚠ **최종 검증은 통과했다(주석 있음 — HEAD `28c307e4`, 제품 결함 0). 리뷰는 조건부 PASS였고(HEAD `6eb51a61` — 차단 0 · P1 4건), 재리뷰 r02가 PASS를 냈다(HEAD `9965eee2` — P1 네 건 닫힘 · 새 P0 · P1 없음).** **머지 전 사용자 항목은 없다. 출시 전 사용자 항목이 다섯 남았다**(「검증」의 「리뷰와 P1의 처리」). 최종 검증이 다시 돌리지 않은 것은 「미확인 · 후속」 10에 있다.
- 날짜: 2026-10-07(사용자 결정) · 기록 2026-10-08(e2e 실행이 2026-10-08 00:25에 끝났다) · 정정 2026-10-08(accessibility 단계의 결과와 e2e 절차 · 도구 정정 `1b99f08f`를 반영 — 결정은 바뀌지 않았다) · 정정 2026-10-08(최종 검증의 결과와 accessibility 권고의 반영 `28c307e4`를 반영, 「release와 `bundled`의 dex」 문면을 바로잡음 — 결정은 바뀌지 않았다) · 정정 2026-10-08(절차 문서의 접근성 활성화 단계 정정 `126325d4`와 그 절차 확인을 반영 — 결정은 바뀌지 않았다) · 정정 2026-10-08(리뷰(조건부 PASS, HEAD `6eb51a61`)의 P1 · P2와 test-runner의 재현을 반영 — 「release와 `bundled`의 dex」 문면을 다시 바로잡고 사용자 결정 U4 · U5를 기록 — D1 ~ D5의 결정 내용은 바뀌지 않았다) · 정정 2026-10-08(재리뷰 r02(PASS, HEAD `9965eee2`)의 P2 셋을 반영 — 최종 검증이 견준 `bundled`의 출처를 로그가 보여 주는 대로 적음 — 결정은 바뀌지 않았다)
- 다루는 축: Android 출시 산출물(release AAB)의 코드 축소 · 난독화 · 리소스 축소 여부 · 프로젝트 R8 규칙의 범위와 근거 수준 · `bundled` 변형이 그 설정을 물려받는가 ·
  출시 산출물이 싣는 ABI · 축소가 되돌아가지 않게 하는 검사
- 이어받는 결정: [ADR-0046](0046-android-play-release.md)(Android 출시 설정 — 이 ADR은 그 위에 선다. D4 「서명은 Gradle에 넣지 않는다」 · D6 「16 KB로 다시 빌드한 AAR 9개」 · D7 「정렬 게이트」가 그대로다),
  [ADR-0038](0038-android-minimal-host.md)(Android 최소 호스트), [ADR-0012](0012-native-host-app-minimal.md) D4(Lynx 4.0.1 고정).
  **바꾸는 결정은 없다.** 호스트 Java · 매니페스트 · 리소스 · `apps/mobile/src` · iOS 호스트 · `vendor-maven` · `applicationId` · `versionCode`(2) · SDK 수준 · 서명 · 계측의 대상 변형(debug)이 그대로다.
  ABI가 바뀌지 않아 ADR-0046의 「64비트 `.so` 31개」와 버린 대안 「release에서 `x86_64`를 뺀다」도 그대로 맞다 — 그 문서는 고치지 않았다.
  공유 JS(`apps/mobile/src`)가 바뀌지 않아 성능 보고서 게이트 대상이 아니다.

근거 표시는 작업 `android-abi-minify`의 계약을 그대로 옮긴다. **[실측]** 사본이나 구현 커밋에서 빌드하거나 에뮬레이터에서 돌려 수치 · 로그로 봤다 · **[정적]** 저장소 파일 · AAR · 산출물을 읽었다 ·
**[SDK/문서]** Android · Play · AGP 문서로 아는 것이고 **이 작업에서 다시 조회하지 않았다**(기억에 기댄다) · **[추론]** 관찰 없이 이어 붙였다 · **[미확인]**.
크기는 모두 바이트다. 「기기 다운로드」는 `bundletool 1.17.2 get-size total --device-spec`의 값(디버그 키로 서명한 분할 APK 세트의 압축 전송 크기 추정)이고 **Play가 실제로 보여 주는 크기와 같다는 확인은 없다** [미확인].
번들은 모의 값(`example.invalid`)으로 만들었다. 수치 · 로그의 정본은 하네스 작업 폴더(`.agent-harness/work/android-abi-minify/` — 저장소 밖)의 `spec.md`(r01 · **r02 — 뒤 개정이 앞을 덮는다**) · `green.md` · `e2e-run.md` · `accessibility.md` · `verify.md` · `review.md` · `review-p1.md` · `logs/` · `artifacts/`다.
계약은 두 번 고정됐다 — r01은 권고안(arm64 필터 + R8) 기준이고, 사용자 결정을 받은 r02가 범위를 「ABI 필터 없음 · R8만」으로 줄였다. **아래 수치마다 어느 조합에서 잰 것인지 적는다**(「실측」).

## 맥락

1. **변경 전의 release** [정적 + 실측 — HEAD `7dfaa937`의 `bundleRelease`]. `minifyEnabled false`, `shrinkResources` · `proguardFiles` · `ndk.abiFilters` · `splits` · `bundle {}` 선언 없음, `proguard-rules.pro` 없음.
   AAB 35,063,383바이트가 ABI 4개(`arm64-v8a` 16 · `armeabi-v7a` 16 · `x86` 16 · `x86_64` **15**)와 dex 3개(비압축 15,339,268)를 실었다. 필터가 없어 의존 AAR이 싣는 ABI가 전부 들어간다.
2. **x86_64에는 `libserval_svg.so`가 없다** [정적]. `servalsvg` 0.0.2 AAR이 3개 ABI만 싣는다. 앱은 로그인 뒤 화면에서 `<svg>`를 쓴다(`JourneyStatModal.tsx` · `FinalSpeakingPanel.tsx`). x86_64 기기에서 그 화면이 어떻게 되는지는 돌려 보지 않았다 [미확인].
3. **이 저장소가 실행해 본 ABI는 `arm64-v8a` 하나다** [정적 + 실측]. 검증 에뮬레이터 둘의 `ro.product.cpu.abilist`가 `arm64-v8a` 하나이고, 32비트(`armeabi-v7a` · `x86`)는 상류 AAR 그대로이며 x86_64는 재빌드본이다(ADR-0046 「확인하지 못했다」).
4. **ABI 필터는 기기 다운로드를 줄이지 않는다** [실측]. AAB는 기기 ABI의 분할만 내려 주므로 arm64 기기의 다운로드는 필터 유무와 무관하게 21,145,550이었다. 필터가 줄이는 것은 AAB 업로드 크기와 **설치할 수 있는 기기의 범위**다(「실측」의 ABI 선택지 표).
5. **R8을 규칙 없이 켜면 빌드가 실패하고, 그것만 풀면 기동 즉시 죽는다** [실측 — 계약 단계의 사본].
   1. `minifyEnabled true` + `proguard-android-optimize.txt`만으로는 `:app:minifyReleaseWithR8`이 `Missing classes detected while running R8`로 멈춘다. 없는 클래스 7개: `com.google.gson.Gson` · `JsonSyntaxException`(Lynx `LynxEnv`가 참조) · `com.lynx.markdown.*` 5개(`xelement-markdown`이 참조). 변경 전 앱도 이 클래스들 없이 돈다(같은 클래스패스).
   2. AGP가 낸 `-dontwarn` 7줄만 넣은 빌드는 `Application.onCreate`의 `LynxEnv.init`에서 죽는다: `NoSuchMethodError: no static method "Lcom/lynx/base/log/LynxLog;.log(…)V"` → `JNI DETECTED ERROR IN APPLICATION: mid == null` → `SIGABRT`.
      `liblynxbase.so`가 JNI로 이름을 찾는 `LynxLog.log` · `logByte`에는 `@com.lynx.base.CalledByNative`가 붙어 있는데 **그 어노테이션을 지키는 규칙이 어디에도 없다** — `lynx` AAR의 consumer 규칙은 `@com.lynx.tasm.base.CalledByNative`(다른 패키지)만 지키고 `lynx-base` AAR은 규칙을 싣지 않는다.
   3. **같은 종류의 누락이 하나 더 있다.** `lynx-trace` AAR의 `TraceController`에 `@com.lynx.trace.CalledByNative`가 붙은 메서드 셋(`generateTracingFileDir` · `refreshATraceTags` · `setIsTracingStarted`)도 규칙이 없어 매핑에서 사라진다.
      **이것이 지워진 빌드는 죽지 않았다** — 기동과 Maestro 네 흐름이 통과했고 arm64 `.so` 16개에서 그 세 이름의 문자열을 찾지 못했다(지금 바이너리가 부르지 않는 것으로 보인다 [추론 — 문자열 검색 수준]).
   4. 그 밖의 JNI · 리플렉션용 어노테이션은 규칙이 있다 [정적 — 축소 전 dex의 클래스 11,976개에서 이름이 `CalledByNative` · `DoNotStrip` · `DoNotOptimize` · `Keep*`인 어노테이션을 병합된 R8 설정과 대조. 규칙이 없는 JNI 어노테이션은 위 둘뿐].
6. **consumer 규칙을 싣지 않는 AAR** [정적 — `unzip -l`]. vendor `lynx-base` · `lynx-trace` · `service-api` 4.0.1, vendor Fresco 2.3.0의 `animated-gif` · `imagepipeline-native` · `nativeimagefilters` · `nativeimagetranscoder` · `webpsupport`(Fresco의 규칙은 `fbcore` AAR이 싣는다),
   그리고 `primjs` 4.0.0 · `lynx-service-http/image/log`. `lynx` 4.0.1 · `servalsvg` · `xelement*`는 싣는다.
7. **호스트 Java에는 프로젝트 규칙이 필요 없다** [정적 + 실측]. `com.libitum.host`의 Lynx 모듈 11개는 `lynx` AAR의 `-keep class * extends com.lynx.jsbridge.LynxModule { *; }`가 지키고, 매니페스트가 가리키는 클래스 넷은 AAPT가 만든 규칙이 지킨다.
   축소한 빌드의 `mapping.txt`에서 이름이 그대로인 호스트 클래스는 그 15개이고 나머지 46개는 이름이 바뀌거나 인라인됐다. 호스트 소스에 `Class.forName` · `getDeclared*` · `getMethod` · `newInstance` · `System.loadLibrary` · `native` 선언이 없다(grep 0건).
8. **`bundled`는 `initWith release`다** [정적]. release에 건 설정을 선언 없이 물려받는다.

## 결정

### 사용자 결정

2026-10-07, 작업 증거 `user-decision` 두 건(root의 기록)을 그대로 옮긴다. **U4 · U5는 2026-10-08의 한 건이다** — 리뷰가 사용자 결정으로 올린 항목의 답.

| # | 물음 | 결정 | 계약의 권고 | 재검토 조건 |
|---|---|---|---|---|
| **U1** | 릴리스 AAB가 실을 ABI | **「그대로 (4개)」 — ABI 필터를 걸지 않는다.** Play Console 기기 카탈로그에서 기기 수를 본 뒤 다시 정한다 | **(b) `arm64-v8a`만 — 사용자의 선택은 권고와 다르다** | **프로덕션 출시 전에 결정한다**(U5 — 「재검토 조건」의 첫 줄) |
| **U2** | 릴리스 빌드의 minify | **「R8 축소 + 난독화」**(리소스 축소 없음) | 같다 | 「재검토 조건」 |
| **U3** | 확장 단계 생략 | **design 단계 「생략 승인」**(화면 · 토큰 · 리소스 변경 0). accessibility는 생략하지 않는다 — 축소한 빌드의 TalkBack 실행 뒤 판정한다 | 같다(accessibility를 한 번 돌릴 것을 권했다) | — |
| **U4** | `bundled`가 release의 minify를 물려받는가(D3) | **「그대로 물려받기」**(2026-10-08) — 계약 r02가 고정한 것을 사용자가 확인했다 | 같다(계약의 고정) | 「재검토 조건」의 D3 줄 |
| **U5** | ABI 4개 유지(U1)의 재검토 시한 | **「프로덕션 출시 전에 결정」**(2026-10-08) | —(계약은 시한을 정하지 않았다) | 「재검토 조건」의 첫 줄 |

**U1의 경과와 근거의 수준.** 첫 질문에서 사용자는 U1을 고르지 않고 **「일부 기기가 얼마나 되는가」를 되물었다.** root가 근거를 찾아 다시 물었고 그 답이 「그대로 (4개)」다. 재질문에 root가 댄 근거는 아래다.

- 공개 자료로 32비트 ARM 기기는 Android 전체의 **약 10 ~ 20%**: 2024년 15 ~ 20%(기기 관리 업체의 용어집), 2025-10 한 앱 사용자의 9 ~ 10%(LiteRT 이슈 #3926).
- `minSdk` 26에서는 더 낮을 가능성 — **추정이고 수치가 없다.**

**이 수치는 계약이 확인한 값이 아니다.** root가 찾은 공개 자료의 값이고, 출처가 이 앱의 대상 시장 · `minSdk` 26 조건의 통계도 아니다. 계약의 문면은 그대로 「점유율은 모른다 — 이 작업에서 통계를 조회하지 않았다」다.
그래서 U1은 「정하지 않은 것」이 아니라 **「4개를 유지하기로 정했고, 프로덕션 출시 전에 기기 카탈로그의 수치를 보고 다시 정한다」** 다(시한은 U5)([보류 표](README.md#보류-표)에 행이 있다).

**U4 · U5의 경과**(2026-10-08 — 작업 증거 `user-decision`). 리뷰가 사용자 결정으로 올린 항목에 root가 물었고 그 답이다.

- **U4**: 질문에 댄 근거는 「검증 빌드(`bundled`)의 dex가 릴리스와 바이트 단위로 같다 — 재현으로 확인, `google-services.json`이 있을 때」이고, 대가는 「계측 픽스처가 붙지 않아 앞선 작업의 절차 둘이 debug 계측으로 대체된 것」이다(D3).
- **U5**: 비공개 테스트는 4개 그대로 두고, **프로덕션에 올리기 전에** Play Console 기기 카탈로그의 수치를 보고 유지 / 축소를 정한다 — 출시 조건 목록에 넣는다. 문면과 한계는 「재검토 조건」의 첫 줄이 진다.

### D1. release를 R8로 축소하고 난독화한다 — 리소스 축소는 켜지 않는다 (U2)

`apps/android/app/build.gradle`의 `release` 블록 두 줄이 전부다.

```groovy
    release {
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
```

- `shrinkResources`를 선언하지 않는다. `android.enableR8.fullMode`도 선언하지 않는다 — AGP 8.x의 기본은 full mode다 [SDK/문서].
- `defaultConfig` · `debug`에 `minifyEnabled`를 두지 않는다. debug와 계측 APK는 바뀌지 않는다(「검증」 — sha256 동일).
- 리소스 축소를 켜지 않는 까닭: 추가 효과가 44,327바이트(0.26%)뿐이고 [실측 — 「실측」의 조합 표시], 그것을 얻자고 「이름으로만 찾는 리소스」 위험을 들일 이유가 없다.
- 난독화를 끄지 않는 까닭: 사용자 결정이다. 난독화의 몫은 80,299바이트(0.5%)로 작고 줄어드는 것의 대부분은 축소다 [실측 — 같은 표시]. 난독화 없는 조합은 **빌드와 크기만 쟀고 기기에서 돌리지 않았다.**

### D2. 프로젝트 규칙은 9줄이다 — `-dontwarn` 7 · keep 2. 줄마다 근거의 수준이 다르다

`apps/android/app/proguard-rules.pro`(신규). **이 9줄 그대로이고 더도 덜도 아니다** — 정적 검사 I4가 줄 집합을 지킨다.

| # | 규칙 | 왜 | 빼면 | 근거 수준 |
|---|---|---|---|---|
| W1 ~ W7 | `-dontwarn com.google.gson.Gson` · `…JsonSyntaxException` · `com.lynx.markdown.IMarkdownEventListener` · `…IResourceLoader` · `…Markdown` · `…MarkdownValuePack` · `…ServalMarkdownView` | Lynx가 참조하지만 이 앱이 싣지 않는 선택적 클래스다(맥락 5-1) | **빌드 실패**(`Missing classes detected`) | [실측 — 계약 단계의 사본 빌드] |
| **K1** | `-keepclasseswithmembers class * { @com.lynx.base.CalledByNative <methods>; }` | `liblynxbase.so`가 JNI로 이름을 찾는다(`LynxLog.log` · `logByte`). `lynx-base` AAR에 consumer 규칙이 없다(맥락 5-2) | **기동 즉시 SIGABRT** | [실측 — 두 번]: 계약 단계의 관찰, 그리고 e2e의 K1 변이에서 재현(K1 줄을 뺀 release AAB — `NoSuchMethodError … LynxLog;.log` → `JNI DETECTED ERROR` → `Fatal signal 6 (SIGABRT)` → 프로세스 종료) |
| **K2** | `-keepclasseswithmembers class * { @com.lynx.trace.CalledByNative <methods>; }` | K1과 같은 종류의 누락이다(`TraceController`의 메서드 셋, `lynx-trace` AAR에 규칙 없음 — 맥락 5-3) | **관찰된 실패 없음.** 매핑에서 세 메서드가 사라질 뿐이고 그 빌드는 기동과 Maestro 네 흐름을 통과했다 | **충돌을 관찰하지 못한 방어 규칙이다.** 「이 규칙이 없으면 죽는다」는 근거가 없다 — 넣는 근거는 어노테이션의 뜻(「네이티브가 부른다」)과 지키는 비용이 메서드 셋이라는 것뿐이다. 이 규칙을 지키는 것은 기기 실행이 아니라 매핑 검사 A4와 정적 검사 I3이다 |

**넣지 않는 것**: `-keep class com.libitum.host.** { *; }` 같은 넓은 규칙 · `-dontobfuscate` · `-dontoptimize` · `-keepattributes` · `-printconfiguration`류. 호스트 Java에는 규칙이 필요 없다(맥락 7).
**규칙을 더해야 하면** 계약으로 돌아가 근거(무엇이 이름으로 찾는가 · 빼면 무슨 일이 나는가를 봤는가)를 이 표에 줄로 더한 뒤 I4의 기대값을 고친다 — 검사를 먼저 고쳐 통과시키지 않는다.

### D3. `bundled`는 `initWith release`로 축소를 물려받는다 — 블록을 고치지 않는다

`bundled { initWith release … }`는 `minifyEnabled true`와 `proguardFiles`를 선언 없이 물려받는다. **그대로 둔다.** 계약 r02가 고정했고, **2026-10-08에 사용자가 「그대로 물려받기」로 확인했다(U4).**

| | 물려받는다 — **고정** | 뺀다(`bundled { minifyEnabled false }`) |
|---|---|---|
| `bundled`의 정체 | 「release와 같은 설정 · 디버그 키 · 바로 깔리는 APK」가 유지된다 — 절차 문서들이 그렇게 전제한다 | `bundled`가 출시 바이너리와 다른 코드가 되고, `bundled`에서 잰 것(스플래시 반복 등)이 release를 대표하지 못한다 |
| R8을 거친 코드를 누가 보는가 | `bundled`를 까는 모든 흐름(Maestro `host` · `social` · `legal` · `small` · `talkback`, 실행 화면 · 방향 · 뒤로가기 · 스플래시 반복 절차)이 저절로 본다 | AAB를 bundletool로 까는 절차만 본다. 축소가 만든 결함이 출시 직전에야 드러난다 |
| 계측 픽스처 | **`bundled`에 붙지 않게 된다**(아래) | 지금처럼 붙는다 |

- **이유**: 이 작업이 지키려는 것은 「출시 바이너리가 돈다」이고, `bundled`가 release와 갈라지면 저장소의 일상 흐름이 축소 전 코드만 보게 된다.
- **`google-services.json`이 있는 빌드에서 `bundled`의 dex는 release의 dex와 바이트가 같다** [실측 — 리뷰 뒤 test-runner의 재현, HEAD `6eb51a61`]. 위 표의 「대표한다」 — 이 결정의 근거 「`bundled`가 release와 같은 코드를 본다」 — 는 **그 파일이 있을 때 성립한다.**
  파일 없이도 `bundled`는 빌드되고(`build.gradle`의 `exists()` 조건 — 의도된 동작이고 이 작업이 만든 것이 아니다) 그때의 dex는 release와 다르다. `bundled`를 release의 대리로 쓰는 검증은 파일이 있는 워크트리에서 빌드한다.
  **직전 판은 이 줄에 「같은 설정은 같은 바이트가 아니다」라고 적고 「대표한다」를 「코드 구조가 같다」로 낮췄다 — 그 일반화는 틀렸고 거둔다.** 수치와 경위는 「검증」의 「release와 `bundled`의 dex — 리뷰 뒤의 재현」이 진다.
- **대가 — 계측 픽스처가 축소한 빌드에 붙지 않는다** [실측]. 축소한 `bundled` APK와 축소한 release 설치에 `SignedInScreenFixtureTest`를 붙이면 러너가 죽는다(`NoClassDefFoundError: kotlin.jvm.internal.Intrinsics` · `androidx.tracing.Trace`, `Process crashed`).
  계측 APK가 앱 쪽 클래스에 기대는데 R8이 지우거나 이름을 바꿨다. **영향받는 절차는 둘이다.**
  1. [출시 설정 절차](../e2e/android-release-config.md)의 「로그인 뒤 화면」 · R5 — AAB 설치에 픽스처를 붙여 로그인 뒤 회귀를 보던 길.
  2. [상태바 아이콘 절차](../e2e/android-status-bar-icons.md)의 S7 (d) — `bundled` + 픽스처로 글꼴 배율 재생성 전후의 표지 아이콘을 보던 길. 같은 성질은 계측 HI6(debug)이 진다.
  `bundled`를 픽스처 없이 까는 절차들은 그대로 돈다 — 다만 **보는 대상이 축소된 코드로 바뀌고, 그 문서들의 지난 결과는 축소 전 바이너리의 것이다.**
- **사용자 결정으로 올리지 않은 이유**(계약): 출시 산출물에 영향이 없고(`bundled`는 Play에 올라가지 않는다), 검증 절차 안의 교환이며, 한 줄로 되돌릴 수 있다. 사용자가 `bundled`를 축소 전 그대로 두기를 원하면 `bundled { minifyEnabled false }` 한 줄과 I1 · A5 · E7의 기대만 바뀐다. **리뷰가 이것을 머지 전 사용자 확인 항목으로 올렸고, 사용자가 물려받는 쪽을 확인했다(U4).**
- `assembleBundled`에 R8 시간이 더해지고 `bundled`의 스택 트레이스도 난독화된다. 빌드 시간의 증가는 변형별로 재지 않았다 [미확인].

### D4. ABI는 4개를 그대로 싣는다 — 필터를 걸지 않는다 (U1)

`ndk` · `abiFilters` · `splits` · `bundle {}` · `packaging`을 `build.gradle` 어디에도 더하지 않는다. release AAB · `bundled` APK · debug APK가 싣는 ABI는 변경 전과 같은 4개(arm64-v8a 16 · armeabi-v7a 16 · x86 16 · x86_64 15)다.

- 정적 검사 I1이 「ABI를 건드리는 선언이 없다」를 `pnpm verify` 안에서 지키고, 산출물 검사 A1 · A2 · A5가 산출물의 ABI 집합을 본다. 정렬 검사 NA3의 기대(64비트 `.so` 31개)도 그대로다.
  **I1은 `bundle {}` · `packaging`을 보지 않는다** [리뷰의 지적] — 위 문장의 다섯 가운데 그 둘은 정적 검사가 지키지 않는다(「미확인 · 후속」 13).
- **이 결정이 그대로 두는 것을 숨기지 않는다**: 4개를 유지하면 빠지는 기기는 없다. 대신 **돌려 본 적 없는 라이브러리가 지금처럼 그 기기들에 내려간다**(「미확인 · 후속」 4). R8은 `.so`를 건드리지 않으므로 이 작업이 그 위험을 키우거나 줄이지 않는다.
- 나중에 바꾸기 쉬운 쪽은 **넓히는 쪽**이다 [SDK/문서] — ABI를 더하면 기기가 늘 뿐이지만, 배포한 뒤 ABI를 빼면 그 기기의 기존 사용자가 새 버전을 받지 못한다. 필터를 다시 정할 때 이 비대칭을 함께 본다.

### D5. 지키는 검사 — 순수 판정 · 정적 결선 · 산출물

| 파일 | 어디서 도는가 | 무엇 |
|---|---|---|
| `devtools/android-bundle/release-shrink.mjs` | — | 판정 순수 함수 다섯: `buildTypeSettings` · `packagedAbis` · `uncoveredNativeCallbackAnnotations` · `lynxModuleMethods` · `mappingIssues` |
| `devtools/android-bundle/mapping-survival.mjs` | — | 판정 순수 함수 `survivalIssues` — 「이름이 바뀌어도 살아 있다」를 본다. **test-design이 `28c307e4`에서 새로 만든 검사 보조 모듈이다**(`mappingIssues`는 이름 변경을 위반으로 보고해 「살아 있다」를 표현하지 못한다). 구현 소유 모듈 `release-shrink.mjs`는 그대로다 |
| `release-shrink.unit.test.mjs` | `pnpm test:android-bundle` → **`pnpm verify` 안** | 위 함수의 단위 테스트(U1 ~ U12 + 가장자리, `survivalIssues`의 U13 ~ U15) |
| `release-shrink.integration.test.mjs` | **`pnpm verify` 안**(저장소 파일과 `vendor-maven` AAR만 읽는다) | I1 ABI를 건드리는 선언 없음 · `minifyEnabled`는 release에만 · `bundled`는 `initWith release` / I2 release의 minify 설정 · 리소스 축소 없음 / I3 vendor Lynx AAR의 `CalledByNative` 어노테이션이 전부 규칙으로 덮임 / I4 `proguard-rules.pro` = 9줄 |
| `release-shrink.artifacts.mjs` | **`pnpm verify` 밖**(AAB · APK가 필요하다) | A1 release AAB의 ABI 4개 / A2 debug APK 4 ABI · 축소 안 됨 / A3 dex 1개 · 4,000,000 미만 · `proguard.map` 있음 / A4 네이티브 · 매니페스트가 이름으로 찾는 것이 매핑에 남음 / A5 `bundled` dex 1개 · 4 ABI / A6 내장 번들이 소스와 같음 / A7 네 기기 스펙의 다운로드가 각각 18,000,000 미만 / **A8 접근성 클래스가 축소에서 살아남음**(`28c307e4` — 단언 목록과 한계는 「검증」의 「최종 검증」) |

실행법은 [Android 호스트 README](../../apps/android/README.md#코드-축소r8와-난독화)가 진다. A7은 `BUNDLETOOL_JAR`가 없으면 건너뛰고 **건너뜀은 통과로 세지 않는다.**

## 실측

### 변경 전 대 지금 — r02 조합(4개 ABI + R8 + 규칙 9줄)

| 항목 | 변경 전(축소 없음) | 지금 | 차이 |
|---|---|---|---|
| AAB 파일 | 35,063,383 | **32,896,118** | −2,167,265 (−6.2%) |
| 기기 다운로드 — arm64-v8a | 21,145,550 | **16,876,381** | −4,269,169 (**−20.2%**) |
| 기기 다운로드 — armeabi-v7a 전용 | 19,868,554 | **15,648,872** | −4,219,682 (−21.2%) |
| 기기 다운로드 — x86_64 | 20,936,426 | **16,667,257** | −4,269,169 (−20.4%) |
| 기기 다운로드 — x86 전용 | 21,021,203 | **16,801,521** | −4,219,682 (−20.1%) |
| dex | 3개 · 비압축 15,339,268 | **1개** · 비압축 2,934,436(압축 1,400,584) | — |
| dex의 클래스 수 | 11,976 | 2,992 | r01 실측(아래 표시) · 최종 검증이 release · `bundled` 둘 다 2,992로 다시 셌다 |
| AAB의 `base/lib/` | 16 · 16 · 16 · 15 | **같다** | 0 |
| 64비트 `.so` | 31 | **31** | 0 |
| `bundled` APK | dex 3개 | dex **1개** · 4 ABI · 58,228,446 | — |
| debug APK · androidTest APK의 sha256 | `53582226…` · `26bf3efb…` | **같다** | 0 |

- 「지금」 열은 **세 번 쟀고 값이 같다** [실측]: 계약 r02의 사본 빌드(HEAD `3b2cbb65`), 구현 커밋(`ac0cdf6d`)의 green 확인, 그리고 최종 검증(HEAD `28c307e4`)의 clean 빌드 — AAB 파일 · 네 기기 다운로드 · dex 수 · ABI · 64비트 `.so` · debug와 androidTest의 sha256이 같다. `mapping.txt`의 sha256도 셋이 같다(`657d490a…`).
  `bundled` APK의 크기(58,228,446)는 최종 검증의 기록에 없다 — 다시 잰 값이 아니다. **AAB 파일 자체의 sha256은 빌드마다 다르다**(e2e `7df2fa84…` · 최종 검증 `0bef15cc…` — 재빌드. 크기와 매핑은 같다).
- **AAB 파일이 dex 감소만큼 줄지 않는 이유**: 축소한 AAB에는 매핑이 들어간다(`BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map` — 22,860,544바이트, 압축 2,112,142) [실측 — r01].
- 기기 스펙은 arm64만 이 맥의 Pixel_8 API 37 에뮬레이터 스펙이고 나머지 셋은 손으로 만든 스펙이다(armeabi-v7a · x86은 API 26).
  **red 단계의 산출물 검사(A7)는 변경 전 빌드에서 armeabi-v7a 19,925,185 · x86 21,077,834를 냈다 — 위 표의 계약 값과 각각 56,631바이트 다르다**(arm64 · x86_64는 같다). 검사가 기기 사양을 직접 만들기 때문으로 보이나 **원인을 확인하지 않았다** [미확인 — 리뷰가 든 원인 후보는 「미확인 · 후속」 12]. 「지금」 열의 네 값은 계약 · 구현 확인이 일치한다.
- 클래스 수는 계약 r01이 arm64 필터 조합에서 센 값이다. 그 조합과 r02 조합은 **dex의 sha256이 같다**(`b751b2f5…`)고 확인했다 [실측]. 최종 검증의 release AAB `base/dex/classes.dex`도 같은 값이다(`b751b2f5…`). **`google-services.json`이 있는 빌드의 `bundled` APK dex도 같은 값이다**(`b751b2f5…` — 리뷰 뒤의 재현). 최종 검증이 `bundled`의 값으로 적은 `24ac3ed6…`은 그 파일 없이 빌드한 `bundled`의 dex와 같다(「검증」의 「release와 `bundled`의 dex — 리뷰 뒤의 재현」).

### 켜지 않은 것의 차이 값 — r01 실측, **조합이 다르다**

| 견준 것 | 차이 | 잰 조합 |
|---|---|---|
| R8 + **리소스 축소**(`res/` 530 → 432 항목) 대 R8만 | arm64 다운로드 **−44,327**(0.26%) — 16,831,978 대 16,876,305 | 4개 ABI + R8 + **K2 없음**(r01의 `m1-k1` · `m2`) |
| R8 축소, **난독화 없음**(`-dontobfuscate`) 대 축소 + 난독화 | arm64 다운로드 **+80,299**(0.5%) — 16,956,680 대 16,876,381 | **arm64 필터** + R8 + 9줄(r01의 권고안) |

r02 조합으로 다시 재지 않았다. 계약은 「기기 다운로드는 ABI 필터와 무관하므로 차이 값은 그대로 읽는다」고 적었다 — 그 읽기는 [추론]이다.
리소스 축소 빌드는 기동해 온보딩까지 갔고 그 이상은 돌리지 않았다. 지워진 `res/` 98개는 appcompat(`abc_*`) · browser · GMS 로그인 버튼 등 라이브러리 리소스였다.

### ABI 선택지 — 결정되지 않은 선택지의 수치도 기록으로 남긴다

**축소 전 빌드에서 잰 값이다** [실측 — r01]. 고른 것은 (a)다.

| 선택지 | `release`의 `abiFilters` | AAB 파일 | arm64 기기 | armeabi-v7a 전용 기기 | x86_64 기기 |
|---|---|---|---|---|---|
| **(a) 그대로 — 결정(U1)** | 없음(4개) | 35,063,383 | 21,145,550 | 19,868,554 | 20,936,426 |
| (b) arm64만 — 계약의 권고 | `arm64-v8a` | 21,495,358 | 21,145,550 | 설치 불가 | 설치 불가 |
| (c) + 32비트 ARM | `arm64-v8a`, `armeabi-v7a` | 25,297,536 | 21,145,550 | 19,868,554 | 설치 불가 |
| (d) + x86_64 | `arm64-v8a`, `armeabi-v7a`, `x86_64` | 30,108,849 | 21,145,550 | 19,868,554 | 20,936,426 |

- 넷 모두에서 arm64 기기의 값이 같다 — 필터는 기기 다운로드를 바꾸지 않는다.
- 「설치 불가」는 bundletool의 판정이다(`The app doesn't support ABI architectures of the device.`). Play가 그런 기기에 앱을 보여 주지 않는다는 것은 [SDK/문서]이고 Play로 확인하지 않았다.
- R8과 함께 켠 (b)의 AAB는 19,328,093이었다(r01의 권고안 빌드).
- **필터를 다시 정할 때 함께 바뀌는 것**(계약 r02.7): `bundled`가 `initWith` 때문에 필터를 물려받으므로 `ndk { abiFilters.clear() }`가 필요하다(없으면 `app-bundled.apk`가 arm64만 싣는다 — 실측 16개) · 정렬 검사 NA3의 release 기대가 31 → 16으로 바뀐다 · I1 · A1의 기대가 바뀐다 · `vendor-maven`의 x86_64 재빌드는 debug · `bundled`가 쓰므로 남는다.

## 검증

### 자동 — unit · 정적 · 산출물

| 무엇 | 결과 | 근거 |
|---|---|---|
| `pnpm test:android-bundle` | **120 / 120**(새 25건 = U 20 + I 5, 기존 95건). **`28c307e4`에서는 123 / 123**(`survivalIssues`의 단위 테스트 3건이 더해졌다) | [실측 — test-runner, `ac0cdf6d` · 최종 검증 `28c307e4`] |
| 구현 전 red | 120건 가운데 17건 단언 실패(U 13 · I 4 — import · 컴파일 오류 0), 산출물은 7건 가운데 6건 실패(A6은 가드) | [실측 — test-runner, `fd6052d9`]. A1 · A2는 계획상 가드였으나 스텁 때문에 실패했다 — 가드로서의 구분력은 아래 변이가 진다 |
| 산출물 검사 A1 ~ A7 | **7 / 7**. **`28c307e4`에서는 A8이 더해져 8 / 8**(A7 건너뜀 없음) | [실측 — test-runner, `ac0cdf6d`의 clean 빌드 · 최종 검증 `28c307e4`의 clean 빌드] |
| 기존 산출물 검사(고치지 않은 채) | 12 / 12 — `native-alignment` 6(NA3 31개) · `packaged-assets` 4 · `host-launch-appearance` 1 · `host-orientation` 1 | 같음 |
| JVM 단위 · 계측 일괄(debug) | 66 / 66 · API 37 `OK (47 tests)` = 통과 44 + 건너뜀 3(건너뜀은 통과로 세지 않는다) | 같음 |
| **변이 26종**(설정 11 · 구현 9 · 산출물 6) | 변이마다 해당 케이스가 실패했다. 산출물 변이는 실제 재빌드다 | [실측 — test-design]. 원본 로그: 하네스 작업 폴더의 `logs/mutation-*.log` |
| debug · androidTest APK | 변경 전후 sha256 동일(`53582226137fd6ae…` · `26bf3efbe1db2054…`) | [실측 — 계약 r01 · r02의 사본, 구현 확인, e2e E6 — 네 번 모두 같다] |

변이의 한계: (1) **26종은 임시 구현에 대해 돌았다. 최종 구현(HEAD `28c307e4`)에서 다시 돈 것은 대표 4종이고 넷 모두 기대한 케이스에서 실패했다**(아래 「최종 검증」의 변이 표) — **나머지 22종은 최종 구현으로 다시 돌지 않았다.**
임시본 뒤에 바뀐 것은 `release-shrink.mjs`뿐이고 테스트 파일은 그대로다. `packagedAbis`의 최종 구현이 임시본과 같은지를 직접 견준 기록은 없다 — 최종 구현이 「ABI 1개」를 A1에서 가른다는 것(`abiFilters` 변이)까지가 확인이다.
(2) 규칙 없이 `debug { minifyEnabled true }`만 넣은 변이는 Gradle 빌드가 실패해 7건이 전부 실패한다 — 구분력의 증거로 쓰지 않는다(`proguardFiles`까지 넣은 변이가 A2만 실패시킨다). 로그 파일은 그것까지 남아 있다.
(3) K2를 뺀 변이는 I3 · A4에서 실패하지만 **기기에서의 실패는 나지 않는다**(D2).

### e2e — 무엇을 출시 바이너리로 봤고 무엇을 탐침 빌드로 봤는가

출처는 하네스 작업 폴더의 `e2e-run.md`다 [실측 — test-runner, 2026-10-07 23:34 ~ 2026-10-08 00:25, HEAD `47982c70`(제품 · 설정은 `ac0cdf6d`와 같다), 에뮬레이터 한 대씩]. 절차는 [출시 설정 절차](../e2e/android-release-config.md)의 「S」 절이다.
빌드: release AAB sha256 `7df2fa84…` · `bundled` APK `c0a90384…` · `mapping.txt` `657d490a…`(계약 값과 같다). 축소 전 비교 대상은 `fd6052d9`의 일회용 사본 release AAB(dex 3개)다.

- **출시 바이너리** = 구현 커밋의 release AAB를 bundletool로 분할 설치한 것(`base` + `config.arm64_v8a` + `config.en` + `config.xxhdpi`, 디버그 키 재서명 — 업로드 키 서명본이 아니다).
- **축소한 `bundled`** = `assembleBundled`의 APK(dex 1개). release와 같은 규칙으로 축소됐고 **`google-services.json`이 있는 빌드에서는 dex가 release와 바이트까지 같다**(e2e 때는 견준 기록이 없었다 — 리뷰 뒤 test-runner가 이 e2e의 보존 APK `c0a90384…`를 열어 dex `b751b2f5…`를 확인했다. 아래 「release와 `bundled`의 dex — 리뷰 뒤의 재현」).
  `bundled`로 본 것은 **「release와 같은 dex가 그 경로에서 돈다」의 증거다.** 설치한 것은 AAB의 분할이 아니라 `bundled` APK이므로 **「출시할 바로 그 바이너리가 돈다」와는 구별해 적는다.** 스플래시 반복에 쓴 `bundled`는 APK가 남지 않아 「파일이 있는 빌드였다」가 Gradle 로그 수준이다.
- **탐침 빌드** = 일회용 사본에 `ProbeSignedIn`(픽스처의 세션 · 진도 심기와 HTTP 대역을 옮긴 클래스 하나)을 넣어 같은 규칙으로 다시 빌드한 AAB. **dex가 출시 바이너리와 같지 않다**(훅이 Lynx HTTP 클래스 몇을 더 쓴다 — 계약 단계 실측 dex 2,934,436 → 2,935,876, 진도를 바꿔 다시 빌드할 때마다 다르다).
  탐침으로 본 것은 **「같은 규칙으로 축소한 앱이 그 경로에서 돈다」의 증거이고 「출시할 바로 그 바이너리가 돈다」의 증거가 아니다.** 훅은 제품 트리에 없다.

| 케이스 | 본 대상 | 기기 | 결과 |
|---|---|---|---|
| E1 콜드 스타트 → 온보딩 | **출시 바이너리** | API 37 | 통과 — 4분할 설치 · `LaunchState COLD` · 프로세스 생존 · `Step 1 of 3` · 16 KB 대화상자 문구 0 · 오류 판정 0줄 |
| E2 Maestro `host` · `social` · `legal` · `small` | **출시 바이너리** | API 37 | 통과 — 넷 모두 exit 0 · 오류 판정 0줄. 호출 수: `WebAuthenticationModule.randomBytes` 3 · `.start` 3 · `LegalDocumentModule.open` 1 · `SoundEffectsModule.play.button` 18 · `StorageModule.get` 18 |
| E3 뒤로가기 · E4 구성 변경(야간) | **출시 바이너리** | API 37 | 통과 — `SystemBackModule.respond` 2 · 루트에서 런처로(프로세스 생존) / pid · `ActivityRecord` 동일, MainActivity의 create · destroy 이벤트 0건(양성 대조: 글꼴 배율 1.3에서 2건) |
| E5 (a) 맵 (b) `audio-playback` (c) `signed-in-settings` (d) 알림 → 등록 요청 (e) 상태바 전환 | **탐침 빌드** | API 37 | 통과 — `AudioPlaybackModule.play` 3 · `stop` 1, `PushNotificationModule.register` 1, `apr=`가 있음 → 없음 → 있음. **(d)의 `register_push_device` 요청은 탐침의 HTTP 대역이 받았다 — 기기 밖으로 나가지 않았다**(경로만 로그) |
| E6 debug · 계측 APK 불변 | — | — | 통과(위 표) |
| E7 TalkBack 흐름 | **축소한 `bundled`** | API 37 | 통과(**2회째**) — **증명 범위는 기동 · 화면 전이 · 골든까지다**(아래) |
| E8 E1 · E3 · E4 | **출시 바이너리** | API 30(4 KB) | E1 **통과(주석 — 아래 서명 차이)** · E3 · E4 통과 |
| E8 E5 (a) 맵 | **탐침 빌드** | API 30 | 통과 |
| E9a 손글씨 · E9b 완료 안내 · E9c 앱 리뷰 · E9d 비주얼 노벨 · E9f 연속 학습 모달 · E9g 설정 글자 배율 1.3 · E9h 로그아웃 | **탐침 빌드** | API 37 | 통과 — `HandwritingTraceModule.guide` · `.compare` 각 1, `CompletionAnnouncementModule.announce` 1, `AppReviewModule.requestReview` 1(Play 리뷰 창은 판정하지 않았다), `StorageModule.remove` 2 |
| E9e 최종 테스트 | **탐침 빌드** | API 37 | **통과(주석)** — 시험 단계 2문항까지 진행 · 프로세스 생존 · 0줄. **`<svg>`가 그 화면에 있는지는 캡처로 식별하지 못했다** — 도달만 확인 |
| E9j 음성 인식 | **탐침 빌드** | API 37 | **통과(손으로)** — Maestro 흐름은 고정 좌표가 빗나가 실패했고 손으로 진입했다. 권한 대화상자가 떴고 **「Don't allow」를 골랐다**(마이크를 열지 않으려고) · `SpeechRecognitionModule.requestPermissions` 1 · `getStatus` 0. 허용 뒤의 인식 경로는 타지 않았다 |
| E9i 알림 탭 → 목적지 | — | — | **닿지 못함**(사전 판정 — 시도하지 않았다. 탐침에 알림 게시 방송이 없다). 통과로 세지 않는다 → R9 |
| K1 변이 | K1 줄을 뺀 release AAB(일회용 사본) | API 37 | **E1이 실패로 나왔다 — 기대대로**(D2의 K1 행) |
| 스플래시 워드마크 반복(최소 확인) | **축소한 `bundled`** | API 37 | PASS **10 / 10** · 판정 불가 0 · `onFailed` 0 · `finalloopcomplete` 10 — **표본 10회**다. 스플래시 길이 중앙 2660 ms는 기록만이다(호스트 부하 3.7 → 12.7, 다른 작업이 함께 돌았다) |

**오류 판정이 무엇에 기대는가.** 「0줄」은 절차 문서의 판정 패턴에 **실행자가 두 가지를 고쳐 적용한 결과**다 — 시스템 HAL 프로세스의 줄을 pid 단위로 제외했고, 축소 전 빌드에도 있는 `AppleSignInModulefailed`를 제외했다.
문서의 함수 그대로는 건강한 빌드에서도 오탐한다(E1에서 9줄). 고친 판정이 앱의 줄을 놓치지 않는다는 것은 K1 변이가 양성 대조다(변이 빌드에서 앱의 SIGABRT · `NoSuchMethodError` 줄이 그대로 걸렸다).
**절차 문서 · 도구의 결함 11건은 `1b99f08f`에서 정정됐다**(「미확인 · 후속」 8 — 번호별 내용은 [출시 설정 절차](../e2e/android-release-config.md)의 S.17이 진다). 제품 결함은 0건이다.
정정 뒤 커밋된 판정 함수(`shrink_judge` — 시스템 프로세스의 줄을 내용이 아니라 줄을 남긴 프로세스로 거른다)를 **저장해 둔 logcat에 다시 돌린 결과**는 건강한 release E1 0줄 · E2 `social` 0줄 · API 30 E1 0줄 · 나머지 25개 0줄 · **K1 변이 10줄**이다 [실측 — test-design, **기기 미사용**].
(실행자가 고쳐 쓴 함수는 같은 K1 변이 로그에서 9줄을 냈다 — 커밋된 함수는 거기에 앱의 크래시 덤프를 가리키는 `Cmdline: libitum.duru.android` 한 줄을 더 센다. 둘 다 건강한 빌드는 0줄, 변이 빌드는 0줄이 아닌 것으로 가른다.) 위 표의 「0줄」은 실행자의 함수로 얻은 값이고, 커밋된 함수가 그때 보탠 것은 같은 로그에 대한 재판정이다. **커밋된 함수와 고친 스크립트의 기기 실행은 최종 검증이 했다**(E1 · TalkBack 러너 — 아래 「최종 검증」). 표의 나머지 케이스는 커밋된 함수로 기기에서 다시 돌지 않았다.

**축소 전후의 로그 서명**(콜드 스타트 직후 앱 pid의 W/E/F 줄, 숫자 · 주소를 정규화한 고유 줄).

- **API 37: 21줄 대 21줄, 차이 0.** 둘 다 `ClassNotFoundException: com.lynx.primjs.wasm.RegisterWebAssembly`(Lynx의 선택 모듈 탐색 로그) 1줄이 있다 — 축소가 만든 줄이 아니다.
- **API 30: 18줄 대 18줄, 차이 1줄.** 같은 경고의 클래스 이름이 난독화돼 문자열만 다르다(`GoogleApiManager: The service for com.google.android.gms.internal.cloudmessaging.zzd is not available …` → `… for yN.b is not available: a{…}` — API 30 이미지의 오래된 Play 서비스).
  **판정은 「통과(주석)」이고, 그 근거는 `1b99f08f`가 절차 문서에 적은 서명 비교의 판정 규칙이다**(같은 절차의 S.5): `GoogleApiManager: The service for <클래스 이름> is not available: <클래스 이름>{…}` **한 종류의 줄만** 이름을 정규화하고, 정규화 뒤 차이가 0이고 줄 수가 같으면 통과(주석), **그 밖의 차이는 모두 보류다.**
  이 1줄은 그 규칙에 해당한다(정규화 뒤 차이 0 · 18줄 대 18줄 · 오류 패턴에 걸리지 않음). 실행 때의 문서에는 이 규칙이 없어 문자 그대로는 「판정 보류」였고, 실행자가 「이름만 바뀐 같은 줄」로 읽어 주석으로 센 판단을 규칙으로 옮긴 것이다 — **실행 뒤에 만든 규칙이므로, 규칙을 받아들이지 않으면 E8 E1은 「판정 보류」다.**
  규칙은 통과를 만드는 것이 아니라 읽기를 돕는 것이다 — 흡수한 줄은 위처럼 원본 그대로 적는다.
- 축소 뒤 새로 생긴 오류 줄은 없다. 한 번씩의 비교다.

**E7 TalkBack의 결과와 증명 범위**(accessibility 단계가 이 결과를 입력으로 받아 증명 범위를 정정했다 — 판정은 바로 아래 「accessibility 단계의 결과」).

- 1회째는 exit 1이었다(`TalkBack touch exploration is not enabled`) — 실행기 `run-talkback.sh`의 타이밍 경합으로 판정됐고(5초 뒤에는 켜져 있었다) 재시도한 2회째가 exit 0이다. 오류 판정은 두 번 모두 0줄.
  이 경합은 `1b99f08f`가 고쳤다(터치 탐색 값을 1초 간격 · 최대 15회 폴링) — 고친 스크립트는 최종 검증에서 **1회째에 통과했다**(1회 표본 — 아래 「최종 검증」).
- 2회째: TalkBack을 켠 채 온보딩 3단계를 `Next` · `Get started` 탭으로 지나 로그인 화면의 문구와 골든(95%)에 닿았다.
- **E7이 증명하는 것은 여기까지다**: TalkBack이 바인딩된 상태에서 축소한 앱이 뜨고 죽지 않으며(오류 판정 0줄 · 프로세스 생존), 온보딩 → 로그인 화면의 화면 전이와 골든이 맞다.
- **E7은 접근성 활성화(`ACTION_CLICK`)를 증명하지 않는다.** 이 문서의 앞선 판은 「TalkBack이 켜지면 Lynx 요소의 탭이 접근성 `ACTION_CLICK` 경로로만 전달되므로 `Next`가 먹혔다는 것은 `TapDelegate`가 기능했다는 추정 근거」라고 적었다 — **그 전제는 확인되지 않았고 그 문장을 거둔다**(accessibility 지적 R3).
  Maestro의 탭은 주입 입력이다. `adb shell input`은 이 에뮬레이터에서 TalkBack(접근성 입력 필터)을 우회해 버튼을 직접 누른다 [실측 — accessibility 단계가 든 앞선 점검의 관찰]. Maestro의 탭도 같은 우회일 가능성이 높으나 **어느 쪽인지 가르지 못했다** — 우회라면 E7의 `Next`는 원시 터치로 눌린 것이고 접근성 경로는 지나지 않았다.
- 보지 않은 것: TalkBack의 **음성 출력**(에뮬레이터 `-no-audio`, 어떤 단언도 읽힌 문장을 보지 않는다) · 포커스 이동 순서 · 읽는 이름 · 스와이프 뒤 더블탭 같은 제스처 · 온보딩과 로그인 화면 밖(로그인 뒤 화면).
- 완료 안내(E9b)는 TalkBack을 켜지 않은 탐침 빌드에서 `announce` 호출 줄까지 봤다(`LynxAccessibilityModule.accessibilityAnnounce` fallback 0). **출시 dex에서 실제로 발화됐는지는 보지 않았다** — 출시 매핑에서 본 것은 이름이 남아 있다는 것까지다(아래).

**accessibility 단계의 결과** [accessibility — HEAD `47982c70`(제품 · 설정은 `ac0cdf6d`와 같다), 출처는 하네스 작업 폴더의 `accessibility.md` · `artifacts/accessibility/`].
**판정: 차단 지적 0.** 권고 3건(R1 ~ R3 — 이 작업이 만든 것) · 기존 관찰 2건(X1 · X2 — 범위 밖, 두 빌드에서 같다). 본 범위는 「R8 축소 · 난독화가 접근성에 주는 영향」뿐이다 — 호스트 Java · 공유 JS · 리소스의 소스 변경이 0이므로 화면의 라벨 · 대비 · 모션 · 포커스 순서 자체는 대상이 아니었다.

- **코드 — 난독화된 이름이 TalkBack으로 새는가** [정적].
  - `AccessibilityTapBridge`(`TapDelegate`)는 리플렉션 · 이름 문자열을 쓰지 않고 `setClassName` · `getClassName`을 부르지 않는다 — 클래스 이름이 `r2.a`로 바뀌어도 그 이름이 접근성 서비스로 나가지 않는다.
  - **클래스 이름이 문자열로 TalkBack에 나가는 곳은 Lynx 가상 노드의 `className`이다**(`LynxAccessibilityNodeProvider` · `LynxNodeProvider`가 `mUI.getClass().getName()`을 `setClassName`에 넘긴다). `lynx` AAR의 consumer 규칙 `-keep class * extends com.lynx.tasm.behavior.ui.LynxBaseUI`가 그 이름을 지킨다 — 매핑에서 `UIView` · `UIText` · `FlattenUIText` · `UIImage` · `UIScrollView` 등 11개의 이름이 그대로다.
  - 역할 매핑이 쓰는 이름은 프레임워크 클래스(`android.widget.Button` 등)라 R8이 바꾸지 않는다. Lynx 접근성 클래스에 `Class.forName` · `getDeclaredMethod`류 리플렉션은 없다(AAR의 `javap` 출력 grep 0건). 프로젝트 규칙 9줄(D2)은 접근성 클래스를 건드리지 않는다.
- **매핑 — 지워졌는가** [정적 — 다시 빌드한 `mapping/bundled/mapping.txt`, sha256 `657d490a…`(계약 · e2e의 값과 같다)]. **지워진 접근성 클래스 · 메서드는 찾지 못했다.**
  - `AccessibilityTapBridge$TapDelegate` → `r2.a`로 살아 있고, 오버라이드 둘(`onInitializeAccessibilityNodeInfo` → `c` · `performAccessibilityAction` → `d`)이 부모 `AccessibilityDelegateCompat`의 같은 메서드와 같은 이름으로 바뀌어 오버라이드 관계가 유지된다. 바깥 클래스의 `sync`는 호출부에 인라인됐다(본문은 남아 있다).
  - `CompletionAnnouncementModule.announce` · `LynxAccessibilityModule.accessibilityAnnounce`(fallback)는 이름이 유지된다. `LynxAccessibilityNodeProvider`는 이름이 바뀌었으나(`com.lynx.tasm.behavior.ui.g`) `createAccessibilityNodeInfo` · `performAction`이 남아 있다.
  - 이 점검의 `bundled` APK는 다시 빌드한 것이라 sha256이 e2e의 것과 다르다(`c32c3dde…` 대 `c0a90384…`). 매핑이 같으므로 두 `bundled` 빌드의 dex 내용이 같은 것으로 봤다 [추론 — dex를 해시로 견주지 않았다]. **매핑이 같다는 것만으로는 dex가 같다고 할 수 없다** — 파일 없이 빌드한 `bundled`는 매핑의 sha256이 release와 같은데 dex의 sha256이 다르다(「최종 검증」). 이 추론이 기대는 것은 「같은 변형을 같은 소스로 다시 빌드했다」는 쪽이고, 이 점검의 빌드에 `google-services.json`이 있었다는 것은 빌드 로그 수준이다(같은 곳의 「리뷰 뒤의 재현」).
  **이 절의 기기 관찰은 모두 축소한 `bundled`의 것이다** — 출시 바이너리(release AAB)에서 TalkBack을 켜고 본 것은 없다.
- **기기 — TalkBack의 실제 입력으로 본 것** [실측 — Pixel_8 AVD · API 37 · 1080x2400, TalkBack 바인딩 · `touch_exploration_enabled=1`]. 같은 번들로 축소한 `bundled`와 debug를 차례로 깔아 같은 절차를 돌렸다. 입력은 `adb shell input`이 아니라 **하드웨어 수준 터치 이벤트**(`emu event send`)다 — TalkBack이 실제로 받는 입력이다.
  - 온보딩 1단계에서 `Next` 위 터치 탐색 → 포커스 링 → 빈 곳 더블탭(TalkBack의 활성화) → **2단계로 넘어갔다**(「Practice Korean」 · Back 버튼). 축소한 `bundled`와 debug가 같다.
  - **포커스 링 6지점**(여섯 캡처 — 1단계 `Next`, 더블탭, 2단계 `Back` · 제목 · 설명 · 카드의 「Correct」)의 포커스 사각형과 링 픽셀 수가 **두 빌드에서 완전히 같다** — 그 여섯 지점에서 가상 노드의 존재 · 경계 · 포커스 가능 여부가 축소 전후 같다는 것까지다.
  - TalkBack이 음성 합성을 요청한 것은 로그로 봤고(`requestAudioFocus … USAGE_ASSISTANCE_ACCESSIBILITY`) **읽힌 문장은 보지 못했다.**
- **이 점검이 메운 것과 가르지 못한 것.** E7이 증명하지 못한 접근성 활성화를 메운 것은 **위 더블탭 한 건**(온보딩 1단계 `Next` — 2 · 3단계와 로그인 화면에서는 하지 않았다)이다.
  그 활성화가 `TapDelegate`를 지났는지 Lynx의 `LynxAccessibilityNodeProvider.performAction`을 지났는지는 **가르지 못했다**(호출 계측 없음 — 둘 다 매핑에 살아 있다).
- **하려 했으나 되지 않은 것.**
  - 접근성 트리의 속성 단위 비교(노드 수 · `class` · `content-desc` · `clickable`): `uiautomator dump`와 `maestro hierarchy`가 접근성 서비스를 억제하는 방식으로 붙어 캡처 순간 TalkBack이 풀리고 Lynx 가상 노드가 사라진다(축소한 빌드에서 노드 6개, 전부 `content-desc=""`). 위 포커스 사각형 비교로 대신했다.
  - 계측 `ButtonAccessibilityTest`를 축소한 앱에 붙이기: `NoClassDefFoundError: kotlin.jvm.internal.Intrinsics`(D3의 대가와 같은 원인 — 계측 프로세스의 도구 한계이고 제품 결함이 아니다). 그래서 **출시 dex에 대한 `ACTION_CLICK` 자동 검사는 없다** — R8 규칙이 바뀌어 `TapDelegate`나 Lynx 노드 제공자가 깨져도 지금의 자동 검사는 통과한다(R1 · R2가 이 구멍을 가리킨다).
- **권고의 처리.** R1(E7에 터치 탐색 → 더블탭 단계를 넣는다 — `adb shell input tap`으로 대신하지 않는다) · R2(매핑 검사에 접근성 클래스의 생존 단언을 더한다 — **keep 규칙은 더하지 않는다**, 지금 필요 없다)는 **`28c307e4`에서 반영됐다**(test-design). R2는 산출물 검사 A8이고 최종 검증에서 통과했다. **R1의 새 단계는 최종 검증에서 문서 그대로는 판정할 수 없었고, `126325d4`에서 고쳐져 이제 문서의 블록 그대로 돈다**(test-design의 절차 확인 — 판정 실행이 아니다) — 둘의 내용 · 한계 · 기기 결과는 아래 「최종 검증」이 진다.
  R3(E7의 증명 범위)은 이 문서에서는 위 정정이 반영이고, 절차 문서 S.10의 E7 설명도 `28c307e4`에서 고쳐졌다(test-design의 기록 — 이 문서는 그 문면을 다시 대조하지 않았다. 두 문서가 다르면 이 문서의 범위가 맞다).
- 기존 관찰 X1 · X2와 확인하지 못한 것은 「미확인 · 후속」 9에 있다.

### 최종 검증 — HEAD `28c307e4`

출처는 하네스 작업 폴더의 `verify.md`다 [실측 — test-runner, 2026-10-08, HEAD `28c307e4`(시작 · 끝 동일, 작업 트리 변경 0)]. **판정: 통과(주석 있음) — 제품 결함 0.**
`ac0cdf6d` 뒤에 바뀐 13개 파일은 전부 문서 · 테스트 · 도구이고 `apps/android/app` · `apps/mobile` · `packages`의 변경은 0이다. **건너뜀 · 미실행은 통과로 세지 않았다.**
주석은 절차 문서의 결함 3건(아래 「고친 절차 · 도구의 기기 결과」의 S.10)과 다시 돌리지 않은 것들(「미확인 · 후속」 10)이다.

| 무엇 | 결과 |
|---|---|
| `pnpm verify` | **통과**(exit 0) — `test:android-bundle` **123 / 123**(실패 0 · 건너뜀 0), `main.lynx.bundle` 1389.3 kB / 예산 1412.0 kB, 성능 게이트는 새 보고서를 요구하지 않았다 |
| Gradle `clean testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:assembleBundled :app:bundleRelease` | 성공 — JVM 66 / 66(건너뜀 0). **R8 경고 3종**(「대가」 3의 그것 — release · `bundled`에서 한 번씩, 두 번 출력) |
| 산출물 검사 | `release-shrink.artifacts.mjs` **8 / 8**(A1 ~ A8, A7 건너뜀 없음) · 기존 12 / 12(`host-launch-appearance` 1 · `host-orientation` 1 · `native-alignment` 6 · `packaged-assets` 4) |
| release AAB | 32,896,118바이트 · ABI 4개(arm64-v8a 16 · armeabi-v7a 16 · x86 16 · x86_64 15) · `base/dex` 1개 · `proguard.map` 1개 · **64비트 `.so` 31개 전부 `p_align` ≥ 16384**(ELF를 직접 읽었다) · `versionCode` 2 · `minSdk` 26 · `targetSdk` 36 · `mapping.txt` sha256 `657d490a…`(계약 값과 같다) |
| 기기별 다운로드(bundletool 1.17.2) | arm64-v8a 16,876,381 · armeabi-v7a 15,648,872 · x86_64 16,667,257 · x86 16,801,521 — 넷 다 18,000,000 미만, 「실측」의 값과 같다 |
| debug · androidTest APK의 sha256 | **불변**(`53582226137fd6ae…` · `26bf3efbe1db2054…`) |
| 회귀 — API 37(Pixel_8 AVD) | 계측 일괄(debug) `OK (47 tests)` = **통과 44 + 건너뜀 3** · `ConfigurationChangeTest` 8 · `StatusBarIconsHostTest` 8 · `SplashWordmarkHostTest` 7 = **통과 3 + 건너뜀 4** · 축소한 release 콜드 스타트 **5회 모두** 프로세스 생존 · `Step 1 of 3` · 오류 판정 0줄 · FATAL 0(워드마크 캡처 1장) |
| 회귀 — API 30(R6_API30 AVD, 4 KB) | 축소한 release 기동 **1회** — 프로세스 생존 · `Step 1 of 3` · `shrink_judge` 0줄. 계측 일괄(debug) `OK (47 tests)` = **통과 43 + 건너뜀 4** |

**release와 `bundled`의 dex — 최종 검증이 견준 것** [실측 — `dexdump` · `R.txt` 대조]. **아래 표와 그 밑 두 항목은 최종 검증이 손에 든 그 APK에 대해서는 맞는 관찰이다. 틀린 것은 그 APK를 정상 빌드의 `bundled`로 읽어 「release와 `bundled`의 dex는 같지 않다」로 일반화한 것이다** — 이 문서의 직전 판이 그렇게 적었다. 정정은 바로 아래 「리뷰 뒤의 재현」이다.

| | release AAB `base/dex/classes.dex` | 최종 검증이 견준 `bundled` APK의 `classes.dex` |
|---|---|---|
| sha256 | `b751b2f5…` | `24ac3ed6…` — 다르다 |
| 크기 | 2,934,436바이트 | 2,934,436바이트 — 같다 |
| 클래스 수 · 클래스 목록 | 2,992 | 2,992 — 목록 diff 0 |

- **다른 곳은 R8이 인라인한 `R.string` ID 상수 4곳과 헤더의 checksum · signature뿐이다**(`dexdump -d` 전체 diff). 그 넷은 `srl_content_empty`(0x7f0e005f ↔ 0x7f0e0059) · `notification_channel_name`(0x7f0e0055 ↔ 0x7f0e0050) · `notification_channel_description`(0x7f0e0054 ↔ 0x7f0e004f) · `selectAll`(0x7f0e005d ↔ 0x7f0e0057)이다.
- **원인 — 그 APK에 대해서**: google-services 플러그인이 만드는 문자열 6개(`gcm_defaultSenderId` · `google_api_key` · `google_app_id` · `google_crash_reporting_api_key` · `google_storage_bucket` · `project_id`)가 release에는 있고 그 `bundled`에는 없어 리소스 ID가 5 ~ 6씩 밀린다. `BuildConfig`의 차이가 아니다.
  **직전 판은 이것을 「release에만 있는 문자열」이라고 적었다 — 틀렸다.** 그 여섯은 변형의 성질이 아니라 **빌드할 때 `google-services.json`이 있었는가**로 갈린다(아래).
- **파일 없이 빌드한 `bundled`에서 그 네 상수의 차이가 동작에 주는 영향은 없다고 본다** [추론]. 근거는 각 빌드의 dex가 **자기 빌드의 `R.txt`에 적힌 ID**를 쓴다는 것이다. **확인한 것은 `R.txt`와 dex 상수의 대조까지다**: 두 빌드의 `resources.arsc`를 견주지 않았고, 그 네 문자열을 읽는 경로(당겨서 새로 고침의 빈 문구 · 알림 채널의 이름과 설명 · 전체 선택)를 나란히 밟아 견준 실행도 없다. **정상 빌드(파일이 있는 빌드)에는 이 차이 자체가 없다.**
- 덧붙임: `bundled` APK 자체의 sha256은 다시 빌드할 때마다 다르다(e2e `c0a90384…` · accessibility `c32c3dde…` · 최종 검증 `69e667dd…` · 리뷰 뒤의 판정 실행 `25fc1f8c…`). 매핑의 sha256은 매번 같다.

**release와 `bundled`의 dex — 리뷰 뒤의 재현(정정)** [실측 — test-runner, 2026-10-08, HEAD `6eb51a61`. 출처는 하네스 작업 폴더의 `review-p1.md`]. 모든 빌드는 모의 값 번들이고 **Gradle 빌드 캐시를 쓰지 않았다**(FROM-CACHE 0).

| 빌드 | `google-services.json` | `bundled`의 dex | release의 dex | `R.txt`(release 대 `bundled`) | `bundled`의 google 문자열 |
|---|---|---|---|---|---|
| `clean :app:assembleDebug :app:assembleBundled :app:bundleRelease` 한 번 호출 — **2회** | 있음 | `b751b2f5…` | `b751b2f5…` | 같다(2,988줄) | 6 |
| 그 직후 `clean` 없이 `:app:assembleBundled`(증분) | 있음 | `b751b2f5…` | — | 같다 | 6 |
| `run-talkback.sh`의 두 단계 그대로(`pnpm bundle:android` → `./gradlew assembleBundled`) | 있음 | `b751b2f5…` | `b751b2f5…` | 같다 | 6 |
| `clean :app:assembleBundled` 단독 | 있음 | `b751b2f5…` | — | `bundled` 2,988줄 | 6 |
| 최종 검증과 같은 호출(`clean testDebugUnitTest … :app:bundleRelease`) | 있음 | `b751b2f5…` | `b751b2f5…` | 같다 | 6 |
| HEAD의 일회용 사본에서 `:app:assembleBundled` | **없음** | **`24ac3ed6…`** | —(release는 파일 없이 빌드되지 않는다) | `bundled` 2,982줄 — 6줄 적다 | **0** |

- **호출 수**: 파일이 있는 빌드는 **여섯 호출**이다(`review-p1.md` 표의 A · B · C · C2 · D · V — 위 표는 A · B를 한 행에 묶어 다섯 행이다). 같은 문서의 결론 문장과 작업 증거는 「5회」라고 적는다 — 증거의 목록은 C2(`run-talkback.sh` 방식)를 뺀 다섯을 든다. 여섯 모두 결과가 같으므로 결론은 달라지지 않는다.
- **`google-services.json`이 있으면 `bundled`의 dex는 release와 항상 바이트가 같다** — `clean` 한 번 호출이든, 증분이든, 단독이든. release 쪽도 흔들리지 않았다(dex는 매번 `b751b2f5…`, `mapping.txt`는 매번 `657d490a…`). AAB · `bundled` APK **파일**의 sha256만 매번 다르고 dex 바이트는 같다.
- **달라지는 조건은 하나다 — 빌드할 때 그 파일이 없을 때.** 그때의 dex는 최종 검증이 적은 값과 **전체 해시까지 같다**(`24ac3ed6c0139f7b33bd5c4dad2b4d796b5a3fe0b1c4d013a54a675f1d03994f`): google 문자열 6개가 빠지고 `R.txt`가 6줄 적다.
- **그러므로 최종 검증의 관찰(그 APK의 dex · 상수 4곳)은 그 APK에 대해서는 맞고, 틀린 것은 일반화다.** **그 APK가 파일 없는 빌드에서 나왔다는 것은 해시의 일치가 근거다.** 어느 빌드였는가: **NA6이 남긴 것 — 로그의 순서와 뒤 빌드의 재실행 태스크로 지지된다. NA6 직후의 APK를 직접 해시한 실행은 없다**(아래). 최종 검증의 같은 `clean` 빌드의 Gradle 로그에는 `processBundledGoogleServices`가 실행됐다고 적혀 있다 — 그 빌드의 산출물이라면 여섯 문자열이 있었어야 한다.
  **출처는 기존 산출물 검사의 NA6이 남긴 `bundled`로 읽는다.** `devtools/android-bundle/native-alignment.artifacts.mjs`의 마지막 테스트 NA6은 `app/google-services.json`을 치운 채 `:app:assembleBundled`를 다시 빌드하고(「`bundled`는 파일 없이도 빌드된다」의 단언), 파일을 되돌린 뒤에는 **`:app:bundleRelease`만 다시 빌드한다 — `:app:assembleBundled`는 파일과 함께 다시 빌드하지 않는다** [코드 확인 — 그 파일의 377 ~ 442행].
  그래서 **코드상** 그 검사를 돌린 뒤 `app/build/outputs/apk/bundled/`에 남는 APK는 파일 없는 빌드다 — **NA6 직후의 APK를 직접 연 실행은 없다.**
  **최종 검증의 로그가 이 순서를 받친다** [정적 — 하네스 작업 폴더 `logs/`의 수정 시각과 내용을 직접 확인, 2026-10-08 · +0900].
  1. `verify-gradle.log` 00:44:48 → `verify-sha.txt` **00:44:53** — `clean` 빌드 직후의 해시 기록이고 `bundled` APK는 `69e667dd…`다.
  2. `verify-native-alignment.artifacts.log` **00:45:49** — 6건 통과, 마지막이 `ok 6 - NA6: release build fails without google-services.json (bundled still builds) …`다. 이때 `bundled`가 파일 없이 다시 빌드됐다.
  3. `verify-dex-compare.txt` **00:46:22** — release `b751b2f5…` 대 `bundled` `24ac3ed6…`. **NA6이 끝난 33초 뒤에 견줬다.**
  4. `verify-e7-talkback-run1.log`(00:53:33에 끝남)의 Gradle 출력 — TalkBack 러너의 `assembleBundled`가 **UP-TO-DATE가 아니었다**: `mergeBundledResources` · `processBundledResources` · `compileBundledJavaWithJavac` · `minifyBundledWithR8` · `packageBundled`가 실행됐고(로그 123 ~ 142행) 끝줄이 `50 actionable tasks: 19 executed, 31 up-to-date`다(`processBundledGoogleServices`는 UP-TO-DATE). 리뷰 뒤의 재현에서 같은 호출(위 표의 증분 · `run-talkback.sh` 방식)은 **전부 UP-TO-DATE였다** — 그러니 최종 검증에서는 `clean` 빌드와 러너 사이에 무언가가 `bundled`의 리소스를 바꿨다는 뜻이고, 그 사이에 돈 것이 NA6이다.
  **결론: NA6이 남긴 것 — 로그의 순서와 뒤 빌드의 재실행 태스크로 지지된다. NA6 직후의 APK를 직접 해시한 실행은 없다.** 위 넷은 파일의 수정 시각과 태스크 이름이지 그 APK의 해시가 아니다.
  **리뷰 r01의 설명(「그것은 `clean` 빌드의 `bundled`였고 뒤의 빌드가 리소스를 다시 병합해 바뀌었다」)은 반만 맞았다.** **맞은 것**: 뒤의 빌드(TalkBack 러너의 `assembleBundled`)가 `bundled`를 다시 만들었다 — 위 4. **틀린 것**: 견준 APK가 `clean` 빌드의 것이고 거기서 리소스가 빠졌다는 것 — `clean` 빌드는 파일과 함께 돌았고(`processBundledGoogleServices` 실행), 리소스가 빠진 것은 그 뒤 NA6의 파일 없는 재빌드다(재리뷰 r02도 그 추론을 거뒀다). 이 문서의 직전 판은 이 설명을 통째로 「기록으로 지지되지 않았다」고 적었다 — 재빌드가 있었다는 쪽은 기록이 받친다.
- **파일 없이도 `bundled`가 빌드되는 것은 의도된 동작이고 이 작업이 만든 것이 아니다** [정적 + 실측]. `apps/android/app/build.gradle` 9행이 `google-services.json`이 `exists()`일 때만 플러그인을 적용하고, 182행의 주석이 「bundled · debug는 파일 없이도 빌드된다」고 적는다(release는 185행의 검사가 멈춘다).
  `3b2cbb65..HEAD`에서 그 파일의 변경은 minify 두 줄뿐이고, **minify 전 `3b2cbb65`의 사본에서도 같다** — 파일이 없으면 `bundled`의 google 문자열 0 · `R.txt` 2,982줄, 있으면 6 · 2,988줄.
- **절차상의 위험 — 기존 산출물 검사를 돌린 뒤의 `bundled` APK는 출시 dex가 아니다** [코드 확인 + 위 표의 파일 없는 빌드 — NA6 직후의 APK를 직접 연 실행은 없다]. `native-alignment.artifacts.mjs`를 돌린 뒤 다시 빌드하지 않고 그 `bundled`로 TalkBack 흐름 · 스플래시 반복 · 접근성 활성화 단계를 돌리면 release와 다른 dex를 보게 된다.
  NA6의 이 동작은 이 작업 이전부터의 것이나, **minify 뒤에야 dex의 차이로 드러난다**(R8이 리소스 ID를 dex에 인라인한다). [출시 설정 절차](../e2e/android-release-config.md)가 S.3의 사전 검사(release와의 dex sha256 비교 · `google_app_id` 확인)와 「`release-shrink` 검사를 `native-alignment`보다 먼저」로 막는다(test-design의 정정 `42e2f00f`).
  **절차 문서와 대조한 결과** [정적 — `42e2f00f`의 문면]: S.3의 「`bundled`를 검증에 쓰기 전에 (3-b)」가 명령 셋(release AAB와 `bundled`의 `classes.dex` sha256 둘 · `aapt2 dump resources`의 `google_app_id` 개수)을 싣고, 해시가 다르거나 개수가 0이면 멈추고 파일을 둔 채 `:app:assembleBundled`를 다시 빌드하라고 적는다. R1의 산출물 검사 블록은 `release-shrink.artifacts.mjs`를 `native-alignment.artifacts.mjs`보다 앞에 두고 「반드시 release-shrink 뒤에」라고 적는다. 그 문서가 가리키는 이 ADR의 번호(D3 — `bundled`의 물려받기 · D4 — 배포 뒤 ABI 축소의 대가)도 이 문서와 맞다.
  NA6 뒤의 `bundled`에 대한 두 문서의 문면은 같은 단서로 맞췄다: **코드상 파일 없는 빌드다 — NA6 직후의 APK를 직접 연 실행은 없다**(절차 문서의 앞선 문면은 「일 수 있다」였다).
  **3-b의 세 명령은 root가 2026-10-08에 워크트리의 현재 산출물에 그대로 돌렸다** [실측 — root, 작업 증거의 기록]: AAB의 dex `b751b2f5…` = `bundled`의 dex `b751b2f5…` · `google_app_id` 1. 절차 문서 자신은 그 세 줄을 「고칠 때 돌려 보지 않았다」고 적는다.
- **파일 없는 `bundled`의 동작** [실측 — API 37, 설치 · `pm clear` · 기동 12초]: **Firebase 초기화 실패 로그를 찍고 기동은 한다**(`Default FirebaseApp failed to initialize because no default options were found` · `FirebaseApp initialization unsuccessful` — 프로세스 생존 · FATAL 0). 파일이 있는 빌드는 `FirebaseApp initialization successful`이다. **로그인 뒤 푸시 토큰 등록 경로는 돌리지 않았다** [미확인].

**앞선 검증들이 쓴 `bundled`는 어느 쪽이었나** — 가를 수 있는 만큼.

| 검증 | 근거 | 수준 |
|---|---|---|
| e2e E7 TalkBack 흐름(`c0a90384…`) | **보존된 APK를 열었다** — dex `b751b2f5…` · google 문자열 있음 | **release와 같은 dex — 확인** |
| 최종 검증의 TalkBack 러너(`69e667dd…`) | Gradle 로그의 `processBundledGoogleServices UP-TO-DATE` · 파일이 있는 워크트리. **test-runner는 그 APK를 직접 열지 못했다**(남아 있지 않았다). 리뷰는 자기 시점에 워크트리에 있던 그 APK의 dex가 `b751b2f5…`라고 적었다 [리뷰의 확인] | 로그 수준 + 리뷰의 확인 |
| accessibility 단계의 더블탭 · 포커스 링 | 그 빌드 로그에 `processBundledGoogleServices`가 있다. APK는 남아 있지 않다 | 로그 수준 |
| e2e 스플래시 워드마크 10회 · 그 밖 | 해당 Gradle 로그에 모두 `processBundledGoogleServices`가 있다. APK는 남아 있지 않다 | 로그 수준 |
| 최종 검증의 dex 비교(`24ac3ed6…`) | 파일 없는 빌드의 dex와 전체 해시 일치 | **파일 없는 빌드 — 견준 대상이 잘못됐다** |

기록으로 확인되는 검증용 `bundled`는 전부 파일이 있는 빌드였고, 예외는 최종 검증의 dex 비교 한 건이다. 다만 APK가 남지 않은 항목은 「로그에 그 태스크가 있다」까지다.

- **뜻 — D3의 근거는 `google-services.json`이 있을 때 성립한다.** 그 조건에서 `bundled`는 release와 **같은 dex**를 싣고, 「`bundled`가 release와 같은 코드를 본다」는 dex 바이트까지 맞다. 직전 판이 그 근거를 「코드 구조가 같은 빌드」로 낮추고 동작 영향을 [추론]으로 붙인 것은 이 결과에 맞춰 되돌린다.
  **전제가 하나 붙는다**: `bundled`를 release의 대리로 쓰는 검증은 그 파일이 있는 워크트리에서 빌드해야 한다 — 파일은 추적하지 않으므로 일회용 사본에서는 빠지기 쉽고, 빠져도 빌드는 성공한다. 기존 산출물 검사를 돌린 뒤라면 `bundled`를 다시 빌드한다(위 「절차상의 위험」).
- **이 정정의 경위.** e2e · accessibility 단계까지 이 문서는 둘을 「같은 설정」으로 적었고 dex를 견준 기록이 없었다. 최종 검증이 처음 견줘 sha256이 다르다고 봤고, 직전 판(`eccf21e3`)이 그 한 번을 「release와 `bundled`의 dex는 같지 않다 — 원인은 release에만 있는 google-services 문자열」로 일반화해 D3의 근거를 낮췄다.
  리뷰(P1-1)가 워크트리의 `bundled` APK는 release와 dex가 같다고 지적했고, test-runner가 위 표로 재현해 **「파일이 있으면 같고 없으면 다르다」** 로 좁혔다. 이 판이 그 일반화를 거둔다 — 관찰 자체는 지우지 않고 위에 남긴다.
  **최종 검증의 그 APK의 출처: NA6이 남긴 것 — 로그의 순서와 뒤 빌드의 재실행 태스크로 지지된다. NA6 직후의 APK를 직접 해시한 실행은 없다**(위 로그의 순서). 이 문서의 직전 판은 「여전히 확정되지 않았다」고 적고 그 까닭으로 `69e667dd…`의 유지를 들었다 — `clean` 빌드 직후의 기록과 리뷰가 나중에 워크트리에서 본 APK가 같은 `69e667dd…`(dex `b751b2f5…`)다.
  이것은 **TalkBack 러너의 재빌드가 파일과 함께 원래 바이트를 다시 낸 것으로 읽는다** [추론 — 기전을 확인하지 않았다]. 리뷰 뒤의 재현에서는 `bundled` APK 파일의 sha256이 빌드마다 달랐으므로(위 「덧붙임」), 같은 값이 다시 나온 까닭은 설명되지 않은 채다.

**변이의 구분력 — 최종 구현에서 대표 4종** [실측 — HEAD의 일회용 사본(`git worktree add --detach`), 끝에 제거. 로그: 하네스 작업 폴더의 `logs/verify-mutation-{k1-delete,k2-delete,release-abifilter,bundled-minify-off}.log`]. 사본의 기준선은 `test:android-bundle` 123 / 123이다.

| 변이 | `pnpm test:android-bundle` | 다시 빌드한 뒤의 산출물 검사 |
|---|---|---|
| K1 줄 삭제(`@com.lynx.base.CalledByNative`) | 121 / 123 — **I3 · I4 실패** | 7 / 8 — **A4 실패**(`member-missing com.lynx.base.log.LynxLog.log` · `…logByte`) |
| K2 줄 삭제(`@com.lynx.trace.CalledByNative`) | 121 / 123 — **I3 · I4 실패** | 7 / 8 — **A4 실패**(`member-missing com.lynx.tasm.base.TraceController.generateTracingFileDir` · `…refreshATraceTags` …) |
| release에 `ndk { abiFilters 'arm64-v8a' }` 삽입 | 122 / 123 — **I1 실패** | 5 / 8 — **A1 실패**(ABI 1개), 덧붙여 A5 · A7도 실패 |
| `bundled`에 `minifyEnabled false` | 121 / 123 — **I1 실패 2건**(`minifyEnabled`가 두 번 · `bundled`의 자체 선언) | 다시 빌드하지 않았다(요청 범위 밖) |

넷 모두 기대한 케이스에서 실패했고 되돌린 뒤 사본의 추적 변경은 0이었다. **test-design의 26종 가운데 나머지 22종은 최종 구현으로 다시 돌지 않았다** — 「최종 구현에서 구분력이 확인됐다」는 이 4종에 한한다. K1 변이의 **기기** 판정(기동 즉시 SIGABRT)도 이번에는 다시 하지 않았다(D2의 두 번이 근거다).

**accessibility 권고 R1 · R2의 반영 — `28c307e4`**(test-design. 내용은 작업 증거의 기록이고, A8의 통과는 최종 검증의 실측이다).

- **R2 → 산출물 검사 A8.** 단언하는 것: `AccessibilityTapBridge$TapDelegate`와 `LynxAccessibilityNodeProvider`는 **이름이 바뀌어도 살아 있고** 멤버가 남아 있다(`onInitializeAccessibilityNodeInfo` · `performAccessibilityAction` / `createAccessibilityNodeInfo` · `performAction`) ·
  `CompletionAnnouncementModule.announce`와 `LynxAccessibilityModule.accessibilityAnnounce`는 **이름이 그대로다** · Lynx 가상 노드의 클래스 이름(`UIView` · `UIText` · `FlattenUIText`)이 그대로다. 인라인된 `AccessibilityTapBridge.sync`는 요구하지 않는다.
- **keep 규칙은 더하지 않았다** — 프로젝트 규칙은 9줄 그대로다(D2 · I4). 접근성 클래스의 생존은 여전히 R8의 도달 가능성 분석과 `lynx` AAR의 consumer 규칙에 달려 있고, A8은 그것이 깨졌을 때 **알리는** 검사다.
- 「살아 있다」를 보는 판정 함수가 새 모듈 `devtools/android-bundle/mapping-survival.mjs`에 생겼다(D5).
- **한계**: A8은 `mapping.txt`만 본다. test-design이 구분력을 확인한 방법은 매핑 **텍스트**의 변이 9종이고(M1 ~ M9와 대조 G1 — 로그 `logs/mutation-a11y-mapping.log`. 이 문서의 앞선 판은 「6종」이라 적었고 로그의 줄은 아홉이다), 확인된 것은 **「R8이 실제로 지웠을 때」가 아니라 「매핑에 없을 때」 실패한다**는 것이다 — R8이 그 클래스를 지우는 빌드를 만들어 본 것이 아니다.
- **R1 → 절차 문서 S.10의 접근성 활성화 단계.** `28c307e4`의 문면은 아래처럼 **문서 그대로는 판정할 수 없었고**, `126325d4`가 고쳤다(아래 「S.10의 정정과 절차 확인」).

**고친 절차 · 도구의 기기 결과** [실측 — API 37 · API 30]. 「미확인 · 후속」 8이 「정정본은 기기에서 다시 돌지 않았다」고 적었던 것 가운데 닫힌 것과 닫히지 않은 것이다.

- **커밋된 `shrink_judge`**(절차 문서 S.2의 블록 그대로): 축소한 AAB를 bundletool로 분할 설치해 띄운 E1에서 **오류 판정 0줄** — API 37(원시 9줄은 시스템 HAL 프로세스 6개의 것이라 제외됐다. 콜드 스타트 5회도 매번 0줄) · API 30(원시 0줄). 축소 전 빌드와의 로그 서명 비교는 이번에 다시 하지 않았다.
- **고친 `run-talkback.sh`**(축소한 `bundled`): `pnpm test:e2e:android:talkback`이 **1회째에 통과했다**(exit 0 · Maestro 전 단계 완료 · 골든 95% · 오류 판정 0줄). **폴링이 경합을 없앴는지는 1회 표본이다.**
  X1(TalkBack의 알림 권한 창)은 **두 번 떴다** — 앱 기동 직후(곧 가려졌다)와 흐름이 끝난 뒤. **이번 흐름을 막지는 않았고**, 끝난 뒤에는 창이 앞에 남아 있었다. 스크립트는 여전히 이 창을 다루지 않는다.
- **S.10의 새 접근성 활성화 단계 — `28c307e4`의 문서 그대로는 판정 불가였다**(최종 검증의 관찰 — 고쳐진 뒤의 결과는 이 목록 아래 문단이다). 까닭 셋: 단계의 셸 루프가 **zsh에서 죽는다**(`set -- $xy`가 낱말을 나누지 않아 `bad math expression`) · 온보딩을 기다리지 않아 **스플래시에서 터치 탐색이 시작된다** · **기준값이 제스처 내비게이션 전제인데** 문서는 3버튼 조건인 러너에 이어 돌리라고만 적는다.
  - 3버튼 그대로, 온보딩을 기다려 다시 한 시도: `Next` 더블탭 → 2단계 전환은 확인. 포커스 링은 기준값과 다른 사각형이었다(3버튼에서는 링이 버튼 전체에 잡힌다).
  - **제스처 모드로 맞춘 시도**: `Next` 더블탭 → **2단계(「Practice Korean」) 전환 확인**, **링 사각형 5곳(`Next` · `Back` · 제목 · 설명 · 카드)이 기준값과 일치.** **픽셀 수는 기준값과 맞지 않았다**(54 / 2236 / 5396 / 5198 / 540 대 346 / 5868 / 13924 / 13900 / 704) — 그때 픽셀 수를 재는 도구는 **저장소 밖 스크립트**(하네스 산출물)뿐이어서 저장소에서 재현할 수 없었다.
  - **debug와의 같은 조건 비교는 최종 검증에서 하지 못했다**(debug에는 번들 서버가 필요해 이 단계에서 같은 조건으로 깔지 못했다). 그래서 이번 확인은 **포커스 위치(사각형)와 화면 전이까지**이고, accessibility 단계의 「두 빌드에서 픽셀 수까지 같다」를 다시 세운 것이 아니다.
  - `verify.md`는 이 단계를 돌린 빌드를 따로 적지 않았다 — 절차상 러너에 이어 도는 단계이므로 축소한 `bundled`로 읽는다 [추론].

**S.10의 정정과 절차 확인 — `126325d4`**(test-design. 출처는 작업 증거의 기록과 [출시 설정 절차](../e2e/android-release-config.md)의 S.10 · S.0 · S.1 · S.15 · S.16이다).

- **고친 것**: zsh에서 죽던 루프를 직접 호출 함수로 바꿨다(낱말 분리에 기대지 않는다) · 스플래시가 끝나고 온보딩 1단계가 그려질 때까지 기다린다(스크린샷 한 픽셀의 색 — `uiautomator dump`를 쓰지 않는다) · 전제 표를 실었다 · 링을 재는 도구 `ring.py`(표준 라이브러리 PNG 디코더)를 문서 안에 실었다.
- **판정 기준이 바뀌었다.** **주 판정은 화면 전이**(`Next` 더블탭 뒤 2단계)이고, 링은 **사각형 좌표가 기준과 같은가 + 축소한 `bundled`와 debug를 같은 절차로 돌린 결과의 `diff`가 0인가**로 본다.
  픽셀 수는 문서에 실린 `ring.py`로 잴 때만, 두 빌드끼리 견준다 — **표의 기준 픽셀 수는 관찰값이고 판정 기준이 아니다.**
- **기기 확인** [실측 — test-design, API 37, 문서에서 추출한 블록 그대로]: 축소한 `bundled`(dex 1)와 debug 각각 × zsh · bash, **4회 모두** `Next` 더블탭 → 2단계 전이 · **링 사각형 6곳이 기준과 일치** · 두 빌드의 결과 `diff` 0(픽셀 수 346 / 5868 / 13924 / 13900 / 704).
  **이것은 판정이 아니라 절차 확인이고 1회 표본이다** — 「문서 그대로 bash · zsh에서 돈다」를 본 것이다. **이 시점에는 test-runner가 고친 S.10을 판정으로 돌린 적이 없었다** — 리뷰 뒤에 돌렸고 통과했다(아래 「리뷰와 P1의 처리」).
  「6곳」은 캡처 여섯(1단계 `Next`의 터치 탐색 · 더블탭 뒤 · 2단계의 네 지점)이고 서로 다른 지점은 다섯이다 — accessibility 단계의 「6지점」과 최종 검증의 「5곳」은 같은 것을 다르게 센 것이다.
- **픽셀 수가 기록마다 달랐던 까닭 — 측정 도구가 달랐던 것으로 보인다** [추론]. 문서의 `ring.py`는 accessibility 단계의 옛 스크린샷에서 그 단계의 수(346 · 5868)를 그대로 냈다. **최종 검증의 도구와 같은 이미지로 맞대 보지는 않았다** — 그래서 추론이다.
- **전제**: Pixel_8 AVD · API 37 · 1080x2400 · 420dpi · **제스처 내비게이션** · TalkBack 바인딩 · 모의 값 번들 · 글자 배율 1.0. 하나라도 다르면 사각형이 달라진다(3버튼에서는 `Next`의 링이 버튼 전체에 잡힌다).
- **확인되지 않은 것**: 3버튼 → 제스처 전환 단계는 실행되지 않았다(확인 때 이미 제스처였다) · 절차 문서 S.15의 새 `settings delete` 블록은 구문만 봤다 · **TalkBack이 읽는 문장은 여전히 보지 못했다** · 활성화가 `TapDelegate`를 지났는지 Lynx 노드 제공자를 지났는지는 여전히 가르지 못한다.
- **여전히 이 더블탭은 축소한 `bundled`에서 본 것이다.** 이 절차 확인의 `bundled`가 release와 같은 dex였다는 것은 기록으로 확인되지 않는다(APK가 남지 않았다) — 같은 단계를 dex가 확인된 `bundled`로 돌린 것은 아래 「리뷰와 P1의 처리」의 판정 실행이다. 출시 바이너리에서 TalkBack을 켜고 본 것은 없다.

### 리뷰와 P1의 처리 — HEAD `6eb51a61`

출처는 하네스 작업 폴더의 `review.md`(review 에이전트의 보고를 root가 옮겨 적은 것)와 `review-p1.md`(test-runner의 재현과 판정 — 아래 수치의 정본)다.
**리뷰의 판정: 조건부 PASS** — 하네스 게이트 red 0 · 차단(P0) 0 · P1 4건 · P2 여럿. 리뷰가 직접 확인한 제품 변경은 `apps/android/app/build.gradle` 두 줄과 신규 `proguard-rules.pro` 9줄뿐이다. **재리뷰 r02(HEAD `9965eee2`)의 판정은 PASS다** — P1 네 건이 닫혔고 새 P0 · P1은 없다(`pnpm verify` · `test:android-bundle` 123 / 123은 `6eb51a61` 기준이고 그 뒤의 변경은 문서뿐이다). r02가 documentation 몫으로 남긴 P2 셋(NA6을 받치는 기록 · NA6 뒤 `bundled`의 문면 · 재현 횟수의 표기)은 이 판이 반영했다.

| 지적 | 내용 | 처리 |
|---|---|---|
| **P1-1** | 「release와 `bundled`의 dex가 다르다 · 원인은 release에만 있는 google-services 문자열」이 현재 산출물과 맞지 않는다 | **정정했다** — 위 「release와 `bundled`의 dex — 리뷰 뒤의 재현」 |
| **P1-2** | 실제 업로드 빌드에 산출물 검사 A1 ~ A8을 돌리는 지점이 출시 절차에 없다(실행법은 [Android 호스트 README](../../apps/android/README.md#코드-축소r8와-난독화)에만 있다) | **반영됐다**(`42e2f00f` — test-design) — [출시 설정 절차](../e2e/android-release-config.md)의 R1과 R9-1. **R1**: 에뮬레이터 단계의 산출물 검사 블록에 `release-shrink.artifacts.mjs`(8건)가 들어갔고 **`native-alignment.artifacts.mjs`보다 먼저** 돈다 — NA6이 `google-services.json` 없이 `bundled`를 다시 빌드해 남기기 때문이다. **R9-1**: 올릴 AAB(실제 값 번들로 다시 만든 다른 파일)에 **업로드 직전 · 서명하기 전에 사용자가** 같은 검사를 돌린다 — 서명 뒤에는 같은 폴더에 `.aab`가 둘이 되어 검사가 어느 파일을 읽을지 가려지지 않는다. 하나라도 실패하면 업로드하지 않는다. **문서에 지점이 생긴 것이고 업로드 빌드에 돌린 결과는 없다**(R9는 미실행) |
| **P1-3** | e2e 계층의 red 증거가 없다 · 재진입 뒤 단위 결과가 없다 · U13 ~ U15 · A8은 red 없이 들어왔다 | **기록됐다**(아래) |
| **P1-4** | ABI 재검토 조건에 시한이 없고 문서끼리 다르다 | **사용자가 시한을 정했다(U5)** — 「재검토 조건」의 첫 줄. 절차 문서도 `42e2f00f`에서 같은 결정으로 고쳐졌고 R9의 확인 목록 **k**(출시 조건)가 됐다 — 두 문서의 문면 차이는 「재검토 조건」에 적었다 |

**P1-3의 기록** [test-runner, HEAD `6eb51a61`].

- **e2e red는 `moot`로 기록됐다.** `not-applicable`이 아니다(e2e는 적용 대상이고 썼고 돌렸다). `confirmed`도 아니다(구현 전의 실패를 본 적이 없다 — 절차 문서 `47982c70`이 구현 `ac0cdf6d` 뒤에 쓰였다). 게이트의 세 조건:
  1. **전부 통과** — `e2e-run.md`의 E1 ~ E8. 단서 둘: E7은 1회째가 실행기 경합으로 exit 1이고 2회째에 통과했다(재시도 한도 2회 안) · E8 E1은 「통과(주석)」이다(서명 비교 1줄 차이 — 그 규칙을 받지 않으면 이 칸은 보류). **충족하되 주석이 있다.**
  2. **선행 단계 지목** — implementation의 `ac0cdf6d`(release의 `minifyEnabled true` + `proguardFiles`, 신규 `proguard-rules.pro`)가 e2e가 보는 협력을 만들었다.
  3. **공허하지 않음** — K1 변이(`CalledByNative` 규칙 삭제) 빌드에서 E1이 실패했다(pid 없음 · 오류 판정 10줄). 양성 대조도 있다(E4의 생명주기 이벤트).
  **소급 기록이다** — 구현이 들어간 뒤에 적었다.
- **재진입 뒤의 단위 결과**: `pnpm test:android-bundle` **123 / 123**(실패 0 · 건너뜀 0, U13 ~ U15 포함).
- **HEAD의 `pnpm verify`: 통과**(exit 0 — `test:android-bundle` 123 / 123, `main.lynx.bundle` 1389.3 kB / 예산 1412.0 kB, 성능 게이트 통과). 「최종 검증」의 `pnpm verify`는 `28c307e4` 기준이었다.
- **U13 ~ U15 · A8은 red 없이 들어왔다.** 매핑 **텍스트**의 변이(M1 ~ M9 — 각각 해당 이슈를 보고, 기준선과 대조 G1은 빈 결과)로 **판정 함수의 구분력만** 확인했다. red를 대신하지 않는다 — 구현이 없어 실패하는 것을 본 것이 아니라 입력 텍스트를 바꾼 것이고, R8이 실제로 그 클래스를 지우는 변이는 돌지 않았다.

**S.10 접근성 활성화 단계의 판정 실행** [실측 — test-runner, HEAD `6eb51a61`, Pixel_8 AVD · API 37 · 1080x2400 · 420dpi · 제스처 내비게이션 · `touch_exploration_enabled=1`].

- **방법**: [출시 설정 절차](../e2e/android-release-config.md)의 접근성 활성화 단계 블록 넷을 **문서에서 추출해 그대로** zsh에서 차례로 돌렸다. 블록 밖에서 한 것은 S.2의 `A()` · `OUT`을 저장소 밖 값으로 정의한 것뿐이다.
- **대상**: 축소한 `bundled`(APK `25fc1f8c…` — dex 1개, **`b751b2f5…`로 release와 같다**)와 debug(`53582226…`).
- **결과 — 통과**(문서의 판정 표 그대로): 두 빌드 모두 `Next` 더블탭 → **2단계 전이** · **링 사각형 6곳이 기준과 일치** · **두 빌드의 결과 `diff` 0 — 사각형과 픽셀 수까지 같다**(346 / 5868 / 13924 / 13900 / 704).
- **한계**: **1회 표본 · zsh만**(bash는 돌리지 않았다) · 활성화가 `TapDelegate`를 지났는지는 여전히 가르지 못한다 · 읽힌 문장은 보지 못했다 · 3버튼 → 제스처 전환 단계와 API 30은 돌지 않았다.
- 이것으로 위 「S.10의 정정과 절차 확인」의 「test-runner가 고친 S.10을 판정으로 돌린 적은 없다」는 **닫혔다.**

**리뷰가 독립으로 확인한 것** [리뷰의 확인 — 출처는 `review.md`이고 이 문서나 test-runner가 다시 재현한 것이 아니다].

- **Fresco에는 자체 keep 규칙이 필요 없다.** `fbcore`의 `@DoNotStrip` 규칙이 병합된 R8 설정에 있고, Fresco의 리플렉션 대상 11개가 매핑에서 이름 그대로다(맥락 6).
- **`CalledByNative` 어노테이션은 세 패키지뿐이고 모두 규칙으로 덮였다**(`com.lynx.tasm.base` — `lynx` AAR의 consumer 규칙 · `com.lynx.base` — K1 · `com.lynx.trace` — K2).
- **arm64 `.so` 16개의 문자열이 가리키는 Java 클래스 78개가 이름 그대로다 — 클래스 수준이고 메서드 수준이 아니다**(「대가」 1).
- **R8 경고 3건의 refresh 요소는 앱에서 사용 grep 0건이다**(「대가」 3).
- 저장된 logcat을 다시 훑어 K1 변이 밖의 새 오류 줄 0을 확인했다(제외된 601줄은 전부 HAL의 SIGABRT).
- **리뷰가 확인하지 못했다고 적은 것**: P1-1의 원인(위 재현이 좁혔다) · 어노테이션 없는 JNI 메서드 수준의 누락 · root가 댄 32비트 비율의 출처 원문 · 실기 · Play · 업로드 키 서명 · 변이 22종의 최종 구현 재실행.

**사용자 항목**(재리뷰 r02의 목록 그대로). **머지 전: 없다** — `bundled`가 minify를 물려받는 것은 2026-10-08에 답을 받았다(U4). **출시 전: 다섯.**

1. R9 **k** — ABI 유지 · 축소의 결정과 그 수치 기준(시한은 U5로 정해졌고 결정과 기준은 아직이다 — 「재검토 조건」).
2. R9 m1 ~ m8 · j를 **축소한 출시 AAB로 실기에서.**
3. R9-1의 산출물 검사를 **올릴 AAB에 실제로 실행.**
4. 출시 빌드의 `mapping.txt` 보관(「대가」 5).
5. API 30 E8 E1의 「통과(주석)」 규칙 수용 — **2026-10-08 사용자가 수용했다**(질문에 규칙이 실행 뒤에 만들어졌다는 것을 적어 물었다). 아래는 답을 받기 전의 기록이다. e2e red `moot`의 조건 1이 여기에 걸려 있다(위 P1-3의 기록). r01은 원본 두 줄을 보고 「실패를 정의로 지운 것」으로 보지 않았다.

## 버린 대안

| 대안 | 버린 까닭 |
|---|---|
| ABI를 `arm64-v8a`만 싣는다(계약의 권고) | **사용자가 고르지 않았다**(U1). 권고의 근거는 「실행해 본 ABI가 그것뿐이고 좁게 시작해 넓히는 쪽이 쉽다」였고, 대가는 32비트 전용 ARM 기기 · ARM 번역이 없는 x86 기기를 못 받는 것인데 **그 수를 모른다.** 버린 것이 아니라 미룬 것이다 — 「재검토 조건」 |
| minify를 끈 채 둔다 | 기기 다운로드 20%를 얻지 못한다. 계약은 「골라도 틀린 선택이 아니다 — 4.27 MB를 얻는 대신 규칙 재확인 · 픽스처 상실 · 닿지 못한 경로를 지는 교환」이라고 적었다. 사용자가 켜는 쪽을 골랐다(U2) |
| 리소스 축소를 함께 켠다 | D1 — 44,327바이트(0.26%)에 「이름으로만 찾는 리소스」 위험이 붙는다. 켜면 그 확인이 계약에 더해지고 e2e를 그 빌드로 다시 돌려야 한다 |
| 축소만 하고 난독화는 끈다(`-dontobfuscate`) | 스택 트레이스의 이름이 그대로 남는 이점이 있으나 사용자가 난독화를 골랐다(U2). 이 조합은 기기에서 돌린 적이 없다 |
| `bundled`를 minify에서 뺀다 | D3의 표 — `bundled`가 출시 바이너리와 갈라진다 |
| 호스트 패키지를 통째로 keep한다(`-keep class com.libitum.host.** { *; }`) | 필요가 없다(맥락 7). 넓은 규칙은 「무엇이 왜 남는가」를 가린다 — I4가 막는다 |
| 축소한 빌드에 계측을 붙이는 길을 만든다(`testBuildType` · 테스트용 keep 규칙) | 범위 밖이다. 후속 후보로 남긴다(「미확인 · 후속」 6) |
| 탐침 훅을 제품 트리에 둔다 | 출시 바이너리에 테스트용 세션 주입 코드가 들어간다. 일회용 사본에서만 만든다 |

## 대가

1. **어노테이션 없이 JNI로 불리는 메서드의 누락은 정적 검사가 잡지 못한다.** I3이 보는 것은 vendor Lynx AAR 넷의 `CalledByNative` 어노테이션이 규칙으로 덮였는가뿐이다.
   vendor가 아닌 AAR(`xelement*` · `lynx-service-*` · `primjs` · `servalsvg`)과 어노테이션 없는 JNI 호출은 **기기에서 그 경로를 밟아야 드러난다** — K1이 없는 빌드도 빌드에는 성공하고 기동에서 죽었다.
   - **`.so`가 가리키는 Java 클래스의 이름은 남아 있다 — 클래스 수준까지다** [리뷰의 확인]. arm64 `.so` 16개의 문자열이 가리키는 Java 클래스 78개가 매핑에서 이름 그대로다. **메서드 수준의 대조가 아니다** — 어노테이션 없는 JNI 메서드의 누락은 이것으로도 가르지 못한다.
   - **`JNI DETECTED ERROR`는 CheckJNI의 출력이다.** 실기의 비디버그 빌드에서는 같은 누락이 다른 모양으로 나타날 수 있다 [추론 — 리뷰의 지적]. K1 없는 빌드의 죽는 모양(맥락 5-2)을 실기의 판정 패턴으로 그대로 옮기지 않는다.
2. **Lynx · Fresco · AGP를 올릴 때마다 규칙을 다시 확인해야 한다.** consumer 규칙이 없는 AAR(vendor `lynx-base` · `lynx-trace` · `service-api`, vendor Fresco 5개 — 맥락 6)이 새 버전에서 무엇을 이름으로 찾는지는 그 버전을 읽고 돌려 봐야 안다.
   K1이 없으면 기동도 하지 않으므로 「규칙이 모자란다」는 대개 첫 기동에서 드러나지만, 드물게 밟는 경로의 누락은 그렇지 않다.
3. **R8 경고 3건이 남는다.** `xelement`의 `LynxUIRefresh$createView$1`에 대한 「multiple definitions」(`_$_findViewCache` 필드 · `_$_clearFindViewByIdCache` · `_$_findCachedViewById`)이고 빌드는 성공한다(최종 검증의 빌드에서도 같은 3종 — release · `bundled`에서 한 번씩).
   **규칙을 더하지 않았다.** 앱이 그 요소를 쓰는지: **refresh 요소의 사용은 앱에서 grep 0건이다** [리뷰의 확인]. **경고가 동작에 영향을 주는지는 확인하지 않았다** [미확인].
4. **계측 픽스처가 release · `bundled` 설치에 붙지 않는다**(D3). 「내장 번들 + 로그인 뒤 화면」을 저장소 안의 수단으로 보는 길은 일회용 탐침뿐이고, 그 탐침은 출시 바이너리와 dex가 다르다.
   debug + 계측의 흐름은 영향이 없다(APK가 바이트 단위로 같다).
5. **스택 트레이스가 난독화된다.** 호스트 클래스 46개와 라이브러리 클래스의 이름이 바뀌고(`r2.j` 등) 줄 번호는 매핑으로만 복원된다(logcat에 `SourceFile:19`처럼 나온다) [실측].
   - 매핑은 빌드 산출물 `apps/android/app/build/outputs/mapping/release/mapping.txt`(약 22.9 MB — 추적하지 않는다)이고 같은 내용이 AAB 안에 들어간다 [실측].
   - **같은 소스 · 의존성 · 규칙이면 `mapping.txt`의 sha256은 빌드마다 같았다**(`657d490a…` — 계약 · 구현 확인 · e2e · 최종 검증 · 리뷰 뒤의 재현) [실측]. 직전 판의 「빌드마다 매핑이 다르다」는 관찰과 맞지 않아 거둔다.
     그래도 **출시한 빌드의 `mapping.txt`를 보관하는 것은 사용자 몫이다** — 소스 · 의존성 · 규칙이 바뀌면 매핑이 달라지고, 그 뒤에는 그 빌드의 매핑이 아니면 풀 수 없다. 테스터가 보낸 logcat을 사람이 풀려면 그 빌드의 매핑과 `retrace`가 필요하다.
   - 「AAB를 올리면 Play가 그 안의 매핑으로 비정상 종료 보고서를 풀어 주므로 따로 올릴 필요가 없다」는 **[문서 기억 — 이 작업에서 확인하지 않았다].**
   - `retrace` 명령은 절차 문서에 적혀 있으나 **이 작업에서 돌려 보지 않았다.**
6. **`bundled` 빌드가 느려지고 그 스택도 난독화된다**(D3). 개발 중 `bundled`에서 본 충돌은 `mapping/bundled/mapping.txt`로 풀어야 한다.
7. **기기 확인의 대부분이 수동 절차다.** 축소의 실패는 기기에서만 드러나는데 그 확인(E1 ~ E9)은 `pnpm verify`에 없다. `pnpm verify`에서 도는 것은 단위와 정적 결선뿐이다.

## 확인한 것과 확인하지 못한 것

| 무엇 | 상태 | 어디가 지는가 |
|---|---|---|
| 설정 · 규칙 · 어노테이션 덮임 | 통과 — `pnpm verify` 안 | D5의 I1 ~ I4 |
| 산출물(ABI · dex · 매핑의 이름 보존 · 크기 · 접근성 클래스의 생존) | 통과 — 구현 커밋의 clean 빌드(A1 ~ A7) · 최종 검증의 clean 빌드(A1 ~ A8) | D5의 A1 ~ A8 |
| 최종 검증(`pnpm verify` · 산출물 · 회귀) | **통과(주석 있음)** — HEAD `28c307e4`, 제품 결함 0 | 「검증」의 「최종 검증」 |
| **release와 `bundled`의 dex가 같은가** | **`google-services.json`이 있는 빌드에서는 같다**(sha256 `b751b2f5…` — 리뷰 뒤의 재현). 파일 없이 빌드한 `bundled`만 다르다(`24ac3ed6…` — 리소스 ID 상수 4곳). 직전 판의 「같지 않다」는 틀린 일반화였다. 최종 검증이 견준 APK는 기존 산출물 검사의 NA6이 남긴 `bundled`로 읽는다(로그의 순서와 뒤 빌드의 재실행 태스크로 지지 — NA6 직후의 APK를 직접 해시한 실행은 없다) | 「검증」의 「release와 `bundled`의 dex — 리뷰 뒤의 재현」 |
| 리뷰 | r01 조건부 PASS(HEAD `6eb51a61`) → **재리뷰 r02 PASS**(HEAD `9965eee2` — P1 네 건 닫힘). 머지 전 사용자 항목 없음 · 출시 전 다섯 | 「검증」의 「리뷰와 P1의 처리」 |
| 변이의 구분력 | 임시 구현에서 26종 · **최종 구현에서 대표 4종.** 나머지 22종은 최종 구현으로 돌지 않았다 | 같은 곳 |
| 축소한 release의 기동 · 온보딩 · 로그인 화면 · 뒤로가기 · 구성 변경 | **에뮬레이터 둘에서 통과**(출시 바이너리, 디버그 키 재서명) | 「검증」 E1 ~ E4 · E8 |
| 로그인 뒤 경로(맵 · 듣기 · 설정 · 알림 · 상태바 · 손글씨 · 완료 안내 · 앱 리뷰 · 비주얼 노벨 · 최종 테스트 · 연속 학습 모달 · 로그아웃) | **API 37 에뮬레이터에서 통과 — 탐침 빌드**(출시 바이너리 아님). API 30은 맵까지 | 「검증」 E5 · E9 |
| K1의 필요 | 확인 — 빼면 기동 즉시 SIGABRT(두 번) | D2 |
| **K2의 필요** | **확인하지 못했다** — 빼도 죽지 않았다 | D2 |
| debug · 계측이 그대로인가 | 확인 — APK sha256 동일 | 「검증」 |
| **실기** | **확인하지 못했다** | 「미확인 · 후속」 1 |
| **업로드 키 서명 AAB · Play의 수락 · Play의 매핑 처리 · Play가 보여 주는 크기** | **확인하지 못했다** | 「미확인 · 후속」 3 |
| **32비트 · x86 · x86_64 라이브러리의 실행** | **확인하지 못했다 — 실행된 적이 없다** | 「미확인 · 후속」 4 |
| 축소가 접근성 클래스를 지우거나 난독화된 이름을 TalkBack으로 내보내는가 | 확인 — 지워진 것 0 · 새는 이름 0(코드 · 매핑). 생존은 산출물 검사 A8이 지킨다(`pnpm verify` 밖 — 「매핑에 없을 때」 실패하는 검사다) | 「검증」의 「accessibility 단계의 결과」 · 「최종 검증」 |
| 축소한 빌드에서 TalkBack의 접근성 활성화 | **축소한 `bundled`에서 확인 — 출시 바이너리에서는 아니다.** API 37 에뮬레이터 · 온보딩 1단계 `Next`의 터치 탐색 → 더블탭(손으로): accessibility 단계 한 번(포커스 링 6지점이 debug와 같다), 최종 검증에서 다시(2단계 전환 · 링 사각형 5곳이 기준값과 일치, 픽셀 수는 불일치 · debug 비교 없음), 절차 문서를 고친 뒤(`126325d4`) test-design의 절차 확인에서 다시(`bundled` · debug × zsh · bash 4회 모두 2단계 전환 · 링 사각형 6곳 일치 · 두 빌드 `diff` 0 — **판정이 아니라 절차 확인, 1회 표본**). 리뷰 뒤(HEAD `6eb51a61`) **test-runner가 고친 단계를 판정으로 1회 돌려 통과**(`bundled`(dex가 release와 같다) · debug — 2단계 전환 · 링 6곳 일치 · 두 빌드 `diff` 0 · 픽셀 수까지 같음, zsh만 · 1회 표본). **E7(Maestro)은 이것을 증명하지 않는다.** 활성화가 `TapDelegate`를 지났는지는 가르지 못했다 | 같은 곳 |
| **TalkBack이 읽는 문장 · 스와이프 포커스 순서 · 속성 단위 트리 비교 · 로그인 뒤 화면 · 출시 dex에서 완료 안내의 발화** | **확인하지 못했다** | 「미확인 · 후속」 9 |
| **콜드 스타트 시간에 주는 영향** | **재지 않았다** | 「미확인 · 후속」 7 |

## 미확인 · 후속

1. **실기.** 모든 실행이 arm64 에뮬레이터 둘이다. 실기 SoC · 제조사 ROM에서 축소한 빌드는 돈 적이 없다. 실기 확인은 사용자 몫이고 [출시 설정 절차](../e2e/android-release-config.md)의 R9가 진다.
2. **다른 API 수준.** API 37과 API 30 두 점뿐이다. API 26 ~ 29 · 31 ~ 36에서는 돌지 않았다.
3. **업로드 키로 서명한 AAB.** 디버그 키로 재서명한 분할만 설치했다. Play가 이 AAB를 받는지 · Play가 `proguard.map`으로 보고서를 푸는지 · Play가 보여 주는 다운로드 크기는 확인하지 않았다.
4. **32비트 · x86 · x86_64 라이브러리는 실행된 적이 없고, x86_64에는 `libserval_svg.so`가 없다.** ABI를 유지한 결정(D4) 아래에서 **그 기기들에는 지금도 검증되지 않은 라이브러리가 내려간다.**
   `armeabi-v7a` · `x86`은 상류 AAR 그대로이고 x86_64는 재빌드본이며, 어느 것도 이 저장소의 검증에서 로드된 적이 없다. 그 기기에서 앱이 뜨는지 · x86_64에서 `<svg>` 화면(연속 학습 모달 · 최종 테스트)이 어떻게 되는지는 [미확인]이다.
   이 작업이 만든 상태가 아니라 **고치지 않고 그대로 둔 기존 상태**다. ABI 필터의 재검토(「재검토 조건」)가 이 항목을 함께 본다.
5. **e2e에서 닿지 못한 것 — R9로 넘긴 목록**(`e2e-run.md`).
   - 알림 탭 → 목적지(E9i — 시도하지 못했다).
   - 음성 인식의 허용 경로(권한 허용 뒤 인식 서비스 · `getStatus`) — 호출 줄은 `requestPermissions`까지다.
   - TalkBack의 음성 출력 · 포커스 순서 · 로그인 뒤 화면의 TalkBack 동작(자세한 목록은 아래 9), 소리의 청음.
   - 실제 서버 응답 · FCM 서버가 보낸 푸시의 수신 · 실제 제공자 로그인의 완료(콜백 뒤 세션 교환) · 계정 삭제 — 번들은 모의 값이고 탐침의 HTTP는 기기 안 대역이 처리했다.
   - 최종 테스트 화면의 `<svg>` 식별(E9e).
   - R8의 최적화(인라인 · 클래스 병합)가 **돌려 본 경로 밖** 코드의 동작을 바꾸지 않았는지 — 돌린 경로에서 오류가 없다는 것까지다.
   - 축소한 `bundled` APK 그 자체로 Maestro `host` · `social` · `legal` · `small`을 돌리지는 않았다(release AAB 설치에서 돌았다. `bundled`로 돈 것은 TalkBack 흐름 · 스플래시 10회 · 접근성 더블탭이다).
   - 거꾸로 **출시 바이너리(release AAB)에서 TalkBack을 켜고 본 것은 없다** — TalkBack 쪽 관찰은 모두 `bundled`의 것이다. `google-services.json`이 있는 빌드의 `bundled`는 dex가 release와 같으므로(「검증」) 그 관찰은 release와 같은 dex의 것이나, 설치한 것은 AAB의 분할이 아니라 `bundled` APK다.
6. **축소한 빌드에 계측을 붙이는 길**(`testBuildType` · 테스트용 keep 규칙) · 어노테이션 없는 JNI 호출의 정적 탐지 · `xelement` R8 경고의 원인. 하지 않았다.
7. **콜드 스타트 시간에 주는 영향은 재지 않았다.** 계약 단계의 `am start -W` 한 번씩(1965 ms 대 1817 ms)과 e2e의 한 번(2051 ms) · green의 한 번(1865 ms)은 비교 근거가 아니다.
   **스플래시 길이의 실기 측정**([ADR-0051](0051-android-image-url-redirect.md)의 U1 — 출시 조건)은 **축소를 켠 빌드로 해야 한다** — R8이 기동 경로의 코드를 바꾸므로 축소 전 빌드에서 잰 분포는 출시 바이너리의 값이 아니다.
8. **e2e 절차 문서 · 도구의 결함 11건 — `1b99f08f`에서 정정됐다. 정정본 가운데 기기에서 다시 돈 것은 판정 함수(E1)와 `run-talkback.sh`뿐이다**(최종 검증). 번호별 결함과 고침은 [출시 설정 절차](../e2e/android-release-config.md)의 S.17이 정본이다. 이 ADR의 읽기에 닿는 것만 적는다.
   - **판정 함수**: `shrink_judge`가 시스템 프로세스의 크래시 줄을 프로세스 단위로 거르고 앱의 죽음은 `Cmdline` · `Process … has died`로 잡는다. 저장 로그 재판정은 건강한 release 0줄 · K1 변이 10줄이다(「검증」 — test-design, 기기 미사용). 절차 문서의 함수 그대로 저장 로그에서 「0줄」이 재현되고, **기기에서도 재현됐다** — 축소한 release의 E1이 API 37 · API 30에서 0줄이다(최종 검증). E1 밖의 케이스는 이 함수로 기기에서 다시 돌지 않았다.
   - **서명 비교의 판정 규칙**: `GoogleApiManager` 한 종류의 줄만 이름을 정규화한다 — 정규화 뒤 차이 0이면 통과(주석), 그 밖은 보류. API 30의 1줄은 이 규칙으로 통과(주석)이고 규칙을 받아들이지 않으면 보류다(「검증」).
   - **`run-talkback.sh`**: 터치 탐색 값을 최대 15초 폴링한다. 최종 검증에서 **1회째에 통과했다 — 1회 표본이다.**
   - **고치지 않고 남은 것**: 음성 인식 Maestro 흐름(`e2e/android-speech-recognition.yaml`)의 고정 좌표 — 흐름은 그대로이고 손으로 진입하는 절차와 한계를 문서에 적었다(11건 가운데 이 한 건은 「절차에 적음」이지 「고침」이 아니다).
   - 그 밖(호출 줄의 2배 계수 · 사본의 `assets/static` 복사 · 소셜 흐름의 로그 합치기 · 구성 변경의 생명주기 이벤트 판정 · API 30의 탭 방어 · 되돌림 목록)도 **문서 · 함수의 정정이고 실행으로 확인한 것이 아니다** — 최종 검증은 E2 ~ E5 · E9를 다시 돌리지 않았다(아래 10). 정정한 절차의 첫 기기 실행이 그 확인이다.
   - **최종 검증이 새로 찾은 절차 문서의 결함 — `126325d4`에서 정정됐다**: S.10 접근성 활성화 단계의 셋(zsh에서 죽는 루프 · 온보딩 대기 없음 · 제스처 모드 전제와 저장소 밖 픽셀 임계). 고친 단계는 test-design의 절차 확인에서 문서 그대로 돌았다(「최종 검증」의 「S.10의 정정과 절차 확인」).
   - **정리 절차에 남아 있던 것 — 같은 커밋이 절차 문서에 반영했다(실행으로 확인한 것은 아니다)**: S.15에 잔여 키를 지우는 블록이 생겼고(**구문만 봤다**) S.2의 `OUT`이 저장소 밖 절대 경로가 됐다. 반영 전의 관찰은 이렇다 — `wm size/density reset`이 빈 `display_size_forced=` · `display_density_forced=`를 남기고 계측이 `system_locales=en-US`를 남겨, 되돌린 뒤의 전역 설정 diff가 0이 아니었다(실행자가 `settings delete`로 직접 지웠다). S.2 블록의 `export OUT=.agent-harness/…`가 상대 경로라 워크트리에서 그대로 돌리면 워크트리 안에 그 폴더가 생긴다.
9. **accessibility 단계 — 차단 지적 없이 끝났다. 남은 것은 아래다**(결과는 「검증」의 「accessibility 단계의 결과」).
   - **권고 R1 · R2는 `28c307e4`에서 반영됐다**(「검증」의 「최종 검증」). **R2는 닫혔다** — 접근성 클래스의 생존은 여전히 명시 규칙이 아니라 R8의 도달 가능성 분석과 `lynx` AAR의 consumer 규칙에 달려 있지만, Lynx 판올림이나 규칙 변경으로 매핑에서 사라지면 산출물 검사 A8이 알린다(`pnpm verify` 밖이고, 「R8이 실제로 지웠을 때」가 아니라 「매핑에 없을 때」 실패함을 확인한 검사다).
     **R1도 닫혔다 — test-runner의 판정으로.** 절차 문서 S.10의 접근성 활성화 단계가 `126325d4`에서 고쳐졌고, 리뷰 뒤 test-runner가 HEAD `6eb51a61`에서 **문서에서 추출한 블록 그대로 1회 돌려 통과**했다(「검증」의 「리뷰와 P1의 처리」 — 축소한 `bundled`(release와 같은 dex) · debug). 직전 판의 「닫혔다 — 절차로서 · test-runner가 판정으로 돌린 적은 없다」는 이 결과로 바뀐다.
     **남은 것**: 판정은 **1회 표본 · zsh만**이다(bash는 test-design의 절차 확인에서만 돌았다) · 전제(API 37 · 1080x2400 · 420dpi · 제스처 모드)가 좁다 · 3버튼 → 제스처 전환 단계와 API 30은 실행되지 않았다. 자동 검사는 없다(손 절차다).
   - **접근성 활성화의 관찰은 전부 축소한 `bundled`의 것이다.** 리뷰 뒤의 판정 실행에 쓴 `bundled`는 dex가 release와 같다고 확인됐다(`b751b2f5…`). 그 앞의 관찰(accessibility 단계 · 최종 검증 · test-design의 절차 확인)이 쓴 `bundled`는 APK가 남아 있지 않아 gradle 로그 수준이다. **출시 바이너리(release AAB의 분할 설치)에서 TalkBack을 켜고 본 것은 여전히 없다.**
   - **포커스 링의 두 빌드 비교는 다시 섰다 — 절차 확인으로, 그리고 리뷰 뒤 test-runner의 판정으로**(사각형 6곳 일치 · 두 빌드 `diff` 0 · 픽셀 수까지 같음). accessibility 단계는 「6지점의 사각형과 픽셀 수가 두 빌드에서 같다」고 적었고, 최종 검증은 사각형 5곳의 일치만 확인했다(픽셀 수는 기준값과 달랐고 debug 비교는 못 했다). 절차 문서를 고친 뒤 test-design이 문서의 도구로 두 빌드를 돌려 **사각형 6곳 일치 · 결과 `diff` 0**을 얻었다.
     **기록 사이에 픽셀 수가 달랐던 것은 측정 도구가 달랐기 때문으로 보인다** [추론] — 문서의 도구가 accessibility 단계의 옛 스크린샷에서 같은 수를 냈으나, 최종 검증의 도구와 같은 이미지로 맞대 보지는 않았다. 그래서 픽셀 수는 판정 기준에서 빠졌고(관찰값), 같은 도구 안에서 두 빌드끼리만 견준다.
   - **확인하지 못한 것 — 실기 확인([출시 설정 절차](../e2e/android-release-config.md)의 R9)으로 넘긴다.**
     - 축소한 빌드에서 TalkBack이 **실제로 읽는 문장**(이름 · 역할 · 상태) — 에뮬레이터는 무음이고 어떤 절차도 발화를 보지 않았다.
     - 스와이프(다음 · 이전 항목)의 포커스 순서 — 터치 탐색 6지점만 봤다.
     - 접근성 트리의 속성 단위 비교 — 도구(`uiautomator dump` · `maestro hierarchy`)가 TalkBack을 억제하고, 계측 `ButtonAccessibilityTest`는 축소한 앱에 붙지 못한다.
     - 활성화가 `TapDelegate`를 지나는지 Lynx 노드 제공자를 지나는지 · 온보딩 2 · 3단계와 로그인 화면의 더블탭 활성화(1단계 `Next` 한 번만 했다) · Switch Access · 외부 키보드.
     - 로그인 뒤 화면(맵 · 학습 · 설정)의 TalkBack 동작.
     - 완료 안내가 **출시 dex에서 실제로 발화되는지** — E9b는 탐침 빌드의 호출 줄이고, 출시 매핑에서는 이름 유지만 봤다.
   - **기존 관찰 X1 — TalkBack이 바인딩될 때마다 TalkBack의 알림 권한 요청 창이 앱 위에 뜬다**(이 에뮬레이터 — `uiautomator dump` · `maestro hierarchy`가 TalkBack을 풀었다 다시 붙일 때마다 다시 뜬다). `run-talkback.sh`가 이것을 다루지 않는다. 축소와 무관한 도구의 문제다(소유자 test-design). 같은 지적의 다른 절반(터치 탐색 값의 경합)은 위 8의 폴링이 다룬다.
     최종 검증의 러너 실행에서도 **두 번 떴다**(기동 직후 · 흐름이 끝난 뒤) — 그 한 번의 흐름은 막지 않았으나 끝난 뒤 창이 앞에 남았다. 막지 않는다는 보장이 아니다.
   - **기존 관찰 X2 — 온보딩 `Next`의 TalkBack 포커스가 버튼 전체가 아니라 안쪽 글자 크기(약 32x11dp)에 잡힌다.** **두 빌드(축소한 `bundled` · debug)에서 같다 — 이 작업이 만든 것이 아니고 범위 밖이다**(소유자 implementation, 공유 UI). 버튼 바깥 여백을 짚었을 때 버튼 전체가 포커스되는지 · 「버튼」 역할이 읽히는지는 보지 못했다 — 실기 TalkBack으로 먼저 확인한다(R9).
10. **이 변경의 리뷰와 최종 검증.** **최종 검증은 통과했다(주석 있음 — HEAD `28c307e4`, 제품 결함 0). 리뷰는 조건부 PASS(HEAD `6eb51a61`)를 거쳐 재리뷰 r02에서 PASS다(HEAD `9965eee2`)**(「검증」의 「리뷰와 P1의 처리」).
    **최종 검증이 돌리지 않은 것 — 통과로 세지 않는다**(`verify.md`의 미실행 목록).
    - e2e의 E2 Maestro `host` · `social` · `legal` · `small` · E3 · E4 · E5 · E9 탐침 · E6의 변경 전 사본과의 해시 비교 · K1 변이의 기기 판정 — `e2e-run.md`의 결과가 본 범위이고 다시 돌리지 않았다. E1의 축소 전 빌드와의 로그 서명 비교도 생략했다.
    - API 30의 E3 · E4 · E5 (a).
    - 계측 `ButtonAccessibilityTest`, 그리고 `SignedInScreenFixtureTest` · `SessionResumeTest` · `StorageRestartTest`의 스크립트.
    - 실기 · 업로드 키 서명 AAB · Play의 매핑 처리 · 32비트 / x86 / x86_64 라이브러리의 실행 · TalkBack의 발화(위 1 · 3 · 4 · 9).
    - 변이 26종 가운데 22종의 최종 구현 재실행(「검증」).
11. **`bundled` 빌드 시간의 증가.** 재지 않았다 — 최종 검증도 변경 전 빌드를 만들지 않았다.
    함께 적혀 있던 「축소한 `bundled`와 release의 dex가 같은지」는 **닫혔다 — `google-services.json`이 있는 빌드에서는 같다**(리뷰 뒤의 재현 — 「검증」). 직전 판은 여기에 「닫혔다 — 같지 않다」고 적었고 그것은 파일 없이 빌드한 `bundled`의 관찰을 일반화한 것이었다.
    남은 것 둘: 최종 검증이 견준 그 APK의 출처는 NA6이 남긴 `bundled`로 읽는다 — 로그의 순서와 뒤 빌드의 재실행 태스크가 받치고, NA6 직후의 APK를 직접 해시한 실행은 없다(아래 14) · **파일 없는 `bundled`** 에서 리소스 ID 상수 4곳의 차이가 동작에 영향이 없다는 것도 [추론]이다(`resources.arsc` 대조와 그 네 문자열 경로의 나란한 실행이 없다) — 그 빌드는 검증에 쓰지 않는다.
12. **red 단계의 변경 전 다운로드 값이 계약과 두 스펙에서 56,631바이트 다른 까닭**(「실측」). 확인하지 않았다 — 최종 검증도 변경 전 빌드를 만들지 않아 닫지 못했다.
    **원인 후보** [리뷰의 지적 — 확인된 원인이 아니다]: `release-shrink.artifacts.mjs`의 A7이 네 기기 스펙을 모두 `sdkVersion: 37`로 만든다(계약의 32비트 스펙은 API 26이다). 소유자는 test-design이다.
13. **리뷰 P2 가운데 이 문서의 몫이 아닌 것 — 소유자에게 넘긴다**(하네스 작업 폴더의 `review.md`. 이 문서는 지적을 옮겨 적을 뿐 닫지 않았다).
    - **`mapping-survival.mjs`의 소유권 · 파서 중복**(specification): test-design이 만든 판정 모듈이고 파서가 `mappingIssues`와 겹친다. 소유권이 계약에 없다(D5).
    - **I3의 「덮임」 판정이 느슨하다**(test-design): `allowobfuscation`이 붙은 것을 포함해 어떤 `-keep`류 규칙이든 어노테이션의 정규 이름이 나오면 덮인 것으로 본다. **I1은 계약이 금지한 `bundle {}` · `packaging`을 보지 않는다**(D4).
    - **`logs/e2e-e2-social.errors`가 198바이트인데 기록은 「0줄」이다**(증거 기록). 그 파일에 든 것은 `AppleSignInModulefailed` 한 줄이다 — 「검증」이 적은 대로 실행자의 함수가 제외한 줄이고, 파일은 제외 전의 줄을 담고 있다.
    - 그 밖(일부 단계의 `changed-files`가 뭉쳐 있음 · `verification.result`가 워크플로 어휘 밖 · `completeness-check`를 root가 쓰고 판정)은 하네스 기록의 문제이고 이 문서가 다루지 않는다.
14. **NA6이 끝에 `:app:assembleBundled`를 `google-services.json`과 함께 다시 빌드하지 않는다 — 테스트 쪽 개선 후보**(test-design). `native-alignment.artifacts.mjs`를 돌린 뒤의 `bundled` APK는 코드상 파일 없는 빌드로 남는다(「검증」의 「release와 `bundled`의 dex — 리뷰 뒤의 재현」).
    지금은 절차 문서 S.3의 사전 검사와 검사 순서가 막고 있고, 테스트 자체는 고쳐지지 않았다. 최종 검증의 `24ac3ed6…`이 이 경로로 나왔다는 것은 로그의 순서와 뒤 빌드의 재실행 태스크가 받친다 — NA6 직후의 APK를 직접 해시한 실행은 없다.

## 재검토 조건

- **프로덕션 출시 전에 결정한다: 비공개 테스트는 4개 그대로, 프로덕션에 올리기 전에 Play Console의 기기 카탈로그에서 ABI별 수치를 보고 유지/축소를 정한다** → D4 · U1 · U5(2026-10-08 사용자 결정). [출시 설정 절차](../e2e/android-release-config.md)의 「minify」 절(「재검토는 프로덕션 출시 전에 결정한다」)과 R9의 확인 목록 **k**가 같은 결정을 적는다.
  **글자까지 같은 문장은 아니다** [정적 — `42e2f00f`와 대조]: 절차 문서는 「비공개 테스트는 4개 그대로 **가고** … 유지 **·** 축소를 정한다」로 적는다 — 뜻(시한 · 비공개 테스트의 처리 · 볼 자료 · 정할 것)은 같다. 절차 문서에만 있는 것이 하나 있다: **「유지 · 축소를 가르는 수치 기준은 정해 두지 않았다(그때 사용자가 정한다)」** — 이 문서도 기준을 정하지 않았다.
  - **한계**: 기기 카탈로그가 보여 주는 것은 기기 모델 / 지원 기기 수이지 **사용자 비율이 아니다** · 비공개 테스트의 설치 비율은 **표본이 없다** · 카탈로그의 메뉴 경로는 이 작업에서 **조회한 적이 없다** [문서 기억].
  - **근거 — 시한이 「출시 전」인 까닭**: D4 — 배포한 뒤 ABI를 빼면 그 기기의 기존 사용자가 새 버전을 받지 못한다 [SDK/문서]. 좁히는 결정은 프로덕션에 올리기 전에만 그 대가 없이 할 수 있다.
  - 그때의 재료는 「실측」의 ABI 선택지 표와 그 아래 「함께 바뀌는 것」이고, 「미확인 · 후속」 4를 함께 본다. 수치는 이 앱의 조건(`minSdk` 26 · 대상 국가)으로 읽는다.
- **32비트 · x86 · x86_64 기기에서 「앱이 뜨지 않는다 · 그림이 빈다」는 보고가 나오면** → D4. 그 ABI의 라이브러리는 돌려 본 적이 없다.
- **Lynx · Fresco 버전을 올리면** → D2. I3이 실패하면 기대값을 고쳐 통과시키기 전에 새 어노테이션을 읽는다. I3이 통과해도 consumer 규칙이 없는 AAR과 어노테이션 없는 JNI는 보지 못하므로 **축소한 release를 기기에서 다시 돌린다**(절차의 E1부터).
  ADR-0046의 재검토 조건(`vendor-maven` 재빌드)과 같은 사건에 걸린다.
- **AGP를 올리면** → D1. R8의 기본 모드와 기본 규칙 파일이 바뀔 수 있다. A3 · A4와 기기 스모크를 다시 본다.
- **K2가 지키는 메서드를 네이티브가 실제로 부르는 것이 확인되거나, 반대로 `lynx-trace`가 그 어노테이션을 걷으면** → D2. K2의 근거 수준을 고친다.
- **축소한 빌드에서 `NoSuchMethodError` · `ClassNotFoundException` · `NoClassDefFoundError` · `JNI DETECTED ERROR`가 logcat이나 Play의 비정상 종료 보고서에 나오면** → D2. 규칙을 넓히기 전에 무엇이 이름으로 찾는지부터 읽는다.
  **`JNI DETECTED ERROR`는 CheckJNI의 출력이다** — 실기의 비디버그 빌드에서는 같은 누락이 다른 모양으로 나타날 수 있다 [추론 — 리뷰의 지적. 이 작업의 관찰은 에뮬레이터 둘뿐이다]. 이 문자열이 없다는 것을 「누락이 없다」로 읽지 않는다.
- **Play가 업로드를 거절하면**(매핑 · 크기 · ABI) → 거절 사유에 해당하는 결정.
- **`xelement`의 refresh 요소를 앱이 쓰게 되면** → 「대가」 3. 경고의 영향을 먼저 확인한다.
- **`bundled`를 축소 전 그대로 두어야 할 일이 생기면**(예: 내장 번들 + 픽스처가 꼭 필요한 절차) → D3. `bundled { minifyEnabled false }` 한 줄과 I1 · A5의 기대, 그리고 「`bundled`는 release와 같은 설정」이라는 절차 문서들의 전제가 함께 바뀐다.
- **`google-services.json`이 있는 빌드에서 `bundled`와 release의 dex가 달라지면**(변형별 소스 · `BuildConfig` 분기 · 변형별 의존성이 생기면) → D3. `bundled`가 release 코드의 대리가 되는 범위를 다시 잰다 — 지금의 범위는 「dex 바이트까지, 그 파일이 있을 때」이고 근거는 리뷰 뒤의 재현이다(「검증」의 「release와 `bundled`의 dex — 리뷰 뒤의 재현」).
