# @libitums/supabase-functions

Supabase Edge Function 앱이다. 지금은 `delete-account` 하나 — 로그인한 사용자가 자기 계정을 지운다
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

### 2. 프로젝트 연결과 시크릿

```sh
cd apps/supabase-functions
supabase link --project-ref <프로젝트 ref>

supabase secrets set \
  APPLE_TEAM_ID=<팀 ID> \
  APPLE_KEY_ID=<키 ID> \
  APPLE_CLIENT_ID=com.libitum.host \
  APPLE_PRIVATE_KEY="$(cat /안전한/경로/AuthKey_XXXXXXXXXX.p8)"
```

`SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`는 Edge 런타임이 기본 제공하므로 따로
설정하지 않는다. 이 셋이 하나라도 비면 함수는 모든 요청에 500 `server_misconfigured`를 낸다. Apple 넷이
하나라도 비면 Apple 사용자만 500이고 그 밖 사용자는 삭제할 수 있다.

**레거시 키.** 함수는 레거시 `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`를 읽는다. 2026-09-30 기준 이
프로젝트는 레거시 anon 키가 켜져 있어 런타임이 두 값을 주입한다. Supabase는 레거시 키를 2026년 말까지 유지한다.
레거시 키를 끄면 함수가 새 키(`SUPABASE_PUBLISHABLE_KEYS` · `SUPABASE_SECRET_KEYS` — 이름별 JSON)를 읽도록 코드를
바꿔야 한다(후속 작업). `SUPABASE_` 접두 이름은 시크릿으로 직접 넣을 수 없으니 이름을 덮어쓰는 우회는 없다.
배포 뒤 `delete-account`가 500 `server_misconfigured`나 401 `invalid_session`을 내면 이 항목부터 확인한다.

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
성공은 204. 오류는 `{"error": "<code>"}`이고 CORS 헤더는 없다(호출자는 앱의 네이티브 fetch뿐).
바깥 호출마다 제한 시간 10초, 재시도 없음. 로그는 요청당 한 줄(`event` · `status` · `error`)이고
토큰 · 코드 · 사용자 ID · 이메일은 싣지 않는다.
