# 수동 e2e — Chat Plus 첫 구독 보너스 (ADR-0196)

전제: 개발 프로젝트(`REVENUECAT_ACCEPT_SANDBOX=true`)에 `revenuecat-webhook`(periodType 실음)을 배포하고 `20270107120000_chat_plus_first_bonus.sql`을 적용했다.
샌드박스 계정 · 튜토리얼을 지난 회원 계정.

| id | 확인 | 기대 |
|---|---|---|
| CB-E1 | 체험 없는 Chat Plus 월 구매 → 상점을 닫고 지도 | 엽전 출시 모달보다 먼저 보너스 모달: 알약 「SUBSCRIBER GIFT」 · 「Welcome to Chat Plus!」 · 주머니 · +0 → +100 · 보조문 · Got it. 원장 `chat_plus_first_bonus` 한 행, 잔액 +100(+ 매달 엽전 300) |
| CB-E2 | Got it | 엽전 여섯이 머리 칩으로 날아가 닿을 때마다 칩이 오르고, 다 닿으면 서버 잔액 |
| CB-E3 | 앱 재실행 · 같은 계정 다른 기기 | 모달 다시 안 뜸(기기 기록 · 서버 already_announced) |
| CB-E4 | 무료 체험이 있는 상품으로 구독 | 체험 동안 모달 · 지급 없음. 샌드박스 체험이 끝나 RENEWAL이 온 뒤 앱을 열면(또는 앞으로 오면) 모달 |
| CB-E5 | 해지 → 만료 → 다시 Chat Plus 구독 · 월 → 연 바꿈 | 모달 · 지급 없음(원장 한 행 그대로) |
| CB-E6 | Premium · Unlimited Tickets 구독 | 모달 · 지급 없음 |
| CB-E7 | Chat Plus 환불(고객 지원) | 권한은 끊기고 보너스 엽전은 그대로(회수 없음) |
| CB-E8 | `update companion.settings set chat_plus_first_bonus = 0` 뒤 새 계정으로 구독 | 모달 · 지급 없음 |
| CB-E11 | 마이그레이션 적용 전부터 Chat Plus 구독 중인 계정으로 앱 열기(개정 1) | 지도에서 바로 보너스 모달 · 원장 한 행. 다음 RENEWAL에 두 번째 지급 없음 |
| CB-E12 | 함수 배포 뒤 체험 중인 계정으로 앱 열기(개정 1) | 모달 · 지급 없음, 유료로 넘어간 뒤 열면 모달 |
| CB-E9 | 언어 바꿈(vi · id · es · ja · th · my · zh-TW) | 알약 · 보조문이 그 언어, 제목의 「Chat Plus」는 영어 |
| CB-E10 | 동작 줄이기 · VoiceOver / TalkBack | 처음부터 +100, Got it이면 날지 않고 닫힘 · 제목 머리글, 금액 「+100 Yeopjeon」 |

## 실행 기록
- 2026-11-25 — iPhone 17 Pro 시뮬레이터(전용 기기 · 소리 끔 · 끝나고 종료), `.env.local` 없는 빌드(서버 요청 없음). 지급 응답은 **흉내**였다 — 커밋하지 않은 임시
  프로브(진입점에서 `SubscriptionBonusModal`을 곧바로 세움)로 모달 화면만 확인했다 — 알약 「SUBSCRIBER GIFT」 · big-pouch · 「Welcome to Chat Plus!」 ·
  +100(오른 뒤) · 보조문 · Got it이 가입 보상 창과 같은 틀로 섬. 누르지 않았다(날기 미확인). 실행 로그에 JS 오류 없음. 프로브 번들은 지우고 실제 dist를 다시 지었다.
  - 미실행: CB-E1 ~ E8 · CB-E11 · E12(서버 적용 · 웹훅 배포 · 샌드박스 구매 뒤), CB-E9 · E10(기기 언어 · 스크린리더).
