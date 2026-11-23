# 엽전 먼저 만나기 — 서버 계약 제안 (대체됨)

> ⟨2026-11-19 대체⟩ 이 제안은 마이그레이션 [`20261213120000_companion_early_access.sql`](../../apps/supabase-functions/supabase/migrations/20261213120000_companion_early_access.sql)로
> 운영에 적용됐다(사용자 승인). 고친 점: 원장 kind 검사에 운영의 `'revoke'`를 남김, 제안 표에도 RLS, 지갑 잠금을 already 확인 앞으로. 제안 값은 이야기 인물
> 넷 · 100 · 마감 없음. 앱 연결은 끝났다 — [ADR-0162](../adr/0162-suggested-friends.md) D5. 아래는 기록이고, 제안 .sql 파일은 지웠다.

[ADR-0162](../adr/0162-suggested-friends.md) D5의 제안이다. **원격 DB에 적용하지 않았고 migrations 폴더에도 넣지 않았다** — SQL은
[suggested-friends-early-access.sql](suggested-friends-early-access.sql). 받아들이면 새 번호로 migrations에 옮기고 통합 테스트를 쓴다.

## 왜 필요한가

앱의 「Chat now · 100」은 엽전을 써서 아직 이야기에서 못 만난 인물의 방을 연다. 엽전 정본은 서버 지갑(ADR-0155)인데, 서버에서 엽전을 빼는 RPC는
턴 · 사진 · 음성 안에만 있다. 그래서 단추는 꺼져 있다(결선 `EARLY_ACCESS = null`).

## 계약

| RPC | 호출자 | 인자 | 돌려줌 |
| --- | --- | --- | --- |
| `companion_early_access_offers()` | 앱(로그인) | 없음 | `[{ characterId, price, endsAt \| null }]` — 지금 켜진 제안 |
| `companion_unlock_early(p_character_id)` | 앱(로그인) | 인물 id | `{ result: 'unlocked' \| 'already' \| 'short' \| 'no_offer', shortBy?, wallet }` |

- 멱등: (사용자, 인물)마다 한 번 — 두 번째는 `already`(차감 없음).
- 차감 순서: 구독분 → 지급분 → 구매분(턴 예약과 같음). 원장 `kind = 'spend'`, `reason = 'early_access'`, `ref_id = 사용자:인물`.
- 방 열기 · 첫 인사는 지금처럼 앱(`unlockCharacter` → `companion-greet` trigger `unlock`)이 한다 — 서버는 해금을 판정하지 않는다.

## 앱 쪽 연결(RPC가 생긴 뒤)

1. 카탈로그: `companion_early_access_offers()`의 값으로 인물의 `earlyAccess`를 채운다(끝 시각이 없으면 null — 배지는 「LIMITED」만).
2. 결선: `app/suggested-friends-wiring.ts`의 `EARLY_ACCESS`에 `companion_unlock_early` 호출을 넣는다 — `unlocked`/`already` → `{ kind: "unlocked" }`,
   `short` → `{ kind: "short", shortBy }`, 그 밖 · 네트워크 실패 → `{ kind: "failed" }`. 지갑 값이 오면 머리 엽전 칩을 갱신한다.
3. 화면은 이미 있다: 줄 「EARLY · 100」, 시트 「Chat now · 100」 + LIMITED, 친구 찾기 🪙 알약, 모자라면 엽전 상점, 이벤트 `early_access_tapped` ·
   `suggested_friend_added { via: early }`.

## 열린 질문(사용자 결정)

- 값 100 · 끝 시각 · 어느 인물에게 제안할지(운영 표 `companion.early_access_offers`).
- 먼저 만난 인물의 이야기 장면(뒤 컷)을 나중에 볼 때 새 친구 시트를 다시 띄울지 — 지금 규칙은 「이미 연 인물은 시트 없음」.
