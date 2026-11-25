# 수동 e2e — 메신저 서버 모드 (ADR-0137)

| id | 확인 | 기대 |
|---|---|---|
| SV-E1 | 시험 계정 · Chats 탭 | 인물 다섯(덕수쌤 · 정윤경 · 미나 · 한도윤 · 서재민), 덕수쌤만 열림(진행에 따라 더 열림) |
| SV-E2 | 덕수쌤 방 처음 | 입력 중 점 → 첫 인사 말풍선(서버) |
| SV-E3 | 보내기 | 내 글 → 입력 중 → 답이 조각마다 자람 → 번역 줄 → 연필 점 → 추천 답변 판이 저절로 열림 |
| SV-E4 | 지문 | 말풍선 없는 「*…*」 회색 기울임 줄 + 번역 |
| SV-E5 | 내 글 | 🌐 없음 · ✏️만 |
| SV-E6 | 무료 등급으로 다른 인물 방 | 회색 줄 「You can't chat with {name} yet.」 |
| SV-E7 | 실제 스크린리더 · Android | 미실행 |
| SV-E8 | 추천 답변 판이 섬 → 보기 하나 누름 (ADR-0195) | `chat_suggestion_shown` 한 번(판을 접었다 다시 열어도 한 번) · `chat_suggestion_tapped { index, count, replyOrigin, myMessageNumber }` · `chat_message_sent { fromSuggestion: true }`. 입력 칸으로 보낸 글은 `fromSuggestion: false`. 추천 글은 이벤트에 없음 |

## 실행 기록

### 2026-11-12 — iPhone 13 mini(iOS 27), 시험 계정, 운영 서버
- **첫 설치:** 다른 인물 방에서 「Message not sent」.
  - 서버 로그: `companion-greet`가 `not_available`로 답했다 — 무료 등급은 체험 인물(덕수쌤)만 대화된다.
  - 고침: `not_available`을 따로 알리는 줄을 더했다(SV-E6).
- **덕수쌤 방:** 대화 세 턴이 서버에 남았다(말 · 행동 · 말 · 말 말풍선).
  - 사용자가 행동과 대사 구분을 물어, 지문 줄로 바꿨다(SV-E4).
- **사용자 요청으로 고친 것:**
  - 덕수쌤 아바타: `staging`에만 있어 `content`에 복사(새 파일).
  - 내 글 🌐 제거(SV-E5) · 추천 답변 판 저절로 열림(SV-E3).
  - 마지막 설치본의 화면 확인은 사용자 몫으로 남았다.

### 2026-11-25 — iOS 시뮬레이터(iPhone 17 Pro, iOS 26.5), 흉내 출처 — SV-E8 (ADR-0195)
- 로그인 없이 임시 진입점(커밋 안 함)으로 덕수쌤 서버 방을 **가짜 원격**으로 세웠다 — 기록의 마지막 캐릭터 메시지가 선톡(proactive) · 추천 둘,
  보내면 1.5초 뒤 턴 답 · 추천 셋. 이벤트는 sink를 화면 위 글 상자로 그려 확인했다(PostHog로 보내지 않음).
- 전구 → 판: `chat_suggestion_shown { count: "2", replyOrigin: "proactive", myMessageNumber: "1" }` 한 번.
- 「쉬어요」(둘째) 누름 → `chat_suggestion_tapped { index: "1", count: "2", replyOrigin: "proactive", myMessageNumber: "1" }` →
  `chat_message_sent { paid: false, cost: "0", fromSuggestion: true }` → 답과 함께 판이 저절로 열려
  `chat_suggestion_shown { count: "3", replyOrigin: "turn", myMessageNumber: "2" }`. 추천 글은 이벤트에 없음. JS 오류 없음.
- 하지 않은 것: 실제 서버 · 로그인 · PostHog 수신 확인, Android, 실기기. 앱 소리 설정은 임시 진입점에 없어 끄지 못했다.
