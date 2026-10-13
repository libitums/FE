# Android 데이터 보안 — 크래시 수집(Sentry)이 내보내는 것과 Play 양식에 넣을 항목

Android 호스트가 크래시 수집으로 **기기 밖에 내보내는 것**을 코드 근거와 함께 적고, Play Console 「데이터 보안」 양식에 넣을 항목을 준비한다.
iOS 쪽의 짝은 [`docs/ios-privacy.md`](ios-privacy.md)다. 결정과 그 근거는 [ADR-0058](adr/0058-crash-reporting-sentry.md)이 진다 — 여기에는 **무엇이 나가는가**만 적는다.

**이 문서의 범위는 크래시 수집 하나다.** Android 앱이 이미 내보내는 다른 것(Supabase 계정 · 학습 진행 · 피드백 · FCM 토큰 · PostHog 이벤트)의 Play 양식 대조는 이 문서가
하지 않았다 — iOS 쪽 대조표(`ios-privacy.md` 「수집 항목 대조」)에 해당하는 Android 표는 아직 없다.

근거 표시: **[코드]** 저장소 코드와 JUnit · **[정적]** SDK 바이트코드를 읽은 것 · **[추론]** · **[미확인]**.

## 지금 상태 (2026-10-13)

- **출시본은 아직 아무것도 보내지 않는다.** Play에 올라간 빌드에는 DSN이 없다 — DSN 없는 빌드에서는 Sentry 코드가 한 줄도 돌지 않는다(ADR-0058 D6). 사용자가 2026-10-13에 Sentry 프로젝트 셋
  (Android · iOS · Astro)을 만들고 Android DSN을 추적하지 않는 `apps/android/sentry.properties`에 넣었다(`auth.token` · 조직 · 프로젝트 이름은 아직 없다). **그 DSN으로 빌드해 돌린 실행은 아직 없다.**
- **Sentry에 실제로 도착한 payload를 본 적이 없다** [미확인]. 아래 표는 코드가 보내도록 만든 것이고, 수신 쪽 원문(JSON)으로 대조하는 것은 [크래시 리포팅 e2e](e2e/crash-reporting.md)의
  B6이다. **B6이 돌기 전에는 이 문서를 근거로 양식을 「확정」하지 않는다.**
- **Play Console 양식은 고치지 않았고 공개 개인정보 처리방침에도 반영하지 않았다.** 둘 다 저장소 밖의 일이고 사용자가 한다(ADR README 보류 표).
- `debug` 빌드는 DSN이 있어도 보내지 않는다. iOS에서는 아무것도 나가지 않는다.

## Play 데이터 보안 양식에 넣을 항목

양식의 항목 이름과 정의는 **이 회차에 Play 문서를 다시 조회하지 않고 적었다** [문서 기억] — 제출할 때 Play Console 화면의 문구와 대조한다.

| 양식의 데이터 유형 | 수집 | 사용자와 연결 | 목적 | 근거 |
|---|---|---|---|---|
| 앱 정보 및 성능 → **비정상 종료 로그** | 예 | **아니오** — 사용자 식별자 · 설치 id를 붙이지 않는다 | 앱 기능 · 분석 | Java/Kotlin 크래시 · ANR · (API 30 이상) 네이티브 크래시 tombstone · JS 예외 |
| 앱 정보 및 성능 → **진단** | 예 | **아니오** | 앱 기능 · 분석 | 세션(크래시 없는 세션 비율의 재료 — 시작 · 끝 · 상태) · 이벤트에 붙는 `release` · `environment` · 기기 · OS context |
| 기기 또는 기타 ID | **아니오가 되도록 만들었다 — B6 전에는 「아니오」로 내지 않는다** | — | — | SDK 기본값은 설치 id를 **세 자리**에 싣는다: 이벤트의 `user.id` · 세션의 `distinctId` · 이벤트의 `contexts.device.id`(`sendDefaultPii`와 무관) [정적 — AAR 바이트코드]. 이 앱은 `beforeSend`에서 `user`와 `device.id`를 지우고 `setDistinctId(null)`로 세션 쪽을 끈다 [코드 — JUnit `CrashEventPolicyTest`]. **실제 payload에 정말 없는지는 B6이 본다** — 아래 「식별자 칸을 「아니오」로 내기 전에」 |

**식별자 칸을 「아니오」로 내기 전에.** 처음 구현은 `contexts.device.name`만 지워 **설치 id가 `contexts.device.id`로 모든 이벤트에 실려 나갈 뻔했고 리뷰가 잡았다**(ADR-0058 「정정 기록」 2026-10-13) —
이 문서의 앞선 판도 그 자리를 모른 채 「아니오」라고 적었다. 고친 뒤의 근거는 단위 테스트까지이고, SDK가 `beforeSend` 뒤에 식별자를 다시 붙이는 자리가 없다는 것은 Sentry가 받은 원문으로만 확인된다.
**[크래시 리포팅 e2e](e2e/crash-reporting.md)의 B6(`user` · `did` · `ip_address` · `contexts.device.id` 넷이 원문에 없다)이 통과하기 전에는 Play 양식에 「기기 또는 기타 ID: 수집 안 함」을 내지 않는다.**
B6에서 하나라도 보이면 그 칸은 「수집함」이고 위 두 항목의 「사용자와 연결」도 다시 판정한다.

- **전송 중 암호화**: 예 — DSN은 `https://`로 시작해야 받는다(`CrashReportConfig.dsnFrom`, `http://`는 「DSN 없음」으로 떨어진다) [코드].
- **공유 여부**: Sentry는 개발자를 대신해 처리하는 서비스 제공자다. Play의 정의에서 그런 전달이 「공유」에 들지 않는다는 것은 [문서 기억]이다 — 제출 때 확인한다.
- **수집이 선택인가**: 끄는 설정을 앱에 두지 않았다 — 필수 수집으로 적는다.
- **삭제 요청**: 사용자와 연결되지 않으므로 계정 삭제([ADR-0032](adr/0032-account-sign-out-and-deletion.md))가 Sentry 쪽에서 지울 대상을 특정하지 못한다. Sentry 프로젝트의 보존 기간은 확인하지 않았다 [미확인].
- **IP 주소**: SDK에는 `sendDefaultPii = false`를 준다 [코드]. 수신 서버가 접속 IP를 저장하는지는 Sentry 프로젝트 설정(「IP 주소 저장 안 함」)에 달려 있고 **그 설정이 켜져 있는지 확인하지 않았다** [미확인 — 사용자].
  이벤트 원문에 `ip_address`가 없는지는 B6이 본다.
- **데이터 지역(US/EU)**: 확인하지 못했다 [미확인 — 사용자]. 프로젝트를 만든 뒤에는 못 바꾼다.

## 보내는 것 — 닫힌 목록

### JS 예외 (호스트가 직접 만드는 이벤트)

필드는 **넷뿐이다**(`CrashReportPayload`). 다른 값을 실을 자리가 없다 [코드 — JUnit `CrashReportPayloadTest` · `CrashEventPolicyTest`].

| 값 | 내용 | 상한 | 지우기 |
|---|---|---|---|
| `source` | `js-background` 또는 `js-main-thread`(태그 `lynx.source`) | 닫힌 값 둘 | — |
| 이름 | 예외 이름 — **알려진 꼴만**(`…Error` · `…Exception` · `Error` · `unhandled rejection`). 그 밖의 앞부분(문자열 throw `"kimsehyun: …"` 등)은 이름이 되지 않고 메시지에 남아 지우기를 지난다 | 80자 | 닫힌 꼴이라 지우기를 지나지 않는다 |
| 메시지 | 예외 메시지 | 300자 | 사전 상한 2,000자 → `CrashScrub.scrub` → 자른다 |
| 스택 | 프레임 줄(파일 · 줄 · 열 — 줄여진 그대로) | 30줄 · 줄당 400자(뒤쪽을 남긴다) | 줄마다 사전 상한 800자(뒤쪽, 잘린 앞 토막 버림) → `scrub` |

이벤트에는 그 넷으로 만든 지문(`"lynx"` · source · 이름 · 첫 스택 줄)과 `mechanism`(`lynx` · `handled = true`)이 붙는다. 프로세스당 20건까지만 보낸다.

### SDK가 만드는 이벤트 (Java/Kotlin 크래시 · ANR · tombstone · 세션)

- 예외 타입 · 메시지 · 스택(R8로 난독화된 클래스 이름 — 매핑은 Sentry에 따로 올린다) · 스레드 · 세션의 시작 · 끝 · 상태.
- `release`(`libitum.duru.android@<versionName>+<versionCode>`) · `dist`(`versionCode`) · `environment`(`release` | `bundled`) · 매핑 UUID.
- **SDK가 기본으로 붙이는 기기 · OS · 앱 context**(기기 모델 · OS 버전 등). **이 목록은 확정하지 못했다** [미확인] — 계약은 끄는 옵션만 명시로 고정했고 「표에 없는 것은 SDK 기본값」이라
  실제 payload를 봐야 닫힌다(B6). 양식의 「진단」 칸이 이것을 덮는다고 봤다 [추론].

모든 이벤트는 나가기 전에 `CrashEventPolicy.beforeSend`를 지난다: `user` · breadcrumb · `serverName` · `request`를 지우고, `contexts.device.id`(설치 id)와 `contexts.device.name`(기기 이름 — 사람 이름이 들어간다)을 비우고,
예외 `value`와 메시지 본문을 사전 상한 → `scrub` → 300자로 다루고, `Message.params`(형식 문자열의 인자 원문)를 지운다. 그 처리가 실패하면(`StackOverflowError` 포함) 이벤트를 버린다 [코드].

## 보내지 않는 것

| 무엇 | 어떻게 막는가 |
|---|---|
| 사용자 id · 설치 id · 이메일 · 이름 | `beforeSend`가 `user`와 `contexts.device.id`를 지운다 · `setDistinctId(null)` · `sendDefaultPii = false` [코드]. SDK 기본값은 설치 id를 세 자리에 붙이는 것이라 끄는 줄이 셋이다 [정적]. **원문에서의 부재는 [미확인 — B6]** |
| breadcrumb(화면 이동 · 탭 · 네트워크 요청 URL · 시스템 이벤트) | `maxBreadcrumbs = 0` · `beforeBreadcrumb`이 전부 버림 · 자동 breadcrumb 여섯 종류 끔 · `beforeSend`가 한 번 더 지운다 |
| 스크린샷 · 뷰 계층 | 첨부 끔(화면에 학습 답 · 이름이 있다) |
| 세션 리플레이 · 프로파일링 · 성능 추적 · 사용자 피드백 | 아티팩트가 없거나 표본율을 주지 않았다 · 추적 옵션 끔 |
| 기기 이름 · 서버 이름 · 외부 저장소 정보 · 루트 여부 · 설치된 모듈 목록 · 메시지 인자(`Message.params`) | `beforeSend` · 옵션 끔 |
| tombstone 원문 · SDK를 넣기 전의 과거 ANR · tombstone | 첨부 · 과거 보고 끔 |
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
- Sentry 화면에서 실제로 `[email]` · `[number]` · `[text]`로 보이는지는 아직 보지 않았다 [미확인 — B3].
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

1. e2e B6 — Sentry 세션 · 이벤트 원문에 `user` · `did` · `ip_address` · `contexts.device.id`가 **없다.** 하나라도 있으면 위 표의 「사용자와 연결: 아니오」와 「기기 또는 기타 ID」 칸이 틀린 것이다 — **이 항목이 끝나기 전에는 양식을 내지 않는다.**
2. e2e B6에서 SDK가 붙인 기기 · OS · 앱 context의 실제 키를 이 문서 「SDK가 만드는 이벤트」에 옮겨 목록을 닫는다.
3. Sentry 프로젝트의 데이터 지역 · 「IP 주소 저장 안 함」 · 보존 기간을 확인해 이 문서와 공개 처리방침에 적는다.
4. 공개 개인정보 처리방침의 처리자 목록에 Sentry(비정상 종료 로그 · 진단)를 더한다 — 문안은 아직 준비하지 않았다.
5. Play Console 「데이터 보안」 양식을 위 표로 고치고, Android 앱의 다른 수집 항목(이 문서 밖)과 함께 한 번에 대조한다.
6. DSN을 넣은 빌드를 Play에 올리는 것은 1 ~ 5 뒤다.
