# ADR-0169: 바텀 메뉴 More — Letters(자모표 · 합치기 퀴즈) · My words(기기 단어장) · Letters 추천

- 상태: **제안 — 구현됨**(브랜치 `feat/more-menu-letters-wordbook`). 번들 천장은 사용자 결정으로 5,850,000 B([ADR-0149](0149-bundle-size-ceiling-and-report.md) 개정 2). (2026-11-20)
- 날짜: 2026-11-20
- **사용자 결정** (2026-11-20, 캔버스 「이탈 많은 학습 화면」): 시안 MoreNav · MoreSheet · JamoChartSelC(선택 표시 **C** 채택) · JamoCompose · WordbookList ·
  WordbookDetail · WordbookReview · RecommendWrong · RecommendSyllable. 학습 중에는 추천을 띄우지 않는다 · 레슨 결과 화면에 단어장 입구를 넣지 않는다.
- **조정자가 정한 기본값(사용자가 바꿀 수 있음)**: 설정을 더보기 메뉴로 옮기고 탭은 넷 · 추천 문턱 3번 틀림 · 2번 연속 · 총 2회 · 글자 소리는 자음 + ㅏ ·
  단어장은 기기 저장 + 비회원 이어받기.
- 바꾸는 결정: [ADR-0007](0007-app-internals-state-routing-data-errors.md) D3의 탭 넷 중 넷째가 `settings` → `more`(루트가 메뉴에서 고른 화면). [ADR-0149](0149-bundle-size-ceiling-and-report.md) —
  앞 천장(5,705,000 B)을 넘어 **사용자 결정으로 천장을 5,850,000 B로 올렸다**(개정 2, 아래 「대가」). 딥링크 `duru://settings`([ADR-0080](0080-airbridge-deeplink.md))는 더보기 › Settings로.

## 맥락

- 이탈이 많은 학습 화면(레슨 2 듣고 문장 만들기 정답률 26.7% · 레슨 1 음절 조립)은 한글을 못 읽는 데서 온다. 글자를 따로 배울 자리가 앱에 없었다.
- 단어 카드(VOCAB_CARD)로 만난 단어를 다시 볼 자리도 없었다.
- 바 넷째 탭(설정)은 드물게 쓰인다 — 그 자리를 「더보기」로 바꿔 Letters · My words · Settings를 담는다.

## 결정

### D1. 넷째 탭 = 더보기 동그라미, 메뉴 카드는 스크림 없이 바 위에

- `Tab = journey | roleplay | messenger | more`, `MoreRoot = letters | wordbook | settings`. `NavAction` `openMore(root)` — more 탭으로 가며 more 스택을 그 화면
  하나로 다시 세운다(진입 구간에서는 무시). `moreRootActions` · `moreRootOf`.
- ⋯는 탭을 바꾸지 않고 메뉴 카드를 열고 닫는다(`AppBottomBar`). 열린 동안 ×(brand-strong) · 이름 「Close menu」. 다시 누름 · 바깥 투명 막 · 시스템 뒤로면 닫힌다.
  다른 탭을 누르면 닫고 그 탭으로 간다(막이 바를 덮어 실제로는 닫힘만).
- ⟨2026-11-20 수정 — fix/more-menu-clipped⟩ 카드는 바 묶음(`.app-navigator`) **안**, 바 앞 흐름 자식이다(`AppNavigator`가 `children`을 바 앞에 그림).
  처음 구현은 카드를 묶음 밖(`bottom: calc(100% + 8)`)에 절대 배치했는데, iOS 시뮬레이터 · Android `assembleBundled` 둘 다 묶음 경계에서 잘려
  카드가 화면에도 접근성 트리에도 없었다. 묶음 `overflow: visible`(Lynx 기본값은 `hidden`), 카드 `z-index`, 묶음 `z-index` 빼기로는 풀리지 않았고, 같은 카드를
  묶음 안(`bottom: 0`)에 두면 그려졌다(Lynx SDK 4.0.1). 카드를 투명 자리(`more-menu-slot`, 안쪽 여백 16/16/8 — 시안의 좌우 16 · 바 위 8, 위 16은 그림자 s3 몫)로
  감싸 그 둘레를 눌러도 닫히게 했다(묶음이 바깥 막보다 위라 막이 받지 못하는 곳). 줄 · 카드는 `catchtap`이라 그 탭이 자리까지 올라가지 않는다.
  카드가 트리에서 바보다 앞이라 열면 접근성 초점을 첫 줄(Letters)로 옮긴다(`lib/accessibility.ts` `focusAccessibilityElement` — 메신저 「…」 메뉴의 `restoreAccessibilityFocus`도 이 함수를 부름).
- ui-lynx `BottomNavigator` 항목에 `variant: "action"` — 48 brand 동그라미 · 흰 아이콘 · 선택이면 알약 대신 바탕색 틈 3 + brand 고리 2(선택 C), 낭독 「More, selected」.
- 설정으로 가는 길: 메뉴 Settings 줄(`settings_opened`는 설정 루트가 아닐 때만) · 딥링크 settings → `moreRootActions("settings")` · 다운로드 시트 「Change setting」 ·
  비회원 로그인(설정 스택 그대로). 시스템 뒤로는 more 루트에서 여정으로(기존 규칙).
- **확장**: 탭 목록은 데이터(`components/BottomNavigator.tsx`의 `tabs`)이고 더보기는 늘 마지막이다. 다섯째 탭(랭킹, 다른 브랜치)은 그 앞에 한 줄 + `Tab` · `initialNav.stacks` ·
  이름표에 같은 id를 더하면 된다. 항목이 다섯이면 ui-lynx가 바 폭에 고르게(항목 56 · 양끝 맞춤, 시안 RankingTab) 놓는다.

### D2. Letters — 자모표 40자, 소리는 버킷에서

- more 스택 루트(뒤로 없음 · 바 유지 · 전역 머리 없음). 위 고정(제목 · 리드 · 「Practice: build sounds」), 아래 4열 격자만 스크롤: 기본 자음 14 · 기본 모음 10 · 쌍자음 5 · 겹모음 11.
  칸 = 로마자(보드의 개정 로마자, 기존 보기 로마자 설정을 따름) · 글자 · 스피커. 방금 칸 강조, 들은 칸 스피커 brand-strong.
- 소리: 자음 + ㅏ(가 · 까 …), 모음은 ㅇ + 모음(아 · 의 …). 파일은 앱에 싣지 않는다([ADR-0060](0060-episode-voice-remote-audio.md) D1) — 버킷 `audio/letters/<로마자>.m4a`,
  음성 정보 파일(`audio/manifest.json`)에 `letters/<로마자>` 항목이 있을 때만 소리가 있다고 본다. 없으면 스피커가 흐린 모양이고 낭독에 「sound not available yet」, 칸은 그대로 눌린다.
- 한글 표는 학습 콘텐츠 선언(ui-copy-literals 정책)이다.

### D3. 합치기 퀴즈 — 음절 조립 형식, 3라운드

- `LearningShell`(form syllable-build · 캡션 「Letter building」) · 칸 [자음] + [모음] = [결과] · 타일 여섯 · Hint. 두 칸이 차면 결과 글자 + 소리 + 곧바로 판정, 맞으면 Next,
  틀리면 Try again(비우고 같은 라운드). 가 · 너 · 도. 레슨 기록 · 티켓과 무관한 연습이고 나가기는 레슨과 같은 확인을 거친다.
- ⟨2026-11-20 개정 — [ADR-0172](0172-letters-audio.md) D6⟩ 소리는 **맞힌 때만, 정답 효과음 뒤 0.9 s에 그 음절을 한 번**이다(틀리면 효과음만, 설정 Auto-play를 따름).

### D4. My words — 기기 단어장, 간단한 간격 반복

- 단어 = 학습자가 **단어 카드 활동을 끝낸** `voca:` ref(`expr:` 등은 넣지 않음). 레슨 계획의 문항 ref에 콘텐츠 `ref`를 실어(`CatalogItemRef.contentRef`) 단어 카드 활동이 끝날 때
  적는다. 채점 문항의 첫 판정이 그 ref의 단어에 맞힘 · 틀림으로 더해진다(이미 단어장에 있는 단어만).
- 기록 `{episodeId, ref, firstSeen, correct, incorrect, box, due, last}` — 상자 0~4, 다음 복습까지 1 · 3 · 7 · 14 · 30일, 맞으면 상자 +1, 틀리면 상자 0 · 내일. 상태:
  복습 날이 왔거나 마지막이 틀림 → Review, 답이 없음 → New, 그 밖 → Got it. 글 · 뜻 · 예문 · 음성은 UI 언어 카탈로그에서 읽는다(뜻은 언어를 바꾸면 따라 바뀜).
- 화면: 목록(복습 CTA · 칩 All/New/Review/Got it · 줄) · 자세히(Listen/Slow · 이야기 예문 · 처음 본 날 · 맞힌 수 · Practice this word) · 오늘의 복습(보기 셋).
- 저장 `libitum.wordbook.<userId>` · 비회원 `libitum.wordbook.guest`. 로그인 때 `adoptGuestRecords`가 계정 칸으로 합치고(같은 단어는 수를 더하고 이른 첫 날) 비회원 칸을 지운다.
  계정 삭제 성공이 그 계정 칸을 지운다. **서버 동기화는 하지 않는다** — 기존 서버 저장소(학습 진행 · 프로필)가 이 기록을 덮지 않아, 새 표 · RPC 없이 기기에만 둔다(다른 기기에서는 비어 보임).
- 레슨 결과 화면에는 넣지 않는다(사용자 결정).

### D5. 여정맵 Letters 추천 — 레슨 중에는 신호만

- 레슨 자취(`learning-trail`): 한글 읽기 문항(SYLLABLE_BUILD · LISTEN_BUILD · CLOZE · CLOZE_CHOICE)의 첫 판정 틀림 수, 다시 풀기에서 같은 문항을 또 틀림(연속 2), 끝(통과 finished ·
  실패 failed · 나가기 exited). 메모리에만 둔다.
- 이유: 실패 · 나가기 → failed 문구, 끝냈고 3번 이상 또는 연속 2 → hard 문구. 지도가 한가하고(진행 읽음 · 지도 루트 · 겹침 · 티켓 · 설문 · 연속 축하 없음) 엽전 · 업데이트 안내가
  닫힌 뒤 신호를 꺼내 `delayMs` 1.2초(발자국 연출) 뒤 ui-lynx `Dialog`(제목 위 그림 자리 `children`을 더함)를 세운다.
- 안 띄움: Letters를 연 사람 · 오늘 본 사람 · 총 2번 본 사람 · Keep going 2번. 문턱은 `lettersRecommendConfig` 하나. 기록 `libitum.letters`(기기 범위).
- Learn the letters → 더보기 › Letters(선택 C, 연 기록). Keep going → 닫기(횟수 +1). 시스템 뒤로 → 닫기(횟수 그대로).

### D6. 지표

`more_menu_opened` · `more_menu_item_clicked{item}` · `letters_cell_tapped{letter, group, audio}` · `letters_quiz_answered{round, target, correct}` · `letters_quiz_completed{rounds, firstTry}` ·
`wordbook_opened{words, due}` · `wordbook_review_answered{correct}` · `letters_recommend_shown|clicked{reason}` · `letters_recommend_dismissed{reason, choice}`. 공통 속성 surface learning ·
daysSinceFirstOpen(영역 이벤트와 같은 방식, `emitCompanionEvent`). 이름 75 → 85.

### D7. 문구 · 디자인

- 새 문구는 `UiCopy.more` 한 묶음 — en · es · id(`ui-copy-more.ts`), ja · vi(`ui-copy-more-asia.ts`), 모양은 `ui-copy-more.contract.ts`. 모두 실제 번역(원어민 검수 전).
  **태국어 · 미얀마어는 #522가 들어온 뒤** `ui-copy-more-asia.ts`에 `th` · `my` 덩어리를 더하고 그 표에 `more: …`를 꽂는다 — 빠지면 `UiCopy` 타입이 멈춰 알려 준다.
- 새 토큰 0. 보드의 생 hex는 토큰으로 사상: 주황 = brand-primary · 짙은 주황 = brand-strong · 연한 주황 면 = background-elevated · 칸 테두리 = gray-300 · 눌림 = gray-100 ·
  판정 = feedback-correct/incorrect(-surface · -text). 보드의 파랑(복습)은 토큰이 없어 **Review 칩 = feedback-warning-surface + warning-text**, 짙은 단추 = fg-neutral 면으로 바꿨다.
  메뉴 카드 radius-lg · shadow-s3 · 움직임 d4 · enter(움직임 줄이기면 없음).

### D8. 번들 — `extractStr` 켬(⟨2026-11-20 개정⟩ 끔 — JSON 생성 규칙만 유지, 아래)

- ReactLynx `extractStr: true`(두 스레드가 같은 문자열 리터럴을 나눠 씀). 앱 전체에서 약 103 kB가 줄었다. 그래도 천장 아래로 내려가지 않는다(아래).
- ⟨2026-11-20 개정 — `extractStr` 끔, 같은 크기는 JSON 규칙으로⟩ 기기에서 실행할 때마다 main-thread가
  `ReferenceError: __EXTRACT_STR_IDENT_FLAG__ is not defined`를 냈다(iOS 시뮬레이터 · Android `assembleBundled` 에뮬레이터 둘 다, 실행마다 2번 —
  Lynx가 `onErrorOccurred` 1101로 호스트에 넘기고 Android는 크래시 보고 예산을 쓴다).
  - **원인**: 설치된 `@lynx-js/react` 0.125.0 런타임(`runtime/lib/core/lynx-data-processors.js` 61-67행)은 `__EXTRACT_STR__`가 참이면
    `__EXTRACT_STR_IDENT_FLAG__`를 읽는데, `@lynx-js/react-webpack-plugin` 0.11.1(`ReactWebpackPlugin.js` 219행)은 `__EXTRACT_STR__`만 정의하고
    그 이름은 어떤 패키지도 정의하지 않는다. 그 읽기가 `processData`의 try/catch 밖이라 네이티브 호출로 그대로 올라간다.
    오픈소스 빌드에는 문자열을 실제로 뽑는 단계도 없다 — 켠 번들과 이 개정의 번들(끔 + JSON 규칙)의 JS 차이는 이 `processData` 분기 하나뿐이었다(문구 · 화면 동일).
  - **103 kB의 정체**: `@lynx-js/react-rsbuild-plugin` 0.19.1 `applyGenerator`가 `extractStr`일 때 `.json`을 `JSON.parse('…')` 대신 객체 리터럴로 내는
    규칙(`react:json-parse`, `JSONParse: false`)을 main-thread만이 아니라 background에도 건다. 문자열 공유가 아니라 이 JSON 생성 방식이 크기를 줄였다.
  - **결정**: `extractStr`를 끄고 `tools.bundlerChain`에서 `react:json-parse`의 `issuerLayer`를 지워 같은 규칙만 유지한다.
    `main.lynx.bundle` 5,835,191 → 5,835,126 B(−65 B, .env.local 없는 설정). 끄기만 하면 5,938,132 B(+102,941 B)로 천장 5,850,000 B를 넘는다.
    검사: unit XS-U1 ~ U3(`lynx-config.unit.test.ts`), integration XS-I1 · I2(`lynx-build-config.integration.test.ts`), e2e `docs/e2e/extract-str-flag.md`.
  - 업스트림이 식별자를 정의하거나 런타임이 읽지 않게 되면 XS-U3가 깨진다 — 그때 `extractStr`를 다시 볼 수 있다.

## 소리 파일(올려야 할 것)

버킷 `content`(시험은 `content-test`)의 `audio/letters/` 아래 m4a(AAC · 모노 · 44.1 kHz, ADR-0060), 그리고 `audio/manifest.json`에 같은 id의 `duration_ms` 항목. **41개**:

- 자음 + ㅏ(18): `ga` 가 · `kka` 까 · `na` 나 · `da` 다 · `tta` 따 · `ra` 라 · `ma` 마 · `ba` 바 · `ppa` 빠 · `sa` 사 · `ssa` 싸 · `ja` 자 · `jja` 짜 · `cha` 차 · `ka` 카 · `ta` 타 · `pa` 파 · `ha` 하
- ㅇ + 모음(21, ㅇ의 소리 「아」를 함께 씀): `a` 아 · `ae` 애 · `ya` 야 · `yae` 얘 · `eo` 어 · `e` 에 · `yeo` 여 · `ye` 예 · `o` 오 · `wa` 와 · `wae` 왜 · `oe` 외 · `yo` 요 · `u` 우 ·
  `wo` 워 · `we` 웨 · `wi` 위 · `yu` 유 · `eu` 으 · `ui` 의 · `i` 이
- 퀴즈(2): `neo` 너 · `do` 도(가는 위 `ga`)

이 브랜치는 아무것도 올리지 않았다. 올린 뒤 음성 정보 파일이 갱신되면 앱 업데이트 없이 소리가 난다.
⟨2026-11-20⟩ 만들기 · 올리기 도구와 자음 소리(자음 + ㅏ)의 근거, 목소리 선택지는 [ADR-0172](0172-letters-audio.md)가 진다.

## 대가

- **번들 천장 초과**: main 5,326,023 B(origin/main) → 5,480,476 B(기능, +154,453 B) → 5,377,543 B(`extractStr`) → 5,379,693 B(접근성 · 리뷰 반영 뒤 최종, +53,670 B).
  천장 5,327,000 B보다 **52,693 B 크다**. ui-lynx dist 566.6 → 570.0 kB(천장 622 kB 아래).
  천장은 올리지 않았다 — 바꿀지는 사용자 결정(ADR-0149). 더 줄일 길: 단어장 · Letters 화면을 lazy bundle로 떼기(호스트 로딩 확인 필요) · 문구 줄이기.
- ⟨2026-11-20 main 리베이스 뒤⟩ th · my 화면 문구(#522)가 들어온 main 위에서 origin/main 5,679,379 B → 이 브랜치 5,749,897 B(+70,518 B, th · my 문구 포함).
  앞 천장 5,705,000 B를 44,897 B 넘어 **사용자 결정(「a + b」)으로 천장을 5,850,000 B로 올렸다**(ADR-0149 개정 2). 화면 lazy 로딩은 따로 조사한다.
- 단어장은 기기에만 있다 — 다른 기기 · 재설치에서 비어 보인다.
- 「같은 문항 연속 틀림」은 첫 판정과 다시 풀기의 틀림으로 본다(첫 판정만 보고되는 측정 규칙 때문).
- 설정이 한 번 더 누르는 자리로 갔다.
- 「나가기」는 문항을 하나도 틀리지 않았어도, 최종 롤플레이 시험을 나가도 failed 추천 신호가 된다(지시문 그대로 — 사용자 결정 대기, 리뷰 M2). 노출 상한 2를 쓴다.
- 「방금 틀린 단어」는 Review 칩이지만 오늘 복습 수(CTA)에는 내일부터 든다. 메뉴 줄의 수는 카탈로그에서 풀리지 않는 기록도 센다.
- 머문 시간 요약(`surface_session_ended`)은 more 탭을 어느 영역에도 넣지 않는다(설정과 같음) — Letters · My words 시간은 학습 영역에 잡히지 않는다.
- 선택 C 고리(brand-primary)는 바탕 대비 2.97 : 1로 WCAG 1.4.11의 3 : 1에 근소하게 모자란다 — 시안 그대로, 낭독 「More, selected」와 모양이 함께 전한다(디자인 결정 대기).
  흰 글 · brand-primary(3.02 : 1)는 ADR-0113 D8 앱 전체 예외. 필터 · 힌트 칩 36 · 재생 40은 권장 44보다 작다(AA 위반은 아님, 디자인 결정 대기).

## 접근성 · 리뷰 반영(2026-11-20)

- 누르는 요소 전부 `flatten={false}`(Android TalkBack), 단어 줄의 재생 단추를 줄 단추 밖 형제로 · 이름 「Play, 단어」, 칩 「selected」를 문구표로, 제목이 단어 수와 함께 읽힘,
  들은 칸 낭독 「heard」, 합치기 퀴즈 판정 · 힌트 · 완료 낭독.
- 메뉴가 열린 동안 뒤 화면 · 전역 머리를 낭독에서 빼고 「Menu, 3 items」를 한 번 낭독, 업데이트 안내 · Letters 추천이 선 동안 뒤 화면 · 바를 낭독에서 뺀다.
- 추천은 띄우기 직전에도 띄우지 않는 규칙을 다시 본다(기다리는 사이 Letters를 연 경우), 추천이 떠 있으면 엽전 · 업데이트 안내가 끼어들지 않는다, 바뀐 것이 없으면 단어장을 쓰지 않는다.

## 버린 대안

- 탭 다섯(설정 유지 + 더보기) — 375 · 390 화면에 64 항목 다섯이 들어가지 않는다(랭킹 탭이 오면 56 양끝 맞춤으로 간다).
- 메뉴를 바텀 시트로 — 시안이 스크림 없는 카드(지도가 어두워지지 않음)를 골랐다.
- 단어장 서버 저장 — 새 표 · RPC · 마이그레이션이 필요하고 범위 밖이다.
- 글자 소리를 앱에 싣기 — ADR-0060 D1에 어긋나고 번들이 더 커진다.

## 확인

- 테스트: unit · ui · integration(아래 증거) — mobile 10,249건 통과 · ui-lynx 통과.
- e2e: [수동 절차](../e2e/more-menu-letters-wordbook.md) — ⟨2026-11-20⟩ ME-E1~E4 · E20 일부 실행(메뉴 카드 잘림 수정 뒤 iOS · Android 통과), 나머지 미실행.
- 성능: [보고서](../performance/reports/more-menu-letters-wordbook-01.md)(미측정, 번들만).
