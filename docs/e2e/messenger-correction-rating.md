# 수동 e2e — 교정 카드 · 다시 보내기 · 답 평가 (ADR-0129)

| id | 확인 | 기대 |
|---|---|---|
| CR-E1 | 답이 온 마지막 내 글의 연필 | 「FIX」 카드 · 고친 문장 강조 · 고친 곳 줄 · 「Send corrected」 |
| CR-E2 | 「Send corrected」 | 옛 내 글 · 답이 사라지고 고친 글이 새로 간다, 무료 수 하나 씀, 답이 온다 |
| CR-E3 | 👍 두 번 | 켜짐 → 꺼짐(낭독 「Good reply, selected」 → 「Good reply」) |
| CR-E4 | 👎 → Made me uncomfortable → Report | 이유 시트 · Report 줄 → 신고 시트, 👎 켜짐 |
| CR-E5 | 「…」 메뉴 | New reply ideas · Report 둘(「Ask for a fix」 없음), 빈 칸 없음 |
| CR-E6 | 스크린리더 | 카드 본문 한 번 · 단추 따로, 👍 👎 · 체크 줄 이름 |
| CR-E7 | better · l1_to_ko 카드 | 「MORE NATURAL」 · 「IN KOREAN」 + 「Send in Korean」 — 미실행(자판으로 그 글을 치기 어려워 ui 테스트 CR-UI2 · UI3로 갈음) |

## 실행 기록

### 2026-11-12 — Android 에뮬레이터 CR-E1 ~ E6(트리) 통과, 결함 둘 고침

- Pixel_8 에뮬레이터(읽기 전용), `assembleBundled`, 손님으로 시작. 손님에게는 메신저가 닫혀 있어(ADR-0128) **접근 판정을 임시로 `open`으로 바꾼 번들**로 봤다 — 확인 뒤 되돌렸고(`git diff` 0), 안드로이드 assets는 진짜 번들로 덮었다. 그래서 등급은 무료(3통)였다.
- 익선 게스트하우스 방(씨앗: 「저 체크아웃 몇 시예요?」 + 답) — CR-E1 · E2: 시안대로, 무료 3 → 2, 새 답 아래로 👍 👎가 옮겨 갔다. CR-E3 · E4 통과(신고 시트 위로 👎 켜짐이 보인다).
- **결함 — 낭독 문장 부호가 겹침**: 카드 낭독이 「…몇 시예요?. 저 → 저는, Add 는 to mark the topic.. …」. → 문장 끝 부호가 있으면 마침표를 붙이지 않는다(`correctionSpoken`, CR-U12). 다시 본 트리: 「FIX: 저는 체크아웃이 몇 시예요? 저 → 저는, Add 는 to mark the topic. 체크아웃 → 체크아웃이, Add 이 to mark the subject.」
- **결함 — 메뉴 아래 빈 칸**: 항목 셋 높이(168)가 남아 Report 아래가 비었다. → 둘 120 · 하나 64. 다시 본 화면에 빈 칸 없음.
- 관찰(이 변경 밖): 시트 설명 줄(「Pick any that apply…」)이 빈칸으로 보이고 트리에 제목 · 설명이 없다 — 기존 신고 시트도 같다(ui-lynx `BottomSheet`).
- CR-E6은 트리(`uiautomator dump --compressed`)만 봤다 — 실제 TalkBack 낭독은 미실행.
