# 수동 e2e — 구매 뒤 확인 대기 · 엽전 팩 Order Complete (ADR-0163 · ADR-0063)

**상태: 미실행.** 전제는 다음과 같다.
- 요금제 · 결제 플래그를 켠 빌드(iOS), 로그인 계정, 샌드박스 Apple 계정([스토어 준비](../subscriptions-store-setup.md))
- 빌드에 RevenueCat · Airbridge 값이 들어 있음(worktree는 `.env.local` · 로컬 xcconfig를 main에서 복사), 운영 웹훅이 샌드박스를 받는 상태
- 기기 소리 끔. 움직임 줄이기 확인은 설정 › 손쉬운 사용 › 동작 줄이기

| id | 확인 | 기대 | 결과 |
|---|---|---|---|
| PP-E1 | 엽전 상점 → Coin pouch → 사기 → 샌드박스 승인 | 시트가 닫히자마자 위 줄 가운데 「◌ Confirming your purchase…」 · 「You have」 값 자리 반짝임 막대 · Coin pouch 카드에 「◌ Adding to your wallet」 · 위 줄 높이 · 카드 높이 그대로 | 미실행 |
| PP-E2 | PP-E1 뒤 웹훅 도착(보통 몇 초) | 「You have」가 옛 값 → 새 값으로 0.6초 동안 오름 · 알약 「+1,200 coins added」 3초 뒤 사라짐 · 상점 닫으면 머리 엽전 칩 새 값 | 미실행 |
| PP-E3 | PP-E1 중 상점을 닫음 | 머리 엽전 칩 숫자 자리가 반짝임 막대 → 웹훅 뒤 새 값 | 미실행 |
| PP-E4 | 상점 Plans 탭 → 구독(샌드박스) | 시트가 닫혀도 상점이 열린 채 알약 · 「Your plan」 반짝임 → 서버 권한이 바뀌면 상점이 닫히고 머리 아래 「X is on」 알림 · 요금제 칩 새 요금제. 10초를 넘겨도(2026-11-19 실측) 기다림이 이어짐 | 미실행 |
| PP-E5 | 구독 중 내림(Premium → Tickets) | 웹훅이 늦어도(최대 60초) 상점 닫힘 → 「Unlimited Tickets starts 날짜」 알림 한 번 | 미실행 |
| PP-E6 | PP-E5와 같은 내림을 한 번 더 삼(새 웹훅 없음) | 60초 동안 알약 · 스켈레톤 → 「Your purchase is safe. It'll appear shortly.」 6초 · 칩 마지막 서버 값 · 알림 없음 | 미실행 |
| PP-E7 | VoiceOver | 알약이 뜰 때 「Confirming your purchase…」 한 번 · 바뀔 때 다시 · 칩 「Updating, You have …」 · 팩 카드 이름 끝 「Adding to your wallet」 | 미실행 |
| PP-E8 | 동작 줄이기 | 스피너 · 반짝임 멈춤(고리 · 막대만) · 잔액은 오르지 않고 곧바로 새 값 | 미실행 |
| PP-E9 | Airbridge 대시보드 › Real-time Logs(앱 이벤트), 이 기기 | PP-E1 뒤 **Order Complete**(`airbridge.ecommerce.order.completed`) 한 건 — value = 스토어 가격(예 4.99) · currency(USD 등) · transactionID · products[0].productID `duru.coins.1200.v1` · quantity 1. PP-E4 구독은 앱 Order Complete가 **없고** RevenueCat의 Subscribe만 | 미실행 |
| PP-E10 | Android(출시 보류 중 — 상품 설정 뒤) | PP-E1 · PP-E9와 같음(거래 id는 Play orderId). Android만의 바꿈 · 보류 결제는 [Android 결제](android-purchases.md) AP-E1 ~ AP-E13 | 미실행 |
