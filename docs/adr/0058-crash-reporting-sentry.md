# ADR-0058 — 크래시 리포팅: JS 예외는 Lynx의 오류 통로로 호스트에 모으고, Android 호스트가 Sentry로 보낸다 (호스트 모듈 없음 · 한 깔때기 · NDK 없음)

- 상태: **제안** — 구현과 `pnpm verify` 안의 계층, 기기 확인 둘(e2e A단계 — DSN 없이, B단계 — DSN을 넣은 `bundled`)이 돌았다. ⚠ **이벤트 5건과 세션이 기기를 떠났으나 Sentry가 받았는지는 아직
  아무도 보지 않았다** — B단계가 본 것은 기기 밖으로 나가기 직전의 envelope 원문과 「네트워크를 켜자 캐시가 비었다」까지다. 「Sentry 화면에 이렇게 보인다」는 문장은 여전히 전부 [미확인]이고,
  대시보드에서 찾을 `event_id` 다섯은 e2e 문서의 B단계 실행 기록에 있다(사용자 몫).
  ⟨2026-10-13⟩ **사용자가 계약 기본값 셋을 확정했다**: 호스트 모듈 없이 `lynx.reportError`로 받기(U1) · 오류에 사용자 식별자를 붙이지 않기(U2) · debug 빌드는 보내지 않기(U5). 같은 날
  C/C++ 크래시는 「Android 12 이상에서 오는지 먼저 확인」을 골랐고(그 확인용 Android 14 `google_apis` 이미지 내려받기를 승인), 시스템 라이브러리의 로드 주소는 「남는 위험으로 두고 보낸다」를 골랐다.
  아래 「사용자 결정」 절.
  ⚠ **아직 사용자 확인이 없는 것이 셋 남았다** — 조각 순서 · 측정 지표 셋 · NDK를 넣을지(U3의 최종 결론). 그래서 상태는 `제안`에 머문다(「사용자 확인 필요」 절).
  ⚠ **측정 M1(크래시 없는 세션 비율)은 지금 믿을 수 없다** — 콜드 스타트마다 방금 시작한 세션의 가짜 `exited`가 써지고 크래시로 죽은 앞 세션은 끝 기록 없이 버려진다 [실측 — API 34 · API 30]. 원인은 조사 중이다(「대가」 12).
  **사용자 결정 · 사용자가 한 일은 여기까지다**: 「Sentry로 간다」 · 「랜딩에도 단다」 · 「추천 방안을 하나씩 진행한다」(2026-10-13), 그리고 같은 날 Sentry에서 프로젝트 셋(Android · iOS · Astro)을
  만들고 Android DSN을 추적하지 않는 `apps/android/sentry.properties`에 넣었다. 그 파일에 `auth.token` · 조직 · 프로젝트 이름은 아직 없다 — **매핑 업로드는 설정되지 않았다.**
  데이터 지역은 사용자에게 확인받지 못했다(B단계에서 빌드에 들어간 DSN의 호스트가 `…ingest.us.sentry.io` 계열이었다는 관찰만 있다).
  ⟨2026-10-13 정정⟩ 리뷰 1회차가 FAIL(Critical 1 — 설치 id가 `contexts.device.id`로 나갈 뻔했다)을 냈고 계약 · 구현 · 이 문서가 고쳐졌다. 아래 「정정 기록」.
  ⟨2026-10-13 정정 — B단계⟩ **C/C++ 크래시의 범위가 틀려 있었다**: 「API 30 이상에서 tombstone으로 받는다」고 적었으나 API 30에서 이벤트가 오지 않았다(D5). 그리고 B단계에서 나간 5건에는
  기기 부팅 시각(`contexts.device.boot_time`)이 실려 있었다 — 그 뒤 `438cc723`부터 지운다(D4).
  ⟨2026-10-13 정정 — tombstone 측정⟩ **API 34에서는 tombstone 이벤트가 온다** [실측]. 그 이벤트에 설치마다 무작위인 앱 설치 경로가 48번 실려 있어 첫 회차는 보내지 않았고, `1130979c`부터 `beforeSend`가 지운다(D4).
  B단계 기록의 「SEGV로 죽은 세션이 `exited`」는 잘못 읽은 것이었다(「정정 기록」).
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
8. **SDK는 기본으로 설치 id를 세 자리에 붙인다** [확인 — 정적, AAR 바이트코드]. 이벤트의 `user.id = Installation.id(context)`, 세션의 `distinctId`(사용자 설정 콜백보다 **앞**에 돈다),
   그리고 **`contexts.device.id`** — `DefaultAndroidEventProcessor` · `ApplicationExitInfoEventProcessor`가 넣고 `sendDefaultPii`와 무관하다. 「안 붙임」은 기본값이 아니라 **세 자리를 각각 꺼야** 하는 것이다.
   셋째 자리는 계약을 고정할 때 보지 못했고 리뷰가 찾았다(「정정 기록」).

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
**⟨2026-10-13⟩ 사용자가 이 결정을 확정했다**(「사용자 결정」 U1). 계약은 「경계가 잡은 오류가 호스트에 닿지 않으면 모듈을 여는 쪽으로 정정한다」를 조건으로 걸었고, 그 조건은 발동하지 않았다(A3 통과).

### D4. 개인 정보는 호스트의 한 깔때기에서 지우고 자른다 — 순서는 사전 상한 → 지우기 → 자르기

- 런타임이 올리는 길(D1)은 JS를 거치지 않으므로 JS 쪽 필터가 닿지 않는다. 구현이 하나여야 규칙이 갈리지 않는다. 그래서 요구사항의 「넘기는 값의 모양 · 차단을 단위 테스트로」는
  vitest가 아니라 **호스트의 순수 함수와 JUnit**이 진다.
- **닫힌 모양.** `CrashReportPayload`의 필드는 넷뿐이다 — `source` · `name` · `message` · `stackLines`. 사용자 id · 화면 이름 · props · 전역 상태를 실을 자리가 없다.
  상한은 이름 80자 · 메시지 300자 · 스택 30줄 · 줄당 400자(줄 · 열이 줄 끝에 있어 **뒤쪽**을 남긴다).
- **이름은 알려진 꼴만 받는다.** `<이름>: <메시지>`로 나뉘어도 이름이 `…Error` · `…Exception`(대문자로 시작) · `Error` · `unhandled rejection`이 아니면 이름은 `Error`로 두고 **원문 전체를 메시지로**
  돌려 지우기를 지나게 한다. 이름은 지우기를 지나지 않고 지문에도 들어가므로, 문자열 throw `"kimsehyun: …"`의 앞부분이 이름 · 지문으로 나가는 길을 막는다.
- **사전 상한을 지우기 앞에 둔다.** 상수 셋(`CrashReportPayload`): 도착 원문 전체 `TEXT_PRE_MAX = 65,536`(넘으면 앞에서 자른 뒤 파싱) · 메시지 `MESSAGE_PRE_MAX = 2,000` ·
  스택 줄 `STACK_LINE_PRE_MAX = 800`(뒤쪽을 남기고, 잘랐다면 첫 구분자 — 공백 · `/` · `(` — 까지의 앞 토막을 버린다). `beforeSend`가 다루는 예외 `value` · 메시지 본문도 `MESSAGE_PRE_MAX`를 먼저 지난다.
  **메시지를 사전 상한에서 자를 때는 잘린 끝의 마지막 공백 뒤 토막을 버린다** — 잘린 이메일 · 토큰 조각이 지우기 패턴에 안 맞는 채 빠져나가지 않게 한다(공백이 하나도 없으면 그대로 두고, 그 한 덩이는 불투명 값 규칙이 지운다).
  근거: 상한이 없던 지우기는 구분자 없는 50,000자 한 덩이에 **18초대**가 걸렸고(제곱 시간 — 이 콜백은 메인 스레드에서 돈다), 사전 상한 뒤에는 같은 입력이 **0.1초 안**(0.06 ~ 0.08초)에 끝난다
  [실측 — 데스크톱 JVM의 JUnit `CrashPreCapTest`]. **Android의 정규식 엔진(ICU)에서의 수치는 [미확인]이다** — 기기에서 잰 적이 없다.
- **지우기의 정본은 `CrashScrub.scrub`이다.** 아홉 규칙을 이 순서로 적용한다: URL의 쿼리 · 프래그먼트 → `?[redacted]` · **스킴 없는 쿼리 꼬리**(`?` 뒤에 `key=`가 오는 것) → `?[redacted]` ·
  이메일 → `[email]` · **점 없는 이메일**(`kim@localhost`, 단 `@` 앞이 Java 클래스 이름 꼴(마지막 조각이 대문자로 시작)이고 뒤가 16자 이하 16진수인 `android.os.BinderProxy@4a5b6c7` 꼴은 Java 식별 해시라 두고 간다) → `[email]` · **인증 머리**(`Bearer …` 뒤 값 전부, `Basic …`은 뒤 값이 base64 꼴 — 숫자 · `+` · `/` · 대문자가 한 번이라도 든 8자 이상 — 일 때. JSON · `=` · 줄바꿈 등 머리 꼴과 무관. `the basic idea` 같은 낱말은 두고 간다) → `<머리> [token]` · JWT → `[token]` ·
  32자 이상의 불투명한 값(갱신 토큰 · API 키 · 해시 · 사용자 UUID) → `[token]` · 숫자 9개 이상의 전화번호 · 긴 숫자 → `[number]` · ASCII 밖 글자(한글 등 — 학습 답 · 음성 인식 결과 · 이름) → `[text]`.
  굵게 적은 셋이 리뷰 뒤에 더해졌다(Bearer 규칙이 인증 머리 규칙으로 넓어졌다). 패턴과 기준 벡터 V1 ~ V19는 계약 §3.2 · §11이 정본이고 JUnit(`CrashScrubTest` · `CrashScrubCorrectionTest`)이 그 표를 그대로 쓴다.
- **Sentry로 나가는 모든 이벤트**(JS 예외 · Java 크래시 · ANR · tombstone)는 `CrashEventPolicy.beforeSend`를 한 번 더 지난다: `user` · breadcrumb · `serverName` · `request`를 지우고,
  **`contexts.device.id`**(SDK가 넣는 설치 id — D10) · `contexts.device.name`(기기 이름에 사람 이름이 들어간다) · **`contexts.device.boot_time`**(밀리초 단위 부팅 시각 — 재부팅 전까지 한 기기의 이벤트를 서로 잇는 값이다. B단계에서 실려 나간 것을 본 뒤 `438cc723`에서 더했다)을 비우고, 예외 `value`와 메시지 본문을 사전 상한 → `scrub` → 300자로 다루고,
  **`Message.params`를 지운다**(형식 문자열에 끼울 인자 원문). **⟨`1130979c`⟩ 무작위 앱 설치 경로를 지운다** — 예외 · 스레드의 스택 프레임 `package` · `filename` · `abs_path` · `module`과
  `debug_meta.images[]`의 `code_file` · `debug_file`에서 `/data/app/~~<무작위>==/<패키지>-<무작위>==/`를 `/data/app/[install]/`로 바꾼다(Android가 설치 · 업데이트마다 정하는 디렉터리라 같은 설치의 모든 네이티브 크래시를 잇는다.
  JUnit `CrashInstallPathTest`, 호스트 JUnit 160/160). **시스템 라이브러리의 로드 주소는 지우지 않는다**(사용자 결정 — 「대가」 15). 안에서 실패하면 **`null`을 돌려 그 이벤트를 버린다** — 지우지 못한 것을 보내지 않는다.
- **깔때기는 `StackOverflowError`도 삼킨다.** `fromLynxError` · `CrashReporter.report` · `CrashReporting.onLynxError` · `beforeSend`의 catch가 `RuntimeException | StackOverflowError`다
  (깊게 중첩된 JSON이 Lynx 콜백으로 오류를 올려 보내지 않게). `fromLynxError`는 그때 `null`(받지 않음)이고 **`beforeSend`는 그 이벤트를 버린다.** `OutOfMemoryError`는 삼키지 않는다.
  ⚠ **실제 오버플로 입력은 재현하지 못했다** — JVM 테스트가 쓰는 `org.json`에는 중첩 상한이 있어 깊은 JSON이 오버플로까지 가지 않는다. 테스트가 본 것은 「깊이 6,000의 JSON에 던지지 않는다」와
  「sink가 `StackOverflowError`를 던지면 `FAILED`」까지이고(`CrashStackOverflowTest`), Android 내장 `org.json`에서의 동작은 [미확인]이다.
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
- **NDK를 넣지 않는 이유는 맥락 7이다** — `verify*NativeAlignment`가 깨진다. 계약은 네이티브(C/C++) 크래시를 core의 `TombstoneIntegration`(`ApplicationExitInfo` 기반, `setTombstoneEnabled(true)`)으로
  받는다고 적었다.
- ⚠ **그 범위는 틀렸다.** 지금 확인된 범위는 이렇다 — **API 30에서는 오지 않고, API 34에서는 온다. API 31 ~ 33 · 실기 · 그 밖의 수준은 [미확인]이다.**
  - **API 30** [실측 — B5, 에뮬레이터 1대, `bundled`]: `setTombstoneEnabled(true)`인 빌드에서 `kill -SEGV` 뒤 재실행했으나 tombstone 이벤트가 생기지 않았고, `sdk.integrations`에 tombstone 통합의 이름이 없었다.
    시스템은 그 종료를 `APP CRASH(NATIVE)`로 기록했다.
  - **API 34** [실측 — `google_apis` 에뮬레이터 1대, 세 회차, `bundled`]: 같은 조작 뒤 재실행에서 이벤트가 왔다 — `platform: native` · `level: fatal` · `mechanism{type: Tombstone, handled: false, synthetic: true}` ·
    `sdk.integrations`에 `Tombstone`. 크래시 스레드의 프레임 **함수 이름이 풀려 있었고**(심볼 없는 주소만이 아니다 — 시스템 라이브러리 · `liblynxbase.so`의 `lynx::fml::…` 등), 스레드 49개의 스택 · 크래시 순간의 레지스터 ·
    `debug_meta.images` 327개가 실렸다. **외부 신호(SIGSEGV)로 확인한 것이다** — 크래시 스레드는 프레임워크 대기 프레임뿐이었고, 앱 라이브러리(`liblynx*.so`) 안에서 난 크래시의 프레임 모양은 [미확인]이다.
    R8로 줄인 Java 프레임은 줄인 이름 그대로 실렸다.
  - **API 37** — 16 KB 이미지의 임시 AVD가 부팅되지 않아(하이퍼바이저 가속 실패) 재지 못했다.
  - [추론] 플랫폼이 네이티브 크래시의 tombstone을 `ApplicationExitInfo`로 읽게 해 주는 것이 API 31부터라 API 30이 대상이 아니었을 것이다 — 이 회차에 플랫폼 문서를 조회하지 않았고 31 ~ 33은 돌려 보지 않았다.
- **이 앱의 `minSdk`는 26이다** — 26 ~ 30 기기의 C/C++ 크래시(Lynx 엔진 안의 크래시 포함)는 Sentry에 오지 않는다고 보고 다룬다. 그 범위까지 받으려면 NDK가 필요하다([보류 표](README.md#보류-표)의 NDK 행).
  **NDK를 넣을지는 사용자 확인 전이다**(U3의 최종 결론 — 사용자가 고른 것은 「Android 12 이상에서 오는지 먼저 확인」까지이고 그 확인이 API 34에서 「온다」로 나왔다).
- **세션 쪽**: 네이티브로 죽은 세션은 `crashed`로 끝나지 않는다 — 끝 기록 없이 버려진다 [실측 — API 34]. 원인 조사 중인 세션 문제와 같은 것이다(「대가」 12).
- Java/Kotlin 크래시는 받는다 — B4에서 `UncaughtExceptionHandler` 이벤트가 죽는 순간 캐시에 써지고 같은 envelope의 세션이 `crashed`가 되는 것을 봤다 [실측]. ANR은 통합(`AnrV2`)이 켜져 있다는 것까지만
  봤고 이벤트는 유도하지 않았다 [미확인].
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
- 옵션은 명시로 고정한다(계약 §4 표 — `CrashReporting.start`가 그대로 싣는다). 그 가운데 열 줄(`setSendDefaultPii(false)` · `setDistinctId(null)` · `setBeforeSend(` · `setBeforeBreadcrumb(` ·
  `setMaxBreadcrumbs(0)` · `setAttachScreenshot(false)` · `setAttachViewHierarchy(false)` · `setEnableNdk(false)` · `setTracesSampleRate(null)` · `setSendModules(false)`)은 **결선 검사 GW-S8이 지킨다** —
  한 줄이 빠지면 `pnpm test:android-bundle`이 떨어진다. 나머지 옵션은 검사가 없다. 요지: `sendDefaultPii` 끔 · breadcrumb 0(`maxBreadcrumbs` 0 + `beforeBreadcrumb`이 전부 버림 + 자동 breadcrumb 여섯 끔) ·
  성능 추적 끔 · 스크린샷 · 뷰 계층 첨부 끔(화면에 학습 답 · 이름이 있다) · 외부 저장소 · 루트 검사 · 모듈 목록 · 서버 이름 끔 · 세션 추적 켬 · Java 크래시 켬 · ANR 켬 ·
  tombstone 켬 · 과거 ANR · 과거 tombstone · tombstone 원문 첨부 끔 · NDK · scope sync 끔.

### D7. DSN은 추적하지 않는 빌드 설정으로 넣고, `debug`는 늘 보내지 않는다

- 읽는 순서: 환경 변수 `SENTRY_DSN` → 추적하지 않는 `apps/android/sentry.properties`의 `dsn` → `""`. `BuildConfig.SENTRY_DSN`으로 들어간다.
  파일이 없어도 빌드는 실패하지 않는다 — `google-services.json`과 같은 태도다. `.gitignore`에 `apps/android/sentry.properties` 한 줄이 있다(GW-S5).
- **`debug`는 DSN이 있어도 `""`다**(GW-S2). dev 서버 · HMR 오류가 수집기를 더럽힌다. `release`가 DSN을 읽고 `bundled`는 `initWith release`로 물려받는다.
  요구사항의 「DSN이 있으면 초기화된다」를 좁힌 것이고 **⟨2026-10-13⟩ 사용자가 확정했다**(U5).
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

### D10. 사용자 식별자를 붙이지 않는다 (⟨2026-10-13⟩ 사용자 결정)

SDK가 설치 id를 싣는 자리가 셋이고(맥락 8) 셋을 각각 끈다.

| SDK가 싣는 자리 | 끄는 줄 |
|---|---|
| 이벤트의 `user.id` | `beforeSend`의 `setUser(null)` |
| 세션의 `distinctId` | `options.setDistinctId(null)`(GW-S8) |
| **이벤트의 `contexts.device.id`**(`sendDefaultPii`와 무관) | `beforeSend`의 `device.setId(null)` — JS 예외 · Java 크래시 · ANR · tombstone 모든 이벤트 |

- 판정은 JUnit(`CrashEventPolicyTest`)이 진다 — `beforeSend`를 지난 이벤트에 `user`와 `device.id`가 없다.
- ✔ **기기 밖으로 나가기 직전의 envelope에서 넷이 없는 것을 봤다** [실측 — B6, API 30 에뮬레이터 1대 · `bundled`(R8) · 새로 설치한 앱]. JS 예외 이벤트 4건 · Java 크래시 이벤트 1건 · 세션 전부의 원문에
  `user` · `did` · `ip_address` · `contexts.device.id`가 없었고, 그 기기의 설치 id 파일 내용과 `android_id`를 envelope 전체에서 문자열로 찾아 **0건**이었다. envelope 헤더에도 `user` 계열이 없다.
  **서버가 접속에서 붙이는 IP는 기기에서 볼 수 없다** [미확인 — 프로젝트 설정 「IP 주소 저장 안 함」에 달려 있다]. 아래 문단은 그 전의 기록이다.
- ⟨B6 이전⟩ **실제 payload에서 정말 없는지는 아직 아무도 보지 않았다** [미확인]. SDK가 `beforeSend` **뒤에** 식별자를 다시 붙이는 자리가 없다는 것, 세션 쪽 `did`가 비어 있다는 것은
  Sentry가 받은 원문(JSON)으로만 확인된다 — [크래시 리포팅 e2e](../e2e/crash-reporting.md)의 **B6**이 `user` · `did` · `ip_address` · `contexts.device.id` 넷을 본다.
  **B6이 통과하기 전에는 「식별자를 수집하지 않는다」를 Play 양식에 내지 않는다**([Android 데이터 보안](../android-data-safety.md)) — ⟨B6 뒤⟩ 기기 쪽 근거는 섰다. 양식에 내기 전에 남은 것은
  서버 쪽(IP 저장 설정)과 **식별자는 아니지만 같은 실행 · 같은 기기를 잇는 값**(`trace_id` 등 — 「대가」 13)의 판단이다.
- ⟨tombstone 측정⟩ API 34의 tombstone 이벤트 세 회차에서도 넷 · `boot_time` · 설치 id 파일 · `android_id` · `ro.serialno` 문자열이 0건이었다 [실측]. 첫 회차에서 **설치 경로의 무작위 토막**이 48번 나와 보내지 않았고,
  고친 뒤(`1130979c`) 0건이었다(D4).
- 붙이는 선택지와 그때 달라지는 것은 「사용자 결정」 U2와 데이터 보안 문서가 진다.

### D11. JS 예외는 `handled = true`로 보내고, 프로세스당 20건까지만 보낸다

- JS 예외 이벤트: `level = error` · 예외 하나(`type` = 이름, `value` = 메시지) · `mechanism.type = "lynx"` · `mechanism.handled = true` · 태그 `lynx.source` ·
  지문 넷(`"lynx"` · source · 이름 · 첫 스택 줄 — 스택이 없으면 메시지) · `contexts.lynx.stack`에 스택 원문. 그 밖의 필드를 채우지 않는다.
- **`handled = true`인 이유**: 앱이 죽지 않았다. `false`면 Sentry가 그 세션을 crashed로 세어 「크래시 없는 세션 비율」이 JS 오류로 떨어진다 [추론 — Sentry의 세션 규칙]. B단계의 envelope에서는 JS 예외 4건이 세션의 `errors`만 올리고 `status`를 바꾸지 않았다 [실측] — 서버의 집계가 그렇게 세는지는 [미확인].
- **20건 상한**(`CrashReportBudget`): 렌더 루프 · 타이머에서 같은 오류가 초당 수십 번 날 수 있다. 받지 않는 오류와 sink 없는 상태는 예산을 쓰지 않는다.
- 같은 버그가 두 스레드에서 각각 던지면(첫 렌더) 이벤트가 둘 생긴다 — `source`가 달라 구분되고, 막지 않는다 [정적 — 기기에서 재지 않았다].

### D12. 무엇을 재는가 — 제품 분석 이벤트는 추가하지 않는다

| 지표 | Sentry에서 재는 것 | 이 결정이 대는 재료 |
|---|---|---|
| M1 크래시 없는 세션 비율 | Release Health — `release = libitum.duru.android@<versionName>+<versionCode>`, `environment = release` | 세션 추적 켬. JS 예외는 `handled = true`라 crashed로 세지 않는다 — envelope에서 JS 예외 4건 뒤의 세션은 `errors`만 올랐고 Java 크래시에서 `crashed`가 됐다 [실측]. ⚠ **이 지표는 지금 믿을 수 없다** — 콜드 스타트마다 가짜 `exited`가 써지고 크래시로 죽은 앞 세션이 끝 기록 없이 버려진다(「대가」 12, 원인 조사 중). Sentry 화면의 수치는 [미확인] |
| M2 주간 JS 예외 건수 · 상위 원인 | 태그 `lynx.source`가 있는 이벤트 수(7일) · 이슈별 묶음 | 태그 · 지문 넷 · 예외 `type`/`value` |
| M3 네이티브 크래시 건수 | 태그 `lynx.source`가 **없는** `level:fatal` 이벤트(Java 크래시 · tombstone) + ANR | SDK 통합. Java 크래시의 mechanism은 `UncaughtExceptionHandler`(`handled: false`)였다 [실측 — envelope]. tombstone은 `Tombstone`(`handled: false`) [실측 — API 34 envelope]. ANR의 이름은 [미확인]. ⚠ **C/C++ 크래시는 API 30에서 이벤트가 오지 않았다**(D5) — 26 ~ 30 기기의 엔진 크래시는 이 지표에 잡히지 않는다 |

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
5. **자동 계층**(root 실행): vitest unit 1,871/1,871 · ui 1,461/1,461 · integration 533/533, 호스트 JUnit **160/160**(리뷰 정정 셋 · `boot_time` · 설치 경로 제거 뒤 — 정정 전 126), Gradle 결선 검사 **135/135**(GW-S1 ~ S8).
   리뷰 정정의 테스트 20건은 구현 전에 먼저 서서 14건이 실패했고(나머지는 「잘린 이메일 조각」 · 깊은 JSON 둘 · 멱등 · 알려진 이름 · GW-S8 — 구현 전에도 통과하던 것) 구현 뒤 전부 통과했다.

### 확인한 것 — e2e B단계 [실측]

2026-10-13 14:30 ~ 14:40 KST, 같은 AVD(API 30 · arm64-v8a), **`bundled`(R8 켜짐 · `DEBUG=false`) · DSN 있음 · 운영 번들**, HEAD `b11ef1b6`. **에이전트가 실행했고 사람이 다시 보지 않았다.**
방법: 네트워크를 끊은 채 앱을 새로 설치해 탐침을 돌리고, 캐시에 쌓인 envelope 원문을 기기에서 꺼내 읽은 뒤, 식별자가 없음을 확인하고 네트워크를 켰다. 키 목록 · 지문 · `event_id`는 [크래시 리포팅 e2e](../e2e/crash-reporting.md)의 B단계 실행 기록에 있다.

1. **실제 payload의 모양.** JS 예외 이벤트는 `exception.values[0]`(`type` · `value` · `mechanism{type: lynx, handled: true}`) · 태그 `lynx.source` · `fingerprint` 넷 · `contexts.lynx.stack`으로 나간다(D11 그대로).
   `user` · `breadcrumbs` · `server_name` · `modules` · `request` · `message` · `extra` 키가 **없다.** SDK가 붙인 `contexts.app` · `contexts.device` · `contexts.os` · `contexts.trace` · 태그 `isSideLoaded`의 키 목록은
   [Android 데이터 보안](../android-data-safety.md)이 실측으로 싣는다.
2. **식별자 부재**(D10) — `user` · `did` · `ip_address` · `contexts.device.id` 없음, 설치 id · `android_id` 문자열 0건. JS 이벤트 4건과 Java 크래시 1건 모두.
3. **지우기가 실제 이벤트에서 동작한다.** `probe-b a@b.co 010-1234-5678 한글 GET /auth/v1/verify?token=123456&type=sms`를 던진 이벤트의 `value`가
   `probe-b [email] [number] [text] GET /auth/v1/verify?[redacted]`였고, envelope 전체(메시지 · 지문 · 스택)에서 원문 조각이 0건이었다. 지문에는 메시지가 들어가지 않았다(첫 스택 줄).
4. **운영 번들 · R8 APK에서도 오류가 호스트에 닿고, 메인 스레드의 접두와 `backtrace:`가 같다.** A단계가 debug APK로만 본 것이 닫혔다 — 경계 렌더 · 핸들러 · 메인 스레드 둘, 네 이벤트가 만들어졌다.
   메인 스레드 원문은 여전히 `main-thread.js exception: TypeError: …`와 `backtrace:` 줄이었고, 이벤트에서는 걷혀 `type: TypeError` · 첫 스택 줄이 프레임이었다 — **D4의 파싱 규칙 둘(`1c626045`)이 기기에서 확인됐다**
   (A단계 뒤에는 JUnit으로만 판정했던 것).
5. **메인 스레드 오류 둘의 지문이 갈린다.** 넷째 값이 `…(main-thread.js:2405:10)`과 `…(main-thread.js:2404:10)`으로 달랐다. **열이 `[number]`가 되지 않았다** — 운영 번들의 메인 스레드 스크립트는 한 줄로
   줄여져 있지 않아 줄 번호로 갈렸고, A6(dev 번들)에서 10자리 열이던 프레임도 운영 번들에서는 `…main-thread.js:2824:65`였다(「정정 기록」의 「남겨 둔 것」이 이 관찰로 닫혔다).
6. **Java 크래시**(`am crash`): 죽는 순간 envelope이 캐시에 써졌다(전송은 다음 실행) — `level: fatal` · `mechanism{type: UncaughtExceptionHandler, handled: false}` · 같은 envelope의 세션 `crashed`.
   `debug_meta`에 매핑 UUID가 `type: proguard`로 실렸다.
7. **세션**: `attrs`의 키는 `release` · `environment` 둘뿐이었다(`libitum.duru.android@0.1.0+2` · `bundled`).
8. **전송 시도**: 네트워크를 켜고 재실행하자 캐시의 envelope 9개가 약 5초 안에 0개가 됐다. **이것은 수신의 증거가 아니다**(아래 1).
9. **B단계에서 나간 5건에는 `contexts.device.boot_time`이 실려 있었다.** 그 뒤 `beforeSend`가 지우게 고쳤다(`438cc723` — 테스트 `rb1_*`). **고친 뒤의 빌드를 기기에서 다시 돌려 envelope을 보지는 않았다.**

### 확인한 것 — tombstone 측정(API 34) [실측]

2026-10-13 15:36 ~ 16:05 KST, 임시 AVD(Android 14 `google_apis` · arm64-v8a), **`bundled`(R8 · DSN 있음 · 탐침 없음)**, 세 회차. **에이전트가 실행했고 사람이 다시 보지 않았다.** 방법은 B단계와 같다 —
오프라인에서 `kill -SEGV`로 죽이고 재실행한 뒤 envelope을 꺼내 읽고, 식별자가 없을 때만 보낸다. 앞서 API 37 이미지를 시도했으나 임시 AVD가 부팅되지 않았다.

1. **tombstone 이벤트가 온다**(D5). 이벤트 최상위 키는 `contexts` · `debug_meta` · `dist` · `environment` · `event_id` · `exception` · `level` · `message` · `platform` · `release` · `sdk` · `tags` · `threads` · `timestamp`
   (`fingerprint` 없음). `message`는 `Fatal signal SIGSEGV (11), SI_USER (0), pid = <PID> (<패키지>)`. `contexts.device`는 14개 키로 B단계보다 적고 `id` · `name` · `boot_time`이 없다. 이벤트 하나가 약 190 KB였다.
2. **1회차에서 설치 경로를 찾아 보내지 않았다.** `/data/app/~~<무작위>==/<패키지>-<무작위>==/`가 `debug_meta.images[].code_file` 7곳 · 스레드 프레임 `package` 41곳, 모두 48곳에 실려 있었다. 고친 뒤(`1130979c`) 2 · 3회차에서 0건,
   `[install]`로 바뀐 자리 48곳.
3. **2회차에서 로드 주소를 찾아 보내지 않았다.** `libc.so` · `libandroid_runtime.so` · `boot-framework.oat`의 `image_addr`가 `system_server`와 재실행한 앱 프로세스의 `/proc/<pid>/maps`에 적힌 주소와 같았다 —
   zygote가 미리 올린 시스템 라이브러리는 **재부팅 전까지 기기 전체에서 같은 주소**다. 사용자가 「남는 위험으로 두고 보낸다」를 골랐다(「대가」 15).
4. **3회차는 보냈다.** tombstone `event_id` `eeab5ab5c65e4e1380bc0f8989720c2f`(발생 07:02:40 UTC · KST 16:02:40, 전송 07:03:46 ~ 49 UTC). 네트워크를 켜자 envelope 7개가 3초 안에 비워졌고 연결 오류 로그는 없었다.
   **수신은 미확인이다**(대시보드는 사용자 몫).
5. **세션 문제를 찾았다**(「대가」 12).

### 확인하지 못한 것 [미확인]

1. **Sentry가 받았는지.** SDK의 debug 로그가 꺼져 있어 HTTP 응답을 보지 못했다. 캐시가 비는 것은 수신 성공뿐 아니라 SDK가 재시도하지 않는 거절 응답에서도 일어날 수 있다 [추론]. 대시보드에서
   `event_id` 다섯을 찾아야 닫힌다(사용자 몫 — e2e 문서).
2. **대시보드 쪽 표시 전부.** 이슈가 어떻게 묶여 보이는지, `handled`가 화면에서 어떻게 읽히는지, 크래시 없는 세션 비율의 수치, M1 ~ M3 쿼리(B7), 서버가 붙이는 `ip_address`와 프로젝트의 IP 저장 설정,
   데이터 지역(사용자 확인), 보존 기간.
3. **매핑 업로드와 풀린 스택.** 인증 토큰이 없어 `sentry-cli upload-proguard --uuid`는 한 번도 돌지 않았다. 그리고 **`am crash`가 만드는 이벤트는 프레임 7개가 전부 프레임워크 프레임이라
   매핑을 올려도 「풀린 클래스 이름」을 확인하는 데 쓸 수 없다** — 앱 코드에서 던지는 Java 크래시가 따로 필요하다(e2e B4의 절차를 그렇게 고쳤다).
4. **ANR 이벤트.** 유도하지 않았다. ANR 스레드 덤프 첨부의 SDK 기본값도 바이트코드로 확인하지 않았다.
5. **tombstone의 나머지 범위**(D5) — API 31 ~ 33 · 35 이상 · 실기, 앱 라이브러리 안에서 난 크래시의 프레임, 같은 크래시가 다음 실행에서 다시 보고되는지, 앱 자신의 라이브러리 주소가 실행마다 바뀌는지. 3회차 tombstone의 수신.
6. **`captureEvent`에 걸리는 시간.** 직접 재지 못했다. 간접 값만 있다 [추론]: Lynx가 오류를 낸 로그 줄부터 호스트 콜백이 돌아온 뒤의 로그 줄까지 첫 이벤트 7 ms · 둘째 2 ms였고, 그 구간에는
   깔때기와 `captureEvent` 말고 다른 리스너도 들어 있다. 에뮬레이터 한 대 · 두 표본이다.
7. **release 빌드.** `:app:bundleRelease`는 `google-services.json`이 없어 돌리지 않았다 — release 변형의 R8 · 정렬 검사 · `finalizedBy`로 매달린 업로드 작업의 동작을 보지 못했다. B단계는 `bundled`다.
8. **B단계 탐침에 없던 것**: 거부된 promise · 타이머 throw의 **이벤트** 모양(A단계는 도착까지만 봤다), 온라인 상태에서 바로 보낼 때의 envelope(전부 오프라인에서 만들어 나중에 보냈다),
   `requestAnimationFrame` 콜백 · 생명주기 이벤트 · ref · data processor의 throw([정적]으로만 안다), 첫 렌더에서 두 스레드가 각각 보고하는지, `error.getLevel()`의 실제 값, background JS 엔진이 무엇이었는지.
9. **API 30 에뮬레이터 한 대뿐이다.** 다른 API 수준 · 실기 · 로그인 뒤 화면(탐침은 로그인 없이 닿는 온보딩 화면에 넣었다 — 경계가 루트에 하나라 같은 경계가 잡는다)은 보지 않았다.
10. **Android AAR이 싣는 코어 JS**가 맥락 2에서 읽은 iOS Pod 사본과 같은 파일인지.
11. **수집기가 없는 호스트에서 경계가 잡은 오류가 어떻게 보이는지.** `reportCrash`는 iOS 호스트 · Lynx Explorer에서도 `lynx.reportError`를 부른다(D2). 본 것은 Android 호스트뿐이다. iOS 자체 호스트는 리뷰가
    Lynx 4.0.1 소스(`LynxTemplateRender.mm`)를 읽어 「로그 한 줄이 새로 생길 뿐이다(DevTool pod 없음)」로 판정했다 [정적] — 기기에서 본 것은 아니고, Lynx Explorer의 LogBox는 여전히 [미확인]이다.
12. **기기에서의 지우기 시간.** D4의 수치는 데스크톱 JVM의 것이다. Android(ICU 정규식)에서 사전 상한 뒤의 최악 입력이 얼마 걸리는지는 재지 않았다.
13. **`StackOverflowError`를 실제로 일으키는 입력에서의 동작**(D4 — JVM 테스트로 재현하지 못했다).
14. ~~**`boot_time`을 지운 뒤의 실제 envelope**~~ — API 34 tombstone 측정의 envelope(`438cc723` 뒤 빌드)에 `boot_time`이 없었다. JS 예외 이벤트로는 다시 보지 않았다.
15. **세션 문제의 원인**(「대가」 12) — 조사 중.

## 잡지 못하는 것

A5 · A6의 측정은 「안 나오는 길」을 찾는 것이었고 **탐침한 다섯 길에서는 하나도 나오지 않았다.** 아래는 설계가 잡지 않는 것과 아직 모르는 것이다.

1. **코드 범위 밖의 Lynx 오류**(이미지 · 리소스 · 레이아웃 등 — 200번대 · 1100번대가 아닌 것)와 `warn` 수준. 받지 않기로 정했다(D1).
2. **프로세스당 스물한 번째부터의 JS 예외**(D11). 건수는 그만큼 낮게 세어진다.
3. **거부된 promise의 원래 오류 이름.** `unhandled rejection`으로만 온다 — 지문도 그 이름으로 묶인다.
4. **API 30 이하 기기의 C/C++ 크래시**(D5) — API 30에서 오지 않는 것을 봤고 그 아래도 올 근거가 없다(`minSdk` 26). Lynx 엔진 안에서 죽는 크래시가 여기 든다. API 31 ~ 33은 [미확인].
5. **`debug` 빌드의 모든 오류**(D7)와 **DSN 없이 만든 빌드의 모든 오류**(D6).
6. **iOS에서 난 모든 것.** 이번에는 iOS에서 아무것도 나가지 않는다 — `reportCrash`는 iOS에서도 `lynx.reportError`를 부르지만 받는 수집기가 없다.
7. **`beforeSend`가 실패한 이벤트**(D4 — `RuntimeException` · `StackOverflowError` 모두 버린다. Java 크래시 · ANR · tombstone 이벤트도 같다)와 **`SentryAndroid.init`이 던진 실행의 모든 오류**(D6 — sink 없이 돈다). 둘 다 조용하다.
8. 「확인하지 못한 것」 8의 길들 — 닿는지 모른다.

## 사용자 결정

아래는 **실제 사용자 발화다**(2026-10-13). 번호는 계약 §9를 따른다.

| # | 물음 | 결정 | 그 결과 |
|---|---|---|---|
| U1 | 호스트 모듈을 열지 않는 것(D3) | **확정 — 호스트 모듈 없이 `lynx.reportError`로 받는다** | 호스트 모듈 표에 행이 늘지 않는다. 지우기 구현은 Java 하나다 |
| U2 | 사용자 식별자(D10) | **확정 — 붙이지 않는다** | 「몇 명이 겪었나」를 못 센다. 붙이는 쪽으로 바꾸면 `beforeSend` 두 줄과 `setDistinctId` 한 줄이 바뀌고 데이터 보안 양식 · 처리방침이 같이 바뀐다 |
| U5 | `debug`는 DSN이 있어도 보내지 않는다(D7) | **확정 — 보내지 않는다** | dev 서버 · HMR 오류가 섞이지 않는다 |
| — | C/C++ 크래시(U3의 앞 단계) | **「Android 12 이상에서 오는지 먼저 확인」** — 그 확인을 위해 Android 14 `google_apis` 이미지 내려받기를 승인 | API 34에서 「온다」로 나왔다(D5). NDK를 넣을지는 아래 「사용자 확인 필요」 |
| — | 시스템 라이브러리의 로드 주소 | **「남는 위험으로 두고 보낸다」** | tombstone 이벤트의 `image_addr` · `instruction_addr` · 레지스터를 지우지 않는다(「대가」 15) |

## 사용자 확인 필요

아래는 **root와 계약 단계의 권고값으로 진행한 것이고 사용자가 확인하지 않았다.**

| # | 물음 | 진행한 값 | 다른 선택지와 달라지는 것 |
|---|---|---|---|
| U3 | NDK를 넣을지(D5의 최종 결론) | NDK 없음 — tombstone이 API 34에서 오는 것은 확인됐고 API 30에서는 오지 않는다(31 ~ 33 미확인) | 넣으려면 `sentry-native`를 16 KB RELRO로 다시 빌드해 `vendor-maven`에 싣는다(Lynx · Fresco 선례). `minSdk` 26 ~ 30 기기의 엔진 크래시까지 받게 된다 |
| — | 조각 순서(Android → iOS → Renovate → 랜딩 → Edge Functions) | 이 순서로 시작했다 | 사용자 발화는 「Sentry 달고」 · 「랜딩에도 달 것」 · 「추천 방안 하나씩 진행」까지다. 자른 순서는 root의 판단이다 |
| — | 측정 지표 셋(D12) | M1 ~ M3 | 요구사항 단계가 적었다. M1은 세션 문제가 풀릴 때까지 믿을 수 없다(「대가」 12) |

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
3. **지우기의 남는 위험.** ASCII로 된 짧은 사용자 입력(영문 이름 · 8자리 이하 숫자)은 패턴으로 가릴 수 없다. **경로 조각에 든 이름(`/users/kim.sehyun/profile`)도 지우지 않는다** —
   리뷰가 짚었고 계약이 남는 위험으로 받았다. **tombstone 이벤트의 시스템 라이브러리 로드 주소**도 남는 위험이다(「대가」 15 — 사용자 결정). 길이 상한이 노출 폭을 묶을 뿐이다([Android 데이터 보안](../android-data-safety.md)에 그대로 적었다).
   반대로 지우기는 넓게 건다 — 한글 메시지는 통째로 `[text]`가 되고 32자 이상의 식별자는 `[token]`이 되며, `@`가 든 토막은 이메일이 아니어도 `[email]`이 된다(점 없는 이메일 규칙 — `Class@hex` 꼴만 예외). `func@file:줄:열` 꼴의 스택 프레임은 통째로 `[email]`이 되므로, 다른 호스트(iOS)에 이 규칙을 옮길 때는 스택 형식을 먼저 본다(Android 실측 프레임은 `at f (…)` 꼴).
   **이름을 알려진 꼴로만 받는 값**(D4): `…Error` · `…Exception`으로 끝나지 않는 사용자 정의 오류 이름은 Sentry에서 전부 `Error`로 묶이고 원래 이름은 메시지 앞에 남는다.
   **사전 상한의 값**: 2,000자 넘는 메시지는 잘린 끝 토막까지 버려지고, 65,536자를 넘는 도착 원문은 앞에서 잘린 뒤 파싱한다 — 그때 JSON이 닫히지 않아 평문 갈래로 떨어지므로
   이름은 `Error`, 메시지는 JSON 머리(지우기를 지난 것)가 된다 [정적 — 코드를 읽은 것. 테스트 `rv3e`는 「던지지 않는다」까지만 판정한다].
4. **debug 로그에는 지우기 전 원문이 찍힌다.** `DuruCrash` 줄은 도착 문자열의 앞 500자이고, 그 JSON에는 Lynx 코어가 붙이는 `sentry` 덩이(이 저장소의 Sentry와 무관하다 —
   호스트는 읽지 않는다)의 `exception.values[].value` · `tags.extra`에 원문 메시지가 한 번 더 실려 있다 [실측]. debug 빌드의 logcat에 한정된 일이고 밖으로 나가는 길은 없다 [추론 — `fromLynxError`는 `rawError`만 읽는다].
5. **JS 번들의 여유가 더 줄었다.** `main.lynx.bundle`은 이 브랜치에서 1,721,178 bytes [실측], 상한 1,722,000과의 여유는 **822 bytes**다. 상한은 올리지 않았다. 기준 커밋의 번들을 이 회차에
   다시 빌드하지 않아 증가분은 재지 않았다([성능 보고서](../performance/reports/crash-reporting-api30-emulator-01.md)).
6. **Android 쪽 크기와 R8.** `.so`는 늘지 않았다. `bundled`의 `classes.dex`는 3,552,224 bytes다 [실측] — Sentry를 넣기 전 값은 이 회차에 재지 않았다.
   core AAR의 consumer 규칙이 앱 전체에 세 줄을 건다(`-keepattributes LineNumberTable,SourceFile` · `-keep,allowshrinking,allowobfuscation class * extends java.lang.Throwable` ·
   `-keeppackagenames io.sentry.**`) — [ADR-0052](0052-android-release-shrinking.md) 적용 기록.
7. **`pnpm verify`와 CI에는 Gradle이 없다.** 깔때기의 판정(JUnit)은 `cd apps/android && ./gradlew :app:testDebugUnitTest`로 손으로 돌려야 한다. verify 안에서 지켜지는 것은
   vitest와 Gradle 결선의 정적 검사(`pnpm test:android-bundle`)뿐이다.
8. **요구사항에서 달라진 자리가 다섯이다** — 호스트 모듈 없음 · 잡히지 않은 JS 예외가 JS 보고 함수를 거치지 않음 · 지우기와 그 판정이 호스트 Java로 · C/C++ 크래시는 tombstone만(그마저 API 30에서는 오지 않았다 — D5) ·
   debug는 안 보냄. 전부 계약 단계가 근거와 함께 바꾼 것이고, 호스트 모듈 없음 · debug는 안 보냄은 사용자가 확정했다(2026-10-13). C/C++ 크래시의 범위(NDK)는 사용자 확인 전이다.
9. **스택의 10자리 열 번호가 `[number]`가 된다**(리뷰 S3 — 받지 않았다). 숫자 9개 이상을 지우는 규칙이 줄 · 열을 가리지 않는다. 운영 번들의 열은 걸리지 않는다는 것이 받지 않은 근거였고,
   **B단계의 운영 번들 이벤트에서는 걸린 프레임이 없었다** [실측 — background `…js:7:371`, 메인 스레드 `…:2405:10` · `…:2824:65`]. 걸리는 것이 확인된 것은 dev 번들의 프레임 하나(A6 `…:7122:2473963297`)뿐이고
   dev 번들은 debug 빌드라 보내지 않는다. 번들이 커져 열이 9자리를 넘으면 다시 걸린다.
10. **`finalizedBy`는 실패한 빌드 뒤에도 업로드를 시도한다**(리뷰 S5 — 받지 않았다). `bundleRelease`가 실패해도 인증 값이 다 있으면 `uploadSentryMappingRelease`가 돌아 오류 한 줄이 더 찍힌다
    (매핑 파일이 없으면 그 작업도 실패한다). 빌드 결과를 바꾸지는 않는다.
11. **수집이 메인 스레드에서 동기로 돈다**(리뷰 S4 — 이번에 고치지 않았다). `onReceivedError` → 깔때기 → `Sentry.captureEvent`가 호출 스레드에서 기기 정보를 모은다. 사전 상한(D4)이 지우기의 시간을 묶었으나
    `captureEvent` 쪽 시간은 **B단계에서도 직접 재지 못했다** — 간접 값 2 ~ 7 ms(「확인하지 못한 것」 6)가 전부다. 오류가 연달아 나도 프로세스당 20건이 위쪽 한계다.
12. **크래시 없는 세션 비율(M1)은 이 문제가 풀릴 때까지 믿을 수 없다 — 원인 조사 중** [실측 — API 34 세 회차, API 30 B단계 재해석]. 콜드 스타트마다 새 세션이 시작되고 **약 0.03초 뒤 같은 `sid`로 `exited`가 디스크에 써진다**
    (액티비티가 만들어지기도 전이다). 진짜 세션은 메모리에서 계속 살아 배경 전환 30초 뒤 정상으로 끝났다. 그리고 **크래시로 죽은 앞 세션은 끝 기록(`crashed`/`abnormal`) 없이 버려진다** — API 34의 SEGV로 죽은 세션이 그랬다.
    그래서 네이티브 크래시가 세션 지표에 `crashed`로 잡히지 않고, 서버가 같은 `sid`의 가짜 `exited`를 어떻게 집계하는지에 따라 세션 수 · 길이도 틀어질 수 있다 [추론 — 서버 집계는 미확인].
    API 30에서도 크래시 뒤의 콜드 스타트에서 같은 일이 났다. [추론] SDK가 시작할 때 앞 실행의 세션을 마무리하는 단계가 방금 쓴 현재 세션 파일을 잘못 읽는 경합으로 보이나 확정하지 않았다.
    **「크래시 없는 세션 99 %」가 크래시가 없다는 뜻이 아니다.** Java 크래시는 B단계(API 30, 새 설치 첫 실행)에서 `crashed`로 붙는 것을 봤으나 이 문제가 있는 한 그것도 믿고 쓰지 않는다([보류 표](README.md#보류-표)의 세션 행).
13. **식별자는 아니지만 서로 잇는 값이 실린다** [실측 — B단계 envelope]. `trace_id`(`contexts.trace`와 envelope 헤더 — 한 프로세스 실행 동안 모든 이벤트가 같고 재실행하면 바뀐다) ·
    `contexts.trace.data.thread.id`(실제로는 프로세스 id였다) · `contexts.app.app_start_time` · `permissions` · `contexts.os.kernel_version` · `build` · 기기의 `timezone` · `locale` · `memory_size` · `storage_size` ·
    태그 `isSideLoaded`. 계약은 이것들을 이름으로 다루지 않았고(「표에 없는 것은 SDK 기본값」) 지우지 않는다 — 같은 실행 안의 이벤트를 묶는 것은 원인 읽기에 쓰이는 값이기도 하다. `boot_time`만 지웠다(재부팅 전까지
    **실행을 넘어** 한 기기를 잇는다). 나머지를 Play 양식의 「사용자와 연결: 아니오」로 볼지는 데이터 보안 문서의 제출 전 확인에 올렸다 — 사용자 확인 전이다.
14. **B단계에서 이미 나간 5건에는 `boot_time`이 들어 있다.** 받아졌다면 Sentry에 남아 있다(에뮬레이터의 값이고 같은 실행의 5건이 같은 값이다). 지울지는 사용자 몫이다.
15. **tombstone 이벤트에 시스템 라이브러리의 로드 주소가 실린다 — 사용자 결정으로 남는 위험이다.** `debug_meta.images[].image_addr`, 프레임의 `image_addr` · `instruction_addr`, 레지스터(`lr` 등)에 실리고,
    zygote가 미리 올린 `libc.so` 등의 주소는 **재부팅 전까지 그 기기의 모든 앱 · 모든 실행에서 같다** [실측 — 다른 프로세스의 `/proc/<pid>/maps`와 일치. 다른 부팅에서는 값이 달랐다]. 그래서 재부팅 사이에 난 tombstone들을,
    원리상 같은 기기의 다른 앱이 보낸 tombstone과도 이을 수 있다 [추론]. 지우면 네이티브 스택을 풀 수 없게 된다(주소 − 이미지 시작 = 라이브러리 안 오프셋). 2026-10-13 사용자가 「남는 위험으로 두고 보낸다」를 골랐다.


## 정정 기록

### 2026-10-13 — 리뷰 1회차 FAIL(Critical 1 · Warning 5)에 따른 정정

결정의 방향(D1 ~ D12)은 그대로이고 D4 · D10의 내용과 맥락 8의 사실이 고쳐졌다. 계약의 정본은 `spec.md` §11 「R 정정」 RV1 ~ RV8, 구현은 `f908be04`다.

- **어떻게 틀렸나 — 설치 id(Critical).** 처음 구현의 `beforeSend`는 `device.name`만 지웠다. SDK는 `contexts.device.id`에도 설치 id를 넣는데(`sendDefaultPii`와 무관) 계약이 그 자리를 보지 못했고,
  이 문서의 앞선 판도 「`user`를 지우고 `distinctId`를 끄면 식별자가 없다」고 적었다. **DSN을 넣어 출시했다면 모든 이벤트에 설치 id가 실려 나갔을 것이다** — 리뷰가 AAR 바이트코드에서 찾았다.
  `docs/android-data-safety.md`의 「기기 또는 기타 ID: 아니오」도 같은 이유로 근거가 틀려 있었다. 이제 `beforeSend`가 `device.id`를 함께 지운다(D10). **실제 payload 확인은 여전히 B6이다.**
- **지우기 순서.** 「지우기 → 자르기」를 「사전 상한 → 지우기 → 자르기」로 고쳤다(D4 — 상한 없는 입력에 제곱 시간, 메인 스레드).
- **지우기 규칙 셋 추가**(스킴 없는 쿼리 · 인증 머리 · 점 없는 이메일 — V16 ~ V19)와 남는 위험 하나(경로 조각의 이름).
- **이름은 알려진 꼴만**, **`Message.params` 제거**, **`StackOverflowError` 삼킴**(D4), **옵션 열 줄을 지키는 결선 검사 GW-S8**(D6).
- **받지 않은 지적 셋**은 「대가」 9 ~ 11에 적었다.
- 같은 날 Sentry 프로젝트의 상태를 한 문장으로 맞췄다(상태 줄 — 프로젝트 셋 · Android DSN은 `sentry.properties`에 · 매핑 업로드 미설정).

### 2026-10-13 — 리뷰 2회차(PASS with warnings)의 경고 처리

- **잘린 스택 줄의 앞 토막을 버린다**(W7). 앞을 자른 자리에 전화번호 · 이메일이 걸치면 조각(`45678/…`)이 9자리 규칙 아래로 떨어져 남았다. 메시지 쪽(끝 토막 버림)과 대칭으로 맞췄다.
- **스택 줄 사전 상한 2,000 → 800**(W6). 메시지 2,000자 + 30줄 × 2,000자가 전부 구분자 없는 덩이면 한 번에 2초대였다 [실측 — 데스크톱 JVM, 리뷰]. 남기는 것이 줄당 뒤 400자라 800으로 충분하다. 고친 뒤의 합계 시간은 다시 재지 않았다.
- **과하게 지우던 둘을 좁혔다**(W8). `BinderProxy@4a5b6c7` 꼴(Java 식별 해시)은 이메일로 보지 않고, 낱말 `basic`은 `authorization` 머리 뒤에서만 인증 머리로 본다. `Bearer`는 그대로다.
- **긴 메시지가 이름을 잃지 않는다**(S6). 이름을 먼저 나누고 메시지에 사전 상한을 건다.
- **넷째 자리는 찾지 못했다** [정적 — AAR 바이트코드]: `Installation.id`를 부르는 곳은 `user.id` · `device.id` · `distinctId`와 하이브리드 SDK용 진입점(core 안에서 부르는 곳 없음)뿐이고, ANDROID_ID · 광고 id · 시리얼을 읽는 코드가 없다. 세션의 `did`는 `distinctId` 그대로다. 실제 payload는 여전히 B6이 닫는다.
- **남겨 둔 것 — ⟨B단계 뒤 갱신⟩.** (가) 「메인 스레드 프레임의 10자리 열이 `[number]`가 되면 이름이 같은 서로 다른 오류가 한 지문으로 묶일 수 있다」(W9)는 [추론]이었고 운영 프레임을 잰 적이 없었다.
  **B단계가 쟀다**: 운영 번들의 메인 스레드 스크립트는 한 줄로 줄여져 있지 않았고, 서로 다른 줄의 오류 둘의 지문 넷째 값이 `…:2405:10` · `…:2404:10`으로 갈렸으며 열은 `[number]`가 되지 않았다 [실측].
  이 번들 · 이 버전의 관찰이다 — 빌드 설정이 메인 스레드 스크립트를 한 줄로 줄이게 바뀌면 다시 열린다. (나) `contexts.device.boot_time`은 B6에서 실려 나간 것을 본 뒤 지우기로 정했다(아래 B단계 정정).
  (다) ANR 스레드 덤프 첨부의 SDK 기본값은 여전히 바이트코드로 확인하지 않았다.
- 판정: `CrashReviewRoundTwoTest` 7건(red 5 → green), JUnit 152/152.

### 2026-10-13 — 리뷰 3회차(PASS with warnings)의 경고 처리

- **W10.** 2회차에 인증 머리를 `authorization` 뒤로 좁히면서 JSON · `=` · 줄바꿈 뒤의 `Basic <base64>`가 다시 나가게 됐다(후퇴). `Basic` 뒤 값이 base64 꼴이면 머리 꼴과 무관하게 지운다.
- **S9.** 16진수 꼬리 예외가 `user@abc123` · `kim@cafe` 같은 점 없는 주소까지 빼냈다. 예외를 `@` 앞이 Java 클래스 이름 꼴일 때로 좁혔다.
- 판정: `CrashReviewRoundThreeTest` 4건(red 2 → green), JUnit 157/157. 재리뷰는 받지 않았다.

### 2026-10-13 — e2e B단계 실측에 따른 정정

- **어떻게 틀렸나 — C/C++ 크래시의 범위.** 계약과 이 문서(D5 · 「잡지 못하는 것」 · U3 · 보류 표 · 호스트 README · 데이터 보안 문서)가 「C/C++ 크래시는 API 30 이상에서 tombstone으로 받는다」고 적었다.
  근거는 core AAR에 `TombstoneIntegration`이 있다는 [정적] 읽기뿐이었고 계약도 「API 30 미만에서의 동작 · 프레임 가독성은 미확인」이라고만 했다. **API 30 에뮬레이터에서 `setTombstoneEnabled(true)`인데
  이벤트가 생기지 않았고 `sdk.integrations`에도 그 이름이 없었다** [실측]. 「API 30 이상」은 근거 없는 경계였다. API 31 이상은 [미확인]이다. 문서 전부를 「확인된 기기 없음」으로 고쳤다.
- **네이티브로 죽은 세션이 `exited`로 적힌다**는 것과 그 대가(크래시 없는 세션 비율이 네이티브 크래시를 세지 못한다)를 「대가」 12에 더했다.
- **`boot_time`.** 리뷰 2회차가 「B6에서 판단」으로 넘겼고, B단계에서 **실제로 전송된(전송을 시도한) 이벤트 5건 모두에 실려 있는 것을 봤다.** 식별자 넷은 아니라 실행자가 멈춤 조건으로 보지 않고 전송을 진행했다.
  그 뒤 `beforeSend`가 `contexts.device.boot_time`도 지우게 고쳤다(`438cc723`, 테스트 `rb1_*`, JUnit 153/153 — root가 직접, 재리뷰 없음). 고친 빌드의 envelope은 기기에서 다시 보지 않았다.
- **`am crash`는 매핑 확인에 쓸 수 없다**(프레임이 전부 프레임워크) — e2e B4의 절차를 고쳤다. **Java 크래시 envelope은 재실행이 아니라 죽는 순간 써진다** — 같은 문서의 문면을 고쳤다.
- 「확인한 것 / 확인하지 못한 것」을 B단계 결과로 다시 썼다. **수신은 여전히 미확인이다.**

### 2026-10-13 — tombstone 측정(API 34)과 세션 관찰에 따른 정정

- **C/C++ 크래시 범위.** B단계 정정의 「확인된 기기 없음」을 「API 30에서는 안 옴 · API 34에서는 옴(외부 SIGSEGV로 확인) · 31 ~ 33 · 실기 미확인」으로 고쳤다(D5). API 37 이미지는 부팅되지 않아 재지 못했다.
- **설치 경로 유출.** API 34의 첫 tombstone 이벤트에 무작위 설치 경로가 48번 실려 있었다 — 계약의 `beforeSend`는 스택 프레임 · `debug_meta`에 손대지 않았다. 그 회차는 보내지 않았고,
  `1130979c`부터 지운다(D4, JUnit 160/160 — root가 직접, 재리뷰 없음). 2 · 3회차에서 0건을 확인했다.
- **로드 주소**는 사용자 결정으로 남는 위험이 됐다(「대가」 15).
- **어떻게 틀렸나 — 세션.** B단계 기록과 이 문서의 앞선 판은 「SEGV로 죽은 세션이 API 30에서 `exited`로 적힌다」고 적었다. 다시 보면 그 `exited`는 **SEGV 뒤 재실행해 새로 시작한 세션의 가짜 `exited`**였고,
  같은 회차의 앞 세션(`am crash`)은 이미 `crashed`로 끝나 있었다. 실제 문제는 콜드 스타트마다 써지는 가짜 `exited`와 크래시로 죽은 세션의 끝 기록이 버려지는 것이다(「대가」 12 — 원인 조사 중).
- **사용자 결정**(U1 · U2 · U5 확정, C/C++ 크래시의 확인 순서, 로드 주소)을 「사용자 결정」 절로 옮겼다. 상태는 `제안` 그대로다 — 조각 순서 · 측정 지표 · NDK가 남았다.

## 재검토 조건

1. **B단계에서 `user` · `did` · `ip_address` · `contexts.device.id` 가운데 하나라도 원문에 있으면** — D10의 전제가 틀렸다. 끄는 줄을 다시 본다.
2. **B단계에서 JS 예외가 세션을 crashed로 세면** — D11의 `handled = true` 근거가 틀렸다.
3. **매핑 누락이 실제로 생기거나 CI 출시 자동화가 서면** — D8을 Sentry Gradle 플러그인으로 바꿀지 본다.
4. **DSN을 넣은 빌드가 돌고 도착 스택이 Sentry에서 읽기 어려우면** — D9의 소스맵을 넣는다(도착 스택의 모양은 이미 기록됐다).
5. **API 30 이하 기기의 Lynx 엔진 크래시를 봐야 하게 되면**(신고는 있는데 Sentry에 아무것도 없는 종료가 쌓일 때), **또는 API 31 ~ 33 · 실기에서 tombstone이 오지 않는 것이 확인되면** — D5의 NDK를 `vendor-maven` 재빌드로 넣을지 본다(U3 — 사용자 확인 전). API 34에서는 온다.
6. **「몇 명이 겪었나」가 필요해지면** — D10(U2).
7. **Lynx · ReactLynx를 올리면** — 맥락 2 ~ 5와 「확인한 것」 1 · 2를 다시 본다. 도착 문자열의 모양과 코드(201 · 1101)는 공개 계약이 아니라 이 버전의 관찰이다.
   D4의 파싱 규칙 둘(`main-thread.js exception: ` · `backtrace:`)이 그 관찰에 기대어 있다.
8. **경계가 잡은 오류가 어느 호스트에서 닿지 않는 것이 관찰되면** — D3을 다시 본다(계약 U1의 (나) — U1은 사용자가 확정했으므로 사용자에게 다시 묻는다).
9. **iOS 조각을 열 때** — D1 ~ D4를 iOS에서 다시 판정한다. 지우기 규칙(D4)이 둘째 구현을 갖게 되므로 기준 벡터를 두 호스트가 같이 쓰게 할 수단을 먼저 정한다.
10. **SDK(`sentry-android-core`)를 올리면** — 맥락 8을 바이트코드로 다시 읽는다. 설치 id를 싣는 자리가 넷째로 늘면 D10의 표가 틀린다(셋째 자리를 놓친 선례가 「정정 기록」이다).
11. **B단계에서 메인 스레드 수집 시간이 화면을 늦추는 것으로 재어지면** — 깔때기를 다른 스레드로 옮길지 본다(「대가」 11).
12. **세션 문제의 원인이 밝혀지면**(「대가」 12) — 초기화 방식(D6)을 바꿔야 하는지 본다. 고쳐질 때까지 M1을 판단에 쓰지 않는다.
