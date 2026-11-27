# ADR-0127 — 선톡 푸시 목적지 `companion-chat`: 그 인물의 방 · 열 수 없으면 목록 안내 · 미리보기 A/B의 칸

- 상태: **채택 — 앱 쪽 + 서버 쪽**(서버 발송은 2026-11-22 추가, 아래 「서버 쪽」 — 배정은 PostHog 플래그 대신 사용자 id 해시).
- 날짜: 2026-11-11.
- **사용자 결정**: 결정 문서 B 절(2026-11-11, [AI 컴패니언 ↔ 메신저 UI 통합 결정](https://claude.ai/artifact/9BTvrL4GfTxvMrAUzwJr1x)) · 시안 https://claude.ai/artifact/QWsYUxVV3tKpWZfrzy5QzX — 잠금 화면 미리보기는 **A/B**(A 한국어 한 줄 · B 「{이름} sent you a message」), 배정은 **PostHog 기능 플래그**, 누르면 그 인물 방(말풍선을 따로 **비추지 않음**), 열 수 없으면 **목록 + 안내 한 줄 3초**.
- 이어받는 결정: [ADR-0034](0034-server-push-notifications.md)(닫힌 목적지 목록 · 딥링크 금지 — 적용 기록), [ADR-0042](0042-android-push-host.md)(Android 수신 호스트), [ADR-0113](0113-messenger-chat-ui.md)(메신저 탭 · 대화 출처).
- 다루지 않는 것: 서버가 언제 · 누구에게 보내는지(컴패니언 PRD §3.8), 잠금 화면 문구 자체, 서버 대화 출처(지금은 가짜 출처).

## 결정

### D1. 닫힌 목록에 목적지 하나 — `{ kind: "companion-chat", characterId, variant? }`
- 앱은 URL이 아니라 이 이름만 받는다(ADR-0034 D4의 딥링크 금지는 그대로). `characterId`는 1~64자 `[a-z0-9-]`, 아니면 **목적지 없음**(이동 · 이벤트 없음 — 모르는 목적지와 같다).
- `variant`는 `a` · `b`만 읽고 그 밖은 null. 목적지(`target`) 사전 **안에** 싣는다 — 호스트가 JS로 넘기는 것은 `target` 하나뿐이다.
- 서버 `_shared/send-push.contract.ts`는 같은 모양을 따로 적는다(ADR-0004 D4). 앱 타입은 `notifications.contract.ts`의 `PushNotificationTarget`.

### D2. 누르면 메신저 탭 → 그 인물의 방
- 메신저 탭을 루트로 접고(`switchTab` · `backToRoot`) 대화 출처에서 `counterpart.id === characterId`인 방을 쌓는다. 뒤로 = 채팅 목록.
- 선톡은 보통 말풍선이다 — 따로 비추지 않는다(사용자 결정). 생년 unasked면 ADR-0125 시트가 먼저 선다(방을 여는 규칙 그대로).
- 진입 흐름 중 · 로그아웃 상태의 처리는 ADR-0034 그대로(앱 구간에 들어선 뒤 꺼낸다). 꺼내는 비동기 사이에 앱 구간을 벗어났으면 열지 않는다(리뷰 W5).

### D3. 열 수 없으면 목록 + 안내 3초
- 없음 · 잠김(`locked`) · 연령 제한(`age-restricted`)이면 메신저 목록 루트에 안내를 붙인다 — nav 동작 `setListNotice`는 **메신저 탭 루트만** 바꾸고 활성 스택 · 진입 구간은 건드리지 않는다(활성 스택을 바꾸는 `replace`는 다른 이동과 엇갈리면 엉뚱한 탭 루트를 덮을 수 있었다 — 리뷰 W2). 일시 차단 · 하루 시간 상한은 방을 연다(방 안 상태 줄이 풀리는 시각을 알린다).
- 목록은 안내를 받자마자 route에서 지우고(`onNoticeShown`) 3초 동안 아래 상태 줄을 보인 뒤 사라진다. 낭독은 `announce` 한 번. 방에 다녀와도 다시 뜨지 않는다.
- 줄은 바텀 네비게이션이 목록 위에 겹치는 높이(64 + 4)보다 위에 둔다 — 처음 24px에 두었을 때 Android 기기에서 바에 가려졌다(e2e CP-E3).

### D4. 측정 — 새 이벤트 없음
- 기존 `push_notification_opened`의 `target`에 `companion-chat`, variant가 있으면 `variant` 속성. 보낸 수는 서버 `outcomes`에 variant별로 남긴다(서버). 앱 PostHog distinct_id는 Supabase 사용자 id(`store-session.ts`)라 서버 플래그 배정과 같은 사람으로 묶인다.

### D5. Android 호스트 — 아는 칸 셋을 옮긴다
- `PushNotificationController.targetFromJson`이 `unitId`만 옮기던 것을 `unitId` · `characterId` · `variant` 문자열로 넓혔다. 검증은 JS가 한다. iOS는 `userInfo["target"]` 사전을 통째로 넘겨 변경 없음.

## 리뷰 (2026-11-11, review 에이전트)
- PASS(경고 있음). 고침: W2 활성 스택 `replace` → 메신저 루트 전용 `setListNotice` · W3 목록 props를 계약의 필수 칸으로, 안내 문구 타입을 `messenger-list-notice.ts`로 · W4 안내 줄을 접근성 요소로(낭독 이름 = 문구) · W5 꺼낸 뒤 앱 구간 재확인 + 콜드 스타트 · 연령 제한 통합 테스트 · W1 원본 출력을 증거에 · S1 글자 토큰. 남김: W4의 TalkBack · iOS 위치 실기기 확인, S2(엽전 상점이 열린 채 실패 푸시), S4(같은 방에서 그 인물 푸시 → 방 다시 마운트, 기존 목적지와 같은 동작).

## 버린 대안
1. **variant를 target 밖(페이로드 최상위)에** — 두 호스트가 `target`만 JS로 넘겨 호스트 둘을 다 고쳐야 한다.
2. **열 수 없으면 아무 안내 없이 목록만** — 누른 알림이 어디로 갔는지 몰라 고장처럼 보인다(사용자 결정 안내 한 줄).
3. **연령 제한 방도 열어 상태 줄로 알리기** — 서버가 애초에 보내지 않는 경우라, 열면 막힌 방만 보인다. 목록 안내로 대신한다.
4. **안내를 전역 토스트로** — 앱에 토스트 부품이 없고, 쓰는 자리가 하나다. 목록 화면 안 상태 줄로 그렸다.

## 대가
- 푸시를 누르는 순간의 대화 출처 상태로 판정한다 — 서버 출처가 들어오면 목록을 아직 못 읽은 첫 실행에서 「없음」으로 판정할 수 있다. 서버 결선 때 「읽는 중이면 기다렸다 판정」을 더한다.
- `onOpenPushTarget` 결선이 `journey-wiring`에서 `screen-wiring`으로 옮겨졌다(메신저 출처가 필요해서).

## 테스트
- unit CP-U1 ~ U7(`push-target.unit.test.ts` · `companion-push.unit.test.ts` — U7 = `setListNotice`), ui CP-UI1 ~ UI3(`ChatListNotice.ui.test.tsx`), integration CP-I1 ~ I6(`App.companion-push.integration.test.tsx` — I5 콜드 스타트 · I6 연령 제한), Android JVM `PushTargetJsonTest`.
- e2e: [수동 기록](../e2e/companion-push-target.md) — Android 에뮬레이터에서 실제 알림 누름 경로. 로그인 고정의 알림 방송(`POST_PUSH_FIXTURE`)이 `title` · `body` · `target` extra를 받도록 넓혔다.

## 재검토 조건
- 서버 대화 출처가 들어올 때(D3 판정 시점), A/B가 끝나 한 쪽으로 정할 때(variant 칸을 걷어낼지).

## 서버 쪽 ⟨2026-11-22⟩ — 선톡이 저장되면 푸시 [사용자]

- **까닭**: 선톡은 2026-11-19부터 하루 140 ~ 220통 나갔지만 푸시가 없어 앱을 열어야만 보였다 — 11-18 ~ 21의 554통 중 24시간 안에 답이 온 것은 9통(1.6%).
  받은 사람의 62%는 푸시 기기가 있다.
- **사용자 결정 2026-11-22**: 배정은 **사용자 id 해시**(D4의 PostHog 플래그를 바꿈 — 자동 캠페인과 같은 FNV-1a, 묶음 「선톡」), **대조군 30%**, **시험 계정으로 먼저 받아 보고 켠다**.
- **보내는 때**: `companion-proactive`가 선톡을 저장한 직후(`_shared/companion-proactive-push.ts`). 빈도는 선톡의 규칙 그대로다(마지막 대화 뒤 24시간 · 선톡 사이 8시간 ·
  하루 2통 · 답 없는 선톡 2통에서 멈춤 · 조용한 시간 · 유저가 끈 경우) — 푸시를 따로 세지 않는다. 푸시가 실패해도 선톡은 남는다(결과는 outcome의 `push`).
- **스위치** `companion.settings.proactive_push`(`20261225120000_companion_proactive_push.sql`): `off`(기본) · `testers`(시험 계정만 — 대조군 없이 모두 받고 기록하지 않음) · `on`.
  스위치 · 시험 계정 · 기기 유무는 `companion_proactive_push_gate`(서버 역할만)가 준다. 옛 DB · 오류면 꺼진 것으로 본다.
- **미리보기**: 제목 = 인물 이름. A = 한국어 첫 말(줄바꿈은 빈칸, 120자에서 자름 — 출력 검사를 지난 글), B = 「{이름} sent you a message」. 말(speech)이 없으면 B.
- **기록**: `on`일 때 배정을 `push_campaign_sends`(묶음 「선톡」 · 세그먼트 `companion-proactive`)에 **먼저** 남긴다 — 기록에 실패하면 보내지 않는다. 자동 캠페인의
  쉬는 시간이 이 표의 모든 묶음을 보므로(`push_campaign_learners`), 선톡 푸시(대조군 포함)를 받은 사람에게 그 간격 안에는 학습 알림이 가지 않는다.
- **푸시 기기가 없는 사람은 실험에 넣지 않는다**(`no_device`) — 받을 수 없어 두 칸의 차이를 흐린다.
- **목적지**: `send-push`의 닫힌 목록에 `companion-chat`을 더했다(`send-push.contract.ts` · `pushTargetFrom` — 인물 id 형식 · 변형 a · b만). 발송은 `announcement`에 그 사람 하나.
- **재는 것**: 24시간 안 답장(받는 쪽 vs 대조군), `push_notification_opened`의 `target = companion-chat` · `variant`, 다음 날 · 7일째 재방문.
- **대가**: 채팅을 쓰는 사람에게는 선톡 푸시가 학습 알림 자리를 차지한다(같은 쉬는 시간). 반대 방향(학습 알림 직후의 선톡 푸시)은 막지 않는다 — 선톡은 답이 없으면 2통에서 멈춘다.
  Android 1.3.0(채팅 없음)은 목적지를 몰라 눌러도 앱만 열리지만 선톡 대상이 아니다.
- 테스트: `companion-proactive-push.unit.test.ts` PP1 ~ PP6 · `companion-proactive-handler.unit.test.ts` PR8 · `send-push-body.unit.test.ts` SP1 · `companion-proactive-push.integration.test.ts` PG1 ~ PG3.

## 서버 쪽 개정 ⟨2026-11-22⟩ — 기기에 방이 있는 인물만 [사용자]

- **계기**: 시험 계정으로 받아 보니 서버에는 대화가 있는데 새로 깐 기기에는 방이 없어, 알림을 눌러도 「열 수 없음」 안내만 떴다(방이 열렸는지는 기기 저장).
- **결정**: 선톡 푸시는 **그 사람 기기에 방이 있는 인물만** 보낸다. 서버는 기기 속을 못 보므로 「가장 새 기기를 등록한 뒤 그 인물에게 말한 적이 있는가」로 가늠한다 — 문 `companion_proactive_push_gate(p_user_id, p_character_id)`의 `hasRoom`(마이그레이션 20261226). 아니면 `no_room`으로 건너뛰고 실험에도 넣지 않는다. 시험 계정 단계도 같다.
- **대상 영향**: 지난 7일 선톡을 받은 대화 중 기기가 있는 482개 가운데 481개가 조건에 든다(2026-11-22) — 방이 없는 경우는 거의 시험 기기다.
- **한계**: 토큰이 새로 발급되면(재설치 아님) 그 뒤 말하기 전까지 빠진다 — 덜 보내는 쪽의 오차라 받아들인다. 선톡 자체는 그대로 만들어진다.
- **테스트**: `companion-proactive-push.unit.test.ts` PP7 · PP4(문에 인물을 넘긴다), `companion-proactive-push.integration.test.ts` PG4.

## 서버 쪽 개정 ⟨2026-11-22⟩ — 선톡(과 그 푸시)은 현지 저녁에 [사용자]

- **계기**: 푸시를 켜기 전에 선톡이 나가는 시각을 보니, 조용한 시간(현지 22~08시) 규칙이 한 번도 걸리지 않았다 — 컴패니언 프로필의 시간대 · 지역이 3,729명 모두 비어 있다. 지난 7일 선톡 1,031통의 29%가 현지 22~08시에 나갔다.
- **결정**: (1) 현지 시각을 학습 프로필의 나라로도 찾는다(자동 캠페인과 같은 나라 → 대표 시간대 표). (2) 저녁 창 `settings.proactive_evening_from` · `_to`를 운영에서 **19 ~ 21시**로 켠다 — 시각을 직접 정하지 않은 사람에게는 그 시각대에만 선톡을 만들고, 현지 시각을 모르는 사람에게는 보내지 않는다(`no_timezone`). 푸시는 선톡과 같은 순간에 나가므로 따로 맞추지 않는다. (3) 창에 몰리는 양을 받으려고 선톡 cron을 매시 30분 → 매시 0 · 30분으로 늘린다(회차당 20통 그대로).
- **근거**: 최근 21일 채팅이 많은 현지 시각 — 인도네시아 18~22시, 필리핀 20시, 인도 21시, 멕시코 19~22시. 그 밖의 나라는 표본이 작아 나라별 시각을 따로 두지 않았다.
- **되돌리기**: 두 칸을 null로 되돌리면 창이 꺼진다(배포 없음).
- **테스트**: `companion-proactive-prefs.integration.test.ts` PP10.

## 서버 쪽 개정 ⟨2026-11-27⟩ — 나라는 기기 지역 → 온보딩 나라 [버그 수정]

- **계기**: 선톡 · 스토리 반응의 허용 조건은 「성인, 또는 미성년 + 나라 앎 + US 아님」인데 나라를 `companion.profiles.last_region`만으로 봤다.
  운영 2026-11-27: `last_region`이 7,304명 **전원 null** — 앱이 chat-send에 `client_region`을 보내지 않는다(`chat-send-handler.ts`
  `body.client_region ?? null`). 그래서 미성년은 아무도 선톡 · 반응을 받지 못했다(11-27 일반 사용자의 첫 스토리 반응 2건이 `not_allowed`로 실패).
  온보딩 ② 나라(`public.learner_profiles.country_code`)는 채팅한 미성년 297명 중 296명, 성인 2,114명 중 2,108명이 가지고 있다. 채팅한 미국 미성년은 0명.
- **바꾼 것**(마이그레이션 `20270119120000_companion_user_region.sql`, 운영 미적용): 나라 판정 `companion.user_region(user)` =
  `last_region` → `learner_profiles.country_code`. 이 함수를 같은 뜻의 판정에 쓴다.
  - `companion_proactive_context`의 `allowed` · `companion_proactive_candidates`(선톡 후보) — 미성년 + 나라 앎 + US 아님.
  - `companion_proactive_context`의 `localHour` — `companion.user_timezone`(선톡 빈도 판정 `proactive_skip_reason`과 같은 시간대).
  - `companion.turn_gate_base`의 미국 판정(SB 1119 이용 시간 · 장기 기억 끔)과 응답 `region`(위기 연락처) — 요청 지역 → `user_region`.
  - `companion_memory_flush_candidates`의 `memoryEnabled` — 관문과 같은 미국 판정.
- **바꾸지 않은 것**: 시간대 함수(`user_timezone` · `proactive_skip_reason` · `memory_batch`)는 이미 온보딩 나라로 넘어간다. 운영 화면(`ops_*`)과
  스토리 알림 언어(`country`)는 온보딩 나라를 먼저 보는 다른 뜻이다. 나이 모름의 선톡 규칙(늘 막힘 — 20261111 「나이 모름은 미성년자 기본값」)은 그대로다.
- **대가**: 기기 지역이 아니라 사용자가 고른 나라를 믿는다 — 미국 미성년이 다른 나라를 고르면 미국 규칙을 비켜 간다(기기 지역을 보내도 VPN · 해외 기기는 같다).
  반대로 온보딩 US인 나이 모름 · 미성년은 이제 SB 1119 이용 시간 상한 · 기억 끔이 걸린다(운영: 채팅한 사람 중 나이 모름 2명, 미성년 0명).
- **후속(미정)**: 앱이 `client_region`(기기 지역)을 보내게 할지는 따로 정한다 — 보내면 기기 지역이 온보딩 나라보다 먼저다.
- **테스트**: `companion-user-region.integration.test.ts` UR1 ~ UR8.

## 적용 기록 ⟨2026-11-25 — 채팅 첫 답장 뒤 알림 권한 카드⟩

- [ADR-0197](0197-chat-push-ask-card.md): 선톡을 받은 사람의 48%가 푸시 기기가 없어(선톡 받은 678명 기준) 선톡 푸시가 닿지 않았다. 방에서 보낸 말에 인물이
  처음 답한 직후, 로그인 · 알림 미결정이면 「Get a ping when {name} texts you?」 카드를 로그 끝에 세운다(3일 간격 · 최대 2번). 목적지 · 서버 · 호스트는
  바뀌지 않았다 — 등록은 기존 `syncPushDevice` · `register_push_device` 그대로이고, 이미 허용이면 카드 없이 조용히 등록한다.
