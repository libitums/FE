# ADR-0127 — 선톡 푸시 목적지 `companion-chat`: 그 인물의 방 · 열 수 없으면 목록 안내 · 미리보기 A/B의 칸

- 상태: **채택 — 앱 쪽.** 서버 발송(`send-push` 계약의 목적지 · 문구 · PostHog 플래그 배정)은 컴패니언 PR의 몫이다.
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
