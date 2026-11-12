# 에피소드 설문 — 낮은 별점 글 단계 e2e

결정: [ADR-0036](../adr/0036-user-feedback-survey-and-app-review.md) 적용 기록 ⟨2026-11-12 — 낮은 별점 글 단계⟩.

## 준비

- 설문은 **로그인 계정**이 튜토리얼(`u00-tutorial`)을 처음 끝냈을 때 한 번 뜬다(비회원은 뜨지 않음). 이미 답한 기기면
  `libitum.episode-survey.done`을 지운 새 설치로 시작한다.
- 앱 설정에서 소리를 끈다.
- 화면 깊은 곳까지 가기 어려우면 시트만 띄우는 임시 프로브로 볼 수 있다 — `src/app/index.tsx`의 `root.render`를
  `EpisodeSurveySheet` 하나로 바꿔 번들을 만들고, 확인 뒤 되돌린다(`git diff -- apps/mobile/src/app` = 0).

## 케이스

| ID | 절차 | 기대 |
|---|---|---|
| ESM-E1 | 설문에서 `2 · Could be better`를 누른다 | 시트가 닫히지 않는다. 별점 보기가 사라지고 「What could be better? (optional)」 글 칸 · 카운터 0/500 · 주황 「Send」 · 「Not now」가 보인다 |
| ESM-E2 | 글 칸을 누른다 | 시스템 키보드가 올라오고 **시트가 키보드 위로 올라간다** — 제목 · 글 칸 · Send · Not now가 모두 보인다. 키보드가 내려가면 시트도 내려온다 |
| ESM-E3 | 글을 쓰고 Send | 시트가 닫힌다. 서버 `feedback`에 `rating 2` · 그 글이 남고, 이벤트 `episode_survey_answered`의 `hasMessage`가 `true`. 평점 창은 뜨지 않는다 |
| ESM-E4 | (새 설치) 3점 → 글 없이 Not now | 시트가 닫힌다. 서버에 `rating 3` · `message null`. 이벤트 `episode_survey_answered`(`hasMessage false`) — `episode_survey_skipped`가 아니다 |
| ESM-E5 | (새 설치) 5점 | 지금처럼 바로 닫히고 평점 창 요청(설치당 한 번) |
| ESM-E6 | (Android) 1점 → 시스템 뒤로 | ESM-E4와 같은 결과(`rating 1`, 글 없음) |
| ESM-E7 | (Android) 설정 → Send feedback → 글 칸을 **한 번** 누르고 바로 입력 | 첫 탭부터 글자가 들어간다(포커스 링이 보인다) |
| ESM-E8 | VoiceOver · TalkBack 켜고 2점 | 초점이 글 칸으로 가고 「2 · Could be better」를 읽는다 |
| ESM-E9 | 작은 화면(iPhone SE급) · 큰 글자에서 ESM-E2 | 제목은 잘려도 글 칸 · Send가 키보드 위에 보인다 |

## 실행 상태

- ⟨2026-11-12⟩ iOS 시뮬레이터(iPhone 17 Pro) · 이 브랜치 번들 · **시트만 띄운 프로브**로 ESM-E1 · E2 · E3(시트가 넘기는
  값까지 — 서버 · 이벤트는 integration TU11이 진다) 통과. 수정 전 번들에서 E2가 **실패**했다 — 키보드가 글 칸과 Send를
  완전히 가렸다(호스트가 시스템 키보드에 화면을 줄이지 않음). `TextField`의 `keyboardheightchange` 전달과 시트 아래 비움으로
  고친 뒤 다시 돌려 통과. 에이전트 실행.
- ⟨2026-11-12⟩ Android 에뮬레이터(Pixel_8 · 1080×2400 · 420dpi, 읽기 전용 · 포트 5560 · 네트워크 끔) · `assembleBundled` · 시트
  프로브로 ESM-E1 · E2 · E3, 설정 「Send feedback」 프로브로 ESM-E7 통과 — 시트가 키보드 바로 위로 오르고 창이 따로 밀리지 않음(이중 비움 없음), Send → (2, 글). 이 회차에서
  결함 둘을 찾아 고쳤다: ① Android 키보드 높이가 물리 픽셀(882)이라 시트가 화면 밖까지 오름 → 밀도로 나눔, ② `TextField` 첫 탭 초점이
  곧바로 풀려 글자가 안 들어감(설정 「Send feedback」도 같음) → 포커스 링 그림자 층을 처음부터 둠. 에이전트 실행.
- 미실행: Android ESM-E6(뒤로), 작은 화면 · 큰 글자, VoiceOver · TalkBack 초점 이동, 로그인 계정으로 튜토리얼을 끝낸 실제 흐름, ESM-E4 · E5.
