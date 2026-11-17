# 에피소드 설문 — 낮은 별점 이유 · 글 단계 e2e

결정: [ADR-0036](../adr/0036-user-feedback-survey-and-app-review.md) 적용 기록 ⟨2026-11-12 — 낮은 별점 글 단계⟩ ·
⟨2026-11-17 — 낮은 별점 이유 체크리스트⟩. 2026-11-17부터 1~3점은 체크리스트이고 글 칸은 「Other」를 고를 때만 선다 —
아래 「체크리스트 케이스」가 ESM-E1 ~ E4 · E6 · E8을 대신한다(E5 · E7 · E9는 그대로, E9는 Other를 고른 뒤).

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

## 체크리스트 케이스 (2026-11-17)

| ID | 절차 | 기대 |
|---|---|---|
| ESC-E1 | 설문에서 `2 · Could be better` | 시트가 닫히지 않는다. 별점 보기 대신 「What didn't work well? Pick any that apply.」 · 두 칸 격자 여덟 항목 · 주황 「Send」 · 「Not now」. 글 칸은 없다. 360×640급 작은 화면 · 큰 글자에서 Send까지 스크롤로 닿는다 |
| ESC-E2 | `Audio problems` · `Too hard`를 누르고 Send | 시트가 닫힌다. 서버 `feedback`에 `rating 2` · `context.reasons = "too-hard,audio"` · `message null`. 이벤트 `reasons "too-hard,audio"` · `hasMessage false`. 평점 창 없음 |
| ESC-E3 | (새 설치) 1점 → `Other` | 글 칸 「What could be better? (optional)」이 선다. 글 칸을 누르면 키보드가 선 동안 체크리스트 · Not now가 내려가고 글 칸 · Send가 키보드 위에 보인다. 키보드를 내리면(Android 뒤로) 체크리스트 · Not now가 돌아온다. 글을 쓰고 Send → `reasons "other"` · 그 글 · `hasMessage true` |
| ESC-E4 | (새 설치) 3점 → `Other` → 글 → `Other`를 다시 눌러 풂 → Send | 글 칸이 사라졌다가 Send → `reasons ""`(context에 키 없음) · `message null` |
| ESC-E4b | (새 설치) 2점 → `Other` → 글 → `Other` 풂 → `Other` 다시 → 바로 Send | 다시 선 글 칸은 비어 있고, 서버 `message null` · `hasMessage false`(보이지 않는 옛 글을 보내지 않음) |
| ESC-E5 | (새 설치) 3점 → 항목 하나 → Not now / 닫기 / Android 뒤로 | 시트가 닫히고 `rating 3` · 이유 없음 · 글 없음의 답(`episode_survey_answered`, `skipped` 아님) |
| ESC-E6 | VoiceOver · TalkBack 켜고 2점 | 초점이 이유 질문으로 가고 「2 · Could be better」를 읽는다. 항목은 선택 상태를 읽는다 |
| ESC-E7 | UI 언어 vi · es | 질문 · 여덟 항목이 그 언어로 보이고 두 칸 격자에서 잘리지 않는다(es 라벨은 360×640 두 칸 격자에서 두 줄 이하가 되게 짧게 둠 — 2026-11-17 기기 확인 뒤. 「Demasiado …」 대신 「Muy …」인 이유도 이것이라 원어민 검수 때 같은 제약을 지킨다) |

## 실행 상태

- ⟨2026-11-17 — 체크리스트⟩ Android 에뮬레이터 Pixel_8(읽기 전용 인스턴스) `wm size 1080x1920` · `density 480`(360×640dp) ·
  `assembleBundled` · **시트만 띄운 프로브**(값은 logcat — 서버 · 이벤트는 integration TU10 · TU11이 진다). 에이전트 실행.
  - ESC-E1 통과 — 여덟 항목 · Send · Not now가 한 화면(첫 빌드에서 넘치면 칸이 겹쳐 고침: 설명 내림 · 체크리스트만 스크롤 · 간격 8).
  - ESC-E2 · E3 통과 — Too hard · Audio · Other + 「Too fast」 → `2 | too-hard,audio,other | Too fast`. 키보드(299dp) 위로 글 칸 ·
    Send가 선다(체크리스트 · Not now는 키보드가 선 동안 내려감, Send 아래 모서리는 키보드에 닿음).
  - ESC-E4b 통과 — Other → 「draft」 → 키보드 내림 → Other 풂 → 다시 고름: 글 칸 0/500, Send → `message null`. 풂만 한 경우도 null.
    이 회차에서 **키보드를 내린 뒤 체크리스트가 돌아오지 않는 결함**을 찾아 고쳤다(Android가 닫힘에 24를 보냄).
  - ESC-E7 통과 — es · vi 두 칸 격자에서 잘림 없음(es 라벨을 짧게 고친 뒤).
- ⟨2026-11-17 — 시뮬레이터 2차⟩ 같은 시트 프로브. 에이전트 실행.
  - **iOS 시뮬레이터 iPhone SE(3세대) · iOS 26.5** — ESC-E1 통과(여덟 항목 · Send · Not now가 한 화면). ESC-E3: Other → 글 칸 →
    Send 한 번 → `2 | other | (글)`(하드웨어 키보드 상태라 화면 키보드 없음). 화면 키보드가 선 회차에서는 체크리스트 · Not now가
    내려가고 Send가 키보드 위에 섰다.
  - **확인 못 함:** 화면 키보드가 선 채 Send를 누른 한 회차에서 **첫 탭이 키보드만 내리고 전송되지 않았다**. 배치 복원을 300ms
    늦춰도 같아 배치 이동 탓은 아니다. 옛 시트(main)와 같은 조건으로 맞비교하려 했으나 헤드리스 시뮬레이터에서 화면 키보드를 켜는
    조작(⌘K)이 자동화되지 않아 못 했다(옛 시트도 하드웨어 키보드 상태에서는 한 탭으로 전송). **실기 iPhone에서 키보드가 선 채 Send
    한 번으로 보내지는지 확인이 남았다.**
  - **Android TalkBack(Pixel_8 AVD 360×640)** — 2점을 고르면 TalkBack 초점이 이유 질문으로 옮겨 간다(접근성 C1 확인). 항목 사이 이동 ·
    항목 낭독(선택 상태 · 「Other, opens a text box」)은 adb 제스처로 TalkBack을 움직일 수 없어 못 봤다.
  - **하지 않음:** ESC-E5(닫는 길은 ui 테스트 ESM4 ~ 6), VoiceOver, 13 mini(프로브 조작 실패), 실제 로그인 계정의 서버 행.
    알려진 한계: ui-lynx `OptionSelector`가 선택 상태를 영어 「selected」로 붙인다(접근성 M1).

- ⟨2026-11-12⟩ iOS 시뮬레이터(iPhone 17 Pro) · 이 브랜치 번들 · **시트만 띄운 프로브**로 ESM-E1 · E2 · E3(시트가 넘기는
  값까지 — 서버 · 이벤트는 integration TU11이 진다) 통과. 수정 전 번들에서 E2가 **실패**했다 — 키보드가 글 칸과 Send를
  완전히 가렸다(호스트가 시스템 키보드에 화면을 줄이지 않음). `TextField`의 `keyboardheightchange` 전달과 시트 아래 비움으로
  고친 뒤 다시 돌려 통과. 에이전트 실행.
- ⟨2026-11-12⟩ Android 에뮬레이터(Pixel_8 · 1080×2400 · 420dpi, 읽기 전용 · 포트 5560 · 네트워크 끔) · `assembleBundled` · 시트
  프로브로 ESM-E1 · E2 · E3, 설정 「Send feedback」 프로브로 ESM-E7 통과 — 시트가 키보드 바로 위로 오르고 창이 따로 밀리지 않음(이중 비움 없음), Send → (2, 글). 이 회차에서
  결함 둘을 찾아 고쳤다: ① Android 키보드 높이가 물리 픽셀(882)이라 시트가 화면 밖까지 오름 → 밀도로 나눔, ② `TextField` 첫 탭 초점이
  곧바로 풀려 글자가 안 들어감(설정 「Send feedback」도 같음) → 포커스 링 그림자 층을 처음부터 둠. 에이전트 실행.
- 미실행: Android ESM-E6(뒤로), 작은 화면 · 큰 글자, VoiceOver · TalkBack 초점 이동, 로그인 계정으로 튜토리얼을 끝낸 실제 흐름, ESM-E4 · E5.
