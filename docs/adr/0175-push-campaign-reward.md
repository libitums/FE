# ADR-0175 — 푸시 캠페인 보상: 알림을 눌러 들어오면 엽전 N 또는 무제한 티켓 H시간

- 상태: **채택 — 앱 · 콘솔 · 서버 파일 구현, 서버 마이그레이션 · send-push 배포 전.** (`20261224120000_push_campaign_reward.sql` 적용과 `send-push` 배포는 사용자가 한다.)
- 날짜: 2026-11-21. **2026-11-22 고침** — 사용자 요구 「타고 들어오면」대로 **그 알림을 눌렀을 때만** 받는다: 처음 판의 「캠페인 id가 없으면 서버가 가장 최근 보상을 고름」을 없앴다(D3).
- 사용자 발화(2026-11-21): 「특정 노티피케이션 기반으로 지금 들어오면 하루동안 티켓 무제한이나 100엽전 등 타고 들어오면 받을 수 있게」.
- 사용자가 정해 준 기본 설계: 보상 없음 · 엽전 N · 무제한 티켓 H시간(기본 24), 받을 기한(기본 발송 뒤 48시간), 대조군 제외, 서버 검증(로그인 · 수신자 · 기한 · 캠페인당 한 번),
  가입 보상 모달 틀 재사용 · 새 그림 금지, 7개 언어.
- 이 ADR이 정한 것은 「⟨기본값⟩」으로 표시했다. 계약 · 테스트 계획은 [spec](../specs/push-campaign-reward.md).
- 이어받는 결정: [ADR-0130](0130-push-console-segment-campaigns.md)(콘솔 · 대조군) · [ADR-0034](0034-server-push-notifications.md)(`send-push` · 닫힌 목적지) ·
  [ADR-0127](0127-companion-push-target.md) D5(Android 호스트가 아는 칸만 옮김) · [ADR-0174](0174-signup-welcome-reward.md)(보상 모달 · 날기 · 안내 순서) ·
  [ADR-0115](0115-unlimited-ticket-presentation.md)(무제한 칩 · 모달) · [ADR-0116](0116-yeopjeon-reward.md) · [ADR-0140](0140-yeopjeon-launch.md)(서버 지갑 · `grant_once`) ·
  [ADR-0029](0029-product-analytics-posthog.md)(이벤트).

## 맥락

1. 콘솔 캠페인 기록은 이 기기의 파일이고(ADR-0130 D1), 서버는 누가 어떤 캠페인을 받았는지 모른다. 서버가 「수신자인가」를 검증하려면 수신자를 서버에 적어야 한다.
2. 대조군은 보내지 않는 사람이다(ADR-0130 D4). 대조군이 보상을 받으면 캠페인 지표가 깨진다 — 수신자 표에 대조군이 없어야 한다.
3. 알림의 목적지 `target`은 `send-push`가 모양을 다시 고르고(아는 칸만 남김), Android 호스트도 아는 칸만 JS로 옮긴다(ADR-0127 D5). 캠페인 id를 실으려면 둘 다 고쳐야 하고,
   이 앱 JS와 Android 호스트 변경은 같은 바이너리로 나간다.
4. 앱의 레슨 티켓은 기기 원장(ADR-0075)이다. 서버의 `companion.has_unlimited_tickets`는 구독 권한이고, 앱은 그 값(`companion_entitlements.unlimitedTickets`)을
   요금제 칩 · Go unlimited · 구매 확인에 쓴다. 앱은 결제를 열 수 있을 때만 그 값을 읽는다.

## 결정

### D1. 서버 — 보상 · 수신자 · 받음 표와 claim RPC (`20261224120000_push_campaign_reward.sql`)
- `public.push_campaign_rewards(campaign_id, kind 'coins'|'unlimited_tickets', amount 1 ~ 1,000, hours 1 ~ 168, sent_at, claim_until ≤ sent_at + 14일)`,
  `public.push_campaign_reward_recipients(campaign_id, user_id)`, `public.push_campaign_reward_claims(campaign_id, user_id, kind, amount, hours, pass_until)`,
  `companion.ticket_passes(user_id, source 'push_campaign', ref_id, starts_at, expires_at)`. 넷 다 RLS 켬 · 앱 역할 권한 없음 — 콘솔(service_role)만 보상 · 수신자를 넣는다.
- `public.push_campaign_claim_reward(p_campaign_id text)`(기본값 없음) — 로그인 필수(28000), 같은 사람의 겹친 누름은 advisory lock으로 줄 세움. 판정 순서:
  id 없음(null · 빈 글) · 모르는 id · 틀린 형식 `unknown`(지급 0) → 수신자 표에 없음 `not_recipient` → 받은 줄 있음 `already_claimed`(멱등) → 기한 지남 `expired` → `granted`.
  - 엽전: `companion.grant_once(uid, amount, 'push_campaign', '<uid>:<campaign>')` — grant 버킷 · 원장 한 줄.
  - 무제한 티켓: `ticket_passes`에 지금부터 H시간. 살아 있는 보상 이용권이 있으면 그 끝에서 시작한다(겹쳐 받은 사람이 시간을 잃지 않게).
  - 응답 `{ status, campaignId, kind, amount, hours, passUntil, wallet }`. 이미 받은 티켓도 끝 시각을 돌려준다(다른 기기 · 재설치에서 같은 알림을 다시 누르면 이용권이 되살아난다).
- `public.push_campaign_reward_claim_counts(text[])` — service_role만. 콘솔 결과의 「보상 받음」.

### D2. 대조군은 수신자 표에 없다
- 콘솔이 보내기 **전에** 보상 한 줄과 **보낸 그룹만**의 수신자를 적는다(`reward.mjs` `rewardRows`). 대조군은 앱이 캠페인 id를 보내도 `not_recipient`.
- 기록이 실패하면 보내지 않는다(ADR-0130 D12의 「기록이 실패하면 보내지 않는다」와 같다).

### D3. 그 알림을 눌렀을 때만 — 캠페인 id가 없으면 지급 0 (2026-11-22 고침)
- 보상 캠페인의 알림 목적지는 `{ kind: "journey-map", campaignId }`. `send-push`는 형식(`^[A-Za-z0-9_-]{1,80}$`)이 맞으면 이 칸을 남기고(틀리면 칸만 버림), Android 호스트는
  `campaignId`를 아는 칸에 더했다. iOS 호스트는 `target` 사전을 통째로 넘겨 변경이 없다.
- 앱은 캠페인 id가 실린 알림을 눌렀을 때만 claim을 부른다. id 없는 알림은 RPC도 이벤트도 없고 뒤 안내도 미루지 않는다.
- 서버도 id가 필수다. null은 `unknown`, 인자 없이 부르면 그런 함수가 없다.
- 그래서 **`send-push` 배포와 이 앱 빌드가 보상 캠페인의 첫 발송보다 먼저**여야 한다. 어느 하나라도 없으면 그 알림을 눌러도 받지 못하고, 이미 누른 알림은 되살릴 수 없다.
- 한계: 서버는 「눌렀다」를 직접 보지 못한다. 수신자 본인이 자기 캠페인 id를 알아내(알림 페이로드 · 추측) RPC를 직접 부르면 누르지 않고도 자기 몫을 한 번 받는다.
  id의 무작위 부분은 4자리 16진(65,536가지)이다. 다른 사람 · 대조군은 id를 알아도 받지 못한다.
- 묻는 사이에 누른 다른 보상 알림은 마지막 하나를 남겨 두었다가 응답 뒤에 묻는다.
- 콘솔의 「내 기기로 먼저 보기」(시험 발송)는 보상을 싣지 않는다 — 캠페인 기록 · 수신자에 들지 않기 때문이다.

### D4. 손님(비로그인)으로 탔을 때 — 받지 않는다 ⟨기본값⟩
- 캠페인 대상은 기기 행이 있는 **회원**뿐이라(ADR-0130 D1), 손님이 보상 알림을 누르는 것은 「같은 기기에서 로그아웃한 회원」의 드문 경우다.
- 기기에 대기로 저장했다가 로그인 뒤 받게 하면 계정 바뀜 · 다른 계정 로그인 · 기한 처리가 붙는다. 번들 여유가 없는 지금(아래 D9) 넣지 않는다. 이벤트 `push_reward_failed { reason: "guest" }`만 남긴다.
- 누른 알림은 대개 사라지므로 로그인 뒤에 되살리지 않는다. 다른 알림을 눌러도 그 보상은 받지 못한다(D3). 가입 보상 카드(ADR-0174 D4)는 그대로 보인다.
- 재검토: guest 실패가 한 캠페인 보낸 그룹의 1%를 넘으면 기기 대기를 더한다.

### D5. 실패는 조용히 — 이벤트만 ⟨기본값⟩
- `already_claimed`(이미 모달을 봤다) · `not_recipient`(대조군 · 다른 사람) · `expired` · `unknown`은 화면에 아무것도 띄우지 않는다. 앱에 토스트 부품이 없고(ADR-0127 버린 대안 4),
  짧은 안내 하나에도 7개 언어 문구와 화면이 든다.
- 기한은 콘솔에서 정하고 확인창에 보인다 — 문구에 기한을 적도록 콘솔이 안내한다. 기본 48시간은 대부분의 누름(발송 뒤 몇 시간)을 덮는다.
- 재검토: `push_reward_failed { reason: "expired" }`가 받음의 10%를 넘으면 짧은 안내를 더한다.

### D6. 지도 안내 순서 — 가입 보상 → 푸시 보상 → 엽전 출시 → 업데이트 → Letters ⟨기본값⟩
- 푸시 보상은 사용자가 방금 누른 행동의 결과라 엽전 출시 · 업데이트 안내보다 먼저다. 가입 보상은 계정당 한 번이고 새 계정의 첫 순간이라 그 앞이다 — 가입 보상의 첫 물음이 끝날 때까지
  푸시 모달을 미룬다.
- 묻는 중 · 모달 대기 · 날기 동안 엽전 출시 · 업데이트 · Letters를 미룬다(`pushRewardHoldsLater`). 묻기가 실패하면(오프라인 · RPC 미적용) 막지 않는다.

### D7. 튜토리얼 전 — 지급은 바로, 모달은 첫 유닛 안내가 꺼진 뒤 ⟨기본값⟩
- 가입 보상(ADR-0174 D5)은 튜토리얼을 끝낸 뒤에만 모달을 띄우지만, 푸시 캠페인의 주 대상은 튜토리얼 레슨 1 · 2 세그먼트다. 끝낼 때까지 미루면 받은 줄도 모른다.
- 그래서 기준을 「첫 유닛 안내가 지도를 덮는 동안(활동이 하나도 없을 때 — `firstUnitGuideEnabled`와 같은 기준)」으로 좁혔다. 활동이 하나라도 있으면 지도가 한가할 때 곧바로 모달.
  안내 강조가 모달 위로 올라오던 문제(ADR-0174 D5)는 안내가 켜진 동안을 피하면 생기지 않는다.
- 지급(서버)은 탭 즉시다. 무제한 티켓 시간은 받은 때부터 흐른다.

### D8. 앱 표시 — 보상 모달 · 엽전 날기 · 무제한 칩
- 모달: 가입 보상 모달의 틀을 `RewardModal`로 일반화했다(알약 · 제목 · 보조문 · 보상을 받음). 알약 「GIFT」 · 제목 「Your gift is here!」.
  - 엽전: big-pouch · 엽전 여섯 톡 · `+0 → +N` · 보조문 「Use Yeopjeon to chat with the friends you meet.」 · Got it이면 머리 칩으로 날기(가입 보상과 같다).
  - 무제한 티켓: 주머니 자리에 무제한 모달의 주황 무한 기호, 톡 튀는 것은 티켓 아이콘, 금액 줄 「24h」(낭독 「Unlimited tickets, 24h」 — 받은 양이라 모달이 늦게 서도 맞다),
    보조문 「Start any lesson without a ticket.」. Got it이면 날지 않고 곧바로 닫힌다 — 머리 칩이 이미 무제한 칩이다. 새 그림은 없다.
- 무제한 티켓: `UnlimitedPass`에 `timed { startedAtMs, endsAtMs }`를 더했다. 머리 칩은 무제한 칩(시험 계정 · 구독 판이 있으면 그쪽이 앞선다), 누르면 무제한 모달의
  곧 끝남 카드와 같은 노랑 카드에 「N hours left」 · 「Ends <날짜>」 · 「N of M hours」 · 남은 비율 막대 · 「After that, lessons use tickets again.」 · Got it.
  끝나는 순간 다시 그려 칩이 숫자로 돌아오고 레슨이 티켓을 쓴다.
- 기기 기록 `libitum.push-reward.<uid>` = `{ modal, pass }` — 아직 보지 않은 모달과 이용권 끝 시각. 서버가 정본이고, 이 기록은 모달 대기와 기기 원장의 무제한 판정에만 쓴다.

### D9. 서버 이용권은 `ticket_passes`, `has_unlimited_tickets`는 그대로 ⟨기본값⟩
- 시간 한정 권한을 `companion.plan_entitlements`(구독 · 기본 키 (사용자, 권한))에 넣으면 같은 사람의 실제 구독 줄과 부딪히고 스토어 웹훅이 덮어쓴다 — 따로 둔다.
- `has_unlimited_tickets`에 더하지 않는다. 앱은 `unlimitedTickets`를 구독으로 읽어(요금제 칩 · Go unlimited · 구매 확인 비교) 만료 재읽기도 구독 줄만 보며, 결제를 열 수 없으면 읽지도
  않는다 — 더하면 보상 이용권이 끝난 뒤에도 다음 재읽기까지 무제한이 남는다. 레슨 티켓은 기기 원장이라 앱은 claim 응답의 끝 시각을 쓴다.
- 대가: 다른 기기에서는 같은 알림을 누르기 전까지 무제한이 보이지 않는다. 운영 화면(ops admin)의 「티켓 무제한」에도 잡히지 않는다.

### D10. 분석 이벤트(ADR-0029 「D3 목적 구분」, 영역 `learning`)
- `push_reward_claimed { kind: coins | tickets, amount }` — 서버가 지급했을 때 한 번(amount = 엽전 수 또는 시간).
- `push_reward_failed { reason }` — already_claimed · not_recipient · expired · unknown · guest · error(응답 없음). 캠페인 id가 없는 알림은 내지 않는다.
- 누른 알림 자체는 기존 `push_notification_opened`가 센다.

### D11. 콘솔
- 1단계에 「눌러 들어오면 주는 보상」(없음 · 엽전 · 무제한 티켓) · 수(엽전 1 ~ 1,000 / 시간 1 ~ 168) · 받을 기한(1 ~ 336시간, 기본 48). 범위는 서버 표의 check와 같다.
- 미리보기 · 확인창에 보상 한 줄. 대조군 나누기(`series:` 기준값) · 미리보기와 발송 수 비교(`expectedSent`)는 그대로다 — 보상은 나눈 뒤에 붙는다.
- 결과 탭에 「보상 받음 N / 보낸 그룹」(`push_campaign_reward_claim_counts`). 캠페인 기록에 `reward`.
- Claude 추천은 보상을 고르지 않는다 — 추천으로 양식을 채우면 보상은 「없음」으로 돌아간다.

### D12. 번들 — 천장 그대로, 디자인 토큰 순수 표시로 자리를 냄
- 이 기능만으로 `main.lynx.bundle`이 5,848,286 → 5,864,982 B(+16,696)로 천장 5,850,000 B를 넘었다. 천장은 올리지 않는다(ADR-0149 · 사용자 결정).
- 측정(rsdoctor · 레이어별): `@libitums/design-tokens`가 묶음마다 최상위 `deepFreeze(...)`를 불러, 앱이 쓰지 않는 typography 등 열두 묶음이 두 스레드에 다 실려 있었다.
  빌드 로더(`apps/mobile/devtools/bundle-size/pure-token-exports-loader.cjs`)가 최상위 호출에만 `/*#__PURE__*/`를 붙여 버리게 했다 — **−13,973 B**, 별도 커밋(기능 변경 없음 · 남는
  color · motion · opacity는 그대로 깊게 얼려짐, 테스트 PT1 ~ PT3).
- 기능 코드를 줄였다: 티켓 낭독 문구를 기존 문구 조합으로(7개 언어 함수 하나 뺌), 모달의 엽전 · 티켓 아이콘 갈래를 하나로.
- 결과: 5,848,926 B — 천장까지 1,074 B(2026-11-22, .env.local 없음).
- 조사했지만 넣지 않은 것: 화면 lazy 분할(spike — import() 하나로 +71 kB), 메인 스레드에서 영어 문구표만 남기기(−400 kB 실측, 첫 프레임 언어 · ADR-0031 개정이 걸려 **별도 PR 제안**),
  `data-testid` 빼기(Android 계측 테스트가 읽음).

## 버린 대안
1. **앱이 보낸 캠페인 id만 믿고 지급** — 대조군 · 다른 사람이 id만 알면 받는다(사용자 지시).
2. **수신자를 기존 `push_campaign_sends`(자동 캠페인 표)에 적기** — 자동 캠페인의 72시간 쉬기(`last_campaign_at`)가 콘솔 발송까지 세게 되어 자동 발송 대상이 바뀐다.
3. **보상을 앱이 기기에서 지급** — 엽전은 서버 지갑(ADR-0140), 지우면 다시 받는다.
4. **무제한 티켓을 `plan_entitlements` · `has_unlimited_tickets`로** — D9.
5. **실패마다 짧은 안내 · 손님 기기 대기** — D4 · D5(번들 · 드문 경우).
6. **캠페인 id가 없으면 서버가 가장 최근 보상을 고르기(처음 판)** — 다른 알림을 누르거나 RPC를 인자 없이 불러도 받아 사용자 요구를 어긴다.

## 대가
- 마이그레이션을 적용하기 전에는 RPC가 없어(404) 묻기가 실패한다 — 콘솔은 보상 기록이 실패해 **보상 캠페인을 보내지 않는다**(보상 없는 캠페인은 그대로). 앱은 아무것도 띄우지 않는다.
- `send-push`를 배포하기 전 · 이 앱 빌드를 받기 전에 보낸 보상 알림은 눌러도 받지 못한다(D3). 콘솔은 둘을 확인하지 못한다.
- 무제한 이용권은 다른 기기에 자동으로 보이지 않는다(D9).

## 운영 적용(사용자) — 순서대로, 첫 보상 발송 전에 셋 다
1. `20261224120000_push_campaign_reward.sql` **한 파일만** 적용하고 이력에 그 버전을 적는다(`supabase migration repair --status applied 20261224120000`).
   `supabase db push`로 한꺼번에 올리지 않는다 — 2026-11-22 조회에서 운영 이력에 저장소의 `20261216120000` · `20261218120000`이 없다(함께 올라가거나 순서
   오류로 멈춘다). `20261223120000`은 `companion_early_access_subscriber`(PR #540, main b1c368bb)가 이미 써서 이 파일은 20261224로 옮겼다.
   확인: `select count(*) from public.push_campaign_rewards;`(0).
2. `supabase functions deploy send-push` — 없으면 알림에서 캠페인 id가 빠져 아무도 받지 못한다.
3. 이 JS와 호스트가 든 iOS · Android 앱을 배포한다. 옛 앱 사용자는 받지 못하므로 퍼진 뒤에 보낸다.
4. 시험 계정으로 끝까지 확인한 뒤 콘솔에서 보상 캠페인을 보낸다. 콘솔 「내 기기로 먼저 보기」는 보상을 싣지 않아 이 확인에 쓸 수 없다. 끄기: 콘솔에서 「보상 없음」.

## 테스트
- 서버 PCR-S1 ~ S9(`push-campaign-reward.integration.test.ts`, 임베디드 Postgres) · send-push SP4.
- 콘솔 PC-RW1 ~ RW5(`reward.unit.test.mjs`) · PC-IO10(`sources.unit.test.mjs`).
- 앱 unit PR-U1 ~ U12 · UP9 · AN1, ui PR-UI1 ~ UI3 · UM7, integration PR-I1 ~ I14. Android `PushTargetJsonTest.carriesRewardCampaignId`.
- e2e [수동](../e2e/push-campaign-reward.md).
