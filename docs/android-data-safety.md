# Android 데이터 보안 — 크래시 수집(Sentry)이 내보내는 것과 Play 양식에 넣을 항목

Android 호스트가 크래시 수집으로 **기기 밖에 내보내는 것**을 코드 근거와 함께 적고, Play Console 「데이터 보안」 양식에 넣을 항목을 준비한다.
iOS 쪽의 짝은 [`docs/ios-privacy.md`](ios-privacy.md)다. 결정과 그 근거는 [ADR-0058](adr/0058-crash-reporting-sentry.md)이 진다 — 여기에는 **무엇이 나가는가**만 적는다.

**이 문서의 범위는 크래시 수집 하나다.** Android 앱이 이미 내보내는 다른 것(Supabase 계정 · 학습 진행 · 피드백 · FCM 토큰 · PostHog 이벤트)의 Play 양식 대조는 이 문서가
하지 않았다 — iOS 쪽 대조표(`ios-privacy.md` 「수집 항목 대조」)에 해당하는 Android 표는 아직 없다.

근거 표시: **[코드]** 저장소 코드와 JUnit · **[실측]** 기기에서 꺼낸 envelope 원문(e2e B단계 — 2026-10-13, API 30 에뮬레이터 1대, `bundled`) · **[정적]** SDK 바이트코드를 읽은 것 · **[추론]** · **[미확인]**.

## 지금 상태 (2026-10-13)

- **출시본은 아직 아무것도 보내지 않는다.** Play에 올라간 빌드에는 DSN이 없다 — DSN 없는 빌드에서는 Sentry 코드가 한 줄도 돌지 않는다(ADR-0058 D6). 사용자가 2026-10-13에 Sentry 프로젝트 셋
  (Android · iOS · Astro)을 만들고 Android DSN을 추적하지 않는 `apps/android/sentry.properties`에 넣었다(`auth.token` · 조직 · 프로젝트 이름은 아직 없다).
- **DSN을 넣은 `bundled` 빌드가 에뮬레이터에서 한 번 돌았다**([크래시 리포팅 e2e](e2e/crash-reporting.md) B단계, 2026-10-13 — 에이전트 실행, 사람 미확인). 네트워크를 끊은 채 만든 이벤트 5건과 세션의 **envelope 원문을 기기에서 꺼내 읽었고**,
  아래 「보내는 것」은 그 원문의 키 목록이다. 그 뒤 네트워크를 켜 전송을 시도했다 — **Sentry가 받았는지는 확인하지 못했다**(캐시가 비워진 것까지. 대시보드 확인은 사용자 몫).
- **그 5건에는 기기 부팅 시각(`contexts.device.boot_time`)이 실려 있었다.** 그 뒤 `438cc723`부터 지운다. 받아졌다면 Sentry에 남아 있다(에뮬레이터의 값이다).
- **서버 쪽에서 본 것은 없다.** Sentry가 접속에서 붙이는 값(IP 등)과 프로젝트 설정은 대시보드로만 확인된다.
- **Play Console 양식은 고치지 않았고 공개 개인정보 처리방침에도 반영하지 않았다.** 둘 다 저장소 밖의 일이고 사용자가 한다(ADR README 보류 표).
- `debug` 빌드는 DSN이 있어도 보내지 않는다. iOS에서는 아무것도 나가지 않는다.

## Play 데이터 보안 양식에 넣을 항목

양식의 항목 이름과 정의는 **이 회차에 Play 문서를 다시 조회하지 않고 적었다** [문서 기억] — 제출할 때 Play Console 화면의 문구와 대조한다.

| 양식의 데이터 유형 | 수집 | 사용자와 연결 | 목적 | 근거 |
|---|---|---|---|---|
| 앱 정보 및 성능 → **비정상 종료 로그** | 예 | **아니오** — 사용자 식별자 · 설치 id를 붙이지 않는다 | 앱 기능 · 분석 | Java/Kotlin 크래시 · JS 예외 [실측] · ANR [미확인 — 통합은 켜져 있으나 이벤트를 본 적이 없다]. **네이티브(C/C++) 크래시는 지금 수집된다고 적을 근거가 없다** — API 30에서 tombstone 이벤트가 오지 않았고 API 31 이상은 미확인이다(아래 「네이티브 크래시」) |
| 앱 정보 및 성능 → **진단** | 예 | **아니오** | 앱 기능 · 분석 | 세션(크래시 없는 세션 비율의 재료 — 시작 · 끝 · 상태) · 이벤트에 붙는 `release` · `environment` · 기기 · OS context |
| 기기 또는 기타 ID | **아니오 — 기기 쪽 근거는 섰다. 서버 쪽 확인 하나가 남았다** | — | — | SDK 기본값은 설치 id를 **세 자리**에 싣는다: 이벤트의 `user.id` · 세션의 `distinctId` · 이벤트의 `contexts.device.id`(`sendDefaultPii`와 무관) [정적 — AAR 바이트코드]. 이 앱은 `beforeSend`에서 `user`와 `device.id`를 지우고 `setDistinctId(null)`로 세션 쪽을 끈다 [코드 — JUnit `CrashEventPolicyTest`]. **기기 밖으로 나가기 직전의 envelope에서 `user` · `did` · `ip_address` · `contexts.device.id`가 없었고, 그 기기의 설치 id · `android_id` 문자열을 envelope 전체에서 찾아 0건이었다** [실측 — 에뮬레이터 1대, `bundled`, JS 이벤트 4건 · Java 크래시 1건 · 세션 전부] |

**식별자 칸의 근거와 남은 것.** 처음 구현은 `contexts.device.name`만 지워 **설치 id가 `contexts.device.id`로 모든 이벤트에 실려 나갈 뻔했고 리뷰가 잡았다**(ADR-0058 「정정 기록」 2026-10-13) —
이 문서의 앞선 판도 그 자리를 모른 채 「아니오」라고 적었고, 그 뒤 판은 「B6 전에는 아니오로 내지 않는다」고 적었다. **B6은 기기 쪽에서 통과했다**(위 표). 양식에 「수집 안 함」을 내기 전에 남은 것은 셋이다:

1. **서버가 붙이는 IP** [미확인]. 기기가 보내는 원문에 `ip_address`가 없다는 것과 Sentry가 접속 IP를 저장하지 않는다는 것은 다른 일이다 — 뒤엣것은 프로젝트 설정 「IP 주소 저장 안 함」에 달려 있고 대시보드로만 확인된다.
2. **표본이 에뮬레이터 한 대 · `bundled` · 한 번의 설치다.** release AAB · 실기 · ANR 이벤트의 원문은 보지 않았다.
3. **식별자는 아니지만 서로 잇는 값**(아래 「보내는 것」의 ⚠ 표시) — 「사용자와 연결: 아니오」로 내기 전에 사용자가 본다.

- **전송 중 암호화**: 예 — DSN은 `https://`로 시작해야 받는다(`CrashReportConfig.dsnFrom`, `http://`는 「DSN 없음」으로 떨어진다) [코드].
- **공유 여부**: Sentry는 개발자를 대신해 처리하는 서비스 제공자다. Play의 정의에서 그런 전달이 「공유」에 들지 않는다는 것은 [문서 기억]이다 — 제출 때 확인한다.
- **수집이 선택인가**: 끄는 설정을 앱에 두지 않았다 — 필수 수집으로 적는다.
- **삭제 요청**: 사용자와 연결되지 않으므로 계정 삭제([ADR-0032](adr/0032-account-sign-out-and-deletion.md))가 Sentry 쪽에서 지울 대상을 특정하지 못한다. Sentry 프로젝트의 보존 기간은 확인하지 않았다 [미확인].
- **IP 주소**: SDK에는 `sendDefaultPii = false`를 준다 [코드]. 수신 서버가 접속 IP를 저장하는지는 Sentry 프로젝트 설정(「IP 주소 저장 안 함」)에 달려 있고 **그 설정이 켜져 있는지 확인하지 않았다** [미확인 — 사용자].
  기기가 보내는 원문에는 `ip_address`가 없었다 [실측 — B6].
- **데이터 지역(US/EU)**: 사용자에게 확인받지 못했다 [미확인 — 사용자]. B단계에서 빌드에 들어간 DSN의 호스트가 `…ingest.us.sentry.io` 계열이었다는 관찰만 있다 — US로 읽히나 [추론] 콘솔에서 확인한다. 프로젝트를 만든 뒤에는 못 바꾼다.

## 보내는 것 — 실측한 키 목록

JS 예외의 네 값은 계약이 닫은 것이고 [코드], 그 밖은 **B단계의 envelope 원문에서 읽은 키다** [실측 — API 30 에뮬레이터 1대, `bundled`(R8), SDK 8.60.0]. 계약은 SDK가 붙이는 context를 이름으로 닫지 않았다
(「표에 없는 것은 SDK 기본값」) — 그래서 **SDK를 올리면 이 목록을 envelope으로 다시 뜬다.** 값은 옮기지 않는다.

### JS 예외 (호스트가 직접 만드는 이벤트)

필드는 **넷뿐이다**(`CrashReportPayload`). 다른 값을 실을 자리가 없다 [코드 — JUnit `CrashReportPayloadTest` · `CrashEventPolicyTest`].

| 값 | 내용 | 상한 | 지우기 |
|---|---|---|---|
| `source` | `js-background` 또는 `js-main-thread`(태그 `lynx.source`) | 닫힌 값 둘 | — |
| 이름 | 예외 이름 — **알려진 꼴만**(`…Error` · `…Exception` · `Error` · `unhandled rejection`). 그 밖의 앞부분(문자열 throw `"kimsehyun: …"` 등)은 이름이 되지 않고 메시지에 남아 지우기를 지난다 | 80자 | 닫힌 꼴이라 지우기를 지나지 않는다 |
| 메시지 | 예외 메시지 | 300자 | 사전 상한 2,000자 → `CrashScrub.scrub` → 자른다 |
| 스택 | 프레임 줄(파일 · 줄 · 열 — 줄여진 그대로) | 30줄 · 줄당 400자(뒤쪽을 남긴다) | 줄마다 사전 상한 800자(뒤쪽, 잘린 앞 토막 버림) → `scrub` |

이벤트에는 그 넷으로 만든 지문(`"lynx"` · source · 이름 · 첫 스택 줄)과 `mechanism`(`lynx` · `handled = true`)이 붙는다. 프로세스당 20건까지만 보낸다.
실제 이벤트에서 넷은 `exception.values[0].type` · `.value` · 태그 `lynx.source` · `contexts.lynx.stack`(줄바꿈으로 이은 문자열)과 `fingerprint`로 나갔다 [실측].

### 이벤트에 실리는 키 (JS 예외 · Java 크래시 공통) [실측]

| 자리 | 키 |
|---|---|
| 이벤트 최상위 | `contexts` · `debug_meta` · `dist` · `environment` · `event_id` · `exception` · `fingerprint`(Java 크래시는 빈 배열) · `level` · `platform` · `release` · `sdk` · `tags` · `timestamp` |
| `tags` | `lynx.source`(JS 예외만) · ⚠ **`isSideLoaded`**(SDK가 붙인다 — 스토어 밖 설치 여부) |
| `debug_meta` | 매핑 UUID(`type: proguard`) |
| `exception.values[]` — JS | `type` · `value` · `mechanism{type, handled}` |
| `exception.values[]` — Java 크래시 | `type` · `value` · `module` · `thread_id` · `stacktrace.frames` · `mechanism{type, handled, exception_id}` |
| `contexts.lynx` | `stack`(JS 예외만) |
| `contexts.app` | `app_build` · `app_identifier` · `app_name` · ⚠ `app_start_time` · `app_version` · `in_foreground` · `is_split_apks` · ⚠ **`permissions`**(권한 이름 → 허용 여부, 7개) · `view_names`(Activity 클래스 이름) |
| `contexts.device` | `archs` · `battery_level` · `battery_temperature` · `brand` · `charging` · `family` · `free_memory` · `free_storage` · `locale` · `low_memory` · `manufacturer` · `memory_size` · `model` · `model_id` · `online` · `orientation` · `processor_count` · `processor_frequency` · `screen_density` · `screen_dpi` · `screen_height_pixels` · `screen_width_pixels` · `simulator` · `storage_size` · `timezone` — **25개.** B단계의 envelope에는 여기에 `boot_time`을 더한 26개가 실려 있었고 `boot_time`은 `438cc723`부터 지운다(고친 뒤의 envelope은 다시 뜨지 않았다 [코드 — JUnit `rb1_*`]). `id` · `name`은 없었다 |
| `contexts.os` | `build` · ⚠ **`kernel_version`** · `name` · `version` |
| `contexts.trace` | ⚠ **`trace_id`** · `span_id` · `op` · `origin` · `data{thread.name, thread.id}`(⚠ `thread.id`) |
| envelope 헤더 | `event_id` · `sdk{name, version, packages, integrations}` · `trace{trace_id, public_key, release, environment, sample_rand}`. `dsn` · `sent_at` · `user` 계열은 없었다 |

**없던 키**(두 종류 모두): `user` · `breadcrumbs` · `server_name` · `modules` · `request` · `message` · `extra` · `transaction` · `threads`.

⚠ **표시한 값은 식별자는 아니지만 이벤트를 서로 잇는 데 쓸 수 있다.**

- **`trace_id`** — 한 프로세스 실행 동안 모든 이벤트가 같은 값이었고(B단계 5건 동일) **재실행하면 바뀌었다.** 실행을 넘어 기기를 잇지는 못한다. envelope 헤더에도 같은 값이 실린다.
- **`thread.id`** — 실제 값은 프로세스 id였다.
- `app_start_time` · `permissions` · `kernel_version` · `build` · `timezone` · `locale` · `memory_size` · `storage_size` · `isSideLoaded` — 하나하나는 식별자가 아니고, 여럿을 합치면 기기를 좁히는 데 쓰일 수 있다.
- `boot_time`(지금은 지운다)은 재부팅 전까지 **실행을 넘어** 같은 기기의 이벤트를 잇는 값이었다 — 그래서 지웠다.

이것들을 지우지 않은 것은 계약이 이름으로 다루지 않았기 때문이고 판단을 내린 것이 아니다. **양식의 「진단 — 사용자와 연결: 아니오」로 낼 수 있는지는 사용자 확인 전이다**(아래 「제출 전에 확인할 것」 2).

### 세션 [실측]

키: `sid` · `init` · `started` · `status` · `errors` · `seq` · `duration` · `timestamp` · `attrs`. `attrs`의 키는 **`release` · `environment` 둘뿐**이었다 — `did` · `ip_address` · `user_agent` 없음.
`sid`는 실행마다 새로 만들어지는 세션 id다.

### 네이티브 크래시 — 지금은 나가는 것이 확인되지 않았다

`setTombstoneEnabled(true)`인데도 API 30 에뮬레이터에서 네이티브 크래시(`SEGV`) 뒤에 tombstone 이벤트가 만들어지지 않았다 [실측]. 그 실행의 세션은 `exited`로 적혔다. API 31 이상에서 이벤트가 오는지,
온다면 어떤 키가 실리는지는 [미확인]이다 — **오는 것이 확인되면 그 envelope으로 이 절을 채운다**(tombstone 원문 첨부는 옵션으로 꺼 두었다).

### ANR — 원문을 본 적이 없다

통합(`AnrV2`)은 켜져 있다. 이벤트의 키 목록과 스레드 덤프 첨부 여부는 [미확인]이다.

모든 이벤트는 나가기 전에 `CrashEventPolicy.beforeSend`를 지난다: `user` · breadcrumb · `serverName` · `request`를 지우고, `contexts.device.id`(설치 id) · `contexts.device.name`(기기 이름 — 사람 이름이 들어간다) ·
`contexts.device.boot_time`(부팅 시각)을 비우고, 예외 `value`와 메시지 본문을 사전 상한 → `scrub` → 300자로 다루고, `Message.params`(형식 문자열의 인자 원문)를 지운다. 그 처리가 실패하면(`StackOverflowError` 포함) 이벤트를 버린다 [코드].

## 보내지 않는 것

| 무엇 | 어떻게 막는가 |
|---|---|
| 사용자 id · 설치 id · 이메일 · 이름 | `beforeSend`가 `user`와 `contexts.device.id`를 지운다 · `setDistinctId(null)` · `sendDefaultPii = false` [코드]. SDK 기본값은 설치 id를 세 자리에 붙이는 것이라 끄는 줄이 셋이다 [정적]. **기기 밖으로 나가기 직전의 envelope에서 부재를 확인했다** [실측 — B6] |
| breadcrumb(화면 이동 · 탭 · 네트워크 요청 URL · 시스템 이벤트) | `maxBreadcrumbs = 0` · `beforeBreadcrumb`이 전부 버림 · 자동 breadcrumb 여섯 종류 끔 · `beforeSend`가 한 번 더 지운다 |
| 스크린샷 · 뷰 계층 | 첨부 끔(화면에 학습 답 · 이름이 있다) |
| 세션 리플레이 · 프로파일링 · 성능 추적 · 사용자 피드백 | 아티팩트가 없거나 표본율을 주지 않았다 · 추적 옵션 끔 |
| 기기 이름 · 서버 이름 · 외부 저장소 정보 · 루트 여부 · 설치된 모듈 목록 · 메시지 인자(`Message.params`) | `beforeSend` · 옵션 끔 |
| tombstone 원문 · SDK를 넣기 전의 과거 ANR · tombstone | 첨부 · 과거 보고 끔 |
| 기기 부팅 시각(`contexts.device.boot_time`) | `beforeSend`가 지운다(`438cc723`부터 — **그 전에 B단계에서 나간 5건에는 실려 있었다**) |
| JS 예외의 화면 이름 · props · 전역 상태 · 임의 객체 | payload에 자리가 없다. JS는 `Error`가 아닌 객체를 문자열로 풀지 않고 `Non-error value thrown`으로 바꿔 넘긴다 |
| 이미지 · 리소스 · 레이아웃 등 JS 밖의 Lynx 오류 | 코드 범위(200번대 · 1100번대) 밖은 받지 않는다 — URL이 실린다 |
| Lynx 코어가 오류 문자열에 붙여 오는 `sentry` 덩이 | 호스트는 `rawError`만 읽는다(그 덩이는 이 저장소의 Sentry와 무관하다) |

## 지우기 규칙과 남는 위험

`CrashScrub.scrub`이 아래 아홉을 **이 순서로** 적용한다. 정본은 계약 §3.2의 패턴 표와 §11 「R 정정」 RV5이고 JUnit(`CrashScrubTest` · `CrashScrubCorrectionTest`)이 기준 벡터 V1 ~ V19로 지킨다 [코드].
⟨2026-10-13⟩ 둘째 · 넷째 · 다섯째(넓힌 것)가 리뷰 뒤에 더해졌다. 지우기 앞에는 사전 상한이 있다(위 「보내는 것」 표).

| 순서 | 겨냥 | 바뀐 모습 |
|---|---|---|
| 1 | URL의 쿼리 · 프래그먼트(인증 코드 · 토큰이 실린다) | `https://…/verify?[redacted]` |
| 2 | **스킴 없는 쿼리 꼬리** — `?` 뒤에 `key=`가 오는 것 | `/auth/v1/verify?[redacted]` |
| 3 | 이메일 | `[email]` |
| 4 | **점 없는 이메일**(`kim@localhost`) — `@`가 든 토막(`Class@4a5b6c7` 꼴의 16진수 꼬리는 예외) | `[email]` |
| 5 | **인증 머리** — `Bearer …`와 `Authorization: Basic …`(대소문자 무시) 뒤의 값. 낱말 `basic` 혼자는 걸지 않는다 | `Bearer [token]` · `Authorization: Basic [token]` |
| 6 | JWT | `[token]` |
| 7 | 32자 이상의 불투명한 값(갱신 토큰 · API 키 · 해시 · 사용자 UUID) | `[token]` |
| 8 | 전화번호 · 긴 숫자(숫자 9개 이상) | `[number]` |
| 9 | ASCII 밖 글자(한글 등 — 학습 답 · 음성 인식 결과 · 이름) | `[text]` |

**남는 위험 — 계약이 인정한 것이다.**

- **ASCII로 된 짧은 사용자 입력(영문 이름 · 8자리 이하 숫자)은 패턴으로 가릴 수 없다.** 그런 값이 예외 메시지에 들어가면 그대로 나간다. 길이 상한(메시지 300자 · 스택 줄 400자)이
  노출 폭을 묶을 뿐이다.
- **경로 조각에 든 이름은 지우지 않는다**(`/users/kim.sehyun/profile`). 쿼리 꼬리(`?key=…`)는 지우지만 경로는 그대로 나간다 — 리뷰가 짚었고 계약이 남는 위험으로 받았다.
- **스택 프레임의 파일 경로도 같은 이유로 그대로 나간다.** 지금 번들의 프레임은 `/.rspeedy/main/background.<해시>.js` 꼴이라 사람 이름이 들 자리가 없다(e2e A단계 실측) — Java 스택은 `scrub`을 지나지 않는다(난독화된 클래스 이름).
- 사전 상한 때문에 2,000자를 넘는 메시지는 뒤가 잘리고 잘린 끝의 토막까지 버려진다(반쯤 잘린 이메일 · 토큰이 패턴을 빠져나가지 않게). 65,536자를 넘는 도착 원문은 앞에서 잘린다.
- 지우는 대상은 **예외 메시지와 스택 줄**이다. SDK가 붙이는 다른 문자열 필드는 위 「보내지 않는 것」의 옵션으로 끄는 것이고 `scrub`을 지나지 않는다.
- 실제 이벤트에서 지우기가 동작하는 것은 봤다 [실측 — B3 · B3-b]: 가짜 이메일 · 전화번호 · 한글 · 스킴 없는 쿼리를 넣은 메시지가 envelope에서 `[email] [number] [text] …?[redacted]`였고 원문 조각은 메시지 · 지문 · 스택 어디에도 없었다. Sentry 화면에서의 모습은 [미확인].
- **에러 화면과 기기의 logcat에는 예외 메시지 원문이 그대로 보인다.** 에러 화면 본문은 `ErrorBoundary`의 기존 동작이고, Lynx는 `bundled` 빌드에서도 오류 원문을 `lynx` 태그로 찍는다 [실측]. 둘 다 기기 안의 일이고 밖으로 나가는 것이 아니다.
- **debug 빌드의 logcat에는 지우기 전 원문이 찍힌다**(`DuruCrash` 태그 — 도착 문자열 앞 500자). 기기 밖으로 나가는 것이 아니고 release형 빌드에는 그 로그가 없다.

## 식별자를 붙이면 달라지는 칸

지금 값은 「안 붙임」이고 **계약 기본값으로 진행한 것이다 — 사용자가 확인하지 않았다**(ADR-0058 「사용자 확인 필요」 U2). 바꾸면 이 문서와 양식이 같이 바뀐다.

| 선택 | 얻는 것 | 양식에서 바뀌는 칸 | 그 밖에 드는 것 |
|---|---|---|---|
| ① 안 붙임(지금) | — 「몇 명이 겪었나」를 못 센다 | 위 표 그대로 | — |
| ② SDK 설치 id(재설치 때 바뀌는 무작위 값) | 영향 사용자 수 | 「기기 또는 기타 ID」 **수집 추가** · 「비정상 종료 로그」 · 「진단」의 「사용자와 연결」을 다시 판정 | PostHog의 로그인 전 익명 id(실행마다 새 값 — ADR-0029 D8)보다 **오래 남는 식별자**가 된다 |
| ③ 로그인 사용자 id | 신고와 대조 | 「사용자 ID」 **수집 추가** · 두 항목 모두 「사용자와 연결: 예」 | 공개 처리방침 개정 · 계정 삭제 때 Sentry 쪽 삭제 절차 |

어느 쪽이든 코드에서 바뀌는 것은 `beforeSend`의 `setUser(null)` · `device.setId(null)`과 옵션의 `setDistinctId(null)` 세 줄이다(뒤엣것은 결선 검사 GW-S8이 지키므로 그 기대값도 같이 고친다).

## 제출 전에 확인할 것

1. ~~e2e B6 — 원문에 `user` · `did` · `ip_address` · `contexts.device.id`가 없다~~ — **기기 쪽은 확인됐다**(2026-10-13, 에뮬레이터 1대 · `bundled`). 남은 것: Sentry 프로젝트의 「IP 주소 저장 안 함」 설정과,
   대시보드에서 받은 이벤트(e2e 문서의 `event_id` 다섯)에 서버가 붙인 `user.ip_address` 류가 없는지.
2. ~~SDK가 붙인 context의 실제 키를 옮긴다~~ — 옮겼다(위 「이벤트에 실리는 키」). 남은 것: **⚠ 표시한 값(`trace_id` · `thread.id` · `app_start_time` · `permissions` · `kernel_version` 등)을 두고
   「진단 — 사용자와 연결: 아니오」로 낼지 사용자가 정한다.** 지우기로 정하면 `beforeSend`에 줄이 는다. 그리고 ANR · (오는 것이 확인되면) tombstone 이벤트의 키를 같은 방법으로 뜬다.
3. Sentry 프로젝트의 데이터 지역 · 「IP 주소 저장 안 함」 · 보존 기간을 확인해 이 문서와 공개 처리방침에 적는다.
4. 공개 개인정보 처리방침의 처리자 목록에 Sentry(비정상 종료 로그 · 진단)를 더한다 — 문안은 아직 준비하지 않았다.
5. Play Console 「데이터 보안」 양식을 위 표로 고치고, Android 앱의 다른 수집 항목(이 문서 밖)과 함께 한 번에 대조한다.
6. DSN을 넣은 빌드를 Play에 올리는 것은 1 ~ 5 뒤다.
