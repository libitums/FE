# 수동 e2e — 구독 · 엽전 팩 (ADR-0144)

**상태: 2단계 보류.** 1단계에는 RevenueCat 계정 · 스토어 상품 · 네이티브 구매 다리가 없고 기능 플래그가 꺼져 있어 기기에서 확인할 것이 없다.
아래는 2단계(다리 · 상품 · 웹훅 배포)가 끝난 뒤 돌릴 절차다. 전제: 개발 Supabase에 `20261129120000_subscriptions.sql` 적용 · `revenuecat-webhook` 배포 ·
비밀 `REVENUECAT_WEBHOOK_AUTH` · `REVENUECAT_ACCEPT_SANDBOX=true`, 개발 RevenueCat 프로젝트, 샌드박스 계정(App Store Sandbox · Play 라이선스 테스터),
플래그를 켠 빌드, 기기 소리 끔([스토어 준비](../subscriptions-store-setup.md)).

| id | 확인 | 기대 | 결과 |
|---|---|---|---|
| SB-E1 | 설정 → Plans | 카드 셋 · Premium BEST 고름 · **스토어 가격**(지역 통화) · 월/연 토글 · 큰 글자에서 스크롤 | 보류 |
| SB-E2 | Premium 월 구매(샌드박스) | 결제 시트 → 성공 → 함수 로그 `activated` · `store_events` 행 · 엽전 +800 · 머리 칩 반영 · 티켓 무제한 · 모든 인물 대화 무료 | 보류 |
| SB-E3 | 같은 계정 Premium 구독 중 대화 200통(서버 값 낮춰 확인 가능) | `usage_time_limit fair_use` 안내 | 보류 |
| SB-E4 | Chat Plus 월 구매 → 대화 | 그날 30통 무료(서버 값 낮춰 확인) · 그 뒤 3엽전 | 보류 |
| SB-E5 | 샌드박스 갱신(빠른 갱신 주기) | RENEWAL마다 엽전 한 번 · 중복 이벤트 `duplicate` | 보류 |
| SB-E6 | 구독 취소 → 만료 | 취소 직후 권한 유지 · 만료 이벤트 뒤 free | 보류 |
| SB-E7 | 결제 문제(Play 테스트 카드 거절) | BILLING_ISSUE 유예 동안 유지 | 보류 |
| SB-E8 | 엽전 팩 1,200 구매 · 환불(고객 지원) | paid +1,200 · 환불 시 잔액 충분이면 회수, 써 버렸으면 `refund_unrecovered` 기록 | 보류 |
| SB-E9 | 앱 삭제 · 재설치 → Restore purchases | 권한 복원(서버 권한 그대로), 다른 계정으로 복원 시 TRANSFER | 보류 |
| SB-E10 | 티켓 다 씀 대화상자 · 메신저 무료 다 씀 판 | 카드 · Go unlimited · Compare plans → 그 요금제를 고른 Plans | 보류 |
| SB-E11 | VoiceOver · TalkBack | 카드 한 요소 낭독(이름 · BEST · 가격 · 혜택 · Selected) · 안내 낭독 | 보류 |
| SB-E12 | Airbridge 대시보드 | 운영 매출 이벤트만 · 샌드박스 구매가 섞이지 않음 | 보류 |
