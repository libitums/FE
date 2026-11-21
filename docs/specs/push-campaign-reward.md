# 푸시 캠페인 보상 — 요구사항 · 계약 · 테스트 계획

[ADR-0175](../adr/0175-push-campaign-reward.md)의 계약 문서입니다. 결정의 근거는 ADR에 있습니다.

## 1. 요구사항

- 사용자 발화(2026-11-21): 「특정 노티피케이션 기반으로 지금 들어오면 하루동안 티켓 무제한이나 100엽전 등 타고 들어오면 받을 수 있게」.
- 운영자는 푸시 콘솔 캠페인에 보상(없음 · 엽전 N · 무제한 티켓 H시간, 기본 24)과 받을 기한(기본 발송 뒤 48시간)을 붙인다. 미리보기 · 확인창에 보상이 보인다.
- 서버는 보상 정의와 실제 수신자(대조군 제외)를 기록하고, `claim`이 로그인 · 수신자 · 기한 · 캠페인당 한 번을 검증한다.
- 앱은 알림을 눌러 들어오면 claim을 부르고, 받았으면 보상 모달(가입 보상 모달 틀) 뒤 엽전 날기 또는 무제한 티켓 칩 · 남은 시간을 보인다.
- 비기능: `main.lynx.bundle` 천장 5,850,000 B를 올리지 않는다. Android PrimJS에 없는 API를 쓰지 않는다. 운영 DB 적용 · 실제 발송은 이 변경에 들지 않는다.

## 2. 정책 결정

| # | 결정 |
|---|---|
| P1 | 기한 = 발송 시각 + 48h(콘솔 1 ~ 336h). 티켓 기간 = 받은 시각부터 H시간(1 ~ 168). 이미 보상 이용권이 살아 있으면 그 끝에서 이어 붙인다. |
| P2 | 서버 수신자 표에는 보낸 그룹만 적는다 — 대조군은 `not_recipient`. |
| P3 | 캠페인 id는 `target.campaignId`(journey-map)로 온다. 없으면(옛 Android 호스트 · send-push 배포 전) 서버가 「기한 안 · 안 받은 · 수신자인 가장 최근 보상 캠페인」을 고른다. 어느 쪽이든 수신자 표로 검증한다. |
| P4 | 손님(비로그인)으로 탔으면 받지 않는다 — 기기 대기 저장 없음, `push_reward_failed { reason: "guest" }`. |
| P5 | 실패(기한 지남 · 이미 받음 · 대상 아님 · 모름)는 화면에 아무것도 띄우지 않고 이벤트만 남긴다. 캠페인 id 없이 물었는데 보상이 없으면(`none`) 이벤트도 없다. |
| P6 | 지도 안내 순서: 가입 보상 → 푸시 보상 → 엽전 출시 → 업데이트 안내 → Letters. |
| P7 | 지급은 탭 즉시. 모달은 지도가 한가하고 첫 유닛 안내가 꺼졌을 때(활동이 하나라도 있음) 선다. |
| P8 | 무제한 티켓은 `UnlimitedPass` kind `timed` — 머리 무제한 칩 · 무제한 모달의 기간 카드(남은 시간 · N/M시간 · 막대) · Got it. 구독 판이 있으면 구독이 앞선다. |
| P9 | 서버 이용권은 `companion.ticket_passes`에 적고 `companion.has_unlimited_tickets`(구독 의미)는 바꾸지 않는다. 앱은 응답의 끝 시각을 계정별 기기 기록에 둔다. |
| P10 | 모달은 가입 보상 모달 틀(`RewardModal`). 엽전: big-pouch · 엽전 톡 · +0 → +N · 날기. 티켓: 주황 무한 기호 · 티켓 톡 · 금액 줄 「24h」(낭독 「Unlimited tickets, 24h」) · Got it이면 곧바로 닫힘. 새 그림 없음. |
| P11 | 이벤트 `push_reward_claimed { kind, amount }`(amount = 엽전 수 또는 시간) · `push_reward_failed { reason }`, 영역 learning. |

## 3. 계약

### 서버 — `20261223120000_push_campaign_reward.sql`

- `public.push_campaign_rewards(campaign_id pk, kind 'coins'|'unlimited_tickets', amount, hours, sent_at, claim_until)`
- `public.push_campaign_reward_recipients(campaign_id, user_id)` — 보낸 그룹만.
- `public.push_campaign_reward_claims(campaign_id, user_id, kind, amount, hours, pass_until, claimed_at)` — (캠페인, 사용자) 한 줄.
- `companion.ticket_passes(user_id, source, ref_id, starts_at, expires_at)` — 시간 한정 무제한 티켓 권한.
- 네 표 모두 RLS 켬 · 앱 역할 권한 없음. 콘솔(service_role)은 보상 · 수신자를 넣고 받은 수를 읽는다.
- `public.push_campaign_claim_reward(p_campaign_id text default null) → jsonb`
  `{ status, campaignId, kind, amount, hours, passUntil, wallet }`. status: `granted` · `already_claimed` · `not_recipient` · `expired` · `unknown` · `none`. 비로그인은 28000.
  엽전은 `companion.grant_once(uid, amount, 'push_campaign', '<uid>:<campaign>')`.
- `public.push_campaign_reward_claim_counts(p_campaign_ids text[])` — service_role만, 캠페인별 받은 수.

### send-push

- `PushTarget`의 journey-map에 선택 칸 `campaignId`(`^[A-Za-z0-9_-]{1,80}$`)를 남긴다. 형식이 틀리면 칸만 버린다.

### Android 호스트

- `PushNotificationController.TARGET_STRING_KEYS`에 `campaignId`.

### 앱

- `app/push-target.ts` — journey-map에 `campaignId`(형식이 틀리면 버림).
- `lib/push-reward-api.ts` — `pushRewardClaimFrom(text)` · `createPushRewardClient(deps).claim(campaignId | null)`(던지지 않음, 실패 null).
- `lib/push-reward-open.ts` — 누른 알림 신호: `notePushRewardOpen(target)` · `takePushRewardOpen()` · `onPushRewardOpen(listener)`.
- `app/push-reward-record.ts` — 기록 파싱 · `pushRewardRecordAfter` · `pushRewardStep` · `pushRewardHoldsLater` · `pushRewardFailure` · 기기 저장소 `libitum.push-reward.<uid>`.
- `lib/reward-ticket-pass.ts` — `setRewardTicketPass(untilMs)` · `rewardTicketPassActive(nowMs)`; `ticketsUnlimited()`가 읽는다.
- `lib/unlimited-pass.ts` — `{ kind: "timed", startedAtMs, endsAtMs }` → view `{ kind: "timed", on, hoursLeft, totalHours, remaining }`.
- `app/use-push-reward.tsx` · `app/use-map-notices.tsx`(순서) · `screens/signup-reward/SignupRewardModal.tsx`의 `RewardModal`.

### 콘솔

- `reward.mjs` — `normalizeReward(input)` · `rewardProblems(reward)` · `rewardTarget(campaignId, reward)` · `rewardRows(campaign)` · `rewardLabel(reward)`.
- `/api/audience`는 `reward`를 돌려준다. `/api/send`는 보상이 있으면 서버 기록(보상 → 수신자)이 성공한 뒤에만 보내고, 실패면 보내지 않는다. 결과 탭에 받은 수.

## 4. 테스트 계획

| 계층 | 적용 | 범위 |
|---|---|---|
| unit | 적용 | PR-U1 ~ (기록 · API · 목적지 · 기간 판 · 신호 · 이용권), 콘솔 PC-RW1 ~, send-push SPB-C1 ~, Android `PushTargetJsonTest` |
| ui | 적용 | PR-UI1 ~ (보상 모달 티켓 판 · 무제한 모달 timed) |
| integration | 적용 | PR-I1 ~ (App: 탭 → claim → 모달 → 날기 · 티켓 칩 · 실패 무시 · 손님 · 순서), 서버 PCR-S1 ~(임베디드 Postgres) |
| e2e | 적용(수동) | [push-campaign-reward](../e2e/push-campaign-reward.md) — 시뮬레이터 `simctl push` · AVD `adb`, 커밋하지 않는 임시 프로브 |

## 5. 문서 영향

required — ADR-0175 새로, ADR-0130 · 0115 · 0029 · 0174 개정 기록, 콘솔 README, e2e 문서, 성능 보고서.
