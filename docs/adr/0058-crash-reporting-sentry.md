# ADR-0058 — 크래시 리포팅: JS 예외는 Lynx의 오류 통로로 호스트에 모으고, Android 호스트가 Sentry로 보낸다 (호스트 모듈 없음 · 한 깔때기 · NDK 없음)

- 상태: **제안** — 구현과 `pnpm verify` 안의 계층, DSN 없는 기기 확인(e2e A단계)은 끝났다. ⚠ **Sentry로 실제로 나간 이벤트는 아직 한 건도 없다** — DSN을 넣은
  빌드의 확인(e2e B단계)이 남았고, 그때까지 「Sentry에 이렇게 보인다」는 문장은 전부 [미확인]이다.
  ⚠ **계약 기본값 여럿이 사용자 확인 전이다.** 그 목록이 아래 「사용자 확인 필요」 절이고, 확인되기 전까지 `채택`으로 올리지 않는다.
  **사용자 결정은 넷이다**: 「Sentry로 간다」 · 「랜딩에도 단다」 · 「추천 방안을 하나씩 진행한다」(2026-10-13) · Sentry 조직과 Android 프로젝트 생성(2026-10-13 — DSN은 발급됐고
  저장소 · 빌드에는 아직 넣지 않았다).
- 날짜: 2026-10-13.
- 다루는 축: **크래시 · 오류 수집** (새 축 — 기존 ADR의 `다루는 축`이 덮지 않는다). 잡히지 않은 JS 예외와 에러 경계가 잡은 렌더 예외를 어디서 받는가 · 호스트 밖으로 나가는
  값의 닫힌 모양과 개인 정보를 지우는 자리 · SDK 아티팩트와 초기화 · DSN 주입 · R8 매핑 업로드 · 사용자 식별자 · 과다 전송 · 무엇을 재는가.
  **다루지 않는 것**: iOS 호스트(`sentry-cocoa` — 다음 조각) · 랜딩(`apps/landing`) · Supabase Edge Functions · 성능 추적 · 세션 리플레이 · 사용자 피드백 위젯 ·
  에러 화면의 문구와 모양 · Sentry 프로젝트 쪽 설정(알림 · 보존 기간 · 대시보드).
- 이어받는 결정: [ADR-0007](0007-app-internals-state-routing-data-errors.md) D4(루트 에러 경계 하나 — 그 문서의 적용 기록 ⟨2026-10-13⟩),
  [ADR-0017](0017-host-native-capabilities-and-audio.md) D1(호스트 모듈의 입장 조건 — D3이 그 판정이다),
  [ADR-0038](0038-android-minimal-host.md)(Android 최소 호스트), [ADR-0046](0046-android-play-release.md) D6 · D7(16 KB 정렬 게이트),
  [ADR-0052](0052-android-release-shrinking.md)(R8 — 그 문서의 적용 기록 ⟨2026-10-13⟩), [ADR-0013](0013-dependencies-and-version-notation.md)(정확 버전 고정),
  [ADR-0031](0031-ui-language-catalog.md) D7(한글 리터럴의 자리), [ADR-0029](0029-product-analytics-posthog.md)(제품 분석 — 이벤트 추가 0).
  **바꾸는 결정은 없다.**

**왜 새 번호인가** — 없던 축을 처음 정한다(ADR-0010 D10). 0057은 다른 브랜치(`0057-catalog-learning-session.md`)가 쓰고, 이 PR은 어느 쪽이 먼저 머지돼도 충돌하지 않게
그 다음 번호를 쓴다(ADR-0029 때와 같은 처리).

근거 표시: **[확인]** 이 회차에 실물(설치된 타입 · AAR 바이트코드 · Maven Central · 저장소 스크립트 실행)로 본 것 · **[실측]** 빌드하거나 에뮬레이터에서 돌려 로그 · 수치로 본 것 ·
**[정적]** 소스 · 바이트코드로 경로는 읽었으나 기기에서 돌려 보지 않은 것 · **[추론]** 근거에서 끌어낸 판단 · **[미확인]** 못 본 것.
계약의 정본은 하네스 작업 폴더(`.agent-harness/work/crash-reporting-sentry/` — 저장소 밖)의 `spec.md`(§0 실측 F1 ~ F17 · §1 결정 C1 ~ C13 · §11 정정 기록)이고
기기 실행의 원문은 같은 폴더의 `logs/e2e-a.md`다. 이 문서는 그중 **결정과 그 근거의 등급**만 옮긴다. 모듈 시그니처는 코드가 진다.

## 맥락

1. **`ErrorBoundary`는 `console.error`만 찍고 버렸고, 네이티브 크래시를 모으는 곳이 없었다** [확인 — 저장소]. 출시된 앱에서 난 오류를 사용자 신고 없이는 알 수 없었다.
2. **JS가 잡히지 않은 오류를 구독할 공개 훅이 없다** [확인]. `@lynx-js/types@4.1.0`에 `lynx.onError`가 선언돼 있으나 Lynx 4.0.1 코어 JS에 그것을 부르는 코드가 없고,
   `globalThis.onerror` · `unhandledrejection` · `ErrorUtils`류 전역 핸들러도 0건이다(iOS Pod 사본의 `lynx_core.js`에서 확인 — Android AAR이 싣는 코어 JS와 같은 파일인지는 [미확인]).
3. **`lynx.reportError(error)`는 두 스레드 공용의 공개 API다** [확인]. ReactLynx 0.125.0은 background의 이벤트 핸들러 · 생명주기 이벤트 · ref · data processor 예외를 잡아
   그 함수로 넘기고, 메인 스레드는 그것을 `_ReportError(error, { errorCode: 1101 })`로 바꿔 끼운다. 거부된 promise는 코어의 Promise 폴리필이 이름을
   `unhandled rejection`으로 바꿔 같은 네이티브 통로로 보낸다 [정적].
4. **에러 경계가 처리한 렌더 예외는 그 통로로 가지 않는다** [확인]. Preact `_catchError`가 경계를 찾으면 거기서 끝나고 ReactLynx는 `options.__e`를 걸지 않는다 —
   경계가 잡은 것과 런타임이 올리는 것은 겹치지 않는다.
5. **Android 호스트는 `LynxViewClient.onReceivedError(LynxError)`로 그 통로의 끝을 받는다** [정적 → 실측, 아래 「확인한 것」]. 공개 getter는 `getErrorCode()` ·
   `getLevel()` · `getSummaryMessage()` · `getMsg()`다.
6. **JS 번들 상한의 여유가 1,063 bytes였다** [확인 — `devtools/bundle-size/budget.json`, 상한 1,722,000]. JS 쪽에 SDK나 지우기 구현을 넣을 자리가 없다.
7. **`sentry-android-ndk`는 이 저장소의 16 KB 검사를 통과하지 못한다** [확인]. 8.60.0이 고정하는 `sentry-native-ndk` 0.17.2의 arm64-v8a · x86_64 `libsentry.so` ·
   `libsentry-android.so` 넷 모두 `relro-end`(GNU_RELRO 끝이 0x4000 배수가 아님)이고, 최신 0.17.3도 `libsentry-android.so`가 같다
   (`devtools/android-bundle/elf-page-alignment.mjs`의 판정을 내려받은 AAR의 `.so`에 직접 실행).
8. **SDK는 기본으로 설치 id를 붙인다** [확인 — 정적, 바이트코드]. 이벤트에는 `user.id = Installation.id(context)`, 세션에는 `distinctId`가 실리고,
   뒤엣것은 사용자 설정 콜백보다 **앞**에 돈다. 「안 붙임」은 기본값이 아니라 꺼야 하는 것이다.

## 결정

### D1. 잡히지 않은 JS 예외는 호스트의 `LynxViewClient.onReceivedError` 하나로 받는다

- JS에서 `lynx.reportError`를 감싸거나 내부(`lynxCoreInject.tt`)를 건드리지 않는다. 공개 훅이 없고(맥락 2), 거부된 promise와 메인 스레드 오류는 JS를 거치지 않고
  네이티브로 간다(맥락 3) — **전부를 보는 자리는 호스트뿐이다.**
- `MainActivity`의 기존 익명 `LynxViewClient`에 `onReceivedError` 하나를 더해 `CrashReporting.onLynxError(error)`로 넘긴다.
- 받는 코드 범위는 둘이다: `200 ≤ code < 300` → `js-background`, `1100 ≤ code < 1200` → `js-main-thread`. 그 밖(이미지 · 리소스 · 레이아웃 등 네이티브 오류)과
  `level`이 `warn`인 것은 받지 않는다 — URL이 실리고 양이 많다.

### D2. 에러 경계가 잡은 렌더 예외는 `reportCrash`가 같은 통로로 한 번 넘긴다

- `ErrorBoundary.componentDidCatch`가 기존 `console.error` 뒤에 `reportCrash(error)`를 한 번 부른다(`apps/mobile/src/lib/crash-report.ts`). 그 함수는
  `lynx.reportError(crashReportableFrom(thrown))`를 **정확히 한 번** 부르고 → D1과 같은 길로 호스트에 닿는다. 경계가 잡은 것은 런타임이 따로 올리지 않으므로 중복이 없다(맥락 4).
- **던지지 않는다.** `lynx`가 없거나 `lynx.reportError`가 함수가 아니면 아무것도 하지 않고, 그 호출이 던지면 삼킨다 — 수집이 앱을 죽이지 않는다.
  수집기가 없는 호스트(iOS · Lynx Explorer)에서는 런타임이 그 오류를 자기 방식으로 다룬다.
- `Error`는 같은 참조로, 문자열은 그대로, 그 밖의 값(객체 · 숫자 · `null` · `undefined`)은 `new Error("Non-error value thrown")`로 넘긴다. **임의 객체를 문자열로 풀지 않는다** —
  안에 무엇이 들었는지 모른다.
- 에러 화면의 props · state · 렌더 결과 · test-id · 재시도 동작은 바뀌지 않았다. `getDerivedStateFromError`에서는 부르지 않는다(렌더 단계라 두 번 불릴 수 있다).

### D3. 새 호스트 모듈을 열지 않는다 — ADR-0017 D1 판정

`registerModule` 추가 0, [호스트 모듈 표](README.md#호스트-모듈-표)의 행 추가 0.

| ADR-0017 D1의 조건 | 판정 |
|---|---|
| 1. 화면 목록이 요구한다 | **통과하지 못한다** — 이 능력을 요구하는 화면이 `docs/screens.md`에 없다(화면 변화 0) |
| 2. 스택 안에 대체 경로가 0개 | **통과하지 못한다 — 이것이 모듈을 열지 않은 근거다.** 대체 경로가 D2다: 공개 API `lynx.reportError` → 호스트의 `onReceivedError`. 훑은 자리는 `@lynx-js/types@4.1.0`의 두 스레드 타입 · ReactLynx 0.125.0 런타임 · Lynx 4.0.1 코어 JS · Lynx AAR의 `classes.jar`(맥락 2 ~ 5), 그리고 그 길이 실제로 닿는지는 기기에서 봤다(「확인한 것」 1) |
| 3. `docs/e2e/`의 흐름 항목으로 적을 수 있다 | 해당 없음(모듈을 열지 않는다). 수집 자체의 판정 흐름은 [크래시 리포팅 e2e](../e2e/crash-reporting.md)가 진다 |

⚠ **요구사항의 범위(「JS가 넘긴 예외를 받는 호스트 모듈」)와 다르다.** 요구사항의 제약 칸이 ADR-0017 D1을 들었고 실물 확인에서 대체 경로가 나와 계약 단계가 바꿨다 —
**사용자 확인 전이다**(「사용자 확인 필요」 U1). 계약은 「경계가 잡은 오류가 호스트에 닿지 않으면 모듈을 여는 쪽으로 정정한다」를 조건으로 걸었고, 그 조건은 발동하지 않았다(A3 통과).

### D4. 개인 정보는 호스트의 한 깔때기에서 지우고 자른다 — 순서는 지우기 → 자르기

- 런타임이 올리는 길(D1)은 JS를 거치지 않으므로 JS 쪽 필터가 닿지 않는다. 구현이 하나여야 규칙이 갈리지 않는다. 그래서 요구사항의 「넘기는 값의 모양 · 차단을 단위 테스트로」는
  vitest가 아니라 **호스트의 순수 함수와 JUnit**이 진다.
- **닫힌 모양.** `CrashReportPayload`의 필드는 넷뿐이다 — `source` · `name` · `message` · `stackLines`. 사용자 id · 화면 이름 · props · 전역 상태를 실을 자리가 없다.
  상한은 이름 80자 · 메시지 300자 · 스택 30줄 · 줄당 400자(줄 · 열이 줄 끝에 있어 **뒤쪽**을 남긴다).
- **지우기의 정본은 `CrashScrub.scrub`이다.** 일곱 규칙을 이 순서로 적용한다: URL의 쿼리 · 프래그먼트 → `?[redacted]` · 이메일 → `[email]` · Bearer 토큰 → `Bearer [token]` ·
  JWT → `[token]` · 32자 이상의 불투명한 값(갱신 토큰 · API 키 · 해시 · 사용자 UUID) → `[token]` · 숫자 9개 이상의 전화번호 · 긴 숫자 → `[number]` ·
  ASCII 밖 글자(한글 등 — 학습 답 · 음성 인식 결과 · 이름) → `[text]`. 패턴과 기준 벡터 열다섯은 계약 §3.2가 정본이고 JUnit(`CrashScrubTest`)이 그 표를 그대로 쓴다.
- **Sentry로 나가는 모든 이벤트**(JS 예외 · Java 크래시 · ANR · tombstone)는 `CrashEventPolicy.beforeSend`를 한 번 더 지난다: `user` · breadcrumb · `serverName` · `request`를 지우고
  `contexts.device.name`을 비우며(기기 이름에 사람 이름이 들어간다) 예외 `value`와 메시지 본문을 `scrub` 뒤 300자로 자른다. 안에서 실패하면 **`null`을 돌려 그 이벤트를 버린다** —
  지우지 못한 것을 보내지 않는다.
- `io.sentry`를 import하는 호스트 소스는 `CrashEventPolicy` · `CrashReporting` 둘뿐이다(결선 검사 GW-S7).

**실측에 따른 파싱 규칙 둘**(계약 §11, 커밋 `1c626045`). 호스트에 도착하는 문자열은 JSON 한 덩이였고 깔때기는 그 안의 `rawError.message` · `rawError.stack`만 읽는다
(「확인한 것」 2). 메인 스레드 오류는 모양이 달라 두 줄을 더했다:

1. `rawError.message`가 `main-thread.js exception: `로 시작하면 그 접두를 떼고 trim한 뒤 이름을 나눈다 — 실측 메시지가 `main-thread.js exception: Error: probe-main-thread `(끝 공백)이라
   그대로 두면 이름이 늘 `Error`로 떨어졌다.
2. 스택의 첫 비공백 줄이 `backtrace:`면 버린다 — 그대로 두면 지문의 넷째 값이 모든 메인 스레드 오류에서 같아 한 이슈로 묶인다.

판정은 실측 문자열을 고정값으로 넣은 JUnit(`CrashReportPayloadObservedTest` — 고치기 전 5건 중 3건 실패 → 통과)이다. **고친 뒤 기기에서 다시 돌리지는 않았다**(파싱이 순수 함수라
실측 문자열로 판정했다).

### D5. SDK는 `io.sentry:sentry-android-core:8.60.0` 하나다

- `sentry-android`(core + ndk + replay 묶음) · `sentry-android-ndk` · `sentry-android-replay` · Sentry Gradle 플러그인을 넣지 않는다(결선 검사 GW-S1).
  core AAR은 `.so`가 0개이고 minSdk 21이다 [확인]. JVM 테스트용으로 `testImplementation 'org.json:json:20260814'` 하나가 늘었다.
- **NDK를 넣지 않는 이유는 맥락 7이다** — `verify*NativeAlignment`가 깨진다. 네이티브(C/C++) 크래시는 core의 `TombstoneIntegration`(`ApplicationExitInfo` 기반)으로 받는다.
  그래서 **C/C++ 크래시는 API 30 이상에서만, 심볼 없는 프레임으로** 올라간다 — 요구사항의 「네이티브 크래시 수집」을 좁힌 것이고 사용자 확인 전이다(U3).
  Java/Kotlin 크래시와 ANR은 전 버전에서 받는다.
- JS 쪽 npm 의존은 0이다([ADR-0013](0013-dependencies-and-version-notation.md) D5의 목록 변화 없음).

### D6. 초기화는 손으로, DSN이 유효할 때만 — DSN 없는 빌드에서는 Sentry 코드가 한 줄도 돌지 않는다

- 자동 초기화를 끈다: 매니페스트에 `io.sentry.auto-init=false`를 두고 core AAR이 병합하는 provider 둘(`SentryInitProvider` · `SentryPerformanceProvider`)을
  `tools:node="remove"`로 걷는다(결선 검사 GW-S4). DSN 없는 자동 초기화는 시작에서 실패한다.
- `DuruApplication.onCreate`가 `super.onCreate()` 바로 뒤 **첫 일**로 `CrashReporting.start(this)`를 부른다(Fresco · Lynx 초기화의 크래시도 잡히게 — GW-S6).
  `CrashReportConfig.dsnFrom(BuildConfig.SENTRY_DSN)`이 `null`이면 `io.sentry`를 부르지 않고 sink 없는 깔때기를 세운다. `SentryAndroid.init`이 던지면 삼키고 같은 상태로 떨어진다 —
  앱 시작을 막지 않는다.
- DSN은 `^https://[A-Za-z0-9]+@[A-Za-z0-9.-]+/[0-9]+$`를 통과해야 한다. 빈 값 · `http://` · `key:secret@` 옛 형식 · 경로 뒤 꼬리는 전부 「없음」이다.
- 깔때기의 결말은 다섯이다 — `REJECTED`(받지 않는 오류) · `DISABLED`(sink 없음) · `OVER_BUDGET` · `FAILED`(보내다 던짐 — 삼킨다) · `SENT`. `onLynxError`는 던지지 않는다.
  `BuildConfig.DEBUG`일 때만 `DuruCrash` 태그로 결말 · 코드 · 원문 앞 500자를 한 줄 찍는다(탐침용 — release형 빌드에는 로그가 없다).
- 옵션은 명시로 고정한다(계약 §4 표 — `CrashReporting.start`가 그대로 싣는다). 요지: `sendDefaultPii` 끔 · breadcrumb 0(`maxBreadcrumbs` 0 + `beforeBreadcrumb`이 전부 버림 + 자동 breadcrumb 여섯 끔) ·
  성능 추적 끔 · 스크린샷 · 뷰 계층 첨부 끔(화면에 학습 답 · 이름이 있다) · 외부 저장소 · 루트 검사 · 모듈 목록 · 서버 이름 끔 · 세션 추적 켬 · Java 크래시 켬 · ANR 켬 ·
  tombstone 켬 · 과거 ANR · 과거 tombstone · tombstone 원문 첨부 끔 · NDK · scope sync 끔.

### D7. DSN은 추적하지 않는 빌드 설정으로 넣고, `debug`는 늘 보내지 않는다

- 읽는 순서: 환경 변수 `SENTRY_DSN` → 추적하지 않는 `apps/android/sentry.properties`의 `dsn` → `""`. `BuildConfig.SENTRY_DSN`으로 들어간다.
  파일이 없어도 빌드는 실패하지 않는다 — `google-services.json`과 같은 태도다. `.gitignore`에 `apps/android/sentry.properties` 한 줄이 있다(GW-S5).
- **`debug`는 DSN이 있어도 `""`다**(GW-S2). dev 서버 · HMR 오류가 수집기를 더럽힌다. `release`가 DSN을 읽고 `bundled`는 `initWith release`로 물려받는다.
  요구사항의 「DSN이 있으면 초기화된다」를 좁힌 것이고 사용자 확인 전이다(U5).
- `environment`는 `BuildConfig.BUILD_TYPE`(`release` | `bundled`), `release`는 `<applicationId>@<versionName>+<versionCode>`(예: `libitum.duru.android@0.1.0+2`),
  `dist`는 `versionCode`다.

### D8. R8 매핑은 플러그인 없이 Gradle 작업으로 올린다 — 인증 값이 다 있을 때만

- `app/sentry.gradle`(`apply from:` — `native-alignment.gradle`과 같은 꼴)이 `Exec` 작업 `uploadSentryMappingRelease`를 등록하고 `bundleRelease`의 `finalizedBy`로 건다.
  `sentry-cli upload-proguard --uuid <UUID> --org <org> --project <project> <mapping.txt>`를 부르며, 토큰은 환경 변수로만 넘긴다(명령줄에 싣지 않는다).
  토큰 · 조직 · 프로젝트(`SENTRY_AUTH_TOKEN`/`auth.token` · `SENTRY_ORG`/`defaults.org` · `SENTRY_PROJECT`/`defaults.project`)가 **모두** 있을 때만 돌고,
  아니면 한 줄 로그 뒤 SKIPPED다(GW-S3). `bundled`용 `uploadSentryMappingBundled`는 등록만 하고 어디에도 매달지 않는다(기기 확인 때 손으로).
- **매핑 UUID는 빌드 전에 정해지는 이름 기반 UUID다** — `applicationId:versionName:versionCode:buildType`에서 만든 값을 `BuildConfig.SENTRY_PROGUARD_UUID`와
  `sentry-cli --uuid`가 같이 쓴다. `sentry-cli` 3.8.0에 `--uuid`가 남아 있음은 [확인](GitHub 소스).
- keep 규칙은 AAR이 싣고 온다. `app/proguard-rules.pro`는 **추가 0**이다(9줄 그대로 — [ADR-0052](0052-android-release-shrinking.md) D2).

### D9. JS 소스맵은 이번 조각에 넣지 않는다

줄여진 줄 · 열 그대로 보낸다. 계약을 고정할 때 호스트에 도착하는 스택의 실제 모양을 몰랐고 DSN도 없어 풀리는지 볼 수 없었다. 뒤에서 풀 수 있게
**스택 원문(30줄) · `release` · `dist`**를 싣는다. 도착 스택의 모양은 A단계가 기록했다(「확인한 것」 2) — 넣는 일은 [보류 표](README.md#보류-표)에 있다.

### D10. 사용자 식별자를 붙이지 않는다 (계약 기본값 — 사용자 확인 전)

`beforeSend`가 이벤트의 `user`를 지우고 `options.setDistinctId(null)`로 세션의 설치 id를 끈다. SDK 기본값은 「설치 id 붙임」이라(맥락 8) 끄는 줄이 계약에 있어야 한다.
붙이는 선택지와 그때 달라지는 것은 「사용자 확인 필요」 U2와 [Android 데이터 보안](../android-data-safety.md)이 진다.

### D11. JS 예외는 `handled = true`로 보내고, 프로세스당 20건까지만 보낸다

- JS 예외 이벤트: `level = error` · 예외 하나(`type` = 이름, `value` = 메시지) · `mechanism.type = "lynx"` · `mechanism.handled = true` · 태그 `lynx.source` ·
  지문 넷(`"lynx"` · source · 이름 · 첫 스택 줄 — 스택이 없으면 메시지) · `contexts.lynx.stack`에 스택 원문. 그 밖의 필드를 채우지 않는다.
- **`handled = true`인 이유**: 앱이 죽지 않았다. `false`면 Sentry가 그 세션을 crashed로 세어 「크래시 없는 세션 비율」이 JS 오류로 떨어진다 [추론 — Sentry의 세션 규칙. B단계에서 확인].
- **20건 상한**(`CrashReportBudget`): 렌더 루프 · 타이머에서 같은 오류가 초당 수십 번 날 수 있다. 받지 않는 오류와 sink 없는 상태는 예산을 쓰지 않는다.
- 같은 버그가 두 스레드에서 각각 던지면(첫 렌더) 이벤트가 둘 생긴다 — `source`가 달라 구분되고, 막지 않는다 [정적 — 기기에서 재지 않았다].

### D12. 무엇을 재는가 — 제품 분석 이벤트는 추가하지 않는다

| 지표 | Sentry에서 재는 것 | 이 결정이 대는 재료 |
|---|---|---|
| M1 크래시 없는 세션 비율 | Release Health — `release = libitum.duru.android@<versionName>+<versionCode>`, `environment = release` | 세션 추적 켬. JS 예외는 `handled = true`라 crashed로 세지 않는다 |
| M2 주간 JS 예외 건수 · 상위 원인 | 태그 `lynx.source`가 있는 이벤트 수(7일) · 이슈별 묶음 | 태그 · 지문 넷 · 예외 `type`/`value` |
| M3 네이티브 크래시 건수 | 태그 `lynx.source`가 **없는** `level:fatal` 이벤트(Java 크래시 · tombstone) + ANR | SDK 통합. 통합별 mechanism 이름은 [미확인 — B단계에서 기록] |

지표 셋은 요구사항 단계가 적은 것을 계약이 그대로 받았다 — **사용자 미확인이다.** PostHog 이벤트는 늘지 않았다([ADR-0029](0029-product-analytics-posthog.md) 변화 0).

## 확인한 것과 확인하지 못한 것

### 확인한 것 — e2e A단계 [실측]

2026-10-13, AVD `R6_API30`(API 30 · arm64-v8a 에뮬레이터), DSN 없이, HEAD `3dcf0292`. **에이전트가 실행했고 사람이 다시 보지 않았다.** 절차와 원문 줄은
[크래시 리포팅 e2e](../e2e/crash-reporting.md)의 「도착한 문자열」 · 「실행 기록」에 있다.

1. **다섯 길이 모두 `onReceivedError`에 닿는다** — 탐침 1회에 `DuruCrash` 줄이 정확히 1줄(중복 보고 없음).

   | 오류 | 코드 | 도착한 `rawError.message` | 그 밖 |
   |---|---|---|---|
   | 에러 경계가 잡은 렌더 예외(background) | 201 | `Error: probe-render` | 에러 화면이 섰다. dev 번들 · 운영 모드 번들 둘 다(debug APK) |
   | 이벤트 핸들러의 동기 throw | 201 | `TypeError: probe-handler` | 앱은 계속 돈다 |
   | 거부된 promise | 201 | `unhandled rejection: probe-reject` | **원래 오류의 이름은 남지 않는다**(런타임이 그렇게 올린다) |
   | `setTimeout` 콜백의 throw | 201 | `Error: probe-timer` | `pid`가 `INTERNAL_ERROR`(나머지는 `USER_ERROR` — 깔때기는 `pid`를 읽지 않는다) |
   | 메인 스레드 스크립트 예외 | 1101 | `main-thread.js exception: Error: probe-main-thread ` | 스택 첫 줄이 `backtrace:` → D4의 파싱 규칙 둘 |

2. **도착 문자열은 JSON 한 갈래였다.** 최상위 키는 `rawError{stack, message, cause}` · `pid` · `url` · `dynamicComponentPath` · `sentry{…}`다. 평문 갈래는 한 번도 쓰이지 않았으나
   코드에 남겨 뒀다. `rawError.stack`에는 머리 줄(`Error: …`)이 없고 `    at …` 프레임 줄만 있다. 프레임의 파일 자리는 dev 번들 `/.rspeedy/main/background.js:<줄>:<열>`,
   운영 번들 `/.rspeedy/main/background.<해시>.js:<줄>:<열>`(함수 이름이 줄여져 있다), 코어 `/lynx_core.js:…`다.
3. **LogBox(빨간 오버레이)는 뜨지 않았다** — dev 번들 + debug 호스트, 다섯 탐침 모두.
4. **DSN 없는 빌드**: `testDebugUnitTest`(JUnit 121건 · 실패 0) · `assembleDebug` · `assembleBundled` 성공, `verify*NativeAlignment` 통과, bundled · debug APK에 `libsentry*.so` 0개,
   병합 매니페스트에 provider 둘 없음, `bundled` 설치 · 실행에서 logcat에 `Sentry` · `DuruCrash` 태그 0줄. `uploadSentryMappingBundled` · `uploadSentryMappingRelease`는
   **이름으로 불렀을 때** SKIPPED였다(assemble 작업 그래프에는 들어 있지 않다). R8 쪽 수치는 [ADR-0052](0052-android-release-shrinking.md)의 적용 기록 ⟨2026-10-13⟩이 진다.
5. **자동 계층**(root 실행): vitest unit 1,871/1,871 · ui 1,461/1,461 · integration 533/533, 호스트 JUnit 126/126(파싱 규칙을 고친 뒤), Gradle 결선 검사 134/134(GW-S1 ~ S7 포함).

### 확인하지 못한 것 [미확인]

1. **Sentry에 실제로 도착한 것이 없다.** 깔때기가 만드는 payload · 지문 · 이벤트의 모습, 지우기가 Sentry 화면에서 `[email]` · `[number]` · `[text]`로 보이는지,
   `handled = true`가 세션을 crashed로 세지 않는지, `user` · `did` · `ip_address`가 원문에 없는지, 난독화된 Java 스택이 매핑으로 풀리는지, M1 ~ M3 쿼리가 수를 내는지 —
   전부 B단계다. A단계의 깔때기는 다섯 번 모두 `DISABLED`에서 끝났다.
2. **`bundled`(R8) APK에서의 도착.** 진단 로그가 debug 전용이라 축소한 빌드에서 `onReceivedError`가 불리는지 볼 수단이 없었다. 운영 모드 **번들**은 debug APK로 한 번(경계 탐침만) 봤다.
3. **release 빌드.** `:app:bundleRelease`는 `google-services.json`이 없어 돌리지 않았다 — release 변형의 R8 · 정렬 검사 · `finalizedBy`로 매달린 업로드 작업의 동작을 보지 못했다.
4. **tombstone.** API 30 이상에서 C/C++ 크래시가 실제로 오는지, 프레임이 읽을 만한지, API 30 미만에서 무슨 일이 나는지.
5. **서버 쪽.** Sentry 프로젝트의 데이터 지역(US/EU), 「IP 주소 저장 안 함」 설정이 켜져 있는지, 보존 기간. 프로젝트는 사용자가 만들었고 이 회차는 그 설정을 보지 않았다.
6. **탐침에 없던 길**: `requestAnimationFrame` 콜백 · 생명주기 이벤트 · ref · data processor의 throw([정적]으로만 안다), 첫 렌더에서 두 스레드가 각각 보고하는지,
   `error.getLevel()`의 실제 값(로그에 찍히지 않았다), 이번 실행의 background JS 엔진이 무엇이었는지.
7. **API 30 에뮬레이터 한 대뿐이다.** 다른 API 수준 · 실기 · 로그인 뒤 화면(탐침은 로그인 없이 닿는 온보딩 화면에 넣었다 — 경계가 루트에 하나라 같은 경계가 잡는다)은 보지 않았다.
8. **Android AAR이 싣는 코어 JS**가 맥락 2에서 읽은 iOS Pod 사본과 같은 파일인지.
9. **수집기가 없는 호스트에서 경계가 잡은 오류가 어떻게 보이는지.** `reportCrash`는 iOS 호스트 · Lynx Explorer에서도 `lynx.reportError`를 부른다(D2). DevTool이 켜진 debug 호스트 ·
   Explorer에서 그 호출이 LogBox를 띄우는지는 보지 않았다 — 본 것은 Android debug 호스트 하나다(위 3). release형 빌드의 화면이 그대로라는 것도 iOS에서는 [정적]이다.

## 잡지 못하는 것

A5 · A6의 측정은 「안 나오는 길」을 찾는 것이었고 **탐침한 다섯 길에서는 하나도 나오지 않았다.** 아래는 설계가 잡지 않는 것과 아직 모르는 것이다.

1. **코드 범위 밖의 Lynx 오류**(이미지 · 리소스 · 레이아웃 등 — 200번대 · 1100번대가 아닌 것)와 `warn` 수준. 받지 않기로 정했다(D1).
2. **프로세스당 스물한 번째부터의 JS 예외**(D11). 건수는 그만큼 낮게 세어진다.
3. **거부된 promise의 원래 오류 이름.** `unhandled rejection`으로만 온다 — 지문도 그 이름으로 묶인다.
4. **API 30 미만 기기의 C/C++ 크래시**, 그리고 모든 기기에서 그 프레임의 심볼(D5).
5. **`debug` 빌드의 모든 오류**(D7)와 **DSN 없이 만든 빌드의 모든 오류**(D6).
6. **iOS에서 난 모든 것.** 이번에는 iOS에서 아무것도 나가지 않는다 — `reportCrash`는 iOS에서도 `lynx.reportError`를 부르지만 받는 수집기가 없다.
7. **`beforeSend`가 실패한 이벤트**(D4 — 버린다)와 **`SentryAndroid.init`이 던진 실행의 모든 오류**(D6 — sink 없이 돈다). 둘 다 조용하다.
8. 「확인하지 못한 것」 6의 길들 — 닿는지 모른다.

## 사용자 확인 필요

아래는 **root와 계약 단계의 권고값으로 진행한 것이고 사용자가 확인하지 않았다.** 번호는 계약 §9를 따른다.

| # | 물음 | 진행한 값 | 다른 선택지와 달라지는 것 |
|---|---|---|---|
| U1 | 호스트 모듈을 열지 않는 것(D3) | 열지 않는다 | 요구사항대로 `CrashReportModule`을 열면 ADR-0017 D1 조건 1 · 2의 예외를 적어야 하고, 지우기 구현이 JS · Java 둘이 되며, JS 번들이 더 는다 |
| U2 | 사용자 식별자(D10) | 안 붙임 | 「몇 명이 겪었나」를 못 센다. SDK 설치 id를 붙이면 Play 양식에 「기기 또는 기타 ID」가 늘고, PostHog의 로그인 전 익명 id(실행마다 새 값 — ADR-0029 D8)보다 **오래 남는 식별자**가 된다. 로그인 사용자 id를 붙이면 양식의 「사용자 ID」 · 처리방침 개정 · 계정 삭제 때 Sentry 쪽 삭제 절차가 든다. 어느 쪽이든 `beforeSend` · `setDistinctId` 두 줄만 바뀐다 |
| U3 | C/C++ 크래시의 범위(D5) | API 30 이상만, 심볼 없음 | NDK를 넣으려면 `sentry-native`를 16 KB RELRO로 다시 빌드해 `vendor-maven`에 싣는다(Lynx · Fresco 선례) |
| U5 | `debug`는 DSN이 있어도 보내지 않는다(D7) | 안 보낸다 | 보내게 하려면 `environment = debug`로 가르되 dev 서버 오류가 섞인다 |
| — | 조각 순서(Android → iOS → Renovate → 랜딩 → Edge Functions) | 이 순서로 시작했다 | 사용자 발화는 「Sentry 달고」 · 「랜딩에도 달 것」 · 「추천 방안 하나씩 진행」까지다. 자른 순서는 root의 판단이다 |
| — | 측정 지표 셋(D12) | M1 ~ M3 | 요구사항 단계가 적었다 |

사용자 몫으로 남은 것(U4 · U6 — Sentry 프로젝트의 지역 · 설정, 처리방침 · Play 양식 제출)과 U7(JS 번들 상한 — 올리지 않았다)은 [보류 표](README.md#보류-표)와 「대가」 5가 진다.

## 버린 대안

1. **JS 쪽에 Sentry SDK** — JS 번들 여유가 1,063 bytes였고(맥락 6), 넣어도 거부된 promise와 메인 스레드 오류는 JS를 거치지 않아 보지 못한다(맥락 3).
2. **`@sentry/lynx-react` 미리보기 패키지** — 요구사항 단계가 범위에서 뺐다(추천 방안으로 진행한 것 — 마지막 릴리스가 2025-09-03이다).
3. **호스트 모듈 `CrashReportModule.report(source, name, message, stack)`** — ADR-0017 D1 조건 2를 통과하지 못한다(D3). 대체 경로가 닿는 것을 기기에서 봤다.
4. **`sentry-android-ndk`** — 16 KB 검사 실패(맥락 7).
5. **Sentry Gradle 플러그인(6.23.0)** — 자동 설치 · 바이트코드 계측 · 텔레메트리 · 의존성 보고를 끄는 스위치가 여럿이고, [ADR-0052](0052-android-release-shrinking.md)의 산출물 검사(dex 재현)에
   주는 영향을 확인하지 못했다 [추론]. 대가는 「대가」 1.
6. **JS에서 `lynx.reportError`를 감싸 가로채기** — 내부(`lynxCoreInject.tt`)에 기대야 하고, 그래도 네이티브로 바로 가는 길은 못 본다(D1).

## 대가

1. **플러그인을 쓰지 않는 값.** ① `sentry-cli`를 출시하는 기계에 따로 깔아야 한다 — 토큰이 있는데 CLI가 없으면 `uploadSentryMappingRelease`가 **실패한다**(조용히 넘어가지 않는다).
   ② 매핑 UUID가 매핑 내용이 아니라 버전에서 나온다 — 같은 `versionCode`로 코드를 바꿔 다시 빌드해 올리면 Sentry의 매핑이 덮인다(Play가 `versionCode` 중복을 받지 않으므로
   출시본에는 일어나지 않는다). ③ 소스 컨텍스트 · 의존성 보고가 없다. 얻는 것은 빌드 그래프에 서드파티 작업 · 계측이 0이라는 것이다.
2. **소스맵을 미루는 값.** Sentry의 JS 예외는 줄여진 줄 · 열로 보인다. 지문에 줄여진 첫 프레임이 들어가므로 **같은 버그가 릴리스마다 다른 이슈로 갈린다.** 열을 손으로 푸는 절차는
   계약이 정하지 않았다.
3. **지우기의 남는 위험.** ASCII로 된 짧은 사용자 입력(영문 이름 · 8자리 이하 숫자)은 패턴으로 가릴 수 없다. 길이 상한이 노출 폭을 묶을 뿐이다
   ([Android 데이터 보안](../android-data-safety.md)에 그대로 적었다). 반대로 지우기는 넓게 건다 — 한글 메시지는 통째로 `[text]`가 되고 32자 이상의 식별자는 `[token]`이 된다.
4. **debug 로그에는 지우기 전 원문이 찍힌다.** `DuruCrash` 줄은 도착 문자열의 앞 500자이고, 그 JSON에는 Lynx 코어가 붙이는 `sentry` 덩이(이 저장소의 Sentry와 무관하다 —
   호스트는 읽지 않는다)의 `exception.values[].value` · `tags.extra`에 원문 메시지가 한 번 더 실려 있다 [실측]. debug 빌드의 logcat에 한정된 일이고 밖으로 나가는 길은 없다 [추론 — `fromLynxError`는 `rawError`만 읽는다].
5. **JS 번들의 여유가 더 줄었다.** `main.lynx.bundle`은 이 브랜치에서 1,721,178 bytes [실측], 상한 1,722,000과의 여유는 **822 bytes**다. 상한은 올리지 않았다. 기준 커밋의 번들을 이 회차에
   다시 빌드하지 않아 증가분은 재지 않았다([성능 보고서](../performance/reports/crash-reporting-api30-emulator-01.md)).
6. **Android 쪽 크기와 R8.** `.so`는 늘지 않았다. `bundled`의 `classes.dex`는 3,552,224 bytes다 [실측] — Sentry를 넣기 전 값은 이 회차에 재지 않았다.
   core AAR의 consumer 규칙이 앱 전체에 세 줄을 건다(`-keepattributes LineNumberTable,SourceFile` · `-keep,allowshrinking,allowobfuscation class * extends java.lang.Throwable` ·
   `-keeppackagenames io.sentry.**`) — [ADR-0052](0052-android-release-shrinking.md) 적용 기록.
7. **`pnpm verify`와 CI에는 Gradle이 없다.** 깔때기의 판정(JUnit)은 `cd apps/android && ./gradlew :app:testDebugUnitTest`로 손으로 돌려야 한다. verify 안에서 지켜지는 것은
   vitest와 Gradle 결선의 정적 검사(`pnpm test:android-bundle`)뿐이다.
8. **요구사항에서 달라진 자리가 다섯이다** — 호스트 모듈 없음 · 잡히지 않은 JS 예외가 JS 보고 함수를 거치지 않음 · 지우기와 그 판정이 호스트 Java로 · C/C++ 크래시는 API 30 이상 tombstone만 ·
   debug는 안 보냄. 전부 계약 단계가 근거와 함께 바꾼 것이고 사용자 확인 전이다.

## 재검토 조건

1. **B단계에서 `user` · `did` · `ip_address` 가운데 하나라도 원문에 있으면** — D10의 전제가 틀렸다. 끄는 줄을 다시 본다.
2. **B단계에서 JS 예외가 세션을 crashed로 세면** — D11의 `handled = true` 근거가 틀렸다.
3. **매핑 누락이 실제로 생기거나 CI 출시 자동화가 서면** — D8을 Sentry Gradle 플러그인으로 바꿀지 본다.
4. **DSN을 넣은 빌드가 돌고 도착 스택이 Sentry에서 읽기 어려우면** — D9의 소스맵을 넣는다(도착 스택의 모양은 이미 기록됐다).
5. **네이티브(C/C++) 크래시가 Sentry에 실제로 보이거나 API 30 미만 기기의 비중이 문제가 되면** — D5의 NDK를 `vendor-maven` 재빌드로 넣을지 본다(U3).
6. **「몇 명이 겪었나」가 필요해지면** — D10(U2).
7. **Lynx · ReactLynx를 올리면** — 맥락 2 ~ 5와 「확인한 것」 1 · 2를 다시 본다. 도착 문자열의 모양과 코드(201 · 1101)는 공개 계약이 아니라 이 버전의 관찰이다.
   D4의 파싱 규칙 둘(`main-thread.js exception: ` · `backtrace:`)이 그 관찰에 기대어 있다.
8. **경계가 잡은 오류가 어느 호스트에서 닿지 않는 것이 관찰되면** — D3을 다시 본다(계약 U1의 (나)).
9. **iOS 조각을 열 때** — D1 ~ D4를 iOS에서 다시 판정한다. 지우기 규칙(D4)이 둘째 구현을 갖게 되므로 기준 벡터를 두 호스트가 같이 쓰게 할 수단을 먼저 정한다.
