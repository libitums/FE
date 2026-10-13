# 크래시 리포팅(Sentry) — Android 수동 e2e

## 목적과 범위

앱이 죽거나 JS 예외가 났을 때 Android 호스트가 Sentry로 보고하는 길을, 자체 호스트 앱에서 확인한다.
자동 E2E: not applicable(runner/command 없음). 런타임이 오류를 호스트에 넘기는 구간 · R8 뒤 동작 · Sentry 수신은 대역으로 대신할 수 없어 수동 절차로 고정한다.

정본: `.agent-harness/work/crash-reporting-sentry/spec.md`(§0 실측 · §2.1 어떤 JS 오류가 어느 길로 닿는가 · §3 호스트 계약 · §5 빌드 · §7 측정 · §9 사용자 결정) ·
`test-plan.md` §5. **이 문서에 없는 단계를 현장에서 만들지 않는다.** 계약이 「미확인」으로 둔 것은 이 문서도 미확인으로 두고, 관찰 칸을 비워 둔다.

| 단계 | 상태 | 무엇 |
|---|---|---|
| **A** | 이번 작업에서 실행 | DSN 없이 — 빌드 · 초기화 안 됨 · 탐침 P1 ~ P4 · 되돌리기 |
| **B** | **대기 — DSN 발급 뒤** | Sentry 수신 — 세션 · JS 예외 이슈 · 지우기 · Java 크래시와 매핑 · tombstone · 식별자 없음 · 측정 쿼리 |

## 전제

공통 전제([README](README.md))를 따르되, 이 흐름은 **로그인이 필요 없는 구간이 대부분**이다. 탐침이 닿는 화면(여정 맵 · 설정 탭)을 보려면 로그인된 상태에서 시작한다.

1. **에뮬레이터 하나**(전용). B5(tombstone)는 **API 30 이상**이어야 한다(`ApplicationExitInfo` 기반). `adb`는 아래 함수로 부른다:
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
- `uploadSentryMappingRelease`가 **SKIPPED**다(`bundleRelease`를 돌렸다면 Gradle 출력에서 확인. 한 줄 로그가 남는다).
- R8 경고 목록(`missing_rules.txt` 등)을 [ADR-0052](../adr/0052-android-release-shrinking.md) 기준과 **대조해 실행 기록에 적는다**(어떤 `-dontwarn`이 필요한지 — 계약은 추가 0을 기본으로 둔다).
- 빌드한 APK의 `lib/arm64-v8a/`에 `libsentry*.so`가 **0개**다:
  ```sh
  unzip -Z1 apps/android/app/build/outputs/apk/bundled/app-bundled.apk | grep -c '^lib/arm64-v8a/libsentry' # 0
  ```
  (APK 경로는 빌드 산출물 폴더에서 맞춘다.)

실패: 어느 작업이든 실패 · 정렬 검사 실패 · `libsentry*.so` 1개 이상 · 업로드 작업이 SKIPPED가 아니라 실행됨.

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

전제: **debug 빌드 + dev 서버**(탐침을 번들에 넣으려면 dev 서버가 필요하다). debug 호스트는 `localhost:3000`을 읽는다 — 다른 작업 트리의 서버가 떠 있지 않은지 확인한다.

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

### A7 — 탐침을 전부 되돌리고 `git status`가 깨끗하다

**대응 AC: —**

```sh
git status --short
git diff --stat
```

관찰(통과 조건): 임시 변경 **0**(탐침을 넣었던 파일이 목록에 없다). `docs/e2e/crash-reporting.md`의 실행 기록 갱신만 남아 있어도 된다 — 그 밖의 변경이 있으면 되돌린다.

### 도착한 문자열 (A3 관찰 — 실행 뒤 채운다)

spec §0 F5 · §3.3 3번의 [미확인]이다. A3을 돌리기 전에는 이 칸을 **비워 둔다**.

| 항목 | 값 |
|---|---|
| `DuruCrash` 줄 원문(그대로) | |
| 평문 / JSON(`rawError`) / 그 밖 | |
| 스택 프레임의 파일 이름 모양 | |
| LogBox가 떴는가 | |

## B — DSN 발급 뒤 (**상태: 대기 — DSN 발급 뒤**)

이 단계는 이번 작업에서 실행하지 않는다. DSN이 생기기 전까지 아래 행의 결과 칸은 모두 「대기」다.

### 전제

1. **사용자가 Sentry 프로젝트를 만든다**(spec §9 U4 — 조직 · 프로젝트 · 데이터 지역(US/EU) · DSN. 지역은 프로젝트를 만든 뒤 바꿀 수 없다).
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
| B1 | DSN을 넣은 `bundled` 빌드를 설치 · 실행 | Sentry에 세션이 선다(`environment: bundled` · `release: libitum.duru.android@<versionName>+<versionCode>`) | 5 | 대기 |
| B2 | A3과 같은 throw를 임시로 넣은 번들로 `bundled` 빌드 · 실행(임시 코드 — 커밋하지 않음) | 이슈 **1건** — 태그 `lynx.source: js-background` · `handled: yes` · User 칸 비어 있음 · breadcrumb 0 · 기기 화면에는 에러 화면 **외의 표시가 없다** | 1 · 4 | 대기 |
| B3 | 메시지에 `a@b.co` · `010-1234-5678` · 한글을 넣은 임시 throw | Sentry에 `[email]` · `[number]` · `[text]`로 보인다 | 4 | 대기 |
| B4 | `adb shell am crash libitum.duru.android` 뒤 앱을 다시 실행 | Java 크래시 이벤트 1건 · 세션이 crashed · `uploadSentryMappingBundled`를 돌린 뒤 스택이 **풀린 클래스 이름**으로 보인다 | 6 | 대기 |
| B5 | (API 30 이상 에뮬레이터) 네이티브 크래시를 일으킨 뒤 재실행 | tombstone 이벤트가 오는지 · 프레임 모양을 **기록**한다(통과/실패 아님) | — | 대기 |
| B6 | Sentry 세션 · 이벤트 원문(JSON)에서 `user` · `did` · `ip_address`를 찾는다 | 셋 다 **없다**(spec §0 F12 · C10 확인). 있으면 U2의 전제가 달라진다 → 정정 | 4 | 대기 |
| B7 | M1 ~ M3 쿼리(spec §7)를 Sentry에서 한 번씩 연다 | spec §7의 쿼리가 수를 낸다 · 통합별 mechanism 이름을 아래 칸에 적는다 | — | 대기 |

B4의 매핑 업로드는 `uploadSentryMappingBundled`를 손으로 돌린다(어디에도 매달려 있지 않다 — spec §5). 작업 이름 이외의 인자 · 매핑 파일 경로는 계약이 정하지 않았다 — 실행 때 Gradle 출력으로 확인해 아래 「B 단계 메모」에 적는다.

### B 단계 메모 (실행 뒤 채운다 — 지금은 비어 있다)

| 항목 | 값 |
|---|---|
| B7 — Java 크래시의 mechanism 이름 | |
| B7 — ANR의 mechanism 이름 | |
| B7 — tombstone의 mechanism 이름 | |
| B5 — tombstone 프레임 모양 | |
| B4 — `uploadSentryMappingBundled` 실행 명령 · 결과 | |

## 이 절차로 확인하지 못하는 것

- **iOS** — 이번에는 iOS에서 아무것도 나가지 않는다(다음 조각).
- **JS 소스맵** — 이번 조각에 넣지 않았다(spec C9). Sentry의 JS 스택은 줄여진 줄 · 열(`main.lynx.bundle:1:<열>`) 그대로다. **열을 손으로 푸는 절차는 계약이 정하지 않았다** — 이 문서에 적지 않는다(보류).
- **debug 빌드의 Sentry 전송** — debug는 DSN이 있어도 보내지 않는다(spec C7 · U5).
- **C/C++ 크래시의 API 30 미만 동작** — [미확인](spec F13).
- Sentry 쪽 개인정보 처리방침 · Play 데이터 보안 양식 제출(spec U6 — 저장소 밖).

## 실행 기록

회차가 생기면 한 행씩 더한다. 지금은 **비어 있다.**

### A단계

| 일시 | 기기 | 확인자 | 결과 | 메모 |
|---|---|---|---|---|
| | | | | |

### B단계 (대기 — DSN 발급 뒤)

| 일시 | 기기 | 확인자 | 결과 | 메모 |
|---|---|---|---|---|
| | | | | |
