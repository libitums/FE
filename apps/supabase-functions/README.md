# @libitums/supabase-functions

Supabase Edge Function 앱이다. 함수는 `delete-account`, `send-push`(서버 푸시, 아래 「send-push」 ·
[ADR-0034](../../docs/adr/0034-server-push-notifications.md)) · `push-campaigns`(자동 캠페인, 아래), `chat-send` · `companion-proactive`(AI 컴패니언 턴 · 선톡, 아래 「AI 컴패니언」) · `revenuecat-webhook`(구독, 아래) · `admob-ssv`(광고 보고 티켓, 맨 아래). 먼저 `delete-account` — 로그인한 사용자가 자기 계정을 지운다
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

## push-campaigns (자동 푸시 캠페인 — ADR-0130 D12)

매시 예약 작업이 서버 키로 부르는 함수다. 지금은 빈도 실험(ADR-0208)이다 — 사람마다 고정된 칸(안 보냄 · 하루 1번 · 하루 2번)으로
현지 12시 · 20시에 보내고, 쉰 지 7일까지는 매일, 그 뒤는 10 · 14 · 21 · 30 · 45 · 60일째에 복귀 알림을 보낸다.
배정은 보내기 전에 `push_campaign_sends`에 남긴다(실패하면 보내지 않음) — `variant` a = 하루 1번, b = 하루 2번, `story_step` = 간 문구.
규칙은 `_shared/push-campaign-config.ts`, 문구는 `_shared/push-campaign-copy-*.ts`, 판정은 `_shared/push-campaign-plan.ts`.

배포 순서: ① 마이그레이션 `20261210120000_push_campaigns.sql` ② `supabase functions deploy push-campaigns`
③ 미리보기 — 서버 키로 `{"dryRun": true}` POST(기록 · 발송 없음) ④ `supabase/cron/push-campaigns.sql`을 SQL 편집기에서 한 번.
끄기: `select cron.unschedule('push-campaigns-hourly');`

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
(사본 `_shared/companion-contract/`), 결정은 [ADR-0131](../../docs/adr/0131-companion-schema.md) · [0132](../../docs/adr/0132-companion-contract-package.md) ·
[0133](../../docs/adr/0133-companion-public-function-access.md), 명세는 `docs/specs/ai-companion-api.md`.

| 마이그레이션 | 내용 |
|---|---|
| `20261108120000_companion_foundation.sql` (M0) | `companion` 스키마 · 학습 표현 · 컴패니언 프로필 |
| `20261109130000_companion_chat_core.sql` (M1) | 캐릭터 · 대화 · 메시지 · 고지 · 이용 시간 · 판정 · 신고, 앱용 · 운영 조회 함수 |
| `20261110120000_companion_feedback.sql` (M2) | 피드백 표 `corrections` · 메시지 목록에 피드백 |
| `20261111120000_companion_cast_memory.sql` (M3) | 설정 한 행 `companion.settings` · 페르소나 다섯 · 장기 메모리 · 반복 위반 · 선톡 · 요약 · 운영자 함수 |
| `20261112120000_companion_credits.sql` (M4) | 지갑 · 원장 · 예약 · 체험 사용량 · 티어, 지급 · 소멸 · 정리 · 조회 |
| `20261113120000_companion_turn_v2.sql` | 판정 · 시작 · 끝을 M2 ~ M4까지 합친 판 |
| `20261114120000_companion_inspect_docs.sql` | 운영 조회 `companion_inspect_characters()` · `companion_inspect_settings()`(문서 화면) · 덕수쌤 `banmalFeedback: correction` |
| `20261115120000_companion_proactive_prefs.sql` | 선톡 빈도 유저 설정(off · daily1 · daily2) · 선호 시각 · 시간대 · 조용한 시간, 앱 프로필 · 운영자 함수 확장 |
| `20261116120000_companion_feedback_card.sql` | 피드백 고정 카드 — `corrections.card` 열 · `correction_json`(옛 행은 읽을 때 카드로) · `companion_finish_turn` 피드백 저장 |
| `20261117120000_companion_refusal_memory_cap.sql` | 성격대로 거절 — `companion_turn_status` · 페르소나 `refusalLines`, 기억 상한 — `settings.memory_cap` · `shared_memory_cap` · `memories.user_edited` · `companion_add_memories` 지우기 · `companion_list_memories` `{ memories, count, cap, full }` |
| `20261118120000_companion_reply_suggestions.sql` | 추천 답변 칩 — `messages.suggestions` · `profiles.reply_suggestions` 열, `companion_suggest_context` · `companion_save_suggestions`, 앱 프로필 · 운영자 함수 확장 |
| `20261119120000_companion_auto_suggestions.sql` | 추천 답변 칩 자동 — `companion_turn_gate`가 `replySuggestions`를 돌려준다 · 메시지 목록(`message_json`)에 `suggestions` |
| `20261120120000_companion_turn_cost.sql` | 턴 비용 · 지난 대화 — `companion_begin_turn`의 지난 대화를 마지막 요약 뒤 메시지로, 기억 묶음 `settings.memory_every` · `conversations.memory_extracted_until` · `companion_memory_source` · `companion_mark_memories` |
| `20261121110000_companion_suggestion_feedback.sql` | 칩을 그대로 보낸 메시지는 피드백 건너뛰기 — `corrections.status`에 `skipped` · `correction_json`의 `reason` · `companion_turn_status`의 `latestSuggestions` |
| `20261121120000_companion_greeting.sql` | 첫 인사 — `messages.origin`에 `greeting` · 페르소나 `greetingLines` · `companion_greet_context` · `companion_save_greeting` |
| `20261122120000_companion_suggestion_v2.sql` | 칩 2판 — `settings.suggestions_enabled` · `suggestion_display_max` · `companion.choice_sets` · `companion_turn_status` 칩 셋 · `companion_record_choice` · `companion_suggestion_stats` · 기억 원문의 `inputSource` · 1판 의도 이름 바꾸기, 첫 인사만 있는 대화의 선톡 제외 |
| `20261123120000_companion_quality.sql` | 품질 보완 — 답 없는 선톡(`settings.proactive_unanswered_limit` · `proactive_backoff` · `companion.proactive_conversation_skip_reason`) · 선톡 맥락 · 선톡 칩(`companion_save_proactive`의 `p_suggestions`), 기억 고치기 · 잊기(`companion_apply_memory_ops` · `memories.history` · `updated_at` · `deleted_reason`), 쉬는 대화의 기억(`settings.memory_flush_idle` · `companion_memory_flush_candidates` · `companion_memory_source(…, p_flush)`), 요약 원문의 `inputSource` |
| `20261124120000_companion_ratings_resend.sql` | 답변 평가 — `companion.message_ratings` · `companion_rate_message`(앱) · `companion_operator_rate_message`(플레이그라운드) · 메시지 줄의 `rating` · `companion_rating_stats`, 고쳐서 다시 보내기 — `companion_begin_replacement`(이전 턴 숨기기 + 시작, 막히면 되돌림) · 메시지 목록에서 고쳐서 숨긴 턴 빼기 · 칩 지표에서도 빼기 |
| `20261125120000_companion_learning.sql` | 학습 표현 넣기 — `settings.learning_*`(켜기 · 최소 간격 · 시작 확률 · 강제 턴 · 하루 상한) · `companion.user_expressions`(유저 × 표현: 노출 · 유도 · 칩 · 산출 횟수와 시각) · `companion_record_learning` · `companion_learning_context`가 유저 기록 · 낸 에피소드 · 넣기 설정을 더 줌 · 카드의 `learnedUsed` · `companion_learning_stats` |
| `20261126120000_companion_learning_scope.sql` | 배운 표현 범위 — `profiles.learning_scope` · `learning_units`, `companion.episodes` · `companion.sync_episodes`, `companion_learning_scope` · `companion_set_learning_scope`(앱) · `companion_operator_learning_scope` · `companion_operator_set_learning_scope`(플레이그라운드), `companion_learning_context`가 범위를 따르고 `scope` 를 더 줌 |
| `20270114120000_companion_memory_local_date.sql` | 기억 원문에 학습자 현지 날짜 `localDate` · 기존 기억은 이 캐릭터 층만(ADR-0210) |
| `20270114130000_companion_memory_per_character.sql` | 공유 기억을 나온 대화의 캐릭터 층으로 옮김 · 원본이 사라진 공유 기억은 잊음(ADR-0210 D6, 다시 적용해도 같음) |
| `20270114140000_companion_memory_prompt_window.sql` | 답 프롬프트 기억 — 지난 대화 창 안 원본의 기억은 빼고(캐시 유지) · `memory_prompt_limit` 50(ADR-0210 D7 · D8) |

통합 테스트 CF1 ~ CF11 · CH1 ~ CH10 · TV1 ~ TV13 · ID1 ~ ID3 · PP1 ~ PP9 · RM1 ~ RM8 · RS1 ~ RS8 · AS1 ~ AS3 · TC1 ~ TC4 · SN1 ~ SN2 · GR1 ~ GR4 · SV1 ~ SV6 · QL1 ~ QL6 · RR1 ~ RR6 · LE1 ~ LE4, 함수 단위 테스트 CS1 ~ CS39 · SG · CE · BR · LL · EV · FB · SF · RF · SU · GT · PR · LN · LM.

**턴 흐름** — 판정(시험 계정 · 티어 · 연령 · 일시 차단 · 이용 시간 · 멱등) → 시작(체험 · 크레딧 예약 + 유저 메시지 저장, 한 트랜잭션) →
SSE → 입력 검사 · 메인 답변 · 피드백을 동시에 → 위기(`crisis`) · 입력 차단(단계에 따라 성격대로 거절 또는 `guardrail_blocked`, 아래) / 조각(`delta`, 미성년자 · 나이 모름은 출력 검사 뒤) ·
교정(`correction`) → 답 조각이 다 모이면 L1 번역(`translation`)과 칩 스위치가 켜졌으면 추천 답변 칩(`suggestions`)을 남은 기다림과 동시에 → 끝(피드백 · 친밀도 → 말투 · 화제 · 제재 · 예약 확정/해제, 한 트랜잭션) → `state` · `done` → 스트림을 닫고 칩 저장 · 기억 묶음(유저 메시지가 `memory_every`개 모였을 때) · 요약(아래 「턴 비용 · 지난 대화」).

**값을 바꾸는 곳** — 단가 · 체험 수 · 말투 문턱 · 선톡 공백 · 제재 횟수 같은 값(PRD §8 C · O1 ~ O4 초안)은 `companion.settings` 한 행이다.
**피드백 방식 기본값 — 결정: separate (2026-11-09, PRD O5).** 프로필 `feedback_mode`가 비면 `separate`(교정은 따로 오고 답은 고치지 않는다).
SQL 편집기에서 `update companion.settings set trial_limit = 30;`처럼 바꾸면 배포 없이 다음 턴부터 적용된다. `testers_only`가 참이면(기본)
`duru_tester` 계정만 쓴다.

**아직 없는 것** — 선톡 푸시(`send-push`에 컴패니언 목적지 필요 — 메시지는 저장된다) · 성인 턴의 사후 출력 검사 작업 · 의미 검색(pgvector — 임베딩 모델 미정이라 최근 기억을 넣는다) ·
결제(영수증 검증 · 웹 결제 — 결제 작업이 `companion_grant_credits`를 부른다. 구독 등급은 `plan_entitlements`(웹훅)이고, `companion_set_entitlement`는 20261212부터 시험 계정만 받는다) · 스포일러 게이트(해금 에피소드 밖 서사 차단은 프롬프트 지시만).

**턴 비용 · 지난 대화(20261120).**

- **지난 대화 = 마지막 요약 뒤 메시지 전부**(`companion_begin_turn`, 상한 `p_history_limit` 100 — 요약이 계속 실패할 때만 닿는다). 요약은 그대로
  `companion_summary_source(p_keep 20)` + `settings.summary_after`(30)라, 지난 대화는 20개에서 49개까지 **뒤로 붙기만 하다가** 50개에 닿으면 오래된 30개가
  요약되어 빠진다. 전에는 최근 20개 고정 창이라 창 밖 ~ 요약 사이(최대 29개 — 약 15턴)가 원문에도 요약에도 없었고, 창이 매 턴 밀려 지난 대화의 캐시가 맞지 않았다.
- **답 모델 캐시** — 시스템 앞부분(규칙 · 페르소나)과 **지난 대화의 마지막 메시지**에 캐시 표시. 이번 턴 지시(화제 전환 · 학습 표현 삽입, `companion-branching.ts`)는
  시스템 프롬프트가 아니라 유저 말 뒤의 `role: "system"` 메시지(`ReplyRequest.directive`)라 앞부분을 바꾸지 않는다. 거절 지시 · 선톡 지시는 그대로 시스템에 있다(드물다).
- **구조화 호출 캐시** — 검사 · 피드백 · 번역 · 기억 · 칩의 시스템 글에 캐시 표시. Claude 5 세대의 캐시 최소 길이(512토큰)보다 짧은 글(번역 등)은 표시가 있어도
  캐시되지 않을 뿐 오류는 없다.
- **기억 묶음** — 기억 추출은 턴마다가 아니라 `conversations.memory_extracted_until` 뒤의 정상 유저 메시지가 `settings.memory_every`(기본 5)개 모이면 한 번
  (`companion_memory_source` → 추출(최대 5개) → `companion_add_memories`(멱등 키 = 묶음의 마지막 유저 메시지) → `companion_mark_memories`). 최근 메시지는 어차피
  지난 대화로 답 모델에 들어가므로 이 캐릭터와의 대화에는 잃는 것이 없고, 다른 캐릭터가 공유 기억을 받는 것만 몇 턴 늦어진다. 기억이 꺼진 판정(미국 12 ~ 15세 ·
  나이 모름)은 추출하지 않고 표시만 옮긴다. 표시 없는 오래된 대화는 최근 40개만 본다. 턴 뒤 로그 `memory_batch=`.
- **입력 검사의 맥락** — 바로 앞 캐릭터 말 한 줄을 「맥락일 뿐」으로 함께 준다(「응 할게」처럼 앞 말을 봐야 뜻이 정해지는 글). 판정은 늘 유저 글에만.
- **사용량 기록** — 호출마다 API usage(입력 · 캐시 읽기 · 캐시 쓰기 · 출력 토큰)를 단계별(`reply` · `moderation_input` · `moderation_output` · `feedback` · `translation` ·
  `suggestions` · `memory` · `summary`)로 더해 캐릭터 메시지 `meta.usage`(턴 · 거절 · 위기 · 선톡)에 저장하고, 로그 끝에 `usage reply=입력/캐시읽기/캐시쓰기/출력 …`로
  남긴다. 턴 뒤 작업(기억 · 요약)은 메시지가 이미 저장된 뒤라 로그(`companion_after_turn`)에만. `meta`는 앱에 돌려주지 않고 운영 조회에 보인다.

### 환경 · 비밀

비밀 값은 `supabase/functions/.env`(견본 `env.example`, `.env`는 커밋되지 않는다 — 루트 .gitignore가 `.env` · `.env.*`를 막는다)에 넣는다. 로컬 `supabase functions serve`가 이 파일을 읽고,
운영은 `supabase secrets set --env-file supabase/functions/.env`로 올린다.

| 이름 | 필수 | 뜻 |
|---|---|---|
| `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | 예 | Edge 런타임이 넣어 준다 — 파일에 적지 않는다 |
| `ANTHROPIC_API_KEY` | `COMPANION_LLM=anthropic`일 때 | 컴패니언 전용 키(원가 분리 — 위키 05) |
| `COMPANION_LLM` | 아니오 | `anthropic`(기본) 또는 `fake`(키 없이 정해진 답 — 화면 확인용). 키가 없다고 fake로 넘어가지 않는다 |
| `COMPANION_MODEL` | 아니오 | 답변 모델. 기본 `claude-opus-5-5`. 생각 깊이는 `COMPANION_REPLY_EFFORT`(기본 low), 정책 거절 때 서버 쪽 대체 모델(`fallbacks: "default"`) — `claude-haiku`로 시작하는 모델은 대체 모델이 없어 이 옵션을 빼고 보낸다 |
| `COMPANION_REPLY_EFFORT` | 아니오 | 답변의 생각 깊이(`output_config.effort`). `low`(기본) 또는 `medium`. 모르는 값이면 설정 오류(500). 평가에서는 모델 `…@medium`으로 견준다(아래 companion-eval) |
| `COMPANION_MODERATION_MODEL` | 아니오 | 입력 · 출력 검사 · 기억 추출 · 요약(· 피드백 · 번역 · 칩의 기본값). 기본은 `COMPANION_MODEL` |
| `COMPANION_FEEDBACK_MODEL` | 아니오 | 피드백(교정). 기본은 `COMPANION_MODERATION_MODEL` — 운영(답변 Sonnet · 검사 Haiku)에서는 피드백이 Haiku로 돈다(2026-11-10, 전에는 `COMPANION_MODEL`을 따라 Sonnet). 되돌리려면 이 값을 `claude-sonnet-5-5`로 |
| `COMPANION_TRANSLATION` | 아니오 | 캐릭터 답의 L1 번역. `every`(기본, 턴마다) 또는 `off`. 모르는 값이면 설정 오류(500). PRD O9(매 메시지 · 탭할 때)가 정해지면 바꾼다 |
| `COMPANION_TRANSLATION_MODEL` | 아니오 | L1 번역 모델. 기본은 `COMPANION_MODERATION_MODEL`(운영 Haiku) |
| `COMPANION_SUGGEST_MODEL` | 아니오 | 추천 답변 칩 모델(`chat-send`의 매 턴 칩 · `companion-suggest`). 기본은 `COMPANION_MODERATION_MODEL`(운영 Haiku) |
| `COMPANION_STORY_READ_MODEL` | 아니오 | 사진 스토리의 읽기 단계(`companion-my-story` · `companion-story-reactions`의 다시 보기, ADR-0191 D11) 모델. 기본 `claude-sonnet-5-5` |
| `COMPANION_STORY_PLAN_MODEL` | 아니오 | 친구 스토리 주간 기획(`companion-story-studio`, ADR-0192)의 소재 조사(웹 검색) · 초안 쓰기 모델. 기본 `claude-sonnet-5-5`. 최종 승인의 번역은 Haiku 고정 |
| `COMPANION_CONTENT_BUCKET` | 아니오 | 친구 스토리 그림 일꾼(`companion-story-images`)이 그림을 올리는 공개 콘텐츠 버킷. 기본 `content` — 앱이 읽는 버킷과 같아야 한다(스테이징 `content-test`) |
| `COMPANION_REACTION_MODEL` | 아니오 | 내 스토리 반응(`companion-story-reactions`, ADR-0191 D5)의 답 모델. 기본 `claude-sonnet-5-5` — 대화의 `COMPANION_MODEL`과 따로 고른다. 다른 함수는 읽지 않는다 |
| `COMPANION_REACTION_CHECK_MODEL` · `COMPANION_REACTION_TRANSLATION_MODEL` · `COMPANION_REACTION_SUGGEST_MODEL` | 아니오 | 내 스토리 반응의 출력 검사 · 번역 · 추천 답안 칩 모델. 기본 `claude-haiku-5-5`(칩은 `COMPANION_SUGGEST_MODEL`이 있으면 그 값). 다른 함수는 읽지 않는다 |
| `OPENAI_API_KEY` | 스냅샷에 | `companion-snapshot`의 이미지 편집. 없으면 스냅샷이 503 `not_configured` |
| `ELEVENLABS_API_KEY` | 음성에 | `companion-voice`의 TTS. 없으면 음성이 503 `not_configured` |
| `COMPANION_SNAPSHOT_MODEL` | 아니오 | 스냅샷 프롬프트 · 검사 노드 모델. 기본 `claude-haiku-5-5`(lab과 같다). 키는 `ANTHROPIC_API_KEY` |

fake 모드에서 흐름을 일부러 일으키는 낱말은 `_shared/companion-llm-fake.ts` 머리 주석에 있다(위기 · 차단 · 교정 · 섞인 언어 · 말투 · 맞춤법 · 기억 · 친밀도). fake 번역은 `[언어] 원문`이다.

**L1 번역** — 답 조각이 다 모이면(미성년자 · 나이 모름은 출력 검사와 동시에) 번역을 한 번 부르고, 피드백 기다림과 함께 기다린다. 조각 delta 뒤 ·
`state` 앞에 조각마다 `translation {segment, text}`을 보내고, 저장 조각에 `translation`을 붙인다(메시지 목록 · 운영 조회에 보인다 — 계약
`companion-messages-page`의 segment에 선택 칸). 저장 번역은 답 모델의 history에 다시 넣지 않는다. 학습자 언어가 `ko…`면 건너뛰고, 모르면 영어.
제한 시간 6초 — 실패 · 시간 초과 · 줄 수가 다르면 번역 없이 턴을 끝내고 로그(`translation_unavailable`)와 meta(`translation`)에 남긴다. 차단 · 위기 답은
번역을 내보내지도 저장하지도 않는다. 선톡도 같은 번역을 붙여 저장한다(이벤트 없음). 로마자 표기는 앱이 규칙으로 만든다.
늘어나는 지연: 성인은 답이 끝난 뒤 번역만큼(피드백이 더 늦으면 0), 미성년자는 출력 검사와 겹쳐 둘 중 긴 쪽만큼 `state` · `done`이 늦어진다.

**피드백 카드(20261116)** — 피드백은 한 모양이다. 칸은 늘 모두 있고 앱은 이 순서로 그린다(Moly 형식) — 올바른 문장(`corrected`) →
고칠 점 목록(`items` — 원문 표현 · 고친 표현 · 이유, 한 메시지에 여럿일 수 있다) → 분명히 도움이 될 때만 더 나은 표현(`better` — 표현 · 뜻 · 설명).

```jsonc
{ "userMessageId": "…", "status": "ok",            // ok · none · unavailable
  "kind": "correction",                            // correction · better · l1_to_ko — ok가 아니면 null
  "original": "저는 마리아 이에요",                   // 학습자 메시지 그대로
  "corrected": "저는 마리아예요",                     // 모든 고침을 적용한 올바른 문장 전체 — ok면 늘 있다(better는 더 나은 문장 전체)
  "items": [{ "original": "마리아 이에요", "corrected": "마리아예요", "reason": "Use 예요 after a vowel." }], // 고칠 점마다 하나 · l1_to_ko면 []
  "better": { "text": "저는 마리아라고 해요.", "meaning": "My name is Maria.",
              "explanation": "A natural way to introduce yourself." },  // 분명히 도움이 될 때만, 아니면 null — 뜻 · 설명은 학습자 언어
  "meaning": "I'm Maria." }                        // corrected의 뜻 — l1_to_ko면 늘 있다, 아니면 null일 수 있다
```

`none` · `unavailable`은 `kind` · `corrected` · `better` · `meaning`이 null이고 `items`가 `[]`이다. 서버는 모델 결과를 이 모양으로 다듬는다(교정에
고친 문장이 빠지면 조각을 적용해 채우고, 본문이 없으면 `none`). 저장은 `corrections.card`, 카드 이전에 저장된 행은 읽을 때 카드로 바뀐다(옛 교정 행은
고친 문장 전체가 없어 `corrected`가 null). 앱이 피드백을 쓰기 전이라 계약 판(1)은 올리지 않았다. 프롬프트는 고칠 점을 합치거나 빼지 말고 하나씩
따로 적고 `corrected`에는 모두 적용하라고 한다.

**피드백 규칙** — `_shared/companion-llm-prompts.ts`. 한국어가 아닌 부분이 있으면(전부 · 일부) `l1_to_ko`로 메시지 전체를 자연스러운 한국어
(`corrected` — 앱이 「자연스러운 한국어 표현은 …」으로 보인다)와 뜻(`meaning`)으로 돌려주고, 한국어로 써야 하는 이유는 말하지 않는다. 한 메시지 안의
말투 섞임 · 맞춤법 · 문법은 `correction`, 존댓말 관계(또는 선생님 · 어른 캐릭터)에 반말은 `better`(존댓말 제안), 반말 관계의 존댓말은 피드백 없음.
페르소나 칸 `banmalFeedback: "correction"`인 캐릭터(지금은 덕수쌤 — 마이그레이션 20261114)는 존댓말 관계의 반말을 `correction`으로 고친다.
띄어쓰기는 뜻이 바뀌거나 읽기 어려울 때만, ㅋㅋ · ㅎㅎ · ㅇㅇ · ~ · 이모지는 피드백 없음. `better`는 원어민에게 분명히 어색할 때 하나만, 애매하면 `none`.
상대를 겨냥하지 않은 혼잣말 욕(「아 씨 시험 망했어」 · ㅅㅂ · 존나)은 `better`로 순화한 문장과 「비속어」라는 이유를 준다. `*…*` 안(행동 · 속마음)의
한국어도 고치지만 말투는 판정하지 않는다.
피드백 요청에는 관계 말투 단계와 캐릭터(이름 · 역할)가 들어간다. 최근 대화 6개(유저 · 캐릭터 합쳐 약 세 번 주고받기, 상수 `feedbackHistoryLimit` —
글자만, 번역 · 숨김 · 차단 메시지 없음)를 「맥락일 뿐 — 마지막 학습자 메시지만 피드백」이라는 틀로 user 메시지에 싣는다. 시스템 글은 (언어 · 말투 단계 ·
반말 규칙)마다 같다 — 규칙 본문(앞)은 모든 요청에 같고 학습자 언어 · 말투 단계 규칙만 끝의 「# This message」에 둬서, 앞부분에만 `cache_control`을 달아
언어 · 말투가 달라도 같은 캐시를 읽는다(`feedbackSystemParts`, 아래 「턴 비용 · 지난 대화」). 피드백 제한 시간(8초)은 그대로다.

**비속어 가드레일** — 검사 분류에 `profanity`. 모든 연령에서 캐릭터를 겨냥한 **심한** 욕(병신 · 씨발놈 · 개새끼 · fuck you · putang ina mo · đụ má mày) ·
혐오 표현 · 성희롱 · 비하 · 위협만 입력 차단(다른 차단처럼 반복 위반으로 센다). 가벼운 놀림(바보 · 멍청이 · idiot · dummy · tonto · bobo)은 통과(`safe`)이고
피드백도 비속어로 고치지 않는다(2026-11-09 결정). 혼잣말 욕은 통과(피드백이 순화). 언어를 가리지 않는다 — 검사 지시는 「어떤 언어든」이라고 하고 한국어 · 영어 · 타갈로그어 · 베트남어 · 인도네시아어 ·
일본어 · 스페인어 · 타이어 예(가린 꼴 포함)를 든다. 위기 판정도 「어떤 언어든」이고 미얀마어까지 예를 든다(미얀마어 욕설 예는 확인할 수 있는 것이 없어 넣지 않았다). 캐릭터 답의 욕은 가벼워도 출력 차단 — 출력 동기 검사는 미성년자 · 나이 모름 턴에만 돌아서, 성인 턴은 답
프롬프트의 금지 규칙(가장 편한 말투 slang도 욕이 아니라 친근한 말)에 기댄다. 띄어 쓰거나 줄이거나 로마자로 쓰거나 가린 꼴(ㅅㅂ · 시1발 · ㅂㅅ · f*ck · đ.m · k*so)까지. 피드백 · 번역은 학습자 언어(BCP 47)를 그대로 받고, 기본값 en 말고 언어를 박아 둔 곳은 없다.

**성격대로 거절 — 단계 제재(20261117, PRD §3.11 5층).** 입력 검사 차단(위기 아님)은 턴 시작 때 읽은 반복 위반 수(`companion_turn_status` — 지금
`strike_window` 안의 수 · `strike_limit`)에 이번 차단을 더해 단계를 고른다. 기본값(상한 3 · 창 24시간 · 차단 30분)이면 첫째 **회피**(캐릭터가 성격 · 말투대로 가볍게
피하고 다른 화제를 묻는다), 둘째 **경고**(그런 말은 안 된다고 분명히 말하고 다른 얘기를 권한다), 셋째 **일시 차단**(지금처럼 `start` → `error guardrail_blocked`,
다음 턴부터 403 `temporarily_blocked`). 일반식: 상한 번째 = 차단, 그 하나 앞 = 경고, 그 앞 = 회피. 세는 일은 그대로 `companion_finish_turn`이 한다.
거절 답은 답 모델이 페르소나 시스템 프롬프트에 거절 지시(`refusalDirective` — `_shared/companion-llm-prompts.ts`, `?docs=1`의 `prompts.refusal`)를 넣어 만든다.
**학습자의 걸린 글은 모델에 주지 않는다** — 유저 말 자리는 분류만 적은 앱 안내(`refusalUserText`), 지난 대화는 그대로. 대사 둘 · 행동 하나까지, 미성년자 · 나이 모름은
보통 답과 같은 출력 검사. 생성 실패 · 시간 초과(10초) · 출력 검사 차단이면 페르소나 `refusalLines[단계][말투]`(없으면 존댓말 줄, 그것도 없으면 코드 기본 줄)로 끝낸다.
스트림: `start` → `notice` → `delta` → `translation` → `state` → `done { refusal: { stage } }` — `correction` 없음(차단 턴의 피드백은 그대로 없다).
저장: 유저 메시지 `blocked`, 거절은 보통 assistant 메시지(`complete`, 차감 0)에 meta `refusal: true` · `refusalStage` · `refusalCategory` · `refusalSource`(model · canned).
예약은 풀리고(차감 없음) 반복 위반으로 센다. 기억 추출 · 요약은 돌리지 않는다. 출력 검사 차단(캐릭터 답이 걸린 것)은 거절하지 않고 지금처럼 `guardrail_blocked`.
`companion_turn_status`를 읽지 못하면 입력 차단은 지금처럼 `guardrail_blocked`다.

**기억 상한(20261117).** 의미 검색 전까지 기억 수만 막는다. `settings.memory_cap`(유저 · 캐릭터마다, 기본 50) · `settings.shared_memory_cap`(공유 기억, 기본 30).
턴 뒤 추출이 상한에 닿으면 유저가 고치지 않은 가장 오래된 기억부터 지운다(`deleted_at`, 운영 조회에 `deleted`). `companion_update_memory`로 고친 기억(`user_edited`)은
지우지 않고, 지울 것이 없으면 새 기억을 넣지 않는다 — **가득 참**(그 층이 상한 이상이고 모두 고친 것). 따로 저장하지 않고 늘 계산하므로 하나 지우거나 상한을 올리면 풀린다.
`companion_add_memories` → `{ added, evicted, skipped, full }`(턴 뒤 로그 `memories= evicted= memory_full=`), `companion_list_memories(p)` → `{ memories[{…, userEdited}], count, cap, full }`
(계약 `companion-memories`), SSE `state.memoryFull`(이 캐릭터 또는 공유 층이 가득 참 — 턴 시작 때 값), 운영 `companion_inspect_memory`에 `capacity { character, shared }` · `userEdited`.

**기억은 캐릭터마다(ADR-0210, 20270114130000).** 추출은 늘 이 캐릭터 층에 쓰고(공유 층에 쓰지 않음), 원문 묶음의 기존 기억도 이 캐릭터 층만 준다. 기존 공유 기억은 나온 대화의
캐릭터 층으로 옮겼다. 답 프롬프트에는 이 캐릭터 층에서 최신 50개를 넣되, 원본 메시지가 아직 지난 대화 창 안에 있는 기억은 뺀다(원문이 창에 있고,
넣으면 기억 묶음마다 캐시가 깨진다 — 20270114140000). 공유 층 칸(`shared_memory_cap` · `capacity.shared` · `companion_list_memories(null)`)은 남아 있지만 비어 있다.

**학습자의 `*…*`** — `*웃으며* 안녕하세요` · `*배고프다…*`처럼 별표 안은 학습자의 행동 · 속마음이다. 답 프롬프트: 행동에는 자연스럽게 반응하고,
속마음은 장면에 맞으면 가볍게 받아도 되지만 엿들은 것처럼 그대로 되풀이하지 않는다. 검사는 별표 안까지 전체를 본다. 저장 글은 친 그대로다.

**기억 고치기 · 쉬는 대화(20261123).** 턴 뒤 기억 묶음(아래 「턴 비용」)은 기존 기억을 번호(m1 …, 유저가 고친 것은 locked)로 보여 주고, 추출 모델이 더하기 ·
고치기(이사 · 계획이 바뀜) · 잊기(더는 맞지 않음)를 고른다(`companion-memory.ts`). `companion_apply_memory_ops`가 잊기 · 고치기를 먼저, 더하기를 나중에 적용한다 —
고치기는 옛 글을 `memories.history`에 남기고(`updated_at`), 잊기는 `deleted_reason` forgotten, 상한 밀어내기는 evicted. 유저가 고친 기억은 건드리지 않고 `protected`로
센다. 같은 원본 메시지로 두 번 적용하지 않는다. 턴 뒤 로그 `memories= updated= forgotten= protected= evicted=`. 묶음이 차기 전에 대화가 멈추면 예약 작업
(`companion-proactive`에 `{ mode: "memory_flush", batch }`, `supabase/cron/companion.sql`의 `companion-memory-flush` — 10분마다)이 `settings.memory_flush_idle`
(기본 30분) 넘게 조용한 대화의 남은 메시지를 뽑는다(`companion_memory_flush_candidates` → `companion_memory_source(…, p_flush => true)`).

**요약(20261123).** 네 칸 — [학습자] · [이어지는 이야기] · [캐릭터](캐릭터가 스스로 밝힌 사실 · 약속, 앞뒤가 맞게) · [약속], 합쳐 8문장 이하. 칩을 그대로 고른 유저 말은
기억처럼 표시되고 사실로 적지 않는다.

**번역 맥락(20261123).** 바로 앞 대화 세 줄(턴은 이번 유저 말까지, 거절은 걸린 말 빼고)을 「번역하지 않는 맥락」으로, 캐릭터 이름과 페르소나 `glossary`(운영자가 채우는
표기 메모)를 `Names`로 넘긴다 — 시스템 글은 그대로라 캐시된다. 실패 · 개수 틀림이면 제한 시간의 1/3 이상 남았을 때 한 번 다시 시도한다.

**선톡 빈도 — 유저 설정(20261115).** 프로필 `proactive_pref` off · daily1(기본) · daily2, `proactive_hour`(현지 0 ~ 23, null이면 아무 때나), `timezone`(IANA).
판정은 `companion.proactive_skip_reason` 하나(이유 off · no_timezone · quiet_hours · hour · daily_cap · gap · spacing):

| | 하루 횟수 | 마지막 메시지 뒤 | 직전 선톡 뒤 | 선호 시각 |
|---|---|---|---|---|
| off | 0 | — | — | — |
| daily1 | 1 | `proactive_gap`(24시간) | `proactive_spacing`(8시간) | 그 시각 |
| daily2 | 2 | `proactive_gap_daily2`(10시간) | `proactive_spacing`(8시간) | 그 시각과 10시간 뒤 |

- 하루 횟수는 `settings.proactive_daily_cap`(전체 상한, 이 마이그레이션이 기본 1 → 2로)을 넘지 않는다. 선톡도 메시지라 마지막 메시지 시각을 바꾼다 — daily2의
  두 번째가 첫 번째 10시간 뒤 이후인 까닭이다.
- 시간대를 알면(프로필 `timezone`, 없으면 지역 대표 시간대 — KR · JP · PH · IN · VN · TH · ID · MY · SG · TW · HK · CN) 현지 22:00 ~ 08:00에는 보내지 않고 「하루」는
  현지 자정부터다. 선호 시각의 10시간 뒤가 조용한 시간이면 그날은 한 번. 시간대를 모르면(미국처럼 여럿인 나라 포함) 시각 맞추기 · 조용한 시간을 건너뛰고 하루는 UTC.
- 한 회차에 유저마다 후보 하나(가장 오래 조용한 대화). 연령 · 지역 규칙은 그대로.
- 예약 작업은 매시 30분 그대로 둔다 — 유저마다 현지 시각이 달라 매시간 봐야 선호 시각을 맞춘다. 유저마다 보내는 수는 위 규칙이 정한다.
- 유저가 한 번도 말하지 않은 대화(첫 인사만 있음)는 후보가 아니다(20261122) — 맥락의 `hasUserMessage: false`면 함수가 `no_user_message`로 건너뛴다.
- 플레이그라운드 `force`는 빈도 판정을 모두(off 포함) 건너뛴다. 연령 · 지역 규칙과 첫 인사만 있는 대화는 건너뛰지 않는다. 막혔을 까닭은 결과 · meta의 `wouldSkip`.
- **답 없는 선톡(20261123)** — 유저가 그 대화에서 마지막으로 말한 뒤 쌓인 선톡 수(`unanswered`)가 `settings.proactive_unanswered_limit`(기본 2, 0이면 끔)에 닿으면
  더 보내지 않는다(`unanswered_limit`). 그 전에는 공백이 `gap × proactive_backoff^unanswered`(기본 2배씩, 1이면 끔)로 늘어난다(`backoff`). 유저가 한 번 말하면 0.
  판정은 `companion.proactive_conversation_skip_reason`(유저 판정 + 위 둘) — 후보와 맥락이 같이 쓴다.
- **선톡 지시의 맥락(20261123)** — 유저의 마지막 말 뒤 며칠 · 현지 때(아침 · 오후 · 저녁 · 늦은 밤, 시간대를 알 때) · 마지막 유저 말(화제) · 최근 선톡 글 셋
  (같은 말 · 화제 되풀이 금지) · 답 없는 선톡이 있으면 「더 가볍게, 답 안 한 것을 말하지 않기」. 칩 스위치가 켜져 있으면 선톡에도 칩을 붙여 저장하고 칩 지표에 센다.
- 앱: `companion_save_profile(p_birth_year, p_age_source, p_l1, p_feedback_mode, p_proactive_pref = null, p_proactive_hour = null, p_timezone = null)` —
  null은 그대로, `p_proactive_hour = -1`은 지우기(아무 때나), `p_timezone = ''`은 지우기, 틀린 값(모르는 시간대 포함)은 22023. 옛 4인수 호출은 그대로 된다.
  `companion_load_profile()`이 `proactivePref` · `proactiveHour` · `timezone`을 더 돌려준다(계약 `companion-profile`).
- 운영: `companion_operator_set_profile(p_user_id, p_birth_year, p_clear_age, p_l1, p_feedback_mode, p_region, p_proactive_pref = null, p_proactive_hour = null,
  p_timezone = null)` — 지우기 규칙은 앱과 같다. 옛 6인수 호출은 그대로 된다. `companion_inspect_testers()`가 세 값을 보여 준다.

### companion-eval — LLM 한 단계 평가

ops-dashboard가 검사 · 피드백 프롬프트를 케이스 묶음으로 돌려 보는 창구다. 운영과 같은 `moderate()` · `feedback()`(같은 프롬프트 · 요청 모양)을
부르고, **DB에 쓰지 않고 크레딧도 쓰지 않는다.** 대신 케이스 하나마다 실제 Claude API 호출이라 **API 비용이 든다**(`COMPANION_LLM=fake`면 들지 않는다).
서버 키(`Authorization: Bearer <서버 키>`, `isServiceKey` 규칙)만 받고, 아니면 401 `{"error":"invalid_session"}`.

- `GET` → `{"models":{"reply","feedback","moderation"},"allowed":["claude-haiku-5-5","claude-haiku-5-5@medium","claude-sonnet-5-5","claude-opus-5-5"],"llm":"anthropic"|"fake"}`
- `POST {"kind":"moderation"|"feedback"|"translation"|"suggestions"|"learning"|"reply"|"memory","model"?,"cases":[{"id","text","ageBand"?,"layer"?,"l1"?,"context"?,"speechLevel"?,"character"?}]}` — 케이스 1 ~ 20개, `text` ≤ 2000자,
  `id` ≤ 64자. `model`은 `allowed` 안에서만(생략하면 그 단계에 설정된 모델). `@medium`이 붙은 모델은 답변(`reply` · `learning`)만 생각 깊이 medium으로
  돌고(나머지 단계는 같은 모델 그대로), 붙지 않으면 `COMPANION_REPLY_EFFORT`를 따른다 — 한 실행에서 low와 medium을 견주려고 둔다. 기본값 `ageBand` adult · `layer` input · `l1` null. `context`는
  검사에서는 앞선 유저 메시지(출력 검사), 피드백에서는 바로 앞 캐릭터 말이다. 피드백 케이스는 `speechLevel`(polite · casual · slang, 생략하면 모름 —
  말투 선택 규칙을 건너뛴다)과 `character`(`{"name","role"?}`)를 더 받는다. `translation` 케이스는 한국어 한 줄 `text`와 `l1`(생략하면 en)을 받아
  `output: {"text"}`를 돌려준다(운영은 말풍선 묶음을 한 번에 번역한다).
  평가 때 볼 것: 한국어 · 영어가 섞인 입력은 `l1_to_ko` 하나(이유 설명 없음)로, 존댓말 관계의 반말은 `better`로, 반말 관계의 존댓말과 자연스러운 문장은 `none`으로 나와야 한다.
- 피드백 케이스는 `history`(`[{"role":"user"|"assistant","text"}]`, 오래된 것부터, 최대 20 — 운영처럼 마지막 6개만 쓴다)도 받는다. `context`는 계속
  앞 캐릭터 말 한 줄이고, `history`가 있으면 그쪽이 맥락이다.
- 응답 `{"kind","model","results":[{"id","ok":true,"output","ms"} | {"id","ok":false,"error","ms"}]}` — `output`은 판정 `{category, action}` 또는
  피드백 카드(위 「피드백 카드」) 또는 `{text}`. 동시에 4개씩, 케이스마다 턴 경로와 같은 제한 시간(검사 45초 · 피드백 8초 · 번역 6초 — 넘으면 `error: "timeout"`).
  케이스 하나의 실패는 그 케이스만 `ok: false`(`timeout` · `structured_unavailable` · `mismatch` · `upstream_<상태>` · `upstream_error`). 본문이 틀리면 400 `invalid_request`.
- **기억(`kind: "memory"`, ADR-0210)** — 운영 기억 묶음처럼 추출 작업(더하기 · 고치기 · 잊기)을 돌려주고 DB에는 적용하지 않는다(`_shared/companion-eval-memory.ts`).
  케이스: `history`(앞 대화, `picked: true`는 칩을 그대로 고른 유저 말) · `text`(마지막 유저 말) · `memories`(기존 기억, m1 … 순서) · `localDate`(YYYY-MM-DD) ·
  `ageBand`. 모델은 운영처럼 검사 모델, 제한 시간 30초. `output: {"ops":[{…작업, "problems":[…]}], "problems"}` — `problems`는 쓰기 규칙을 어긴 곳(polite ·
  learner_subject · relative_time · trivial). 고정 세트는 `GET ?docs=1`의 `memoryEvalSets`(`expect`는 `memoryVerdict`가 견준다).
- **답장(`kind: "reply"`, 2026-11-14)** — 운영 턴과 같은 시스템 프롬프트로 캐릭터 답장을 만들고 채점 노드가 축마다 채점한다(`_shared/companion-eval-reply.ts` ·
  `companion-eval-judge.ts`). 케이스: `characterId`(DB 카드 `companion_inspect_characters` — 없거나 모르면 `character.name`만, 결과 `persona: "case"`) ·
  `speechLevel` · `ageBand` · `l1` · `expressions`(`[{"surface","gloss"?}]` ≤ 40, 배운 표현) · `memories`(≤ 20) · `summary` · `history` · `text`(학습자의 새 말) ·
  `spoilerNote`(≤ 1000자, **채점자에게만** — 답장 프롬프트에는 없다) · `target`(`{"surface","mode":"expose"|"elicit"}`, 칩은 `unsupported_case`) ·
  `episodes`(끝낸 에피소드 — 운영처럼 「지금까지 이야기」 카드를 대화 처음 모양으로 싣고 채점자가 `canon` 축을 본다, `docs/specs/ai-companion-story.md`).
  본문 `judgeModel`(`allowed` 안, 생략하면 `claude-opus-5-5` — 실행끼리 견주려면 바꾸지 않는다). 응답에 `judgeModel`이 더 있고, `output`은
  `{"segments","persona","story","learned","done","judge":{"axes":{persona,speech,spoiler,level,natural,safety,learning,canon},"summary"} | null,"judgeError"}` —
  축마다 `{"pass","reason"}`(한국어 한 문장), `learning`은 지시가, `canon`은 카드가 없으면 null. 채점이 실패해도 답은 돌려준다(`judge: null` · `judgeError`). 답장 + 채점을 합쳐
  케이스마다 90초. 채점은 생각 깊이 medium이라 대시보드는 묶음을 작게(4개) 보낸다.
- `GET ?docs=1` → ops-dashboard 「문서」 화면: `{"models"(번역 모델 포함),"characters","settings","inspectAvailable","prompts"}`. `characters`는 페르소나 카드 칸 전부 ·
  `id` · `active` · `sortOrder` · `maxSpeechLevel` · `systemPrompt`(말투 상한까지 단계마다), `settings`는 `companion.settings` 한 행. `prompts`는
  `feedback` · `moderation.{input,output_sync}.{adult,minor,unknown}` · `translation` · `memory.{adult,minor}` · `summary` · `proactiveDirective` ·
  `feedbackModes.{separate,natural,prefix}` · `stateLine` — 실제 호출과 같은 함수로 그린 글이다(사본 없음, `_shared/companion-eval-docs.ts`). 대표 입력은
  학습자 언어 en · 성인 · 기억 · 학습 표현 · 요약 없음 · 피드백 방식 separate, 피드백은 존댓말 관계 · 부드러운 반말 규칙으로 그리고, 호출마다 바뀌는 자리는
  `{{l1}}`처럼 표시한다. 마이그레이션 20261114를 적용하기 전에는 `characters` · `settings`가 null이고 `inspectAvailable: false`다. API 비용은 들지 않는다.
- 배포: `supabase functions deploy companion-eval`(`config.toml`의 `verify_jwt = false`를 따른다). 비밀은 `chat-send`와 같다.

### 추천 답변 칩 — chat-send 매 턴 자동 · companion-suggest 다시 만들기

학습자가 탭해서 그대로 보낼 다음 말 1 ~ 2개(설계 문서 「AI 컴패니언 선택지 기능 설계」 §04 ~ §10을 따른 2판, 20261122). **Zeta처럼 유저가 켜고 끄는
스위치**(프로필 `reply_suggestions`, 기본 참)이고, 켜져 있으면 캐릭터 답마다 탭 없이 칩을 만든다. 호출 한 번(`COMPANION_SUGGEST_MODEL`, 기본 검사 모델)이
턴마다 들고, **크레딧을 차감하지 않는다**(차감 · 하루 상한은 열린 질문). **칩 수정은 없다 — 입력 길은 탭 전송 · 직접 입력 둘뿐이다(사용자 결정 2026-11-10).**

**후보 → 검증 → 고르기** — 모델은 숨은 의도를 단 후보 셋을 낸다(`elaborate` 더 말하기 · `ask` 되묻기 · `reflect` 반응 · `redirect` 방향 바꾸기 · `boundary` 경계 ·
`progress` 다음 단계, 정해진 조합 없음). 서버가 후보마다 검증해(`_shared/companion-suggest-select.ts`) 못 지난 것만 뺀다 — 모르는 의도 · 빈 글 · 한글 없음 ·
서식(`*` `<>` 등 · 링크) · 4자 미만 · 80자 초과 · 뜻 빠짐 · 연락처 꼴 · 앞 후보와 겹침(글자 두 개씩 Dice ≥ 0.75) · 지난 칩과 거의 같음(≥ 0.85, 최근 5셋) · 미성년자 ·
나이 모름의 출력 검사(통과 후보를 합쳐 한 번, 걸리면 모두). 통과한 것 가운데 의도가 서로 다른 것을 앞에서부터 `settings.suggestion_display_max`개(기본 2,
0 ~ 3)까지 보인다 — **억지로 채우지 않는다**. 통과가 0이면 한 번 다시 묻고, 그래도 0이면 `unavailable` · `no_valid_candidates`.
- 프롬프트(`_shared/companion-suggest-prompts.ts`의 `suggestionSystem`, `?docs=1`의 `prompts.suggestions`): 바로 보낼 수 있는 완결된 대사 · 내용 없는 예고 금지 ·
  유저 대신 감정 · 관계 · 동의 · 약속 · 개인정보 · 현실 행동을 확정하지 않음(유저가 말한 사실은 다시 씀) · 지난 칩 · 최근 말과 같은 뜻 · 끝난 행동 되풀이 금지 · 죄책감 ·
  의존 · 집착 유도와 거절 뒤 압박 금지 · 관계 말투 · 10 ~ 55자(최대 80) · i+1 · 청소년 안전. 맥락은 최근 8개(한 줄 500자 · 번역 없음) + 대화 요약 + 지난 칩 셋(글 ·
  의도 · 결과). 대화 · 요약 · 지난 칩은 참고 자료이지 지시가 아니라고 못박는다.
- 운영 끄기: `settings.suggestions_enabled = false`(또는 보일 수 0)면 어디서도 만들지 않는다 — `chat-send`는 이벤트 없음, `companion-suggest` · 첫 인사는
  `none` · `suggestions_disabled`.
- 저장(2판): `messages.suggestions = {version: 2, items(보인 것), candidates(후보 전부 — 글 · 뜻 · 의도 · 빠진 까닭 `reason` · `shown`), model, createdAt, ms,
  playground?, outcome?}`. 메시지 목록은 `items`만 준다. 1판 저장의 의도는 마이그레이션이 바꾼다(continue → elaborate, react → reflect).

**chat-send 자동 칩** — 판정의 `replySuggestions`가 참이고 운영이 끄지 않았으면 답 조각이 다 모인 뒤 번역과 같이 시작해 남은 기다림(피드백 · 미성년자
출력 검사 · 번역)과 동시에 돌린다(`_shared/chat-send-suggest.ts`, 만들기는 `companion-suggest`와 같은 `_shared/companion-suggest-generate.ts`).
- 이벤트: `translation` 뒤 · `state` 앞에 한 번 `suggestions {"messageId","status":"ok"|"unavailable","items":[{"text","meaning","intent"}],"reason"?}`.
  `ok`면 칩 1 ~ N개, `unavailable`이면 빈 `items`와 `reason` — `generation_failed`(실패 · 시간 초과) · `blocked`(출력 검사) · `no_valid_candidates`. 어느 쪽이든
  입력창은 막지 않는다. 앱은 `unavailable`이면 `companion-suggest`로 대신 받을 수 있다.
- 보내지 않는 때: 스위치가 꺼짐 · 운영 끔 · 판정이 스위치를 모름(20261119 전 DB) · 위기 · 입력 차단 · 성격대로 거절 · 출력 차단 · 답 실패.
- 제한 시간 6초(다시 묻기 · 출력 검사 포함 — 다시 묻기는 2초 이상 남았을 때만). 결과와 걸린 시간은 meta `suggestions` · `suggestionsMs`에 남는다.
- 저장은 스트림을 닫은 뒤 `companion_save_suggestions`(끝 트랜잭션이 메시지를 만든 뒤라야 붙일 수 있다 — 실패는 로그 `suggestions_save_failed`만).
- **입력 출처** — 앱이 칩을 탭해 보내면 `suggestion: {"message_id","index"}`(옛 `from_suggestion: true`도 받는다). 서버는 턴 시작 때 읽은 마지막 캐릭터
  메시지의 칩(`companion_turn_status.latestSuggestionSet`)과 맞춘다(`_shared/chat-send-choice.ts`).
  - `suggestion` — 지금 칩을 글 그대로(앞뒤 공백 무시). 피드백 모델을 부르지 않고 `correction {"status":"skipped","reason":"suggestion",…}`(앱: 「피드백 생략(추천 답변)」).
  - `stale` — 그 사이 새 답이 와 지난 칩이 됨. `manual` — 직접 입력, 또는 표시가 왔는데 글이 칩과 다르거나 칩을 확인할 수 없음(방어). 둘 다 보통처럼 피드백한다.
  - 캐릭터 메시지 `meta.inputSource`, 스트림을 닫은 뒤 `companion_record_choice`가 유저 메시지 meta(`inputSource` · `suggestionMessageId` · `suggestionIndex` ·
    `suggestionIntent`)와 앞 캐릭터 메시지 칩 셋의 결과(`outcome` chosen · ignored, 한 번만)를 적는다 — 칩 저장 · 기억 묶음보다 먼저.
- **기억** — 칩을 그대로 고른 유저 말(`inputSource: suggestion`)은 기억 원문에 「학습자(추천 답변을 그대로 고름)」로 표시되고, 기억 프롬프트가 그것만으로는 사실 ·
  선호 · 계획을 저장하지 말라고 한다. 역할극 `*행동*`도 학습자의 사실이 아니다.
- 늘어나는 지연: 번역과 겹쳐 돌아 `state` · `done`이 늦어지는 것은 둘 중 긴 쪽만큼 — 최악 6초(칩 제한 시간)다.

**답변 평가 · 고쳐서 다시 보내기(20261124, PRD §3.15).**

- 👍/👎: 앱이 `companion_rate_message(p_message_id, p_rating, p_reasons, p_note)`를 부른다 — `p_rating` `up` · `down` · null(지움). 👎만 이유(`awkward_korean` ·
  `out_of_character` · `too_hard` · `uncomfortable` · `other`, 여럿)와 글(200자). 본인 대화의 보이는 캐릭터 메시지(첫 인사 · 선톡 · 거절 포함, 위기 안내 제외)만 — 아니면 `P0002`.
  메시지 목록 줄에 `rating {value, reasons, note}`. 운영 지표는 `companion_rating_stats(p_since, p_playground, p_limit)`(캐릭터 · 모델 · 출처 · 이유별, 최근 👎 원문).
- 고쳐서 다시 보내기: `chat-send` 본문 `replaces_message_id`(마지막 유저 메시지). `companion_begin_replacement`가 시작 대신 돈다 — 그 대화의 마지막 유저 메시지이고 그 뒤에
  그 답이 아닌 캐릭터 메시지(선톡 등)가 없을 때만 이전 턴(유저 메시지 · 캐릭터 답)을 `hidden`으로 숨기고(`meta.replacedBy` ↔ 새 유저 메시지 `meta.replaces`) 보통 턴을 시작한다.
  아니면 409 `not_latest_message`, 그 턴이 도는 중이면 `turn_in_progress`. 시작이 막히면(402) 숨기기도 되돌린다. 같은 `client_message_id` 재시도는 멱등.
  차감 · 입력 검사 · 위반 횟수는 새 턴에 그대로. 칩 표시는 보지 않는다(`inputSource: manual`). 숨긴 턴은 지난 대화 · 기억 · 요약 원문 · 칩 이력 · 메시지 목록 · 칩 지표에서 빠진다.

**companion-suggest** — 「다시 만들기」(`refresh: true`)와 자동 칩이 `unavailable`이었거나 오지 않은 턴의 대체 경로. 같은 메시지에 저장된 2판 칩이 있으면
모델을 부르지 않고 돌려준다(1판 저장은 새로 만든다).

- 호출자: 앱은 `Authorization: Bearer <JWT>` + `{"character_id","refresh"?}`. ops-dashboard 플레이그라운드는 `Bearer <서버 키>`(`isServiceKey` 규칙) +
  `{"user_id","character_id","refresh"?}` — 앱 토큰으로 `user_id`를 보내면 401. 계약은 `companion-suggest-request` · `companion-suggest-response`(JSON Schema).
- 응답(200) `{"status":"ok"|"none"|"unavailable","messageId","items":[{"text","meaning","intent"}],"cached","reason"?}` — `ok`면 칩 1 ~ N개, `meaning`은 학습자
  언어(한국어면 null). `messageId`는 칩이 묶인 마지막 캐릭터 메시지다.
  - `none`(모델 안 부름): `no_assistant_message` · `latest_turn_blocked` · `latest_turn_crisis` · `latest_turn_refusal` · `suggestions_off`(프로필) · `suggestions_disabled`(운영).
  - `unavailable`: `chat-send`와 같은 판정에 걸림 — `not_available` · `age_restricted` · `temporarily_blocked` · `usage_time_limit` · `turn_in_progress`, 또는
    `generation_failed`(시간 초과 8초 포함) · `blocked` · `no_valid_candidates`.
  - HTTP 오류: 400 `invalid_request` · 401 `invalid_session` · 404 `character_not_found` · 405 · 500 `server_misconfigured` · `internal_error`.
- 맥락: 자동 칩과 같다(최근 8개 + 요약 + 지난 칩 셋 — 다시 만들기는 지금 칩 셋도 지난 칩으로 보아 다른 것을 낸다).
- 설정: 프로필 `reply_suggestions`(기본 참). 앱 `companion_save_profile(…, p_reply_suggestions = null)` · `companion_load_profile().replySuggestions`, 운영
  `companion_operator_set_profile(…, p_reply_suggestions = null)` · `companion_inspect_testers().replySuggestions`.
- 평가: `companion-eval`의 `kind: "suggestions"` — 케이스 `text`는 캐릭터의 마지막 말(`history` 뒤), `summary` · `pastSuggestions`(지난 칩 글)를 더 받는다.
  `output: {"items","candidates"}` — 보인 칩(0개일 수 있다)과 후보 전부 · 빠진 까닭. 채점(맥락 적합 · 완결성, 의미 다양성 · 반복, 사용자 의도 보존, 안전 · 표현
  품질)은 ops-dashboard가 한다.
- 지표: `companion_suggestion_stats(p_since, p_playground = null)`(service_role) — 대상 턴 · 노출(1 · 2 · 3 · 통과 0 · 실패) · 다음 말이 온 턴 · 고름 · 무시 ·
  보인 의도 · 고른 의도 · 빠진 까닭 · 생성 시간 p50/p95 · 칩 단계 토큰 합(비용은 대시보드가 단가로 계산).
- 배포: `supabase functions deploy companion-suggest`(`verify_jwt = false`).

**설계 문서에서 미룬 것** — A/B(자유 입력만 / 칩 + 자유 입력) · `choice_sets` · `choices` 별도 테이블(지금은 메시지의 `suggestions` JSON) · revision 기반 낙관적
잠금과 작업 큐(지금은 `client_message_id` 멱등 + 마지막 캐릭터 메시지 id 비교) · 역할극 모드 · 학습 모드 연결(난이도별 표현 추천) · 칩 편집(쓰지 않기로 함).

### 학습 표현 넣기 (20261125, PRD §3.7)

앱에서 배운 단어 · 표현 · 문형(끝낸 유닛만 — `companion_learning_context`)을 대화에 자연스럽게 녹인다. 말풍선에 표시하지 않는다.
판정은 `_shared/companion-learning.ts`(순수 함수), 글자 판정은 `companion-learning-match.ts`, 턴 연결은 `chat-send-learning.ts`, 첫 인사 · 선톡은 `companion-opener.ts`.

- **주기** — 직전 삽입 뒤 유저 턴 `settings.learning_min_gap`(3)번이 지나야 기회가 열리고, 열린 뒤 `learning_base_probability`(0.3)에서 턴마다 올라
  `learning_force_turns`(6)번째부터는 매 턴 연다(「오래됐으니 웬만하면 넣어 보라」는 한 줄 — 강제는 아니다). 대화당 하루 `learning_daily_cap`(6)번(UTC 날짜). 첫 턴 · 유저가 전환을 원한 턴 · 무거운 대화(앞 턴 `@state.heavy`) ·
  화제 전환 턴은 넣지 않는다(화제 전환이 먼저). `learning_enabled = false`면 모두 끈다. 간격 · 하루 수 · 최근 지시한 표현은 `conversations.topic_state`.
- **고르기는 답 모델이 (2026-11-12)** — 기회가 열리면 후보 `offerSize`(4)개를 답 요청의 `directive`로 주고, 답 모델이 지금 대화에 맞는 것 하나를
  말하거나(노출) 그 표현으로 답할 질문을 하거나(유도), 맞는 게 없으면 넣지 않는다. 맥락 판단을 맥락을 아는 답 모델에 맡겨 따로 판정 호출(지연 · 비용)을 두지 않는다.
  고른 것은 `@state`의 `learned`(후보 id `e1` …) · `learned_how`(say · ask)로 보고한다(옛 모양 `true`는 후보가 하나일 때만 읽는다).
- **건너뜀** — 넘기면 간격 · 하루 수를 쓰지 않고 다음 턴에 다시 연다(meta `reason: "skipped"`). `maxSkipStreak`(3)번 이어 넘기면 그때 간격을 새로 센다.
  넘긴 후보는 표현마다 센다(`topic_state.learnSkips`, 최대 40개, 고르면 지움) — 두 번 넘게 넘긴 표현은 후보 뒤로. `offerSize` · `maxSkipStreak`는 코드 기본값(설정 칸 없음).
- **후보 순서** — 아직 만난 적 없는 것(최근 에피소드부터) → 만난 것 가운데 유저가 아직 안 쓴 것 → 오래 안 본 것, 직전 표현 제외, 많이 넘긴 표현은 맨 뒤.
- **방식** — 노출(캐릭터가 씀) · 유도(그 표현으로 답할 질문) · 칩(추천 답변 후보 하나에 넣음 — 검증을 지나면 먼저 보인다, 산출로 치지 않는다).
  후보마다 권하는 방식을 적는다: 처음 만나는 표현은 노출만, 아직 안 썼으면 유도 먼저, 써 봤으면 노출 먼저. 칩은 답 뒤 단계라 코드가 정한다 — 앞쪽 셋 가운데
  랜덤으로 고른 표현의 칩 비중(아직 안 씀 30% · 써 봄 20%)에 걸리면 그 표현 하나를 칩으로. 칩 스위치가 꺼져 있으면 칩은 없다.
- **대상 유저** — 끝낸 유닛 없음: 넣지 않는다. 튜토리얼만: 턴에는 넣지 않고 첫 인사 · 선톡에서만 노출(「안녕하세요」 · 「감사합니다」). `u01` 이상: 전부.
- **범위 (20261126)** — 기본 자동(끝낸 유닛 전부). 설정에서 수동으로 바꾸면 고른 에피소드의 끝낸 유닛만 쓴다(`profiles.learning_scope` · `learning_units`, 최대 50).
  고를 수 있는 것 = 유닛을 하나 이상 끝냈고 표현이 있는 에피소드. 수동인데 고른 것이 없거나 모두 콘텐츠에서 빠졌으면 넣지 않는다(까닭 `manual_empty` — 자동으로 되돌리지 않는다).
  앱 `companion_learning_scope()` · `companion_set_learning_scope(p_scope, p_units)`(`p_units` null = 목록 그대로), 플레이그라운드는 `companion_operator_*`(시험 계정만).
  에피소드 제목은 `companion.episodes`(`companion.sync_episodes` — 표현 동기화 SQL에 함께 실림). 튜토리얼 규칙은 고른 범위에 그대로 적용한다.
- **확인과 기록** — 캐릭터 쪽은 `@state.learned`(모델이 고른 후보) + 노출이면 글자 확인(문형 · 자리 있는 표현은 보고만). 유저 쪽은 직접 입력한 글에서 배운 표현 전체를
  글자로 보고(한 글자 어휘 제외), 최근 지시한 문형은 피드백 모델이 `learned_used`로 판정한다 → `correction.learnedUsed`(앱 카드 「배운 표현을 썼어요」). 칩 전송은 세지 않는다.
  `companion_record_learning`이 `companion.user_expressions`를 센다(실패는 로그 `learning_record_failed`만). 저장 meta `learning {open, reason, offered?, mode?, expressionId?, surface?, done?, produced?}`(`offered` = 준 후보의 글, 넘기면 `reason: "skipped"`이고 mode 없음).
- 지표: `companion_learning_stats(p_since, p_playground = null)`(service_role) — 턴 · 열린 턴 · 넣은 턴 · 방식별 넣음 · 따름 · 출처별 · 까닭(넘김 `skipped` 포함) · 산출 턴 · 유도 뒤 3턴 안 산출 ·
  다시 쓴 표현(산출 2번 이상, 하루 넘게 떨어져) · 많이 넣은 표현.
- 평가: `companion-eval`의 `kind: "learning"`(케이스 `target {surface, gloss?, kind?, mode}`) — 운영과 같은 후보 지시(후보 하나 · 그 방식만) · 답 · 모델 보고 · 서버 판정(칩이면 칩 셋).
  첫 인사 · 선톡의 노출 하나도 같은 후보 지시(후보 하나 · 노출만)다.

### 첫 인사 — companion-greet

대화가 비었을 때(새 대화 · 대화 초기화 뒤) 캐릭터가 먼저 말을 건다(Zeta의 첫 메시지처럼). 앱은 캐릭터 화면을 열 때 메시지가 하나도 없으면 부른다.
무료다(크레딧 · 체험 횟수를 쓰지 않는다). `_shared/companion-greet-handler.ts`.

- 요청: 앱은 JWT + `{"character_id"}`, ops-dashboard 플레이그라운드는 서버 키 + `{"user_id","character_id"}`(`companion-suggest`와 같은 규칙 — 앱 토큰으로
  `user_id`를 보내면 401). 계약은 `companion-greet-request` · `companion-greet-response`(JSON Schema).
- 응답(HTTP 200): `{"status":"ok"|"none"|"unavailable","messageId","segments":[{kind,text,translation?}],"source"?:"model"|"canned","suggestions","reason"?}`.
  - `none` · `has_messages`: 메시지가 이미 있다(모델 안 부름) — 만드는 사이 다른 호출이 저장했거나 유저가 먼저 보낸 경우 포함. 두 번 불려도 인사는 하나다.
  - `unavailable`: `chat-send`와 같은 판정 이유(`not_available` · `age_restricted` · `temporarily_blocked` · `usage_time_limit` · `turn_in_progress`).
  - `suggestions`: 칩 스위치가 켜져 있으면 SSE `suggestions`와 같은 모양(인사 메시지에 저장 — `companion-suggest` 캐시 · 메시지 목록에도 그대로), 꺼져 있으면 null.
- 흐름: `companion_greet_context`(판정 + 페르소나 · 말투 · 학습자 언어 · 연령대 · 칩 설정 · 기억 · 메시지 있음) → 답 모델(선톡과 같은 페르소나 시스템 프롬프트 +
  `greetingDirective`, 지난 대화 없이 유저 말 자리에 `greetingUserText`) → **연령과 상관없이 출력 검사**(유저 말 없이 나가는 글이라 선톡과 같다) → L1 번역 · 칩을
  동시에 → `companion_save_greeting`(대화가 없으면 만들고 그 행을 잠근 뒤 메시지가 없을 때만 `origin: 'greeting'`으로 저장).
- 생성 실패 · 시간 초과(15초) · 빈 답 · 출력 검사 차단 · 검사 실패면 페르소나의 정해진 인사(`persona.greetingLines[말투]`, 없으면 존댓말 줄, 그것도 없으면
  코드의 기본 줄) — 인사는 늘 나간다(`source: "canned"`, meta `greetingFallback`).
- 저장 meta: `model` · `ageBand` · `greeting`(model · canned) · `translation` · `suggestions` · `usage` · `playground`.
- 인사 뒤 첫 턴: 인사는 보통 캐릭터 메시지라 `chat-send`의 지난 대화 · 입력 검사 맥락 · 칩 건너뛰기(`latestSuggestions`)에 그대로 들어간다. AI 고지(`ai_disclosure`)
  같은 안내는 지금처럼 첫 턴의 `notice`로 온다(인사에는 붙이지 않는다).
- 배포: `supabase functions deploy companion-greet`(`verify_jwt = false`). 마이그레이션 20261121120000을 먼저 적용한다.

### 스냅샷 · 음성 — companion-snapshot · companion-voice

캐릭터 메시지 한 장면 → 이미지 한 장, 메시지의 한국어 대사 → mp3 한 개. 규칙은 [명세](../../docs/specs/ai-companion-snapshot.md), 결정은 ADR-0146.

- 요청: 앱은 JWT + `{"message_id","again"?}`, 플레이그라운드는 서버 키 + `{"user_id","message_id","again"?}`. 계약은 `companion-media-*`(JSON Schema).
- 응답: 202 `{media, cached:false}`(pending · 예약) 또는 200 `{media, cached:true}`(저장본, 무료). 오류 코드 · 상태는 계약 `MEDIA_ERRORS`.
- 흐름: `companion_media_begin`(서버가 메시지를 직접 읽고 자격 · 판정 · 동시 1 · 하루 상한 · 예약) → 응답 → `waitUntil`에서
  `_shared/companion-media-run.ts`(스냅샷) · `_shared/companion-media-voice.ts`(음성) → `companion_media_finish`(확정 · 해제).
- 프롬프트 글: `_shared/companion-snapshot-prompts.ts` — ops-dashboard `companion_lab.py`(6f082ff)를 글자 그대로. 고칠 때 lab과 같이 고친다.
- 바깥 호출은 주입한 `fetch` 하나(`_shared/companion-media-engines.ts`). 단위 테스트는 가짜 fetch다 — 실제 유료 호출이 없다.
- Storage: 비공개 버킷 `companion-media`(결과 `<user_id>/<media_id>.png|mp3`) · `companion-refs`(기준 이미지 `<slug>-ref.png` · `-expressions.png`).
  앱은 자기 폴더만 읽는다(정책 `companion_media_owner_read`) — 서명 URL은 앱이 자기 토큰으로 만든다.
- 계정 삭제: `delete-account`가 admin 삭제 직전에 `companion-media/<user_id>/`를 지운다(실패해도 계속). 남은 파일은 `companion_media_orphans(100)`.
- 상한(20261202): 그날 시도 상한(`snapshot_daily_attempts` 30 · `voice_daily_attempts` 60, blocked · failed 포함) · 연속 실패 가드(`media_failure_streak_limit` 5) →
  429 `attempt_limit`. 음성 비상 스위치 `voice_daily_limit`(0 = 끔). 운영 조회 `companion_inspect_media`의 `today.snapshotAttempts` · `voiceAttempts`.
- 시간 예산: 요청부터 140초 안에 닫기까지(`_shared/companion-media-budget.ts`, Edge 상한 150초). 단계마다 남은 예산만큼만 기다리고, 모자라면 재시도하지 않는다.
- 배포: `supabase functions deploy companion-snapshot` · `supabase functions deploy companion-voice`(`verify_jwt = false`), 그리고 `delete-account`를 다시 배포한다.

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

1. `supabase db push --dry-run`으로 **컴패니언 마이그레이션 아홉(20261108 ~ 20261116)만** 올라가는지 본다. `main`의 다른 미배포 마이그레이션이 같이 올라가면 멈추고 담당자와 확인한다(위키 05).
2. `supabase db push`(또는 일곱 SQL을 SQL 편집기에서 차례로). 여섯(20261108 ~ 20261113)을 이미 적용했으면 `20261114120000_companion_inspect_docs.sql`
   하나만 SQL 편집기에서 실행한다 — 반드시 여섯 **뒤에**(`companion.characters` · `companion.settings`가 있어야 한다).
   `20261115120000_companion_proactive_prefs.sql`은 20261114 **뒤에** 적용한다. SQL 편집기로 올릴 때는 파일 본문을 `begin; … commit;`으로 감싸고 앞에
   「20261114가 있는가 · 이미 적용했는가」 검사(`to_regprocedure`)를 둔 묶음을 쓴다 — 이미 적용했으면 아무것도 바꾸지 않고 멈추고,
   `supabase_migrations.schema_migrations`가 있으면 판을 기록해 뒤의 `supabase db push`가 다시 올리지 않는다.
   `20261116120000_companion_feedback_card.sql`은 20261115 **뒤에** 적용한다(같은 방식의 묶음 — 이 묶음은 `schema_migrations`에 쓰지 않는다).
   **새 함수(chat-send)를 배포하기 전에** 적용한다 — 옛 DB의 `companion_finish_turn`은 카드의 `original` · `corrected` · `meaning`을 버린다.
   `20261118120000_companion_reply_suggestions.sql`은 20261116 **뒤에**, `companion-suggest`를 배포하기 전에 적용한다(같은 방식의 묶음 — `schema_migrations`에 쓰지 않는다).
   `20261119120000_companion_auto_suggestions.sql`은 20261118 **뒤에** 적용한다(같은 방식의 묶음). 함수보다 먼저든 나중이든 깨지지 않는다 — 옛 DB면 새 `chat-send`가
   칩을 만들지 않을 뿐이고, 옛 `chat-send`는 판정의 새 칸을 모른 채 그대로 돈다. 그다음 `chat-send` · `companion-suggest`를 다시 배포한다.
   `20261120120000_companion_turn_cost.sql`은 20261119 **뒤에**, **새 함수(chat-send · companion-proactive)를 배포하기 전에** 적용한다(같은 방식의 묶음).
   새 `chat-send`는 턴 뒤에 `companion_memory_source`를 먼저 불러서, 옛 DB면 그 호출이 실패해 기억 · 요약이 모두 돌지 않는다(턴 자체는 된다). 옛 `chat-send`는 새 DB에서도
   그대로 돈다(지난 대화가 요약 뒤로 줄 뿐). 적용 뒤 `chat-send` · `companion-proactive` · `companion-eval`을 다시 배포한다.
   `20261121110000_companion_suggestion_feedback.sql`은 20261120 **뒤에** 적용한다(같은 방식의 묶음). 함수보다 먼저든 나중이든 깨지지 않는다 — 옛 DB면
   `latestSuggestions`가 없어 새 `chat-send`가 `skipped`를 만들지 않고 보통처럼 피드백할 뿐이다. 그다음 `chat-send`를 다시 배포한다.
   `20261121120000_companion_greeting.sql`은 20261121110000 **뒤에**, `companion-greet`를 처음 배포하기 전에 적용한다(같은 방식의 묶음). 옛 DB면 새 함수가
   맥락을 읽지 못해 500(`context_failed`)을 낸다. 다른 함수는 이 마이그레이션과 상관없다(`companion-eval`의 `?docs=1`에 인사 프롬프트가 더해질 뿐).
   `20261123120000_companion_quality.sql`은 20261122 **뒤에**, **새 함수(chat-send · companion-proactive)를 배포하기 전에** 적용한다(같은 방식의 묶음). 새 함수는
   `companion_apply_memory_ops` · `companion_save_proactive(…, p_suggestions)`를 불러서 옛 DB면 기억 작업 · 칩 붙은 선톡 저장이 실패한다. 적용 뒤 `chat-send` ·
   `companion-proactive` · `companion-greet` · `companion-eval`을 다시 배포하고, 예약 `companion-memory-flush`를 `supabase/cron/companion.sql`에서 더한다.
   `20261124120000_companion_ratings_resend.sql`은 20261123 **뒤에**, 새 `chat-send`를 배포하기 전에 적용한다(같은 방식의 묶음). 옛 DB에서 새 `chat-send`는
   `replaces_message_id`가 온 턴만 시작이 실패한다(500 `begin_failed`) — 보통 턴은 그대로다. 평가 RPC는 함수 배포와 상관없다. 적용 뒤 `chat-send`를 다시 배포한다.
   `20261125120000_companion_learning.sql`은 20261124 **뒤에**, 새 함수를 배포하기 전에 적용한다(같은 방식의 묶음). 옛 DB면 새 함수가 기록(`companion_record_learning`)을
   부를 때만 실패하고(로그만) 턴 · 인사 · 선톡은 그대로 돈다 — 넣기 설정이 없어 기본값을 쓴다. 적용 뒤 `chat-send` · `companion-greet` · `companion-proactive` ·
   `companion-eval` · `companion-suggest`를 다시 배포한다.
   `20261126120000_companion_learning_scope.sql`은 20261125 **뒤에** 적용한다(같은 방식의 묶음). 함수는 다시 배포하지 않아도 범위가 적용된다(맥락 RPC가 거른다) —
   `chat-send`를 다시 배포하면 비어 있는 수동 범위의 까닭이 `no_pool` 대신 `manual_empty`로 남는다. 적용 뒤 표현 동기화 SQL(6번)을 다시 돌리면 에피소드 제목이 찬다.
   `20261130120000_companion_snapshot_voice.sql`은 20261129(구독) **뒤에**, `companion-snapshot` · `companion-voice`를 처음 배포하기 전에 적용한다(같은 방식의 묶음).
   `companion_save_profile` · `companion_operator_set_profile`의 인수가 하나 늘어(끝에 기본값 null) 옛 호출은 그대로 돈다. Storage 버킷 둘과 읽기 정책도 만든다.
   적용 뒤 기준 이미지를 `companion-refs`에 올리고(`deoksu-ref.png` · `deoksu-expressions.png` · `mina-ref.png` …), 비밀 `OPENAI_API_KEY` · `ELEVENLABS_API_KEY`를 넣고,
   `companion-snapshot` · `companion-voice` · `delete-account`를 배포한다.
   **운영은 2026-11-14에 SQL 편집기로 적용했고 기록이 없다** — `supabase migration repair --status applied 20261130120000`으로 기록한다.
   `20261202120000_companion_media_limits.sql`은 20261130 **뒤에**(열린 PR의 20261201 다음 번호), 새 `companion-snapshot` · `companion-voice`를 배포하기 **전에**
   적용한다(같은 방식의 묶음). 시도 상한(스냅샷 30 · 음성 60) · 연속 실패 가드(5) · 음성 스위치 `voice_daily_limit` · `media_pending_minutes` 하한 5분 ·
   `plan_turns_today`가 메시지 예약만 센다. 옛 함수는 새 DB에서도 그대로 돈다(새 오류 코드 `attempt_limit`은 옛 함수가 `not_available` 403으로 바꿔 보일 뿐) —
   그래도 시간 예산(140초)이 들어간 새 함수를 곧 배포한다. 적용 뒤 `supabase migration repair --status applied 20261202120000`으로 기록하고
   `companion-snapshot` · `companion-voice`를 다시 배포한다. 운영 `media_pending_minutes`가 5보다 작으면 적용이 실패한다(지금 기본 10). 20261201이
   20261202보다 늦게 적용되면 `db push`에 `--include-all`이 필요하다(번호가 앞이라).
3. 비밀: `supabase secrets set --env-file supabase/functions/.env`. 키가 아직 없으면 `COMPANION_LLM=fake`로 화면만 먼저 본다.
4. `supabase functions deploy chat-send` · `supabase functions deploy companion-proactive` · `supabase functions deploy companion-eval`(`config.toml`의 `verify_jwt = false`를 따른다).
5. 예약 작업: Vault에 서버 키(`companion_service_role_key`)를 넣고 `supabase/cron/companion.sql`을 SQL 편집기에서 한 번 실행한다.
6. 학습 표현: `node devtools/companion-expressions/build.mjs --base <버킷 주소> --out /tmp/expr`로 만든 `sync-expressions.sql`을 SQL 편집기에서 한 번 실행한다.
7. 시험 계정에 `duru_tester`를 켜고 플레이그라운드에서 정상 · 위기 · 차단 · 크레딧 턴을 한 번씩 돌린다.

되돌리기: 함수는 `supabase functions delete chat-send` · `companion-proactive` · `companion-eval`, 예약은 `select cron.unschedule('companion-…')`.
표 · 함수는 `drop schema companion cascade` 뒤 `public.companion_*` 함수를 지운다(다른 기능이 쓰지 않는다).

## revenuecat-webhook — 구독 · 엽전 팩(ADR-0144)

RevenueCat이 보내는 구독 · 구매 이벤트를 받아 우리 DB(정본)에 반영한다. 인증은 Supabase JWT가 아니라 RevenueCat이 싣는 `Authorization`
헤더 값(`REVENUECAT_WEBHOOK_AUTH`)이다(`config.toml` `verify_jwt = false`). 본문은 `_shared/revenuecat-event.ts`가 정규화하고
`public.companion_apply_store_event(p_event)` 한 번으로 넘긴다 — 상품 → 요금제 매핑 · 멱등(이벤트 id) · 순서(stale) · 엽전 지급 · 회수는 DB가 한다
(`migrations/20261129120000_subscriptions.sql`). 샌드박스는 `REVENUECAT_ACCEPT_SANDBOX=true`인 프로젝트만 반영한다.

- 계약: `_shared/revenuecat-webhook.contract.ts`. 처리기 `_shared/revenuecat-webhook-handler.ts`(401 · 405 · 400 · 500 재시도 · 200 outcome).
- 배포: `supabase functions deploy revenuecat-webhook` → 비밀 두 개 → RevenueCat 대시보드 Webhook URL · 헤더 값 → 「Send test event」로 `recorded` 확인.
- 연간 구독의 매달 엽전: `cron/subscriptions.sql`(하루 한 번). 준비 목록 전체는 [스토어 준비](../../docs/subscriptions-store-setup.md).

## 운영 도구 RPC — ops 스키마 (20261212)

`migrations/20261212120000_ops_admin.sql`은 ops-dashboard의 운영 도구(`ops_admin`, tailnet 전용)가 서버 키로 부르는 RPC다. 계약은
ops-dashboard `docs/admin-contract.md` §A가 정본이다.

- 표: `ops.audit_log`(열람 · 쓰기 · 내보내기 기록) · `ops.user_notes`(운영자 메모) · `ops.push_sends`(손으로 보낸 푸시 — 자동 캠페인
  `push_campaign_sends`와 다르다). `anon` · `authenticated` · `service_role` 모두 표 권한이 없고 `public.ops_*` RPC(`service_role`만)로만 읽고 쓴다.
- RPC 22개: 찾기 · 목록 · 붙여 넣기 해석 · 상세 · 대화 · 기억 · 미디어 · 타임라인(부르면 `kind='view'` 기록), 메모 · 엽전 지급(`ops_grant`,
  `(reason, ref_id)`로 한 번만, 사람당 ≤ 10,000 · 한 번에 ≤ 1,000명) · 시험 계정 잔액 · 등급 · 초기화 · 정지 · 공개 스위치 · 푸시 대상 · 발송 기록 ·
  `ops_log` · `ops_audit`. 첫 인수는 늘 운영자 로그인(`p_actor`, 비면 `actor_required`). 시험 계정만 되는 조작은 실제 사용자면 예외 대신
  `{ok:false, error:'not_a_tester'}`를 돌려주고 `refused`로 남긴다.
- 푸시 발송 기록은 `request_id`(화면이 대상 확인 때 한 번 만듦)로 한 번만 열린다 — 같은 요청이 다시 오면 `ops_push_begin`이
  `{ok:false, error:'already_sent'}`로 거절하고 `refused`로 남긴다(`send-push`는 같은 요청을 두 번 받으면 두 번 보내므로). `send-push`가 끝까지
  답하지 않은 발송은 `failed`가 아니라 `unknown`(보냈을 수도 있음)으로 끝난다.
- 기존 함수를 고친다: `companion_grant_credits`는 reason `ops_grant`를 더 받고 reason `operator`는 시험 계정만(`not_a_tester`).
  `companion_set_entitlement`는 시험 계정만 — 부르는 곳이 플레이그라운드(ops-dashboard `companion.py`)뿐이다. 원장 kind에 `revoke`를 더한다(20261129와 같은 목록).
- 20261129(구독)가 운영에 아직 없어도 적용된다 — `companion.plans` · `plan_entitlements` · `store_events`는 `to_regclass`로 보고 동적 SQL로만 읽으며,
  없으면 상세의 그 칸이 `null`이다. 다시 적용해도 같다(`if not exists` · `create or replace`).
- 테스트: `migrations/ops-admin.integration.test.ts`(구독 표가 있을 때 · 지운 뒤 다시 적용했을 때 둘 다).

**운영 적용은 사람이 한다.** PR 리뷰 뒤 `supabase db push --dry-run`으로 이 파일만 올라가는지 보고 `supabase db push`, 또는 SQL 편집기에서
본문을 `begin; … commit;`으로 감싸 실행한다(그 뒤 `supabase migration repair --status applied 20261212120000`). 앞의 컴패니언 · 크레딧 마이그레이션
(20261108 ~ 20261211, 특히 20261112 크레딧 · 20261111 `moderation_state` · `settings`) **뒤에** 적용한다. 20261129보다 번호가 뒤라 20261129를 나중에
올리면 `db push`에 `--include-all`이 필요하다. 적용 전에는 운영 도구 화면이 「적용 전」(`{deployed:false}`)으로 뜬다. 플레이그라운드는 시험 계정만
고르므로 바뀌는 것이 없다.

### 2차 — 시험 계정 페이지 · 엽전 지급 고르기 · 대화 조각 (20261213)

운영 도구 마이그레이션 넷(20261213 · 20261214 · 20261215 · 20261227)의 번호는 같은 날짜의 다른 마이그레이션과 겹치지 않게 `…130000`이다.
운영 상태(2026-11-23): 20261213 · 20261227은 SQL 편집기로 적용했고, 20261214(20261227이 대신한다) · 20261215는 적용하지 않았다.

`migrations/20261213130000_ops_admin_testers.sql`. 계약은 ops-dashboard `docs/admin-contract.md` §E-A. 20261212의 공통 규칙(`p_actor` · 열람/쓰기 기록 ·
`service_role`만 · `not_a_tester`는 `{ok:false}` + `refused`) 그대로다.

- 바뀌는 것: UserRow에 `paid`(스토어 이벤트가 있거나 원장에 `purchase` · `subscription` 지급 — 시험 계정 잔액 맞추기 `operator`는 세지 않음, 구독 표가
  없으면 원장만) · `ops_user_conversation`이 메시지마다 `segments` · `ops_grant_credits`의 메모가 늘 필수(`invalid_memo`).
- 새 RPC 10개(합 32개): `ops_search_users`(검색어 · 국가 · 시험 계정 · 티어 · 가입일, `total`) · `ops_countries`(기록 안 함) · `ops_list_testers` ·
  `ops_tester_state` · `ops_set_tester`(`raw_app_meta_data.duru_tester` 켜기 · 지우기 — 앱은 로그인 토큰에서 읽어 다시 열면 반영. 해제하면 운영자가
  넣은 등급 — 플랜의 `ops` · `ops_tester` 행과 옛 등급 source `ops_admin` · `playground` — 도 지우고 `removed:{plans, tier}`로 알린다) ·
  `ops_tester_set_profile`(`companion_operator_set_profile`과 같은 뜻, 칸마다 `invalid_<칸>`, 스냅샷 셀피는 `female` · `male` · `hidden`) ·
  `ops_tester_set_learning_scope` · `ops_tester_set_intimacy`(0 ~ 10000 — 턴은 하한 0만 둔다, 말투는 턴과 같은 문턱으로 다시 계산) ·
  `ops_tester_set_plan`(`plan_entitlements`에 `ops_tester` · `ops` · sandbox 행, 표가 없으면 `plans_unavailable`, 그 플랜에 스토어 행이 있으면
  켜기 · 끄기 모두 `store_plan`(refused), 다시 켤 때 활성 운영 행의 `period_started_at`은 그대로 — 플랜 엽전이 다시 나가지 않게) · `ops_tester_reset_learning`.
- **학습 초기화의 코인 수령**: 원장(`credit_ledger`)은 트리거 · 외래 키가 없어 지울 수는 있지만, 지우면 지갑 합 = 원장 합이 깨지고 지급 기록이 사라진다.
  그래서 지우지 않고 수령 지급(reason `learning` · `launch_bonus` · `streak`)의 `ref_id` 끝에 `|reset@<epoch ms>`를 붙인다 — `companion.grant_once`가
  같은 `ref_id`를 찾지 못해 다시 준다. 이미 받은 엽전은 지갑에 남는다(필요하면 잔액 맞추기로 내린다). 앱 기기의 진도는 앱에서 로그아웃해야 지워진다.
- 테스트: `migrations/ops-admin-testers.integration.test.ts`(구독 표가 있을 때 · 없을 때).

**운영 적용은 사람이 한다.** 20261212 **뒤에** 적용한다. SQL 편집기에서 본문을 `begin; … commit;`으로 감싸 실행하고
`supabase migration repair --status applied 20261213130000`. 다시 적용해도 같다(`create or replace`). 20261212를 이 파일 뒤에 다시 적용하면
UserRow · 대화 · 지급이 1차 모양으로 돌아가니, 그때는 이 파일도 다시 적용한다. ops_admin 2차(시험 계정 페이지)는 이 파일이 있어야 뜬다.

### 정렬 — 「전체」 사용자 둘러보기 (20261214)

`migrations/20261214130000_ops_admin_sort.sql`. 계약은 ops-dashboard `docs/admin-contract.md` §E-A `ops_search_users`.

- `ops_search_users`에 `p_sort`(`created_at` · `last_sign_in_at` · `email` · `balance` · `country`, 기본 `created_at`) · `p_dir`(`asc` · `desc`, 기본 `desc`).
  목록 밖 값은 `invalid_sort` · `invalid_dir`. 빈 값은 늘 뒤, 같은 값은 id 순, email은 대소문자 무시, 잔액은 지갑이 없으면 0. 열람 기록 detail에는
  기본 정렬이 아닐 때만 `sort` · `dir`.
- 인수 꼴이 바뀌어 옛 함수를 `drop` 하고 새로 만든다. 새 인수는 기본값이 있어 옛 호출도 그대로 된다 — ops_admin은 기본 정렬이면 `p_sort` · `p_dir`을
  보내지 않고, 이 파일이 없어 함수를 못 찾으면 정렬 없이 다시 불러 「DB 업데이트 뒤에 됩니다」로 알린다.
- 테스트: `migrations/ops-admin-sort.integration.test.ts`.

**운영 적용은 사람이 한다.** 20261213 **뒤에** 적용한다. SQL 편집기에서 `begin; … commit;`으로 감싸 실행하고
`supabase migration repair --status applied 20261214130000`. 다시 적용해도 같다. 20261213을 이 파일 뒤에 다시 적용하면 옛 인수 꼴 함수가 함께 남아
이름만으로 부를 때 `is not unique`가 나니, 그때는 이 파일도 다시 적용한다.

### 판정 메시지 (20261215)

`migrations/20261215130000_ops_admin_moderation.sql`. 계약은 ops-dashboard `docs/admin-contract.md` §F.

- 새 RPC `ops_user_moderation(p_actor, p_user, p_limit 기본 50(1~200), p_before)` — 사용자 상세 「신고 · 판정」에서 판정마다 어떤 메시지였는지 본다.
  `{items: [{id, at, stage, category, action, messageId, characterId, message, reply}], hasMore}` 최신순, `allow`는 뺀다(타임라인과 같다).
- 턴 저장 RPC는 판정을 사용자 메시지에 단다. `message`는 그 사용자 메시지(`{id, role, text(2000자에서 자름), status, at}`),
  `reply`는 그 턴의 캐릭터 답(`reply_to`가 그 메시지인 답 중 가장 늦은 것, `{id, status, hidden, segments, at}`). 판정이 캐릭터 답에 달려 있으면
  `reply`가 그 답이고 `message`는 `reply_to`로 찾는다. 메시지가 없으면 null.
- 한 턴의 판정은 같은 시각에 들어간다. `p_before`(쪽 마지막 `at`)로 넘길 때 갈라지지 않게 쪽 끝 시각과 같은 판정은 다 넣는다(그래서 `limit`보다 많을 수 있다).
- 열람 기록 `view` · `user_moderation`, detail `{limit, before?}`. 메시지 내용을 보니 대화 열람(`user_conversation`)처럼 남긴다.
- 테스트: `migrations/ops-admin-moderation.integration.test.ts`.

**운영 적용은 사람이 한다.** 20261214 **뒤에** 적용한다(실제로 기대는 것은 20261212의 `ops` 도우미뿐이다). SQL 편집기에서 `begin; … commit;`으로 감싸 실행하고
`supabase migration repair --status applied 20261215130000`. 다시 적용해도 같다(`create or replace`). 이 파일이 없으면 ops_admin은 판정 목록을
메시지 없이 옛 모양으로 보이고 「DB 업데이트(20261215) 뒤에 보입니다」로 알린다.

### 에셋 수 — 「전체」를 스냅샷 · 음성 수로 정렬 (20261227)

`migrations/20261227130000_ops_admin_media_counts.sql`. 계약은 ops-dashboard `docs/admin-contract.md` §E-A `ops_search_users`.

- `ops_search_users`의 줄마다 `snapshots` · `voices` — 그 사용자의 `companion.media` 중 완료(`status = 'complete'`)인 스냅샷 · 음성 수(없으면 0,
  막힘 · 실패 · 만드는 중은 세지 않는다). `p_sort`에 `snapshots` · `voices`(`p_dir` asc · desc, 같은 수는 id 순).
- 세는 범위: `companion.media` 전체를 묶어 세지 않는다. 보이는 줄(많아야 `p_limit`)만 `LATERAL`로 사용자마다 세고(`media_album_idx`),
  에셋 수로 정렬할 때만 조건에 맞은 사용자 모두를 센다.
- 인수 꼴은 20261214 그대로(11개)다. 다른 꼴이 남으면 이름만으로 부를 때 겹치므로 둘 다 `drop` 한다: 20261213의 꼴(9개 — 20261214를 적용하지 않은 DB)과
  이 파일의 첫 판(13개, `p_min_snapshots` · `p_min_voices`). 그래서 20261214를 건너뛴 DB에도 그대로 적용된다(이 함수가 20261214의 정렬을 모두 담는다).
- ops_admin은 이 파일이 없는 DB에서 수를 「-」로 보이고, 그 정렬(`invalid_sort`)은 기본 정렬로 다시 불러 「DB 업데이트(20261227) 뒤에 됩니다」로 알린다.
- 테스트: `migrations/ops-admin-media-counts.integration.test.ts`.

**운영은 2026-11-23에 SQL 편집기로 적용했다**(20261214 없이 20261213 위에). `supabase migration repair --status applied 20261227130000`으로 기록한다.
다시 적용해도 같다. 20261214를 이 파일 뒤에 다시 적용하면 수 없는 옛 함수로 돌아가니, 그때는 이 파일도 다시 적용한다.
번호는 main의 `20261227120000_ranking_group_size.sql`과 겹치지 않게 `…130000`이다.

### 판정 · 기억 · 스토리 조회 1차 (20270118)

`migrations/20270118120000_ops_admin_insights.sql`. 기획은 ops-dashboard `docs/admin-insights.md`, 계약은 `docs/admin-contract.md` G-A절.

- **리비전**: `companion.moderation_events.rev`(8자리 16진수, 옛 줄 null). 함수가 RPC 요청 헤더 `x-guardrail-rev`로 싣고(`_shared/guardrail-rev.ts` —
  검사 지시문 전부 + 답 프롬프트 앞부분 대표 셋의 FNV-1a, `companion-rpc.ts`가 모든 RPC에 붙인다), 칸 기본값 `companion.request_guardrail_rev()`가
  PostgREST `request.headers`에서 읽는다. 턴 저장 RPC는 다시 정의하지 않았다. 헤더가 없거나 모양이 틀리면 null(저장은 막지 않는다).
  `companion-eval` 응답에도 같은 `rev`가 실린다.
- 표(`ops`, RPC로만): `ops.guardrail_revs`(리비전 이름 · 메모) · `ops.moderation_reviews`(판정 하나에 검토 하나 — 맞음 · 오탐 · 놓침 · 애매).
- 새 RPC 여섯(모두 `service_role`만, 열람은 `view` · 쓰기는 `write` 기록):
  `ops_moderation_summary`(분류 × 단계 · 입력 1천 건당 · 일별 · 기록용 허용 · 리비전 · 스트라이크, 90일까지) ·
  `ops_moderation_feed`(앞 캐릭터 말 · 학습자 메시지 · 거절 답 · 걸린 초안 · 검토, 거르기 · 쪽 넘김 §F와 같은 규칙) ·
  `ops_review_moderation` · `ops_set_guardrail_rev` · `ops_user_memories`(캐릭터 가리지 않은 전체 기억 · 출처 메시지 · 칩 여부) ·
  `ops_user_stories`(내 스토리 · 반응 · Seen · 퀴즈 · 거절 사진(분류만, 격리 경로 없음) · 친구 스토리 답장 · 지난 스토리 열람).
- 연령대 · 로맨스 선은 판정 줄이 아니라 그 턴 캐릭터 답의 meta(`ageBand` · `romanceLine`)에서 읽는다 — 답이 없는 판정(두 번 걸려 실패 등)은 null이라
  그 거르기에서 빠진다.
- 테스트: `migrations/ops-admin-insights.integration.test.ts`, `_shared/guardrail-rev.unit.test.ts`.

**운영 적용은 사람이 한다.** 20261212 뒤라면 어디든 된다(`ops` 도우미 · `companion.memories` · 내 스토리 표에 기댄다). 파일 하나만
`supabase db query --linked -f supabase/migrations/20270118120000_ops_admin_insights.sql`(`db push` 금지). 다시 적용해도 같다.
그 뒤 함수(`chat-send` · `companion-greet` · `companion-proactive` · `companion-eval` 등 RPC를 부르는 것)를 배포하면 새 판정에 `rev`가 찬다 —
함수를 먼저 올려도 헤더는 무시되고, 마이그레이션만 먼저여도 `rev`가 null일 뿐이다.

## 추천 친구 · 합산 체험 · 완화 수위 (20261216, ADR-0164)

`migrations/20261216120000_companion_friends.sql` — 스토리 밖 추천 친구 넷(정본 `docs/content/companion-friends.json`), 출시 스위치
`companion.settings.friends_mode`(`off` · `testers` 기본 · `on`), 무료 체험을 모든 인물 합산으로, 완화 수위(open — 인물 open + 생년상 성인 + 성인 확인 동의
`profiles.adult_ack_at`). 앱 RPC `companion_friends()` · `companion_ack_adult()`, 프로필 `adultAck`. 판정 · 맥락이 적용 수위 `romanceTier`를 싣는다.

- 함수: `companion-safety.ts`(`effectiveRomanceTier` · `outputCheckRequired` · open 검사 선) · `companion-prompt.ts`(친구 소개 · 스토리 밖 · 배경 · 성격 · 사투리 ·
  open 수위선) — open 턴은 답을 출력 검사한 뒤 내보낸다. 스냅샷 그림 규칙은 수위로 넓히지 않는다(추천 답변 칩은 ADR-0168에서 선을 따르게 됐다).
- 평가: `companion-eval`의 `GET ?docs=1`이 `evalSets`(친구 페르소나 유지 · 로맨스 수위 경계, `_shared/companion-eval-sets*.ts`)를 더 준다.
- 플레이그라운드(운영자, 서버 키 · 시험 계정만): `companion_operator_set_adult_ack(p_user_id, p_ack)` → `{ result: ok · not_adult, adultAck, ageBand }`
  (켜기는 생년상 성인만). 생년은 기존 `companion_operator_set_profile`. `companion_inspect_testers().adultAck`, `companion_inspect_memory(…).access`
  (`friendsMode` · `tester` · `ageBand` · `adultAck` · `kind` · `personaTier` · `romanceTier` · `romanceReason` · `visible` · `hiddenReason`).
  `companion_operator_reset`은 동의를 지우지 않는다. SSE `done`과 저장 meta(첫 인사 · 선톡 · 거절)가 적용 수위 `romanceTier`를 싣는다.
- 운영에서 친구를 모두에게 열기: `update companion.settings set friends_mode = 'on'`. 끄기: `'off'`(대화 중이던 친구도 `not_available`).
- 테스트: `migrations/companion-friends.integration.test.ts`(FR1 ~ FR9) · `_shared/companion-friends.unit.test.ts`(FT1 ~ FT12).

## 로맨스 선 사다리 (20261218, ADR-0168)

적용 로맨스 선 `none < hug < kiss < close < open`을 `romanceLine(ageBand, romanceTier, persona, speechLevel)`(`companion-safety.ts`)이 정한다 —
스토리 인물 · 동의 없는 open 인물은 hug, 추천 친구 standard(다은 · 건우)는 말투 단계로 hug(존댓말) · kiss(반말) · close(slang), open 인물 + 성인 + 동의는
open(성적 긴장 · 장면 넘김까지, 노골적 묘사 · 음담패설은 차단). 검사 · 시스템 프롬프트 · 추천 답변 칩 · 평가 채점이 같은 선을 따른다. 출력 검사는 그대로
성인이 아니거나 open일 때만.

- 트래킹: 검사가 허용한 로맨스를 `allow` + `romance`, open의 성적 긴장을 `allow` + `sexual`로 남긴다(`companion.moderation_events`). 턴 · 첫 인사 · 선톡 ·
  거절의 저장 meta에 `romanceLine`.
- `migrations/20261218120000_companion_romance_ladder.sql` — 다은 · 건우의 `persona.romance`만 고친다(정본 `docs/content/companion-friends.json`).
- 평가: 검사 세트 `romance-line-moderation`(TL1 ~ TL15), 케이스 칸 `romanceLine`(검사 · 칩).

**배포 순서**: 이 마이그레이션(20261212 **뒤**, 다시 적용해도 같다) → `chat-send` · `companion-greet` · `companion-proactive` · `companion-suggest` · `companion-eval` ·
`companion-snapshot` → 앱. 함수를 먼저 올리면 판정에 `romanceTier`가 없어 모두 standard로 돈다(안전한 쪽). 에셋(기준 그림 `seoyeon-ref.png` 등 · 목소리
`voiceId`)은 아직 없어 친구의 스냅샷 · 음성은 `not_configured`다 — 에셋을 올린 뒤 `companion.characters.media`를 채운다.

## AI 대화 나이 하한 만 14세 (20261217)

`migrations/20261217120000_companion_age_floor_14.sql` — `companion.turn_gate_base`의 하한을 13 → 14로 올린다(한국 개인정보보호법 · 처리방침 7절).
정의를 통째로 다시 쓰지 않고 지금 정의에서 하한 한 줄만 바꾼다(운영 정의가 저장소와 어긋난 적이 있어). 이미 14면 아무것도 하지 않는다. [CH2]

## 주간 순위 (20261220, ADR-0170)

`migrations/20261220120000_weekly_ranking.sql` — 회원 주간 순위(월 00:00 UTC 시즌). 스키마 `ranking`(RLS 켬, anon · authenticated는 스키마 · 표 권한
없음 — 앱은 RPC만, 모든 사용자 열은 `auth.users` CASCADE).

- 표: `settings`(한 줄 — `reward_enabled` 기본 false · `reward_amount` 30 · `group_target` 15 · `group_max` 18 — 20261227, 처음은 25 · 30) · `groups` · `members`(주 × 사용자) ·
  `lesson_passes`(사용자 평생 한 번) · `chat_words`(주 1번) · `preferences`(숨기기) · `rewards`(정산 기록).
- 배정 `ranking.join_week`: 그 주에 처음 점수를 얻을 때. 구간 = 가입 나이(<14일 · <60일 · 그 밖) × 지금까지 통과한 콘텐츠 유닛(0~9 · 10~39 · 40+),
  같은 구간에서 숨기지 않은 인원이 목표 미만이고 전체가 상한 미만인 가장 오래된 그룹, 없으면 새 그룹(구간마다 advisory lock).
- 레슨 점수: `public.learning_progress` AFTER INSERT/UPDATE 트리거 — 새 스냅숏의 catalogProgress에서 처음 보이는 (에피소드, 유닛) 가운데
  `companion.content_units`에 있는 것만. 저장 RPC는 그대로다. **새 에피소드를 올릴 때 `content_units`를 채우지 않으면 그 유닛은 순위에도 안 센다.**
- 채팅 단어 점수: `chat-send`가 피드백 카드의 `learnedUsed` 가운데 `voca:`를 `ranking_record_chat_words`(서버 키)로 센다
  (`_shared/chat-send-chat-words.ts`). 교정이 짚은 단어는 pending. 결과는 SSE `correction`과 저장 카드의 `chatWords`. 입력 검사에 걸린 메시지는 세지 않는다.
- 앱 RPC(authenticated): `ranking_board(p_board: 'lessons' | 'chat_words')` → `{ state: ranked · not_joined · hidden, board, endsAt, groupSize, reward,
  rows[{rank, name, country, episode, score, me}], me, next }`(user id · 이메일 없음) · `ranking_preferences()` · `ranking_set_hidden(p_hidden)` → `{ hidden }`.
- 서버 RPC(service_role만): `ranking_record_chat_words(…)` · `ranking_settle_week(p_week)`(보상이 꺼졌으면 0, 켜졌으면 그룹 · 보드마다 1~3위
  (점수 > 0, 숨김 제외)에 `companion.grant_once(…, 'ranking', '주:보드:사용자')`).
- 테스트: `migrations/weekly-ranking.integration.test.ts`(WR-D1 ~ D10) · `_shared/chat-send-chat-words.unit.test.ts`(CWS-U1 ~ U5) ·
  `chat-send-handler.unit.test.ts`(CWS-H1 · H2).

**적용 순서(사람이 한다 — 아직 운영에 적용하지 않았다)**

1. 마이그레이션: `supabase db push`(연결된 프로젝트, 20261217 **뒤**) 또는 SQL 편집기에서 `20261220120000_weekly_ranking.sql` 전체를 한 번 실행.
   한 번만 적용한다(`create schema ranking`이라 다시 실행하면 실패한다). 확인: `select * from ranking.settings;`(한 줄, reward_enabled false) ·
   `select tgname from pg_trigger where tgname = 'ranking_lesson_passes';`.
2. 함수: `supabase functions deploy chat-send`(계약 사본 `_shared/companion-contract` 포함). 함수를 먼저 올리면 RPC가 실패해 `chat_words_failed`
   로그만 남고 카드에 `chatWords`가 없다(턴 영향 없음) — 그래도 순서는 마이그레이션 → 함수.
3. 예약: SQL 편집기에서 `supabase/cron/ranking.sql`을 한 번 실행(pg_cron, 매주 월 00:05 UTC에 지난주 정산). 확인:
   `select jobname, schedule from cron.job where jobname = 'ranking-settle-week';`.
4. 앱(순위 탭)을 낸다.

보상 켜기(사용자 결정 뒤): `update ranking.settings set reward_enabled = true, reward_amount = 30;`(액수는 결정값). 끄기: `reward_enabled = false`.
지난 주를 소급하려면 `select public.ranking_settle_week('YYYY-MM-DD');`(그 주 월요일 — 이미 받은 사람은 다시 받지 않는다).
그룹 크기(지금 15 · 18, ADR-0170 D13): `update ranking.settings set group_target = 15, group_max = 18;`(이미 배정된 그룹은 그대로). 주 중간에 목표를 내리면 그 주의 남은 참가자는 작은 새 그룹에 들어가므로 주 경계(월 00:00 UTC) 직전에 바꾼다. 그룹이 작아지면 그룹 수가 늘어 상위 3 보상 지급 총량도 는다(25 → 15명이면 약 1.7배) — 보상을 켜기 전에 액수를 다시 본다.

## 친구 스토리 (20261228, ADR-0178)

> 적용 순서 함정: 운영에 이미 `20261229120000_companion_media_sample.sql`(더 늦은 번호)이 적용돼 있으면 `supabase db push`가 20261228 둘을 건너뛴다 —
> `supabase db push --include-all`로 넣는다(`schema_migrations`에 두 버전이 남는지 확인).

`migrations/20261228120000_friend_stories.sql`(표 · 함수) + `20261228130000_friend_stories_pool.sql`(묶음 내용 — 정본 `docs/content/friend-stories.json`) ·
Edge Function `companion-stories`(새) · `chat-send`(`story_id`) · `send-push`(목적지 `story`) · `companion-proactive`(하루 한 번 합산) · 예약 `cron/friend-stories.sql`.

- 스위치 둘(`companion.settings`, 기본 **off**): `friend_stories` — 올림 · 앱 읽기 · 무료 답장, `story_push` — 알림. 값은 off · testers(시험 계정만) · on.
- 표(RLS 켬, 앱 직접 접근 없음): `story_pool`(인물 · 그림 경로 · 한 줄 · 로마자 · 뜻(en 필수) · 단어 `{episodeId, ref}` · 답장 칩 1 ~ 3 · 켬) ·
  `stories`(인물 · UTC 날짜마다 하나, 24시간) · `story_replies`(사용자 · 클라이언트 메시지마다 — 인용 · `free`). 사용자 열은 `auth.users` CASCADE.
- 올림 `companion_post_stories(now)`: 인물의 올림 시각(UTC 01 ~ 10시, `companion.story_post_hour` — id 해시)이 지났고 오늘 올린 것이 없으면 가장 적게 올린
  묶음 줄(같으면 id 순). 묶음에 줄을 더하면 그 줄부터 나간다. `friend_stories = off`면 올리지 않는다.
- 앱 읽기 `companion_friend_stories()`(authenticated) — 살아 있는 스토리 · `freeReply`.
- 첫 답장 무료 `companion_claim_story_reply(…)`(서버 키 — chat-send가 관문 전에): 지갑 잠금 → 같은 메시지 줄이 있으면 그대로, 없으면 살아 있고 그 스토리의
  무료 줄(예약이 풀리지 않은)이 없을 때 `free` + **금액 0 예약**. 관문(`turn_gate_base` · 구독 겉 `companion_turn_gate`)의 엽전 부족 판정은 그 메시지의
  예약이 있으면 건너뛴다(정의에서 그 줄만 바꿈 — 줄이 없으면 마이그레이션이 멈춘다). `begin_turn`은 같은 메시지의 예약을 그대로 쓴다(체험을 쓰지 않음).
  턴이 실패해 예약이 풀리면(정리 작업 포함) 무료가 다시 산다.
- 인용: `companion.message_json`이 유저 메시지에 `story { id, characterId, line, imagePath, postedAt }`(아니면 null)를 싣는다(정의에서 한 줄 더함).
- 알림 `companion-stories`(매시 5분): 올림 → `companion_story_push_candidates(now, 200)`(후보에 나라 `country`) → 사람마다 계획(on: 대조군 30% ·
  문구 A/B 없음(variant a) · 받는 쪽 제목 = 이름 · 본문은 나라의 언어 일곱(`storyLanguageFor` — en es id ja vi th my) + 한국어 한 줄 40자) →
  `push_campaign_sends`(묶음 `스토리` · 세그먼트 `friend-story` · 새 칸 `character_id` · `story_id`, 시험 계정 단계는 묶음 `스토리 시험`)에 먼저 기록 →
  `send-push` 목적지 `{ kind: "companion-chat", characterId, story: true }`(옛 앱은 방을 연다).
  후보: 기기 · 방(가장 새 기기 뒤 그 인물에게 말함) · 선톡 설정 off 아님 · 답하지 않음 · 올린 지 6시간 · 현지 09 ~ 21시(시간대 모르면 제외) ·
  **오늘(현지) 보낸 알림 없음 — 학습 자동 캠페인 밖의 모든 묶음**(선톡 · 스토리 · 스토리 반응 등, `companion.story_pushed_today`). 「자동 · 」 · 「빈도 · 」 묶음은
  세지 않는다(ADR-0178 D7 개정, 2026-11-27 — 빈도 실험 칸마다 스토리 노출이 달라지지 않게). 선톡 푸시도 문의 `pushedToday`(선톡 · 스토리 묶음)로 `daily_cap` 건너뛴다.
  `companion.pushed_today`는 스토리 묶음만 **대조군 줄도** 센다 — 스토리 대조군이 같은 날 선톡 푸시를 받지 않게(비교가 공정하게). 다른 묶음은 보낸 줄만.
- 테스트: `migrations/friend-stories.integration.test.ts`(FS1 ~ FS20) · `_shared/companion-stories-handler.unit.test.ts`(SH1 ~ SH5) ·
  `chat-send-handler.unit.test.ts`(CSS1 ~ CSS3) · `companion-proactive-push.unit.test.ts`(PP9) · `send-push-body.unit.test.ts`(SP1) · 계약 `chat-send.unit.test.ts`(CS3e).

**적용 순서(사람이 한다 — 아직 운영에 적용하지 않았다, 사용자 승인 필요)**

1. 마이그레이션: `20261228120000_friend_stories.sql` → `20261228130000_friend_stories_pool.sql`(20261227 **뒤**). 앞 것은 관문 · `message_json`
   정의에서 줄을 바꾸며 바뀐 줄이 이미 있으면 그 단계를 건너뛴다(표 · 함수 만들기는 한 번만 적용). 확인:
   `select friend_stories, story_push from companion.settings;`(off · off) · `select count(*) from companion.story_pool;`.
2. 함수: `supabase functions deploy chat-send companion-proactive send-push companion-stories`(계약 사본 `_shared/companion-contract` 포함).
   마이그레이션 전에 chat-send를 올리면 `story_id`가 온 턴은 판정 RPC가 실패해 보통 턴(`story=claim_failed`)이다 — 그래도 순서는 마이그레이션 → 함수.
3. 예약: `supabase/cron/friend-stories.sql`을 SQL 편집기에서 한 번(`<project-ref>` 바꿈). 확인:
   `select jobname, schedule from cron.job where jobname = 'companion-stories';`.
4. 켜기: `update companion.settings set friend_stories = 'testers';` → 시험 계정으로 앱 확인 → `'on'`. 알림은 따로 `story_push = 'testers'` → `'on'`.
   **알림은 스토리를 여는 새 앱이 충분히 깔린 뒤에 켠다** — 옛 앱은 알림을 누르면 그 방만 연다.

## 친구 스토리 — AI 생성 (20270105, ADR-0192)

`migrations/20270105120000_friend_story_generation.sql`(사진 스토리 마이그레이션 **뒤**) · Edge Function `companion-story-studio`(새 — 주간 기획) ·
`companion-story-images`(새 — 그림 일꾼) · 예약 `cron/friend-story-images.sql`. 앱이 부르는 것은 없다 — 운영 도구(ops-dashboard 「스토리 스튜디오」)가 서버 키로 부른다.
앱 읽기 · 인용 · 알림 · 첫 답장 무료는 1단계(ADR-0178) 그대로다: 최종 승인된 초안이 묶음 `story_pool`의 그날짜 줄이 될 뿐이다.

- 스위치 `settings.story_schedule`: `pool`(기본 — 1단계 그대로, 인물마다 날마다 하나) · `cadence`(인물별 빈도). 빈도는 `settings.story_cadence`:
  `{ epoch, daily: { 인물: 시 }, weekly: { 인물: { dow, hour } }, groups: [{ 인물: 시 }, …] }` — 시는 UTC, 조는 `epoch`부터 하루씩 돈다.
  기본값: 덕수쌤 매일 01시 · 윤경 토요일 10시 · (서연 02 · 건우 08 · 도윤 14) (다은 03 · 재민 09) (미나 04 · 해준 10). 설정에 없는 인물은 `cadence`에서
  올리지 않는다(그날로 승인된 스토리가 있을 때만). 값이 틀려도(글 · 범위 밖 · 정수에 안 들어가는 큰 수) 던지지 않는다 — 시각은 해시 시각, 요일은 토요일로.
- 올림 `companion_post_stories(now)`(다시 정의): 인물의 올림 시각이 지났고 오늘 올린 것이 없으면 — 그날로 승인된 한 번짜리 줄(`story_pool.publish_on`)을 먼저,
  없으면 올릴 차례(`companion.story_due`)인 인물만 돌려쓰는 줄(`publish_on is null`, 가장 적게 올린 것)에서. 한 번짜리 줄은 다른 날에 돌려쓰지 않는다.
  결과 줄에 `generated`(승인된 초안이었는가)가 더해졌고, 올리면 그 초안이 `published`가 된다.
- 표(RLS 켬, 서버 키만): `story_drafts`(인물 · 날짜마다 살아 있는 것 하나 — 한 줄 · 로마자 · 뜻 · 추천 답안 · 단어 · 컷(`selfie` · `other` · `scene`) · 그림 주문 ·
  그림 경로 · 근거 `image_meta`) · `story_plans`(그 주 월요일 — 사람이 고치는 메모 `notes` · 웹 검색 조사 `research` · 출처 `sources`).
  상태: `planned`(글 초안) → `queued`(기획 승인 — 그림 대기) → `drawing` → `ready`(최종 승인 대기) · `failed`(그림 실패) → `approved` → `published`, 버리면 `discarded`.
- `companion-story-studio`(서버 키, 본문 `{ action, by, … }`, 응답 HTTP 200 `{ result, … }`):
  `calendar { from, days }` · `drafts { from, to }` · `plan { week }` · `save_plan { week, notes }` — RPC 그대로.
  `research { week, hints? }` — 웹 검색(Anthropic 서버 도구 `web_search_20260209`, 검색 24번까지)으로 그 주의 소재 후보를 분야별로(맛집 · 음식 / 관광명소 · 장소 /
  행사 · 전시 / 상영 · 방영 / K-pop / 밈 · 유행어 · 릴스 / 계절 · 날씨) 모아 `story_plans.research` · `sources`에. 80초 안팎.
  `plan_week { from, days, catalog? }` — **한 주 기획**(주 진입점): 인물마다 기획 맥락을 읽고 → 배정 한 번(`llm.assign` — 메모의 소재를 자리(인물 · 날짜)마다
  하나, 구체적인 소재는 한 인물에게만) → 컷 배정(코드 — `settings.story_shot_mix`: 셀카 0.3 · 남이 찍어 준 컷 0.2 · 인물 없음 0.5를 모든 인물을 합쳐
  맞춘다, 인물마다 최근 여섯 컷까지 돌아본다 — `companion-story-studio-shots.ts`) → 인물별 초안을 동시에 → 한 번에 넣는다. 한 주(7일)씩만 — 주간 메모가
  주마다 하나다. 응답: `failed`(맥락 읽기 · 초안 쓰기에 실패한 인물) · `skipped`(쓰지 못한 자리 수) · `unassigned`(배정이 빠뜨린 자리 수 — 하나도 맞지
  않으면 `failed`로 닫는다). 그 무렵 이미 있는 초안은 배정에 알려 준다(다시 돌려도 같은 소재를 또 나누지 않게). 30초 안팎(인물 아홉).
  **빈 자리와 달력의 차례는 스위치와 상관없이 빈도 설정대로 본다** — `pool`인 동안에도 넘어갈 한 주를 미리 기획 · 승인해 볼 수 있다.
  `write { characterId, from, days, catalog? }` — 한 인물만 다시 쓴다(배정 없이): 그 인물의 빈 자리(차례인데 초안 · 올림이 없는 날)마다 초안. 덕수쌤(`LEARNING_CHARACTERS`)은 학습 스토리,
  나머지는 문화 · 유행. 다른 인물이 그 무렵 올리는 초안을 같이 줘 소재가 겹치지 않게 한다(인물을 차례로 쓴다). 로마자는 모델이 쓰지 않는다 —
  모델은 읽는 법(숫자 · 로마자를 한글로 푼 글)만 쓰고 `korean-romanize.ts`(국어의 로마자 표기법 · 소리 변화 반영, 앱 레슨 콘텐츠의 표기
  1,265쌍과 94% 일치 — ㄴ 첨가 같은 예외는 자주 나오는 말만 표로)가 옮긴다. 읽는 법은 한 줄에 숫자 · 로마자가 있을 때만 쓴다. 다 쓴 한 줄에 `catalog`(`[{ ko, episodeId, ref }]` — 운영 도구가 준다)의 단어가 들어 있을 때만 단어를 붙인다
  (`companion-story-studio-items.ts`). 혼자 찾는 것은 체언만 — 낱말의 처음에 있고 뒤가 끝이거나 조사일 때(눈사람의 「사람」 · 포장마차의 「포장」은
  붙이지 않는다). 용언은 덕수쌤 초안에서 모델이 고른 단어를 확인할 때만 본다(같은 꼴의 다른 뜻 — 눈이 내리다 · 차에서 내리다 — 을 가릴 수 없다).
  카탈로그 줄에 `meaning`(영어 뜻)을 주면 초안 쓰기에 같이 보여 준다. 한 번에 두 주(14일)까지 쓴다.
  `review { id, step, patch? }` — `approve_plan` · `edit` · `redo_image` · `set_image` · `approve` · `unapprove` · `discard`. 결과: ok · not_found · invalid ·
  wrong_state · no_image · past_date · slot_taken · already_posted · translate_failed. **승인된 초안은 고칠 수 없다**(`wrong_state` — 승인을 풀고 고친다:
  고친 글이 번역 · 두 번째 확인 없이 나가지 않게). `past_date`: 지난 날짜, 또는 오늘인데 마지막 올림 회차(UTC 23시 5분)가 지남.
  `set_image`의 경로는 `content/images/…` 안만 받는다. `edit`로 한 줄 · 영어 뜻이 바뀌면 다른 언어 뜻은 비워지고,
  최종 승인(`approve`)이 빠진 언어(es id ja vi th my)를 번역해 채운 뒤 승인한다(번역 실패면 승인하지 않는다). 올린 뒤에는 고칠 수 없다.
  `edit`로 한 줄(`ko`)을 고치면 로마자를 다시 만든다(`patch.roman`을 직접 주면 그대로, 숫자가 있으면 `patch.reading`에 읽는 법).
- `companion-story-images`(서버 키, 매분): `companion_claim_story_images(now, 2)` → 줄마다 한 장(`companion-story-image.ts`) → `companion_finish_story_image`.
  컷(`story_drafts.shot`)은 셋: `selfie`(셀카) · `other`(남이 찍어 준 컷) — 둘은 스냅샷 v2m(ADR-0179)의 장면 설계 · 기준 그림 묶음 · 편집 호출 · 검사를
  다시 쓴다(초안의 그림 주문이 무대 지시, 학습자는 늘 없음, 각도는 코드가 고정 — 셀카는 `selfie`, 남이 찍어 준 컷은 `selfie` 금지) ·
  `scene`(인물 없음 — 찍는 사람의 손까지): 그림 주문 + 고정 규칙 문장으로 생성 호출(`/v1/images/generations`) → 사물 검사(얼굴 · 글자 · 로고 · 주문과 맞는가).
  그림이 검사를 통과하면 **그 그림을 보고 문구를 맞춘다**(`companion-story-caption.ts`, `COMPANION_STORY_PLAN_MODEL`): 초안이 그림과 맞으면 그대로,
  어긋나면 같은 소재 · 말투로 고쳐 닫기의 `p_line`으로 낸다(로마자는 규칙으로, 단어는 한 줄에 남아 있을 때만, 다른 언어 뜻은 비워져 최종 승인이 다시 번역).
  고치기 전의 글은 `story_drafts.line_draft`(한 줄 · 로마자 · 뜻 · 추천 답안 · 단어)와 `image_meta.caption.draft`에 남고, 「그림 다시」는 그 글로 되돌려
  다시 맞춘다. 그리는 사이 사람이 글을 고쳤으면 맞춘 글을 쓰지 않는다(`caption: "rejected"`). 고친 글은 한글 위주 · 80자 안 · 초안에 없던 로마자 없음일
  때만 쓴다(아니면 `"unusable"`). 실패하면 초안 그대로(`"failed"`). 인물 없는 컷의 검사는 사람이 주인공으로 나온 것(얼굴이 안 보여도)도 떨어뜨린다. 인물이 나오는 컷인데
  묶음(`companion-refs/v2/<slug>/manifest.json` — 달력의 `hasRef`)이 없으면 그리지 않고 `failed`(`no_bundle`)로 넘긴다 — 사람이 컷을 바꾼다. 모두에게 보이므로 규칙은 미성년자 기준, 검사는 늘 돈다. 세로 2:3(1024x1536) · webp(압축 82).
  안전하지 않은 그림은 올리지 않는다. 그 밖의 흠(동일성 · 깨진 글자 · 주문과 다름)은 다시 그리다 세 번째 시도면 경고(`image_meta.warnings`)를 달아 사람에게 보인다.
  실패는 세 번까지 다시 `queued`, 그 뒤 `failed`(사람이 다시 그리기 · 직접 올리기 · 버리기). 닫지 못하고 죽은 줄은 10분 뒤 다시 고르되 세 번이면 `failed`.
  닫기는 고를 때 받은 `claimedAt`을 증표로 낸다 — 그리는 중에 「그림 다시」 · 그림 주문 고치기가 들어오면 그리던 그림은 저장되지 않는다.
  지난 날짜의 초안은 그리지 않는다. 파일 이름은 시도마다 다르다(공개 파일이 1년 캐시되므로 같은 주소에 덮어쓰지 않는다).
  그림은 공개 콘텐츠 버킷(`COMPANION_CONTENT_BUCKET`, 기본 `content`)의 `images/friend-stories/<인물>/<초안>-<시각>.webp`에 올리고, 묶음에는
  `content/images/friend-stories/…`로 적는다(앱이 맨 앞 `content/`를 떼고 자기 버킷에서 읽는다 — **앱의 버킷과 같아야 한다**).
- 환경: `COMPANION_STORY_PLAN_MODEL`(조사 · 초안, 기본 `claude-sonnet-5-5`) · 번역은 Haiku 고정 · 그림 노드는 `COMPANION_SNAPSHOT_MODEL` · 엔진과 품질은
  `settings.snapshot_engine` · `snapshot_quality` · `ANTHROPIC_API_KEY` · `OPENAI_API_KEY`(없으면 그림 일꾼이 503 `not_configured`, 고르지 않는다).
- 테스트: `migrations/friend-story-generation.integration.test.ts`(빈도 · 초안 흐름 · 검토 · 일꾼 · 달력) · `_shared/companion-story-studio.unit.test.ts` ·
  `_shared/companion-story-images-handler.unit.test.ts`(컷별 길 · 문구 맞추기) · `_shared/korean-romanize.unit.test.ts`. 실제 모델로 한 바퀴: `supabase/evals/friend-stories.eval.test.ts`(내장 Postgres · 로컬 기준 그림 —
  `ANTHROPIC_API_KEY=… OPENAI_API_KEY=… EVAL_REFS_DIR=<묶음 폴더> npx vitest run supabase/evals/friend-stories.eval`, 결과는 `supabase/evals/out/friend-stories/`).

**적용 순서(사람이 한다 — 아직 운영에 적용하지 않았다, 사용자 승인 필요)**

1. 마이그레이션 `20270105120000_friend_story_generation.sql`(20270104130000 **뒤**). 확인: `select story_schedule from companion.settings;`(pool) ·
   `select companion.story_due('yoonkyung', current_date);`. `pool`인 동안 올림은 1단계와 같다.
2. 함수: `supabase functions deploy companion-story-studio companion-story-images`. `COMPANION_CONTENT_BUCKET`을 앱이 읽는 버킷과 맞춘다(스테이징 `content-test`).
3. 예약: `supabase/cron/friend-story-images.sql`을 SQL 편집기에서 한 번(`<project-ref>` 바꿈).
4. 운영 도구에서 한 주를 기획 · 승인해 본 뒤 `update companion.settings set story_schedule = 'cadence';`. 이때부터 차례가 아닌 인물은 그날 스토리가 없다.

## 내 스토리 (20261228, ADR-0194 내 스토리 · ADR-0191)

`migrations/20261228140000_my_stories.sql`(친구 스토리 두 마이그레이션 **뒤**) · Edge Function `companion-story-reactions`(새) · `chat-send`(스토리 맥락 ·
`story_id`가 내 스토리면 `mine`) · 예약 `cron/my-stories.sql`. 사진은 없다 — 단어장 단어 · 레슨 카드만(사진은 ADR-0191 D11, 다음 단계).
**반응은 그 인물 방의 채팅 메시지다**(ADR-0191 D2) — 마이그레이션은 운영에 올라가기 전에 제자리에서 고쳐 썼다.

- 스위치(`companion.settings`, 기본 **off**): `my_stories` — 올리기 · 읽기 · 지우기, `story_reactions` — 반응 예약 · 만들기, `story_reaction_push` —
  반응 알림(값 off · testers · on). `story_reactions`는 `my_stories`가 켜진 사람에게만 뜻이 있다(`companion.reactions_on`). `my_story_seen`(기본 켬) — Seen by.
- 규칙 수치는 `settings.my_story_rules`(jsonb, 비어 있으면 기본값) — 배포 없이 고친다:
  `twoReplyChance` 0.6 · `recentDays` 3 · `recentWeight` 1.0 · `midDays` 14 · `midWeight` 0.5 · `oldWeight` 0.15 · `intimacy0` 1.0 · `intimacy15` 1.5 ·
  `intimacy35` 2.2 · `intimacy60` 3.0 · `repeatFactor` 0.6 · `firstMinSec` 60 · `firstMaxSec` 300 · `secondMinSec` 300 · `secondMaxSec` 3600 ·
  `seenMaxSec` 1800 · `morningStart` 4 · `dayStart` 12 · `nightStart` 18.
  예: `update companion.settings set my_story_rules = my_story_rules || '{"secondMaxSec": 1800}';`
- 올리기(ADR-0191 D8): 현지 **아침 · 낮 · 밤 창마다 하나**(`my_story_slots` — 지워도 돌아오지 않음) + 24시간 안 `my_story_daily` + 1(기본 4)개 — 바르게 쓰는
  사람은 어느 24시간에도 창 셋 + 하나를 넘지 않는다(`companion.my_story_day_full`).
  시간대(20270118130000, ADR-0211)는 저장된 `profiles.timezone` → 앱이 보낸 UTC 차이(분, `p_tz_offset_min`, 0은 모름) → 스토어 나라(`p_region` · 없으면
  `last_region`, `companion.story_country_timezone`) → 학습 프로필 나라 → UTC. 결과 `window_used`는 `window.nextAt`(다음 창)을 함께 준다.
- 반응 상한: `story_reaction_user_daily`(사람 하루, 기본 6) · `story_reaction_global_daily`(전체 하루, 기본 1000 — 버그 · 악용에 대한 퓨즈).
  **claim 수**로 센다 — 모델 호출이 실패해도 센다. 사람 상한을 넘으면 `skipped`, 전체 상한에 닿으면 남겨 두고(다음 회차) 올린 지 24시간이 지나면 `skipped`.
  수는 지워지지 않는 장부 `my_story_usage`(사람 · UTC 날) · `my_story_usage_global`(날)에서 읽는다. claim은 그날 전체 장부 줄을 `for update`로 잠가 줄 세운다.
  30분 넘게 `claimed`인 줄(함수가 끊김)은 다음 claim이 `failed`로 끝낸다.
- `skip_reason`: 사람 상한 `cap_user` · 24시간 지남 `expired` · 반응 스위치 꺼짐 `switch_off` · 끊겨 30분 넘은 claimed `stale` · 시간 예산 `budget` ·
  방 없음 `no_conversation` · 그 밖 핸들러 결과(`not_allowed` · `blocked` · `empty_reply` · `failed` …). claim은
  `{ rows, skippedCap, deferred, globalCapped }`을 돌려준다 — `deferred`는 그 대화가 도는 중(pending 턴 · 마지막 메시지 1분 안)이라 다음 회차로 미룬 수.
- 누가 답하나(올릴 때, ADR-0191 D3 · D4): 친구 = 내가 말한 대화가 있는 · 켜진 · 숨기지 않은 인물. 1명이면 1, 여럿이면 2명(`twoReplyChance`) 또는 1명.
  가중 무작위 — `companion.reaction_weight` = 최근성 × 친밀도 × 직전 내 스토리에 답했으면 `repeatFactor`. 첫 답 1 ~ 5분, 둘째 5 ~ 60분(스토리 · 인물 해시로 결정적).
  각도: 첫 인물 `word`, 둘째 `question` · `together` 중 하나. **퀴즈는 덕수쌤만**(`20270106120000`) — 단어 · 카드 스토리에서 덕수쌤이 친구면
  반드시 한 번 답하고(하나면 혼자, 둘이면 첫째 · 둘째 반반), 각도는 첫째 `word` · `quiz`, 둘째 `question` · `quiz` · `together` 중 하나. Seen by(`my_story_seen`)는 친구 전원 — 답하는 인물은 답 30 ~ 120초 전, 나머지는 1 ~ 30분.
- 반응 만들기(`companion-story-reactions`, **매분**): 정리 → claim 12 → 알람마다(동시 넷) 선톡 맥락(`companion_proactive_context`) + 반응 지시
  (`_shared/companion-reaction-prompt.ts` — 각도, 단어는 필수 아님) → 답 → 출력 검사(항상) → 번역 · 추천 답안 칩(동시에) →
  `companion_finish_story_reaction`이 **그 인물 방의 메시지**(`messages.origin = 'story_reaction'`, meta에 `myStoryId` · `angle` · 사용량)로 저장 → 푸시.
  그 사이 스토리를 지웠으면 저장하지 않는다(`saved: false`). 시간 예산 40초(시작 판정)를 넘으면 남은 줄은 알람으로 되돌린다(`requeued` — 센 상한도 돌려놓고 다음 회차가
  다시 고른다).
- 모델(`_shared/companion-reaction-env.ts`): 답 `COMPANION_REACTION_MODEL`(기본 `claude-sonnet-5-5` — 대화의 `COMPANION_MODEL`과 따로) · 출력 검사 · 번역
  `COMPANION_REACTION_CHECK_MODEL` · `COMPANION_REACTION_TRANSLATION_MODEL`(기본 `claude-haiku-5-5`) · 칩 `COMPANION_REACTION_SUGGEST_MODEL` →
  `COMPANION_SUGGEST_MODEL` → Haiku. 추정(캐시 없이, 입력 약 2.8k · 출력 약 300): Sonnet 5.5($2 / $10 per MTok) 답 ≈ $0.0086 + 검사 · 번역 ≈ $0.0003 —
  **반응 하나 약 $0.009**, 전체 상한이 다 차면 하루 약 $9. Haiku 답은 약 $0.0004 — 평가로 견준 뒤 바꾼다.
- 반응 푸시(ADR-0191 D7, `_shared/companion-reaction-push.ts`): 제목 인물 이름 · 본문 **모국어 번역 첫 줄 하나**(없거나 퀴즈 답이 새면 한국어 첫 줄,
  `reactionPushBody`). 문 `companion_story_reaction_push_gate`(스위치 · 시험 계정 · 기기 · 방). 배정을
  `push_campaign_sends`(묶음 「스토리 반응」)에 먼저 남기고 `send-push`(목적지 그 인물 방). 「하루 한 번」에 세지 않지만, 그 줄이 있으면 그날 선톡 푸시
  (`companion_proactive_push_gate.pushedToday`) · 친구 스토리 알림은 건너뛴다.
- 대화 턴(`chat-send`): `companion_story_context` — 학습자의 살아 있는 내 스토리 · 그 인물이 최근 올린 스토리 셋을 이번 턴 지시에 싣는다(ADR-0191 D9).
  읽지 못하면(옛 서버 · 실패) 싣지 않는다.
- 표(RLS 켬, 앱 직접 접근 없음): `my_stories` · `my_story_reactions`(알람 — 인물 · `rank` · `angle` · `due_at` · `message_id` · scheduled → claimed →
  done/failed/skipped) · `my_story_seen` · `my_story_slots` · `my_story_replies`(내가 인용해 보낸 답) · 장부 둘.
- 지우기(ADR-0191 D10): 스토리 · 알람 · Seen이 사라진다. **대화방의 반응 메시지 글은 남고** 기록의 `story`만 `{ kind: deleted }`가 된다.
  프로필 `keep_my_stories`(기본 켬): 끄면 읽기는 살아 있는 것만, 정리(`companion_purge_my_stories`)가 24시간 지난 것을 지운다.
- 앱 RPC(authenticated, 모양은 `packages/companion-contract/src/my-stories.ts`): `companion_my_stories(p_tz_offset_min?, p_region?)` →
  `{ enabled, keep, stories, window }`(최신 100개 · `reactions` · `seenBy`) · `companion_post_my_story(…, p_tz_offset_min?, p_region?)` →
  `ok | off | window_used | daily_limit | invalid` · `companion_delete_my_story(id | null = 모두)` · `companion_set_keep_my_stories(bool)`.
- 기록의 인용(`message_json.story`): 내 말 — friend(친구 스토리 답장) · mine · deleted. 인물의 반응 메시지 — mine · deleted.
- 테스트: `migrations/my-stories.integration.test.ts`(MS1 ~ MS17) · `_shared/companion-reactions-handler.unit.test.ts`(RH1 ~ RH10) ·
  `_shared/companion-reaction-env.unit.test.ts`(RE1 ~ RE3) · `companion-reaction-prompt.unit.test.ts`(RP1 ~ RP4) ·
  `chat-send-story.unit.test.ts`(SS1 ~ SS5) · 계약 `my-stories.unit.test.ts`(MC1 ~ MC2) · 친구 스토리 FS15(인용 `kind`).

**적용 순서(사람이 한다 — 아직 운영에 적용하지 않았다, 사용자 승인 필요)**

> 마이그레이션 `20261228140000`과 함수 `chat-send` · `companion-story-reactions`는 **함께** 배포한다 — claim · 끝내기의 모양이 함수와 맞물려 있어
> 섞이면 고른 줄이 30분 뒤 stale로 실패한다.

1. 마이그레이션: 친구 스토리 둘 뒤에 `20261228140000_my_stories.sql`. `messages.origin`에 `story_reaction`을 더하고, `companion_claim_story_reply` ·
   `message_json` · `companion_proactive_push_gate` 정의의 한 곳씩을 바꾼다(이미 있으면 건너뜀, 찾는 줄이 없으면 멈춤). 더 늦은 번호가 이미 적용돼
   있으면 `supabase db push --include-all`. 확인:
   `select my_stories, story_reactions, story_reaction_push, my_story_daily, story_reaction_user_daily, story_reaction_global_daily from companion.settings;`
   (off · off · off · 3 · 6 · 1000).
2. 함수: `supabase functions deploy chat-send companion-story-reactions`(계약 사본 `_shared/companion-contract` 포함). 답 모델을 바꾸려면
   `COMPANION_REACTION_MODEL`.
3. 예약: `supabase/cron/my-stories.sql`을 SQL 편집기에서 한 번(`<project-ref>` 바꿈) — **매분**. 확인:
   `select jobname, schedule from cron.job where jobname = 'companion-story-reactions';`.
4. 켜기: `my_stories = 'testers'` → 앱 확인 → `story_reactions = 'testers'` → 비용 · 반응 품질 확인 → `story_reaction_push = 'testers'` → `'on'`.
5. 퀴즈는 덕수쌤만(ADR-0191 D5 개정): `20261228140000` **뒤에** `20270106120000_my_story_duksu_quiz.sql`. 함수 하나(`companion.schedule_my_story_reactions`)만
   다시 정의한다 — 함수 배포 없음. 평가 세트를 대시보드에 반영하려면 `companion-eval`을 배포. 확인:
   `select pg_get_functiondef('companion.schedule_my_story_reactions(companion.my_stories, timestamptz)'::regprocedure) like '%duksu%';`(true).

## 내 스토리 — 사진 (20270104130000, ADR-0191 D11)

`migrations/20270104130000_my_story_photos.sql`(내 스토리 마이그레이션 **뒤**) · Edge Function `companion-my-story`(새 — 교정 · 올리기 · 글 고치기) ·
`companion-story-reactions`(같은 회차에 뒷정리) · `delete-account`(사진 · 격리 버킷 정리). 스위치 `my_story_photo`(기본 **off** · testers · on) —
`my_stories`가 켜진 **성인**(생년으로 확인)에게만 뜻이 있다. 미성년 · 나이 모름은 사진을 올릴 수 없다(단어 · 카드는 된다).

- 버킷(둘 다 비공개, 5 MB, jpeg · png · webp — 앱이 줄여서 올린다): `my-story-photos/<user_id>/<파일>` — 올릴 수 있는 사람만 자기 폴더에 올리고 읽는다(저장소 정책이
  `companion_can_upload_story_photo()`를 부른다 — 스위치 · 성인 · 폴더의 파일 40개 미만). `my-story-quarantine/<user_id>/<파일>` — 거절한 사진, 정책 없음(서버 키만).
- 올리기(`POST companion-my-story` `{ action: "post", client_id, image_path, ko, … }`, 모양은 계약 `myStoryRequestSchema`):
  0. 경로가 `<내 id>/<파일 이름>` 꼴인지 본다 — 서버 키로 읽고 옮기고 지우므로 저장소를 건드리기 전에 막는다.
  1. 문 `companion_my_photo_gate` — 스위치 · 성인 · 창 · 24시간 상한 · 하루 검수 시도(`my_story_check_daily`, 기본 5). 같은 `client_id`가 다시 오면 그 스토리.
  2. 글 검수(대화의 입력 검사 층). 막히면 `text_blocked`.
  3. 사진 읽기(`_shared/companion-story-read.ts`, 8초) — 검수 + 개인정보를 뺀 장면 설명 + 위기 신호. **사진 원본을 보는 모델 호출은 이것 하나다.**
     인물 호출 · 대화 턴은 `my_stories.scene`(설명)만 받는다. 모델은 `COMPANION_STORY_READ_MODEL`(기본 `claude-sonnet-5-5`).
  4. 결과: 통과 → `live`(Seen · 알람 — 첫 인물 `react`, 둘째 `question` · `together`) · 거절 → 사진을 격리 버킷으로 옮기고
     `my_story_rejections`에 적음(창은 쓰지 않는다) · 제때 끝나지 않음 → `checking`(올린 사람에게만 보임).
  - 위기 신호(글 또는 사진)가 읽히면 `scene.crisis` — Seen · 알람을 만들지 않는다(보통 반응을 끈다).
- 교정(`{ action: "draft", text }`): 하루 `my_story_draft_daily`(기본 30) → 글 검수 → 대화의 피드백 노드로 자연스러운 한국어 한 줄 · 뜻 · 팁.
  모국어로 써도 된다. 로마자는 앱이 만든다.
- 글 고치기(`{ action: "edit", story_id, ko }`): 글 검수를 다시 거치고 스토리당 `my_story_edit_limit`(기본 3)번. 사진은 못 바꾼다.
- 뒷정리(`_shared/companion-story-upkeep.ts`, 반응 함수가 매분): ① 파일 정리 대기열 `my_story_file_purges` — 스토리를 지우면(하나 · 모두 · 보관 끔 정리 ·
  계정 삭제) 트리거가 그 사진을, 기한(`my_story_reject_keep_days`, 기본 30일)이 지난 거절은 격리 파일을, 올린 지 하루가 넘도록 스토리가 되지 못한 파일(막힌 글 · 쓴 창 · 그만둔 올리기)을 넣는다. ② `checking` 스토리를 한 번에 셋까지
  다시 읽는다(30초 제한, 간격은 90초 × 2^시도 · 최대 30분). **읽지 못한 사진은 게시하지 않는다** — 24시간이 다 가도록 못 읽으면 지운다. 사진이 사라졌으면 스토리를 지운다.
  격리 버킷으로 옮기지 못한 거절은 원본을 지운다(그 건은 다시 확인을 못 한다).
- 다시 확인 요청: 앱 RPC `companion_request_story_review(p_rejection_id)` — `my_story_rejections.review_requested_at`을 적는다. 운영 도구가
  `review_requested_at is not null and review_result is null`인 줄과 격리 파일을 보여 주고 `review_result`(upheld · overturned)를 적는다(운영 도구 쪽 작업).
- 아동 성착취 의심(`category = 'sexual_minors'`) 건의 열람 · 신고 · 보관 기한은 법무 확인 뒤 정한다(ADR-0191 D11) — 그 전에는 `my_story_photo`를
  `on`으로 올리지 않는다.
- 평가 세트(`_shared/companion-eval-sets-reactions.ts`): `story-reaction-words`(14) · `story-reaction-photos`(12). `companion-eval`의 답장 케이스에
  `storyReaction`을 실으면 운영과 같은 반응 지시로 답을 만든다. 답 모델을 고를 때 같은 세트를 `model`만 바꿔 돌려 견준다.
  로컬에서 실제 모델로 돌리기(돈이 든다 — 26케이스 × 3모델 약 $2): `ANTHROPIC_API_KEY=… npx vitest run supabase/evals/story-reactions.eval`
  (`EVAL_MODELS` · `EVAL_SETS` · `EVAL_CASES` · `EVAL_OUT`으로 고른다, 결과는 `supabase/evals/out/` — git에 올리지 않는다). 기록은 ADR-0191 「평가 기록」.
  사진 읽기까지 보는 실행기는 `supabase/evals/story-photos.eval`(가상 데이터 `story-photo-cases.ts` — 콘텐츠 버킷의 이야기 그림 + 학습자 글 18케이스,
  기본 Sonnet · Haiku, 약 $1.5). 버킷에 없는 그림은 `EVAL_IMAGE_BASE=<duru-curation>/pipeline/evals/delivery/images`로 로컬에서 읽는다.
- 테스트: `migrations/my-story-photos.integration.test.ts`(MP1 ~ MP8) · `_shared/companion-my-story-handler.unit.test.ts`(MH1 ~ MH7 · MU1 ~ MU2 · RP5) ·
  `_shared/companion-story-read.unit.test.ts`(SR1 ~ SR3 · SS1 ~ SS3) · `_shared/companion-eval-reactions.unit.test.ts`(ER1 ~ ER2) · 계약 MC3.

**적용 순서(사람이 한다 — 아직 운영에 적용하지 않았다, 사용자 승인 필요)**

1. 마이그레이션 `20270104130000_my_story_photos.sql`(내 스토리 뒤). 확인:
   `select id, public from storage.buckets where id like 'my-story-%';` · `select my_story_photo from companion.settings;`(off).
2. 함수: `supabase functions deploy companion-my-story companion-story-reactions chat-send delete-account`. `companion-my-story`는
   `ANTHROPIC_API_KEY`가 없으면 `post`를 받지 않는다(500).
3. 켜기 전: 개인정보 처리방침 · 스토어 개인정보 응답 갱신, 의심 건 처리 절차의 법무 확인(ADR-0191 D11). 그 뒤 `my_story_photo = 'testers'`.


## 내 스토리 — 글 스토리 · 종류 목록 (20270107130000, ADR-0191 D13)

- 스위치 `my_story_text`(off · testers · on, 기본 off). 나이 제한 없음.
- 올리기: `POST /functions/v1/companion-my-story` `{ action: "post", client_id, background: "orange"|"green"|"blue"|"purple", ko, overlays?, lang, tz_offset_min? }`
  (`image_path` 없이 — 둘 중 정확히 하나). `_shared/companion-my-story-text.ts`: 문 `companion_my_text_gate`(스위치 · 창 · 24시간 상한 · 하루 검수 시도 ·
  같은 client id면 그 스토리) → 글 검수(쓴 글 + 직접 쓴 얹은 글, 그 사람의 연령대) → 저장 `companion_save_my_text_story`(늘 live, 반응 알람).
  결과: `ok` · `text_blocked` · `crisis`(**올리지 않음**) · `window_used` · `daily_limit` · `check_limit` · `off` · `invalid`. 교정(draft) 없음, 뜻 줄은 빈 글.
- 반응 각도는 사진과 같다(첫째 `react`, 둘째 `question` · `together`, 덕수쌤 고정 · 퀴즈 없음). claim은 얹은 글(`overlays`)도 돌려준다.
- `companion_my_stories`에 `kinds`(word · card · photo(사진 스위치 + 성인) · text(글 스위치)). 스토리 한 건에 `background`.
- 테스트: `migrations/my-story-text.integration.test.ts`(MT1 ~ MT4) · `_shared/companion-my-story-handler.unit.test.ts`(MH8 · RP6).

## 내 스토리 — 덕수쌤 퀴즈의 무료 답 (20270108120000, ADR-0191 D14)

- 퀴즈 반응(angle `quiz`)이 저장되면 방아쇠가 `my_story_quizzes`에 한 줄(답 단어 = 스토리 단어, 기한 = 스토리의 24시간).
- `chat-send`(덕수쌤 방, 스토리 답장 · 고쳐 보내기 아님): 관문 전에 `companion_claim_quiz_answer` — 열린 퀴즈의 답이면 금액 0 예약(첫 답, 오답 뒤 한 통).
  판정은 `_shared/chat-send-quiz.ts`(단어 · 활용형 포함 — 모델 없음) → 이번 턴 지시(맞힘 「맞아요, ○○!」 · 힌트 · 정답 공개).
  턴이 complete면 `companion_quiz_answered`가 결과 · 내 메시지 meta.quiz · 맞히면 친밀도 +2(한 번)를 적는다. 실패한 턴은 세지 않는다.
- 기록(`companion_list_messages` · `message_json`)에 공개 `meta`: 반응 `{ angle, myStoryId, quiz: { freeAnswer } }` · 무료 답 `{ quiz: { free, attempt, result } }`.
- 음성 선물은 없다(사용자 결정).
- 테스트: `migrations/my-story-quiz.integration.test.ts`(MQ1 ~ MQ5) · `_shared/chat-send-quiz.unit.test.ts`(QZ1 ~ QZ2) · `_shared/chat-send-handler.unit.test.ts`(CQ1 ~ CQ3).

**적용 순서(둘 다 아직 운영에 적용하지 않았다)**

1. 마이그레이션 `20270107130000_my_story_text.sql` → `20270108120000_my_story_quiz_answer.sql`(하나씩, `db push` 금지). 확인:
   `select my_story_text from companion.settings;`(off) · `select to_regclass('companion.my_story_quizzes');`.
2. 함수: `supabase functions deploy companion-my-story companion-story-reactions chat-send`(계약 사본 포함).
3. 켜기: 앱이 받을 준비가 되면 `my_story_text = 'testers'`. 퀴즈 무료 답은 스위치 없이 퀴즈 반응이 있으면 바로 동작한다.

## 내 스토리 — 조합 스토리 (20270109120000, ADR-0191 D15)

- 스토리 = 바탕(색 `text` · 사진 `photo`) × 얹은 것(직접 쓴 글 · 배운 단어). 단어 카드(word · card)는 `kinds`에서 빠졌다(「색 + 단어」).
- 사진 · 색 바탕 올리기는 같은 흐름: 글 검수(사진 설명 · 쓴 글 + 직접 쓴 얹은 글 — `_shared/companion-story-compose.ts`) → (사진만) 사진 읽기 → 저장.
  위기 신호(글 · 사진)는 둘 다 올리지 않고 `{ result: "crisis", resources }`(요청의 `client_region`으로 고름). `client_region`은 문 · 저장에 `p_region`으로도 넘겨 창의 시간대를 정한다(ADR-0211).
- 답할 인물 · 각도: 사진 · 글 + 단어면 첫째 다른 인물 react, 덕수쌤 둘째(quiz · question · together). 색 + 단어만은 옛 단어 카드 규칙.
  단어 없으면 사진 규칙. 퀴즈 단어 = 첫 배운 단어(`companion.my_story_quiz_word`).
- 퀴즈 답: 답을 만드는 모델이 `@state`의 `quiz`(correct · wrong · skip)로 판정 — skip이면 그 메시지는 무료로 두고 퀴즈를 닫는다(`skipped`).
  `companion_quiz_answered(p_user_id, p_client_message_id, p_result, p_now)`로 바뀌었다(boolean → text).
- 테스트: `migrations/my-story-compose.integration.test.ts`(MC1 ~ MC5) · `_shared/companion-my-story-handler.unit.test.ts`(MH5 · RP6) ·
  `_shared/chat-send-story.unit.test.ts`(SS1 ~ SS3) · `_shared/chat-send-quiz.unit.test.ts`(QZ3).

**적용 순서** — 글 스토리 · 퀴즈 두 마이그레이션 뒤에 `20270109120000_my_story_compose.sql`(하나씩). 함수는 위와 같다
(`companion-my-story companion-story-reactions chat-send`).

## 내 스토리 — 역할 기반 반응 (20270110120000, ADR-0191 D16)

- 알람의 `angle` 칸은 역할: `react`(첫째) · `follow`(둘째) · `word` · `quiz`(덕수쌤 단어 담당, `quiz`는 퀴즈를 권함 — 규칙 `quizChance` 기본 0.5).
- claim 줄의 `friendReply`(같은 스토리에 먼저 단 친구의 반응 { characterId, name, text }) — 둘째 지시에 싣는다.
- 반응 지시(`_shared/companion-reaction-prompt.ts`)는 역할만 알려 주고 방식은 모델이 고른다 → `@state`의 `mode` → `companion_finish_story_reaction`이
  meta.angle(`companion.reaction_mode` — 아는 값만, 퀴즈는 덕수쌤 단어 담당만) · meta.role로 저장. 퀴즈 줄은 meta.angle이 quiz일 때만.
- 평가 세트 `story-reaction-roles`(8) 추가. 테스트: `migrations/my-story-compose.integration.test.ts`(MC6) · `_shared/companion-reaction-prompt.unit.test.ts`(RP2 · RP3).

**적용 순서** — `20270109120000` 뒤에 `20270110120000_my_story_reaction_roles.sql`. 함수 `companion-story-reactions companion-eval`.

## 친구 스토리 — 지난 스토리 열기 (20270111120000, ADR-0202)

- 24시간 안 스토리는 그대로 무료. 지난 스토리 = 그 인물의 최근 7일 안 스토리 중 만료된 것. 친구(말한 적 있는 · 켜진 · 숨기지 않은 인물) 하나 단위로
  `settings.past_story_price`(기본 10)엽전에 7일 동안 연다. Chat Plus · Premium(`has_all_characters`)은 무료(값 0 기록).
- 스위치 `settings.past_stories`(off 기본 · testers · on) — 친구 스토리 스위치도 켜져 있어야 한다.
- 앱 RPC: `companion_past_stories_status(character)` · `companion_open_past_stories(character, request_id)` · `companion_list_past_stories(character)`.
  응답 모양은 `docs/specs/past-stories.md`. 차감은 티켓 사기와 같은 길(원장 `spend` · `past_stories` · ref = 요청 id, 같은 id는 같은 결과).
- 표 `companion.past_story_opens`(RLS 본인 읽기, 쓰기는 함수만). 테스트: `migrations/past-stories.integration.test.ts`(PX1 ~ PX14).

**적용 순서** — `20270110120000` 뒤에 `20270111120000_past_stories.sql`. Edge Function 배포 없음. 켜기: `update companion.settings set past_stories = 'testers';`.

## 광고 보고 티켓 — admob-ssv (20270117120000, ADR-0209)

- AdMob 보상형 광고의 서버 측 확인(SSV) 콜백. Google이 `GET`으로 부르고, 인증은 Supabase JWT가 아니라 Google 공개키 서명이다(`config.toml` `verify_jwt = false`).
  처리기 `_shared/admob-ssv-handler.ts`(400 · 401 · 403 · 405 · 500 재시도 · 200 outcome), 서명 · 키 캐시 · 환경 `_shared/admob-ssv.ts`.
- 앱 RPC: `ad_ticket_status(offset, request_id?)` · `ad_ticket_start(offset)` — 앱이 받은 `requestId`를 SSV `custom_data`에, Supabase 사용자 id를 `user_id`에 싣는다.
  지급 판정은 `ad_ticket_grant`(service_role만): 스위치 · 대상(회원 · 계정 24시간 뒤 · 구독 없음) · 하루 상한(`ad_ticket_daily_cap`, 기본 2) · 거래 id 멱등.
- 티켓 원장은 앱에 있다 — 앱이 `granted`를 읽고 1장을 더한다. 테스트: `migrations/ad-ticket.integration.test.ts`(AT1 ~ AT9) ·
  `_shared/admob-ssv*.test.ts`(AS-U · AS-H · AS-I).
- 비밀: `ADMOB_AD_UNIT_IDS`(**필수**, 쉼표 — 콜백 `ad_unit` 값, 광고 단위 id의 `/` 뒤 숫자). 없으면 모든 콜백이 500 `misconfigured`
  (Google SSV 키는 모든 게시자가 함께 써서 광고 단위로 우리 콜백임을 가린다).

- 광고 단위 ID(전체 `ca-app-pub-…/…`)는 앱이 아니라 서버 설정 `companion.settings.ad_ticket_unit_ios` · `ad_ticket_unit_android`에 두고
  `ad_ticket_status(…, p_platform)`이 `unitId`로 내린다(스위치 off · 대상 아님 · 값 없음이면 null) — 앱 빌드 없이 켠다(ADR-0209 D10).

**적용 순서** — `20270117120000_ad_ticket.sql`(main의 #661 `20270114…` 뒤 · 열린 #664 `20270115120000` · #667 `20270116120000` 뒤). 함수 `supabase functions deploy admob-ssv`.
켜기: `update companion.settings set ad_ticket_enabled = true;`(앱의 PostHog 플래그 `ad-ticket`도 켜져야 보인다). 끄기는 false — 진행 중 콜백도 거절한다.

## 내 스토리 올리기 창의 시간대 (20270118130000, ADR-0211)

- `companion.my_story_window(user, offset, now, p_region?)` — 저장된 `profiles.timezone` → 기기 시차(0이 아닌 값) → 스토어 나라(`p_region`) → coalesce(
  `last_region`, 온보딩 나라) → UTC. 온보딩 나라가 기기 시차를 이겨 16:30 KST가 아침 창이 되던 것을 고친다.
- 스토어 나라 표 `companion.story_country_timezone` = `country_timezone` + 내 스토리 전용 보충(스페인어권 · MO 등). `user_timezone` ·
  `country_timezone`은 그대로(스토리 알림 · 선톡 대상이 바뀌지 않게).
- RPC 여섯에 `p_region text default null`: `companion_my_stories` · `companion_post_my_story`(앱) · `companion_my_photo_gate` ·
  `companion_save_my_photo_story` · `companion_my_text_gate` · `companion_save_my_text_story`(Edge — 요청의 `client_region`). 옛 호출은 그대로.
- 테스트: `migrations/my-story-slot-timezone.integration.test.ts`(TZ1 ~ TZ7) · `_shared/companion-my-story-handler.unit.test.ts`(MH9).

**적용 순서** — `20270118130000_my_story_slot_timezone.sql`(`20270118120000_ops_admin_insights` 뒤) → `supabase functions deploy companion-my-story`.
마이그레이션이 먼저다 — 새 Edge가 옛 함수에 `p_region`을 넘기면 함수를 찾지 못한다. 앱이 `p_region`을 싣는 판은 마이그레이션 적용 뒤에 낸다.
