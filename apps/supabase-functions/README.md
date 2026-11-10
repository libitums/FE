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
| `20261114120000_companion_inspect_docs.sql` | 운영 조회 `companion_inspect_characters()` · `companion_inspect_settings()`(문서 화면) · 덕수쌤 `banmalFeedback: correction` |
| `20261115120000_companion_proactive_prefs.sql` | 선톡 빈도 유저 설정(off · daily1 · daily2) · 선호 시각 · 시간대 · 조용한 시간, 앱 프로필 · 운영자 함수 확장 |
| `20261116120000_companion_feedback_card.sql` | 피드백 고정 카드 — `corrections.card` 열 · `correction_json`(옛 행은 읽을 때 카드로) · `companion_finish_turn` 피드백 저장 |
| `20261117120000_companion_refusal_memory_cap.sql` | 성격대로 거절 — `companion_turn_status` · 페르소나 `refusalLines`, 기억 상한 — `settings.memory_cap` · `shared_memory_cap` · `memories.user_edited` · `companion_add_memories` 지우기 · `companion_list_memories` `{ memories, count, cap, full }` |
| `20261118120000_companion_reply_suggestions.sql` | 추천 답변 칩 — `messages.suggestions` · `profiles.reply_suggestions` 열, `companion_suggest_context` · `companion_save_suggestions`, 앱 프로필 · 운영자 함수 확장 |
| `20261119120000_companion_auto_suggestions.sql` | 추천 답변 칩 자동 — `companion_turn_gate`가 `replySuggestions`를 돌려준다 · 메시지 목록(`message_json`)에 `suggestions` |
| `20261120120000_companion_turn_cost.sql` | 턴 비용 · 지난 대화 — `companion_begin_turn`의 지난 대화를 마지막 요약 뒤 메시지로, 기억 묶음 `settings.memory_every` · `conversations.memory_extracted_until` · `companion_memory_source` · `companion_mark_memories` |

통합 테스트 CF1 ~ CF11 · CH1 ~ CH10 · TV1 ~ TV13 · ID1 ~ ID3 · PP1 ~ PP9 · RM1 ~ RM8 · RS1 ~ RS8 · AS1 ~ AS3 · TC1 ~ TC4, 함수 단위 테스트 CS1 ~ CS32 · SG · CE · BR · LL · EV · FB · SF · RF · SU.

**턴 흐름** — 판정(시험 계정 · 티어 · 연령 · 일시 차단 · 이용 시간 · 멱등) → 시작(체험 · 크레딧 예약 + 유저 메시지 저장, 한 트랜잭션) →
SSE → 입력 검사 · 메인 답변 · 피드백을 동시에 → 위기(`crisis`) · 입력 차단(단계에 따라 성격대로 거절 또는 `guardrail_blocked`, 아래) / 조각(`delta`, 미성년자 · 나이 모름은 출력 검사 뒤) ·
교정(`correction`) → 답 조각이 다 모이면 L1 번역(`translation`)과 칩 스위치가 켜졌으면 추천 답변 칩(`suggestions`)을 남은 기다림과 동시에 → 끝(피드백 · 친밀도 → 말투 · 화제 · 제재 · 예약 확정/해제, 한 트랜잭션) → `state` · `done` → 스트림을 닫고 칩 저장 · 기억 묶음(유저 메시지가 `memory_every`개 모였을 때) · 요약(아래 「턴 비용 · 지난 대화」).

**값을 바꾸는 곳** — 단가 · 체험 수 · 말투 문턱 · 선톡 공백 · 제재 횟수 같은 값(PRD §8 C · O1 ~ O4 초안)은 `companion.settings` 한 행이다.
**피드백 방식 기본값 — 결정: separate (2026-11-09, PRD O5).** 프로필 `feedback_mode`가 비면 `separate`(교정은 따로 오고 답은 고치지 않는다).
SQL 편집기에서 `update companion.settings set trial_limit = 30;`처럼 바꾸면 배포 없이 다음 턴부터 적용된다. `testers_only`가 참이면(기본)
`duru_tester` 계정만 쓴다.

**아직 없는 것** — 선톡 푸시(`send-push`에 컴패니언 목적지 필요 — 메시지는 저장된다) · 성인 턴의 사후 출력 검사 작업 · 의미 검색(pgvector — 임베딩 모델 미정이라 최근 기억을 넣는다) ·
결제(영수증 검증 · 웹 결제 — 결제 작업이 `companion_grant_credits` · `companion_set_entitlement`를 부른다) · 스포일러 게이트(해금 에피소드 밖 서사 차단은 프롬프트 지시만).

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
| `COMPANION_MODEL` | 아니오 | 답변 모델. 기본 `claude-opus-5-5`. `effort: low`, 정책 거절 때 서버 쪽 대체 모델(`fallbacks: "default"`) — `claude-haiku`로 시작하는 모델은 대체 모델이 없어 이 옵션을 빼고 보낸다 |
| `COMPANION_MODERATION_MODEL` | 아니오 | 입력 · 출력 검사 · 기억 추출 · 요약(· 피드백 · 번역 · 칩의 기본값). 기본은 `COMPANION_MODEL` |
| `COMPANION_FEEDBACK_MODEL` | 아니오 | 피드백(교정). 기본은 `COMPANION_MODERATION_MODEL` — 운영(답변 Sonnet · 검사 Haiku)에서는 피드백이 Haiku로 돈다(2026-11-10, 전에는 `COMPANION_MODEL`을 따라 Sonnet). 되돌리려면 이 값을 `claude-sonnet-5-5`로 |
| `COMPANION_TRANSLATION` | 아니오 | 캐릭터 답의 L1 번역. `every`(기본, 턴마다) 또는 `off`. 모르는 값이면 설정 오류(500). PRD O9(매 메시지 · 탭할 때)가 정해지면 바꾼다 |
| `COMPANION_TRANSLATION_MODEL` | 아니오 | L1 번역 모델. 기본은 `COMPANION_MODERATION_MODEL`(운영 Haiku) |
| `COMPANION_SUGGEST_MODEL` | 아니오 | 추천 답변 칩 모델(`chat-send`의 매 턴 칩 · `companion-suggest`). 기본은 `COMPANION_MODERATION_MODEL`(운영 Haiku) |

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

**학습자의 `*…*`** — `*웃으며* 안녕하세요` · `*배고프다…*`처럼 별표 안은 학습자의 행동 · 속마음이다. 답 프롬프트: 행동에는 자연스럽게 반응하고,
속마음은 장면에 맞으면 가볍게 받아도 되지만 엿들은 것처럼 그대로 되풀이하지 않는다. 검사는 별표 안까지 전체를 본다. 저장 글은 친 그대로다.

**선톡 빈도 — 유저 설정(20261115).** 프로필 `proactive_pref` off · daily1(기본) · daily2, `proactive_hour`(현지 0 ~ 23, null이면 아무 때나), `timezone`(IANA).
판정은 `companion.proactive_skip_reason` 하나(이유 off · quiet_hours · hour · daily_cap · gap · spacing):

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
- 플레이그라운드 `force`는 빈도 판정을 모두(off 포함) 건너뛴다. 연령 · 지역 규칙은 건너뛰지 않는다.
- 앱: `companion_save_profile(p_birth_year, p_age_source, p_l1, p_feedback_mode, p_proactive_pref = null, p_proactive_hour = null, p_timezone = null)` —
  null은 그대로, `p_proactive_hour = -1`은 지우기(아무 때나), `p_timezone = ''`은 지우기, 틀린 값(모르는 시간대 포함)은 22023. 옛 4인수 호출은 그대로 된다.
  `companion_load_profile()`이 `proactivePref` · `proactiveHour` · `timezone`을 더 돌려준다(계약 `companion-profile`).
- 운영: `companion_operator_set_profile(p_user_id, p_birth_year, p_clear_age, p_l1, p_feedback_mode, p_region, p_proactive_pref = null, p_proactive_hour = null,
  p_timezone = null)` — 지우기 규칙은 앱과 같다. 옛 6인수 호출은 그대로 된다. `companion_inspect_testers()`가 세 값을 보여 준다.

### companion-eval — LLM 한 단계 평가

ops-dashboard가 검사 · 피드백 프롬프트를 케이스 묶음으로 돌려 보는 창구다. 운영과 같은 `moderate()` · `feedback()`(같은 프롬프트 · 요청 모양)을
부르고, **DB에 쓰지 않고 크레딧도 쓰지 않는다.** 대신 케이스 하나마다 실제 Claude API 호출이라 **API 비용이 든다**(`COMPANION_LLM=fake`면 들지 않는다).
서버 키(`Authorization: Bearer <서버 키>`, `isServiceKey` 규칙)만 받고, 아니면 401 `{"error":"invalid_session"}`.

- `GET` → `{"models":{"reply","feedback","moderation"},"allowed":["claude-haiku-5-5","claude-sonnet-5-5","claude-opus-5-5"],"llm":"anthropic"|"fake"}`
- `POST {"kind":"moderation"|"feedback"|"translation"|"suggestions","model"?,"cases":[{"id","text","ageBand"?,"layer"?,"l1"?,"context"?,"speechLevel"?,"character"?}]}` — 케이스 1 ~ 20개, `text` ≤ 2000자,
  `id` ≤ 64자. `model`은 `allowed` 안에서만(생략하면 그 단계에 설정된 모델). 기본값 `ageBand` adult · `layer` input · `l1` null. `context`는
  검사에서는 앞선 유저 메시지(출력 검사), 피드백에서는 바로 앞 캐릭터 말이다. 피드백 케이스는 `speechLevel`(polite · casual · slang, 생략하면 모름 —
  말투 선택 규칙을 건너뛴다)과 `character`(`{"name","role"?}`)를 더 받는다. `translation` 케이스는 한국어 한 줄 `text`와 `l1`(생략하면 en)을 받아
  `output: {"text"}`를 돌려준다(운영은 말풍선 묶음을 한 번에 번역한다).
  평가 때 볼 것: 한국어 · 영어가 섞인 입력은 `l1_to_ko` 하나(이유 설명 없음)로, 존댓말 관계의 반말은 `better`로, 반말 관계의 존댓말과 자연스러운 문장은 `none`으로 나와야 한다.
- 피드백 케이스는 `history`(`[{"role":"user"|"assistant","text"}]`, 오래된 것부터, 최대 20 — 운영처럼 마지막 6개만 쓴다)도 받는다. `context`는 계속
  앞 캐릭터 말 한 줄이고, `history`가 있으면 그쪽이 맥락이다.
- 응답 `{"kind","model","results":[{"id","ok":true,"output","ms"} | {"id","ok":false,"error","ms"}]}` — `output`은 판정 `{category, action}` 또는
  피드백 카드(위 「피드백 카드」) 또는 `{text}`. 동시에 4개씩, 케이스마다 턴 경로와 같은 제한 시간(검사 45초 · 피드백 8초 · 번역 6초 — 넘으면 `error: "timeout"`).
  케이스 하나의 실패는 그 케이스만 `ok: false`(`timeout` · `structured_unavailable` · `mismatch` · `upstream_<상태>` · `upstream_error`). 본문이 틀리면 400 `invalid_request`.
- `GET ?docs=1` → ops-dashboard 「문서」 화면: `{"models"(번역 모델 포함),"characters","settings","inspectAvailable","prompts"}`. `characters`는 페르소나 카드 칸 전부 ·
  `id` · `active` · `sortOrder` · `maxSpeechLevel` · `systemPrompt`(말투 상한까지 단계마다), `settings`는 `companion.settings` 한 행. `prompts`는
  `feedback` · `moderation.{input,output_sync}.{adult,minor,unknown}` · `translation` · `memory.{adult,minor}` · `summary` · `proactiveDirective` ·
  `feedbackModes.{separate,natural,prefix}` · `stateLine` — 실제 호출과 같은 함수로 그린 글이다(사본 없음, `_shared/companion-eval-docs.ts`). 대표 입력은
  학습자 언어 en · 성인 · 기억 · 학습 표현 · 요약 없음 · 피드백 방식 separate, 피드백은 존댓말 관계 · 부드러운 반말 규칙으로 그리고, 호출마다 바뀌는 자리는
  `{{l1}}`처럼 표시한다. 마이그레이션 20261114를 적용하기 전에는 `characters` · `settings`가 null이고 `inspectAvailable: false`다. API 비용은 들지 않는다.
- 배포: `supabase functions deploy companion-eval`(`config.toml`의 `verify_jwt = false`를 따른다). 비밀은 `chat-send`와 같다.

### 추천 답변 칩 — chat-send 매 턴 자동 · companion-suggest 다시 만들기

학습자가 탭해서 보낼 다음 말 셋(이어 가기 `continue` · 되묻기 `ask` · 짧은 리액션 `react`). **Zeta처럼 유저가 켜고 끄는 스위치**(프로필 `reply_suggestions`,
기본 참)이고, **켜져 있으면 캐릭터 답마다 탭 없이 칩이 뜬다**(20261119). 호출 한 번(`COMPANION_SUGGEST_MODEL`, 기본 검사 모델)이 턴마다 들고,
**크레딧을 차감하지 않는다**(차감 · 하루 상한은 열린 질문).

**chat-send 자동 칩** — 판정(`companion_turn_gate`)의 `replySuggestions`가 참이면 답 조각이 다 모인 뒤 번역과 같이 시작해 남은 기다림(피드백 · 미성년자
출력 검사 · 번역)과 동시에 돌린다(`_shared/chat-send-suggest.ts`, 만들기는 `companion-suggest`와 같은 `_shared/companion-suggest-generate.ts`).
- 이벤트: `translation` 뒤 · `state` 앞에 한 번 `suggestions {"messageId","status":"ok"|"unavailable","items":[{"text","meaning","intent"}],"reason"?}`.
  `ok`면 칩 셋(continue · ask · react 순서), `unavailable`이면 빈 `items`와 `reason` — `generation_failed`(다시 물어도 실패 · 시간 초과) · `blocked`(미성년자 ·
  나이 모름의 출력 검사). 앱은 `unavailable`이면 `companion-suggest`로 대신 받는다.
- 보내지 않는 때: 스위치가 꺼짐 · 판정이 스위치를 모름(20261119 전 DB) · 위기 · 입력 차단(`guardrail_blocked`) · 성격대로 거절 · 출력 차단 · 답 실패. 앱은 스위치를
  켰는데 이벤트가 없으면 `companion-suggest`를 부른다(저장된 칩이 있으면 그대로, 없으면 만든다).
- 맥락: 턴이 이미 읽은 대화 + 이번 유저 말 + 새 답을 `companion-suggest`와 같은 모양(최근 6개 · 한 줄 500자 · 번역 없음)으로. 관계 말투는 턴 시작 때 값.
- 제한 시간 6초(다시 묻기 · 출력 검사 포함 — 다시 묻기는 2초 이상 남았을 때만). 실패해도 턴은 끝나고 로그(`suggestions_unavailable`)와 meta(`suggestions`)에 남는다.
- 저장: `ok`면 스트림을 닫은 뒤 `companion_save_suggestions`로 그 캐릭터 메시지의 `messages.suggestions`에(`companion-suggest`의 캐시와 같은 `{items, model,
  createdAt, playground?}`). 끝(finish) 트랜잭션이 메시지를 만든 뒤에야 붙일 수 있어 `done`을 늦추지 않게 닫은 뒤 한다 — 저장 실패는 로그(`suggestions_save_failed`)만.
  메시지 목록(`companion_list_messages`)의 캐릭터 메시지에 `suggestions`(칩 셋, 없으면 null)로 다시 온다.
- 늘어나는 지연: 번역과 겹쳐 돌아 `state` · `done`이 늦어지는 것은 둘 중 긴 쪽만큼 — 칩이 번역보다 늦으면 그 차이, 최악 6초(칩 제한 시간)다.

**companion-suggest** — 「다시 만들기」(`refresh: true`)와 자동 칩이 `unavailable`이었거나 오지 않은 턴의 대체 경로. 같은 메시지에 저장된 칩(자동으로 만든 것 포함)이
있으면 모델을 부르지 않고 돌려준다.

- 호출자: 앱은 `Authorization: Bearer <JWT>` + `{"character_id","refresh"?}`. ops-dashboard 플레이그라운드는 `Bearer <서버 키>`(`isServiceKey` 규칙) +
  `{"user_id","character_id","refresh"?}` — 앱 토큰으로 `user_id`를 보내면 401. 계약은 `companion-suggest-request` · `companion-suggest-response`(JSON Schema).
- 응답(200) `{"status":"ok"|"none"|"unavailable","messageId","items":[{"text","meaning","intent"}],"cached","reason"?}` — `ok`면 칩이 정확히 셋(continue · ask · react
  순서), `meaning`은 학습자 언어(한국어면 null). `messageId`는 칩이 묶인 마지막 캐릭터 메시지다.
  - `none`(모델 안 부름): `no_assistant_message` · `latest_turn_blocked` · `latest_turn_crisis` · `latest_turn_refusal`(메시지 `meta.refusal`) · `suggestions_off`(프로필).
  - `unavailable`: `chat-send`와 같은 판정(`companion_turn_gate`)에 걸림 — `not_available` · `age_restricted` · `temporarily_blocked` · `usage_time_limit` · `turn_in_progress`,
    또는 `generation_failed`(구조화 출력이 깨지거나 검사를 못 지나면 한 번 다시 묻고 그래도 실패 · 시간 초과 8초 · 출력 검사 실패) · `blocked`(미성년자 · 나이 모름의 출력 검사).
  - HTTP 오류: 400 `invalid_request` · 401 `invalid_session` · 404 `character_not_found` · 405 · 500 `server_misconfigured` · `internal_error`.
- 캐시: 만든 칩은 마지막 캐릭터 메시지의 `messages.suggestions`(`{items, model, createdAt, playground?}`)에 저장하고, 다시 누르면 그대로(`cached: true`) 돌려준다.
  새 턴이 오면 마지막 메시지가 바뀌어 저절로 무효다. `refresh: true`면 새로 만든다.
- 맥락: 페르소나 이름 · 역할, 관계 말투, 학습자 언어, 최근 6개(피드백과 같은 모양 — 한 줄 500자 · 번역 없음). 프롬프트는 `suggestionSystem`(고정 글,
  `?docs=1`의 `prompts.suggestions`) + user 쪽 맥락. 칩 검사(`suggestionsFrom`): 몫마다 하나 · 한글 · 80자 이하 · `*행동*` 없음 · 셋이 다름 · 뜻 있음.
- 설정: 프로필 `reply_suggestions`(기본 참). 앱 `companion_save_profile(…, p_reply_suggestions = null)` · `companion_load_profile().replySuggestions`, 운영
  `companion_operator_set_profile(…, p_reply_suggestions = null)` · `companion_inspect_testers().replySuggestions`. 옛 인수만 쓰는 호출은 그대로 된다.
- 평가: `companion-eval`의 `kind: "suggestions"` — 케이스 `text`는 캐릭터의 마지막 말(`history` 뒤에 붙는다), `output: {"items"}`, 검사를 못 지나면 `mismatch`.
- 배포: `supabase functions deploy companion-suggest`(`verify_jwt = false`). 마이그레이션 20261118을 먼저 적용한다.

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
3. 비밀: `supabase secrets set --env-file supabase/functions/.env`. 키가 아직 없으면 `COMPANION_LLM=fake`로 화면만 먼저 본다.
4. `supabase functions deploy chat-send` · `supabase functions deploy companion-proactive` · `supabase functions deploy companion-eval`(`config.toml`의 `verify_jwt = false`를 따른다).
5. 예약 작업: Vault에 서버 키(`companion_service_role_key`)를 넣고 `supabase/cron/companion.sql`을 SQL 편집기에서 한 번 실행한다.
6. 학습 표현: `node devtools/companion-expressions/build.mjs --base <버킷 주소> --out /tmp/expr`로 만든 `sync-expressions.sql`을 SQL 편집기에서 한 번 실행한다.
7. 시험 계정에 `duru_tester`를 켜고 플레이그라운드에서 정상 · 위기 · 차단 · 크레딧 턴을 한 번씩 돌린다.

되돌리기: 함수는 `supabase functions delete chat-send` · `companion-proactive` · `companion-eval`, 예약은 `select cron.unschedule('companion-…')`.
표 · 함수는 `drop schema companion cascade` 뒤 `public.companion_*` 함수를 지운다(다른 기능이 쓰지 않는다).
