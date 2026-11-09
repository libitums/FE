# @libitums/supabase-functions

Supabase Edge Function 앱이다. 함수는 넷 — `delete-account`, `send-push`(서버 푸시, 아래 「send-push」 ·
[ADR-0034](../../docs/adr/0034-server-push-notifications.md)), `chat-send` · `companion-proactive`(AI 컴패니언 턴 · 선톡, 아래 「AI 컴패니언」). 먼저 `delete-account` — 로그인한 사용자가 자기 계정을 지운다
(Apple 사용자는 Apple 토큰 철회까지). 결정과 HTTP 계약(판정 순서 · 상태 코드)은
[ADR-0032](../../docs/adr/0032-account-sign-out-and-deletion.md) D1~D3, 타입은
`supabase/functions/_shared/delete-account.contract.ts`가 정본이다.

## 구조

- `supabase/functions/delete-account/index.ts` — Deno 진입. 환경을 읽어 핸들러에 넘기는 것이 전부다.
- `supabase/functions/_shared/` — 런타임 중립 TypeScript(`fetch` · `Request` · `Response` · WebCrypto만).
  Node(vitest · tsc)와 Deno(배포)에서 같은 코드가 돈다. import에는 `.ts` 확장자를 붙인다.
- `deno-runtime.d.ts` — tsc 전용 최소 선언(`Deno.serve` · `Deno.env.get`). Deno는 이 파일을 읽지 않는다.
- `supabase/config.toml` — `[functions.delete-account] verify_jwt = false`.

## 검증

```sh
pnpm --filter @libitums/supabase-functions typecheck
pnpm --filter @libitums/supabase-functions test:unit
pnpm --filter @libitums/supabase-functions test:integration
```

셋 다 루트 `pnpm typecheck` · `pnpm test`의 사슬에 들어 있다(ADR-0006 D2). Deno는 필요 없다 — 같은 코드를 Node의
vitest · tsc가 돈다.

SQL 마이그레이션 통합 테스트도 `test:integration`에 포함된다. 개발 의존성 `embedded-postgres`로 일회용 PostgreSQL 17.9를
루프백 임의 포트에서 시작하고 종료 시 데이터 디렉터리를 지운다. 실제 DB URL이나 Supabase 시크릿을 읽지 않는다.
기존 마이그레이션을 순서대로 실행하며, Supabase가 제공하는 `auth.users` · `auth.uid()` · 역할만 테스트용 경계로 준비한다.
두 연결이 같은 행의 잠금을 기다리는 동시 INSERT·UPDATE, 지연 요청, 재전송, 입력 검증, 권한과 계정 격리를 확인한다.
PostgreSQL 실행 파일의 공유 라이브러리 링크 복원을 위해 `pnpm-workspace.yaml`이 해당 패키지의 postinstall만 허용한다.
표준 macOS·Linux 사용자 계정으로 실행한다(PostgreSQL은 root 실행을 지원하지 않는다).

## 배포 절차

시크릿 값 · `.p8` 파일은 **저장소에 두지 않는다**(커밋 금지).

### 1. Apple 개발자 콘솔에서 Sign in with Apple 키 발급

1. [Apple Developer](https://developer.apple.com/account) → Certificates, Identifiers & Profiles.
2. Identifiers에서 앱 ID(`com.libitum.host`)에 **Sign in with Apple** capability가 켜져 있는지 확인한다.
3. Keys → `+` → 이름을 정하고 **Sign in with Apple**을 체크 → Configure에서 위 앱 ID를 Primary App ID로
   고른다 → Continue → Register.
4. 키를 **한 번만** 내려받을 수 있다(`AuthKey_XXXXXXXXXX.p8`). 안전한 곳에 보관한다.
5. 다음 세 값을 적어 둔다.
   - `APPLE_KEY_ID` — 키 상세 화면의 Key ID(10자).
   - `APPLE_TEAM_ID` — 계정 Membership의 Team ID(10자).
   - `APPLE_CLIENT_ID` — 네이티브 앱이므로 번들 ID `com.libitum.host`.
   - `APPLE_WEB_CLIENT_ID` — Android Apple 웹 OAuth에 쓰는 Services ID. Supabase Apple provider
     Client IDs의 첫 번째 값과 같아야 한다. iOS만 운영하면 생략할 수 있다.

### 2. 프로젝트 연결과 시크릿

```sh
cd apps/supabase-functions
supabase link --project-ref <프로젝트 ref>

supabase secrets set \
  APPLE_TEAM_ID=<팀 ID> \
  APPLE_KEY_ID=<키 ID> \
  APPLE_CLIENT_ID=com.libitum.host \
  APPLE_WEB_CLIENT_ID=<Apple Services ID> \
  APPLE_PRIVATE_KEY="$(cat /안전한/경로/AuthKey_XXXXXXXXXX.p8)"
```

`SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`는 Edge 런타임이 기본 제공하므로 따로
설정하지 않는다. 이 셋이 하나라도 비면 함수는 모든 요청에 500 `server_misconfigured`를 낸다. Apple 넷이
하나라도 비면 Apple 사용자만 500이고 그 밖 사용자는 삭제할 수 있다. `APPLE_WEB_CLIENT_ID`만
비면 iOS Apple 삭제는 계속되지만 Android Apple 삭제는 500 `server_misconfigured`로 중단한다.

**레거시 키.** 함수는 레거시 `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`를 읽는다. 2026-09-30 기준 이
프로젝트는 레거시 anon 키가 켜져 있어 런타임이 두 값을 주입한다. Supabase는 레거시 키를 2026년 말까지 유지한다.
레거시 키를 끄면 함수가 새 키(`SUPABASE_PUBLISHABLE_KEYS` · `SUPABASE_SECRET_KEYS` — 이름별 JSON)를 읽도록 코드를
바꿔야 한다(후속 작업). `SUPABASE_` 접두 이름은 시크릿으로 직접 넣을 수 없으니 이름을 덮어쓰는 우회는 없다.
배포 뒤 `delete-account`가 500 `server_misconfigured`나 401 `invalid_session`을 내면 이 항목부터 확인한다.

⟨2026-09-30 확인⟩ **런타임의 `SUPABASE_SERVICE_ROLE_KEY`는 대시보드의 레거시 `service_role` JWT와 글자가 다르다**(Vault에
넣은 레거시 키를 `send-push`가 같은 글자로 비교해 401을 냈다). 그래서 서버 키는 형식을 가려 싣는다(`_shared/service-key.ts`) —
JWT면 `apikey` + `Authorization`, 아니면(`sb_secret_…`) `apikey`만. `send-push`는 호출자의 키가 런타임과 글자가 달라도 Auth
관리자 API가 200을 주면 서버 키로 인정한다.

### 3. 배포

`config.toml`에 `verify_jwt = false`가 있으므로 그대로 배포한다. 함수가 스스로 Bearer 토큰을 검증한다
(게이트웨이 JWT 검증은 새 키 체계와 맞지 않을 수 있어 끈다).

```sh
supabase functions deploy delete-account
# config.toml을 쓰지 않으려면
supabase functions deploy delete-account --no-verify-jwt
```

### 4. 로컬 실행

지원하지 않는다. 함수는 `SUPABASE_URL`이 `https://`일 때만 설정이 갖춰졌다고 보는데(토큰을 평문으로 보내지 않게),
`supabase functions serve`의 로컬 런타임은 `http://kong:8000`을 넣는다. `--env-file`도 `SUPABASE_` 접두 이름을
건너뛴다. 로직은 `pnpm --filter @libitums/supabase-functions test:unit` · `test:integration`으로 확인하고, 실제
왕복은 배포한 프로젝트에서 [e2e 절차](../../docs/e2e/account-deletion.md) B로 확인한다.

## 동작 요약

`POST` · `Authorization: Bearer <사용자 액세스 토큰>` · 본문 `{"apple_authorization_code": "…" | null}`.
Android Apple 삭제는 `apple_authorization_code: null`과 `apple_provider_refresh_token`을 함께 보낸다.
함수는 Services ID로 Apple refresh grant를 검증하고 응답의 Apple `sub`를 기존 사용자 identity와
대조한 뒤 같은 토큰을 철회한다. 토큰은 저장하거나 로그에 남기지 않는다.
성공은 204. 오류는 `{"error": "<code>"}`이고 CORS 헤더는 없다(호출자는 앱의 네이티브 fetch뿐).
바깥 호출마다 제한 시간 10초, 재시도 없음. 로그는 요청당 한 줄(`event` · `status` · `error`)이고
토큰 · 코드 · 사용자 ID · 이메일은 싣지 않는다.

## send-push (서버 푸시 — ADR-0034)

`POST` · `Authorization: Bearer <service role 키>`. 본문은 둘이다.

```jsonc
{ "kind": "reengagement", "days": 3 }                        // 3 또는 7 — 문구는 함수가 든다
{ "kind": "announcement", "audience": "all",                 // 또는 { "userIds": ["<uuid>", …] } (1~1000)
  "title": "Episode 2 is here", "body": "…",                  // 제목 ≤ 100자 · 본문 ≤ 500자
  "target": { "kind": "journey-map" } }                        // 생략하면 여정 맵
```

목적지(`target.kind`)는 `journey-map` · `notifications` · `roleplay-list` · `messenger` · `phone-call` · `visual-novel`
(뒤의 셋은 `unitId`가 필요하다). 성공은 200 `{devices, sent, failed, removed}` — 무효 토큰은 표에서 지운다.

### 배포 순서

1. **Apple** — Identifiers에서 `com.libitum.host`의 **Push Notifications**를 켠다. Keys에서 **Apple Push Notifications
   service (APNs)**를 체크한 키를 만들고 `.p8`을 받는다(Sign in with Apple 키에 체크를 더한 새 키 하나로 합쳐도 된다).
2. **마이그레이션** — `supabase/migrations/20260930120000_push_devices.sql`을 적용한다(`supabase db push` 또는 SQL 편집기).
3. **시크릿** — `APNS_KEY_ID` · `APNS_PRIVATE_KEY`(.p8 내용). `APPLE_TEAM_ID` · `APPLE_CLIENT_ID`(= 토픽 `com.libitum.host`)는
   삭제 함수와 같은 값을 쓴다. 하나라도 비면 모든 요청이 500 `server_misconfigured`다.
4. **배포** — `supabase functions deploy send-push`(`config.toml`에 `verify_jwt = false`).
5. **예약** — `pg_cron` · `pg_net`을 켜고 Vault에 service role 키를 넣은 뒤 `supabase/cron/reengagement.sql`을 한 번 실행한다.
   Vault 이름은 `send_push_service_role_key`, 값은 대시보드 → Settings → API Keys → Legacy의 `service_role`(`eyJ…`).
   ⟨2026-09-30⟩ 운영 프로젝트에 적용했다 — 예약 `send-push-reengagement`(매일 10:00 UTC), 빈 본문 400 · `days: 3` 200으로 확인.

### 운영 공지 보내기

```sh
curl -X POST "https://<ref>.supabase.co/functions/v1/send-push" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
  -d '{"kind":"announcement","audience":"all","title":"Episode 2 is here","body":"Jimin has a new story for you.","target":{"kind":"journey-map"}}'
```

개발 서명 빌드의 토큰은 `sandbox`, App Store · TestFlight는 `production`으로 등록되고 함수가 알맞은 APNs로 보낸다.

### Android FCM 확장 (ADR-0041)

추가 마이그레이션 `20261002120000_push_devices_fcm.sql`을 먼저 적용한 뒤 `send-push`를 배포한다. 기존 APNs 행과 RPC 인수는 그대로다. Android 행은 `environment=fcm`, `token=fcm.<base64url(UTF-8 등록 토큰)>`으로 저장한다. 한 표에서 환경에 따라 APNs 또는 FCM HTTP v1으로 보낸다.

Firebase 프로젝트에 Android 앱을 등록하고 FCM HTTP v1 API 권한이 있는 서비스 계정 JSON을 준비한다. JSON 전체를 Supabase Edge Function 시크릿 `FIREBASE_SERVICE_ACCOUNT_JSON`으로 설정한다. 저장소에 JSON 또는 키를 넣지 않는다. 시크릿이 없으면 APNs는 계속 발송되고 FCM 기기만 실패 수에 든다. JSON 형식이 잘못되면 함수는 500 `server_misconfigured`를 반환한다. FCM이 `UNREGISTERED`라고 확인한 토큰만 표에서 제거한다. 실제 Android 수신 검증에는 앱의 Firebase 클라이언트 설정과 Google Play 서비스가 있는 기기가 필요하다.

## 학습 진행 저장 RPC 배포

`20260930190000_merge_learning_progress.sql`은 이전 `20260930150000_learning_progress.sql` 위에 적용하는 추가 마이그레이션이다.
기존 파일을 재실행하거나 표를 재생성하지 않는다. `save_learning_progress(jsonb)`의 인수와 반환값은 그대로여서 기존 iOS 앱도 사용할 수 있다.

1. 대상 프로젝트와 미적용 마이그레이션 목록을 확인한다. `supabase db push --dry-run`으로 적용 범위를 검토한다.
2. 검토한 마이그레이션을 서버에 적용한다. `supabase db push`를 사용하거나 해당 추가 SQL을 SQL 편집기에서 실행한다.
3. 테스트 계정으로 완료 진행을 저장한 뒤 더 오래된 진행을 저장하고, 다시 읽었을 때 완료 기록이 유지되는지 확인한다.
4. 앱 배포 전 서버 적용 여부를 확인한다. 앱 바이너리에 이 SQL은 포함되지 않는다.

완료 목록은 합집합, 스텝 수와 활성 장면은 최댓값으로 합치고 비주얼 노벨 완료는 유지한다.
지원하지 않는 버전이나 깨진 스냅숏은 오류를 반환하며 기존 값을 보존한다. 새로운 스냅숏 버전 배포 전에는 서버 검증·합치기부터 확장한다.
병합 결과가 기존 16 KiB 상한을 넘으면 요청 전체가 실패한다. 진행을 감소시키는 리셋 동작은 이 RPC의 계약이 아니다.

## 웹 체험판 사전 등록 표 (ADR-0083 r2)

`20261022120000_pre_registrations.sql` — 랜딩 체험판(`/try/`) 완료 화면의 이메일 사전 등록이 쌓이는 표 `public.pre_registrations`
(`email` · `locale` en/ko — ⟨2026-11-04⟩ vi/id/ms도, 마이그레이션 `20261104120000_web_trial_locales.sql`(랜딩 ADR-0094), es/ja는 `20261104140000_web_trial_locales_es_ja.sql`(ADR-0097) · `source` web-trial · `created_at`). 함수가 아니라 표 하나와 정책이다.

- **랜딩은 공개 키(anon)로 PostgREST `POST /rest/v1/pre_registrations`만 한다**(`Prefer: return=minimal`, `apikey` 머리만). RLS를 켜고
  anon에 insert 정책 하나, 표 권한은 `email` · `locale` · `source` 세 열의 insert뿐이다 — 읽기 · 고치기 · 지우기 · `id` · `created_at` 지정은
  42501, authenticated(앱 사용자)는 표에 닿지 않는다. 운영자는 대시보드(service role)로 읽는다.
- `email`은 insert 트리거가 소문자 · 앞뒤 공백을 맞추고 고유하다 — 같은 주소를 다시 넣으면 23505(PostgREST 409)이고, 랜딩은 그것도
  「등록했어요」로 보인다(등록 여부를 남에게 알리지 않는다). 형식 · locale · source가 틀리면 23514.
- **email은 개인정보다** — 분석 · 로그에 남기지 않는다(랜딩 GA 이벤트 `trial_preregister`는 결과 `status`만 싣는다). 메일 발송 · 동의 철회
  경로는 아직 없다(개인정보처리방침 갱신은 사용자 몫).
- 통합 테스트 `supabase/migrations/pre-registrations.integration.test.ts`(MG1 ~ MG8, embedded-postgres)가 위 권한 · 정규화 · 고유 · 검사를 고정한다.
- **적용**: 원격 프로젝트에는 아직 적용하지 않았다. 검토한 뒤 `supabase db push --dry-run` → `supabase db push`(또는 SQL 편집기). 랜딩 배포
  (Vercel `PUBLIC_SUPABASE_ANON_KEY`)보다 **먼저** 적용한다 — 표가 없으면 폼이 404를 받아 「등록하지 못했어요」를 보인다.
- 남은 위험: 요청 빈도 제한 · 봇 막기가 없다(공개 키로 insert만 열려 있다). 문제가 되면 Edge Function + captcha 또는 DB 쪽 빈도 제한을 더한다.

## 웹 체험판 인식 글자 수집 표 (ADR-0083 r3)

`20261022130000_trial_speech_samples.sql` — 랜딩 체험판 롤플레이의 말하기 판정마다 인식기가 낸 **글자만** 쌓이는 표 `public.trial_speech_samples`
(녹음 없음). 발음 기준 채점(ADR-0083 D17)의 기준을 실기 자료로 다시 맞추려는 것이다.

- 열: `session_id`(체험을 열 때 브라우저 메모리에서 만든 무작위 UUID — 사람과 이어지지 않는다) · `episode_version` · `turn_index` · `expected`(가장 가까운
  정답) · `alternatives`(인식 후보 1 ~ 3개) · `outcome`(strict · lenient · incorrect) · `similarity`(0 ~ 1) · `browser`(UA 분류 다섯 중 하나) · `locale` ·
  `created_at`. **사용자 식별 정보 · IP · User-Agent 원문 열은 없다.**
- **랜딩은 공개 키(anon)로 PostgREST `POST /rest/v1/trial_speech_samples`만 한다**(`Prefer: return=minimal`, `apikey` 머리만, `keepalive`). 표 권한은
  위 아홉 열의 insert뿐 — 읽기 · 고치기 · 지우기 · `id` · `created_at` 지정은 42501, authenticated는 표에 닿지 않는다. 운영자는 service role로 읽는다.
- check 제약: 후보 1 ~ 3개 · 각 1 ~ 200자 · null 없음(`trial_speech_alternatives_ok`), `expected` 1 ~ 200자, `episode_version` 1 ~ 40자, `turn_index` 0 ~ 9,
  `outcome` · `browser` · `locale` 닫힌 값, `similarity` 0 ~ 1 — 넘으면 23514(outcome은 RLS가 먼저 막아 42501일 수 있다).
- **보관 90일**: `purge_trial_speech_samples()`가 90일 넘은 행을 지우고 지운 수를 돌려준다(anon · authenticated 실행 불가). 매일 부르는 예약은
  마이그레이션이 아니라 `supabase/cron/trial-speech-samples-retention.sql`이다 — pg_cron을 켜고 SQL 편집기에서 **한 번** 실행한다(매일 03:30 UTC).
  실행하지 않으면 지워지지 않는다.
- 통합 테스트 `supabase/migrations/trial-speech-samples.integration.test.ts`(SS1 ~ SS8, embedded-postgres)가 권한 · 제약 · 보관 삭제를 고정한다.
- **적용**: 원격 프로젝트에는 아직 적용하지 않았다. 순서 ① 마이그레이션(`supabase db push --dry-run` → `supabase db push` 또는 SQL 편집기)
  ② `create extension if not exists pg_cron;` 뒤 예약 SQL 1회 ③ 랜딩 배포. ①이 없으면 수집 요청이 404로 조용히 버려진다(체험은 그대로).
- 개인정보처리방침에 붙일 문구 초안: [`docs/specs/web-trial-speech-samples-privacy.md`](../../docs/specs/web-trial-speech-samples-privacy.md)(사용자가 Notion에 반영).
- 남은 위험: 사전 등록 표와 같이 빈도 제한 · 봇 막기가 없다. 사용자가 말로 개인정보를 말하면 글자로 남는다(90일 뒤 삭제).

## AI 컴패니언 — chat-send · companion-proactive (M1 ~ M4)

턴 하나를 SSE로 돌려주는 `chat-send`, 선톡을 만드는 `companion-proactive`, 그 밑의 DB 함수다(LLM 한 단계 평가 창구 `companion-eval`은 아래 따로). 계약은 `packages/companion-contract`
(사본 `_shared/companion-contract/`), 결정은 [ADR-0112](../../docs/adr/0112-companion-schema.md) · [0113](../../docs/adr/0113-companion-contract-package.md) ·
[0114](../../docs/adr/0114-companion-public-function-access.md), 명세는 `docs/specs/ai-companion-api.md`.

| 마이그레이션 | 내용 |
|---|---|
| `20261108120000_companion_foundation.sql` (M0) | `companion` 스키마 · 학습 표현 · 컴패니언 프로필 |
| `20261109120000_companion_chat_core.sql` (M1) | 캐릭터 · 대화 · 메시지 · 고지 · 이용 시간 · 판정 · 신고, 앱용 · 운영 조회 함수 |
| `20261110120000_companion_feedback.sql` (M2) | 피드백 표 `corrections` · 메시지 목록에 피드백 |
| `20261111120000_companion_cast_memory.sql` (M3) | 설정 한 행 `companion.settings` · 페르소나 다섯 · 장기 메모리 · 반복 위반 · 선톡 · 요약 · 운영자 함수 |
| `20261112120000_companion_credits.sql` (M4) | 지갑 · 원장 · 예약 · 체험 사용량 · 티어, 지급 · 소멸 · 정리 · 조회 |
| `20261113120000_companion_turn_v2.sql` | 판정 · 시작 · 끝을 M2 ~ M4까지 합친 판 |

통합 테스트 CF1 ~ CF11 · CH1 ~ CH10 · TV1 ~ TV10, 함수 단위 테스트 CS1 ~ CS10 · SG · CE · BR · LL · EV.

**턴 흐름** — 판정(시험 계정 · 티어 · 연령 · 일시 차단 · 이용 시간 · 멱등) → 시작(체험 · 크레딧 예약 + 유저 메시지 저장, 한 트랜잭션) →
SSE → 입력 검사 · 메인 답변 · 피드백을 동시에 → 위기(`crisis`) · 차단(`guardrail_blocked`) / 조각(`delta`, 미성년자 · 나이 모름은 출력 검사 뒤) ·
교정(`correction`) → 끝(피드백 · 친밀도 → 말투 · 화제 · 제재 · 예약 확정/해제, 한 트랜잭션) → `state` · `done` → 스트림을 닫고 기억 추출 · 요약.

**값을 바꾸는 곳** — 단가 · 체험 수 · 말투 문턱 · 선톡 공백 · 제재 횟수 같은 값(PRD §8 C · O1 ~ O5 초안)은 `companion.settings` 한 행이다.
SQL 편집기에서 `update companion.settings set trial_limit = 30;`처럼 바꾸면 배포 없이 다음 턴부터 적용된다. `testers_only`가 참이면(기본)
`duru_tester` 계정만 쓴다.

**아직 없는 것** — 선톡 푸시(`send-push`에 컴패니언 목적지 필요 — 메시지는 저장된다) · 성인 턴의 사후 출력 검사 작업 · 의미 검색(pgvector — 임베딩 모델 미정이라 최근 기억을 넣는다) ·
결제(영수증 검증 · 웹 결제 — 결제 작업이 `companion_grant_credits` · `companion_set_entitlement`를 부른다) · 스포일러 게이트(해금 에피소드 밖 서사 차단은 프롬프트 지시만).

### 환경 · 비밀

비밀 값은 `supabase/functions/.env`(견본 `env.example`, `.env`는 커밋되지 않는다 — 루트 .gitignore가 `.env` · `.env.*`를 막는다)에 넣는다. 로컬 `supabase functions serve`가 이 파일을 읽고,
운영은 `supabase secrets set --env-file supabase/functions/.env`로 올린다.

| 이름 | 필수 | 뜻 |
|---|---|---|
| `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | 예 | Edge 런타임이 넣어 준다 — 파일에 적지 않는다 |
| `ANTHROPIC_API_KEY` | `COMPANION_LLM=anthropic`일 때 | 컴패니언 전용 키(원가 분리 — 위키 05) |
| `COMPANION_LLM` | 아니오 | `anthropic`(기본) 또는 `fake`(키 없이 정해진 답 — 화면 확인용). 키가 없다고 fake로 넘어가지 않는다 |
| `COMPANION_MODEL` | 아니오 | 답변 모델. 기본 `claude-opus-5-5`. `effort: low`, 정책 거절 때 서버 쪽 대체 모델(`fallbacks: "default"`) — `claude-haiku`로 시작하는 모델은 대체 모델이 없어 이 옵션을 빼고 보낸다 |
| `COMPANION_MODERATION_MODEL` | 아니오 | 입력 · 출력 검사 · 기억 추출 · 요약. 기본은 `COMPANION_MODEL` |
| `COMPANION_FEEDBACK_MODEL` | 아니오 | 피드백(교정). 기본은 `COMPANION_MODEL`(검사 모델이 아니다) — 운영(답변 Sonnet · 검사 Haiku)에서는 피드백이 Sonnet으로 돈다 |

fake 모드에서 흐름을 일부러 일으키는 낱말은 `_shared/companion-llm-fake.ts` 머리 주석에 있다(위기 · 차단 · 교정 · 기억 · 친밀도).

### companion-eval — LLM 한 단계 평가

ops-dashboard가 검사 · 피드백 프롬프트를 케이스 묶음으로 돌려 보는 창구다. 운영과 같은 `moderate()` · `feedback()`(같은 프롬프트 · 요청 모양)을
부르고, **DB에 쓰지 않고 크레딧도 쓰지 않는다.** 대신 케이스 하나마다 실제 Claude API 호출이라 **API 비용이 든다**(`COMPANION_LLM=fake`면 들지 않는다).
서버 키(`Authorization: Bearer <서버 키>`, `isServiceKey` 규칙)만 받고, 아니면 401 `{"error":"invalid_session"}`.

- `GET` → `{"models":{"reply","feedback","moderation"},"allowed":["claude-haiku-5-5","claude-sonnet-5-5","claude-opus-5-5"],"llm":"anthropic"|"fake"}`
- `POST {"kind":"moderation"|"feedback","model"?,"cases":[{"id","text","ageBand"?,"layer"?,"l1"?,"context"?}]}` — 케이스 1 ~ 20개, `text` ≤ 2000자,
  `id` ≤ 64자. `model`은 `allowed` 안에서만(생략하면 그 단계에 설정된 모델). 기본값 `ageBand` adult · `layer` input · `l1` null. `context`는
  검사에서는 앞선 유저 메시지(출력 검사), 피드백에서는 바로 앞 캐릭터 말이다.
- 응답 `{"kind","model","results":[{"id","ok":true,"output","ms"} | {"id","ok":false,"error","ms"}]}` — `output`은 판정 `{category, action}` 또는
  `Feedback`. 동시에 4개씩, 케이스마다 턴 경로와 같은 제한 시간(검사 45초 · 피드백 8초 — 넘으면 `error: "timeout"`, 운영이라면 `unavailable`).
  케이스 하나의 실패는 그 케이스만 `ok: false`(`timeout` · `structured_unavailable` · `upstream_<상태>` · `upstream_error`). 본문이 틀리면 400 `invalid_request`.
- 배포: `supabase functions deploy companion-eval`(`config.toml`의 `verify_jwt = false`를 따른다). 비밀은 `chat-send`와 같다.

### 로컬에서 끝까지 돌리기 (운영 DB를 건드리지 않는다)

```sh
cd apps/supabase-functions
supabase start -x studio,imgproxy,mailpit,logflare,vector,supavisor,realtime,storage-api   # 마이그레이션 전부 적용
cp supabase/functions/env.example supabase/functions/.env                                  # 처음 한 번 — 값은 직접
supabase functions serve --no-verify-jwt                                                   # chat-send · companion-proactive · companion-eval
```

시험 계정은 Auth admin API로 `app_metadata: { duru_tester: true }`를 붙여 만든다. 앱 경로는 그 계정의 액세스 토큰,
플레이그라운드 경로는 `Authorization: Bearer <서버 키>` + `x-companion-user-id: <계정 id>`다(서버 키를 가진 ops-dashboard만).
마이그레이션을 고친 뒤에는 `supabase db reset --local`(로컬 DB만 지운다).

### 운영 적용 (사람이 한다)

운영 프로젝트 `duru`에서 개발한다(위키 05). 새로 생기는 것은 `companion` 스키마 · `public.companion_*` 함수 · Edge Function 셋뿐이고,
앱은 아직 컴패니언을 부르지 않는다.

1. `supabase db push --dry-run`으로 **컴패니언 마이그레이션 여섯(20261108 ~ 20261113)만** 올라가는지 본다. `main`의 다른 미배포 마이그레이션이 같이 올라가면 멈추고 담당자와 확인한다(위키 05).
2. `supabase db push`(또는 여섯 SQL을 SQL 편집기에서 차례로).
3. 비밀: `supabase secrets set --env-file supabase/functions/.env`. 키가 아직 없으면 `COMPANION_LLM=fake`로 화면만 먼저 본다.
4. `supabase functions deploy chat-send` · `supabase functions deploy companion-proactive` · `supabase functions deploy companion-eval`(`config.toml`의 `verify_jwt = false`를 따른다).
5. 예약 작업: Vault에 서버 키(`companion_service_role_key`)를 넣고 `supabase/cron/companion.sql`을 SQL 편집기에서 한 번 실행한다.
6. 학습 표현: `node devtools/companion-expressions/build.mjs --base <버킷 주소> --out /tmp/expr`로 만든 `sync-expressions.sql`을 SQL 편집기에서 한 번 실행한다.
7. 시험 계정에 `duru_tester`를 켜고 플레이그라운드에서 정상 · 위기 · 차단 · 크레딧 턴을 한 번씩 돌린다.

되돌리기: 함수는 `supabase functions delete chat-send` · `companion-proactive` · `companion-eval`, 예약은 `select cron.unschedule('companion-…')`.
표 · 함수는 `drop schema companion cascade` 뒤 `public.companion_*` 함수를 지운다(다른 기능이 쓰지 않는다).
