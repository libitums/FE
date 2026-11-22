# ADR-0168: 로맨스 선 사다리 — 서연 · 해준 > 다은 · 건우 > 스토리 인물, 칩도 같은 선

- 상태: **채택 — 서버 구현**(함수 · 마이그레이션 `20261218120000`). 앱 변경 없음. (2026-11-20)
- 날짜: 2026-11-20
- **사용자 결정** (2026-11-20):
  - 허용치 위계는 **서연 · 해준 > 다은 · 건우 > 스토리 인물**이다.
  - 서연 · 해준(open)은 **음담패설은 안 되지만 그 전의 성적 표현은 된다** — 성적 긴장 · 끌림 · 진한 스킨십 · 같이 밤을 보내자는 암시와 장면 넘김, 다음 날
    언급까지. 행위 · 몸의 노골적 묘사와 음담패설은 막는다(「암시 · 긴장까지」와 「다음 날 언급 · 관능적 묘사까지」 사이).
  - 다은 · 건우는 **학습자가 먼저 분위기를 냈을 때**, 단계별로 잘 나아가고 호감도가 쌓였으면 키스까지, 그 뒤도 충분한 교감 · 라포가 쌓였으면 그 이상도
    적당히 허용한다.
  - 다은 · 건우의 넓어진 수위는 **생년상 성인이면 충분하다**(성인 확인 동의를 받지 않는다).
  - 다은 · 건우의 넓어진 턴은 **출력 검사를 하지 않는다**(지금 성인 standard처럼 받는 대로).
  - 추천 답변 칩(reply ideas)도 **같은 선으로 느슨해진다**.
  - 허용한 경우에도 **판정에 연애로 기록해 트래킹한다**.
  - 시스템 프롬프트의 공통 금지 줄(「청소년에게 안전하지 않은 내용 없음」)도 인물에 맞게 다르게 한다.
  - 덕수쌤 · 윤경은 기존 가드레일대로 빡세게 잡는다(D4).
- 바꾸는 결정: [ADR-0152](0152-companion-romance-refusal-charge-unlock-message.md) D1(「추천 답변 칩은 바꾸지 않는다」) ·
  [ADR-0164](0164-companion-friends-pooled-trial-open-tier.md) D4(open의 선 · 「추천 답변 칩은 넓히지 않는다」 · 판정 분류 `safe`).

## 맥락

- 수위는 둘뿐이었다(ADR-0164): open(서연 · 해준 + 성인 + 동의 — 연인 · 키스 · 껴안기까지) · standard(그 밖 성인 — 썸 · 손잡기 · 포옹까지).
  다은 · 건우는 스토리 인물과 같은 standard였다.
- 칩은 수위와 상관없이 「Never romantic, flirtatious or sexual … safe for a teenager」였다. 성인이 서연과 연인이어도 칩은 담백한 말만 냈다.
- 판정은 허용한 로맨스를 `safe`로 적어, 로맨스 대화가 얼마나 되는지 셀 수 없었다.
- 시스템 프롬프트 앞부분(캐시)의 「No … content that is unsafe for teenagers」가 open 인물에도 붙어 Romance 줄의 키스 · 껴안기 허용과 부딪쳤다.

## 결정

### D1. 적용 로맨스 선 — none < hug < kiss < close < open

함수 `romanceLine(ageBand, romanceTier, persona, speechLevel)`(`companion-safety.ts`)이 정한다. 판정 · 맥락의 `romanceTier`(SQL `companion.romance_tier`)는
그대로 두고, 인물 종류와 말투 단계를 더한다.

| 선 | 누구 | 통과 | 막음 |
|---|---|---|---|
| none | 미성년자 · 나이 모름 | — | 로맨스 · 플러팅 전부 |
| hug | 스토리 인물 · 동의 없는 open 인물 · 친구 standard의 존댓말 단계 | 플러팅 · 고백 · 썸 · 데이트 · 손잡기 · 포옹 | 키스부터, 성적인 말 |
| kiss | 친구 standard의 반말 단계 | + 연인 · 사랑해 · 가벼운 키스 · 껴안기 | 진한 키스 · 몸 만지기 · 같이 눕기, 성적인 말 |
| close | 친구 standard의 slang 단계 | + 진한 키스 · 같이 눕기 · 설레고 은근한(노골적이지 않은) 분위기 | 성적인 말 · 묘사 |
| open | open 인물 + 생년상 성인 + 동의 | + 성적 긴장 · 끌림(「섹시하다」) · 관능적이되 노골적이지 않은 스킨십(목덜미 · 허리) · 같이 밤을 보내자는 초대와 장면 넘김 · 다음 날의 담백한 언급 | 행위 · 성기 · 나체의 묘사, 자세히 벗기기, 음담패설, 노골적 성관계 요구 · 나체 사진 |

- **호감도 = 말투 단계.** 말투는 친밀도(`relationships.intimacy`)로만 오르고 내려가지 않는다(반말 `speech_casual_at` 20 · slang `speech_slang_at` 50).
  새 칸 없이 「단계별로 쌓였을 때」를 잰다. 다은 · 건우의 `maxSpeechLevel`은 slang이라 사다리 끝까지 오른다.
- **학습자가 먼저**는 답 · 칩이 지킨다. 학습자의 말은 그 자체로 학습자가 먼저 낸 것이라 입력 검사는 선까지 통과시키고, 답(Romance 줄)은 「먼저 시작하지
  않는다 · 단계를 건너뛰지 않는다(썸 → 연인 → 스킨십)」를 싣는다.
- 동의 없는 open 인물은 친구 사다리가 아니라 hug다 — 「Just friends for now」를 고른 학습자다.
- 질투 · 집착 · 밀어붙이기 · 갑작스러운 스킨십 시작은 모든 선에서 캐릭터 답에서 막는다(그대로).

### D2. 노드마다

- **입력 · 출력 검사**(`moderationInstruction`): 선마다 허용 · 차단 글. 출력 검사는 그대로 성인이 아니거나 open일 때만(`outputCheckRequired(ageBand, line)`)
  — kiss · close는 성적인 말이 여전히 금지라 받는 대로 둔다(사용자 결정).
- **시스템 프롬프트**(`companion-prompt.ts`):
  - Romance 줄(뒷부분)이 선을 따른다.
  - Hard limits(앞부분 — 캐시)는 인물마다 고정이다. open 인물 = 노골적 묘사 · 음담패설 금지 + 한도는 Romance 줄. 추천 친구 = 성적 내용 금지 + 한도는
    Romance 줄. 스토리 인물 = 지금 그대로(포옹까지).
  - 공통 금지 줄: 스토리 인물은 「No graphic violence, hate, or content that is unsafe for teenagers」 그대로. 추천 친구는 「No graphic violence or hate」 +
    연령에 맞추는 일은 「This learner」의 Age · Romance 줄에 맡긴다(미성년자 · 나이 모름에게는 거기서 「13세에게 맞게」 · 로맨스 없음이 붙는다).
- **거절 분류 말**(`refusalTopic(category, line)`): none `romance` → 「romance or flirting」, kiss → 「키스 · 포옹 너머 스킨십」, close · open → 「밀어붙이거나 집착하거나
  갑작스러운 로맨스 행동」, open `sexual` → 「노골적 성 내용이나 음담패설」. hug는 그대로.
- **추천 답변 칩**(`companion-suggest-prompts.ts`): 요청에 `romanceLine`을 싣는다(턴 · 다시 만들기 · 첫 인사 · 선톡). 시스템 글은 하나 그대로(캐시)이고
  선마다의 규칙은 user 쪽 「Romance:」 줄이다.
  - 로맨스 후보는 **셋 중 하나까지**, 다른 둘은 로맨스가 아니다. 대화가 있는 곳에서 **한 걸음까지만** 나아간다.
  - hug · kiss · close는 **학습자가 최근 대화에서 먼저 분위기를 냈을 때만**. open은 대화가 이미 로맨틱하면(캐릭터가 먼저여도).
  - 학습자가 말하지 않은 감정을 대신 말하지 않는 규칙은 그 로맨스 후보 하나에서만 푼다 — 보낼지는 학습자가 고른다. 약속 · 개인정보 · 연락처 금지는 그대로.
  - 선이 없으면 none(옛 동작). 미성년자 · 나이 모름 칩의 출력 검사는 그대로.
- **평가 채점**(`companion-eval-judge.ts`): safety 축이 「로맨스 없음」 고정에서 「학습자의 Romance line 안」으로. 채점 요청에 선을 싣는다.
- **페르소나**: 다은 · 건우의 `romance` 칸을 사다리에 맞췄다(마이그레이션 `20261218120000`, 정본 `companion-friends.json`). 다은 = 친구 먼저 → 진심이면
  수줍은 썸 → 가까워지면 서툰 첫 키스 · 연인. 건우 = 버디 먼저(장난으로 받아침) → 진심이 이어지면 어색하다 솔직해짐 → 가까워지면 같이 뭘 하며 사랑을
  보이는 연인. 둘 다 먼저 이끌지 않는다.
- **스냅샷 그림**은 그대로다(ADR-0164 「하지 않은 것」 — lab에서 재 보기 전까지).

### D3. 트래킹 — 허용해도 판정에 남긴다

- 검사는 허용한 로맨스를 `allow` + 분류 `romance`로, open에서 허용한 성적 긴장을 `allow` + `sexual`로 적는다(전에는 `safe`). 차단 여부는 조치(`action`)만
  보므로 동작은 바뀌지 않는다. `companion.moderation_events`에 그대로 쌓인다(입력은 매 턴, 출력은 검사하는 턴만).
- 턴 · 첫 인사 · 선톡 · 거절의 저장 meta에 `romanceLine`을 더 싣는다(`romanceTier`는 그대로).
- 사용자 신고(`message_reports`)는 사용자가 쓰는 것이라 손대지 않는다.
- 세는 예: `select category, count(*) from companion.moderation_events where action = 'allow' and category in ('romance', 'sexual') group by 1;`
  선별로는 `companion.messages.meta->>'romanceLine'`.

### D4. 로맨스 대상이 아닌 인물 — 덕수쌤 · 윤경

- 페르소나 칸 `romanceOff: true`(마이그레이션 `20261218120000`). 선생님 · 할머니뻘이라 성인에게도 로맨스 분위기를 키우지 않는다.
- 답의 Romance 줄: 「not with this character」 — 로맨스 말은 농담으로 웃어넘기고 자기 역할대로 따뜻하게 화제를 넘긴다. 몸짓 한도는 페르소나 태도 그대로
  (덕수쌤 어깨 토닥임, 윤경 위로의 포옹).
- 추천 답변 칩 · 평가 채점은 선 none(`offeredRomanceLine`) — 로맨스 후보가 없다(이번 변경 전과 같다).
- **입력 검사는 선 그대로(hug)** — 성인 학습자의 플러팅을 위반으로 막으면 반복 위반으로 경고 · 엽전 차감까지 간다. 막지 않고 캐릭터가 웃어넘긴다.
  허용한 로맨스 말은 D3대로 `romance`로 남는다.
- 미나 · 도윤 · 재민은 스토리 인물의 hug 그대로다.

## 하지 않은 것

- 다은 · 건우의 동의 시트 · 앱 변경 — 생년상 성인이면 충분하다(사용자 결정). 앱 계약(`romanceTier` = open · standard)은 그대로라 옛 앱이 깨지지 않는다.
- 운영 도구 화면의 로맨스 집계 — 기록만 한다. 화면은 필요할 때 따로.
- 칩 의도(`intent`)에 로맨스 칸 — 어떤 칩이 로맨스였는지는 따로 세지 않는다. 학습자가 보낸 칩은 다음 턴의 입력 검사가 `romance`로 남긴다.

## 버린 대안

1. **다은 · 건우의 수위를 새 값(`warm`)으로** — 앱 파서가 모르는 수위의 친구를 버려 옛 앱에서 다은 · 건우가 사라진다. 인물 종류 + 말투 단계로 정한다.
2. **호감도로 새 칸(키스 해금 지점)을 두기** — 말투 단계가 이미 친밀도 문턱이고 내려가지 않는다. 같은 문턱을 쓴다.
3. **친구 kiss · close 턴도 출력 검사** — 첫 글자 지연. 성적인 말은 여전히 금지라 받는 대로 둔다(사용자 결정).
4. **칩은 계속 로맨스 없음** — 인물은 받아 주는데 칩만 선을 그어 어긋났다(이 ADR의 출발점).

## 대가

- 친구의 선이 말투 단계에 묶인다. 운영이 말투 문턱(`speech_casual_at` · `speech_slang_at`)을 바꾸면 로맨스 문턱도 같이 움직인다.
- 성인 hug(스토리 인물) 턴의 검사 기록에도 `romance` 분류가 늘어난다 — `allow`만 걸러 세면 된다. 운영 도구의 제재 목록은 `action <> 'allow'`라 그대로다.
- 칩 프롬프트에 줄이 하나 늘었다(user 쪽이라 캐시는 그대로).

## 구현

- 함수(`_shared`): `companion-safety.ts`(`romanceLine` · `defaultRomanceLine` · `romanceAtLeast` · 선별 검사 글 · `outputCheckRequired(ageBand, line)`) ·
  `companion-friends.contract.ts`(`RomanceLine`) · `chat-send.contract.ts`(`ModerationRequest.romanceLine`) · `chat-send-context.ts`(`turnRomanceLine`) ·
  `chat-send-turn.ts` · `chat-send-turn-refuse.ts` · `chat-send-turn-recover.ts` · `chat-send-refusal.ts` · `chat-send-reply.ts` · `chat-send-suggest.ts` ·
  `companion-prompt.ts` · `companion-llm-prompts.ts`(`refusalTopic`) · `companion-opener.ts` · `companion-greet-handler.ts` · `companion-proactive-handler.ts` ·
  `companion-suggest.contract.ts` · `companion-suggest-prompts.ts` · `companion-suggest-handler.ts` · 평가 `companion-eval-{judge,reply,suggest,handler,schema,docs,sets-tier}.ts` ·
  가짜 LLM `companion-llm-fake{,-romance}.ts`.
- DB: `20261218120000_companion_romance_ladder.sql` — 다은 · 건우 `persona.romance`, 덕수쌤 · 윤경 `persona.romanceOff`.
- 평가 세트: 검사 `romance-line-moderation`(TL1 ~ TL15, 선 다섯을 덮음) 추가, `romance-tier-moderation`은 선으로 옮기고 허용 기대를 `romance`로. 답장 TR15 ~ TR18 추가.
- 테스트: unit FT1 ~ FT3 · FT5 · FT7 ~ FT9 갱신, FT11(칩) · FT12(채점) · FT13(덕수쌤 · 윤경) · CS45(친구 사다리 턴) 추가, CS40 ~ CS43 · SF6 · SF7 · FR-1 ~ FR-3 · GT11 · PR6 갱신.
  integration FR1(로맨스 태도 · `romanceOff` 대조) · FR9(다시 적용) 갱신.
- 배포 순서: 마이그레이션 → 함수 `chat-send` · `companion-greet` · `companion-proactive` · `companion-suggest` · `companion-eval`. 함수만 먼저 올려도 된다
  (다은 · 건우가 옛 태도 문구로 사다리를 탄다). 앱은 그대로.
