# AI 컴패니언 1단계 — API 명세

- 상태: **제안 — 팀 리뷰 전.** 코드 · 마이그레이션 · 배포는 이 문서와 함께 들어오지 않는다. 계약의 정본은 M0에서 생기는
  `packages/companion-contract`가 되고, 그 뒤 이 문서는 요약이 된다.
- 작성: 2026-11-08. 기능 규칙 · 마일스톤 · 열린 질문은 [PRD](ai-companion.md)가 진다. 이 문서의 `O#` · `C`는 PRD §8을 가리킨다.
- 표기: **[제안]**은 PRD와 같다. 마일스톤 표시 `M0` ~ `M4`는 그 기능이 처음 서는 마일스톤이다.

## 0. 고정 범위와 불변식

1. 답변 스트리밍은 **SSE 하나**다. v1은 Supabase Realtime을 쓰지 않는다. 메시지별 피드백은 같은 스트림에 `correction` 이벤트로
   끼운다.
2. 컴패니언 표는 **전부 DB 스키마 `companion`**에 있다. 모든 표에 RLS를 켜고 **정책을 두지 않으며**, `anon` · `authenticated`의
   표 권한을 걷는다. 저장소의 기존 표(`learning_progress` · `learner_profiles` · `push_devices`)와 같은 방식이다.
3. 앱이 닿는 길은 둘뿐이다 — Edge Function `chat-send`, 그리고 **`public` 스키마의 창구 함수(`public.companion_*`)**. 앱은 `companion`
   스키마의 표 · 함수를 직접 부르지 않는다(§3).
   **서버(Edge Function · 워커)도 같은 길을 쓴다** — `companion` 스키마는 PostgREST에 노출하지 않으므로 서버 키로도 REST로는 그 표에
   닿지 못한다. 서버가 부르는 함수는 `public.companion_*`에 두고 **service_role에만** 실행 권한을 준다(§3.1 · §3.3).
4. 크레딧 · 사용량 · 메모리 쓰기는 서버(Edge Function · 워커)만 한다. 앱용 창구 함수는 본인 행만 읽고, 쓰기는 프로필 · 메모리
   수정 · 신고로 한정한다.
5. 로그 · 분석에 대화 원문 · 생년 · 이메일 · 토큰을 싣지 않는다. Edge Function 로그는 기존 함수처럼 요청당 한 줄
   (`event` · `status` · `error`)이다.

## 1. 공통

### 1.1 인증

- 앱 요청은 `Authorization: Bearer <사용자 액세스 토큰>`이다. Edge Function은 기존 `delete-account`처럼 `verify_jwt = false`로
  배포하고 **함수가 스스로 토큰을 검증한다**(Auth 사용자 조회). 창구 함수는 PostgREST가 토큰을 검증하고 함수가 `auth.uid()`를 쓴다.
- 내부 엔드포인트(`job-worker` · 선톡)는 service role 키만 받는다. 기존 `send-push`와 같은 검증(`_shared/service-key.ts`)을 쓴다.
  ⟨2026-11-09⟩ `companion-proactive` · `companion-eval`이 이 등급이다. `companion-suggest`는 `chat-send`처럼 사용자 토큰과
  서버 키 + 유저 둘 다 받는다(§2.6).
- **플레이그라운드 경로**(M1): `chat-send`는 `Authorization: Bearer <서버 키>` + `x-companion-user-id: <계정 id>`도 받는다. 서버 키를 가진 ops-dashboard만
  쓸 수 있고, 그 계정도 시험 계정 판정(판정 5)을 똑같이 지난다. 메시지 `meta.playground`에 표시가 남는다.
- Edge Function이 DB에 닿을 때는 service role 키로 §3.3의 서버용 함수를 HTTP RPC로 부른다. DB에 직접 연결하지 않는다(§3.1).
- 비회원(서버 계정 없음)은 부를 수 없다 — [제안] PRD §3.13 · O7.
- [제안] M4 전에는 토큰의 `app_metadata.duru_tester`가 `true`인 계정만 `chat-send`를 부를 수 있다([ADR-0085](../adr/0085-tester-access.md)).
  서버는 토큰 내용을 Auth 서버 조회 결과로 읽는다(앱처럼 서명 없이 읽지 않는다).

### 1.2 오류 본문

스트림을 열기 전 오류는 HTTP 상태와 JSON 하나다. CORS 헤더는 없다(호출자는 앱의 네이티브 fetch와 ops-dashboard 서버).

```jsonc
{ "error": "insufficient_credits", "retryable": false, "detail": { "required": 1, "balance": 0 } }
```

- `error`는 §5의 코드 하나. `retryable`은 같은 요청을 그대로 다시 보내도 되는지. `detail`은 코드별 선택 필드다.
- 스트림을 연 뒤의 오류는 SSE `error` 이벤트로 온다(§4). HTTP 상태는 이미 200이다.

### 1.3 계약 버전

- 요청 본문에 `contract_version`(정수)을 싣는다. 지금은 `1`이다. 서버가 모르는 버전이면 400 `unsupported_contract_version`.
- SSE `start` 이벤트가 서버의 계약 버전을 돌려준다.
- 필드 추가는 버전을 올리지 않는다(받는 쪽은 모르는 필드를 버린다). 필드 삭제 · 의미 변경 · 이벤트 순서 변경은 버전을 올린다.

### 1.4 멱등

- 유저 메시지마다 앱이 `client_message_id`(UUID v4)를 만든다. 같은 메시지를 다시 보낼 때 **같은 값**을 쓴다.
- 서버는 `(user_id, client_message_id)`를 고유하게 저장한다. 메시지 · 크레딧 예약 · 체험 사용량이 이 키에 걸려 두 번 생기지 않는다
  (§6).

## 2. Edge Function

### 2.1 `POST /functions/v1/chat-send` — 턴 하나 (M1)

**요청**

```http
POST /functions/v1/chat-send
Authorization: Bearer <사용자 액세스 토큰>
Content-Type: application/json
Accept: text/event-stream
```

```jsonc
{
  "contract_version": 1,
  "character_id": "duksu",                 // companion.characters.id
  "client_message_id": "0b8f…",            // UUID v4, §1.4
  "text": "안녕하세요 저는 마리아 이에요",     // 앞뒤 공백을 걷은 뒤 1 ~ 1000자 [제안]
  "input_mode": "text",                    // "text" | "voice"(기기 내장 STT 글자)
  "client_region": "PH"                    // 선택. 기기 지역(ISO 3166-1 alpha-2). 미국 판정 신호 하나(O12)
}
```

- ⟨2026-11-10⟩ 선택 칸 둘 더: `suggestion { message_id, index }` — 추천 답변 칩을 탭해 보냄(§2.6). `replaces_message_id` — 고쳐서 다시 보내기,
  고칠 마지막 유저 메시지 id(§2.8). 이것이 있으면 칩 표시는 보지 않는다.

- 피드백 방식은 요청에 싣지 않는다. 프로필의 값(§3 `companion_save_profile`)을 쓴다. 바꾼 방식은 다음 턴부터다.
- 대화는 [제안] **캐릭터당 하나**다(O14). 첫 턴에 서버가 만든다. 그래서 요청에 대화 id가 없다.

**판정 순서** — 앞에서 막히면 뒤를 보지 않는다. 1 ~ 11은 스트림을 열기 전이라 HTTP 오류다.

| # | 판정 | 실패 |
|---|---|---|
| 1 | 메서드가 `POST` | 405 `method_not_allowed` |
| 2 | 서버 설정(DB · LLM 키) | 500 `server_misconfigured` |
| 3 | 토큰 검증 | 401 `invalid_session` |
| 4 | 본문 모양 · 계약 버전 | 400 `invalid_request` · `unsupported_contract_version` |
| 5 | 접근 — 시험 계정(M4 전) · 캐릭터가 있고 활성인가 | 403 `not_available` · 404 `character_not_found` |
| 6 | 연령 — 보호자 동의 대상 연령 [제안] | 403 `age_restricted` |
| 7 | 단계 제재 — 일시 차단 중(M3) | 403 `temporarily_blocked` |
| 8 | 이용 시간 상한 | 403 `usage_time_limit` |
| 9 | 멱등 · 동시성 — 같은 `client_message_id`가 이미 있음 · 같은 대화에 진행 중인 턴 | 409 `duplicate_message` · `turn_in_progress` |
| 10 | 덕수쌤 체험 한도(M4) | 402 `trial_exhausted` |
| 11 | 크레딧 예약(M4) | 402 `insufficient_credits` |
| 12 | 유저 메시지 저장 → **200, SSE 시작** | — |
| 13 | 입력 검사 | 스트림 안 `error`(`guardrail_blocked`) 또는 `crisis` |
| 14 | 메인 LLM + 피드백(병렬) → 출력 검사 | 스트림 안 `error` |
| 15 | 저장 · 크레딧 확정 · 후처리 작업 큐 | `done` 뒤 |

- 나이를 모르면 막지 않고 미성년자 기본값으로 처리한다(PRD §3.12).
- 9의 `duplicate_message`는 그 메시지의 처리가 끝난 경우다. `detail.message_status`(`complete` · `blocked` · `crisis`)를 싣는다.
  앱은 메시지 목록으로 결과를 받는다. 처리가 **실패**(`failed`)로 끝난 메시지는 같은 id로 다시 보내면 **다시 돈다**(§6.3).
- 9의 `turn_in_progress`는 같은 대화에 다른 턴이 아직 끝나지 않은 경우다. 한 대화에 동시에 한 턴만 돈다.

**처리 규칙**

- 메인 LLM 호출과 피드백 호출을 **동시에** 시작한다. 피드백은 유저 메시지만 보면 되므로 메인 답변을 기다리지 않는다(M2).
- **출력 검사 — 동기**(18세 미만 · 나이 모름): 메인 답변을 끝까지 받은 뒤 검사하고, 통과하면 조각을 이어서 보낸다. **비동기**
  (성인): 받는 대로 조각을 보내고 끝난 뒤 사후 검사 작업을 큐에 넣는다. 사후 검사에 걸린 메시지는 목록 조회에서 가려진다
  (`hidden: true`).
- `done`을 보내기 전에 피드백을 기다린다. 피드백이 제한 시간(설정 값) 안에 오지 않으면 `correction`을 `status: "unavailable"`로
  보내고 끝낸다.
- **L1 번역 [결정 2026-11-09]**: 답 조각이 다 모이면 번역 호출 하나(`COMPANION_TRANSLATION_MODEL`)를 남은 기다림(피드백 ·
  미성년자 출력 검사)과 동시에 시작한다. 제한 시간 6초. 결과는 `translation` 이벤트로(§4.2) 보내고 조각의 `translation`에 저장한다.
  `l1`이 `ko` · `COMPANION_TRANSLATION=off`면 부르지 않는다. 출력 검사에 걸린 답은 번역을 내보내지도 저장하지도 않는다. 실패 ·
  시간 초과 · 줄 수 불일치는 턴을 실패시키지 않고 `meta.translation`에 이유만 남는다.
- **차단 턴의 페르소나 거절 [결정 2026-11-09]**(`chat-send-refusal.ts` · `chat-send-finish.ts`): 입력 검사가 막으면(위기 제외)
  단계를 정한다 — 턴 시작 때 `companion_turn_status`가 읽은 창 안 위반 수 + 이번 차단이 `strike_limit`(기본 3)이면 일시 차단(지금처럼
  `error`(`guardrail_blocked`), `blocked_until` = 지금 + `block_duration` 30분 — 다음 요청은 403 `temporarily_blocked`), 그 하나 앞이면
  `warn`, 그보다 앞이면 `deflect`. `deflect` · `warn`이면 캐릭터가 거절하는 답을 만든다(PRD §3.11).
  - 답 모델(`COMPANION_MODEL`)에 페르소나 시스템 프롬프트 + `refusalDirective(stage, topic)`, 유저 자리에는 `refusalUserText(topic)`.
    **막힌 글은 보내지 않는다.** 대사 2개 + 지문 1개까지.
  - 미성년자 · 나이 모름은 출력 검사를 지난다. 생성 실패 · 시간 초과(10초) · 출력 검사 차단이면 `persona.refusalLines[stage][speechLevel]`
    → 존댓말 줄 → 코드 기본 줄.
  - 저장: 유저 메시지 `blocked`, 캐릭터 메시지 `complete` · 차감 0 · `meta.refusal: true` · `refusalStage` · `refusalCategory` ·
    `refusalSource`(`model` · `canned`). 위반 수는 센다. 기억 추출 · 요약은 돌지 않는다.
  - 캐릭터 자신의 답이 출력 검사에 걸린 정상 턴은 거절로 바꾸지 않는다 — 그대로 `error`(`guardrail_blocked`).
- 유저가 연결을 끊어도 서버는 턴을 끝까지 처리해 저장한다. 앱은 다시 열 때 메시지 목록으로 결과를 받는다.
- 제한 시간 · 재시도: LLM 호출의 첫 토큰 · 전체 제한 시간은 설정 값이다. LLM 호출 실패는 서버 안에서 한 번만 다시 시도한다
  (조각을 하나도 보내기 전일 때만). 그래도 실패하면 `error`(`upstream_unavailable`, `retryable: true`)이고 예약을 해제한다.

**후처리 작업**(pgmq 큐 `companion_jobs`, §2.2)

| 작업 | 마일스톤 | 내용 |
|---|---|---|
| `summarize` | M1 | 단기 메모리 요약 갱신(N턴마다) |
| `post_moderation` | M1 | 성인 턴의 사후 출력 검사 |
| `extract_memory` | M3 | 장기 메모리 추출(미국 12 ~ 15세 · 미성년자 건강 정보 규칙 적용) |

### 2.2 `POST /functions/v1/companion-job-worker` — 후처리 (내부, M1)

- 호출자: pg_cron(주기 실행, 기존 `send-push` 예약과 같은 방식 — Vault의 service role 키). 사람 · 앱은 부르지 않는다.
- 본문: `{ "batch": 20 }`(선택, 한 번에 꺼낼 작업 수). 응답: 200 `{ "processed": n, "failed": m }`.
- 작업 실패는 pgmq 재시도(보이지 않는 시간 뒤 다시)로 넘긴다. 같은 작업이 두 번 돌아도 결과가 같게 만든다(요약은 덮어쓰기 ·
  메모리 추출은 `source_message_id` 고유).

### 2.3 선톡 발송 (내부, M3)

- pg_cron이 주기적으로 후보(공백이 긴 대화 · 하루 상한 미달 · 선톡 허용 연령)를 고르고, 워커가 캐릭터 메시지를 만들어
  `messages`에 `origin: "proactive"`로 저장한 뒤 푸시를 보낸다.
- 푸시는 기존 `send-push`의 `announcement`(`userIds`)를 쓴다. **목적지 `target.kind`에 컴패니언이 없어서** `send-push`
  계약에 목적지를 더해야 한다(M3 작업. 앱 쪽 목적지 처리는 FE).
- 미국 12 ~ 17세 · 나이 모름 [제안 — 나이 모름은 미성년자 기본값]에게는 보내지 않는다. 크레딧을 차감하지 않는다 [제안].

**구현 [2026-11-09]** — Edge Function `POST /functions/v1/companion-proactive`(서버 키만).

| 본문 | 하는 일 |
|---|---|
| `{ batch: n }`(1 ~ 50, 기본 20) | 매시 30분 pg_cron(`supabase/cron/companion.sql`). `companion_proactive_candidates`가 유저마다 후보 하나를 고른다 |
| `{ user_id, character_id, force? }` | 한 대화(플레이그라운드). `force`는 빈도 규칙만 건너뛴다 — 연령 · 지역은 건너뛰지 않는다 |

- 빈도 규칙은 `companion.proactive_skip_reason` 하나가 판정한다(PRD §3.8 표). 응답 `outcomes[].result`가 `sent` 또는 건너뛴 이유
  (`off` · `quiet_hours` · `hour` · `daily_cap` · `gap` · `spacing` · `not_allowed_for_age` · `no_conversation` · `blocked` · `failed` 등)다.
- 연령 · 지역: 성인, 또는 지역을 알고 미국이 아닌 미성년자만 후보다. 나이 모름은 후보가 아니다.
- 선톡은 유저 입력 없이 나가므로 **연령과 상관없이 동기 출력 검사를 지난 것만** 저장한다. L1 번역을 붙여 저장한다. 차감하지 않는다.

#### 2.3.1 푸시 연결 — 세현님 인계

**지금 있는 것**

- `companion-proactive`는 선톡을 만들어 `companion_save_proactive`로 **저장만 한다.** 푸시는 보내지 않는다. 앱은 다음
  `companion_list_messages` 조회 때 `origin: "proactive"` 메시지로 본다.
- `send-push`(ADR-0034)의 `PushTarget`에 컴패니언 목적지가 없다(`journey-map` · `notifications` · `roleplay-list` · `messenger` ·
  `phone-call` · `visual-novel`).

**연결에 필요한 것**

| 항목 | 내용 |
|---|---|
| 목적지 | `send-push` 계약에 컴패니언 목적지 하나 — 예 `{ kind: "companion-chat", characterId }`. 서버 `_shared/send-push.contract.ts`와 앱 `apps/mobile/src/lib/push-target.ts`가 같은 모양을 각자 적는다(앱은 목적지를 다시 검증한다 — 앱 쪽은 FE) |
| 페이로드 | 유저 id · 캐릭터 id · 선톡 메시지 id · 짧은 미리보기 글(넣을지는 정할 것 — 잠금 화면에 대화가 보인다) · 그 대화로 가는 딥링크(목적지) |
| 미국 12 ~ 17세 | 푸시 없음. 후보 단계에서 이미 빠지지만 푸시 쪽에서도 연령 규칙을 다시 지킨다 |
| 조용한 시간 | 현지 22:00 ~ 08:00 금지. 후보 판정이 이미 지키지만 재시도 · 지연 발송이 이 시간에 떨어지지 않게 한다 |
| 유저 설정 | `proactive_pref = off`면 선톡도 푸시도 없다. 앱의 알림 권한 · 기기 등록(`push_devices`)이 없으면 보내지 않는다 |
| 실패 | 푸시 실패가 **저장된 메시지를 되돌리지 않는다.** 결과는 `outcomes`에 따로 적는다(예 `push: "sent" \| "no_device" \| "failed"`) |

**걸 자리**

- `apps/supabase-functions/supabase/functions/_shared/companion-proactive-handler.ts`의 `proactiveOne()` 안,
  `callRpc(…, "companion_save_proactive", …)`가 성공한 **바로 뒤**. 저장된 `messageId` · `segments`(미리보기) · `target`이 그 자리에
  다 있다.
- 플레이그라운드 `force` 호출에 푸시를 보낼지(시험 기기로) · 보내지 않을지도 같이 정한다.

### 2.4 결제 연결점 (M4)

- M4는 결제를 만들지 않는다. 결제 작업(`billing-webhook` 등)이 부를 **지급 함수**와 **티어를 읽는 자리**만 정한다.
- 지급: `public.companion_grant_credits(p_user_id, p_bucket, p_amount, p_reason, p_ref_id, p_expires_at)` — service role 전용, `p_ref_id`
  (영수증 · 거래 id)로 멱등. §6.4.
- 티어: `companion.entitlements(user_id, tier, expires_at, source)` 표를 결제 작업이 채운다. 컴패니언은 읽기만 한다. 행이 없으면
  무료 티어로 본다.

### 2.5 TTS

1단계에 없다. M4 뒤 이미지 생성과 함께 다시 정한다(PRD §0).

### 2.6 `POST /functions/v1/companion-suggest` — 추천 답변 [결정 2026-11-09 · 2판 2026-11-10]

칩은 `chat-send`가 턴마다 자동으로 만든다(유저 스위치 `profiles.reply_suggestions`가 켜져 있을 때, SSE `suggestions` — translation 뒤 ·
state 앞). 첫 인사(`companion-greet`) · 선톡(20261123)에도 붙는다. 이 함수는 「다시 만들기」(`refresh`)와 자동 칩이 `unavailable`이었거나
오지 않은 턴의 대체 경로다. 규칙의 정본은 PRD §3.4, 모양의 정본은 계약 패키지 `suggest.ts`.

| | |
|---|---|
| 인증 | 사용자 토큰 + 본문 `{ character_id, refresh? }`. 플레이그라운드는 서버 키 + 본문 `{ user_id, character_id, refresh? }` |
| 응답 | 200 `{ status, messageId, items, cached, reason? }` — `status` `ok` · `none` · `unavailable`. `ok`면 `items`가 1 ~ `settings.suggestion_display_max`개(기본 2, 0 ~ 3) `[{ text, meaning, intent }]` — 억지로 채우지 않는다. `text` 한국어, `meaning` L1 뜻(`l1`이 `ko`면 `null`) |
| 의도 | 숨은 의도 여섯 — `elaborate` · `ask` · `reflect` · `redirect` · `boundary` · `progress`. 정해진 조합은 없고 앱에는 보이지 않는다(검색 · 평가용) |
| 생성 · 검증 | 모델이 후보 3개를 내고, 서버가 후보마다 검증한다 — 형식 · 한글 · `*행동*` · 서식 · 길이(80자) · 뜻 · 연락처 꼴 · 앞 후보와 겹침 · 최근 칩 셋 반복, 미성년자 · 나이 모름은 출력 검사(한 번에). 통과한 것 가운데 의도가 서로 다른 것을 고른다. 통과가 0이면 한 번 더 묻고, 그래도 0이면 `unavailable` · `no_valid_candidates` |
| 맥락 | 최근 8메시지 · 대화 요약 · 최근 칩 셋 5개(고름 · 무시). 다시 만들기는 지금 칩 셋도 지난 셋으로 넘겨 다른 칩이 나오게 한다 |
| 수준 | 관계 말투 단계에 맞추고 학습자 수준보다 조금 위(i+1). 확인되지 않은 감정 · 관계 · 동의 · 약속 · 개인정보를 학습자 대신 말하지 않는다(프롬프트) |
| 모델 | Haiku — `COMPANION_SUGGEST_MODEL`, 비우면 검사 모델 |
| 캐시 | 마지막 캐릭터 메시지의 `messages.suggestions`(2판 — 보인 칩 `items`와 후보 · 검증 결과 `candidates`). 같은 메시지에 다시 부르면 모델 없이 캐시(`cached: true`), `refresh: true`면 다시 만든다. 1판 캐시는 쓰지 않고 다시 만든다 |
| 판정 | `companion_suggest_context`가 `companion_turn_gate`와 같은 판정(시험 계정 · 티어 · 연령 · 일시 차단 · 이용 시간 · 진행 중인 턴)을 먼저 돈다. 저장은 `companion_save_suggestions` |
| 끄기 | 유저 스위치가 꺼져 있으면 `none` · `suggestions_off`, 운영 전체 끄기(`settings.suggestions_enabled = false`)면 `none` · `suggestions_disabled` |
| 생성 시간 | 제한 8초(자동 칩은 6초) |
| 크레딧 | 지금은 차감하지 않는다(PRD O20) |

| `status` | `reason` |
|---|---|
| `none` | `no_assistant_message` · `latest_turn_blocked` · `latest_turn_crisis` · `latest_turn_refusal` · `suggestions_off` · `suggestions_disabled` |
| `unavailable` | `not_available` · `age_restricted` · `temporarily_blocked` · `usage_time_limit` · `turn_in_progress`(판정) · `generation_failed`(실패 · 시간 초과) · `blocked`(출력 검사) · `no_valid_candidates` |

- 칩을 탭해 보내면 `chat-send` 본문에 `suggestion { message_id, index }`(§2.1). 지금 칩과 글이 같으면 피드백을 건너뛰고(`correction`
  `status: skipped` · `reason: suggestion`), 지난 칩(`stale`) · 직접 입력(`manual`)이면 보통 피드백. 칩 수정은 없다 — 탭 전송 · 직접 입력 둘뿐.
  입력 출처는 스트림을 닫은 뒤 `companion_record_choice`가 유저 메시지 meta와 앞 칩 셋의 결과(`chosen` · `ignored`)에 적는다. 칩으로 고른
  말은 기억 · 요약에서 학습자의 사실로 쓰지 않는다.
- 운영 지표 `companion_suggestion_stats(p_since, p_playground)` — 노출 성공률 · 사용률 · 의도 · 빠진 까닭 · 시간 · 토큰.
- HTTP 오류: 400 `invalid_request` · 401 `invalid_session`(앱 토큰에 `user_id`를 실어도) · 404 `character_not_found` · 405 · 500.
- 로마자는 앱이 만든다.

### 2.7 `companion-eval` — 한 단계 평가 (내부, 2026-11-09)

서버 키만. DB에 쓰지 않고 크레딧도 쓰지 않는다(케이스마다 실제 API 비용).

- `GET` → 지금 모델 · 고를 수 있는 모델(`allowed`) · LLM 종류. `GET ?docs=1` → 캐릭터 · 설정 · 프롬프트 문서(ops-dashboard 문서 화면).
- `POST { kind: "moderation" | "feedback" | "translation" | "suggestions", model?, cases }`(케이스 1 ~ 20) → 운영과 같은 프롬프트로 케이스마다 결과.
- `?docs=1`의 `prompts`에 `refusal { deflect, warn, userText }` · `suggestions`, `models`에 `suggest`가 있다.

### 2.8 답변 평가 · 고쳐서 다시 보내기 · 학습 연결 [구현 2026-11-10 — 학습 연결은 `feat/companion-learning`]

PRD §3.15 · §3.7의 짝. 답변 평가 · 고쳐서 다시 보내기는 FE `feat/companion-m1`(마이그레이션 20261124)에 있다 — 모양의 정본은 계약
패키지(`chat-send.ts`의 `replaces_message_id` · `error-codes.ts`의 `not_latest_message` · `rpc.ts`의 `messageRatingSchema`). 학습 연결은
`feat/companion-learning`(m1 위에 쌓은 브랜치, 마이그레이션 20261125 · 20261126)에 있다 — 계약은 `sse-events.ts`의 `correctionDataSchema.learnedUsed`와 `rpc.ts`의 `learningScopeSchema`(범위 설정)가 바뀐다.

| 무엇 | 창구 | 모양 |
|---|---|---|
| 답변 평가 [구현] | 앱용 RPC `companion_rate_message(p_message_id uuid, p_rating text, p_reasons text[], p_note text)` · 플레이그라운드 `companion_operator_rate_message(p_user_id, …)`(서버 키, 시험 계정만) | `p_rating` `up` · `down` · `null`(지움). `p_reasons`(여럿, 중복은 하나로) · `p_note`(200자)는 `down`에만 — `awkward_korean` · `out_of_character` · `too_hard` · `uncomfortable` · `other`. 본인 대화의 보이는 캐릭터 메시지(첫 인사 · 선톡 · 거절 포함, 위기 안내 · 숨김 제외)만, 아니면 `P0002`. 값이 틀리면 `22023`. 저장 `companion.message_ratings`(메시지당 한 행, 대화가 지워지면 따라 지워짐). `companion_list_messages`의 Message에 `rating { value, reasons, note }`(없으면 `null`) |
| 고쳐서 다시 보내기 [구현] | `chat-send` 본문 `replaces_message_id`(마지막 유저 메시지 id) → 서버용 `companion_begin_replacement` | 그 대화의 마지막 유저 메시지이고 그 뒤에 그 답이 아닌 캐릭터 메시지(선톡 등)도 없어야 한다. 아니면 409 `not_latest_message`, 그 턴이 아직 돌면 409 `turn_in_progress`. 맞으면 이전 턴(유저 메시지 · 캐릭터 답 — 교정 · 칩 · 평가는 메시지를 따라, 공지는 두고)을 `hidden`으로 숨기고(`meta.replacedBy` ↔ 새 유저 메시지 `meta.replaces`) 같은 트랜잭션에서 보통 시작을 한다 — 시작이 402로 막히면 숨기기도 되돌린다. 같은 `client_message_id` 재시도는 멱등. 차감 · 입력 검사 · 위반 횟수는 새 턴에 그대로. 이 칸이 있으면 칩 표시는 보지 않는다(직접 입력). 숨긴 턴은 `companion_list_messages` · 지난 대화 · 기억 · 요약 원문 · 칩 이력 · 칩 지표에서 빠진다 |
| 학습 연결 기록 [구현] (주기 · 방식 셋 · 대상은 PRD §3.7) | 서버용 RPC `companion_record_learning(p_user_id uuid, p_events jsonb, p_now timestamptz)` — 턴 · 첫 인사 · 선톡 저장 뒤 따로(finish 에 합치지 않았다 — 실패해도 턴은 그대로, 로그 `learning_record_failed`) | `p_events [{expression_id, kind: exposed · elicited · chip_shown · produced}]`, 없는 표현 · 모르는 종류는 건너뛰고 센 수를 돌려준다. `companion.user_expressions`(유저 × 표현 횟수 · 시각). 유저 산출은 `correction` 이벤트(와 저장 카드 · 메시지 목록의 `feedback`)의 `learnedUsed: [{id, surface}]`(있을 때만) — 앱 카드 「배운 표현을 썼어요」 |
| 학습 맥락 [구현] | 서버용 `companion_learning_context(p_user_id, p_limit)`(같은 인수) | `{episodes, expressions[{id, kind, surface, roman, gloss, episode, exposed, elicited, chipShown, produced, lastSeenAt}], settings {enabled, minGap, baseProbability, forceTurns, dailyCap}, scope {mode, units, empty}}` — 지금 범위의 끝낸 유닛만(20261126부터 `scope`), 최근 에피소드부터 |
| 배운 표현 범위 [구현 — 20261126] | 앱용 RPC `companion_learning_scope()` · `companion_set_learning_scope(p_scope text, p_units text[] default null)` · 플레이그라운드 `companion_operator_learning_scope(p_user_id)` · `companion_operator_set_learning_scope(p_user_id, p_scope, p_units)`(서버 키, 시험 계정만) | 반환(읽기 · 바꾸기 같음) `{scope: auto · manual, units[], empty, options[{episode, title, completedUnits, expressions, selected}]}` — 계약 `rpc.ts`의 `learningScopeSchema`. `p_units`가 `null`이면 고른 목록은 그대로 두고 범위만 바꾼다. 에피소드 id 모양 · 50개가 틀리면 `22023`, 범위가 `auto` · `manual`이 아니어도 `22023`. `units`는 고른 것 가운데 지금 고를 수 있는 것만, `manual`인데 그것이 없으면 `empty` = 참(넣지 않는다). 제목은 `companion.episodes`(없으면 `null` — 앱이 id를 보인다) |
| 운영 조회 | 평가 지표 `companion_rating_stats(p_since, p_playground, p_limit)` [구현] · 학습 지표 `companion_learning_stats(p_since, p_playground)` [구현] | 👍/👎 수 · 캐릭터 · 모델 · 출처(origin)별 · 이유별 · 최근 👎 원문(ops-dashboard 평가 후보로). 학습: 열린 턴 · 넣은 턴 · 방식별 따름 · 까닭 · 유도 뒤 산출 · 다시 쓴 표현 · 많이 넣은 표현. 유저 한 명의 풀은 `companion_learning_context`(읽기) — 따로 inspect 함수를 두지 않았다 |
| 평가 [구현] | `companion-eval` `kind: "learning"` | 케이스 `target {surface, gloss?, kind?, mode: expose · elicit · chip}`, `text`는 학습자의 마지막 말(칩이면 캐릭터의 마지막 말). 결과 `{mode, segments, items?, learned, done}` — 모델을 고르지 않으면 답 모델 |

## 3. DB 함수(RPC)

### 3.1 왜 `public`의 창구 함수인가 [제안 — ADR 후보 6]

PostgREST(Supabase가 DB 함수를 `/rest/v1/rpc/<이름>` URL로 열어 주는 장치)는 설정에 등록된 스키마만 바깥에 보인다. 기본은
`public`뿐이다. `companion` 스키마를 등록하면 그 안의 표 · 함수가 노출 후보가 되고, 그 설정은 코드가 아니라 대시보드에 있다.

그래서 **`companion` 스키마는 노출하지 않고**, 불러야 하는 기능만 `public.companion_*` 함수로 연다. 함수는 두 갈래다.

| 갈래 | 누가 부르나 | 권한 | 첫 줄 |
|---|---|---|---|
| 앱용 창구 함수(§3.2) | 앱(사용자 토큰) | `revoke all … from public, anon` 뒤 `grant execute … to authenticated` — 기존 `save_learner_profile`과 같다 | `auth.uid()`가 없으면 `28000` |
| 서버용 함수(§3.3) | Edge Function · 워커(service role 키) | `revoke all … from public, anon, authenticated` 뒤 `grant execute … to service_role` — 기존 `reengagement_devices`(`send-push`가 부른다)와 같다 | 인수로 받은 `p_user_id`를 쓴다 |

- 둘 다 `security definer` · `set search_path = ''`이고, 본문이 `companion` 스키마의 표를 읽고 쓴다.
- **서버도 DB에 직접 연결하지 않는다**(2026-11-09 결정). Edge Function은 기존 함수처럼 HTTP로 RPC를 부른다 — Postgres 드라이버 ·
  연결 관리 · 연결 수 한도를 새로 들이지 않으려는 것이다. 크레딧처럼 여러 단계를 한 번에 해야 하는 일은 어차피 트랜잭션 DB 함수
  하나가 하므로 직접 연결로 얻는 것이 없다.
- 운영자가 SQL 편집기에서 직접 실행하는 함수(`companion.sync_expressions` — 학습 표현 동기화)는 `companion` 스키마에 둔다. REST로
  부르지 않으므로 노출할 필요가 없다.

### 3.2 앱용 창구 함수

| 함수 | 마일스톤 | 인수 | 반환 | 오류 |
|---|---|---|---|---|
| `companion_load_profile()` | M0 | — | `{ birthYear, ageSource, l1, feedbackMode }` 또는 `null` | `28000` |
| `companion_save_profile(p_birth_year int, p_age_source text, p_l1 text, p_feedback_mode text)` | M0 · `feedback_mode`는 M2 | `null`인 인수는 그 열을 바꾸지 않는다 | `void` | `28000` · `22023`(범위 · 닫힌 값 위반) |
| `companion_list_characters()` | M1 | — | `[{ id, available, unavailableReason, speechLevel, lastMessageAt }]` | `28000` |
| `companion_list_messages(p_character_id text, p_before timestamptz, p_limit int)` | M1 · 피드백 M2 | `p_before` 없으면 최신부터, `p_limit` 1 ~ 50 | `{ messages: Message[], hasMore }` | `28000` · `22023` |
| `companion_report_message(p_message_id uuid, p_reason text)` | M1 | 본인 대화의 메시지만 | `void` | `28000` · `22023` · `P0002`(없음 · 남의 메시지) |
| `companion_list_memories(p_character_id text)` | M3 | `null`이면 공유 프로필 메모리 | `[{ id, characterId, kind, content, createdAt }]` | `28000` |
| `companion_update_memory(p_memory_id uuid, p_content text)` | M3 | 1 ~ 500자 [제안] | `void` | `28000` · `22023` · `P0002` |
| `companion_delete_memory(p_memory_id uuid)` | M3 | — | `void`(지운 표시 `deleted_at`) | `28000` · `P0002` |
| `companion_get_wallet()` | M4 | — | `{ sub, subExpiresAt, grant, paid, trialRemaining }` | `28000` |

- ⟨2026-11-09⟩ 프로필 확장: `companion_save_profile`에 `p_proactive_pref`(`off` · `daily1` · `daily2`) · `p_proactive_hour`(0 ~ 23,
  `-1`이면 지움) · `p_timezone`(IANA, `''`이면 지움)을 더했다(기본값 `null` — 옛 호출은 그대로). `companion_load_profile`이
  `proactivePref` · `proactiveHour` · `timezone`을 더 돌려준다. 추천 답변 토글 `p_reply_suggestions`(기본 `true`, §2.6) — 읽기는
  `replySuggestions`. 운영자 `companion_operator_set_profile`도 같은 인수, `companion_inspect_testers`가 보여 준다.
- ⟨2026-11-09⟩ **`companion_list_memories`의 반환이 바뀌었다**(배열 → 객체, 앱이 아직 부르지 않아 계약 판은 그대로):
  `{ memories: [{ id, characterId, kind, content, userEdited, createdAt }], count, cap, full }` — 한 층(캐릭터 · 공유)의 기억과 용량
  (PRD §3.9). 계약 `companionMemoryListSchema` · `json-schema/companion-memories.json`. `companion_update_memory`가 `user_edited`를 켠다.
- 친밀도 수치는 어느 함수도 돌려주지 않는다.
- `unavailableReason`: `trial_exhausted` · `not_available`(M4 전 비시험 계정 · 아직 열리지 않은 캐릭터) · `age_restricted`.
- `l1`은 앱의 언어 선택 값을 앱이 넣는다(BCP 47 언어 태그, 예 `en` · `tl` · `hi`). `feedback_mode`: `separate` · `natural` · `prefix`.
  `age_source`: `self` · `social` · `store_signal`.
- **Message**(목록 한 줄)

```jsonc
{
  "id": "uuid",
  "role": "user",                         // "user" | "assistant" | "notice"
  "origin": "turn",                       // "turn" | "proactive" | "crisis"
  "status": "complete",                   // "complete" | "blocked" | "crisis" | "failed"
  "hidden": false,                        // 사후 출력 검사에 걸리면 true, segments는 비운다
  "text": "안녕하세요 저는 마리아 이에요",     // role=user일 때
  "inputMode": "text",
  "segments": [{ "kind": "speech", "text": "…" }],   // role=assistant일 때
  "notice": null,                         // role=notice일 때 { kind } — §4 notice와 같은 모양
  "feedback": null,                       // role=user일 때 §4 correction의 본문, 없으면 null
  "createdAt": "2026-11-08T09:00:00Z"
}
```

### 3.3 서버용 함수 (`public.companion_*`, service_role 전용)

| 함수 | 마일스톤 | 하는 일 |
|---|---|---|
| `companion_turn_gate(p_user_id, p_character_id, p_client_message_id, p_now)` | M1 | §2.1 판정 5 ~ 9를 한 번에 보고 결과 코드 · 대화 id · 연령대 · 지역 규칙을 돌려준다 |
| `companion_begin_turn(…)` | M1 | 대화가 없으면 만들고, 유저 메시지를 `status = 'pending'`으로 저장한다(멱등) |
| `companion_finish_turn(…)` | M1 | 캐릭터 메시지 · 상태 JSON 결과(친밀도 · 화제 상태)를 저장하고 유저 메시지 상태를 닫는다 |
| `companion_record_usage(p_user_id, p_now, p_seconds)` | M1 | 이용 시간 누적(§7 `usage_daily`) |
| `companion_record_notice(p_user_id, p_kind, p_now)` | M1 | AI 고지 · 휴식 알림 보낸 시각 |
| `companion_record_moderation(…)` | M1 | 가드레일 판정 기록 |
| `companion_learning_context(p_user_id)` | M1 | `learning_progress`의 `catalogProgress` → 해금 에피소드 · 학습 표현 목록 |
| `companion_turn_status(p_user_id, p_character_id, p_now)` | 2026-11-09 | 턴 시작 때 창 안 위반 수 · 상한 · 이 캐릭터 층 기억이 가득 찼는지(거절 단계 · `state.memoryFull`) |
| `companion_add_memories(…)` | M3 · 상한 2026-11-09 | 기억 추가 + 상한 밀어내기. 반환 `{ added, evicted, skipped, full }`(전에는 수) |
| `companion_suggest_context(p_user_id, p_character_id, p_history_limit, p_now)` · `companion_save_suggestions(…)` | 2026-11-09 | 추천 답변 판정 · 맥락 · 캐시 저장(§2.6) |
| `companion_reserve_credits` · `companion_settle_credits` · `companion_release_credits` | M4 | §6 |
| `companion_grant_credits` | M4 | §6.4 · §2.4 |
| `companion_expire_sub_credits(p_now)` | M4 | 구독 크레딧 소멸(pg_cron) |

- `learning_progress`는 RLS를 켜고 정책이 없어 본인 RPC로만 읽힌다. `companion_learning_context`는 `security definer`로 그 표를 읽는다.
- §6에서 접두사 없이 부른 이름(`reserve_credits` 등)은 이 표의 `public.companion_*` 함수다.
- 앱 사용자가 이 함수를 부르면 `42501`이다 — 통합 테스트가 함수마다 고정한다.

### 3.4 운영 조회 함수 (`public.companion_inspect_*`, service_role 전용)

ops-dashboard 컴패니언 탭이 부른다. ops-dashboard는 서버에서 돌고 서버 키를 가지므로 §3.3과 같은 등급 · 같은 HTTP RPC 길이다.
`companion` 스키마를 노출하지 않으니 대시보드도 표를 직접 읽지 않는다. 전부 **읽기만** 한다.

| 함수 | 마일스톤 | 돌려주는 것 |
|---|---|---|
| `companion_inspect_testers()` | M1 | 시험 계정 목록(`userId` · `email` · `ageBand` · `l1`) — 플레이그라운드가 고를 계정 |
| `companion_inspect_conversation(p_user_id, p_character_id, p_before, p_limit)` | M1 | 메시지(최신부터) · 각 턴의 판정 기록 · 신고 · 보낸 고지. 커서는 앱용 `companion_list_messages`와 같다 |
| `companion_inspect_moderation(p_since, p_outcome, p_limit)` | M1 | 기간 안의 판정(차단 · 위기 · 비동기 검사 실패)을 최신부터. `p_outcome`이 null이면 전부 |
| `companion_inspect_reports(p_since, p_limit)` | M1 | 메시지 신고와 신고된 메시지 앞뒤 턴 |
| `companion_inspect_memory(p_user_id, p_character_id)` | M3 | 장기 메모리 항목(지운 항목 제외)과 요약 · 용량 `capacity { character, shared }`(2026-11-09) |
| `companion_inspect_wallet(p_user_id, p_limit)` | M4 | 지갑 잔액 · 최근 원장 · 열린 예약 |

- 미성년자 대화도 보인다. 조회 기록을 남길지(누가 언제 어느 유저를 봤나)는 M1 구현 때 정한다 — [제안] `companion.inspect_log`에 남긴다.
- 반환 모양은 계약 패키지의 `json-schema/`에 함께 싣는다(§8.2).

## 4. SSE 이벤트

### 4.1 형식

```text
event: delta
id: 7
data: {"segment":0,"kind":"speech","text":"안녕하세요, "}

```

- `Content-Type: text/event-stream; charset=utf-8`. 이벤트마다 `event` · `id`(턴 안에서 0부터 1씩) · `data`(JSON 한 줄).
- 15초 동안 보낼 이벤트가 없으면 주석 줄 `: ping`을 보낸다(중간 프록시가 연결을 끊지 않게).
- **재연결로 이어 받기는 없다**(`Last-Event-ID` 미지원). 끊기면 메시지 목록으로 결과를 받는다.

### 4.2 이벤트

| 이벤트 | 마일스톤 | `data` | 횟수 |
|---|---|---|---|
| `start` | M1 | `{ contractVersion, conversationId, userMessageId, assistantMessageId, speechLevel }` | 정확히 1, 맨 앞 |
| `notice` | M1 | `{ kind }` — `ai_disclosure` · `minor_notice` · `break_reminder` | 0 ~ 3, `delta`보다 앞 |
| `delta` | M1 | `{ segment, kind, text }` — `segment`는 조각 번호(0부터), `kind`는 `speech` · `action` · `narration`, `text`는 이어 붙일 글자 | 0 ~ n |
| `correction` | M2 | 아래 | M2부터 유저 메시지당 정확히 1(차단 · 위기 턴은 0) |
| `translation` | 2026-11-09 | `{ segment, text }` — 조각의 모국어 번역. 메시지 목록에서는 조각의 `translation` | 조각당 0 ~ 1(번역 끔 · `ko` · 실패면 0), 마지막 `delta` 뒤 `state` 앞 |
| `state` | M1 | `{ speechLevel, speechLevelChanged, memoryFull }` — `memoryFull`은 턴 시작 때 이 캐릭터 층이 가득 찼는지(PRD §3.9) | 정상 턴에서 정확히 1, `done` 바로 앞 |
| `crisis` | M1 | `{ resources: [{ name, phone?, url?, hours? }], region }` — 안내 글은 O15 | 위기 턴에서 1, 그 뒤 `done` |
| `error` | M1 | `{ code, retryable }` | 0 ~ 1, **마지막**(뒤에 `done` 없음) |
| `done` | M1 | `{ assistantMessageId, creditsSpent, balance }` — `balance`는 M4 전 `null` | 정상 · 위기 턴에서 정확히 1, 마지막 |

**`correction` data**

```jsonc
{
  "userMessageId": "uuid",
  "status": "ok",                          // "ok" | "none"(고칠 것 없음) | "unavailable"(생성 실패 · 시간 초과)
  "kind": "correction",                    // "correction" | "better" | "l1_to_ko", status=ok일 때
  "items": [                               // kind=correction
    { "original": "마리아 이에요", "corrected": "마리아예요", "reason": "…(l1)" }
  ],
  "better": { "text": "…", "meaning": "…(l1)", "explanation": "…(l1)" },   // 선택
  "l1ToKo": { "text": "…", "meaning": "…(l1)" }                            // kind=l1_to_ko
}
```

**[결정 2026-11-09] 고정 카드** — 위 모양을 아래로 바꿨다(`feat/companion-m1`, 마이그레이션 `20261116120000_companion_feedback_card.sql`).
칸은 늘 다 오고 없으면 `null` · `[]`다. `l1ToKo`는 없어지고 `l1_to_ko`도 `corrected` · `meaning`을 쓴다. 저장은 `corrections.card`
(옛 행은 읽을 때 카드로 바꾼다). 메시지 목록의 `feedback`도 같은 카드다. 앱이 피드백을 쓰기 전이라 계약 판은 `1` 그대로다.

```jsonc
{
  "userMessageId": "uuid",
  "status": "ok",                          // "ok" | "none" | "unavailable"
  "kind": "correction",                    // "correction" | "better" | "l1_to_ko" | null(status≠ok)
  "original": "안녕하세요 저는 마리아 이에요",   // 학습자 메시지(서버가 채운다)
  "corrected": "안녕하세요, 저는 마리아예요.",   // 올바른 문장 전체. status≠ok면 null
  "items": [                               // 고친 곳마다. l1_to_ko는 []
    { "original": "마리아 이에요", "corrected": "마리아예요", "reason": "…(l1)" }
  ],
  "better": { "text": "…", "meaning": "…(l1)", "explanation": "…(l1)" },   // 더 나은 표현, 없으면 null
  "meaning": "…(l1)"                       // corrected의 뜻. l1_to_ko는 필수, 그 밖은 선택
}
```

### 4.3 순서 규칙

1. `start`가 맨 앞이다.
2. `notice`는 첫 `delta`보다 앞이다.
3. `delta`의 `segment`는 0부터 늘어나기만 한다. 한 조각의 글자는 여러 `delta`로 나뉘어 올 수 있다.
4. `correction`은 `start` 뒤 `done` 앞 어디든 온다(`delta` 사이 포함).
5. `state`는 `done` 바로 앞이다. `translation`은 마지막 `delta` 뒤 · `state` 앞이다(2026-11-09).
6. 스트림의 끝은 `done` 또는 `error` 하나다. 둘 다 오지 않고 연결이 끊기면 앱은 실패로 보지 말고 메시지 목록을 다시 읽는다
   (서버는 턴을 끝까지 처리한다, §2.1).
7. 위기 턴: `start` → (`notice`) → `crisis` → `done`(`creditsSpent: 0`). `delta`가 없다.
8. 입력 검사 차단 턴(2026-11-09): 문턱 전이면 거절 턴 — `start` → (`notice`) → `delta` × n → `translation` → `state` → `done`
   (`creditsSpent: 0`, `refusal: { stage: "deflect" | "warn" }`). `correction`은 없다. 문턱이면 `start` → `error`(`guardrail_blocked`).
9. 동기 출력 검사에 걸린 턴: `delta` 없이 `error`(`guardrail_blocked`). 비동기 검사는 스트림에 영향이 없다(§2.1).

## 5. 에러 코드

| 코드 | 어디서 | HTTP | `retryable` | `detail` | 뜻 |
|---|---|---|---|---|---|
| `method_not_allowed` | 사전 | 405 | 아니오 | — | |
| `invalid_session` | 사전 | 401 | 아니오 | — | 토큰 없음 · 만료 · 무효. 앱은 토큰을 갱신한 뒤 같은 `client_message_id`로 다시 보낼 수 있다 |
| `invalid_request` | 사전 | 400 | 아니오 | `{ field }` | 본문 모양 · 길이 위반 |
| `unsupported_contract_version` | 사전 | 400 | 아니오 | `{ supported: [1] }` | |
| `not_available` | 사전 | 403 | 아니오 | — | M4 전 비시험 계정 · 열리지 않은 캐릭터 |
| `character_not_found` | 사전 | 404 | 아니오 | — | |
| `age_restricted` | 사전 | 403 | 아니오 | `{ reason }` — `guardian_consent_required` | 연령 제한 [제안] |
| `temporarily_blocked` | 사전 | 403 | 아니오 | `{ until }` | 반복 위반 일시 차단(M3) |
| `usage_time_limit` | 사전 | 403 | 아니오 | `{ limit: "daily" \| "continuous", resetsAt }` | 이용 시간 상한 |
| `duplicate_message` | 사전 | 409 | 아니오 | `{ messageId, messageStatus }` | 이미 처리된 메시지 |
| `turn_in_progress` | 사전 | 409 | 예(잠시 뒤) | — | 같은 대화에 진행 중인 턴 |
| `not_latest_message` | 사전 | 409 | 아니오 | — | 고쳐서 다시 보내기(`replaces_message_id`)의 메시지가 마지막 유저 메시지가 아님 — 그 뒤에 다른 메시지(선톡 등)가 왔다(2026-11-10, §2.8) |
| `trial_exhausted` | 사전 | 402 | 아니오 | `{ characterId }` | 덕수쌤 체험 한도(M4) |
| `insufficient_credits` | 사전 | 402 | 아니오 | `{ required, balance }` | 크레딧 부족(M4) |
| `rate_limited` | 사전 | 429 | 예 | `{ retryAfterSeconds }` | 짧은 시간에 너무 많은 요청 [제안 — 값은 설정] |
| `server_misconfigured` | 사전 | 500 | 아니오 | — | 서버 설정 누락 |
| `internal_error` | 사전 · 스트림 | 500 · — | 예 | — | 예상하지 못한 서버 오류. 예약 해제 |
| `guardrail_blocked` | 스트림 | — | 아니오 | — | 입력 검사 · 동기 출력 검사 차단. 차감 없음 [제안] |
| `upstream_unavailable` | 스트림 | — | 예 | — | LLM 실패 · 시간 초과. 차감 없음 |

- **위기 프로토콜은 에러가 아니다** — `crisis` 이벤트로 오고 `done`으로 끝난다(§4). 입력 검사가 위기를 잡으면 메인 LLM을 부르지
  않는다.
- 창구 함수의 오류는 Postgres 오류 코드(`28000` · `22023` · `P0002`)이고 PostgREST가 HTTP로 바꾼다. 앱의 기존 RPC와 같다.

## 6. 크레딧 (M4)

### 6.1 흐름 — 예약 → 확정 / 해제

```text
chat-send 판정 11  reserve_credits(user, client_message_id, amount)   → hold 행 생성, 잔액에서 뺌
정상 · 답변 전달    settle_credits(hold)                               → 원장에 spend 기록, hold 닫음
차단 · 위기 · 실패  release_credits(hold)                              → 잔액에 되돌림, hold 닫음
```

- 예약 시점에 잔액을 빼 두므로, 진행 중인 턴이 있어도 잔액이 음수가 되지 않는다.
- 닫히지 않은 hold(서버가 중간에 죽은 경우)는 pg_cron 정리 작업이 제한 시간 뒤 해제한다. 유저 메시지 상태는 `failed`가 된다.
- 단가 `amount`는 설정 값이다(O1). M4 전에는 이 흐름을 건너뛴다.

### 6.2 트랜잭션 함수 규칙

- `reserve_credits`는 한 트랜잭션에서 ① 지갑 행을 `select … for update`로 잠그고 ② `(user_id, client_message_id)` hold가 이미
  있으면 그 hold를 그대로 돌려주고(멱등) ③ 버킷 순서대로 잔액을 확인해 빼고 ④ hold와 원장(`reserve`)을 쓴다. 잔액이 모자라면
  아무것도 쓰지 않고 `insufficient_credits`.
- 버킷 순서는 정하지 않는다(O2). 함수는 순서를 설정으로 받는다.
- `settle` · `release`는 hold 상태가 `open`일 때만 동작하고, 이미 닫혔으면 아무것도 하지 않고 성공한다(멱등).
- 원장은 지우거나 고치지 않는다(추가만). 지갑 잔액 = 원장 합계가 늘 성립한다 — 통합 테스트가 고정한다.
- 체험 사용량(`trial_usage`)도 같은 트랜잭션에서 `client_message_id` 기준으로 센다. 해제되면 되돌린다.

### 6.3 재시도

| 상황 | 앱이 할 일 | 서버 |
|---|---|---|
| `start` 전에 네트워크 실패 · 5xx | 같은 `client_message_id`로 다시 보낸다 | 메시지가 없으면 새로, 있으면 판정 9 |
| `start` 뒤 연결이 끊김 | 다시 보내지 말고 메시지 목록을 읽는다 | 턴을 끝까지 처리한다 |
| `duplicate_message` | 메시지 목록을 읽는다 | 아무것도 하지 않는다 |
| 메시지 상태가 `failed` | 같은 `client_message_id`로 다시 보낼 수 있다 | 같은 유저 메시지로 턴을 다시 돌린다. 앞 hold는 이미 해제됐다 |
| `turn_in_progress` · `rate_limited` | 잠시 뒤 다시 | — |
| `not_latest_message` | 메시지 목록을 다시 읽고 고치기를 닫는다(고친 글은 입력창에 남긴다) | 아무것도 숨기지 않는다 |
| `invalid_session` | 토큰 갱신 뒤 같은 id로 다시 | — |

### 6.4 지급

- `grant_credits(p_user_id, p_bucket, p_amount, p_reason, p_ref_id, p_expires_at)` — `p_bucket`은 `sub` · `grant` · `paid`,
  `p_reason`은 `subscription` · `purchase` · `signup` · `operator`. `(p_reason, p_ref_id)`가 고유해서 같은 영수증을 두 번 지급하지
  않는다.
- 구독 크레딧은 `p_expires_at`에 소멸한다(`expire_sub_credits`). 구매분은 1년 유지(위키 01) — 만료 시각을 지급 행에 적는다.
- 시험 계정의 크레딧은 운영자가 `operator`로 지급한다.

## 7. DB — `companion` 스키마 (1단계)

모든 표: RLS on · 정책 없음 · `revoke all on table … from anon, authenticated`. 사용자에 걸린 표는
`references auth.users (id) on delete cascade`다 — 계정을 지우면 함께 지워진다 [제안 — O16].

| 표 | 마일스톤 | 열(요지) | 비고 |
|---|---|---|---|
| `expressions` | M0 | `id` text PK(`voca:` · `expr:` · `patt:` · `gram:` · `nume:` — 배포 콘텐츠에서 관찰한 다섯) · `kind` · `surface` · `roman` · `gloss_en` · `grade` · `lemma`(null 허용, 태깅은 뒤로) · `first_episode` · `retired` · `updated_at` | 사용자 데이터가 아니다. 빌드 스크립트가 upsert. id 재사용 금지 |
| `expression_units` | M0 | PK(`expression_id`, `episode_id`, `unit_key`) | [제안] 위키 초안의 `episodes[]`를 대신한다(PRD §3.7) |
| `profiles` | M0 | `user_id` PK · `birth_year` · `age_source` · `l1` · `feedback_mode` · `updated_at` | 연령대는 읽을 때 계산. 생년은 개인정보 |
| `characters` | M1 | `id` text PK · `bible_version` · `persona` jsonb · `active` · `sort_order` | `bible.yaml` `companion:` 빌드 결과 |
| `relationships` | M1(말투 고정) · M3(친밀도) | PK(`user_id`, `character_id`) · `intimacy`(숨김) · `speech_level` · `updated_at` | |
| `conversations` | M1 | `id` · `user_id` · `character_id` · `kind`(`companion`만, 2단계에 `mission`) · `topic_state` jsonb · `rolling_summary` · `summarized_until` · `last_message_at` · 고유(`user_id`, `character_id`) where `kind = 'companion'` | [제안] 캐릭터당 하나(O14) |
| `messages` | M1 | `id` · `conversation_id` · `user_id` · `role` · `origin` · `status` · `client_message_id`(고유: `user_id`와 함께) · `text` · `input_mode` · `segments` jsonb · `hidden` · `credits_spent` · `meta` jsonb(모델 · 토큰 · 지연 · 넣은 학습 표현) · `created_at` | `meta`는 앱에 돌려주지 않는다 |
| `corrections` | M2 | `message_id` PK(유저 메시지) · `status` · `kind` · `items` jsonb · `better` jsonb · `l1_to_ko` jsonb · `created_at` | |
| `usage_daily` | M1 | PK(`user_id`, `day`) · `active_seconds` · `turns` · `continuous_started_at` · `last_activity_at` | 이용 시간 상한. 시간은 턴 사이 간격으로 센다 — 간격이 설정 값보다 길면 연속 사용이 끊긴 것으로 본다 |
| `notice_state` | M1 | `user_id` PK · `last_ai_disclosure_at` · `last_break_reminder_at` | 3시간 고지 |
| `moderation_events` | M1 | `id` · `user_id` · `message_id` · `layer`(`input` · `output_sync` · `output_async`) · `category` · `action`(`allow` · `block` · `crisis` · `hide`) · `created_at` | 위기 건수 보고의 근거 |
| `message_reports` | M1 | `id` · `message_id` · `user_id` · `reason` · `created_at` · 고유(`message_id`, `user_id`) | |
| `moderation_state` | M3 | `user_id` PK · `strikes` · `blocked_until` | 반복 위반 단계 제재 |
| `memories` | M3 | `id` · `user_id` · `character_id`(null = 공유) · `kind`(`fact` · `event` · `summary`) · `content` · `embedding vector(차원 미정)` · `source_message_id` · `deleted_at` · `created_at` | 차원은 임베딩 모델과 함께(C) |
| `credit_wallets` | M4 | `user_id` PK · `sub_balance` · `sub_expires_at` · `grant_balance` · `paid_balance` · `updated_at` | 잔액은 0 이상 CHECK |
| `credit_ledger` | M4 | `id` · `user_id` · `delta` · `bucket` · `kind`(`grant` · `reserve` · `settle` · `release` · `expire`) · `reason` · `ref_id` · `created_at` | 추가만 |
| `credit_holds` | M4 | `id` · `user_id` · `client_message_id`(고유: `user_id`와 함께) · `amount` · `buckets` jsonb · `status`(`open` · `settled` · `released`) · `created_at` · `closed_at` | |
| `trial_usage` | M4 | PK(`user_id`, `character_id`) · `used` | |
| `entitlements` | M4 | `user_id` PK · `tier` · `expires_at` · `source` | 결제 작업이 채운다(§2.4) |

**2026-11-09 구현에서 바뀐 칸**

| 표 | 바뀐 것 |
|---|---|
| `settings`(새 표, 한 행) | 단가 · 체험 수 · 문턱 · 상한 같은 설정 값(구현 메모). 선톡 `proactive_daily_cap` 2 · `proactive_gap` · `proactive_gap_daily2` · `proactive_spacing`. `memory_cap`(50, 유저 × 캐릭터) · `shared_memory_cap`(30, 유저) |
| `profiles` | `proactive_pref`(기본 `daily1`) · `proactive_hour` · `timezone` · `reply_suggestions`(기본 `true`) |
| `corrections` | `card` jsonb — 고정 카드 전체(§4.2). 옛 열(`status` · `kind` · `items` · `better`)은 찾아보기용으로 함께 쓴다 |
| `messages` | `segments[].translation`(L1 번역) · `meta.translation`(번역 결과 이유) · `suggestions` jsonb(추천 답변 캐시) · 거절 답 `meta.refusal` · `refusalStage` · `refusalCategory` · `refusalSource` |
| `memories` | `embedding` 열 없음(pgvector 미룸) · `user_edited`(유저가 고침 — 용량 밀어내기에서 지킴) |
| `moderation_events` | `category` 값에 `profanity`(열은 글자 — 표 변경 없음) |

**1단계에 넣지 않는 위키 초안 표**: `mission_results`(2단계) · `item_attempts` · `user_expressions`(채팅 완료 뒤) ·
`roleplay_turn_logs`(별도 FE 작업). 위키 05의 `learner_profiles` 확장은 `profiles`가 대신한다(PRD 비고 3).

**보관**: 대화 보관 기간은 정하지 않는다(O16). 녹음 원본은 받지 않는다.

**확장**: `pgmq` · `pg_cron` · `pg_net`(이미 켬) · `vector`(M3). 확장을 켜는 일은 운영 프로젝트 작업이라 마일스톤마다 확인한다.

## 8. `packages/companion-contract` 계획 (M0)

### 8.1 구조

```text
packages/companion-contract/
  package.json            @libitums/companion-contract, exports로 진입점 명시, 의존성은 zod 4.6.5 하나
  src/
    version.ts            CONTRACT_VERSION = 1
    chat-send.ts          요청 스키마 · 사전 오류 본문 스키마
    sse-events.ts         이벤트 9종의 판별 유니온 · 순서 검사기(순수 함수)
    error-codes.ts        §5의 코드 목록과 HTTP 상태 · retryable
    rpc.ts                창구 함수 인수 · 반환 스키마(Message 포함)
    sse-parse.ts          SSE 텍스트 → 이벤트 목록(순수 함수, fixture 재생과 앱 수신이 같이 쓴다)
  fixtures.ts             §9의 재생용 fixture 입구(`@libitums/companion-contract/fixtures`)
  fixtures-streams.ts     턴 스트림 fixture — 이벤트를 타입으로 적고 SSE 글자로 바꾼다
  json-schema/            JSON Schema 산출물(생성물, 커밋한다)
```

- zod 버전은 앱 · `episode-core`와 같은 `4.6.5`다. JSON Schema는 zod 4의 `z.toJSONSchema`로 만든다.
- 패키지는 Lynx · Deno · Node 어느 것에도 기대지 않는 순수 TypeScript다.

### 8.2 소비자

| 소비자 | 방법 |
|---|---|
| `apps/mobile` | `workspace:*`로 import(code.md 「import」) |
| `apps/supabase-functions` | [제안] **생성 사본** `supabase/functions/_shared/companion-contract/`. 패키지 스크립트가 복사하고, 정본과 사본이 다르면 테스트가 실패한다(`bundle:android` 사본 + 동기화 테스트와 같은 방식). 사본의 `zod`는 함수 폴더의 import map으로 `npm:zod@4.6.5`에 잇는다. Supabase 배포가 `supabase/functions` 밖 파일을 싣는다고 기대하지 않기 위해서다 |
| ops-dashboard(Python) | 패키지에 **커밋한** `json-schema/*.json`을 읽는다(M0에서 정함 — 스키마와 다르면 테스트가 실패한다). 운영 조회 함수(§3.4)도 서버 키 HTTP RPC로 부른다 |

- 이 공유는 `docs/conventions/code.md`의 「Edge Function은 앱과 코드를 나누지 않는다」와 부딪힌다. 컴패니언 계약 한정 예외를 ADR
  후보 5와 함께 규약에 넣는다(PRD §9).
- `tsconfig`의 `types: []`(Node 전역 금지)를 사본이 지켜야 한다 — 패키지도 웹 표준만 쓴다.

### 8.3 바꿀 때

- 계약을 바꾸는 PR은 정본 · 사본 · fixture · JSON Schema를 같이 바꾼다. 하나라도 빠지면 테스트가 실패한다.
- `CONTRACT_VERSION`을 올리는 기준은 §1.3이다.

## 9. mock fixture

FE가 네트워크 없이 재생한다. **파일이 아니라 TS 모듈**이다(2026-11-08 구현 때 바꿨다) — Lynx 앱은 실행 중에 레포의 파일을 읽지
못하고 import한 코드만 싣기 때문이다. `import { turnFixtureText, errorFixtures, messagesPageFixture } from "@libitums/companion-contract/fixtures"`.
턴 스트림은 이벤트를 타입으로 적고 `formatSseEvent`로 SSE 글자를 만들어, 계약이 바뀌었는데 fixture를 고치지 않으면 타입 검사가
먼저 실패한다. 아래 표의 이름이 fixture 키다.

| 파일 | 내용 | 마일스톤 |
|---|---|---|
| `turn-normal` | `start` → `notice`(`ai_disclosure`) → `delta` 여러 조각(대사 · 지문 · 나레이션) → `correction`(`none`) → `state` → `done` | M0 |
| `turn-with-correction` | 조각 사이에 `correction`(`kind: correction`, 항목 둘 + `better`)이 끼어 오는 스트림 | M0 |
| `turn-l1-to-ko` | 모국어 입력에 `correction`(`kind: l1_to_ko`) | M0 |
| `turn-speech-level-up` | `state.speechLevelChanged: true`(`polite → casual`) | M0 |
| `turn-correction-unavailable` | 답변 정상 · `correction`(`unavailable`) | M0 |
| `error-insufficient-credits` | 402 사전 오류 | M0 |
| `error-trial-exhausted` | 402 사전 오류 | M0 |
| `error-usage-time-limit` | 403 사전 오류 + `resetsAt` | M0 |
| `error-age-restricted` | 403 사전 오류 | M0 |
| `turn-guardrail-blocked` | `start` → `error`(`guardrail_blocked`) | M0 |
| `turn-crisis` | `start` → `crisis`(상담 기관 예시 — 실제 번호가 아닌 자리표시자) → `done`(`creditsSpent: 0`) | M0 |
| `turn-upstream-error` | 조각 몇 개 뒤 `error`(`upstream_unavailable`) | M0 |
| `messagesPageFixture` | `companion_list_messages` 응답(유저 · 캐릭터 · 피드백 · 숨김 · 위기 · 선톡 메시지 포함) | M0 |

- 사용자가 요청한 다섯(정상 · 교정 포함 · 크레딧 부족 · 차단 · 위기 프로토콜)에 상한 · 연령 · 실패 경로를 더했다.
- 재생 속도(조각 간격)는 fixture에 넣지 않는다. 재생하는 쪽이 정한다.
- 모든 fixture는 계약 스키마와 순서 규칙(§4.3)을 통과한다 — 단위 테스트가 지킨다.
- 위기 fixture의 상담 기관은 자리표시자다. 실제 목록은 PRD §8 C에서 정한다.

## 10. 테스트 계층

`apps/supabase-functions`의 기존 방식을 그대로 쓴다(Deno 불필요 — Node의 vitest · tsc가 같은 코드를 돈다).

| 계층 | 무엇 | 예 |
|---|---|---|
| 단위(`*.unit.test.ts`) | `_shared/`의 순수 로직 | 판정 순서 · SSE 직렬화 · 상태 JSON 해석 · 분기 규칙 · 연령대 계산 · fixture가 스키마를 통과하는가 |
| 통합 — DB(`supabase/migrations/*.integration.test.ts`, embedded-postgres) | 마이그레이션 · 권한 · 함수 | `anon` · `authenticated`가 `companion` 표에 닿지 못함 · 창구 함수의 계정 격리 · 크레딧 두 연결 경합 · 멱등 · 원장 = 잔액 · 캐릭터별 메모리 격리 |
| 통합 — 핸들러(`*-handler.integration.test.ts`) | `chat-send` 전체를 가짜 LLM으로 | 이벤트 순서 · 사전 오류 코드 · 차단 · 위기 · 끊긴 연결 뒤 저장 · 실패 뒤 재시도 |
| LLM 평가 | 실제 모델 | PRD §6. `pnpm verify` 밖이다(외부 호출 · 비용) — 실행 명령과 결과 위치는 M1에서 정한다 |

## 비고

- 위키와 저장소가 어긋나는 점은 [PRD 비고](ai-companion.md#비고--위키와-저장소가-어긋나는-점-2026-11-08)가 진다.
- 배포는 기존 함수처럼 사람이 로컬에서 한다. 운영 DB에서 개발하므로 `supabase db push` 전에 `main`의 다른 미배포 마이그레이션이
  같이 올라가지 않는지 확인한다(위키 05, 2026-11-08).

## 구현 메모 — M1 ~ M4 MVP에서 명세와 다르게 간 것 (2026-11-09, `feat/companion-m1`)

리뷰에서 그대로 둘지 정한다. 코드 쪽 정본은 `apps/supabase-functions/README.md` 「AI 컴패니언」.

| 명세 | 구현 | 이유 |
|---|---|---|
| 서버 설정 값(단가 · 체험 수 · 문턱 · 확률 · 상한)은 「설정 값」 | DB 한 행 `companion.settings` — SQL로 바꾸면 다음 턴부터. 분기 확률 · 쿨다운만 코드 상수(`companion-branching.ts`) | 배포 없이 깎기(C). 값은 전부 초안 |
| 판정 10 · 11 → 12(저장) | 체험 · 크레딧 예약과 유저 메시지 저장을 `companion_begin_turn` 한 트랜잭션에. 확정 · 해제도 `companion_finish_turn` 안에서 | RPC 왕복을 줄이고, 예약만 남고 메시지가 없는 상태를 없앤다 |
| 후처리는 pgmq 큐 + `companion-job-worker` | 턴이 끝난 뒤 같은 요청에서 `waitUntil`로 기억 추출 · 요약 | MVP. 재시도가 필요해지면 큐로 옮긴다. 성인 사후 출력 검사는 아직 없다 — **2026-11-09 결정: 미룸**(PRD §3.11 · O21) |
| 장기 메모리 의미 검색은 pgvector | 최근 기억 N개(`memory_prompt_limit`)를 넣는다 | 임베딩 모델 미정(C). `embedding` 열은 모델을 고른 뒤 더한다 — **2026-11-09 결정: 미룸**. 용량 상한 `memory_cap` · `shared_memory_cap`(PRD §3.9) |
| 티어 | `free` · `premium` 둘. 무료는 체험 캐릭터(덕수쌤)만 — 체험을 다 쓰면 크레딧이 있을 때만 이어진다 | O2 · O3 전 초안 |
| 말투 단계 상한 | 페르소나의 `maxSpeechLevel`(bible.yaml register에서): 윤경 · 재민 · 덕수쌤 polite, 도윤 casual, 미나 slang | bible이 「끝까지 존댓말」을 정한 인물이 있다 |
| 선톡 푸시 | 메시지만 저장. 푸시는 `send-push` 목적지 추가 뒤 | §2.3 그대로 M3 남은 일 — 세현님 인계(§2.3.1) |
| 반복 위반 단계(회피 → 경고 → 차단) | 입력 차단만 세어 창(24시간) 안 3회면 30분 차단. 경고 이벤트는 없다(회피는 페르소나 프롬프트) | 계약에 경고 이벤트가 없다. 회피 · 경고는 **페르소나 거절**로 만들었다(§2.1 · `done.refusal`) |
| 모델 하나(설정 값) | 단계별 환경 변수 — 답변 · 피드백 Sonnet, 검사 · 기억 · 요약 · 번역 Haiku. Haiku 호출에는 서버 쪽 대체 모델을 싣지 않는다 | 원가 · 지연(PRD §3.14, ADR-0116 초안) |
| `translation` 미정(O9) | 턴마다 답 뒤 따로 호출, 6초 · 실패해도 턴은 정상 | PRD §3.4 · §2.1 |
| `correction` kind별 모양 | 고정 카드(§4.2) · 피드백에 최근 6메시지 · 말투 · 캐릭터 맥락 | PRD §3.5 |
| 검사 분류 | `profanity` 추가, 언어 무관. 캐릭터를 겨냥한 심한 욕만 차단, 혼잣말 욕은 피드백 | PRD §3.11 |
| 선톡 하루 상한 · 공백 | 유저별 빈도 · 선호 시각 · 시간대 · 조용한 시간, 전체 상한 2, 매시간 유저당 후보 하나 | PRD §3.8 · §2.3 |
| — | 추천 답변 `companion-suggest` · 평가 창구 `companion-eval` | §2.6 · §2.7 |
| 운영 반영은 `db push` | 컴패니언 마이그레이션은 SQL 편집기로 적용, `schema_migrations` 미기록(일부러) | 기록 맞추기는 세현님 결정(PRD §7 위험 5) |
| — | 운영자 함수 `companion_operator_set_profile` · `companion_operator_reset` · `companion_set_entitlement` · `companion_inspect_memory` · `companion_inspect_wallet`, Edge Function `companion-proactive`(서버 키, `force`는 공백 · 상한만 건너뜀) | 플레이그라운드 |
