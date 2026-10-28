# ADR-0088 — 막간(INT) 이야기 유닛: 스페셜 노드 · 무료 · 사슬 · 표지 컷 화면

- 상태: **채택.** 앱 콘텐츠 수준을 2로 올린다(`CONTENT_CLIENT_LEVEL`, [ADR-0087](0087-content-level-manifests.md)).
  ⚠ **기기 확인은 iOS 시뮬레이터 한 회차**(2026-10-26, 커밋하지 않은 임시 내장 픽스처) — 맵의 Story 노드 · 말풍선 · 컷 화면 첫 컷까지 봤다. Android · VoiceOver · 메신저 · 전화 형식의 기기 화면은 보지 않았다([막간 e2e](../e2e/interlude-story.md)).
- 날짜: 2026-10-26.
- **사용자 결정**(2026-10-26):
  - INT는 비주얼 노벨 · 메신저 · 전화 형태가 자유롭게 나오며, 에피소드 첫 유닛(표지)처럼 이야기를 쌓는 유닛이다.
  - 맵 노드는 **스페셜 유닛 · 최종 테스트와 같은 컴포넌트**다.
  - **티켓 무료** · **S4 → INT → S5 사슬로 잠근다** · 완료 조건은 **새로 하는 사람만**(이미 끝낸 에피소드는 되돌리지 않는다).
  - INT 판은 수준별 매니페스트로 새 앱에만 보낸다(ADR-0087).
- 다루는 축: 와이어 해석 · 도메인 모델 · 맵 노드 · 레슨 번호 · 사슬 · 완료 · 티켓 · 화면.
  **다루지 않는 것**: 메신저 대화창 · 선택지 분기 · 통화 화면(다음 변경), 막간 소리, 분석 이벤트.

## 결정

### D1. 해석 — `kind: "interlude"` 스텝의 `interlude`를 표지와 같은 컷으로 정규화한다
- 스텝 스키마는 `kind`(문자열) · `interlude`(unknown)를 선택으로 받는다. 막간 모양은 따로 검사한다(`interludeWireOf`) — **틀리면 에피소드가 아니라 그 스텝만 버린다**(경고 `invalid-interlude`, `completion.requires`에서도 뺀다). 형식(`form`)과 컷 종류는 열린 문자열이다.
- 컷 → `EpisodeCut`: `speech`(지문이 있으면 지문 컷이 앞) · `monologue` · `narration` · `call_end`·`look`(→ 지문) · `message`·`call`(→ 대사, 화자 없으면 `with`, 배경 목소리는 지문에 `voice_label`) · `message_reply`(→ 플레이어 대사, **첫 보기**). `after_option`이 1이 아닌 컷은 버린다. 그림은 컷 `image_url` → 컷 `background_url` → 막간 `background_url`. 모르는 종류는 line이면 대사, narration이면 지문.
- 모델: `LearningUnit.story?: { form; caption?; cuts }`, 문항은 비어 있다(`episode-content.interlude.ts`).

### D2. 맵 — 스페셜 노드 「Story」, 레슨 번호에서 빠진다
- 구획에 `storyKeys`(`catalog-map-story.ts`). 노드 역할 `story` → `CatalogSpecialNode`(최종과 같은 `SpecialUnitMapItem`), 라벨 `SPECIAL` · `Story`, 두 열 맵에서 한 칸 줄(`solo`), 말풍선 표식 높이는 스페셜(124).
- 레슨 번호는 이야기를 건너뛴다(S5 = Lesson 5). 머리 띠의 `unit NN`은 사슬 전체의 자리라 INT도 하나로 센다(표지 · 문화 · 최종과 같은 규칙).

### D3. 진행 — 사슬 · 완료 · 티켓
- 사슬은 그대로 `lessonKeys` 순서라 S4 → INT → S5다. 이미 끝낸 S5 이후는 `completed` 그대로이고 INT만 열린 상태로 보인다.
- 구획의 `completionKeys`에서 이야기 키를 뺀다. 새로 하는 사람은 사슬 때문에 반드시 거치므로 「새로 하는 사람만」과 같고, 기록 시각 없이 이미 끝낸 사람의 완료를 지킨다.
- 티켓 비용 0(`catalogUnitTicketCost`의 다섯째 인자, 판정은 `catalogIsStoryUnit`) — 말풍선 · 결과 화면 「다음」 · 시작 문지기 셋이 같은 판정을 쓴다.

### D4. 화면 — route `catalog-story`, 표지 컷 화면 `stage="interlude"`
- 시작 결선(`withCatalogStory`)이 레슨 시작 앞에서 갈라 `catalog-story`를 쌓는다. 레슨 시작 · 끝 이벤트를 보내지 않는다.
- 첫 컷은 자막(`caption`) 지문이고 그림은 첫 컷 그림이다. 마지막 컷 버튼 뒤 「To be continued…」 배너(`EpisodeBannerScreen kind="continue"`, ⟨2026-10-28⟩ 추가 — 에피소드가 아직 이어진다는 표시)가 서고, 배너가 닫힐 때 진행에 그 키를 적고 맵으로 돌아간다. 나가기는 기록 없이 돌아간다. 마지막 버튼 낭독은 `Finish story`.
- 가장자리까지 그림을 까는 route이고 상태 표시줄 표지 등록부에 오른다.

### D5. 문자 막간 — 메신저 화면(⟨2026-10-28 보충⟩)
- episode-core는 `form: "message"` 막간에서 `story.chat`(상대 · 배경 · 메시지 / 답장 보기 전부 / `after_option` 분기 줄)을 함께 낸다(`episode-content.interlude-chat.ts`). 컷 정규화(첫 보기 흐름)는 대체 경로로 남는다.
- `chat`이 있으면 `catalog-story`는 `StoryMessengerScreen`을 그린다: 자막이 있으면 배경 그림 + 짙은 덮개 위 시간 표시 화면(「STORY · EPISODE n」 · 자막, 2.6초 또는 탭) → 메신저(흰 머리 · 가운데 상대 이름, 상대 말풍선마다 아바타).
- 상대 아바타 그림은 콘텐츠 `interlude.profiles[{speaker, image_url}]`에서 상대 화자의 항목을 쓴다(앱에 이름 표를 두지 않는다). 없으면 이니셜.
- 진행은 순수 함수 `storyChatProgressOf(턴, 보인 메시지 수, 고른 답)`가 계산한다. 메시지가 뜨면 읽는 틈 → 입력 중(…) → 다음 메시지, 답장 차례면 읽을 시간 뒤 바텀 시트(brand.primary 보기). 고른 답과 다른 분기 줄은 건너뛴다.
- 아래에는 칠 수 없는 입력창이 늘 같은 모습으로 있다(메신저다운 틀). 답장 시트는 저절로 서고 **고를 때까지 닫히지 않는다** — ui-lynx `BottomSheet`에 `dismissible={false}`(닫기 버튼 · 손잡이 없음, scrim 탭 · 끌어내림 무시)를 더했다.
- 시간 표시 화면만 상태 표시줄 밝은 아이콘 표지를 단다(메신저는 밝은 면).
- 고른 답은 저장하지 않는다 — 다시 보면 처음부터 고른다.

## 대가
1. 전화 · 사진 보기 막간은 당분간 비주얼 노벨 컷으로 보인다. 문자 막간은 D5의 메신저로 보인다.
2. 결과 화면 「다음」 카드는 INT를 「Next lesson」으로 부른다(카드 종류는 lesson · final 둘뿐).
3. 막간에는 소리가 없다(콘텐츠에 녹음이 없다).
