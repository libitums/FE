# @libitums/supabase-functions

Supabase Edge Function 앱이다. 함수는 둘 — `delete-account`와 `send-push`(서버 푸시, 아래 「send-push」 ·
[ADR-0034](../../docs/adr/0034-server-push-notifications.md)). 먼저 `delete-account` — 로그인한 사용자가 자기 계정을 지운다
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
