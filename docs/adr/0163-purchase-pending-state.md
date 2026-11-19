# ADR-0163: 구매 뒤 서버 확인 대기 — 알약 · 칩 스켈레톤 · 60초 따라잡기

- 상태: **채택** (2026-11-19)
- 날짜: 2026-11-19
- **사용자 결정** (2026-11-19): 결제가 끝난 뒤 서버가 바뀔 때까지 「확인 중」을 보인다 — 위 알약 · 바뀔 칩의 스켈레톤 · 산 팩의 「Adding to your wallet」.
  서버가 바뀌면 잔액 칩이 새 값까지 오르고(움직임 줄이기면 곧바로) 완료 알림이 뜬다. 기다림은 60초까지 늘리고, 끝까지 그대로면 조용한 안내를 남긴다.
- 위: [ADR-0144](0144-subscriptions-revenuecat.md)(구매 다리 · 서버 따라잡기) · [ADR-0160](0160-subscription-entry-one-shop.md)(하나의 상점 · 구독 성공 알림 D7).
- 다루는 축: 구매 · 복원 뒤 서버 따라잡기의 일정, 그 동안의 화면 상태, 구독 성공 알림 창의 기한.

## 맥락

- 등급 · 엽전의 정본은 서버이고, 서버는 RevenueCat 웹훅으로만 바뀐다. 2026-11-19 기기 실측: 엽전은 몇 초, 구독은 10초를 넘기도 했다.
- 지금 `runWithServerRefresh`는 결과를 곧바로 화면에 주고 뒤에서 2초 × 5번 다시 읽는다. 화면에는 기다린다는 표시가 없어 「안 됐다」로 보였다.
- 구독 성공 알림 창(`use-plan-activation`)도 같은 2초 × 5 + 2초였다. 내림의 PRODUCT_CHANGE 웹훅이 그보다 늦게 와서 서버에는 pending이 생겼는데 알림이 뜨지 않았다.

## 결정

### D1. 따라잡기 일정 하나 — 1 · 2 · 2 · 3 · 5 · 5 · 7 · 10 · 10 · 15초(합 60초)
- `lib/purchase-refresh.ts`의 `REFRESH_SCHEDULE_MS`가 단일 출처다. `REFRESH_DEADLINE_MS`는 그 합이다.
- 구독 성공 알림 창은 `REFRESH_DEADLINE_MS + 2초`다(`ACTIVATION_WINDOW_MS`). 옛 상수(`REFRESH_ATTEMPTS` · `REFRESH_INTERVAL_MS`)는 없앤다.
- 멈춤 조건(`settle`): 엽전 팩 = 잔액이 바뀜(`balance`), 구독 = 권한이 바뀜(`entitlements`, 미뤄진 바꿈은 `pendingProductId`로 본다), 복원 = 어느 쪽이든(`any`).
- 결과는 `reflected`(멈춤 조건이 참) 또는 `late`(끝까지 그대로)다. 끝까지 그대로면 마지막 값을 알린다(지금과 같음). 앞으로 옴 · 만료 경계 다시 읽기는 그대로다.
- 이미 미뤄진 내림을 또 사면 새 웹훅이 없다 — 60초 뒤 `late`로 끝나고 알림은 뜨지 않는다.

### D2. 대기 상태(순수) — `lib/purchase-wait.ts`
- `PurchaseWait` = `idle` | `waiting { target, productId }` | `done { target, coins }` | `late { target }`.
  - `target`: `coins`(엽전 팩) · `plan`(구독) · `any`(복원).
  - `done.coins`: 잔액이 오른 양(0보다 클 때만, 아니면 null).
- `waitAfter(wait, outcome)`: reflected → done, 아니면 late. `chipUpdating(wait, chip)` · `packAdding(wait, productId)` · `pillOf(wait)`.
- 같은 동안 새 구매를 시작하면 앞 대기의 결과는 버린다(차례 번호).
- `done`은 3초, `late`는 6초 뒤 `idle`로 돌아간다(`WAIT_DONE_MS` · `WAIT_LATE_MS`).

### D3. 화면
- **알약** `PurchasePill`(상점 위 줄 · 설정 → Plans 위 줄의 가운데 칸): `waiting` = 스피너 + 「Confirming your purchase…」, `late` = 「Your purchase is safe. It'll appear shortly.」,
  `done`(엽전) = 엽전 아이콘 + 「+N coins added」. 구독의 `done`은 알약 없이 기존 구독 성공 알림(ADR-0160 D7)이 맡는다.
- **칩 스켈레톤**: 바뀔 칩의 값 자리만 같은 크기의 반짝임 막대로 바뀐다 — 상점 「You have」 · 「Your plan」, 머리 엽전 칩 · 둘째 줄 요금제 칩. 이름은 「Updating」.
- **산 팩**: 카드의 보너스 자리(없으면 그 줄)에 「Adding to your wallet」 + 작은 스피너.
- **완료**: 상점 「You have」 숫자가 옛 값에서 새 값까지 오른다(600ms, 50ms 칸). 움직임 줄이기면 곧바로 새 값.
- **구독 구매 뒤 상점**: 전에는 `purchased`면 곧바로 닫혔다(ADR-0160 D7). 이제 서버가 바뀔 때(`done`) 닫힌다 — 그래서 알림이 곧바로 머리 아래 뜬다.
  `late`면 열린 채 안내를 보인다.
- 레이아웃이 움직이지 않는다: 알약은 위 줄 가운데 빈 칸, 스켈레톤은 값과 같은 높이, 팩 카드는 최소 높이 100 안.

### D4. 접근성
- 알약은 뜰 때와 글이 바뀔 때 한 번 낭독한다(`announce`) — Lynx에 live region이 없어 polite 상태를 낭독 한 번으로 대신한다. 알약 자체는 이름을 가진 한 요소다.
- 스켈레톤 칩의 이름은 「Updating」(칩 이름 앞에 붙임). 반짝임은 움직임 줄이기에서 멈춘다. 스피너도 멈춘다(고리만).

## 계약(구현 전 고정)

| 모듈 | 내보냄 | 비고 |
| --- | --- | --- |
| `lib/purchase-refresh.ts` | `REFRESH_SCHEDULE_MS` · `REFRESH_DEADLINE_MS` · `RefreshSettle` · `RefreshOutcome` · `refreshAfterPurchase(deps, before, schedule?) → Promise<RefreshOutcome>` · `runWithServerRefresh`(deps에 `onWaiting?` · `onSettled?`) | 순수 + 주입 |
| `lib/purchase-wait.ts` | `PurchaseWait` · `idleWait` · `waitTargetOf` · `waitAfter` · `chipUpdating` · `packAdding` · `pillOf` · `countUpFrames` · `WAIT_DONE_MS` · `WAIT_LATE_MS` | 순수 |
| `app/use-plan-activation.ts` | `ACTIVATION_WINDOW_MS = REFRESH_DEADLINE_MS + 2000` | |
| `app/use-purchase-wait.ts` | `usePurchaseWait()` → `{ wait, begin, settle }` | 차례 번호 · 시한 타이머 |
| `app/header-plans.ts` | `HeaderPlans.updating: { coins, plan }` | 순수 |
| `screens/plans/plans.contract.ts` | `PlansData.wait?: PurchaseWait` | 상점 · 설정 Plans |
| `components/PurchasePill.tsx` | `PurchasePill({ pill, theme })` | |
| `lib/use-count-up.ts` | `useCountUp(value)` | 오를 때만, 줄이기면 곧바로 |

testid: `purchase-pill`(`data-kind`) · `purchase-pill-spinner` · `coin-shop-screen-balance-updating` · `plans-your-plan-updating` · `coin-shop-pack-<id>-adding` ·
`top-bar-coins-updating` · `header-plan-chip-updating`.

## 시험 계획

| 계층 | 적용 | 파일 · id |
| --- | --- | --- |
| unit | 적용 | `purchase-refresh.unit.test.ts` PR-U1 ~ U9 · `purchase-wait.unit.test.ts` PW-U1 ~ U6 · `header-plans.unit.test.ts` HP-U* · `use-plan-activation.unit.test.ts` 창 = 일정 |
| ui | 적용 | `PurchasePill.ui.test.tsx` PP-1 ~ 4 · `CoinShopScreen.pending.ui.test.tsx` CP-1 ~ 6 · `AppHeader.pending.ui.test.tsx` AH-P1 ~ 2 · `use-plan-activation.slow-webhook.ui.test.tsx` SW-1 ~ 2(웹훅 25초 → 알림, 그대로면 60초 뒤 조용히) |
| integration | 적용 | `App.purchase-pending.integration.test.tsx` PP-I1 ~ I3(엽전 팩 대기 → 잔액 → 「added」 · 구독 대기 → 권한 → 상점 닫힘 · 알림 · 끝까지 그대로 → 안내) |
| e2e | 수동 | 샌드박스 결제는 러너로 못 돈다 — [docs/e2e/purchase-pending.md](../e2e/purchase-pending.md) 기기 절차 |

문서 영향: 필요 — 이 ADR, ADR-0160 D7(상점 닫힘 시점), ADR-0144 따라잡기 일정, 디자인 메모 [docs/design/purchase-pending.md](../design/purchase-pending.md), e2e 절차, 성능 보고.

## 버린 대안

- **결제 직후 낙관적으로 숫자를 올림**: 서버가 정본이다. 웹훅이 실패하면 숫자가 내려가 더 나쁘다.
- **전체 화면 로딩**: 몇 초 ~ 수십 초 동안 상점을 막는다. 결제는 이미 끝났으니 막을 까닭이 없다.
- **고정 간격 2초 × 30**: RPC가 두 배다. 처음은 촘촘하게, 뒤는 느슨하게.

## 대가

- 구독 구매 뒤 상점이 서버가 바뀔 때까지 열려 있다(최대 60초). 사용자가 먼저 닫으면 머리 칩 스켈레톤이 기다림을 잇는다.
- 머리 엽전 칩은 오름 없이 스켈레톤 → 새 값이다(상점 「You have」만 오른다).
- 60초 동안 권한 · 잔액 RPC가 최대 10번씩 나간다(전에는 5번).
