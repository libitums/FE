# ADR-0160: 구독 입구 — 하나의 상점(엽전 | Plans) · 머리 요금제 칩 · 구독 중 Plans

- 상태: **채택** (2026-11-18)
- 날짜: 2026-11-18
- **사용자 결정** (2026-11-18): 캔버스 「구독 입구 시안」의 S1 · S2 · L1 · S3 · S4 · S5 · A3 ~ A6 · P1 · P2 · T1b · T5b · T6b를 만든다.
  배너(B · C · D)와 T2 · T3는 지웠다 — 배너는 엽전 팩 아래 한 줄로 바뀐다.
- 위: [ADR-0144](0144-subscriptions-revenuecat.md)(요금제 · RevenueCat 구매 다리). 결제는 여전히 `purchasesEnabled` 뒤다.
- 다루는 축: 요금제의 입구, 엽전 상점과 Plans의 관계, 구독 중인 사람의 Plans, 긴 통화 배치, 구독 성공의 알림, 상점 지표.

## 맥락

- ADR-0144 1 · 2단계에서 요금제 화면은 **설정 → Plans 하나**였다. 티켓 대화상자 · 메신저 판의 카드도 그 화면을 push했다.
- 엽전 상점(ADR-0116)은 머리 엽전 칩과 채팅방 겹침이 따로 띄웠다. 엽전 상점과 요금제는 서로를 몰랐다.
- 구독자는 지금 요금제를 바꿀 길이 「Manage subscription」(스토어)뿐이었다. 지금 카드도 고를 수 있어 「Continue」가 같은 상품을 다시 사려 했다.
- 가격은 스토어가 준 글 그대로 쓴다(ADR-0144). 베트남 동(「1.490.000 ₫」)처럼 긴 글은 카드 가격 칸과 CTA 한 줄을 넘쳤다(시안 P2).

## 결정

### D1. 하나의 상점, 두 탭
- 엽전 상점을 **상점**으로 넓힌다. 위에 「Yeopjeon | Plans」 전환을 둔다. 오른쪽 위 칩은 탭을 따른다.
  - 엽전 탭: 「You have N」
  - Plans 탭: 「Your plan · <요금제>」(구독이 없으면 Free)
- 같은 컴포넌트 `CoinShopScreen`이 두 탭을 그린다. Plans 탭 내용은 `PlansPanel`(어두운 판)이다.
- **입구가 첫 탭을 정한다.**

  | 입구 | 첫 탭 | 지표 자리 |
  |---|---|---|
  | 머리 엽전 칩 | 엽전 | `coin_shop` |
  | 채팅방 엽전 부족 | 엽전 | `chat_send`(전송) · `coin_shop`(그 밖) |
  | 둘째 줄 요금제 칩 | Plans | `header_chip` |
  | 티켓 모달 Go unlimited | Plans(Unlimited Tickets 고름) | `tickets_chip` |
  | 티켓 다 씀 대화상자 | Plans(그 요금제 고름) | `tickets` |
  | 메신저 무료 다 씀 판 | Plans(그 요금제 고름) | `messenger` |

- 엽전 탭 팩 아래 **한 줄**: 「Get 800 Yeopjeon every month with Premium · Plans ›」. 숫자는 서버 표(`monthlyCoins`)에서 온다. 누르면 Plans 탭으로 가고 그 요금제를 고른다.
  - 채팅방 **메시지 전송**에서 열렸으면 Chat Plus 줄: 「Keep chatting — 30 free a day with Chat Plus」.
  - 이미 그 혜택을 가진 구독자에게는 숨긴다. Premium 구독자는 줄이 없다. Chat Plus 구독자는 전송에서 열어도 Premium 올림 줄을 본다(`shopPromoOf`).
- 세션 층의 상점 열림은 `useShop`(app)이 든다. 화면 전환(`Nav`)이 아니라 겹침이다. 요금제 결선은 `ShopPlansContext`로 내려간다. 그래서 채팅방 겹침의 상점도 같은 Plans 탭을 그린다.
- 머리(`AppHeader`)는 상점을 그리지 않고 요청(`onOpenShop`)만 한다.

### D2. 설정 → Plans는 같은 내용의 밝은 판
- `PlansScreen` = 뒤로 화살표 + 「Your plan」 칩 + `PlansPanel`(밝은 판). 탭 전환은 없다.
- 설정만 화면(push)이다. 나머지 입구는 모두 상점이다(`usePlans.openPlans`).

### D3. 머리 둘째 줄 요금제 칩
- 여정 지도의 머리 층(`AppHeader`, 지도 스크롤 밖)에서 첫 줄 아래 오른쪽(종 아래)에 둔다. 크기는 46 × 39다.
  - 구독 없음: 흰 PLANS(주황 왕관)
  - 구독 중: 주황 면에 그 요금제 — PREMIUM(왕관) · CHAT+(말풍선) · TICKETS(∞)
- 누르면 상점 Plans 탭이 열린다.
- **Chat Plus는 티켓 칩을 ∞로 바꾸지 않는다**(ADR-0144 D2 — 티켓 무제한은 Unlimited Tickets · Premium만).
- 다른 탭 루트(메신저 · 설정)에는 칩을 두지 않는다. 둘째 줄 자리에 화면 머리가 있다.
- 요금제 결선이 없으면(플래그 꺼짐 · 로그아웃) 칩이 없다.

### D4. 구독 중 Plans
- **지금 카드**(같은 요금제 · 같은 기간)는 고를 수 없다. 회색 면이고, 라디오 · 주황 테두리 · BEST VALUE가 없다. 「Current plan · renews <날짜>」를 단다(서버 만료일, 갱신하지 않으면 「ends」).
- 같은 요금제의 다른 기간 카드는 고를 수 있다(기간 바꿈).
- **처음 고름**:
  - Chat Plus · Unlimited Tickets 구독자: 위 등급 Premium
  - Premium 구독자: 아무것도 고르지 않는다. CTA는 막힌 「Choose a plan」이다.
  - 맥락 입구의 focus가 지금 카드가 아니면 그것을 고른다.
  - 캔버스 메모의 「없으면 같은 요금제 연간」은 사용자 지시(「nothing if Premium」)로 대신한다.
- **등급**은 스토어 구독 그룹 수준을 따른다. Premium이 위다. Unlimited Tickets와 Chat Plus는 서로를 품지 않아 같은 수준이다(`planChangeOf`).

  | 바꿈 | CTA 이름 줄 | 아랫줄 | 카드 태그 | 고지 앞 문장 |
  |---|---|---|---|---|
  | 구독 없음 | Continue with X | 가격 | — | — |
  | 위(upgrade) | Upgrade to X | 가격 | Upgrade · starts now | 바로 바뀌고 남은 기간은 스토어가 정산 |
  | 아래(downgrade) | Switch to X | from <날짜> | Switch · starts <날짜> | 날짜까지 지금 요금제, 그 뒤 X |
  | 같은 수준(crossgrade) | Switch to X | 가격 | Switch | 시작 시점 · 정산은 스토어가 정함 |
  | 기간만(period) | Switch to yearly · monthly | 가격 | Switch · starts <날짜> | 날짜까지 지금 기간 |

- Restore purchases 옆에 **Manage subscription**을 둔다(구독 중일 때만). 지금 상품의 스토어 구독 관리를 연다.
- 고른 것이 없으면 고지는 지금 요금제로 선다. 구독 고지(3.1.2)가 언제나 보인다.

### D5. 긴 통화
- 가격 글은 **스토어가 준 그대로**다. 앱은 숫자를 다시 포맷하지 않는다.
- 카드 가격 칸:
  - 금액 한 줄(`white-space: nowrap` · `text-maxline=1`) + 아랫줄 기간(「/ mo」 · 「/ yr」)
  - 칸 너비는 최대 112
  - 글자가 10자 이상이면 15 → 13px(`priceSizeOf` — 폭을 잴 수 없어 길이로 정함)
- CTA는 **언제나 두 줄**(이름 / 가격)이다. 통화마다 갈래를 두지 않는다.
- 연간 토글은 짧은 이름(「Yearly」) + 「-N%」 배지다. 배지는 할인율을 셀 수 있을 때만 선다(스토어 금액 없음 → 없음). 옛 「Yearly: save N%」 줄은 지운다.
- 고지는 줄바꿈을 허용한다.
- 기준 문자열 「1.490.000 ₫」 · 「Rp 990.000」 · 「₱2,890」을 unit(PM3) · ui(PL1 · PL2)로 고정한다.

### D6. 티켓에서 들어오면
- 티켓 모달(머리 티켓 칩)의 카운트다운과 칸 사이에 「∞ Go unlimited · <Unlimited Tickets 월 가격>/mo」 줄을 둔다.
  - 누르면 모달을 닫고, Unlimited Tickets를 고른 상점 Plans 탭을 연다.
  - 이미 티켓 무제한이면 줄이 없다(칩이 무제한 모달을 연다).
- 티켓 입구(`tickets` · `tickets_chip`)의 Plans에는 태그 「Out of tickets? Learn without waiting」을 단다.

### D7. 구독 성공 알림
- 조건: 상점 · 설정에서 **구매**가 `purchased`로 끝났고, 서버 따라잡기(ADR-0144 `runWithServerRefresh`)가 다시 읽은 권한에 새 요금제가 생겼다(`newlyActivePlan`).
- 이때 알림을 **한 번** 띄운다. 복원 · 앱 시작 읽기는 알리지 않는다.
- 구매가 끝나면 상점은 닫힌다. ⟨2026-11-19 — [ADR-0163](0163-purchase-pending-state.md) D3⟩ 이제 결제 직후가 아니라 **서버 권한이 바뀐 뒤** 닫힌다(그 동안 확인 대기 알약 ·
  「Your plan」 스켈레톤). 60초 동안 그대로면 열린 채 「Your purchase is safe」 안내. 알림 창도 60초 + 2초다.
- 알림 자리: 두 줄 머리 아래(시안 168 근처). 제목 「X is on」 + 혜택 한 줄, 4초 뒤 사라진다. 뜰 때 한 번 낭독한다.
- 같은 동안 바뀐 칩이 한 번 반짝인다. 반짝임은 둘레 고리의 불투명도다(움직임 토큰 `d9`).
  - 요금제 칩은 언제나 반짝인다.
  - 무제한 티켓 칩은 Chat Plus가 아닐 때만 반짝인다.
  - 움직임 줄이기에서는 고리만 선다.
- 머리가 가려진 동안(겹침 레이어 · 첫 유닛 안내 · 상점)은 기다렸다가 보인다. 4초가 보이지 않는 채 지나가지 않게 한다.

### D8. 지표
- `plans_viewed { placement, view, currentPlan }`
  - `placement`에 `header_chip` · `coin_shop` · `chat_send` · `tickets_chip`이 더해진다.
  - `currentPlan`은 free 또는 요금제 id다.
  - 상점은 Plans 탭이 보일 때마다 낸다(처음 그 탭으로 열림 · 전환 · 요금제 줄). 설정은 지금처럼 화면을 열 때 낸다.
- `plan_selected { placement, plan, period, from, to, kind }`
  - 기존 시점(계속 누름 · 맥락 카드) 그대로이고, 바꿈 정보만 더한다.
  - `kind`는 new · upgrade · downgrade · crossgrade다. 기간만 바꿈도 crossgrade다.
  - 시안 메모의 upgrade · downgrade · crossgrade에 **구독 없음 = new**를 더했다. free → X를 crossgrade로 섞지 않기 위해서다.
- `shop_tab_switched { from, to }` — 새 이름이다(분석 이름 66). 위 전환과 요금제 줄에서 낸다.
- `purchase_intent.placement`도 같은 자리 값을 받는다. 엽전 상점 · 요금제 기존 이벤트는 그대로다.

## 버린 대안
- **배너(B · C · D)**: 닫기 · 빈도 규칙이 필요하고 엽전 팩 매출을 깎을 수 있다(사용자가 지움). 한 줄로 대신한다.
- **상점과 Plans를 각각 화면으로 두고 서로 링크**: 입구마다 어디로 가는지가 갈리고, 두 화면이 같은 결제 · 고지를 두 번 들게 된다.
- **머리 첫 줄에 칩 하나 더(A1 · A2)**: 360 폭에서 칩 다섯이 빡빡하다. 둘째 줄(A3)이 머리 줄을 건드리지 않는다.
- **긴 통화를 통화별로 다시 포맷**: 스토어 글이 정본이다(ADR-0144). 앱이 숫자를 고치면 결제 시트와 어긋난다.
- **글 폭을 재서 글자 크기 고르기**: Lynx 배경 스레드에서 글 폭을 미리 잴 수 없다. 길이 기준(10자)은 거칠지만 같은 결과를 준다.

## 대가
- 상점 겹침이 세션 층(`ShopLayer`)과 채팅방 겹침(`CoinShopLayer`) 두 곳에서 선다.
  - 결선은 컨텍스트 하나라 같은 내용이다.
  - 뒤로가기 주인은 다르다(채팅방은 `useChatRoom`).
- 둘째 줄 칩의 터치 영역은 칩 크기 그대로다(46 × 39). 44 × 44 권장보다 세로가 5 작다 — 지도를 덜 가리게 한 시안 값이다.
- 「Start Lesson N」 단추가 없다. 시안 T6b 알림의 단추이고, 막혔던 레슨을 다시 여는 결선이 필요하다. 후속으로 둔다.
- 앱 번들이 늘었다(PR 보고): 5,066,926 → 5,146,611 B, +79,685 B. 천장 5,327,000 아래다.
  - 다섯 언어 문구, 카드 · 상점 · 칩 · 알림 컴포넌트와 CSS가 두 스레드에 실린다.
  - 천장은 올리지 않았다(ADR-0149).
- 다섯 언어 문구 중 es · id · ja · vi는 에이전트 번역이다. 출시 전 원어민 확인이 필요하다.
- **대비 예외(사용자 결정 대기)**: 구독 중 칩의 흰 8 · 9px 글 / 주황 #F46B18은 3.0 : 1이다(AA 4.5 미달). CTA 두 줄의 가격 줄도 흰 글 / 주황이다.
  - CTA는 브랜드 단추의 기존 감수 예외(ADR-0016 · ADR-0078)와 같은 조합이다. 시안의 #FFE3CF(2.5 : 1)는 버렸다.
  - 칩은 시안 그대로 두었다. 칩 바탕을 brand-strong #B94208(5.5 : 1)로 바꿀지는 디자인 결정으로 남긴다.
- 토글 · 탭 알약 높이 36은 시안 값으로 44 권고에 못 미친다. Restore · Manage subscription은 44로 올렸다.

## 리뷰 · 접근성 점검 반영 (2026-11-18)
- 알림 창은 시각 기한(따라잡기 2초 × 5 + 2초)이다(`use-plan-activation`). 복원 · 엽전 팩은 창을 닫는다. 구독 구매의 따라잡기는 권한이 바뀔 때까지 읽는다(`settle: "entitlements"` — Premium은 엽전이 먼저 닿을 수 있음).
- 고른 것이 없으면 고지는 지금 요금제 · 지금 기간으로 선다(보이는 기간에 지금 카드가 없어도).
- 새 단추 · 칩 · 알림 · 링크에 `flatten={false}`를 단다(Android 접근성 트리). 막힌 CTA · Restore는 `accessibility-traits="disabled"`다. 반짝임 고리는 `user-interaction-enabled={false}`다.
- 세션 층 상점이 떠 있는 동안 화면 내용(`app-content`)을 낭독에서 가린다. 메신저 판에서 연 상점 아래의 채팅방도 여기에 든다.
- 남은 것: 낭독 기호(「Tickets ∞」 · 「-17%」 · 「/mo」)의 발화용 문구, 줄을 누른 뒤 초점 위치, 큰 글자에서 칩 글 — e2e SE-E9 · SE-E11에서 본다.

## 적용 기록
- ⟨2026-11-18⟩ 브랜치 `feat/subscription-entry`(PR #493 위)
  - 순수: `screens/plans/plan-change.ts` · `screens/coin-shop/shop-model.ts` · `app/plans-events.ts` · `app/header-plans.ts`
  - 화면: `PlansPanel` · `PlanCard` · `PlanCta` · `PlanPeriodToggle` · `YourPlanChip` · `CoinShopScreen`(탭) · `CoinShopPanel` · `ShopTabs` · `ShopPromoRow` · `PlanChip` · `SubscriptionToast`
  - 결선: `use-shop` · `shop-layer` · `session-providers` · `usePlans`
  - 문구: `ui-copy-shop.ts` · `ui-copy-shop-asia.ts`
  - 기기 확인은 [e2e](../e2e/subscription-entry.md)(미실행).
