# ADR-0155: 앱은 서버 요금 규칙을 따른다 — 체험 20통 · 첫 통부터 엽전 · 서버 지갑 잔액

- 상태: **채택** (2026-11-17) — 앱만. 서버 SQL · 함수는 바꾸지 않는다.
- 날짜: 2026-11-17
- **사용자 결정** (2026-11-17 「서버에 맞춰줘」): 일반 회원에게 메신저를 여는 출시([ADR-0154](0154-messenger-open-to-members.md))에서 앱의 대화 요금 표시를 서버의 실제 차감에 맞춘다.
- 바꾸는 결정: messenger-chat-1-5 spec §4 · §5.3(하루 무료 3통 · 기기 원장 · 다 쓴 판 하루 한 번), [ADR-0140](0140-yeopjeon-launch.md)의 「메신저에서 쓴 엽전은 기기 메모리」, [ADR-0154](0154-messenger-open-to-members.md) 「대가」의 엽전 표시 어긋남.

## 맥락
- 서버(`companion.begin_turn_base`, 마이그레이션 20261120 · 20261129): 등급 `free`이고 인물이 `settings.trial_character`(`duksu`)이면 `trial_usage`로 `trial_limit`(20)통까지 0엽전, 그 밖은 첫 통부터 `message_cost`(3)를 예약한다. 하루 무료 수는 서버에 없다(20261129 주석 — 「지금 앱(기기) 쪽 셈」).
- 앱: 모든 인물에 하루 3통 무료 뒤 앱 지갑에서 3엽전을 뺐고, 서버 `done`의 잔액을 읽지 않았다. 그래서 미나와의 첫 3통이 「무료」로 보이는데 엽전이 빠지고, 덕수쌤에게 낸 엽전은 실제로 빠지지 않았으며, 칩은 다음 학습 보상 지급 때까지 틀렸다.
- 서버 지갑 `companion_get_wallet`은 잔액(sub + grant + paid)과 `trialRemaining`(체험 인물의 남은 수)을 준다. 턴의 SSE `done`은 `creditsSpent` · `balance`를 준다.

## 결정
### D1. 요금 계획 — 서버 규칙 그대로(`free-turns.ts`)
- 무제한(시험 계정)은 그대로 `unlimited`.
- 체험 인물(`TRIAL_CHARACTER_ID = "duksu"`)은 체험 남은 수: 2 이상이면 `trial`(「N of 20 free messages left」), 1이면 `last-free`(「Last free message」 + 입력 줄 위 띠), 0이면 `coin`. 남은 수를 아직 모르면 수 없는 `trial`(「Free trial messages」)이고 판정은 서버가 한다.
- 그 밖의 인물은 첫 통부터 `coin`(「3 coins per message」 · 엽전 보내기).
- 하루 · 다시 무료까지의 시간 · 자정 초기화 · 기기 원장(`libitum.messenger.free-turns`)을 지웠다. `TRIAL_CHARACTER_ID` · `TRIAL_TOTAL`은 서버 설정과 같은 값을 앱에 둔다(지갑은 남은 수만 준다).

### D2. 체험 남은 수 — 서버 지갑이 정본(`trial-store.ts`)
- 서버 출처를 만들 때 지갑을 한 번 읽는다. 체험 인물의 턴 뒤와 잔액을 모르는 턴(실패 · `balance: null`) 뒤에 다시 읽는다(`chat-remote-wallet.ts`).
- 보낸 체험 한 통은 서버 답을 기다리지 않고 하나 줄여 보인다 — 다음 서버 값이 덮는다.
- 앱 안 방(가짜 출처 · 테스트)은 체험 20통에서 기기 메모리로 센다. 계정이 바뀌면 다시 모름에서 시작한다.

### D3. 엽전 — 서버 방은 서버 지갑
- 서버 방의 엽전 보내기는 앱 지갑에서 빼지 않는다. 턴의 `done.balance`를 곧바로 머리 칩으로 보낸다(사진 · 음성과 같은 `onBalance` → `acceptServerBalance`). 회피 턴(0) · 경고 턴(요금, [ADR-0152](0152-companion-romance-refusal-charge-unlock-message.md) D2)도 서버가 정한 값이 그대로 칩이 된다.
- 보내기 전 잔액 확인(모자라면 상점)은 지금 칩 값으로 한다 — 서버 판정과 같은 가격(3)이다. 서버가 `insufficient_credits` · `trial_exhausted`로 거절하면 지금처럼 「out of credits」 줄이 선다.
- 앱 안 방은 지금처럼 앱 지갑에서 뺀다.

### D4. 다 쓴 판 — 체험을 다 쓰는 순간 한 번
- 마지막 체험을 보낸 순간(`last-free` → `coin`) 판이 독을 대신한다(「Your 20 free messages are used」 · 「Keep chatting for 3 coins per message.」 · Keep chatting · Back to chats · 잔액 줄 · 요금제 카드 자리 그대로). 다 쓴 채 들어온 방은 판 없이 엽전 보내기다. 시계 아이콘은 엽전 아이콘으로 바꿨다.

### D5. 문구(다섯 언어)
- `turns.freeLeft` · `lastFree`에서 「today」를 뺐다. `coinEach(price)`는 가격만, `outTitle(total)` · `outBody(price)`는 다시 무료까지의 시간 없이. `trialFree`를 더하고 `reset`을 지웠다. 엽전 출시 모달의 가격 줄(「A message is 3 · voice 15 · photo 35」)은 서버와 같아 그대로다.

## 버린 대안
1. **서버를 앱에 맞춤(모든 인물 하루 3통 무료)** — 마이그레이션 · 함수 배포와 비용 증가가 따른다. 사용자가 서버에 맞추기로 정했다.
2. **체험 남은 수를 앱이 따로 셈** — 다른 기기 · 다시 설치에서 틀린다. 서버 지갑의 `trialRemaining`이 이미 있다.
3. **보낼 때 앱 지갑에서 빼고 `done`으로 바로잡음** — 회피 턴(0)에 칩이 내려갔다 오르고, 실패 턴에 되돌릴 일이 생긴다. 서버 잔액만 따른다.

## 대가
- 서버 방의 칩은 턴이 끝나야 내려간다(답을 받는 몇 초).
- 시험 계정은 앱에서 `unlimited`로 보이지만 서버는 시험 계정도 체험 인물 밖에서 엽전을 뺀다([ADR-0128](0128-messenger-access.md) · 0140에 적힌 차이 — 그대로 둔다). 다만 `done.balance`가 칩을 맞추므로 칩 숫자는 서버와 같다.
- 엽전이 3 미만이면 해금 첫 인사가 오지 않는 서버 문제([ADR-0154](0154-messenger-open-to-members.md) 대가)는 남는다.
- `TRIAL_CHARACTER_ID` · `TRIAL_TOTAL`은 서버 설정이 바뀌면 같이 바꿔야 한다.

## 테스트
- unit CP-U1 ~ U4(`free-turns.unit.test.ts` · `trial-store.unit.test.ts`) · CP-U5(`companion-turn.unit.test.ts`) · CP-U6(`companion-media-parse.unit.test.ts`) · CP-U7 ~ U9(`chat-remote-wallet.unit.test.ts`) · CP-U10(`companion-api.unit.test.ts`) · CP-U11(`ui-copy-messenger-chat-1-5.unit.test.ts`)
- ui CP-UI1 ~ UI12(`MessengerChatScreen.turns.ui.test.tsx`) · CP-UI13(`ChatTurns.ui.test.tsx`) · CP-UI14(`OutOfFreePanel.ui.test.tsx`), M3 · M4 · M9 · CR-I1 기대값 변경
- integration CP-I1 ~ I5(`App.messenger-turns.integration.test.tsx`), MC2-I9 요금 줄 기대값 변경
- 지운 것: `turn-ledger.ts` · 기기 원장 저장(MC2-U24 원장 칸) · 하루 무료 · 자정 테스트(MC2-U1 ~ U7 · MC2-UI7 ~ UI9 · MC2-I5)
