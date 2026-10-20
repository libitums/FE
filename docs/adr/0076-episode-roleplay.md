# ADR-0076 — 본편 에피소드마다 롤플레이 하나 (표지 컷 → 최종 테스트 대사를 말로 · 끝낸 에피소드만 열림 · 연습이라 진행 · 티켓을 건드리지 않음)

- 상태: **채택 — 클라이언트만.** 콘텐츠 · 서버 · 호스트 변경은 0이다.
  **사용자 결정**(2026-10-20)이다 — 아래 굵은 문장은 사용자가 정했다. 화면은 시안(Artifact 「학습 화면 리디자인」 캔버스 6줄 — `RoleA` · `RoleSheet` · `RolePlay` · `RoleReply` · `RoleDone`)을 따른다.
  ⚠ **기기에서 보지 않았다** — unit · ui · integration 테스트와 번들 크기만 확인했다([에피소드 롤플레이 e2e](../e2e/episode-roleplay.md) ER1 ~ ER8, 미실행).
- 날짜: 2026-10-20.
- 다루는 축: 롤플레이 탭에 본편 에피소드가 쌓이는 방식, 한 판의 흐름, 말하기 판정, 진행 · 티켓과의 관계, 측정.
  **다루지 않는 것**: 타일로 대답하기(최종 테스트 화면의 몫), Plus 롤플레이, 등급 기준(결과 화면은 레슨과 같은 판정을 쓴다), 최종 테스트 화면에 말하기를 붙이는 일.

근거 표시: **[코드]** 저장소 코드(`apps/mobile/src/` 기준) · **[실측]** 빌드 · 테스트 · **[ADR]** 기존 결정 · **[추론]** 관찰 없이 이어 붙인 것.

## 맥락

1. 롤플레이 탭은 여정 맵 구획(튜토리얼 하나)에서만 항목을 만들었다 — 메신저 · 전화 · 비주얼 노벨 [코드 `roleplaySectionsFrom`]. 본편 에피소드는 카탈로그가 맵의 별도 구획으로 싣고(ADR-0024 D15), 롤플레이 탭에는 한 번도 서지 않았다 — 에피소드가 쌓여도 탭이 그대로였다(사용자 지적).
2. 본편 JSON에는 이미 롤플레이 대사가 있다 — `RP` 스텝(`ROLEPLAY_TURN`, `modes: ["speech", "tiles"]`)이고, 앱은 그것을 최종 테스트 턴으로 그린다(`catalogFinalPlanFor`) [코드].
3. **내장 세 에피소드 모두 표지(`pre_cuts`)의 마지막 컷이 최종 테스트 첫 턴의 상대 대사와 같다** — u01 「봉투 드릴까요?」 · u02 「이름이 어떻게 되세요?」 · u03 「안녕하세요. 이름이 뭐예요?」 [실측 — `roleplay-story-model.unit.test.ts` RM4가 지킨다].
4. 앱에는 기기 안에서 도는 말하기 모듈이 있다 — `SpeechRecognitionModule`(iOS `SFSpeechRecognizer` · Android `SpeechRecognizer`, ko-KR, 기본 기기 안 인식) [코드 · ADR-0018].

## 결정

### D1. **롤플레이 목록은 지금 틀(시안 A)에 에피소드마다 구획 하나를 더한다 — 사용자 결정**

- 튜토리얼 구획 뒤에 준비된(`catalog-ready`) 에피소드마다 구획 하나 — 머리 `Episode n.` + 영어 제목, 항목은 그 에피소드의 롤플레이 하나(`form: "story"`, `unitId: story-<episodeId>`).
- 카드 제목은 **에피소드의 영어 제목**이고 둘째 줄이 `Roleplay · N lines`다. 시안의 상대 이름(「편의점 점원」)은 쓰지 않았다 — 영어 UI의 탭 화면에는 한글을 두지 않는다(`App.ui-language` IL6) [코드].
- **열림 = 그 에피소드의 완료 키(`completion.requires`)를 모두 끝냄** — 튜토리얼 구획의 「항목을 전부 끝냄」과 같은 축이다. 잠긴 카드는 지금처럼 자물쇠 막이고 눌러도 열리지 않는다.
- 말할 턴이 없는 에피소드(최종 테스트 턴이 하나도 서지 않음)는 구획을 싣지 않는다.
- Plus 줄은 튜토리얼에만 있다(그대로).

### D2. **한 판 = 미리보기(에피소드 표지와 같은 틀) → 표지 컷 → 최종 테스트 대사를 말로 — 사용자 결정**

- route 하나(`roleplay-story`)가 세 단계를 화면 로컬 상태로 든다 — 뒤로가기는 어느 단계에서든 롤플레이 목록(`backToRoot`).
- **미리보기** — 표지와 같은 틀(장면 그림 · 위 그늘 · 머리 `Episode n.` + `Roleplay · 제목` · 아래 다이얼로그 · 주 버튼). 알약 `with <상대>` · `N lines`, 다이얼로그 한 줄 안내, `Start roleplay`. 장면 그림은 표지 마지막 컷의 것.
- **표지 컷** — 표지 화면(`CatalogCoverScreen`)을 그대로 쓴다. **마지막 컷이 첫 턴 대사와 같으면 그 컷은 빼고 첫 턴이 대신한다**(맥락 3). 남는 컷이 없으면 곧장 대화.
- **대화** — 턴마다 상대 대사를 표지와 같은 다이얼로그(`VisualNovelDialog`, 화자 = 에피소드 상대역)로 보이고, 그 아래 **배경 없이** 마이크 · `Show hint` · `Can't speak now`. 말풍선은 쓰지 않는다(사용자 결정).
  들은 뒤에는 같은 다이얼로그의 독백 꼴(`thought`, 화자 `Me`)로 내 말과 판정(`Great` · `Not quite`)을 보이고, 틀리면 `Try again`.
- 턴 데이터는 최종 테스트와 같은 계획 함수(`catalogFinalPlanFor`)에서 온다 — 프로필 치환 · 그림 · 소리가 같다.

### D3. 말하기는 앱 내장 모듈이고, 이름 · 나라 낱말은 판정에서 뺀다

- 인식은 `useSpeechAttempt`(권한 → 인식 → 결말)를 그대로 쓴다 — 새 네이티브 없음.
- 판정(`judgeRoleplayReply`) — 받아들이는 정답 중 하나라도 맞으면 정답. 이름 · 나라가 없는 정답은 말하기 학습형 규칙(`judgeSpeaking`, 부호 무시 · 앞에서부터 낱말 일치) 그대로.
  **채워 넣은 이름 · 나라(한국어)가 든 낱말은 빼고, 남은 낱말이 들은 문장에 차례대로 있으면 정답** — 외국 이름은 한국어 인식기가 받아 적지 못한다(「Emma로」 → 「엠마로」) [추론 — 기기에서 보지 않음].
- 인식 불가 · `Can't speak now`는 판정 없이 넘기고 결과에 싣지 않는다(최종 테스트 · 읽기와 같은 규칙).

### D4. 롤플레이는 연습이다 — 진행 · 티켓을 읽지도 쓰지도 않는다

- 진행 저장 · 트로피 · 연속 학습일에 닿지 않는다(integration IR3 — 마쳐도 서버 저장 0). 티켓을 쓰지 않는다 — 문지기(`withLearningTickets`)는 레슨 시작 둘만 감싼다(ADR-0075 D1).
- 결과는 레슨과 같은 화면(`LessonCompleteScreen`) · 같은 판정 기준(`catalogPassCriterion`)이고 나가기는 `Back to list`, `Try again`은 처음(미리보기)부터. 티켓 줄은 서지 않는다.

### D5. 측정 — 이벤트 둘

`episodeIntroEventSink`로 낸다(새 sink 없음). 타입 정본은 `screens/roleplay-story/roleplay-story.contract.ts`(`RoleplayStoryEvent`).

- **`roleplay_story_opened`** — 목록에서 에피소드 롤플레이 카드를 누름. 속성 `episodeId`.
- **`roleplay_story_completed`** — 마지막 턴을 넘김. 속성 `episodeId` · `correctCount` · `judgedCount` · `skippedCount`(10진 문자열 — 분석 속성은 문자열 · 불리언만).
- 대사 · 들은 문장은 싣지 않는다(ADR-0029 D14).
- 알고 싶은 것: 끝낸 에피소드 중 롤플레이를 여는 비율, 연 판 중 끝까지 가는 비율, 인식 불가로 넘긴 비율(`skippedCount`).

## 결과

- 새 화면 폴더 `screens/roleplay-story/`(미리보기 · 대화 · 말하기 묶음 · 순수 로직 · 계약 · CSS), 앱 결선 `app/roleplay-story-model.ts` · `roleplay-sections.ts` · `roleplay-story-wiring.ts` · `RoleplayStoryFlow.tsx` · `render-roleplay-story.tsx`.
- route 둘 — `roleplay-story`(전체 화면, 상태 표시줄 등록부 `fullBleedRoutes`에 든다 — ADR-0050 적용 기록) · `roleplay-story-complete`.
- 이벤트 이름 42 → 44(ADR-0029 D14 적용 기록).
- 번들 증가는 [성능 보고서](../performance/reports/episode-roleplay-iphone-17-pro-simulator-01.md).

## 재검토 조건

1. 기기에서 이름 · 나라 예외 판정이 너무 느슨하거나(엉뚱한 말도 맞음) 너무 빡빡하면 — 규칙(D3)을 다시 정한다.
2. 콘텐츠가 표지 마지막 컷을 첫 턴과 다르게 보내면 — 지금은 컷을 그대로 두고 첫 턴이 한 번 더 말한다(RS8). 겹침을 다른 신호로 가를지 정한다.
3. 타일 대답을 롤플레이에도 열자는 요구가 오면 — 최종 테스트 화면과 합칠지 정한다.
