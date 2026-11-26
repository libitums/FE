# ADR-0197 — 채팅 첫 답장 뒤 알림 권한 카드

- 상태: **채택 — 앱, 초안 PR(머지 전), 운영 변경 없음.**
- 날짜: 2026-11-25.
- **사용자 결정**: 시안 「채팅 알림 권한 카드」(1 · 첫 답장 아래 카드, 2 · Turn on → 시스템 권한 창, 3 · 켠 뒤 한 줄로 접힘, 메모 `rules` ·
  `why`)를 보고 「채팅 알림 권한 카드 진행해」(2026-11-25).
- 이어받는 결정: [ADR-0034](0034-server-push-notifications.md)(서버 푸시 · 기기 등록) · [ADR-0127](0127-companion-push-target.md)(선톡 푸시
  목적지) · [ADR-0176](0176-entry-basics-choice.md)(첫 스토리 뒤 알림 묻기 — 그대로 둔다) · [ADR-0029](0029-product-analytics-posthog.md)(이벤트) ·
  [ADR-0185](0185-ui-traditional-chinese-taiwan.md)(화면 언어 여덟).

## 왜

선톡(인물이 먼저 보내는 말) 푸시는 켜져 있지만, 선톡을 받은 678명 가운데 48%가 푸시 기기가 없다 — 선톡이 닿지 않는다. 알림 권한은
지금 첫 이야기 뒤 · 기존 회원 로그인 · 설정에서만 묻는다(`syncPushDevice({ ask: true })`). 「왜 알림이 필요한지」가 가장 분명한 순간은
방금 인물에게서 답장을 받은 때다.

## 결정

### D1. 언제 — 방에 들어와 보낸 말에 인물이 처음 답한 직후, 한 번
- 아무 친구 방에서든, **이번 입장에서 내가 보낸 말에 인물의 답(글 말풍선)이 다 도착한 직후** 한 번 판정한다. 같은 입장에서 두 번째 답부터는
  판정하지 않는다. 방을 나갔다 다시 들어오면 새 입장이다.
- 「보낸 말」은 한 번의 갱신에 **내 글 하나만** 새로 선 경우다(앱 안 방 · 서버 방 모두 보내기가 그렇게 선다). 기록을 불러오며 여러 줄이
  한꺼번에 서는 것, 첫 인사(내 말 없이 인물이 먼저)는 보낸 말이 아니다.
- 「답이 다 도착」은 그 뒤 인물의 글 말풍선이 새로 섰고 방이 답을 기다리지 않는(입력 중 · 답 대기 아님) 때다 — 서버 답은 조각마다 자라므로
  턴이 끝난 뒤.
- 판정은 순수 함수 `replyWatchNext`(`screens/messenger-chat/chat-push-ask-rules.ts`).

### D2. 누구에게 — 로그인 · 아직 묻지 않음 · 횟수
판정은 순수 함수 `chatPushAskDecision({ signedIn, permission, record, nowMs })`(`app/chat-push-ask.ts`) → `card` | `register` | `none`.

| 조건 | 결과 |
| --- | --- |
| 로그인하지 않음(손님 · 세션 없음) | `none` — 손님 방에는 카드 자리 자체가 내려가지 않는다 |
| 권한 모름(호스트 모듈 없음) | `none` |
| 이미 허용(`authorized` · `provisional`) | `register` — 카드 없이 `syncPushDevice({ ask: false })`로 조용히 기기 등록 |
| 이미 거절(`denied`, Android는 한 번 물었음 포함) | `none` — 설정에서만 |
| 미결정(`not-determined`)이고 보인 횟수 2 이상 | `none` |
| 미결정이고 마지막으로 보인 지 3일(72시간) 안 | `none` |
| 미결정이고 그 밖 | `card` |

- 횟수 · 마지막 시각은 **카드가 설 때** 적는다(계정 · 기기, 키 `libitum.chat-push-ask.<사용자 id>` — 기존 `libitum.push-prompt.<id>`와 같은 규칙,
  값은 `{"shown":n,"lastShownAtMs":ms}`). Not now는 기록을 더 바꾸지 않는다 — 카드를 보고 답하지 않고 나간 경우도 한 번으로 센다.
  그래서 「Not now → 3일 뒤 다른(또는 같은) 방의 첫 답장 때 한 번 더, 최대 2번」이 된다.
- 기록을 읽지 못하면 빈 기록(0번)으로 보고, 적지 못하면 이번 실행 안에서만 카드가 다시 서지 않는다(같은 입장 한 번 규칙).
- 지금 권한을 묻는 곳(첫 이야기 뒤 · 기존 회원 로그인 · 설정)은 그대로다.

### D3. 무엇을 — 대화 줄 안 지역 카드
- 로그 끝(입력 중 줄 위)에 카드 한 장: 종 아이콘(`notification-03`) + 「Get a ping when {인물 이름} texts you?」 + 「I sometimes message
  first — about once a day, in the evening.」 + [Turn on](브랜드 단추) [Not now](옅은 단추).
- 카드는 대화 기록에 남는 메시지가 아니다 — 화면 위 지역 줄이고, 방을 새로 열면 D1 · D2로 다시 정한다.
- **Turn on** → `syncPushDevice({ ask: true })`가 시스템 창을 띄우고, 돌려준 권한으로
  - 허용 → 카드가 한 줄 「Notifications on — {name} will ping you.」(체크 아이콘, 회색 칸)로 접힌다. 기기 등록은 `syncPushDevice`가 이미 했다.
  - 거절 → 카드가 사라진다(다시 묻지 않음 — 시스템이 미결정이 아니게 된다).
  - 권한을 모름(모듈 없음 · 세션 없음) → 카드가 사라지고 결과 이벤트는 내지 않는다.
  - 답을 기다리는 동안 두 단추는 다시 눌리지 않는다.
- **Not now** → 카드가 사라진다.
- 색 · 크기는 앱 토큰을 쓴다 — 카드는 흰 바탕 · 브랜드 옅은 테두리 · 둥근 칸, 단추는 ui-lynx `Button`(brand · subtle). 접힌 줄은 회색
  칸 가운데 정렬, caption 크기.
- 낭독: 카드는 제목 · 본문이 한 요소, 단추는 각자 버튼. 접힌 줄은 한 요소.

### D4. 이벤트(PostHog만, Airbridge 매핑 없음)
- `chat_push_ask_shown { characterId, count }` — 카드가 섬(`count` = 이번이 몇 번째, "1" | "2").
- `chat_push_ask_tapped { characterId, choice: turn_on | not_now }` — 단추를 누름.
- `chat_push_ask_answered { characterId, result: allowed | denied }` — Turn on 뒤 시스템 창의 결과.
- 공통 속성 `surface: chat` · `daysSinceFirstOpen`. 이름 110 → 113.

### D5. 결선
- 카드 자리(`ChatPushAskSlot`)는 방 화면 로그 안에 있고, 판정 · 등록 포트(`ChatPushAskPort`)는 결선(`render-messenger-chat.tsx`)이
  컨텍스트(`ChatPushAskContext`)로 내린다 — 회원(`access === "open"`)일 때만. 화면 props는 늘리지 않는다.
- 포트(`app/chat-push-ask-wiring.ts`): `due()`(권한 읽기 → 판정 → `register`면 조용히 등록 · `card`면 기록하고 횟수를 돌려줌) ·
  `turnOn()`(`syncPushDevice({ ask: true })`가 돌려준 권한 → allowed | denied | null).
- `syncPushDevice`는 끝난 뒤의 권한을 돌려준다(전에는 `void`). 다른 부르는 곳은 값을 버린다.

## 버린 대안
- **대화 기록에 남는 메시지로 카드를 넣기** — 서버 · 기록 모양을 바꿔야 하고, 권한이 바뀐 뒤에도 남는다. 사용자 시안이 지역 줄.
- **방마다 첫 답장 한 번(방 기록)** — 「3일 뒤 다른(또는 같은) 방」과 맞지 않는다. 입장 단위로 보고 횟수 · 간격은 계정 기록이 진다.
- **Not now 때만 간격을 세기** — 카드를 보고 그냥 나간 사람에게 바로 다음 답장에서 또 서게 된다. 설 때 세면 둘 다 같은 규칙.
- **카드를 그 답장 바로 아래에 고정** — 로그 사이에 끼워 넣으려면 말풍선 줄 컴포넌트를 바꿔야 한다. 로그 끝(입력 중 줄 위)에 두면 답장
  바로 아래이고, 이어 보낸 말이 위로 쌓인다.

## 대가
- 카드가 선 뒤 대화를 이어 가면 카드가 로그 끝에 남아 새 말풍선 아래에 있다(입력 중 줄 위).
- 3일 · 2번은 상수(`CHAT_PUSH_ASK_GAP_MS` · `CHAT_PUSH_ASK_MAX`) — 바꾸려면 앱 배포.
- 기기 기록이라 다른 기기에서는 다시 2번까지 설 수 있다(권한은 기기마다라 맞는 단위다).

## 테스트 계획
- unit: `chat-push-ask.unit.test.ts`(CPA-U1 ~ U10 판정 · 기록), `chat-push-ask-rules.unit.test.ts`(CPA-R1 ~ R6 첫 답장 감지),
  `chat-push-ask-wiring.unit.test.ts`(CPA-W1 ~ W4 포트), `push-wiring.unit.test.ts`(돌려주는 권한), AN1 · AB3(이벤트 수).
- ui: `ChatPushAsk.ui.test.tsx`(CPA-UI1 ~ UI8 카드 · 접힌 줄 · 사라짐 · 이벤트 · 낭독).
- integration: `App.chat-push-ask.integration.test.tsx`(CPA-I1 ~ I4 첫 답장 → 카드 → Turn on → 등록 호출 · 손님 · 허용 · 거절).
- e2e(수동): [`docs/e2e/chat-push-ask.md`](../e2e/chat-push-ask.md) — iOS 시뮬레이터 권한 창 · Android 13+ POST_NOTIFICATIONS 창.
