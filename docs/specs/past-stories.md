# 지난 친구 스토리 — 서버 계약 · 계층별 테스트 계획 (ADR-0202)

결정은 [ADR-0202](../adr/0202-past-friend-stories.md)가 정본이다. 여기는 앱 PR(다음)이 기댈 RPC 응답 모양과 서버 테스트 계획을 고정한다.
서버 PR = 마이그레이션 `20270111120000_past_stories.sql`(운영 미적용). 앱 화면(시안 40a · 40 · 41 · 42)은 다음 PR.

## 1. 계약 — 앱 RPC (authenticated, 로그인 없으면 `28000`, anon은 `42501`)

시각은 모두 `YYYY-MM-DDTHH:MM:SS.mmmZ`(UTC, `companion_friend_stories()`와 같다). `wallet`은 기존 `companion.wallet_json`
(`{ tier, sub, subExpiresAt, grant, paid, balance, trialRemaining }`)과 같다.

### 1.1 `companion_past_stories_status(p_character_id text)` → 프로필 시트 「Past stories」 줄 · 열기 화면

```ts
type PastStoriesStatus = {
  enabled: boolean; // 스위치(past_stories × friend_stories)가 이 사람에게 켜짐. false면 줄을 그리지 않는다
  characterId: string;
  friend: boolean; // 말한 적 있는 · 켜진 · 숨기지 않은 인물. false면 previews 빈 배열 · count 0
  count: number; // 지난 스토리 수(= previews.length)
  previews: { id: string; imagePath: string; postedAt: string }[]; // 최신 순. 한 줄 · 단어는 싣지 않는다(흐린 미리보기)
  open: boolean; // 지금 열려 있음
  expiresAt: string | null; // 열림이 끝나는 시각(open일 때만)
  price: number; // 엽전 값(settings.past_story_price, 기본 10)
  subscriberFree: boolean; // Chat Plus · Premium이 살아 있음 → 「Free with Unlimited」, 열기가 값 0
  wallet: Wallet;
};
```

### 1.2 `companion_open_past_stories(p_character_id text, p_request_id uuid)` → 「Unlock for 10」

`p_request_id`는 앱이 누를 때마다 새로 만든다(재시도에는 같은 값). null이면 `22004`, 같은 id를 다른 인물에 쓰면 `22023`.

```ts
type PastStoriesOpen = {
  result: "opened" | "already" | "insufficient" | "not_friend" | "empty" | "off";
  characterId: string;
  price: number; // 이번에 치른 값(구독 무료는 0) — opened 재요청이면 그때 값
  paidWith: "coins" | "subscription" | null; // opened · already일 때
  openedAt: string | null; // opened · already일 때
  expiresAt: string | null; // opened · already일 때
  shortBy?: number; // insufficient일 때만 — 앱은 상점 시트를 연다
  wallet: Wallet; // 차감 뒤 잔액
};
```

| result | 뜻 | 차감 |
| --- | --- | --- |
| `opened` | 새로 열림, 또는 같은 요청 id의 재요청(같은 기록) | 처음 한 번만 |
| `already` | 다른 요청으로 이미 열려 있음 — 지금 열림의 시각 | 없음 |
| `insufficient` | 잔액 < 값 | 없음 |
| `not_friend` | 말한 적 없는 · 꺼진 · 숨긴 인물 | 없음 |
| `empty` | 지난 스토리 0개 | 없음 |
| `off` | 스위치 꺼짐 | 없음 |

### 1.3 `companion_list_past_stories(p_character_id text)` → 열린 뒤 보기(시안 31번 보기 그대로)

```ts
type PastStoriesList = {
  result: "ok" | "locked" | "off"; // locked = 친구가 아니거나 열려 있지 않음(7일 지남 포함)
  expiresAt: string | null; // ok일 때 열림이 끝나는 시각
  stories: FriendStory[]; // ok일 때만. 최신 순
};
// FriendStory = companion_friend_stories()의 줄과 같은 모양:
// { id, characterId, postedAt, expiresAt, imagePath, line: { ko, roman, meaning }, word, replies, freeReply }
// 지난 스토리는 만료됐으므로 freeReply는 늘 false — 답장은 보통 메시지(엽전)이고 claim은 `expired`를 돌려준다.
```

### 1.4 서버 안

- 표 `companion.past_story_opens` — RLS 본인 읽기 · 쓰기는 함수만. 원장 `credit_ledger`(kind `spend`, reason `past_stories`, ref = 요청 id).
- 내부 함수(앱이 못 부름): `companion.past_stories_status_at` · `open_past_stories_at` · `list_past_stories_at`(user, character, …, p_now),
  도움 `past_stories_on` · `past_story_friend` · `past_stories_of` · `past_story_open_of` · `past_open_json` · `require_user`.

## 2. 계층별 테스트 계획

| 계층 | 적용 | 무엇 |
| --- | --- | --- |
| unit | 적용 | 마이그레이션 판 번호 겹침 없음(`migration-versions.unit.test.ts` MV1 · MV2) |
| ui | 해당 없음 | 서버만 — 앱 PR에서 |
| integration | 적용 | `supabase/migrations/past-stories.integration.test.ts` PX1 ~ PX14(일회용 PostgreSQL에 실제 마이그레이션) |
| e2e | 해당 없음 | 서버만 — 앱 PR의 기기 확인에서 |

PX 목록: 스위치 기본값 · 값 검사(1) · off/testers/on · 친구 스토리 스위치(2) · 만나지 않은 · 숨긴 · 꺼진 인물(3) · 지난 스토리 0개 · 24시간 안 · 7일 넘음(4) ·
상태 모양(5) · 잔액 부족(6) · 정확히 10 · 버킷 순서 · 원장(7) · 같은 요청 id 재요청 · 동시 · 다른 인물 거절(8) · 이미 열림(9) · 7일 뒤 다시 잠김 · 다시 삼(10) ·
구독 무료 · 티켓 무제한 · 만료 구독(11) · 목록 모양 · 지난 것만 · 다른 사람(12) · 앱 RPC 로그인 · anon · 내부 함수 막힘(13) · RLS 본인 읽기 · 쓰기 막힘(14).
