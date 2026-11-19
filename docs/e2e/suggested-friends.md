# 추천 친구 줄 · 친구 찾기 e2e (ADR-0162)

기기에서 사람이 보는 절차다. 준비: 메신저가 열리는 회원 계정(서버 모드), u03 미만 진행(미나 · 한도윤 · 서재민 미해금)과 u03을 끝낸 계정 둘.
시뮬레이터 · 기기 확인 전에 앱 설정에서 소리를 끈다. 일반 인물을 보려면 카탈로그에 일반 인물 데이터와 서버 `companion.characters` 행이 있어야 한다 —
오늘 운영 데이터에는 없어 SF-E3 · SF-E4는 개발 빌드(카탈로그에 시험 인물을 넣은 로컬 빌드)에서만 본다.

| # | 절차 | 기대 |
| --- | --- | --- |
| SF-E1 | 메신저 탭을 연다(u03 미만) | 머리 아래 「Meet new friends」 · 오른쪽 「See all」, 가로 줄에 정윤경 · 미나 · 한도윤 · 서재민 — 회색 고리 · 자물쇠 배지 (채팅 목록 줄에는 EARLY 꼬리표 없음 — 2026-11-19 사용자 결정, 제안은 시트에서만). 그 아래 선과 덕수쌤 줄 |
| SF-E2 | 줄을 가로로 민다 · 큰 글자(최대) | 줄만 가로로 움직이고 목록은 그대로. 큰 글자에서 이름이 말줄임으로 잘림, 겹침 없음 |
| SF-E3 | (개발 빌드) 일반 인물을 누른다 | 시트: 큰 얼굴 · 이름 + NEW · 소개 · 태그 · 첫 말(한국어 + 번역) · `Start chatting` · `Not now`. 판 아래가 홈 인디케이터 · Android 3버튼 바에 가리지 않음 |
| SF-E4 | (개발 빌드) `Start chatting` | 시트가 닫히고 그 방이 목록 맨 위에 NEW · 입력 중 → 첫 인사 미리보기, 줄에서 그 얼굴이 빠짐, 아래에 「<이름> added to your chats」 3초. 서버 대화에 첫 인사 한 줄(`companion-greet` trigger unlock) |
| SF-E5 | 잠긴 서재민을 누른다 | 「You'll meet in Episode 17」 · 회색 안내 줄 · 브랜드 단추 「Chat now · 100」(엽전 아이콘) + 오른쪽 위 검은 「LIMITED」(시간 없음) + 「Launch special · meet 서재민 early」 · `Not now`. 막 탭 · 끌어내림 · Android 뒤로가 시트만 닫음 |
| SF-E6 | `See all` | 전체 화면 「Find friends」 — 뒤로 화살표, 칩 All(선택) · From your story, FROM YOUR STORY 줄(잠긴 셋은 「Ep. n」 회색 알약, 덕수쌤은 ✓ Added), 꼬리 「More friends are on the way」. From your story 칩 → 같은 줄. 뒤로 화살표 · Android 뒤로 → 목록 |
| SF-E7 | u03을 끝낸 계정으로 메신저 탭 | 미나가 목록에 있고 줄에는 없음. 넷을 모두 만난 계정이면 줄이 통째로 없음 |
| SF-E8 | VoiceOver · TalkBack | 줄 제목이 머리글, 아바타 「서재민, meet in Episode 17」(버튼), See all 「See all friends」. 시트 이름 「<이름>, profile」(머리글 · dialog), 토스트가 한 번 읽힘. 시트 · 친구 찾기가 떠 있는 동안 뒤 목록 · 탭 바가 읽히지 않음 |
| SF-E9 | (시험 계정, 잔액 ≥ 100) 서재민 `Chat now · 100` | 시트가 닫히고 서재민 방이 목록 맨 위 NEW · 첫 인사(「서재민이에요.」), 줄에서 얼굴이 빠짐, 「서재민 added to your chats」, 머리 엽전 칩이 100 줄어듦. 서버: `companion.early_access_unlocks` 한 줄, `credit_ledger` kind `spend` reason `early_access` 줄(구독분 → 지급분 → 구매분). 앱을 다시 켜도 방이 열린 채 |
| SF-E10 | (시험 계정, 잔액 < 100) 한도윤 `Chat now · 100` | 시트가 닫히고 엽전 상점이 열림, 잔액 그대로 · 원장 spend 없음. 상점을 닫으면 목록 |
| SF-E11 | 비행기 모드로 `Chat now · 100` · 이미 산 인물을 다른 기기에서 다시 산다 | 오프라인: 시트 그대로 + 「Couldn't add <이름>. Try again.」, 잔액 그대로. 다른 기기: already — 두 번 빠지지 않고 방만 열림 |

시험 계정 엽전 준비: 운영 도구(ops) 시험 계정 지급 RPC 또는 학습 보상으로 잔액을 맞춘다 — 운영 사용자에게 지급하지 않는다. 먼저 만나기 마이그레이션 20261213120000은 2026-11-19 운영 적용.

**미실행** — 이 브랜치(feat/suggested-friends)는 vitest · 빌드까지만 확인했다. [성능 기록](../performance/reports/suggested-friends-01.md).
