# ADR-0036 — 사용자 피드백: 설정의 보내기 · 에피소드 끝 설문 · 앱스토어 평점 요청

- 상태: **제안** — 셋을 하는 것은 사용자 결정이다(2026-09-30). 세부(문구 · 별점 5단계 · 평점 요청 조건)는 기본값으로 정했고
  사용자 확인 전이다. 운영 DB에 표를 적용하기 전이다.
- 날짜: 2026-09-30
- 다루는 축: **사용자 피드백 수집**(새 축) · **호스트 네이티브 능력**(ADR-0017 — 열한째 모듈)
- 적용 기록: [ADR-0007](0007-app-internals-state-routing-data-errors.md) D1 — 기기 저장소 키 둘이 는다(설문을 끝낸 에피소드 ·
  평점 요청 여부). [ADR-0029](0029-product-analytics-posthog.md) — 이벤트 이름 넷. [ADR-0032](0032-account-sign-out-and-deletion.md) — 계정을
  지우면 피드백도 CASCADE로 지워진다.

## 사용자 결정 (2026-09-30)

앱 안 피드백 보내기 · 에피소드 끝 짧은 설문 · 앱스토어 별점 요청. **TestFlight 배포는 고르지 않았다.**

## 결정

### D1. 한 표 `feedback`, 한 RPC `submit_feedback`

- 마이그레이션 `apps/supabase-functions/supabase/migrations/20260930170000_feedback.sql`. 열: `kind`(`general` · `episode`) · `rating`
  (1~5) · `message`(선택, ≤1000자) · `context`(jsonb ≤2KB — 에피소드 ID 같은 맥락, 개인정보 없음) · `user_id`(CASCADE).
- RLS · 앱 역할 표 권한 없음(ADR-0034 D1 · ADR-0035 D1과 같다). 운영자는 대시보드로 읽는다.
- **사용자당 1분 5건** 상한 — 연타 · 반복 전송을 막는다.

### D2. 설정 → `Send feedback`

- 설정 이동 항목(알림 다음). 설정 탭 스택에 `feedback` 화면을 쌓는다 — 별점(필수, 5단계에 뜻을 단 보기) · 글(선택, 500자) ·
  보내기. 성공하면 감사 문구로 바뀌고 낭독한다, 실패하면 폼이 남고 실패 문구를 낭독한다.
- 이벤트 `feedback_opened` · `feedback_submitted { rating, hasMessage }`(성공만, **글은 싣지 않는다**).

### D3. 에피소드 끝 설문

- **활동으로** 에피소드의 모든 항목을 끝낸 순간(트로피 +1, 불러오기 · 합치기는 제외) 그 에피소드의 설문을 대기시킨다.
- 머리(`AppHeader`)가 맵 같은 탭 루트에 설 때 시트로 띄운다. **연속 모달이 먼저다** — 오늘 기록이 끝날 때까지 설문을 내놓지
  않고, 연속이 늘었으면 모달 → 닫으면 설문.
- 보기 다섯 중 하나를 누르면 끝난다. `Not now` · 바깥 누름 · 닫기는 건너뛰기. 답했거나 건너뛴 에피소드는 기기에 기억해
  **다시 묻지 않는다**(`libitum.episode-survey.done`).
- 답은 `submit_feedback(kind: episode)` + 이벤트 `episode_survey_answered { episodeId, rating }`, 건너뛰기는
  `episode_survey_skipped`.

### D4. 앱스토어 평점 요청

- 호스트 모듈 `AppReviewModule.requestReview()`(열째 다음 **열한째**) — iOS 16+ `AppStore.requestReview(in:)`, 이전은
  `SKStoreReviewController`. 결과를 알려 주는 API가 없어 콜백이 없다.
- **에피소드 설문 별점 4 이상 뒤, 설치당 한 번**(`libitum.app-review.requested`). 실제로 뜰지는 iOS가 정한다(1년 3번,
  개발 서명은 늘 뜸, TestFlight는 안 뜸).
- Android 호스트는 같은 `requestReview()` 계약을 Play In-App Review 2.0.2의
  `requestReviewFlow()` → `launchReviewFlow()`로 수행한다. 활성 Activity가 없으면 요청하지 않고,
  요청 진행 중 중복 호출은 합친다. Play의 완료는 대화 상자 표시나 평점 제출을 뜻하지 않는다.
  앱의 한 번 요청 기록은 iOS와 공유하는 JS 키의 값 `"1"`로 판단한다. Android Lynx의 빈
  `String` 반환을 미기록으로 처리해야 한다.
- **ADR-0017 D1 입장 조건 셋**: (1) 사용자 요구 — 스토어 평점은 앱 밖에서 줄 수 없다, (2) Lynx에 StoreKit 대체 0개,
  (3) e2e에 사람이 판정할 항목이 있다(개발 빌드에서 창이 뜨는가).

## 버린 대안

- **PostHog 설문(Surveys)** — Lynx SDK가 설문 UI를 그리지 않는다. 결국 화면을 우리가 그려야 하고, 답을 서버에 두는 편이 읽기 쉽다.
- **이메일(mailto)로 피드백** — 메일 앱이 없는 사용자가 막히고, 맥락(에피소드 · 별점)을 모을 수 없다.
- **평점을 우리 화면으로 먼저 묻고 5점만 스토어로** — Apple 지침(5.6.1)이 스토어 평점 창을 대신하는 자체 프롬프트를 막는다.
  설문은 에피소드에 대한 질문이고 평점 창과 따로 선다.

## 대가

- 번들 +15.1 kB — **상한 1,375,000까지 약 2.2 kB.** 다음 기능 전에 상한 또는 구성을 다시 봐야 한다.
- 설문 기억이 기기에 있다 — 앱을 지우거나 기기를 바꾸면 같은 에피소드를 다시 묻는다.
- 개인정보 처리방침에 「피드백 · 설문 답을 계정에 묶어 저장한다」를 더해야 한다.

## 재검토 조건

- 피드백이 늘어 대시보드로 읽기 힘들면 운영 화면(또는 PostHog 연동)을 연다.
- 설문 응답률이 낮으면 시점(결과 화면 안) · 모양(한 줄 질문)을 다시 본다.

## 적용 기록 ⟨2026-10-21 — 튜토리얼 u00⟩

결정은 [ADR-0081](0081-tutorial-as-catalog-episode.md) D7.

- **D3 — 설문 대상은 튜토리얼 하나 그대로이고, 그 튜토리얼이 `u00-tutorial`이다**(`SURVEY_EPISODE_IDS`, 제목 `Tutorial`). u00의 완료 키를 모두 끝낸 순간 대기된다. 카탈로그 다른 에피소드로 넓히지 않았다.
- 이벤트 `episode_survey_answered` · `_skipped`의 `episodeId`가 `tutorial` → `u00-tutorial`이다. 옛 설문 기억(`libitum.episode-survey.done`의 `tutorial`)은 id가 달라 이어지지 않는다 — 옛 튜토리얼 설문에 답한 사람도 u00을 끝내면 한 번 더 묻는다(ADR-0081 대가 4).
- D4(평점 요청 — 설문 5점 뒤)는 그대로다.

## 적용 기록 ⟨2026-11-12 — 낮은 별점 글 단계⟩

사용자 결정(2026-11-12): 에피소드 끝 설문에 글 칸이 없어 아쉬운 점을 받지 못한다 → 낮은 점수일 때만 묻는다. 근거: 운영
`feedback` 표에 설문 769건 · 글 0건, 1~3점 228건(29.6 %).

- **D3 개정 — 「보기 다섯 중 하나를 누르면 끝난다」는 4 · 5점에만 남는다.** 1 · 2 · 3점(`surveyMessageMaxRating = 3`)을 누르면
  같은 시트에서 선택 글 칸(「What could be better? (optional)」, 500자 — 설정 피드백과 같은 상한) · 「Send」 · 「Not now」로
  바뀐다. Send = 그 별점 + 글(앞뒤 공백 제거, 비면 `null`).
- **글 단계의 닫는 길(Not now · 닫기 · 바깥 · 끌어내림 · 시스템 뒤로)은 건너뛰기가 아니라 「그 별점 + 글 없음」의 답이다** —
  고른 별점을 버리지 않아 별점 건수가 이전 집계와 이어진다. 별점 단계의 닫는 길은 그대로 건너뛰기다.
- 이벤트 `episode_survey_answered`에 `hasMessage: boolean`을 더한다(글 본문은 싣지 않는다 — `feedback_submitted`와 같은 규칙).
  서버 · RPC는 바뀌지 않는다(`p_message`는 처음부터 받았다).
- 호스트가 시스템 키보드에 화면을 줄이지 않아(iOS 확인) 아래에 붙은 시트의 글 칸이 키보드에 가렸다. `TextField`가
  `<input>`의 `keyboardheightchange`(iOS · Android)를 `bindkeyboardheightchange`로 넘기고, 시트는 글 단계에서 그 높이만큼
  아래를 비워 키보드 위로 올라간다.
- `bindkeyboardheightchange`의 높이는 **Android에서 물리 픽셀**이다(에뮬레이터 실측 882 = 336dp × 2.625). `TextField`가
  `SystemInfo.pixelRatio`로 나눠 레이아웃 단위로 넘긴다(iOS pt는 그대로).
- **Android에서 `TextField`의 첫 탭 초점이 곧바로 풀렸다** — 이 변경 전부터 있던 결함으로, 설정 「Send feedback」 칸도 첫 탭에
  키보드만 뜨고 글자가 들어가지 않았다(두 번째 탭부터 정상). 원인은 포커스 순간 새로 생기는 포커스 링 `box-shadow`(Lynx Android가
  그림자 층을 만들며 입력을 다시 붙임). 그림자 층을 처음부터 투명하게 두고 포커스 때 색만 바꿔 고쳤다. 설정 피드백 글이 0건인 것과
  관계가 있을 수 있으나 확인하지 않았다.
- 1~3점을 고르면 다음 프레임에 글 칸으로 접근성 초점을 옮기고 고른 별점(「2 · Could be better」)을 낭독한다(접근성 점검 M1).
- D4(평점 요청 — 4점 이상 뒤)는 그대로다. 게스트 제외 · 튜토리얼에서만 묻기도 그대로다.
- 수동 절차: [설문 글 단계 e2e](../e2e/episode-survey-low-rating-message.md).
