# 수동 e2e — Android 결제 (ADR-0144 「Android 결제 준비」)

**상태: 미실행.** Play 상품 · RevenueCat Google 앱이 아직 없다(출시 보류 2026-11-19). 전제는 다음과 같다.
- [Android 결제 수동 설정 목록](../android-purchases-setup.md) 1 ~ 5 완료, 라이선스 테스터 계정이 기기 Play 스토어 계정
- `revenuecat.properties`(`goog_` 키) · `airbridge.properties` · `.env.local`을 메인 체크아웃에서 복사한 bundled 빌드(`assembleBundled`)
- 운영 웹훅이 샌드박스를 받는 상태(`REVENUECAT_ACCEPT_SANDBOX`), 기기 소리 끔
- iOS 확인 절차와 같은 기대는 [구매 확인 대기](purchase-pending.md) · [구독](subscriptions.md) · [구독 입구](subscription-entry.md)를 따른다

| id | 확인 | 기대 | 결과 |
|---|---|---|---|
| AP-E1 | 상점 Plans 탭 · 엽전 탭 | 카드 가격이 Play 가격(테스터 계정 나라 통화). 임시 가격표 값이 아님 | 미실행 |
| AP-E2 | 엽전 1,200 사기 → 「항상 승인되는 테스트 카드」 | PP-E1 · PP-E2와 같음(알약 · 스켈레톤 → 「+1,200 coins added」). 같은 팩을 바로 한 번 더 살 수 있음(소모됨) | 미실행 |
| AP-E3 | AP-E2 뒤 Airbridge Real-time Logs | Order Complete 한 건 — currency = 테스터 나라 통화 · transactionID `GPA.` · productID `duru.coins.1200.v1` | 미실행 |
| AP-E4 | 엽전 사기 → 「느린 테스트 카드(몇 분 뒤 승인)」 | 시트가 보류 안내 → 앱은 실패 줄 · 알약 없이 조용히 끝남. 몇 분 뒤 앱을 앞으로 가져오면 잔액이 오름(웹훅) | 미실행 |
| AP-E5 | 구독 없음 → Unlimited Tickets 월 | PP-E4와 같음 — 「Unlimited Tickets is on」 · 칩 TICKETS ∞. Play 구독 화면에 구독 하나 | 미실행 |
| AP-E6 | AP-E5 뒤 Premium 월(올림) | 결제 시트에 바꿈 안내 → 곧바로 「Premium is on」 · 칩 PREMIUM. **Play 구독 화면에 구독이 하나뿐**(Tickets가 바뀜, 겹치지 않음) | 미실행 |
| AP-E7 | AP-E6 뒤 Unlimited Tickets 월(내림) | 「Unlimited Tickets starts 날짜」 알림 · 지금 카드 「Tickets ∞ from 날짜」. 테스트 갱신 주기(5분) 뒤 칩이 TICKETS ∞로 바뀜 | 미실행 |
| AP-E8 | Tickets 월 → Chat Plus 월(같은 수준 · 같은 기간) | 곧바로 바뀜 — 「Chat Plus is on」, Play 구독 하나 | 미실행 |
| AP-E9 | Premium 월 → Premium 연(기간 바꿈) | 다음 갱신으로 미뤄짐 — 지금 카드 미뤄진 바꿈 줄, 구독 하나 | 미실행 |
| AP-E10 | 지금 요금제 카드 · 머리 무제한 모달의 Manage subscription | Play 스토어 앱의 그 구독 화면(`sku` = 지금 구독 id)이 열림 | 미실행 |
| AP-E11 | 앱 지우고 다시 설치 → 로그인 → Restore purchases | 「복원」 뒤 권한 유지 · 칩 그대로 | 미실행 |
| AP-E12 | RevenueCat 고객 화면 | 속성 `$airbridgeDeviceId` · `$gpsAdId`(광고 ID 허용 시) · 이벤트가 sandbox로 찍힘 | 미실행 |
| AP-E13 | 키 파일 없이 지은 빌드 | 요금제 임시 가격 · 사기 → 「곧」 안내(미리보기). 오류 없음 | 미실행 |
