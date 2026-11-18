# ADR-0159: 추천 친구 · 합산 체험 · 완화 수위 · 출시 스위치

- 상태: **채택 — 서버 구현**(마이그레이션 · 함수 · 계약), 앱은 같은 브랜치에서 따로, 운영 미적용 (2026-11-19)
- 날짜: 2026-11-19
- **사용자 결정** (2026-11-19, 기획 확정 — PRD [§3.1](../specs/ai-companion.md) 「추천 친구」):
  - 초반에 덕수쌤(교육적인 인물)만 대화할 수 있는 것이 참여의 병목이다. 재미 · 몰입에 충실한 스토리 밖 인물 넷을 채팅 목록의 추천 줄에 둔다.
  - 무료 체험은 덕수쌤 전용에서 **인물을 가리지 않는 합산 20턴**으로 바꾼다.
  - 인물마다 로맨스 수위가 있다. 일부 인물은 성인에게 더 느슨한 수위(open)로 대화한다.
  - 기록할 결정(그대로):
    - **open 수위는 생년상 성인 + 성인 확인 동의가 있어야 한다.**
    - **나이 모름 학습자에게 더 열려면 생년을 넣으라고 권하지 않는다.**
    - **생년으로 미성년자가 확인된 학습자에게는 open 수위 친구가 보이지 않는다.**
    - **친구 추가는 무료 · 무제한이다.**
    - **추가한 상태는 앱(기기)에 계정별로 둔다.**
    - **실제 사람의 얼굴 · 이름은 본인이 동의한 경우에만 쓴다.**
- 바꾸는 결정: PRD §0 불변식 5 · §3.1(덕수쌤 체험) · §3.3 · [ADR-0152](0152-companion-romance-refusal-charge-unlock-message.md) D1(수위선은 standard로 남고 open이
  더해진다) · [ADR-0155](0155-chat-pricing-follows-server.md) D1(체험 인물 `duksu` → 합산).

## 맥락

- 무료 학습자는 덕수쌤과만 무료로 대화했다(`settings.trial_character`, 20통). 다른 인물은 에피소드를 풀고 엽전이 있어야 했다.
- 로맨스 수위선은 하나였다(ADR-0152 — 생년상 성인은 로맨스 말 · 썸 · 손잡기 · 포옹까지, 그 밖은 로맨스 없음).
- 추천 친구는 스토리 밖 사람이라 「해금한 에피소드까지만 안다」 규칙이 맞지 않는다. 시스템 프롬프트는 늘 「Duru 이야기의 인물」이라고 소개했다.

## 결정

### D1. 추천 친구 넷 — 스토리 밖 공식 페르소나

- 서연(타투이스트 · ENTP · open) · 해준(LP 바 사장 · ESFJ · open · 부산말) · 다은(컴공 3학년 · INFP · standard) · 건우(복학생 · ESTP · standard).
  정본은 `docs/content/companion-friends.json`이고, 서버 페르소나(`companion.characters`)와 앱 인물 표가 이 파일과 같아야 한다(통합 테스트 FR1).
- 페르소나 칸: `kind: "friend"` · `met`(`friend_app` · `language_exchange`) · `mbti` · `romanceTier`(인물의 수위) · `background` · `personality`(MBTI 성격) ·
  `dialect`(해준) · `romance` · `unlockLines` = `firstMessage.ko` · 말투 단계별 `greetingLines` · `refusalLines`. 스토리 다섯에도 `mbti` · `romanceTier: standard`를 더했다
  (시스템 프롬프트에는 그리지 않는다 — 프로필 시트용).
- 시스템 프롬프트(`companion-prompt.ts`): 친구는 「한국에 사는 평범한 사람, 친구 찾기 앱 · 언어 교환으로 만났다」로 소개하고, Duru 이야기의 인물 ·
  게스트하우스 · 에피소드를 모른다. 배경 · 성격 · 사투리를 「Who you are」에 그린다. 초급 규칙(짧은 문장 · 한 단계 위 · 배운 표현)은 그대로,
  **묻지 않으면 가르치거나 고치지 않는다**(피드백 설정이 시킬 때만). 해준은 가끔 부산말 한 표현을 표준어와 함께 알려 준다.
  사람이라고 하지 않는 규칙 · AI 고지는 그대로다. 앞부분(캐시)은 인물마다 고정이다 — 수위로 갈리는 줄은 인물의 `romanceTier`로만 정한다.
- 추가하자마자 첫 말: 앱이 `companion-greet`를 `trigger: "unlock"`으로 부르면 `unlockLines`를 그대로 저장한다(ADR-0152 D3 그대로).
- 에셋(프로필 · 기준 이미지 · 목소리)은 나중이다. `media.refSlugs = [id]` · `voiceId = null` — 스냅샷 · 음성은 엔진 전에 `not_configured`(엽전을 쓰지 않는다).

### D2. 출시 스위치 · 보이는 친구

- `companion.settings.friends_mode`: `off`(아무도) · `testers`(시험 계정 `duru_tester`만, 기본) · `on`(모두).
- 보이지 않는 친구는 관문(`companion.turn_gate_base`)에서 `not_available`이다 — 턴 · 첫 인사 · 칩 · 스냅샷 · 음성이 모두 같은 관문을 쓴다. 선톡 후보에서도 빠지고,
  캐릭터 목록(`companion_list_characters`)에도 없다.
- 생년으로 미성년자(`age_band = minor`)이면 `romanceTier = open` 친구는 보이지 않는다. standard 친구는 보인다.
- 앱 RPC `companion_friends()` → `{ friends: [{ id, romanceTier }] }` — 이 학습자에게 보이는 친구만, 순서대로(`romanceTier`는 인물의 수위).
  앱 전체가 시험 계정 전용(`testers_only`)인데 시험 계정이 아니면 빈 목록이다.

### D3. 합산 체험

- 무료 등급의 체험 `trial_limit`(20)통을 모든 인물이 함께 쓴다. 남았으면 어느 인물이든 0엽전, 다 쓰면 어느 인물이든 첫 통부터 `message_cost`(3).
- 사용량 표 `trial_usage`는 인물별 행 그대로 두고 합으로 센다(`companion.trial_left`). 예약 해제가 그 인물 행에서 하나를 되돌린다. 지갑을 잠근 뒤 세서
  동시 턴이 한도를 넘지 않는다.
- 결과 코드: 관문은 체험을 다 쓰고 잔액이 모자라면 `insufficient_credits`, 시작(`companion_begin_turn`)은 `trial_exhausted`(체험이 있던 설정일 때). 지갑의
  `trialRemaining`과 캐릭터 목록이 합산 수를 쓴다.
- `settings.trial_character`는 남기되 읽지 않는다(열 주석).
- 관문의 엽전 판정을 연령 · 이용 시간 판정 **뒤**로 옮겼다. 그래서 `insufficient_credits`면 다른 판정은 모두 지났고, 첫 인사 맥락(`companion_greet_context`)은
  엽전 부족을 통과시킨다 — 첫 인사는 무료다. 체험을 다 쓰고 엽전이 없어도 친구를 추가하면 첫 말이 온다(ADR-0155 「대가」의 해금 첫 인사 문제도 같이 풀린다).

### D4. 완화 수위(open)

- 적용 수위는 셋이 **모두** 맞을 때만 open이다: 인물의 `romanceTier = open` · 학습자가 생년상 성인(`age_band = adult` — 나이 모름은 성인이 아니다) ·
  성인 확인 동의(`companion.profiles.adult_ack_at`). 하나라도 없으면 standard — 지금 그대로다(ADR-0152: 생년상 성인은 로맨스 말 · 썸 · 손잡기 · 포옹까지,
  나이 모름 · 미성년자는 로맨스 없음).
- 서버 SQL(`companion.romance_tier`)이 매 턴 지금 연령대로 계산해 관문 · 시작 · 첫 인사 · 칩 · 선톡 맥락에 `romanceTier`로 싣는다. TypeScript는 받은 값을
  `effectiveRomanceTier`로 한 번 더 막는다(성인이 아니면 standard, 시스템 프롬프트는 인물도 open일 때만).
- 동의: `companion_ack_adult()`(authenticated) — 생년상 성인일 때만 지금 시각으로 남기고 `{ ok, adultAck }`. 프로필 읽기(`companion_load_profile`)가 `adultAck`를
  더 돌려준다(동의가 있고 지금 성인일 때만 참). 생년이 성인이 아니게 바뀌면(미성년자 · 지움) 트리거가 동의를 지운다 — 다시 성인이 돼도 동의부터 다시 받는다.
- open의 선(입력 검사 · 출력 검사 · 시스템 프롬프트가 같은 선):
  - 통과: 연인 관계 · 데이트 · 고백 · 「사랑해」 · 키스 · 껴안기 · 서로 기대기 · 설레거나 은근한(노골적이지 않은) 분위기 — 말과 `*행동*` 모두.
  - 모두에게 차단(`sexual`): 성행위 · 벗기 · 몸이나 흥분의 노골적 묘사 · 성적인 말 · 음담패설. 장면이 그쪽으로 가면 캐릭터가 성격대로 노골적이지 않게
    장면을 넘긴다(fade to black).
  - 여전히 안 됨: 질투 · 집착 · 밀어붙이기 · 갑자기 스킨십을 시작하기(캐릭터 답의 `romance`).
- **open 턴은 답을 출력 검사한 뒤 내보낸다**(구현 판단): 성인 standard는 지금처럼 받는 대로 흘리지만, open은 말과 행동이 더 멀리 가서 노골적 성 묘사가
  새지 않게 미성년자 · 나이 모름과 같은 동기 출력 검사를 지난다(거절 답 · 첫 인사 · 선톡도). 대가는 open 턴의 첫 글자 지연이다.
- 추천 답변 칩은 넓히지 않는다(학습자 입에 넣는 말 — ADR-0152 D1). 스냅샷 그림 규칙도 넓히지 않는다(아래 「하지 않은 것」).
- 거절 분류 말(`refusalTopic`)은 open이면 `sexual` → 「노골적 성 내용」, `romance` → 「밀어붙이거나 집착하거나 갑작스러운 로맨스 행동」이다.
- 스토리 다섯은 모두 standard다.

### D5. 평가 세트

- `companion-eval`의 `GET ?docs=1`이 `evalSets`(고정 세트)를 더 돌려준다: 친구마다 페르소나 유지 10개(스토리 밖 · 가르치지 않기 · AI 고지 · doNot · 말투 단계 ·
  사투리) · 로맨스 수위 경계(검사 20개, 기대 판정 `expect` — 수위 표 open × {성인 + 동의, 동의 없음, 나이 모름, 미성년자}와 standard) · 답장 경계 14개.
  답장 세트의 기대는 채점자에게만 가는 `spoilerNote`다. 케이스는 `romanceTier`를 받는다. 실제 LLM은 대시보드가 부를 때만 돈다.

## 하지 않은 것

- 에셋 — 프로필 이미지 · 스냅샷 기준 그림 · 목소리(`voiceBrief` · `look`은 브리프만). 그때까지 스냅샷 · 음성은 `not_configured`.
- 플랫폼 연령 신호(스토어 · 결제 국가) — 연령은 지금처럼 앱 생년 입력만 본다.
- 스냅샷 그림 수위 완화 — lab에서 open 장면의 그림 품질 · 엔진 거절을 재 보기 전까지 모든 수위가 지금 규칙(성인도 손잡기 · 포옹까지)이다(단위 테스트 FT6).
- 앱 화면(추천 줄 · 추가 상태 · 동의 시트)은 앱 작업이 한다.

## 버린 대안

1. **나이 모름도 open** — 생년은 선택 입력이라 실제 미성년자가 섞인다(ADR-0152 머지 전 리뷰와 같은 까닭).
2. **open을 생년만으로(동의 없이)** — 성인이 원하지 않는 수위를 기본으로 받는다. 동의를 한 번 받는다.
3. **나이 모름에게 생년을 넣으면 더 열린다고 안내** — 생년을 거짓으로 넣게 미는 셈이다. 안내하지 않는다.
4. **친구별 체험 따로(인물마다 20)** — 무료 대화가 인물 수만큼 늘고, 「덕수쌤만 무료」 병목을 다른 꼴로 남긴다. 합산 하나로 둔다.
5. **open 성인도 받는 대로 흘리기** — 지연이 없지만 노골적 묘사가 학습자에게 먼저 닿는다. open만 출력 검사 뒤에 둔다.

## 대가

- open 턴은 답을 다 만든 뒤 검사하고 보내 첫 글자까지 더 걸린다(미성년자 · 나이 모름 턴과 같다).
- 합산 체험이라 덕수쌤과의 무료 대화가 줄 수 있다(20통을 친구와 나눈다).
- 동의가 지워지면(생년을 바꿈) 다시 성인이 돼도 앱이 동의를 다시 받아야 open이다.
- 관문 순서가 바뀌어 엽전이 없는 미성년자(13세 미만)는 이제 `insufficient_credits` 대신 `age_restricted`를 받는다(더 맞는 답이다).
- 프로필 계약 `adultAck`는 필수 칸이다 — 마이그레이션 전 서버를 읽는 새 앱은 프로필 파싱에 실패한다(배포 순서로 막는다).

## 구현

- DB: 마이그레이션 `20261213120000_companion_friends.sql` — `settings.friends_mode` · `profiles.adult_ack_at` · 도우미(`companion.is_tester` · `friend_hidden` ·
  `romance_tier` · `trial_left` · 동의 지우기 트리거) · `turn_gate_base` · `begin_turn_base` · `wallet_json` · `companion_list_characters` · `companion_friends` ·
  `companion_ack_adult` · `companion_load_profile` · 첫 인사 · 칩 · 선톡 맥락 · 선톡 후보 · 페르소나 넷 + 스토리 다섯 `mbti`.
- 함수(`_shared`): `companion-safety.ts`(`effectiveRomanceTier` · `outputCheckRequired` · open 검사 규칙) · `companion-prompt.ts`(친구 소개 · 세계 줄 · 배경 · 성격 ·
  사투리 · open 수위선 · Romance 줄) · `companion-llm-prompts.ts`(`refusalTopic`) · `chat-send-turn.ts` · `chat-send-refusal.ts` · `chat-send-turn-recover.ts` ·
  `chat-send-reply.ts` · `companion-opener.ts` · `companion-greet-*` · `companion-proactive-handler.ts` · `companion-llm-fake-romance.ts` · 평가 `companion-eval-set*.ts`.
- 계약: `companionFriendsResponseSchema` · `companionAckAdultResponseSchema` · `romanceTierSchema` · 프로필 `adultAck`, JSON Schema `companion-friends` · `companion-ack-adult`.
- 테스트: 서버 unit FT1 ~ FT9 · CS40 ~ CS43 · GT11 · PR6, integration FR1 ~ FR9(바뀐 기대값 AS1 · CH10 · CF2 · CF3 · RM7 · RC7 · RS1 · RS4 · SV1 · SB-S5 · YL5).
- 배포 순서: 마이그레이션 → 함수 `chat-send` · `companion-greet` · `companion-proactive` · `companion-suggest` · `companion-eval` · `companion-snapshot` → 앱.
  함수를 먼저 올리면 판정에 `romanceTier`가 없어 모두 standard로 돈다(안전한 쪽). 앱을 먼저 올리면 `companion_friends` · `companion_ack_adult`가 없고 프로필에
  `adultAck`가 없다.
