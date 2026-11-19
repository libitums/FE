# 수동 e2e — 구독 입구 · 하나의 상점 (ADR-0160)

**상태: 미실행.** 전제는 다음과 같다.
- 요금제 플래그를 켠 빌드, 로그인 계정
- 구독 중 확인(SE-E5 ~ E8)에는 결제 플래그(`purchasesEnabled`)와 샌드박스 계정([ADR-0144](../adr/0144-subscriptions-revenuecat.md), [스토어 준비](../subscriptions-store-setup.md))
- 기기 소리 끔
- 큰 글자 확인은 글자 크기 2.0

| id | 확인 | 기대 | 결과 |
|---|---|---|---|
| SE-E1 | 여정 지도 머리 | 첫 줄 칩 · 종 그대로, 둘째 줄 오른쪽(종 아래)에 흰 PLANS 칩 46 × 39 · 지도 스크롤 시 칩이 지도 위에 고정 · 에피소드 띠와 겹침 없음 | 미실행 |
| SE-E2 | 엽전 칩 「+」 | 상점 엽전 탭 · 「You have N」 · 팩 셋 · 팩 아래 「Get 800 Yeopjeon every month with Premium · Plans ›」 → 누르면 Plans 탭(Premium 고름) | 미실행 |
| SE-E3 | 채팅방 메시지 전송 · 엽전 부족 → Top up | 상점 엽전 탭 · Chat Plus 줄 → Plans 탭(Chat Plus 고름) · 뒤로가기는 상점만 닫음 | 미실행 |
| SE-E4 | 티켓 칩 → 모달 | 카운트다운과 칸 사이 「∞ Go unlimited · $3.99/mo」(지역 가격) → 모달 닫힘 · Plans 탭 Unlimited Tickets 고름 · 「Out of tickets? Learn without waiting」 | 미실행 |
| SE-E5 | Chat Plus 구독(샌드박스) | 머리 칩 CHAT+(말풍선) · 티켓 칩은 숫자 그대로 · Plans 탭 Chat Plus 회색 「Current plan · renews 날짜」 · Premium 고름 · 「Upgrade to Premium」 · Manage subscription | 미실행 |
| SE-E6 | Premium 구독 | 칩 PREMIUM · CTA 막힘 「Choose a plan」 · Chat Plus 고르면 「Switch to Chat Plus / from 날짜」 · 고지 「You keep Premium until …」 | 미실행 |
| SE-E7 | Plans 탭에서 Unlimited Tickets 구매 성공 | 상점 닫힘 → 몇 초 안에 머리 아래 「Unlimited Tickets is on」 알림 4초 · 칩 TICKETS · 티켓 칩 ∞ · 두 칩 고리 반짝임 한 번(움직임 줄이기면 고리만) · 낭독 한 번 | 미실행 |
| SE-E8 | 설정 → Plans | 밝은 판 · 뒤로 화살표 · Your plan 칩 · 탭 전환 없음 · 같은 카드 · CTA · 고지 | 미실행 |
| SE-E9 | 기기 언어 vi · 스토어 VN · 글자 크기 2.0 | 「1.490.000 ₫」 한 줄 · 기간 아랫줄 · 13px 단계 · CTA 두 줄 겹침 없음 · 토글 「Hằng năm」 + 배지 한 줄 · 고지 줄바꿈 | 미실행 |
| SE-E10 | 플래그 꺼짐 빌드 | 상점은 엽전만(탭 · 줄 없음) · 둘째 줄 칩 없음 · 티켓 모달 줄 없음 | 미실행 |
| SE-E11 | VoiceOver · TalkBack | 탭 「Yeopjeon, selected」 · 칩 「Plans」/「Your plan: Premium」 · 지금 카드는 단추로 읽히지 않음 · 막힌 CTA · 알림 낭독 | 미실행 |
| SE-E12 | Premium 구독 중 Plans에서 Unlimited Tickets로 내림(샌드박스, 운영 DB에 `20261214120000` 적용 뒤) | 상점 닫힘 → 알림 「Unlimited Tickets starts 날짜 / You keep Premium until then」(「is on」 아님) · 칩 PREMIUM 그대로 · 다시 Plans → Premium 회색 카드 「Current plan · Tickets ∞ from 날짜」 | 미실행 |
| SE-E13 | SE-E12 뒤 앱을 켠 채 Premium 만료(샌드박스 월간 5분)를 넘김 | 만료 2초쯤 뒤 머리 칩이 PREMIUM → TICKETS · 티켓 칩 ∞ 그대로 · 앱을 내렸다 올려도 같은 값. 마이그레이션 전 서버여도 칩은 바뀐다(카드 줄 · 알림만 옛 글) | 미실행 |
| SE-E14 | Unlimited Tickets 구독 중 Premium으로 올림 → 바로 Tickets로 내림(운영 DB에 `20261215120000` 적용 뒤) | 올림: 「Premium is on」 · 칩 PREMIUM. 내림: 상점 닫힘 → 「Unlimited Tickets starts 날짜 / You keep Premium until then」 한 번 · 칩 PREMIUM · Plans Premium 카드 「Current plan · Tickets ∞ from 날짜」. 운영 `plan_entitlements`에서 Tickets 줄 만료가 올림 시각으로 앞당겨졌는지 | 미실행 |
