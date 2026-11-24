# 수동 e2e — 다시 듣기 · 단어 칩 소리 (ADR-0188)

결정은 [ADR-0188](../adr/0188-replay-audio-and-chip-sound.md), 시안은 [docs/design/replay-audio.md](../design/replay-audio.md).

| 이미 지는 층 | 무엇을 |
|---|---|
| unit | 단추 상태(`sentenceReplayOf` · `answerReplayOf`) · 칩 주소(`catalogChipAudioOf`) · 매핑의 `choiceAudio` · `chipAudio` · 이벤트 모양 · 점검 도구 |
| ui | 스피커 켜짐/회색 · 컷 화면 자리 · 셸 배지 옆(넘김 중 없음) · 조립 놓을 때만 칩 소리 · 단어 고르기 칩 소리와 판정 보고 무관 · 정답 뒤 음성과 같은 소리는 건너뜀 |
| integration | 내장 u01 사본 → 계획 → 화면 → 재생 모듈 주소 · sink 이벤트(IR1 ~ IR3), 정답 뒤 음성 기존 기대(AE1 ~ AE4) |

**이 문서만 보는 것**: 기기에서 스피커가 그 자리에 보이고 눌리는지, 회색이 회색으로 보이는지, 실제 재생 모듈까지 가는지(로그), 레슨 배지 줄의 넘친 누르는 자리, JS 오류.

## 전제

- iOS: 이 확인용으로 만든 시뮬레이터(iPhone 17 Pro, iOS 26.5), Release Host + 내장 번들(`--bundle-url=main.lynx`), `.env.local`을 main 체크아웃에서 복사.
- Android: `assembleBundled` + 읽기 전용 AVD(`-read-only -no-audio`).
- 앱에 소리 끄기 스위치가 없어 누름을 최소로 한다. 소리는 귀로 듣지 않는다 — 재생 모듈 로그로 판단한다.
- 손님(「Continue without an account」)으로 들어간다 — 로그인 · 응답 흉내 없음.

## 관찰 항목 (RA1 ~ RA7)

통과·실패는 `통과` / `실패: <관찰>` / `판정 불가: <이유>` / `미확인`으로만 적는다.

| id | 단계 | 관찰(통과 조건) |
|---|---|---|
| RA1 | 맵 → Episode 0 표지 → `Next` → 컷 | 대사 상자 위 오른쪽에 스피커. 혼잣말 · 지문 컷은 회색(눌러도 아무 일 없음) |
| RA2 | 소리 있는 대사 컷에서 스피커 누름 | 그 컷 주소로 재생 모듈 호출이 한 번 더(로그). 대사 토글 · 컷 번호는 그대로 |
| RA3 | 큰 글자 · 좁은 화면 | 스피커가 대사 상자 · Next를 덮지 않는다 |
| RA4 | 레슨의 문장 조립 · 음절 조립 Check 뒤 | 판정 배지 옆 스피커(정답 음성이 없으면 회색). 단어 고르기의 저절로 넘김 중에는 없다 |
| RA5 | 단어 고르기 보기 · 문장 조립 조각 누름 | 녹음이 있는 낱말은 재생 모듈 호출, 없으면 조용. 판정 · 넘김은 그대로 |
| RA6 | 레슨 배지 줄 스피커의 위 · 아래 가장자리(넘친 6) 누름 | 단추로 간다 |
| RA7 | 실행 로그 | ReferenceError · TypeError · 1101 없음 |

## 회차

### 2026-11-24 — iOS 시뮬레이터 · Android `assembleBundled` 에뮬레이터

- 대상: `feat/replay-audio` 작업 트리(자동 재생 끔 가드까지 넣은 번들). iOS: 이 확인용으로 만든 iPhone 17 Pro 시뮬레이터(iOS 26.5, 확인 뒤 지움), Release Host, 번들은 설치된 앱에 덮어씀.
  Android: `Pixel_8` AVD `-read-only -no-snapshot-save -no-audio`, 포트 5574(확인 뒤 끔).
- 새 설치 → 손님 → 「Jump into the story」 → Episode 0 표지 → 컷 → Lesson 1. 로그인 · 응답 흉내 없음.
- 소리는 귀로 듣지 않았다 — iOS는 Lynx 모듈 호출 로그(`AudioPlaybackModule.play`), Android는 `logcat`의 같은 호출로 판정했다.

| id | iOS | Android |
|---|---|---|
| RA1 | 통과 — 컷 1(혼잣말) 대사 위 오른쪽 회색 스피커, 낭독 「Audio not available yet」 · NotEnabled, 대사(버튼)보다 앞 순서 | 통과 — 같은 자리 회색, 「Audio not available yet」 |
| RA2 | 통과 — 컷 7(승무원 대사) 「Play again」(Button), 누르니 `play …/u00-tutorial/d-01-r2.m4a`가 자동 재생 8초 뒤 한 번 더, 컷 번호 7/7 그대로 | 미확인 — 소리 있는 컷에서 누르지 않음 |
| RA3 | 미확인(기본 글자 크기만) | 미확인 |
| RA4 | 미확인 — 문장 · 음절 조립까지 레슨을 진행하지 않음(ui LR1 ~ LR4 · SC4 · SB1, integration IR2가 짐) | 미확인 |
| RA5 | 통과 — 그림 고르기에서 틀린 보기 「감사합니다」 → `play level-3-u00-tutorial-s1-03-word` → 오답 효과음 → `play …s1-01-word-r2`(정답 뒤 음성) | 통과 — 같은 순서(`s1-03-word` → `wrong_answer` → `s1-01-word-r2` → 넘길 때 `stop`) |
| RA6 | 미확인 | 미확인 |
| RA7 | 통과 — 10분 로그에 ReferenceError · TypeError · 1101 없음 | 통과 — 레슨 시작 뒤 로그에 없음 |

스크린샷(저장소 밖): 컷 회색 · 컷 「Play again」(iOS), 컷 회색 · 보기 누름(Android) — PR 본문에 경로를 적었다.
