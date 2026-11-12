# 수동 e2e — 메신저 탭 접근 (ADR-0128)

| id | 확인 | 기대 |
|---|---|---|
| MA-E1 | 손님으로 메신저 탭 | 엽전 칩 없음 · 아바타 셋 · 「Text the people you meet」 · 본문 · 「Sign up or log in」 |
| MA-E2 | 「Sign up or log in」 | 손님 버튼 없는 로그인 화면(탭 바 없음), 뒤로 = 메신저 탭 |
| MA-E3 | 손님 설정 탭 | Chats 줄 없음 |
| MA-E4 | 시험 계정이 아닌 회원 | 「Chats are almost here」 · 엽전 칩 · Go to Journey — 실제 계정 로그인이 필요해 미실행(통합 MA-I2) |
| MA-E5 | 시험 계정 | 지금 목록 · 설정 Chats 줄(ADR-0126 · 0127 기기 확인과 같음) |
| MA-E6 | 스크린리더 | 제목 · 본문 · 단추 이름이 한 번씩 |

## 실행 기록

### 2026-11-12 — Android 에뮬레이터 MA-E1 ~ E3 · E6(트리) 통과, 결함 하나 고침

- Pixel_8 에뮬레이터(읽기 전용), `assembleBundled`, 손님으로 시작.
- MA-E1: 시안대로 섰다(아바타 미 · 익 · 사 — 대화 출처 순서). MA-E2: 로그인 화면(Sign in with Apple · Connect with Google, 손님 버튼 없음). MA-E3: 설정 탭 학습 묶음에 Chats 줄 없음.
- **결함 — 단추 이름이 두 번**: 실제 접근성 트리(`uiautomator dump --compressed`)에 「Sign up or log in」이 두 번 있었다 — 안쪽 ui-lynx 단추를 숨긴 상자가 펴져 숨김이 사라졌다. → 그 상자에 `flatten={false}`. 그 뒤 한 번.
- MA-E4: 시험 계정이 아닌 실제 계정이 없어 미실행. MA-E6 실제 TalkBack 낭독은 미실행(트리만 봤다).
