# ADR-0114 — 컴패니언 DB에는 `public.companion_*` 함수로만 닿는다 (앱용은 `authenticated`, 서버용은 `service_role`)

- 상태: **제안** — FE 팀 리뷰 대기. M0의 `public.companion_load_profile` · `public.companion_save_profile`이 이 결정대로 쓰였다.
- 날짜: (채택일에 적는다)
- 다루는 축: 앱과 서버(Edge Function)가 `companion` 스키마([ADR-0112](0112-companion-schema.md))의 데이터를 **어떤 길로** 읽고 쓰는가, 그 길의 **권한**을 어떻게 나누는가.
  **다루지 않는 것**: 함수 하나하나의 인자 · 반환(→ [API 명세 §3](../specs/ai-companion-api.md)) · 크레딧 계산 규칙(→ API 명세 §6).
- 이어받는 결정: 기존 RPC 관행 — 표는 RLS + 권한 회수, 앱은 `security definer` 함수로만([ADR-0059](0059-learner-profile.md) 등) · 서버 전용 함수를 `service_role`에게만 여는 선례(`public.reengagement_devices` — `send-push`가 부른다).

근거 표시: **[코드]** 저장소 코드 · **[사용자]** 사용자 결정 · **[추론]** 관찰 없이 이어 붙인 것.

## 맥락

1. **`companion` 스키마는 PostgREST에 노출하지 않는다** [ADR-0112 D1]. 앱이 `/rest/v1/rpc/…`로 부를 수 있는 함수는 노출된 스키마(`public`)에 있어야 한다.
2. **기존 앱도 이미 함수로만 DB에 닿는다** [코드 — `learner_profiles` 등]. 표 권한은 걷혀 있고 `security definer` + `set search_path = ''` 함수가 `auth.uid()`로 자기 행만 다룬다.
3. **크레딧은 「예약 → 확정/반환」이 한 트랜잭션이어야 한다** [API 명세 §6]. 잔액 확인과 차감 사이에 다른 요청이 끼면 두 번 쓰인다. DB 함수 하나 안에서 행을 잠그면 Edge Function 쪽에 트랜잭션 코드가 없어도 된다.
4. **Edge Function이 DB에 직접 연결하면** 연결 문자열 비밀이 하나 더 생기고, 함수 인스턴스마다 연결이 열린다 [추론]. HTTP RPC는 기존 `send-push`와 같은 길이다.
5. **사용자 결정** [사용자 — 2026-11-09 「2번 권장안대로 진행」]: 서버도 직접 연결하지 않고 `service_role` 전용 `public.companion_*` 함수를 HTTP RPC로 부른다.

## 결정

### D1. 길은 하나 — `public.companion_*` 함수

- 앱과 서버 모두 `companion` 스키마의 표를 직접 읽거나 쓰지 않는다. 표에 닿는 코드는 `public.companion_*` 함수 안에만 있다.
- 함수는 전부 `security definer` · `set search_path = ''` · 표 이름은 `companion.` 접두사로 완전히 적는다.
- 잘못된 입력은 `22023`, 로그인 안 됨은 `28000`, 권한 없음은 `42501`로 끝난다.

### D2. 두 등급 — 앱용과 서버용

| 등급 | 누가 부르나 | 권한 | 예 |
|---|---|---|---|
| 앱용 | 로그인한 앱(사용자 토큰) | `grant execute … to authenticated` · `auth.uid()`의 행만 | `companion_load_profile` · `companion_save_profile` · `companion_list_messages` · `companion_get_wallet` |
| 서버용 | Edge Function(서버 키) | `service_role`에게만 · `public` · `anon` · `authenticated`에서 걷음 | `companion_turn_gate` · `companion_reserve_credits` · `companion_settle_credits` · `companion_record_moderation` |

- 서버용 함수는 사용자 id를 **인자로** 받는다 — Edge Function이 토큰을 먼저 검증하고 넘긴다. 앱 토큰으로 부르면 `42501`이다.
- 크레딧처럼 여러 표를 함께 바꾸는 일은 서버용 함수 **하나**가 한 트랜잭션으로 한다(맥락 3).

### D3. 예외 하나 — 운영자가 SQL 편집기에서 돌리는 함수

- `companion.sync_expressions`(학습 표현 사본 갱신)는 앱도 Edge Function도 부르지 않는다. 운영자가 배포 스크립트의 SQL을 편집기에 붙여 돌린다 — 그래서 노출하지 않는 `companion` 스키마에 둔다. 실행 권한은 `service_role`뿐이다.

## 버린 대안

- **`companion` 스키마를 노출하고 RLS 정책으로 연다** — 표가 곧 API가 되어 칸 하나를 바꿀 때마다 앱 계약이 바뀐다. 정책 실수가 곧 노출이고, 크레딧 같은 트랜잭션은 결국 함수가 필요하다.
- **Edge Function이 DB에 직접 연결(postgres 드라이버)** — 맥락 4. 비밀 하나 · 연결 관리 하나가 늘고, 앱용 함수와 다른 길이 생겨 권한 검토가 둘이 된다.
- **앱도 Edge Function을 거쳐서만** — 프로필 읽기 같은 단순 조회까지 함수 배포가 필요해진다. 단순 조회는 앱용 RPC가 기존 관행이다.

## 대가

- 조회 하나에도 함수 하나 · 마이그레이션 하나가 필요하다.
- 서버용 함수의 사용자 확인 책임이 Edge Function에 있다 — 토큰 검증을 빼먹으면 남의 행에 닿는다. 함수 테스트가 `42501`(앱 토큰)과 정상(서버 키)을 함께 본다.
- `public` 함수 목록이 길어진다 — `companion_` 접두사로 묶는다.

## 재검토 조건

- 한 턴에 서버용 RPC 왕복이 5회를 넘어 첫 조각 지연(PRD §7 지표)을 눈에 띄게 늘리면, 함수를 합치거나 직접 연결을 다시 본다.
- Supabase가 노출하지 않은 스키마의 함수를 서버 키로 부르는 길을 공식으로 열면, 서버용 함수를 `companion` 스키마로 옮기는 것을 다시 본다.
