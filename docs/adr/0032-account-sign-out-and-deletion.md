# ADR-0032 — 로그아웃과 계정 삭제 (서버 함수 앱 · 삭제 순서 · Apple 철회 · 뒤처리 · App 세션 재시작)

- 상태: **제안** — 구현과 `pnpm verify` 안의 계층(unit · ui · integration)은 끝났다. ⚠ 함수 배포 · Apple 키
  발급이 사용자 몫이라 **실서버 삭제가 한 번도 돌지 않았고**, 사용자 확인 항목이 남았다(아래 「확인 필요」).
  둘이 풀리기 전까지 `채택`으로 올리지 않는다.
- 날짜: 2026-09-30
- 다루는 축: **계정 수명 (로그아웃 · 삭제)** (새 축 — 인증 축의 ADR-0027 · 0028은 들어오는 길만 정했고,
  나가는 길과 계정을 지우는 일은 어느 ADR의 `다루는 축`도 덮지 않는다)
- 적용 기록(결정을 바꾸지 않는다):
  [ADR-0007](0007-app-internals-state-routing-data-errors.md) — D1(키를 **지우는 때**가 생겼다) · D2(요청 둘) ·
  **D3의 열린 질문 「진입 구간으로 되돌아가기」를 닫는다**(D6 — `NavAction` 불변) · D5(새 옵셔널 0).
  [ADR-0004](0004-package-boundaries-and-dependency-direction.md) D1 · D2 — 서버 함수는 `apps/`의 잎이다(D1).
  [ADR-0002](0002-app-roster-and-lynx-bundle-boundary.md) D4 — 이름은 타깃(`supabase-functions`).
  [ADR-0006](0006-command-interface-and-test-layers.md) D1 · D2 — 루트 사슬 셋에 `--filter` 하나씩.
  [ADR-0027](0027-phone-otp-auth-supabase.md) · [ADR-0028](0028-social-oauth-web-authentication.md) — 「로그아웃이
  없다」 대가와 재검토 조건이 발동했다. ADR-0028 D7의 호스트 페이로드에 키 하나가 더해졌다(D4).
  [ADR-0029](0029-product-analytics-posthog.md) D8 · D12 — `reset`을 부르는 자리와 대기열을 버리는 때가 생겼다(D7).
  [ADR-0031](0031-ui-language-catalog.md) D4 — 언어 키는 로그아웃 · 삭제에도 **지우지 않는다**.
  [ADR-0017](0017-host-native-capabilities-and-audio.md) D2 — 모듈 · 메서드 수 불변, 트리거 없음.

**왜 새 번호인가** — 없던 축을 처음 정한다(ADR-0010 D10). 그리고 이 회차의 계약은 `.agent-harness/`(추적 제외)에
있어 저장소에 남지 않는다 — 근거와 함수의 HTTP 계약이 남을 자리가 여기다(ADR-0027이 같은 이유를 적었다).

## 맥락

- 로그아웃 · 삭제 코드가 0이었다. 세션을 지우는 곳은 부팅 갱신을 서버가 **거절**했을 때 하나였고, 진입 흐름을
  다시 보려면 **재설치가 유일**했다(ADR-0007 2026-09-17 기록 · 진입 흐름 스펙 §4의 ⭐ 대가).
- App Store 심사 지침 5.1.1(v)이 **계정을 만들 수 있는 앱에 앱 안 계정 삭제**를 요구하고, Sign in with Apple을
  쓰는 앱은 삭제 때 **Apple 토큰 철회**(`/auth/revoke`)를 요구한다. 철회에는 Apple 키(.p8)로 서명한 client secret이
  필요해 **앱 안에서 할 수 없다** — 서버 코드가 처음 필요해졌다. 사용자 결정(U1)이 그 자리를 **FE 모노레포 안**으로 정했다.
- 세션은 `{ accessToken, refreshToken, expiresAt }`뿐이고 사용자 ID · 제공자가 없다. 액세스 토큰은 **부팅 때만**
  갱신된다 — 앱을 한 시간 넘게 켜 두면 손에 든 토큰이 만료된다.
- 여정 진행 · 알림 · 세션 옵션 · 젬 · 겹침 레이어는 App의 `useState`에만 산다. 스택만 진입 구간으로 돌리면 같은
  실행의 다음 사람이 앞사람의 진행을 본다.
- `PostHogCore.reset()`은 대기열을 **남기고** 등록 속성을 **지운다** — reset만 부르면 떠난 사용자의 이벤트가
  나가고 `environment` 속성(ADR-0029 D13)이 빠진다.
- Supabase `POST /auth/v1/logout`의 기본 `scope`는 `global`(그 사용자의 모든 기기 세션)이다.

## 결정

### D1. 서버 코드는 `apps/supabase-functions` — 함수 하나 `delete-account`

- 워크스페이스 패키지 `@libitums/supabase-functions`(private). 로직은 `supabase/functions/_shared/`의 **런타임 중립
  TypeScript**(`fetch` · `Request` · `Response` · `AbortSignal.timeout` · WebCrypto · `TextEncoder`만), Deno 진입은
  `supabase/functions/delete-account/index.ts` 하나(환경을 읽어 핸들러에 넘기는 것이 전부). 같은 코드가 Node(vitest · tsc)와
  Deno(배포)에서 돈다. `tsconfig`의 `types: []`라 Node 전역을 쓰면 `tsc`가 막는다.
- **`apps/`인 이유** — ADR-0004 D1: 배포 산출물(Supabase CLI가 번들하는 Edge Function)을 내고 **아무도 import하지
  않는 잎**이다. D2: 두 번째 소비자가 없어 `packages/`가 아니다. 이름은 ADR-0002 D4대로 **타깃**(Supabase Edge
  Functions)이다. 요구사항 D1의 `packages/account-functions`에서 바꿨다(「확인 필요」 1).
- **앱과 코드를 나누지 않는다.** 요청 본문 모양(`{ apple_authorization_code: string | null }`)은 양쪽 계약 파일에
  **같은 모양을 따로 적는다** — `apps/* → apps/*` import 금지(ADR-0004 D4)이고, 타입 하나로 패키지를 여는 것은 D2
  조건 미달이다.
- import는 Deno 규칙대로 **`.ts` 확장자**를 붙인다(`allowImportingTsExtensions`). `_shared/` 밖을 import하지 않는다 —
  `supabase/functions` 밖은 CLI 번들링이 버전마다 달라 확실한 쪽을 골랐다. npm · jsr 의존 0, `deno.json` 없음.
- 검증은 루트 `typecheck` · `test:unit` · `test:integration` 사슬에 `--filter` 하나씩(ADR-0006 D2). CI 워크플로는
  잎 명령 이름이 같아 **diff 0**. Deno는 CI에 없다 — `deno-runtime.d.ts`의 최소 선언을 `tsc`가 대신 본다.
- 배포 · 시크릿 · 로컬 실행 절차는 [`apps/supabase-functions/README.md`](../../apps/supabase-functions/README.md)가 진다.

### D2. 함수의 HTTP 계약과 판정 순서

`POST {SUPABASE_URL}/functions/v1/delete-account` · `Authorization: Bearer <사용자 액세스 토큰>` · `apikey`(게이트웨이
통과용, 함수는 읽지 않는다) · 본문 `{"apple_authorization_code": "…" | null}`. 타입의 정본은
`_shared/delete-account.contract.ts`다.

| 순서 | 판정 | 결말 |
|---:|---|---|
| 1 | 메서드가 `POST`가 아님 | 405 `method_not_allowed` + `Allow: POST` |
| 2 | 환경(`SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`)이 없음 | 500 `server_misconfigured` |
| 3 | Bearer 없음 | 401 `missing_authorization` |
| 4 | `GET /auth/v1/user`(anon 키 + 사용자 토큰)가 4xx / 5xx · 연결 실패 · 파싱 실패 | 401 `invalid_session` / 502 `auth_unavailable` |
| 5 | 본문 모양이 아님 | 400 `invalid_body` |
| 6–8 | Apple 사용자인데 Apple 환경 없음 / 코드 `null` / client secret 서명 실패 | 500 / 400 `apple_authorization_code_required` / 500 |
| 9 | 코드 교환이 200 아님 · `refresh_token` 없음 | 502 `apple_exchange_failed` |
| 10 | 교환의 `id_token.sub`가 사용자의 Apple identity와 다름 | **403 `apple_account_mismatch`**(철회 · 삭제 안 함) |
| 11 | 철회가 200 아님 | 502 `apple_revoke_failed` |
| 12 | admin 삭제(`DELETE /auth/v1/admin/users/{id}`, service role)가 2xx · 404 아님 | 500 `delete_failed` |
| 13 | 성공 | **204** |

- **토큰 검증(401)이 본문 검사(400)보다 앞선다.** Apple 사용자가 아니면 6~11을 건너뛰고 코드가 와도 Apple을 부르지 않는다.
- **Apple 판별은 서버가 한다** — `/auth/v1/user`의 `identities[]`에 `provider = "apple"`이 있으면 Apple 사용자다.
- **Apple 철회가 실패하면 삭제하지 않는다**(502). Apple 쪽 연결이 남은 채 계정만 지워지는 상태를 만들지 않는다.
- **10의 대조**는 다른 Apple ID의 코드로 **남의 토큰을 철회하고 내 토큰은 남기는** 경로를 막는다(「확인 필요」 3).
- client secret은 ES256 JWT를 **WebCrypto**로 요청마다 만든다(서명은 64바이트 P1363 그대로 base64url, 캐시 없음).
- 바깥 호출마다 제한 시간 10초 · 재시도 없음(앱이 다시 시도한다). 오류 본문 `{"error": "<code>"}`, **CORS 없음**
  (호출자는 앱의 네이티브 fetch뿐). 로그는 요청당 한 줄(`event` · `status` · `error`) — **토큰 · 코드 · 사용자 ID ·
  이메일을 싣지 않는다.**
- 진행 기록 등 앱 데이터는 DB의 CASCADE(`app_user.auth_user_id → auth.users`)가 지운다 — 함수가 테이블을 모른다.
- **`verify_jwt = false`**(`supabase/config.toml`). 게이트웨이 JWT 검증은 새 비대칭 키 체계와 맞지 않을 수 있어
  끄고, 함수가 3 · 4로 스스로 검증한다.

### D3. 시크릿

읽는 환경은 일곱이다 — 런타임 기본 셋(`SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`)과
`supabase secrets set`으로 넣는 Apple 넷(`APPLE_TEAM_ID` · `APPLE_KEY_ID` · `APPLE_CLIENT_ID` = `com.libitum.host` ·
`APPLE_PRIVATE_KEY` = `.p8` 내용). 사용자 조회는 **최소 권한(anon)**, 삭제만 service role이다. Apple 넷이 비면
**Apple 사용자만** 500이고 그 밖 사용자는 지울 수 있다. 시크릿 · `.p8`은 저장소에 두지 않는다.

### D4. 앱 쪽 삭제 흐름 — 갱신 · 재인증 · 요청

`lib/account-deletion.ts`의 `deleteAccount(session, persistRefreshedSession)`. 거부하지 않고 결과(`deleted` ·
`cancelled` · `failed(reason)`)를 돌려준다. 저장소 · 분석 · 전이는 하지 않는다(결선의 몫, D5).

1. 접속 값이 없으면 `failed/unconfigured`(요청 0 · 시트 0).
2. **`expiresAt - now ≤ 60초`이면 먼저 갱신**하고 새 세션을 **저장**한다 — refresh 토큰이 회전하므로 저장하지
   않으면 다음 부팅이 로그아웃된다. 갱신이 거절되면 `session-expired`.
3. 액세스 토큰(JWT)의 `app_metadata.providers`(배열) ∪ `app_metadata.provider`에 `apple`이 있으면 **Apple 재인증** —
   같은 `AppleSignInModule.start`로 시트를 다시 받아 `authorizationCode`만 쓴다(ID 토큰 · nonce 원본은 버린다).
   `provider` 하나만 보지 않는 이유: 그것은 **처음** 가입한 제공자라 나중에 연결된 Apple을 놓친다. 시트 취소 →
   `cancelled`(요청 0), 그 밖 → `apple-unconfirmed`.
4. `lib/api-client.ts`의 `requestAccountDeletion` — 2xx → `deleted`, 401 → `session-expired`, 403 → `apple-unconfirmed`,
   그 밖 → `unavailable`, 연결 실패 → `network`. 본문은 읽지 않는다(게이트웨이가 직접 낸 오류도 같은 규칙).

**코드는 로그인 때 받아 두지 않는다** — Apple의 `authorizationCode`는 5분짜리 일회용이고, 보관하면 저장 항목이
늘어 ADR-0007 D1에 걸린다. 삭제 확인 뒤 시트를 한 번 더 받는다.

**호스트 페이로드**(ADR-0028 D7에 더함): `AppleSignInModule`이 `authorizationCode`를 **비지 않은 UTF-8일 때만**
세 번째 키로 싣는다. JS `completed`는 `authorizationCode: string | null`이고 없으면 `null`이지 `malformed`가 아니다 —
옛 호스트 빌드와 섞여도 로그인이 깨지지 않는다. 로그인 경로는 이 값을 읽지 않는다. 메서드 · 인자 · 스코프 ·
엔타이틀먼트는 불변(ADR-0017 D2 트리거 없음).

### D5. 로그아웃 — `scope=local`, 기다리지 않는다

`POST /auth/v1/logout?scope=local`을 **시작만 하고 기다리지 않는다** — 뒤처리(D6)가 곧장 선다. 대기 상한은 0이고
로그아웃에는 진행 · 실패 상태가 없다.

- `global`은 그 사용자의 **다른 기기**까지 끊는다 — 이 기기에서 나간다는 뜻과 다르다.
- 기다리면 오프라인에서 제한 시간(10초)만큼 스피너가 선다. 서버 요청이 실패해도 기기에서는 세션이 이미 지워져
  쓸 수 없다 — 서버에 남는 refresh 토큰은 만료를 기다린다(대가).

### D6. 뒤처리와 App 세션 재시작 — ADR-0007 D3 열린 질문의 답

로그아웃과 삭제 성공(`deleted`)은 같은 뒤처리를 탄다(`app/account-wiring.ts`). **순서가 계약이다.**

1. **세션 삭제** — `libitum.auth.session`을 지운다.
2. **분석 reset**(D7) — 던져도 뒤처리는 계속한다.
3. **`entry_screen_viewed { screen: "login" }`** — 새 이벤트가 아니라 갱신 거절 경로가 이미 내는 이벤트다. reset
   **뒤**라 떠난 사용자의 ID가 아니라 새 익명 ID로 나간다.
4. **App 세션 재시작** — 바깥 `App`(`app/App.tsx`)은 `AppStart`(key · 첫 `Nav`) **하나만** 쥐고, 결선이
   `onLeaveApp`을 부르면 `nextAppStart`로 key를 올린다. 몸통 `AppSession`(`app/AppSession.tsx`)이 언마운트 ·
   마운트되어 **모든 App 상태가 처음 값**이 되고, 첫 `Nav`는 `signedOutNav` = `entry: [온보딩, 로그인]` · 탭 스택
   루트 · 탭 `journey`다.

- **`NavAction`을 더하지 않는다.** 「진입 구간으로 되돌아가기」는 스택 전이가 아니라 **App 세션을 새로 세우는
  것**이다. 스택만 돌리면 D6 맥락의 `useState` 상태(진행 · 알림 · 옵션 · 젬 · 겹침 레이어)가 다음 사람에게 샌다.
  리듀서 · `enterApp`의 단방향 · `backToRoot`의 `entry` 분기(여전히 호출자 0)는 그대로다.
- 로그인의 뒤로가기는 `back`으로 온보딩에 닿는다 — 갱신 거절 경로(`replace` + `push`)가 세우는 것과 같은 스택이다.
- **다시 켜면 새 설치와 같은 부팅**(스플래시 → 온보딩)이다. 「온보딩을 봤다」를 저장하지 않는다 — ADR-0007 D1의
  새 예외가 되기 때문이다(루트 판정 2026-09-30, 요구사항의 「로그인 화면」을 「세션 없는 부팅」으로 읽었다).
- 삭제가 `cancelled` · `failed`면 세션 · 분석 · 이벤트 · 전이 0 — 계정도 세션도 그대로다. 삭제 전 갱신이
  성공했으면 새 세션은 이미 저장돼 있다.

**저장소**(ADR-0007 D1 — 새 키 0):

| 키 | 로그아웃 | 삭제 |
|---|---|---|
| `libitum.auth.session` | 지움 | 지움 |
| `analytics.queue` | 그대로(이미 쌓인 이벤트는 보낸다) | **지움** |
| `libitum.ui.language` | 그대로 | 그대로 |
| `libitum.learning-item-guides.seen` ⟨2026-10-09 — 적용 기록⟩ | 그대로 | 그대로 |

언어는 사용자 설정이지 계정 데이터가 아니다 — 같은 기기의 다음 사람도 같은 UI 언어로 온보딩을 본다
(ADR-0031 D4 재검토 조건의 판정).

⟨2026-10-09 — 적용 기록, 새 결정 아님⟩ 표의 넷째 줄은 학습 문항 안내를 본 기록이다
([ADR-0054](0054-learning-item-guides.md) D3). 계정이 아니라 **기기**의 표시로 뒀다 — 그래서 같은 기기의 다음 사람은
그 안내를 보지 못한다. **계정으로 가르지 않는 것은 사용자가 답한 결정이 아니라 root의 기본값이다**(보고됨).
로그아웃 뒤에도 기록이 남는 것은 integration 테스트와 Android 에뮬레이터 한 대(세션을 다시 심는 대체 경로 — 소셜
로그인 왕복은 아니다)에서 봤다. **계정 삭제 뒤는 따로 실행해 보지 않았다** — 삭제 경로에 이 키를 지우는 코드가
없다는 것까지다 [코드]. 위의 「새 키 0」은 이 결정을 적은 날의 서술이고, 이 표는 그 뒤에 선 다른 키(ADR-0035 ·
ADR-0036의 것)를 싣지 않는다 — 이번에 채우지 않았다.

### D7. 분석 — `AnalyticsSession`의 `identify` 자리가 `user`가 된다

- `AnalyticsSession = { sinks, user: AnalyticsUser | null }`, `AnalyticsUser = { identify, reset(scope) }`
  (`lib/analytics-user.contract.ts`). 둘은 같은 클라이언트의 동작이라 함께 있거나 함께 없다.
- reset 범위 둘 — 로그아웃 `identity`, 삭제 `identity-and-queue`. 순서는 **대기열 버리기 → `reset()` →
  `register({ environment })` 다시 걸기**. 버리기를 먼저 둬 reset 중 flush가 옛 대기열을 보내는 창을 없앤다.
  대기열은 `posthog-client.ts`(background 전용)의 `discardQueue`만 만진다 — 결선이 키를 직접 지우지 않는다
  (ADR-0029 D3: 결선이 그 모듈을 import하면 SDK가 메인 스레드 번들에 든다).
- **새 이벤트 0 · 새 속성 0.** PostHog의 person 데이터 삭제는 범위 밖이다 — 삭제된 사용자의 과거 이벤트는
  PostHog에 남는다(「확인 필요」 4).

### D8. 설정 화면 — 「Account actions」 묶음과 확인 대화상자

- 설정 목록 끝에 셋째 `SettingsGroup`(이름 `Account actions` — 테스트 손잡이이고 VoiceOver는 읽지 않는다. 다른 두 묶음과
  같다)에 navigation 셀 둘 — `Sign out` · `Delete account`.
- 확인 대화상자는 ui-lynx `Dialog` 그대로 — 로그아웃 `Sign out?` · [`Sign out`, `Stay signed in`], 삭제
  `Delete your account?` + 되돌릴 수 없다는 설명 · [`Delete account`, `Keep account`]. **확인이 첫 액션(brand) ·
  취소가 둘째(subtle)** — 앱의 다른 확인 대화상자와 규칙 하나. **파괴 전용 색 · 새 토큰 0** — 파괴성은 제목 ·
  설명 · 결과를 말하는 라벨이 진다.
- 삭제 진행은 **대화상자가 선 채** 확인 액션 로딩 · 취소 비활성이고, Apple 시트는 그 위에 뜬다. 시트 취소면
  로딩 전으로 돌아간다(문구 0). 실패면 대화상자를 닫고 **묶음 아래 문구 + `announce` 1회** — 연결 실패
  (`network`)와 그 밖 넷의 문구 둘. 낭독은 대화상자가 닫힌 화면이 반영된 **뒤**(effect)에 낸다 — 같은 갱신에서
  보내면 레이아웃 변경 알림이 끊는다.
- 떠난 뒤 새 세션은 결과를 **한 번 낭독**한다(`You're signed out.` · `Your account was deleted.`) — 화면이 통째로
  바뀌어 달리 알 길이 없다. 떠난 이유는 `AppStart.exit`이 새 세션에 넘긴다.
- **ui-lynx `Dialog` 규칙 완화** — 「상호작용 가능 액션 ≥ 1」이 「누를 수 있거나 **로딩 중인** 액션 ≥ 1」이 되고,
  로딩 중인 액션이 있으면 `cancelActionId = null`(`data-cancelactionid` 없음 — 뒤로가기 · ESC를 연결할 호스트가 쓸
  취소 경로가 없다). 지금 iOS 호스트는 이 속성을 읽지 않아 취소는 취소 버튼뿐이다. 기존 소비처는 로딩 액션이 없어 동작 불변. 문면은 `packages/ui-lynx/README.md`의 Dialog 절이 진다.
- 화면 계약(props · 상태 기계 · 문구 · testid)은 [설정 스펙](../specs/settings.md) §9가 진다.

## 버린 대안

- **`packages/account-functions`**(요구사항의 자리) — 아무도 import하지 않는 배포 산출물이 `packages/`에 들면
  ADR-0004 D1의 구분(「import되는 것」)이 깨지고, D2의 두 번째 소비자 조건도 없다.
- **FE 밖 서버 저장소 · BE에 맡기기** — 사용자 결정 U1이 FE 모노레포로 정했다.
- **로그인 때 Apple `authorizationCode`를 받아 보관** — 5분짜리 일회용이고, 저장 항목이 늘어 ADR-0007 D1에 걸린다.
  삭제 확인 뒤 시트를 한 번 더 받는 비용(Face ID 한 번)을 고른다.
- **로그아웃 `scope=global`** — 이 기기에서 나가는 동작이 다른 기기까지 끊는다.
- **로그아웃 응답을 기다림** — 오프라인에서 10초 스피너. 기기에서는 어차피 세션을 지운다.
- **새 `NavAction`(`leaveApp` · `resetToEntry`)으로 스택만 되돌림** — App의 `useState` 상태가 다음 사람에게 샌다.
  그것을 막으려고 상태마다 초기화를 적으면 새 상태가 생길 때마다 빠뜨릴 자리가 는다. key 재마운트는 **빠뜨릴 수 없는** 초기화다.
- **파괴 전용(빨강) 확인 버튼** — 쓰는 토큰 · 변형이 없고(ui-lynx `Button` · `SettingsCell`에 critical 0), 앱의
  다른 확인 대화상자와 규칙이 갈린다(design 게이트 결정).
- **로딩 동안 대화상자를 닫고 화면 전체 스피너** — 무엇을 기다리는지가 사라지고, Apple 시트가 설 자리가 없다.
- **게이트웨이 JWT 검증(`verify_jwt = true`)** — 새 비대칭 키에서 맞지 않는 경우가 있고, 함수가 `/auth/v1/user`로
  어차피 검증한다.
- **zod 등 런타임 스키마** — 저장소가 쓰지 않는다(ADR-0013). 손 파서(`unknown` → 좁힘 → `null`)가 경계를 진다.

## 대가

- **실서버에서 한 번도 돌지 않았다.** 함수 배포 · Apple 키 발급 · 시크릿 등록이 사용자 몫이고, 그전에는 삭제가
  `unavailable`(함수 없음 404)로 끝난다. Supabase logout · admin 삭제 · Apple token/revoke 형식 · ES256 서명은 공개
  명세 기준이다 — 수동 절차는 [계정 삭제 e2e](../e2e/account-deletion.md).
- **Deno 쪽 타입은 최소 선언 위에 선다** — 실제 Deno 타입과의 차이는 배포 때 드러난다.
- **로그아웃한 기기의 서버 refresh 토큰은 만료까지 남는다**(D5 — 기다리지 않는다).
- **삭제된 사용자의 과거 분석 이벤트는 PostHog에 남는다**(D7).
- **삭제 중 바텀 네비게이션은 눌린다** — 대화상자 Scrim이 화면 영역만 덮는다(기존 겹침 레이어와 같은 동작).
  탭을 바꾸면 설정이 내려가 실패 문구는 보이지 않지만 `deleted` 뒤처리는 그대로 선다.
- **Apple 사용자는 삭제 때 시트를 한 번 더 본다**(D4).
- **App 몸통이 `AppSession.tsx`로 옮겨졌다** — `App.tsx`가 300줄 상한에 닿아 있었고, 바깥 App은 `AppStart` 하나만 쥔다.
- **같은 기기의 다음 사람이 앞사람의 UI 언어를 받는다**(D6 — 지우지 않는다).

## 확인 필요

⚠ 확인되기 전까지 이 ADR은 `제안`이다.

1. ⚠ **[사용자] 함수 앱 자리** — 요구사항의 `packages/account-functions`를 `apps/supabase-functions`로 바꿨다(D1).
   원래 자리를 고집하면 ADR-0004에 예외 기록이 필요하다.
2. ⚠ **[사용자] 레거시 키** — 프로젝트가 새 API 키(`sb_publishable_` · `sb_secret_`)만 쓰고 레거시 anon · service_role을
   끄면 런타임 기본 `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`가 비거나 무효일 수 있다. 두 경우의 절차는
   함수 앱 README에 있다.
3. ⚠ **[사용자] 다른 Apple ID로 재인증하면 삭제하지 않는다**(D2의 403) — 루트는 받았다.
4. ⚠ **[사용자] PostHog person 삭제는 범위 밖**(D7) — 개인정보 처리 문구(위키 Legal)와 맞춰야 한다. 저장소 밖이라
   루트가 갱신한다.
5. 영어 문구는 design 가이드를 따른 초안이다(언어 검수 없음).

## 재검토 조건

- **실서버에서 삭제가 처음 도는 시점**([계정 삭제 e2e](../e2e/account-deletion.md)) → D2 · D3. 공개 명세 가정(Apple
  교환 · 철회 모양, Supabase admin 삭제, 게이트웨이의 `verify_jwt = false` 통과)이 맞는지 보고 `채택`으로 올린다.
- **함수가 둘째로 늘거나 앱과 함수가 타입을 둘 이상 나누게 되는 시점** → D1. 같은 앱의 `supabase/functions/<이름>/`에
  더하는 것이 기본이고, 공유 타입이 늘면 ADR-0004 D2의 두 번째 소비자 조건을 다시 본다.
- **Google · Facebook 토큰 철회가 요구되는 시점** → D2. 지금은 요구가 없다.
- **「다시 켜도 로그인 화면」이 요구되는 시점** → D6. 「온보딩을 봤다」 저장은 ADR-0007 D1의 새 예외다.
- **삭제 중 탭 이동을 막으라는 요구가 오는 시점** → D8. 셸이 겹침 레이어 동안 바를 가리는 새 규칙이 필요하다.
- **App 상태 중 재시작을 넘어 살아야 하는 것이 생기는 시점**(예: 기기 설정) → D6. 바깥 `App`이 쥐는 것이
  `AppStart` 하나라는 규칙을 다시 본다 — 영속이면 ADR-0007 D1의 저장소로, 아니면 바깥 App으로.
- **PostHog person 삭제가 요구되는 시점**(법무 · 사용자 요청) → D7. 함수가 PostHog API를 부를지 정한다.
