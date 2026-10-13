# 크래시 리포팅(Sentry) — Android 수동 e2e

## 목적과 범위

앱이 죽거나 JS 예외가 났을 때 Android 호스트가 Sentry로 보고하는 길을, 자체 호스트 앱에서 확인한다.
자동 E2E: not applicable(runner/command 없음). 런타임이 오류를 호스트에 넘기는 구간 · R8 뒤 동작 · Sentry 수신은 대역으로 대신할 수 없어 수동 절차로 고정한다.

정본: `.agent-harness/work/crash-reporting-sentry/spec.md`(§0 실측 · §2.1 어떤 JS 오류가 어느 길로 닿는가 · §3 호스트 계약 · §5 빌드 · §7 측정 · §9 사용자 결정) ·
`test-plan.md` §5. **이 문서에 없는 단계를 현장에서 만들지 않는다.** 계약이 「미확인」으로 둔 것은 이 문서도 미확인으로 두고, 관찰 칸을 비워 둔다.
결정은 [ADR-0058](../adr/0058-crash-reporting-sentry.md)이 진다. 실행 원문(단계별 명령 · logcat · 스크린샷 · envelope 사본)은 하네스 작업 폴더의 `logs/e2e-a.md` · `logs/e2e-a-*` · `logs/e2e-b.md` · `logs/e2e-b-envelopes/`에 있다(저장소 밖 — envelope 사본은 DSN · public key를 지운 것이다).

| 단계 | 상태 | 무엇 |
|---|---|---|
| **A** | **2026-10-13 실행 — 1회차**(API 30 에뮬레이터 한 대 · 에이전트 실행, 사람 미확인). 아래 「실행 기록」 | DSN 없이 — 빌드 · 초기화 안 됨 · 탐침 P1 ~ P4 · 되돌리기 |
| **B** | **2026-10-13 실행 — 1회차, 기기 쪽만**(API 30 에뮬레이터 한 대 · `bundled` · 에이전트 실행, 사람 미확인). envelope 원문 확인과 전송 시도까지. **Sentry 수신 · 대시보드 쪽은 미확인(사용자 몫)** · B7과 매핑 업로드는 미실행 | Sentry로 나가는 것 — 세션 · JS 예외 이벤트 · 지우기 · Java 크래시와 매핑 · tombstone · 식별자 없음 · 측정 쿼리 |

## 전제

공통 전제([README](README.md))를 따르되, 이 흐름은 **로그인이 필요 없는 구간이 대부분**이다. 탐침이 닿는 화면(여정 맵 · 설정 탭)을 보려면 로그인된 상태에서 시작한다.

1. **에뮬레이터 하나**(전용). ⟨2026-10-13 정정⟩ B5(tombstone)는 **API 31 이상**에서 본다 — API 30에서는 tombstone 이벤트가 오지 않았다(1회차 실측. 「API 30 이상」이라는 앞선 문면이 틀렸다). envelope을 기기에서 꺼내려면 `adb root`가 되는 이미지여야 한다. `adb`는 아래 함수로 부른다:
   ```sh
   export E2E_UDID=emulator-5554          # adb devices 로 확인한 전용 에뮬레이터 ID
   export ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
   A() { "$ADB" -s "$E2E_UDID" "$@"; }   # 함수다 — `A shell …`로 부른다
   export PKG=libitum.duru.android
   export ACT=libitum.duru.android/com.libitum.host.MainActivity
   ```
2. JDK 17 이상, Android SDK, `ANDROID_HOME`, Node 22(`export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`), `pnpm` 의존 설치 완료.
3. A1은 **`apps/android/sentry.properties`도 `SENTRY_*` 환경 변수도 없는 상태**에서 돈다. 시작 전에 확인한다:
   ```sh
   test ! -e apps/android/sentry.properties && echo "no sentry.properties"
   env | grep -c '^SENTRY_'            # 0
   ```
   `apps/android/app/google-services.json`이 있으면 `:app:bundleRelease`도 돈다(없으면 그 작업만 뺀다 — [Android 출시 설정](android-release-config.md) 전제 3).
4. **빌드한 SHA를 실행 기록에 적는다**(`git rev-parse HEAD`).

## 탐침은 임시 코드이며 커밋하지 않는다

A3 ~ A6의 탐침(`throw` 한 줄 · `Promise.reject` 등)은 **측정을 위한 임시 변경이다. 어느 것도 커밋하지 않는다.** 한 번에 탐침 하나만 넣고, 관찰을 적은 뒤 되돌리고 다음으로 간다.
모든 탐침을 끝내면 A7에서 `git status`로 되돌림을 확인한다. 탐침 줄이 한 줄이라도 남은 채 A7을 통과로 쓰지 않는다.

## A — DSN 없이 (이번 작업에서 실행)

### 판정 규칙

- **A1 · A2 · A3 · A4 · A7**은 통과/실패로 판정한다.
- **A5 · A6은 통과/실패가 아니다 — 있는 그대로 기록하는 측정이다.** 로그 줄이 나오든 안 나오든 실패로 세지 않는다. 안 나오는 경로는 spec §2.1 표와 ADR-0058 「잡지 못하는 것」에 **정정으로 적는다**(그 정정이 이 측정의 산출이다).
- **A3이 실패하면(경계가 잡은 오류가 호스트에 닿지 않음) 계약 C2가 무너진다 — 멈춘다.** 이어서 A4 이후를 돌리지 않고, 계약 §9 U1의 **(나)로 정정한다**: 요구사항대로 호스트 모듈 `CrashReportModule.report(source, name, message, stack)`을 연다(경계가 잡은 오류가 F5의 미확인 구간에 기대지 않게 된다. 대가로 ADR-0017 D1 조건 1 · 2의 예외를 ADR에 적어야 하고, 지우기 구현이 JS · Java 둘이 되며, JS 번들이 더 는다). 정정은 `specification`으로 되돌려 spec §11에 기록한다 — 현장에서 구현을 바꾸지 않는다.
- A3은 unit · ui가 green인 뒤 **e2e 계층의 첫 일**로 돈다.

### A1 — DSN 없는 빌드가 성공한다

**대응 AC: 5 · 6**

```sh
cd apps/android
ANDROID_HOME=~/Library/Android/sdk ./gradlew clean :app:testDebugUnitTest :app:assembleDebug :app:assembleBundled
# google-services.json 이 있으면 덧붙인다:
ANDROID_HOME=~/Library/Android/sdk ./gradlew :app:bundleRelease
cd ../..
```

관찰(통과 조건):
- 전부 성공한다. `verify*NativeAlignment`가 통과한다(`Native 16 KB page alignment check failed` 없음).
- **업로드 작업은 이름으로 따로 불러 SKIPPED를 확인한다.** `uploadSentryMappingRelease` · `uploadSentryMappingBundled`는 **assemble 작업 그래프에 들어 있지 않다** — 위 `assemble*` 명령의 출력에는
  이 작업이 한 줄도 나오지 않는다(1회차 실측: A1 Gradle 로그에 `uploadSentry` 0줄). `uploadSentryMappingRelease`는 `bundleRelease`의 `finalizedBy`로만 매달려 있고, `uploadSentryMappingBundled`는
  어디에도 매달려 있지 않다. 그래서 각각 부른다:
  ```sh
  ( cd apps/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew :app:uploadSentryMappingBundled )
  ( cd apps/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew :app:uploadSentryMappingRelease )
  # 기대(둘 다): > Task :app:uploadSentryMapping… SKIPPED
  #              Sentry mapping upload skipped: token, org or project is not set.
  ```
  `bundleRelease`를 돌렸다면 그 출력 끝에서도 `uploadSentryMappingRelease SKIPPED`가 보여야 한다(1회차는 `google-services.json`이 없어 `bundleRelease`를 돌리지 않았다 — 이 줄은 본 적이 없다).
- R8 경고 목록(`missing_rules.txt` 등)을 [ADR-0052](../adr/0052-android-release-shrinking.md) 기준과 **대조해 실행 기록에 적는다**(어떤 `-dontwarn`이 필요한지 — 계약은 추가 0을 기본으로 둔다).
- 빌드한 APK의 `lib/arm64-v8a/`에 `libsentry*.so`가 **0개**다:
  ```sh
  unzip -Z1 apps/android/app/build/outputs/apk/bundled/app-bundled.apk | grep -c '^lib/arm64-v8a/libsentry' # 0
  ```
  (APK 경로는 빌드 산출물 폴더에서 맞춘다.)

실패: 어느 작업이든 실패 · 정렬 검사 실패 · `libsentry*.so` 1개 이상 · 이름으로 부른 업로드 작업이 SKIPPED가 아니라 실행됨.

### A2 — bundled 빌드는 Sentry를 초기화하지 않는다

**대응 AC: 5**

```sh
A uninstall $PKG
A install -r apps/android/app/build/outputs/apk/bundled/app-bundled.apk   # 경로는 산출물에서 맞춘다
A logcat -c
A shell am start -n $ACT
sleep 8
A logcat -d | grep -E "Sentry|DuruCrash" | wc -l      # 0
find apps/android/app/build/intermediates/merged_manifests/bundled -name AndroidManifest.xml \
  | xargs grep -c -E "SentryInitProvider|SentryPerformanceProvider"      # 파일마다 0
```

관찰(통과 조건):
- 앱이 평소처럼 뜬다(온보딩 또는 첫 화면 — [Android 호스트 e2e](android-host.md) 기준).
- `Sentry` · `DuruCrash` 태그 로그가 **0줄**이다(초기화 안 됨). ⚠ `DuruCrash` 로그는 `BuildConfig.DEBUG`일 때만 찍힌다(release형 빌드에는 로그가 없다 — spec §3.7). 그래서 bundled의 0줄은 `Sentry` 태그와 아래 매니페스트 확인이 함께 있어야 의미가 있다.
- 병합 매니페스트(`app/build/intermediates/merged_manifests/bundled/…`)에 `SentryInitProvider` · `SentryPerformanceProvider`가 **없다**.

### A3 — 탐침 P1(경계가 잡은 렌더 예외)

**대응 AC: 1 · 2**

전제: **debug 빌드 + dev 서버**(탐침을 번들에 넣으려면 dev 서버가 필요하다). debug 호스트는 기본으로 `http://10.0.2.2:3000/main.lynx.bundle`(에뮬레이터에서 본 호스트 기계의 3000번)을 읽는다 —
다른 작업 트리의 서버가 그 포트에 떠 있지 않은지 확인한다. 떠 있으면 그 서버를 건드리지 말고, 이 작업 트리의 `rspeedy dev`가 고른 포트를 인텐트 extra로 준다
(`A shell am start -n $ACT --es bundle-url http://10.0.2.2:<포트>/main.lynx.bundle` — [`apps/android/README.md`](../../apps/android/README.md) 「개발 서버와 HMR」. `rspeedy dev`에 포트 옵션은 없고 3000이 차 있으면 다음 번호를 고른다).

⚠ **dev 서버가 떠 있는 채로 탐침을 저장하면 HMR이 이미 떠 있는 앱에 탐침을 밀어 넣어 `DuruCrash` 줄이 하나 더 난다**(스택 첫 프레임이 `hot-update.js`). 줄을 셀 때는
`A logcat -c` 뒤 **다시 실행한 프로세스의 PID**로 거른다(1회차에 실제로 났다).

1. 임시로(커밋하지 않음) 여정 맵 화면의 렌더에 `throw new Error("probe-render")`를 넣는다.
2. dev 서버를 띄우고 debug 호스트를 설치 · 실행해 여정 맵까지 간다.
3. `A logcat -d -s DuruCrash`를 연다(`A logcat -c`로 비우고 시작).

관찰(통과 조건):
- 에러 화면이 선다(`error-boundary-title` — 기존 문구 그대로).
- `DuruCrash` 태그에 **`DISABLED 2xx …probe-render…` 1줄**이 나온다(`DISABLED` = DSN 없어 sink가 없음, `2xx` = JS 백그라운드 코드 범위 200 ~ 299, 원문 앞 500자).
- **그 줄의 원문 모양을 아래 「도착한 문자열」 칸에 그대로 옮긴다** — spec §0 F5의 미확인(호스트에 도착하는 문자열의 실제 모양)을 닫는 단계다. 평문인지 JSON(`rawError`)인지, 스택 줄이 어떤 모양인지는 **이 관찰로만 확정된다.** 계약은 두 갈래 모두 안전하게 끝나도록 썼고, 실측이 셋째 모양이면 spec §11에 정정한다.
- LogBox(빨간 오류 오버레이)가 뜨는지 **기록한다**(통과/실패 아님 — spec AC3의 [미확인]).

실패: `DuruCrash` 줄이 0건이거나 2건 이상(중복 보고) · 에러 화면이 서지 않음. **0건이면 위 「A3이 실패하면」을 따른다.**

### A4 — 탐침 P2(이벤트 핸들러)

**대응 AC: 2**

전제: A3의 탐침을 되돌렸다. 설정 탭의 토글 핸들러에 임시 `throw new TypeError("probe-handler")`를 넣고 dev 서버로 번들을 다시 띄운다.

단계: 설정 탭에서 그 토글을 탭한다.

관찰(통과 조건):
- `DuruCrash`에 **`DISABLED 2xx …TypeError…probe-handler`** 1줄이 나온다.
- 앱은 계속 돈다(에러 화면으로 바뀌지 않고, 프로세스가 살아 있다 — `A shell pidof $PKG`).

### A5 — 탐침 P3(비동기) — 측정, 통과/실패 아님

**대응 AC: 2**

임시로 두 탐침을 **하나씩** 넣는다:
- `Promise.reject(new Error("probe-reject"))`
- `setTimeout(() => { throw new Error("probe-timer") }, 0)`

기록할 것(있는 그대로):
- 각각 `DuruCrash` 줄이 **나오는지 안 나오는지**.
- 나오면 `unhandled rejection` 이름이 붙었는지(`rejection` 접두 — spec F4의 [미확인]을 닫는다).
- 줄 원문 모양.
- 안 나오는 경로는 **실패가 아니다.** spec §2.1 표와 ADR-0058 「잡지 못하는 것」에 정정으로 적는다.

### A6 — 탐침 P4(메인 스레드) — 측정, 통과/실패 아님

**대응 AC: 2**

`'main thread'` 함수 안에 임시 throw를 넣는다.

기록할 것(A5와 같은 규칙): `DISABLED 11xx …` 줄이 나오는지, 원문 모양. 안 나오면 정정으로 적는다.

**1회차의 A6 실측으로 파싱 규칙 둘을 고쳤다**(커밋 `1c626045`, spec §11). 메인 스레드 오류는 `rawError.message`가 `main-thread.js exception: Error: probe-main-thread `(접두 + 끝 공백)로,
`rawError.stack`의 첫 줄이 `backtrace:`로 왔다. 고치기 전의 규칙으로는 이름이 늘 `Error`로 떨어지고 지문의 넷째 값이 모든 메인 스레드 오류에서 `backtrace:`가 돼 한 이슈로 묶였다.
(가) 그 접두를 떼고 trim한 뒤 이름을 나누고, (나) 스택의 첫 비공백 줄이 `backtrace:`면 버린다. **수정 뒤 기기 재실행은 하지 않았다** — 파싱이 순수 함수라, 아래 「도착한 문자열」의
실측 문자열을 고정값으로 넣은 JUnit(`CrashReportPayloadObservedTest` — 고치기 전 5건 중 3건 실패 → 수정 뒤 호스트 JUnit 126/126, 리뷰 정정 뒤 145/145)으로 판정했다. 다음 회차가 A6을 다시 돌려도 `DuruCrash` 줄의
모양은 같다(그 로그는 깔때기에 들어가기 전의 원문이다) — 고친 결과가 보이는 곳은 B단계의 Sentry 이슈다.

### A7 — 탐침을 전부 되돌리고 `git status`가 깨끗하다

**대응 AC: —**

```sh
git status --short
git diff --stat
```

관찰(통과 조건): 임시 변경 **0**(탐침을 넣었던 파일이 목록에 없다). `docs/e2e/crash-reporting.md`의 실행 기록 갱신만 남아 있어도 된다 — 그 밖의 변경이 있으면 되돌린다.

### 도착한 문자열 (1회차 관찰 — 2026-10-13)

spec §0 F5 · §3.3 3번의 [미확인]을 닫은 기록이다. 호스트 로그는 본문 **앞 500자만** 찍으므로 줄이 거기서 끊긴다 — 끊긴 그대로 옮긴다.
기기 `emulator-5580`(AVD `R6_API30`), debug APK, HEAD `3dcf0292`. 탐침은 전부 온보딩 화면에 넣었다(아래 「실행 기록」 메모).

| 항목 | 값 |
|---|---|
| 평문 / JSON(`rawError`) / 그 밖 | **JSON 객체 한 덩이**(다섯 탐침 모두). 평문 갈래는 한 번도 쓰이지 않았다 |
| 최상위 키 | `rawError{stack, message, cause}` · `pid` · `url` · `dynamicComponentPath` · `sentry{…}`. 마지막 것은 Lynx 코어 JS가 만들어 붙이는 덩이다 — 이 저장소의 Sentry와 무관하고 호스트는 읽지 않는다. 그 안의 `exception.values[].value` · `tags.extra`에 **지우기 전 원문 메시지**가 한 번 더 실려 있다(debug 로그의 500자에 찍힌다) |
| `rawError.message` | `"<이름>: <메시지>"` 한 줄. 거부된 promise는 `unhandled rejection: <메시지>`(원래 오류의 이름은 남지 않는다). 메인 스레드는 `main-thread.js exception: <이름>: <메시지> `(접두 + 끝 공백) |
| `rawError.stack` | 머리 줄(`Error: …`)이 **없고** `    at …` 프레임 줄만, 끝이 `\n`. 메인 스레드는 첫 줄이 `backtrace:` |
| 스택 프레임의 파일 이름 모양 | dev 번들 `/.rspeedy/main/background.js:<줄>:<열>` · 운영 모드 번들 `/.rspeedy/main/background.<해시>.js:<줄>:<열>`(함수 이름이 `f$` · `eL`처럼 줄여져 있다) · 코어 `/lynx_core.js:<줄>:<열>` · 메인 스레드 `main-thread.js:<줄>:<열>` · `file:///worklet-runtime/main-thread.js:<줄>:<열>` |
| 호스트가 받는 코드(`getErrorCode()`) | background **201** · 메인 스레드 **1101**. Lynx 내부 로그의 `20100` · `110100`은 하위 코드다 |
| `pid` | `USER_ERROR`. **타이머 throw만 `INTERNAL_ERROR`**(깔때기는 `pid`를 읽지 않는다 — 동작 차이 없음) |
| 탐침 1회당 `DuruCrash` 줄 수 | **정확히 1줄**(다섯 탐침 모두 — 중복 보고 없음). 같은 오류가 `lynx` 태그로는 3 ~ 4번 더 찍힌다 |
| LogBox가 떴는가 | **안 떴다** — dev 번들 + debug 호스트, 다섯 탐침 모두 |
| 500자 너머를 본 방법 | 같은 시각 Lynx 자신의 로그 줄(`lynx` 태그 `js_error_reporter.cc … message is {…}`)에서 P2의 JSON을 끝까지 읽었다 |

**A3 / P1 — 경계가 잡은 렌더 예외, dev 번들**

```
10-13 13:33:16.117  5213  5213 D DuruCrash: DISABLED 201 {"rawError":{"stack":"    at OnboardingScreen (/.rspeedy/main/background.js:23366:52)\n    at doRender (/.rspeedy/main/background.js:55613:44)\n    at diff (/.rspeedy/main/background.js:55347:56)\n    at renderComponent (/.rspeedy/main/background.js:54715:125)\n    at process (/.rspeedy/main/background.js:54779:31)\n    at <anonymous> (/.rspeedy/main/background.js:56425:22)\n    at or (/lynx_core.js:1:1313)\n    at <anonymous> (/lynx_core.js:2:1137)\n","message":"Error: probe-render","cause":{"c
```

**A3 / P1 — 같은 탐침, 운영 모드 번들**(`rspeedy build` 산출물을 로컬 HTTP로 서빙하고 debug APK에 `--es bundle-url`로 줬다)

```
10-13 13:38:40.353  6163  6163 D DuruCrash: DISABLED 201 {"rawError":{"stack":"    at f$ (/.rspeedy/main/background.3f1544e0.js:7:310)\n    at eL (/.rspeedy/main/background.3f1544e0.js:1:10082)\n    at eA (/.rspeedy/main/background.3f1544e0.js:1:7262)\n    at <anonymous> (/.rspeedy/main/background.3f1544e0.js:1:2882)\n    at eT (/.rspeedy/main/background.3f1544e0.js:1:3115)\n    at or (/lynx_core.js:1:1313)\n    at <anonymous> (/lynx_core.js:2:1137)\n","message":"Error: probe-render","cause":{"cause":""}},"pid":"USER_ERROR","url":"file://lynx_core.js"
```

**A4 / P2 — 이벤트 핸들러의 `throw new TypeError("probe-handler")`**

```
10-13 13:34:19.684  5408  5408 D DuruCrash: DISABLED 201 {"rawError":{"stack":"    at handleNext (/.rspeedy/main/background.js:23358:45)\n    at call (native)\n    at handleTap (/.rspeedy/main/background.js:31429:117)\n    at publishEvent (/.rspeedy/main/background.js:62086:27)\n","message":"TypeError: probe-handler","cause":{"cause":""}},"pid":"USER_ERROR","url":"file://lynx_core.js","dynamicComponentPath":"","sentry":{"platform":"javascript","sdk":{"name":"sentry.javascript.browser","version":"5.15.5","packages":[{"name":"npm:@sentry/browser","versi
```

**A5 / P3-a — `Promise.reject(new Error("probe-reject"))`**

```
10-13 13:35:04.154  5554  5554 D DuruCrash: DISABLED 201 {"rawError":{"stack":"    at handleNext (/.rspeedy/main/background.js:23358:49)\n    at call (native)\n    at handleTap (/.rspeedy/main/background.js:31436:117)\n    at publishEvent (/.rspeedy/main/background.js:62093:27)\n","message":"unhandled rejection: probe-reject","cause":{"cause":""}},"pid":"USER_ERROR","url":"file://lynx_core.js","dynamicComponentPath":"","sentry":{"platform":"javascript","sdk":{"name":"sentry.javascript.browser","version":"5.15.5","packages":[{"name":"npm:@sentry/browse
```

**A5 / P3-b — `setTimeout(() => { throw new Error("probe-timer") }, 0)`**

```
10-13 13:36:15.376  5704  5704 D DuruCrash: DISABLED 201 {"rawError":{"stack":"    at <anonymous> (/.rspeedy/main/background.js:23359:43)\n","message":"Error: probe-timer","cause":{"cause":""}},"pid":"INTERNAL_ERROR","url":"file://lynx_core.js","dynamicComponentPath":"","sentry":{"platform":"javascript","sdk":{"name":"sentry.javascript.browser","version":"5.15.5","packages":[{"name":"npm:@sentry/browser","version":"5.15.5"}],"integrations":["InboundFilters","FunctionToString","Breadcrumbs","GlobalHandlers","LinkedErrors","UserAgent"]},"level":"error",
```

**A6 / P4 — 메인 스레드 함수 안의 throw**

```
10-13 13:37:16.196  5871  5871 D DuruCrash: DISABLED 1101 {"rawError":{"stack":"backtrace:\n    at <anonymous> (main-thread.js:3465:13)\n    at <anonymous> (file:///worklet-runtime/main-thread.js:7122:2473963297)\n    at profile (file:///worklet-runtime/main-thread.js:7073:36)\n    at runWorkletImpl (file:///worklet-runtime/main-thread.js:7123:76)\n    at workletRuntime_runWorklet (file:///worklet-runtime/main-thread.js:7119:145)\n","message":"main-thread.js exception: Error: probe-main-thread ","cause":{"cause":"main-thread.js exception: Error: probe-
```

## B — DSN을 넣은 빌드 (**상태: 1회차 실행됨 — 기기 쪽만. 수신 · 대시보드는 미확인**)

2026-10-13에 한 회차가 돌았다(아래 「실행 기록」). **그 회차가 본 것은 기기 밖으로 나가기 직전의 envelope 원문과 전송 시도까지다** — Sentry가 받았는지, 대시보드에 어떻게 보이는지는 아무도 보지 않았다.
아래 단계 표의 「관찰」은 **기기 쪽(envelope)**과 **대시보드 쪽**으로 나뉜다. 대시보드 쪽은 Sentry 계정이 있는 사람이 한다.

### 방법 — 오프라인에서 envelope을 먼저 읽고, 그 다음에 보낸다

1회차가 쓴 순서다. **식별자가 실려 있는지 보기 전에 보내지 않는다.**

1. 탐침을 넣은 번들로 `:app:assembleBundled`(임시 코드 — 커밋하지 않는다).
2. **네트워크를 먼저 끊는다**: `A shell svc wifi disable` · `A shell svc data disable` · `A shell cmd connectivity airplane-mode enable` → `A shell ping -c 1 8.8.8.8`이 `Network is unreachable`.
3. 앱을 지우고 새로 설치(설치 id가 새로 만들어지는 조건) → 실행 → 탐침을 돌린다.
4. `A root` 뒤 `/data/data/libitum.duru.android/cache/sentry/<DSN 해시>/`를 통째로 꺼내 원문을 읽는다. 대조용으로 그 기기의 설치 id 파일(`files/INSTALLATION`)과 `android_id`를 읽어 **envelope 전체에서 그 문자열을 찾는다**(값은 기록하지 않는다).
5. B6의 넷과 지워지지 않은 가짜 값이 **없음을 확인한 뒤에만** 네트워크를 켜고 앱을 재실행한다 → 캐시가 비는지 본다.
6. envelope 사본을 남길 때는 DSN · public key · DSN 해시 디렉터리 이름을 지운다.

⚠ **캐시가 비는 것은 수신의 증거가 아니다.** SDK가 재시도하지 않는 거절 응답에서도 비워질 수 있다 [추론 — SDK debug 로그가 꺼져 있어 HTTP 응답을 볼 수 없다]. 수신은 대시보드에서 `event_id`로 확인한다.

⚠ **메인 스레드 탐침(`main-thread:bindtap`)을 넣은 번들은 크기 상한을 넘는다** — 1회차의 탐침 번들이 1,731,799 bytes였다(상한 1,722,000. 탐침을 되돌리면 1,721,225). `pnpm size:check`를 탐침 번들에 돌리지 않는다.

### 전제

1. **Sentry 프로젝트** — ⟨2026-10-13⟩ 사용자가 Sentry에서 프로젝트 셋(Android · iOS · Astro)을 만들었고 Android DSN을 추적하지 않는 `apps/android/sentry.properties`에 넣었다.
   **`auth.token` · 조직 · 프로젝트 이름은 아직 없다** — 매핑 업로드(B4)는 그 셋이 들어가야 돈다. **데이터 지역(US/EU)은 확인하지 못했다** —
   지역은 프로젝트를 만든 뒤 바꿀 수 없다(spec §9 U4). 실행 전에 Sentry 콘솔에서 지역을 확인해 실행 기록에 적는다.
   ⚠ 그 파일이 있는 작업 트리에서는 **A1의 전제(「`sentry.properties`가 없다」)가 성립하지 않는다** — A단계를 다시 돌리려면 파일을 잠시 치우고 돌린 뒤 되돌린다.
2. **Sentry 프로젝트 설정에서 「IP 주소 저장 안 함」(Prevent Storing of IP Addresses)을 켠다.** (spec §9 U4.) B6의 `ip_address` 확인은 이 설정과 별개로 SDK가 보낸 원문을 본다.
3. **`apps/android/sentry.properties`를 만든다** — **추적하지 않는 파일이다**(`.gitignore`에 `apps/android/sentry.properties`가 있다. 토큰이 든다. 커밋하지 않는다). 키는 spec §5 표 그대로:

   | 값 | 환경 변수 | `sentry.properties` 키 |
   |---|---|---|
   | DSN | `SENTRY_DSN` | `dsn` |
   | 인증 토큰(매핑 업로드용) | `SENTRY_AUTH_TOKEN` | `auth.token` |
   | 조직 | `SENTRY_ORG` | `defaults.org` |
   | 프로젝트 | `SENTRY_PROJECT` | `defaults.project` |

   읽는 순서는 환경 변수 → `sentry.properties` → `""`. 파일이 없어도 빌드는 실패하지 않는다. **DSN · 토큰 값은 로그 · 실행 기록 · 스크린샷에 적지 않는다.**
4. `release` 빌드와 `bundled` 빌드만 DSN을 쓴다. **`debug`는 DSN이 있어도 늘 `""`이다**(spec C7) — B단계는 `bundled`로 돈다.
5. 매핑 업로드(B4)에는 **`sentry-cli`가 설치돼 있어야 한다**(spec §6 — 토큰이 있는데 CLI가 없으면 업로드 작업이 실패한다).

### 단계

| id | 단계 | 관찰(통과 조건) | 대응 AC | 상태 |
|---|---|---|---|---|
| B1 | DSN을 넣은 `bundled` 빌드를 설치 · 실행 | **기기**: 캐시에 세션 envelope이 바로 생긴다 — `status: ok` · `init: true` · `attrs = {release: libitum.duru.android@<versionName>+<versionCode>, environment: bundled}`. **대시보드**: 세션이 선다 | 5 | 기기 통과 · **대시보드 미확인** |
| B2 | A3과 같은 throw를 임시로 넣은 번들로 `bundled` 빌드 · 실행(임시 코드 — 커밋하지 않음) | **기기**: 이벤트 1건 — 태그 `lynx.source: js-background` · `mechanism{type: lynx, handled: true}` · `user` 없음 · `breadcrumbs` 키 없음 · 기기 화면에는 에러 화면 **외의 표시가 없다**. **대시보드**: 이슈 1건 · `handled: yes` · User 칸 비어 있음 | 1 · 4 | 기기 통과 · **대시보드 미확인** |
| B3 | 메시지에 `a@b.co` · `010-1234-5678` · 한글을 넣은 임시 throw | **기기**: 이벤트의 `value`가 `[email]` · `[number]` · `[text]`이고 envelope 전체에 원문 조각이 0건. **대시보드**: 같은 모습 | 4 | 기기 통과 · **대시보드 미확인** |
| B3-b | ⟨2026-10-13 리뷰 정정⟩ 스킴 없는 쿼리를 넣은 임시 throw — `GET /auth/v1/verify?token=123456&type=sms`(계약 기준 벡터 V16의 꼴. B3과 한 메시지에 합쳐도 된다) | `…/verify?[redacted]`로 나간다 — `token=` · `123456` · `type=sms`가 메시지 · 지문 · 스택 어디에도 없다 | 4 | 기기 통과 · **대시보드 미확인** |
| B2-b | ⟨1회차가 더한 것⟩ 핸들러 throw 하나와, **서로 다른 줄의 메인 스레드 throw 둘**(이름도 다르게) | 핸들러: `js-background` 이벤트 1건. 메인 스레드: `js-main-thread` 이벤트 2건 — 이름이 접두(`main-thread.js exception: `) 없이 제대로 갈리고, **지문 넷째 값(첫 스택 줄)이 서로 다르며 열이 `[number]`가 아니다** | 2 | 기기 통과 |
| B4-a | `adb shell am crash libitum.duru.android` | **기기**: **죽는 순간**(재실행 전) envelope 1개가 캐시에 써진다 — `level: fatal` · `mechanism{type: UncaughtExceptionHandler, handled: false}` · 같은 envelope의 세션 `status: crashed`. `debug_meta`에 매핑 UUID. 전송은 다음 실행에서 일어난다. **대시보드**: Java 크래시 이벤트 1건 · 세션 crashed | 6 | 기기 통과 · **대시보드 미확인** |
| B4-b | ⟨2026-10-13 정정⟩ **앱 코드의 프레임이 든 Java 크래시**를 일으키고 `uploadSentryMappingBundled`를 돌린다. **`am crash`로는 안 된다** — 그 이벤트의 프레임 7개는 전부 프레임워크(`ActivityThread$H.handleMessage` 등)라 매핑을 올려도 풀릴 이름이 없다. 앱 코드에서 잡히지 않는 예외를 던지는 임시 줄이 필요하다(커밋하지 않음) — **어디에 어떻게 넣을지는 계약이 아직 정하지 않았다** | 대시보드에서 스택이 **풀린 클래스 이름**(`com.libitum.host.…`)으로 보인다 | 6 | **미실행** — 인증 토큰 없음 · 던지는 방법 미정 |
| B5 | ⟨2026-10-13 정정⟩ **API 31 이상** 에뮬레이터에서 네이티브 크래시를 일으킨 뒤 재실행(1회차: `A root` 뒤 `A shell kill -SEGV <pid>` → 재실행 → 30초 대기) | tombstone 이벤트가 오는지 · 프레임 모양 · 죽은 실행의 세션 `status`를 **기록**한다(통과/실패 아님) | — | **API 30: 오지 않았다**(아래) · API 31 이상: 미실행 |
| B6 | 세션 · 이벤트 원문(JSON)에서 `user` · `did` · `ip_address` · **`contexts.device.id`**를 찾는다. **JS 예외 이벤트와 Java 크래시 이벤트 둘 다**에서 본다(tombstone이 왔으면 그것도). 기기의 설치 id · `android_id` 문자열도 envelope 전체에서 찾는다 | 넷 다 **없다**(spec §0 F12 · C10 · §11 RV1). 문자열 대조 0건. `contexts.device`의 다른 키는 있어도 된다 — 어떤 키가 실렸는지 메모에 옮긴다. `contexts.device.boot_time`도 **없어야 한다**(`438cc723`부터 지운다 — 1회차의 envelope에는 있었다). **넷 가운데 하나라도 보이면 식별자가 나가고 있는 것이다. 보내지 말고 멈추고 정정으로 되돌린다.** **대시보드**: 받은 이벤트에 서버가 붙인 IP가 없는지(프로젝트 설정 「IP 주소 저장 안 함」) | 4 | 기기 통과 · **서버 쪽 미확인** |
| B7 | M1 ~ M3 쿼리(spec §7)를 Sentry에서 한 번씩 연다 | spec §7의 쿼리가 수를 낸다 · 통합별 mechanism 이름을 아래 칸에 적는다 | — | **미실행** — 대시보드 접근 없음 |

**B5 — API 30에서 tombstone 이벤트가 오지 않았다. 실패가 아니라 계약의 범위가 틀렸다.** `setTombstoneEnabled(true)`인 `bundled`에서 SEGV로 죽인 뒤 재실행했으나 캐시에 새로 생긴 것은 세션 envelope뿐이었고,
이벤트가 싣는 `sdk.integrations` 목록에도 tombstone 통합의 이름이 없었다. 시스템은 그 종료를 `APP CRASH(NATIVE)`로 기록했고(`dumpsys activity exit-info`) logcat에는 tombstone backtrace가 찍혔다.
**SEGV로 죽은 실행의 세션은 `crashed`가 아니라 `exited`로 적혔다.** 계약과 이 문서의 앞선 판은 「API 30 이상」이라 적었다 — 플랫폼이 네이티브 크래시의 tombstone을 앱에 읽게 해 주는 것이 API 31부터일 수 있다 [추론].
API 31 이상에서 다시 봐야 닫힌다([ADR-0058](../adr/0058-crash-reporting-sentry.md) D5 · 「정정 기록」).

B4의 매핑 업로드는 `uploadSentryMappingBundled`를 손으로 돌린다(어디에도 매달려 있지 않다 — spec §5). 작업 이름 이외의 인자 · 매핑 파일 경로는 계약이 정하지 않았다 — 실행 때 Gradle 출력으로 확인해 아래 「B 단계 메모」에 적는다.

### B 단계 메모 (1회차 — 2026-10-13)

| 항목 | 값 |
|---|---|
| B7 — Java 크래시의 mechanism 이름 | `UncaughtExceptionHandler`(`handled: false`) — envelope에서 읽은 값. 대시보드 표시는 미확인 |
| B7 — ANR의 mechanism 이름 | 미확인 — ANR을 유도하지 않았다(`sdk.integrations`에 `AnrV2`가 있다는 것만) |
| B7 — tombstone의 mechanism 이름 | 미확인 — API 30에서 이벤트가 오지 않았다 |
| B5 — tombstone 프레임 모양 | 미확인 — 같음 |
| B4 — `uploadSentryMappingBundled` 실행 명령 · 결과 | 미실행 — `auth.token` 없음 |
| B6 — 이벤트 원문의 `contexts.device` 키 목록(값은 옮기지 않는다) | 26개: `archs` · `battery_level` · `battery_temperature` · **`boot_time`** · `brand` · `charging` · `family` · `free_memory` · `free_storage` · `locale` · `low_memory` · `manufacturer` · `memory_size` · `model` · `model_id` · `online` · `orientation` · `processor_count` · `processor_frequency` · `screen_density` · `screen_dpi` · `screen_height_pixels` · `screen_width_pixels` · `simulator` · `storage_size` · `timezone`. `id` · `name` 없음. **`boot_time`은 이 회차 뒤 `438cc723`에서 지우게 고쳤다 — 이 회차의 5건에는 실려 나갔다.** `contexts.app` · `contexts.os` · `contexts.trace` · 태그의 키는 [Android 데이터 보안](../android-data-safety.md)에 옮겼다 |
| B6 — 넷(`user` · `did` · `ip_address` · `contexts.device.id`) 각각의 유무, 이벤트 종류별 | JS 이벤트 4건 · Java 크래시 1건 · 세션 전부에서 **넷 다 없음**. `contexts.device.name` · `server_name` · `modules` · `request` · `breadcrumbs`도 없음. 설치 id 문자열 0건 · `android_id` 0건 |
| B2 — 오류 탐침부터 화면이 다시 반응할 때까지의 체감 · 측정(메인 스레드 동기 수집 — 리뷰 S4) | **직접 재지 못했다**(SDK debug 로그 꺼짐 · 호스트에 시간 로그 없음). 간접 값만 [추론]: Lynx가 오류를 낸 로그 줄부터 호스트 콜백 뒤의 로그 줄까지 첫 이벤트 7 ms · 둘째 2 ms — 그 구간에는 다른 리스너도 들어 있다. 화면이 멈춘 체감은 없었다(자동 탭이라 근거는 약하다) |
| 지문(전부 4원소) | 메인 스레드 둘: `["lynx","js-main-thread","TypeError","    at <anonymous> (main-thread.js:2405:10)"]` · `[…,"RangeError","    at <anonymous> (main-thread.js:2404:10)"]` — 넷째 값이 갈린다. 핸들러: `[…,"js-background","TypeError","    at bindtap (/.rspeedy/main/background.<해시>.js:7:915)"]`. 경계 렌더: `[…,"js-background","Error","    at fj (/.rspeedy/main/background.<해시>.js:7:371)"]` — 메시지는 지문에 들어가지 않는다 |
| 운영 번들 · R8 APK의 메인 스레드 원문 | logcat의 원문은 여전히 `main-thread.js exception: TypeError: probe-b-mt-one` + `backtrace:` 줄. 이벤트에서는 걷혀 `type: TypeError` · `value: probe-b-mt-one` · 첫 스택 줄이 프레임 — **A6 뒤의 파싱 수정(`1c626045`)이 기기에서 확인됐다.** 운영 번들의 메인 스레드 스크립트는 한 줄로 줄여져 있지 않았고(줄 2404 · 2405) A6에서 10자리 열이던 프레임은 `…main-thread.js:2824:65`였다 |
| 그 밖에 실려 나간 것(계약이 이름으로 다루지 않은 것) | `trace_id`(한 실행 동안 5건 모두 같고 재실행하면 바뀐다 — envelope 헤더에도) · `contexts.trace.data.thread.id`(실제로는 프로세스 id) · `contexts.app.permissions` · `app_start_time` · `view_names` · `contexts.os.kernel_version` · `build` · 태그 `isSideLoaded` |

## 이 절차로 확인하지 못하는 것

- **iOS** — 이번에는 iOS에서 아무것도 나가지 않는다(다음 조각). `reportCrash`는 iOS 호스트 · Explorer에서도 `lynx.reportError`를 부른다 — 수집기가 없는 그 호스트들에서 화면에 무엇이 더해지는지는 이 절차에 없다.
- **JS 소스맵** — 이번 조각에 넣지 않았다(spec C9). Sentry의 JS 스택은 줄여진 줄 · 열(`main.lynx.bundle:1:<열>`) 그대로다. **열을 손으로 푸는 절차는 계약이 정하지 않았다** — 이 문서에 적지 않는다(보류).
- **debug 빌드의 Sentry 전송** — debug는 DSN이 있어도 보내지 않는다(spec C7 · U5).
- **C/C++ 크래시** — API 30에서는 이벤트가 오지 않았다(B5). **API 31 이상 · 그 미만 모두 [미확인]이다.**
- **Sentry가 받았는지와 대시보드에 보이는 모든 것**(이슈 묶음 · `handled` 표시 · 세션 수치 · M1 ~ M3 · 서버가 붙이는 IP) — 계정이 있는 사람이 본다.
- **ANR 이벤트** · 거부된 promise · 타이머 throw의 **이벤트** 모양 · 온라인에서 바로 보낼 때의 envelope — 1회차 탐침에 없었다.
- **`boot_time`을 지운 뒤의 envelope** — `438cc723` 뒤로 기기에서 다시 뜨지 않았다.
- ~~**`bundled`(R8) APK에서 JS 오류가 호스트에 닿는지**~~ — B단계 1회차가 봤다(경계 렌더 · 핸들러 · 메인 스레드). A단계로는 볼 수 없다(`DuruCrash` 로그가 debug 전용).
- **탐침에 없는 길** — `requestAnimationFrame` 콜백 · 생명주기 이벤트 · ref · data processor의 throw, 첫 렌더(스플래시)에서 두 스레드가 각각 보고하는지, `error.getLevel()`의 실제 값.
- Sentry 쪽 개인정보 처리방침 · Play 데이터 보안 양식 제출(spec U6 — 저장소 밖).

## 실행 기록

회차가 생기면 한 행씩 더한다.

### A단계

| 일시 | 기기 | 확인자 | 결과 | 메모 |
|---|---|---|---|---|
| 2026-10-13 13:25 ~ 13:42 (KST) | AVD `R6_API30`(`emulator-5580`) — API 30 · arm64-v8a 에뮬레이터. HEAD `3dcf0292` | **에이전트 실행, 사람 미확인** | **A1 통과**(release 번들 빌드는 미실행) · **A2 통과** · **A3 통과** · **A4 통과** · **A5 측정: 둘 다 나온다** · **A6 측정: 나온다(코드 1101)** · **A7 통과** | 아래 「1회차 메모」 |

**1회차 메모**

- **A1**: `./gradlew clean :app:testDebugUnitTest :app:assembleDebug :app:assembleBundled` — `BUILD SUCCESSFUL in 1m 31s`, JUnit 121건 실패 0. `verifyDebugApkNativeAlignment` · `verifyBundledApkNativeAlignment` 통과.
  bundled · debug APK의 `libsentry*.so` 0개(네 ABI 전부). 업로드 작업 둘은 이름으로 불러 SKIPPED(위 A1의 정정). **`:app:bundleRelease`는 `google-services.json`이 없어 돌리지 않았다.**
  R8 경고는 3줄이고 전부 `com.lynx.xelement.refresh.LynxUIRefresh$createView$1`의 `multiple definitions`다 — `io.sentry`를 가리키는 경고 0줄, `missing_rules.txt` 없음(`-dontwarn` 추가 0).
  ADR-0052와의 대조는 실행자가 하지 않았고 documentation 단계가 그 ADR의 적용 기록 ⟨2026-10-13⟩에 옮겼다. JS 번들은 모의 값(`example.invalid`)으로 빌드했다 — 로그인이 되지 않는 번들이다.
- **A2**: 콜드 스타트 `Status: ok`, 온보딩 첫 스텝이 평소대로 떴다. logcat 989줄에서 `Sentry` · `DuruCrash` 태그 0줄(대소문자 무시 `sentry` 문자열도 0줄). 병합 매니페스트(bundled · debug)에 provider 둘 0건 —
  `io.sentry.auto-init` 메타데이터 한 줄만 있다. 기기에 앱이 이미 설치돼 있어 `uninstall` 없이 `install -r`로 덮었다(앱 데이터 유지).
- **탐침 자리가 절차와 다르다(A3 ~ A6).** 절차는 여정 맵 화면(A3) · 설정 탭의 토글(A4)을 적었으나 모의 값 번들로는 로그인할 수 없어 닿지 못했다. **다섯 탐침 모두 로그인 없이 닿는
  `OnboardingScreen`**(스플래시 다음 화면)에 넣었다 — P1은 컴포넌트 렌더 본문(`step === 1`일 때), P2 · P3-a · P3-b는 Next 버튼의 `handleNext()` 첫 줄, P4는 Next 버튼을 감싼 `<view>`에 새로 단
  `main-thread:bindtap`(앱 소스에 `'main thread'` 함수가 하나도 없었다). 경계는 루트에 하나라 같은 경계가 잡는다. 여정 맵 · 설정 탭에서의 탐침은 **하지 않았다.**
- **포트.** 3000은 다른 작업 트리의 dev 서버가 쓰고 있어 건드리지 않았고, 이 작업 트리의 `rspeedy dev`가 3001을 골라 `--es bundle-url`로 줬다. 제품 · 호스트 코드 변경 없음.
- **A3**: 탐침 없는 기준 실행은 `DuruCrash` 0줄. P1은 에러 화면(`Something went wrong` / `probe-render` / `Try again`) + `DISABLED 201` 1줄, 프로세스 생존. 운영 모드 번들로 한 번 더 — 같은 결과.
  탐침을 저장한 순간 앞 프로세스에 HMR이 밀어 넣어 난 줄이 로그에 하나 더 있다(스택 첫 프레임 `hot-update.js`) — 재실행한 프로세스의 줄은 하나다.
- **A4**: `DISABLED 201 …"message":"TypeError: probe-handler"…` 1줄. 화면은 온보딩 첫 스텝 그대로(핸들러가 던져 스텝이 안 넘어간다), 에러 화면 없음, 프로세스 생존.
- **A5**: reject — `DISABLED 201`, `unhandled rejection: probe-reject`, 20초 뒤에도 1줄 그대로. timer — `DISABLED 201`, `Error: probe-timer`, `pid: INTERNAL_ERROR`. **안 나오는 길은 없었다** —
  spec §2.1 표의 [미확인] 두 줄이 「닿는다」로 닫혔다(spec §11).
- **A6**: `DISABLED 1101` 1줄. 메시지 접두와 `backtrace:` 줄 때문에 파싱 규칙 둘을 고쳤다(위 A6 — **수정 뒤 기기 재실행 없음**).
- **A7**: 탐침 파일을 `git checkout --`으로 되돌리고 탐침 없는 번들을 다시 만들었다. `git status --short`에는 추적하지 않는 `apps/android/local.properties` 한 줄뿐, `git diff --stat` 비어 있음.
  에뮬레이터는 내렸고 **기기에는 이 브랜치의 debug APK가 남아 있다.**
- **범위 밖에서 본 것**: 에러 화면의 제목이 상태 표시줄의 시계와 겹쳐 그려지고 본문 아래 화면의 대부분이 주황색으로 남는다(P1 스크린샷) — 기존 결함이고 이 작업이 고치지 않았다
  ([ADR 보류 표](../adr/README.md#보류-표)). `rspeedy dev`는 다시 빌드할 때마다 `apps/mobile/dist/main.lynx.bundle`을 dev 번들로 덮어쓴다 — 운영 모드 번들로 재실행할 때는 dev 서버를 먼저 내린다.
- **이 회차가 보지 못한 것**: `bundled`(R8) APK에서의 A3 ~ A6 · 깔때기가 실제로 만드는 payload(전부 `DISABLED`에서 끝났다) · `:app:bundleRelease` · API 30 외 수준과 실기 ·
  이번 실행의 background JS 엔진이 무엇이었는지(APK에 `libquick.so`와 `libnapi_v8.so`가 함께 있다).

### B단계

| 일시 | 기기 | 확인자 | 결과 | 메모 |
|---|---|---|---|---|
| 2026-10-13 14:30 ~ 14:40 (KST) | AVD `R6_API30`(`emulator-5580`) — API 30 · arm64-v8a 에뮬레이터. **`bundled`(R8 켜짐 · `DEBUG=false`)** · 운영 번들(모의 접속 값) · DSN 있음 · HEAD `b11ef1b6` | **에이전트 실행, 사람 미확인** | **기기 쪽**: B1 통과 · B2 통과 · B3 · B3-b 통과 · B2-b 통과 · B4-a 통과 · **B5 — API 30에서 tombstone 이벤트가 오지 않았다(계약의 범위가 틀렸다)** · B6 통과(넷 없음). **미실행**: B4-b(매핑 업로드 · 풀린 스택) · B7. **미확인**: Sentry 수신과 대시보드 쪽 전부 | 아래 「B 1회차 메모」 |

**B 1회차 메모**

- **수신 여부는 미확인이다.** 네트워크를 켜고 재실행하자 캐시의 envelope 9개가 약 2초 뒤 2개, 약 5초 뒤 0개가 됐고 30초 뒤에도 0이었다. logcat에 `Sentry` 태그 0줄(SDK debug 꺼짐) · 예외 0.
  **본 것은 「전송을 시도했고 캐시가 비워졌다」까지다** — HTTP 응답을 보지 못했다. 아래 표의 `event_id`를 대시보드에서 찾는 것은 사용자 몫이다.
- **대시보드에서 찾을 것.** 전송 시각은 전부 2026-10-13 05:36:50 ~ 05:36:55Z(KST 14:36:50 ~ 55) — 그 전까지는 오프라인 캐시에 있었다. 공통: `release: libitum.duru.android@0.1.0+2` · `environment: bundled` · `dist: 2` ·
  기기 `sdk_gphone_arm64`(에뮬레이터).

  | # | `event_id` | 발생(UTC) | 종류 | 대시보드에 보일 모양 |
  |---|---|---|---|---|
  | 1 | `275f38978b8c4c6b9aa22e8cc998fd40` | 05:33:36 | JS 메인 스레드 | `TypeError: probe-b-mt-one` · `lynx.source: js-main-thread` · handled |
  | 2 | `ab8ee1ae4d0048aba91540f158cde57a` | 05:33:39 | JS 메인 스레드 | `RangeError: probe-b-mt-two` · `lynx.source: js-main-thread` · handled |
  | 3 | `701f929b670a4f9391f9487320ebe9c3` | 05:33:43 | JS 핸들러 | `TypeError: probe-b-handler` · `lynx.source: js-background` · handled |
  | 4 | `7afec8f207ac4a758052c1ad6d388713` | 05:33:47 | JS 경계 렌더 | `Error: probe-b [email] [number] [text] GET /auth/v1/verify?[redacted]` · `lynx.source: js-background` · handled |
  | 5 | `9b9d538c42394d2bbd585c92c8ea7629` | 05:35:07 | Java 크래시(`am crash`) | `RemoteServiceException: shell-induced crash` · `level: fatal` · unhandled |

  세션은 넷이다: 05:33:12 시작(오류 5 · `crashed`로 끝남) · 05:35:36 시작(`exited` — SEGV로 죽은 실행) · 05:35:52 시작 · 온라인 재실행의 것(05:36:50경). **다섯 건이 보이면 수신이 확인된 것이고, 안 보이면
  거절됐을 수 있다 — 그때는 SDK debug 로그를 켠 빌드로 응답을 본다.** 보이는 다섯 건 모두에 `contexts.device.boot_time`이 들어 있다(이 회차 뒤에 지우게 고쳤다) — 남길지 지울지는 사용자가 정한다.
- **방법.** 위 「방법」 그대로 — 오프라인에서 새로 설치하고 탐침 넷을 돌린 뒤 envelope을 꺼내 읽고, `am crash` · `kill -SEGV`까지 오프라인으로 한 다음, 식별자와 지워지지 않은 가짜 값이 없음을 확인하고 네트워크를 켰다.
- **탐침 자리.** A단계와 같이 전부 `OnboardingScreen`이다(모의 값 번들이라 로그인 뒤 화면에 닿지 못한다) — 메인 스레드 throw 둘(제목 · 진행 점의 `main-thread:bindtap`), `handleNext()` 첫 탭의 핸들러 throw,
  둘째 스텝 렌더의 throw(가짜 이메일 · 전화번호 · 한글 · 스킴 없는 쿼리를 한 메시지에).
- **B3**: 던진 것 `probe-b a@b.co 010-1234-5678 한글 GET /auth/v1/verify?token=123456&type=sms` → 이벤트의 `value`는 `probe-b [email] [number] [text] GET /auth/v1/verify?[redacted]`.
  envelope 전체에서 `a@b.co` · `010-1234` · `5678` · `한글` · `token=` · `123456` · `type=sms` 0건. **기기 화면의 에러 화면 본문과 기기의 logcat(`lynx` 태그)에는 원문이 그대로 보였다** — 에러 화면은 `ErrorBoundary`의
  기존 동작이고 Lynx는 `bundled`에서도 오류 원문을 찍는다. 둘 다 기기 안의 일이다.
- **B4-a**: 이벤트의 프레임 7개가 전부 프레임워크 프레임이었다 — 매핑 확인에 쓸 수 없어 절차를 B4-a / B4-b로 나눴다. envelope은 재실행이 아니라 **죽는 순간** 캐시에 써져 있었다(절차 문면을 그렇게 고쳤다).
- **B5**: 위 단계 표 아래 문단. 죽은 실행의 세션 envelope은 시작 9 ms 뒤에 이미 `exited`로 써져 있었다.
- **`boot_time`**: 이 회차의 실행자는 B6의 넷이 아니라 멈춤 조건으로 보지 않고 전송을 진행했다. 그 뒤 `beforeSend`가 지우게 고쳤고(`438cc723`) **고친 빌드의 envelope은 다시 뜨지 않았다.**
- **되돌림**: 탐침 파일 `git checkout --` · 탐침 없는 번들과 APK 재생성 · 앱 제거(캐시 · 설치 id 포함) · 네트워크를 다시 켠 뒤 에뮬레이터 종료. `git status --short`에는 추적하지 않는 `apps/android/local.properties`뿐.
  **`sentry.properties`가 있는 한 다시 만든 `bundled` APK에도 DSN이 들어 있다.**
- **이 회차가 보지 못한 것**: Sentry 수신과 대시보드(B7 포함) · 매핑 업로드와 풀린 스택 · ANR · API 31 이상의 tombstone · `captureEvent`의 직접 시간 · 거부된 promise · 타이머 throw의 이벤트 모양 ·
  온라인에서 바로 보낼 때의 envelope · 실기와 다른 API 수준 · release AAB.
