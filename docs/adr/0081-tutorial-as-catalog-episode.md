# ADR-0081 — 튜토리얼은 카탈로그 에피소드 `u00-tutorial`이다: 앱에 내장하고 `Episode 0`으로 세우며, 옛 튜토리얼과 메신저 · 전화 · 비주얼 노벨을 같은 변경에서 지운다

- 상태: **채택 — 클라이언트 · 호스트 자산.** 서버(RPC · 표 · send-push) · 버킷 형식 변경 0. 호스트 코드 변경 0(내장 음성 파일 18 지움 · androidTest 목록 고침).
  ⚠ **기기 확인은 부분 회차다** — unit · ui · integration 테스트와 번들 크기에 더해, 2026-10-22 iOS 시뮬레이터 플레이그라운드 1차 회차([튜토리얼 u00 e2e](../e2e/tutorial-u00.md) 「결과 1차」 — EU-3 · EU-7 통과, EU-1 · EU-2 · EU-4 · EU-5 부분, EU-0 · EU-6 · EU-8 미실행)를 돌렸다. **사용자 결정(2026-10-22, D-A)**: 이 PR의 기기 확인은 이 부분 회차로 받아들인다. 제품 번들 오프라인 `/static` 그림(iOS · Android 재작성) · 실제 로그인 · 저장소 시드 옛 사용자 · 서버 동기화 · 음성 12개 받기와 그림 받기 0 · 티켓 수 · Android(EU-8) · VoiceOver 실제 낭독은 후속이다.
- 날짜: 2026-10-21.
- **사용자 결정**(2026-10-21): 튜토리얼은 콘텐츠 팀이 납품한 `u00-tutorial`이다 · **다른 에피소드와 같은 모양** · 그림은 **앱에 내장**(인터넷 없이 처음 설치해도 그림까지) · 옛 튜토리얼 진행은 옮기지 않는다 — **모두 처음부터** · **옛 튜토리얼을 통과한 기존 사용자는 Episode 1이 계속 열려 있다** · 전환과 삭제를 **한 PR에서**.
  같은 날 질문 다섯(계약 Q1 ~ Q5)의 답: Q1 버킷 `manifest.json`의 u00 항목은 **그대로 둔다** · Q2 메신저 · 전화 · 비주얼 노벨 화면 · 데이터 · 롤플레이 route도 **같은 PR에서 지운다** · Q3 **u00은 티켓을 쓰지 않는다**(Episode 1부터) · Q4 Airbridge `achieveLevel`은 **`episode_final_passed`**(`level` = 에피소드 id)로 · Q5 Android Maestro 흐름 셋은 u00 경로로 고친다 — **2026-10-22 사용자 결정(D-B)으로 후속 작업으로 넘겼다**(이 PR에서는 고치지 않는다 — 옛 튜토리얼 좌표라 그때까지 깨진 상태).
- 다루는 축: 튜토리얼이 무엇인가(출처 · 맵의 자리 · 번호) · 내장 콘텐츠 그림의 출처와 우선순위 · 옛 튜토리얼 진행의 처리(스냅숏 호환 · Episode 1의 문) · 첫 유닛 안내의 대상 · 튜토리얼과 티켓 · 측정의 연속성 · 특별 유닛 셋(메신저 · 전화 · 비주얼 노벨)의 철거.
  **다루지 않는 것**: 학습 문항 음성의 연결(후속 — 아래 D12), u01 이후 콘텐츠, 서버 RPC 스키마, 맵 새 디자인, 옛 앱(이미 출시된 빌드)의 동작.
- 이어받는 결정: [ADR-0024](0024-journey-units-and-special-unit-placement.md) D15를 **대체**한다(두 종류의 구획 → 카탈로그 하나 · 첫 구획의 문) — 0024 정정 기록 2026-10-21. 적용 기록을 단 곳: [0017](0017-host-native-capabilities-and-audio.md) · [0029](0029-product-analytics-posthog.md) D14 · [0034](0034-server-push-notifications.md) · [0035](0035-learning-progress-and-streak-on-server.md) D2 · [0036](0036-user-feedback-survey-and-app-review.md) D3 · [0045](0045-android-host-audio-assets.md) · [0050](0050-android-status-bar-icons.md) · [0054](0054-learning-item-guides.md) · [0056](0056-episode-content-delivery.md) D10 · [0057](0057-meta-app-events.md) D6 · [0058](0058-catalog-learning-session.md) · [0062](0062-progress-cache-first.md) · [0063](0063-airbridge-events.md) D7 · [0068](0068-special-unit-map-marker.md) · [0071](0071-episode-background-download.md) D5 · [0075](0075-learning-tickets.md) · [0076](0076-episode-roleplay.md) · [0078](0078-episode-update-on-splash.md).

근거 표시: **[코드]** 저장소 코드(`apps/mobile/src/` 기준) · **[실측]** 빌드 · 테스트 · 버킷 GET · **[ADR]** 기존 결정 · **[사용자]** · **[추론]** 관찰 없이 이어 붙인 것.

**새 ADR인 이유**: ADR-0024 D15(튜토리얼 구획과 카탈로그 구획 둘 · 첫 카탈로그 에피소드의 문 = 튜토리얼 최종) 위에 진행 · 트로피 · 설문 · 롤플레이 · 분석 · 푸시가 지어져 있었다. 그 결정이 바뀌고 결정 여러 개(진행 필드의 뜻 · 이벤트 값 · Airbridge 매핑 · 내장 그림 · 티켓 예외)가 한꺼번에 바뀐다 — 새 번호로 묶는다(ADR-0010 D10).

## 맥락

1. **목록이 둘이었다** [코드]. 튜토리얼은 `screens/journey-map/journey-map-units.ts`의 고정 목록(표지 · 스텝 8 · 메신저 · 전화 · 비주얼 노벨 · 최종)이고 진행은 `completedStepCount` · 완료 id 목록 넷 · 비주얼 노벨 상태였다. 카탈로그는 `catalogMapSectionsOf(catalog)`가 만들고 진행은 `catalogProgress[episodeId]`의 키다. 튜토리얼 스텝 id 리터럴 타입(`JourneyStepId`)이 route 여섯과 문항 표 여섯에 퍼져 있었다.
2. **콘텐츠 팀이 튜토리얼을 다른 에피소드와 같은 형식으로 납품했다** [실측]. 버킷 `episodes/u00-tutorial.json`(delivery-2) — 단원 `S1` ~ `S13`(각 문항 하나, `S12` `CULTURE_CARD` · `S13` `CULTURE_CHECK`) + 최종 `RP`(턴 셋), `title_en` `Tutorial`, `completion.requires` 14키. 그림 14경로(`images/u00-tutorial/*` 12 + 공용 `images/items/{hello,thanks}.webp`). 지금 디코더로 경고 0.
3. **버킷 `manifest.json`에 이미 u00 항목(order 0)이 있다** [실측 2026-10-21]. 옛 앱에서는 u00이 원격 전용 에피소드로 받혀 카탈로그 첫 구획 「Episode 1.」로 서고, u01의 표지가 u00 뒤로 잠긴다(구획 번호가 자리 순이고 첫 카탈로그의 문만 튜토리얼 최종을 본다).
4. **서버 저장 RPC가 옛 필드를 필수로 검증한다** [코드 — `merge_learning_progress_v1`, 마이그레이션 `20261012120000` · `20261020120000`]. 들어온 쪽 · 저장된 쪽 둘 다 `version = 1` · `completedStepCount` 정수 · 완료 목록 넷 배열 · `visualNovel` 유효가 아니면 `22023`으로 던진다. 다른 기기의 옛 앱도 같은 필드가 없으면 스냅숏을 버린다.
5. **메신저 · 전화 · 비주얼 노벨은 2026-10-20부터 롤플레이 탭에 없었다** [코드 · ADR-0076 적용 기록] — 맵에서 사라지면 들어갈 길이 0이 된다.
6. **Airbridge `achieveLevel`은 튜토리얼 메신저 · 비주얼 노벨 완료에서만 났다** [ADR-0063 D7] — 맵에서 그 항목이 사라지면 한 건도 나지 않는다.

## 결정

### D1. u00을 앱에 내장한다 — 버킷 바이트 그대로, 매니페스트 첫 항목

- `apps/mobile/content/episodes/u00-tutorial.json` = 버킷 `2026-10-21.3`판 바이트 그대로(37,777 B · sha256 `c9636a3d…377a`). 내장 `content/manifest.json` 첫 항목 `{ id u00-tutorial, order 0, title 튜토리얼, schema delivery-2, version 2026-10-21.3, … }` — **버킷 항목과 같은 값**이라 같은 version이면 내장이 이겨(ADR-0056 D2) 본문을 받지 않는다. `generated_at`은 `2026-10-21T00:00:00Z`. 내장 에피소드는 **넷**(u00 · u01 · u02 · u03).
- id를 문자열로 적는 곳은 `lib/tutorial-episode.ts`의 `TUTORIAL_EPISODE_ID` 하나다(테스트 제외).
- 버킷 새 버전은 다른 에피소드와 같은 길이다 — u00은 내장 id라 「지금 열리는 에피소드」(ADR-0078 D2)로 분류되어 스테이징 → 다음 시작 교체. 새 코드 0.
- 계약 처음 판은 `2026-10-21.1`(30,963 B · 음성 0)이었고, 같은 날 콘텐츠 팀이 음성 id 12개를 채운 `2026-10-21.3`으로 바꿨다(문항 · 그림은 같다).

### D2. 그림 14장을 내장하고, 받아 둔 파일 > 내장 > 원격 순으로 고른다 — 사용자 결정 「앱에 내장」

- 위치는 **버킷 상대 경로 그대로** — `src/assets/content/images/u00-tutorial/*.webp` 12 · `src/assets/content/images/items/{hello,thanks}.webp` 2(버킷 WebP 바이트 그대로, 다시 인코딩하지 않음 · 합계 1,565,348 B). 표 `lib/bundled-content-images.ts`가 「버킷 상대 경로 → 번들 주소(`/static/image/<이름>.<해시>.webp`)」다. 경로가 곧 키라 표가 어긋날 자리가 없다.
- 해석: `localOrRemoteUrl(path, remoteUrlOf, bundledUrlOf)`(`lib/content-files.ts`, 셋째 인자는 선택 · 기본 `null`) = `contentFileUrl(rel) ?? bundledUrlOf(rel) ?? remoteUrlOf(path)`. 로더의 `imageUrlOf`만 내장 표를 넘긴다. 음성은 같은 포트를 지나지만 표에 음성 키가 없다.
- 「받아 둔 파일 > 내장」인 이유: 같은 이름이면 내용이 같고(납품 규칙), 받아 둔 파일은 그 기기에서 검증된 자산이다. 결과가 같고 음성의 경로 규칙과 순서가 하나로 맞는다.
- **받기 생략**: 자산 포트 `has(path)`가 내장 표에 있으면 참이다 — 내장 그림은 받지 않는다(ADR-0071 「빠진 자산」에서 빠짐). 원격 새 버전이 **같은 이름**을 쓰면 받지 않고 내장을 쓰고, **다른 이름**이면 받아서(스테이징) 다음 시작에 바뀐다.
- 번들 그림은 스플래시 로고와 같은 `/static/image/…` 꼴이라 Android는 ADR-0051의 동기 `ImageInterceptor`가 `asset:///static/…`으로 바꾼다 — 호스트 변경 0. 파일 모듈이 없는 환경(Explorer · 옛 호스트 · 테스트)에서도 선다.

### D3. 맵은 카탈로그 구획만 그린다 — 구획 번호는 매니페스트 `order`, u00은 `Episode 0.`

- 옛 튜토리얼 구획 · 목록(`TutorialEpisodeSection` · `journey-map-units.ts`)이 사라지고 `CatalogMapSections` 하나가 맵 전부다.
- **구획 번호(`CatalogReadySection.ordinal`)가 자리 순(`index + 1`)에서 매니페스트 `order`로 바뀌었다.** u00(order 0) = `Episode 0.`, u01 ~ u05는 지금 값 그대로. 맨 끝 「준비 중」 구획 번호 · 띠 설명 줄(`Episode 0, unit 03`) · 표지 낭독 · 표지 · 최종 · 롤플레이 화면의 첫 줄이 모두 이 값을 쓴다.
- u00 구획: 띠 제목 `Tutorial`(`title_en`), 표지 화면 둘째 줄 `튜토리얼`(매니페스트 제목 — 다른 에피소드와 같은 규칙). 노드 14 = 레슨 11 + 문화 2(`S12` · `S13`이 둘 다 문항 전부 문화 유형이라 `Culture` 두 번 — 번호 없이 위치로 구별) + 최종. 기존 파생이 그대로 그린다 — 이름(`CULT`)에 기대는 코드는 없다(ADR-0066 D7).
- 모양은 카탈로그의 지금 모양 그대로다(새 토큰 0). 벗어남 하나: 첫 유닛 안내 말풍선 자리를 위한 래퍼 `.catalog-map-section-cover`(`catalog-map.css`).

### D4. Episode 1의 문 — u00 완료 키 전부, 또는 옛 튜토리얼 통과 기록 — 사용자 결정 「모두 처음부터」 · 「기존 사용자 Ep1 유지」

`catalogCoverStatus(sections, index, gate)`(`CatalogGate = { legacyTutorialPassed, progress }`):

1. 구획 없음 · 준비 안 됨 → `locked`
2. 그 표지를 끝냄 → `completed`(앞이 아직이어도 — 지금 규칙)
3. `index === 0` → `available`(**첫 구획은 늘 열림** — 지금은 u00)
4. 앞 구획의 완료 키를 모두 끝냄 → `available`
5. 앞 구획이 `TUTORIAL_EPISODE_ID`이고 `gate.legacyTutorialPassed` → `available`
6. 그 밖 → `locked`

- **옛 통과** = `completedEpisodeFinalIds`에 `tutorial-final-test`가 있음(`legacyTutorialPassed`). 옛 맵의 최종 테스트는 다른 항목을 모두 끝내야 열렸으므로 이 하나가 「옛 튜토리얼을 끝냈다」이고, 서버 병합이 합집합이라 한 번 생기면 사라지지 않는다.
- **u00은 처음 상태다** — 옛 진행을 u00 키로 옮기지 않는다. 옛 앱에서 원격 u00을 이미 푼 사람(`catalogProgress["u00-tutorial"]`)은 원래 그 키라 그대로 이어진다.
- 카탈로그 진행만 있는 사람(u01 표지를 끝냄)은 규칙 2로 열린다 — 따로 판정하지 않는다.
- **우회된 u00은 스크롤 후보가 아니다**: `catalogTutorialBypassed(sections, gate)`(옛 통과 ∧ u00 미완료)이면 다음 유닛 계산(`journey-map-next-unit.ts`)이 u00 항목의 `available`을 `locked`로 보고 뺀다 — 열려 있음은 그대로이고, 이 사용자의 맵은 u01 이후의 다음 유닛으로 선다.
- 맵과 표지 시작 결선은 같은 함수(`canStartCatalogCover`)를 부른다(ADR-0024 D15의 원칙 그대로).

### D5. 진행 스냅숏은 v1 그대로 — 옛 필드 여섯은 얼린 기록이다. 서버 무변경

- 상태 `JourneyProgressState = { legacyTutorial: LegacyTutorialRecord; catalogProgress; tickets? }`(`app/learning-progress.ts` · `app/legacy-tutorial-progress.ts`). 옛 필드 여섯(`completedStepCount` · `completedEpisodeIntroIds` · `completedMessengerUnitIds` · `completedPhoneCallUnitIds` · `visualNovel` · `completedEpisodeFinalIds`)은 **읽어 둔 값**이다 — setter가 없고 불러오기 · 합치기만 바꾼다. 앱이 늘리지 않는다.
- 쓰기: 키 순서 · 값이 지금과 같아 **같은 값이면 바이트가 같다**(골든 테스트). 새 사용자는 `0 · [] · [] · [] · {active, 0} · []`를 싣는다 — 서버 검증을 통과하고 옛 앱이 읽는다.
- 읽기: 버전 1이 아니거나 옛 필드 모양이 틀리면 `null`(지금 규칙 — 지금 진행 유지). 옛 id는 옛 튜토리얼에 있던 id 표로 거른다.
- 합치기 · 덮음: 옛 기록은 지금 규칙(합집합 · 최댓값 · 더 나아간 비주얼 노벨) — 서버 병합과 같아 기기 · 서버 · 다른 기기가 어떤 순서로 섞여도 줄지 않는다.
- **RPC 마이그레이션 불필요** — 필드를 지우면 새 앱의 저장이 서버에서 거부되고 옛 앱이 새 스냅숏을 읽지 못한다(맥락 4). 기기 저장(진행 캐시 · 미전송)은 같은 스냅숏 함수를 쓴다.

### D6. 첫 유닛 안내는 u00 표지를 가리킨다 — 합성으로

- 대상 `mapGuideTargetOf(sections)` = 첫 구획이 준비된 u00이면 그 id, 아니면 `null`(가림막도 서지 않음). 켜는 조건 `firstUnitGuideEnabled` = 서버 진행을 불러옴 ∧ 옛 기록 활동 0 ∧ 카탈로그 진행 0 — 옛 사용자에게는 뜨지 않는다.
- 모양은 옛 튜토리얼 표지 안내와 같다(가림막 `first-unit-guide-map` · 들린 표지 · 말풍선 「Tap to start your lesson!」 · 나머지 낭독 가림 · 누르면 안내를 닫고 표지 시작 · 시스템 뒤로 = 닫기). boolean prop을 늘리지 않고 카탈로그 표지 항목이 `children`(새 `FirstUnitMapTooltip`, testid `first-unit-map-tooltip`)과 기존 열거형 `layer`를 받는다.
- 표지 화면 안의 이야기 · 메신저 · 통화 안내는 옛 프롤로그 화면과 함께 지웠다 — `FirstUnitGuideStep = "map"`.

### D7. 트로피 · 설문 · 활동 수 · 돌아온 학습자

- 트로피 = 끝낸 카탈로그 에피소드 수 + (옛 통과 ∧ u00 미완료 ? 1 : 0) — 옛 튜토리얼 트로피가 사라지지도 두 번 세어지지도 않는다.
- 에피소드 설문은 지금처럼 **튜토리얼에서만** — 대상 `SURVEY_EPISODE_IDS = [u00-tutorial]`, 제목 `Tutorial`. 옛 설문 기억(`tutorial`)과 id가 달라 u00을 끝내면 한 번 더 묻는다.
- 활동 수 = 옛 기록 활동(고정) + 카탈로그 활동 — 「활동이 늘었다」(연속 · 칩 · 설문)는 카탈로그에서만 난다. 돌아온 학습자 판정은 지금 식과 같은 뜻이다.

### D8. u00은 티켓을 쓰지 않는다 — 사용자 결정(Q3)

- `lib/catalog-ticket-cost.ts` `catalogUnitTicketCost(progress, episodeId, unitKey): 0 | 1` — 튜토리얼이거나 이미 끝낸 유닛이면 0. 문지기(`app/ticket-wiring.ts`)와 말풍선(`CatalogUnitSheet` — 티켓 태그)이 같은 함수를 쓴다. 최종 테스트 `RP`도 무료, 표지 · 컷은 원래 무료.
- 근거: u00은 레슨 · 문화 · 최종 14유닛이다(옛 튜토리얼은 스텝 8만 썼다). 규칙을 그대로 두면 새 사용자가 세 번째 레슨 뒤 막혀, 측정 지표(튜토리얼 → Episode 1 전환)가 교체 효과와 티켓 효과를 섞는다.
- 옛 튜토리얼의 스텝 시작 문지기(`onStartStep`)는 사라졌다 — 문지기는 카탈로그 하나다.

### D9. 분석 — 새 이벤트 0, 값과 발생 자리가 바뀐다. Airbridge `achieveLevel` = 에피소드 최종 통과 — 사용자 결정(Q4)

| 옛 튜토리얼 | 새(u00) |
|---|---|
| `episode_intro_viewed` · `_skipped` · `_continued` · `_exited` `{ episodeId: "tutorial" }` | 같은 이름 `{ episodeId: "u00-tutorial" }`(카탈로그 표지 결선) |
| `episode_prologue_completed { prologueKind: call · messenger · visual-novel · sequence }` | `{ prologueKind: "cuts" }` — `EpisodePrologueCompletedKind = "cuts"` |
| 스텝 시작 · 평가(이벤트 없음) | `episode_lesson_started` · `episode_lesson_finished { episodeId: u00-tutorial, unitKey: S1 … S13 }` |
| 최종 통과(이벤트 없음) | `episode_final_passed { episodeId: u00-tutorial }` |
| `messenger_unit_*` · `visual_novel_unit_*` · `phone_call_unit_opened` | **이름째 지움**(D10) |
| `episode_survey_answered` · `_skipped { episodeId: "tutorial" }` | `{ episodeId: "u00-tutorial" }` |

- sink **일곱 → 넷**(`messengerEventSink` · `visualNovelEventSink` · `phoneCallEventSink` 지움), 이벤트 이름 **44 → 36**(지운 여덟: `messenger_unit_opened` · `_completed` · `_exited_incomplete` · `visual_novel_unit_opened` · `_completed` · `_exited_incomplete` · `_replay_started` · `phone_call_unit_opened`).
- **Airbridge 매핑**(ADR-0063 D7): `entry_completed` → signup(그대로) · **`episode_final_passed` → `airbridge.achieveLevel { level: <episodeId>, label: "episode_final" }`**(모든 에피소드의 최종 통과 — 신규 사용자의 첫 건이 튜토리얼 완료). 전달 sink는 `entryEventSink` · `episodeIntroEventSink` 둘(카탈로그 학습 이벤트가 이 sink로 나간다). 레슨마다 보내지 않는다 — 튜토리얼 하나에 14건이 된다.
- **퍼널**(교체 뒤, 신규 사용자): `entry_completed` → `episode_intro_viewed { u00-tutorial }` → `episode_final_passed { u00-tutorial }` → `episode_intro_viewed { u01-water }`. 교체 전과 비교할 지표는 **「튜토리얼 표지 → Episode 1 표지」 전환율** 하나다(옛 튜토리얼에는 최종 통과 이벤트가 없었다). 이탈 단계는 `episode_lesson_started { u00-tutorial, unitKey }`의 마지막 단원 분포. 교체 시점 = 같은 사람의 `episodeId`가 `tutorial` → `u00-tutorial`로 바뀐 때.

### D10. 메신저 · 전화 · 비주얼 노벨을 같은 PR에서 지운다 — 사용자 결정(Q2). 롤플레이 탭에서 u00을 뺀다

- 지운 것: 세 화면 · 데이터 · 그림 4(약 4.88 MB) · 통화 컴포넌트 · route `roleplay-messenger` · `roleplay-phone-call` · `roleplay-visual-novel` · 완료 route `messenger-complete` · `special-unit-complete` · 롤플레이 결선(`render-roleplay-screen.tsx` · `roleplay-wiring.ts` · `render-messenger-complete.tsx`) · `roleplay-premium-items.ts`.
- 남긴 것: 자판(`MessengerKeyboard.tsx` · `hangul-keyboard.ts` — 카탈로그 타이핑이 쓴다, `messenger.contract.ts`는 자판 몫만) · `roleplay-episode` route(이야기 롤플레이 구획의 「전체 보기」) · `PremiumRoleplayCard`(결제 예고 UI) · `lib/special-unit-entry-source.ts`(남은 소비자 있음).
- `RoleplayItem = StoryRoleplayItem` · `RoleplayUnitForm = "story"`. `roleplaySectionsOf`는 카탈로그 구획 가운데 `TUTORIAL_EPISODE_ID`를 뺀다(ADR-0076 적용 기록 2026-10-20 「튜토리얼 구획을 롤플레이 탭에서 뺐다」 유지).

### D11. 알림 · 푸시의 특별 유닛 목적지 셋은 맵을 연다 — 서버 무변경

- `pushTargetFrom`은 서버가 아직 보내는 `messenger` · `phone-call` · `visual-novel`(unitId 검사 없이)을 **`{ kind: "journey-map" }`으로 읽는다**. 알림 목적지 타입은 `roleplay-list`만 남았다(`NotificationTarget`). `push-routing`은 `journey-map` · `notifications` · `roleplay-list`만.

### D12. 음성 — u00 음성 id 12, 첫 온라인 실행에 받는다. 학습 문항 음성은 아직 연결되지 않는다

- `2026-10-21.3`판은 음성 id 12개를 쓴다(`audio_url` 27 · `example_audio_url` 1 · `player_audio_url` 3). 내장하지 않는다 — **첫 온라인 실행에서 받고**(그림은 0), 오프라인 첫 설치는 그림까지 열리고 소리는 없다. 경로는 카탈로그 그대로(`contentAudioPathOf` · ADR-0060 · 0071 · 0074).
- ⚠ **학습 문항의 소리는 아직 연결되지 않았다** [코드 — `app/catalog-choice-map.ts` · `catalog-item-map.ts`]. 소리가 없는 듣기 문항은 `audio-missing`으로 건너뛰므로, **문항이 하나뿐인 `S2`(`LISTEN_SELECT`) · `S7`(`LISTEN_BUILD`)은 빈 레슨이 된다.** 후속 PR(`feat/audio-slow-playback`, ADR-0082 예정)이 고친다 — 그때 테스트 AU2의 기대값이 뒤집힌다.
  ⟨2026-10-22 해소⟩ **고쳤다** — [ADR-0082](0082-item-audio-and-slow-playback.md). 소리가 있는 `S2` · `S7`은 이제 선다. 아래 「적용 기록」.
- 내장 음성(iOS `apps/ios/Host/audio` — Android gradle이 같은 폴더를 복사): 옛 튜토리얼 문항 · 프롤로그 통화 15 + 전화 3 = **18 지움**. 남은 셋(`greeting-1` · `ordering-2` · `tutorial-cabin-announcement`)은 **호스트 테스트 고정물**이다(iOS `AudioPlaybackModuleTests` 등 · Android `AudioAssetPathTest` 등이 이름으로 쥔다) — **제품이 쓰는 내장 음성은 0**.

### D13. 지운 범위

- route 21(`episode-intro` · `episode-prologue` · `episode-prologue-complete` · `listening` · `word-choice` · `sentence-order` · `speaking` · `writing` · `culture` · `culture-quiz` · `assessment` · `episode-final` · `episode-final-complete` · `messenger` · `phone-call` · `visual-novel` · `messenger-complete` · `special-unit-complete` · `roleplay-messenger` · `roleplay-phone-call` · `roleplay-visual-novel`).
- 파일: 제품 124 · 테스트 120 · 호스트 음성 18 · e2e/devtools 7(Maestro `android-handwriting-trace` · `android-audio-playback` + 실행 스크립트 · 스크린샷 · 루트 스크립트 둘). 옛 튜토리얼 그림 jpg 7(`assets/story/tutorial/`) · 손글씨 따라쓰기 일체 · 프롤로그 · 최종 스토리 · 서사 화면 · 문화 · 문화 퀴즈 · 말하기 · 쓰기 화면.
- 파일은 남고 튜토리얼 몫만 빠진 것: 듣기 · 낱말 고르기 · 대화 조립(route 컴포넌트 `*Screen` · 문항 표가 빠지고 카탈로그가 쓰는 `*Activity`가 남음). devtools 정책 둘(`ui-copy-literals/policy.mjs` · `android-bundle/host-status-bar-icons.mjs`)에서 지운 선언 · route를 뺐다.
- 번들 [실측 — `.env.local` 없는 로컬]: `main.lynx.bundle` 2,383,452 → **2,077,431 B**(상한 2,385,000 그대로 — 낮추지 않음). 정적 그림 → **3,981,327 B**(파일 18, 상한 11,520,000 그대로).

## 버린 대안

1. **옛 튜토리얼 구획 옆에 u00을 하나 더 세우기** — 목록이 셋이 되고 옛 코드를 지울 수 없다. 사용자 결정(전환 + 삭제 한 PR)과 어긋난다.
2. **그림을 원격으로만**(다른 에피소드처럼) — 오프라인 첫 설치에서 튜토리얼 그림이 서지 않는다. 사용자 결정 「앱에 내장」.
3. **내장 > 받아 둔 파일** — 같은 이름이면 결과가 같고, 음성과 순서가 갈린다(D2).
4. **그림 sha · 버전 표를 따로 두기** — 이름이 내용의 주소다(납품 규칙). 표가 하나 더 낡을 자리만 생긴다.
5. **구획 번호를 자리 순으로 두기** — u00이 `Episode 1.`이 되어 요구(Episode 0)와 어긋난다. 맵 순서가 이미 `order`이므로 번호와 순서가 한 근거가 되는 편이 낫다.
6. **옛 진행을 u00 키로 옮기기** — 옛 스텝과 u00 단원이 1:1이 아니고, 사용자 결정 「모두 처음부터」.
7. **옛 필드를 스냅숏에서 지우기 · 스냅숏 v2** — 서버 RPC가 필수로 검증해 저장이 실패하고, 옛 앱이 새 스냅숏을 버린다. 마이그레이션 · 옛 앱 호환을 함께 사야 한다.
8. **「옛 통과」를 카탈로그 진행으로도 판정** — u01 표지를 끝낸 사람은 이미 규칙 2로 열린다. 판정 둘이 같은 답을 낸다.
9. **u00도 티켓을 쓰게 두기**(계약 v1 기본값) — D8 근거. 사용자 결정 Q3.
10. **`achieveLevel`을 레슨마다** — 튜토리얼 하나에 14건이다. **매핑을 비우기** — 매체 쪽 전환이 0이 된다.
11. **메신저 · 전화 · 비주얼 노벨을 남기기**(계약 v1) — 진입 없는 코드 약 30 파일 · 테스트 약 35 파일이 verify를 계속 탄다(맥락 5). 사용자 결정 Q2.
12. **버킷 u00 항목을 새 앱 배포 때까지 내리기** — 옛 앱의 어긋남(맥락 3)은 막지만 원격 갱신이 그동안 멈춘다. 사용자 결정 Q1(그대로).

## 대가

1. **옛 앱의 어긋남을 감수한다**(Q1) — 버킷에 u00이 있는 동안 옛 앱에서는 u00이 「Episode 1.」로 서고, 옛 튜토리얼을 통과했지만 u01을 아직 열지 않은 사용자의 u01이 u00 뒤로 잠긴다. 새 앱은 영향 없다.
2. **같은 이름 · 다른 내용의 그림 교체는 앱 배포 전까지 보이지 않는다** — 내장이 이긴다. 납품 규칙(바뀐 그림은 새 이름 — [콘텐츠 계약](../specs/episode-content-json-contract.md) §13)이 막는다.
3. **옛 필드 여섯을 영영 싣는다** — 새 앱이 쓰지 않는 값이 스냅숏에 남는다(크기는 옛 앱보다 크지 않다). 걷으려면 서버 · 옛 앱 호환을 함께 정해야 한다.
4. **옛 설문 기억이 이어지지 않는다** — 옛 튜토리얼 설문에 답한 사람도 u00을 끝내면 한 번 더 묻는다.
5. **퍼널이 둘로 갈린다** — 교체 전후는 `episodeId` 값으로만 이어지고, 최종 통과 단계는 교체 뒤에만 있다.
6. **Airbridge `achieveLevel`의 뜻이 바뀐다** — 「튜토리얼 메신저 · 비주얼 노벨 완료」 → 「에피소드 최종 통과」. 매체 쪽 전환 이름 · 값 매핑 갱신은 사용자 몫이다([Airbridge 이벤트](../airbridge-events.md)).
7. **S2 · S7 빈 레슨**(D12) — 후속 PR 전까지 u00의 듣기 두 단계가 비어 지나간다.
   ⟨2026-10-22 해소⟩ [ADR-0082](0082-item-audio-and-slow-playback.md)로 걷혔다 — 아래 「적용 기록」.
8. **문화 노드 둘이 같은 이름 `Culture`로 연달아 선다** — 위치로만 구별된다.
9. **구획 번호가 콘텐츠의 `order`를 따른다** — 콘텐츠가 order를 건너뛰면 번호도 건너뛴다.
10. **그리지 않는 그림 하나를 싣는다** — 내장 WebP 14장 가운데 `u00-tutorial/rp-end.webp`(130,588 B)는 콘텐츠 `closing_image_url`이 가리키지만 그 필드를 그리는 화면이 없다. 받기 생략(D2 `has`)의 몫만 한다. 화면이 쓰게 할지 내장에서 뺄지는 후속 판단이다(아래 「후속」).
11. **Android Maestro 흐름 셋이 깨진 채 병합된다**(D-B) — 완료 낭독 · 앱 리뷰 · 말하기 권한 흐름이 옛 튜토리얼 좌표를 쓴다. 후속 작업에서 u00 경로로 고칠 때까지 그 흐름은 돌지 않는다.

## 재검토 조건

1. **튜토리얼 → Episode 1 표지 전환율이 교체 전보다 낮으면** — 이탈 단원 분포(`episode_lesson_started`)로 어느 단원이 막는지 보고 콘텐츠 · 티켓 예외 · 첫 유닛 안내를 다시 본다.
2. **서버 RPC를 바꿀 일이 생기면**(스냅숏 v2 등) — 옛 필드 여섯을 걷을지 그때 함께 정한다.
3. **옛 앱 사용자가 거의 없어지면** — 버킷 u00 항목의 어긋남(대가 1)이 사라진다. 옛 통과 우회(D4 규칙 5)는 기록이 남아 있는 한 둔다.
4. **내장 그림을 다른 에피소드로 넓히려면** — 정적 그림 예산과 앱 크기를 다시 재고 이 결정의 표 규칙을 따른다.
5. **에피소드 설문을 다른 에피소드로 넓히면** — `SURVEY_EPISODE_IDS`를 바꾸고 ADR-0036 D3을 다시 본다.

## 후속

- **학습 문항 음성 연결** — `feat/audio-slow-playback`(ADR-0082 예정). S2 · S7 빈 레슨이 풀린다.
  ⟨2026-10-22 — 끝남⟩ [ADR-0082](0082-item-audio-and-slow-playback.md).
- **기기 확인 남은 것**(D-A) — [튜토리얼 u00 e2e](../e2e/tutorial-u00.md) 1차에서 남은 판정: 제품 번들 오프라인 `/static` 그림(iOS 리소스 · Android `asset:///` 재작성) · 실제 로그인 · 저장소 시드 옛 사용자(EU-0 · EU-4) · 서버 동기화 · 음성 12개 받기와 그림 받기 0(EU-6) · 티켓 수(EU-2) · Android(EU-8) · VoiceOver 실제 낭독(EU-3).
- **Android Maestro 흐름 셋**(D-B) — 완료 낭독 · 앱 리뷰 · 말하기 권한의 좌표를 u00 경로로(Q5를 후속으로 넘김).
- **`rp-end.webp`** — 화면이 `closing_image_url`을 그리게 할지, 내장에서 뺄지(130.6 kB) 정한다(대가 10).
- **성능 보고서** — 1차는 부분 측정([tutorial-u00-iphone-13-mini-simulator-01](../performance/reports/tutorial-u00-iphone-13-mini-simulator-01.md) — 번들 · 정적 그림 크기). 남은 것: 제품 번들의 첫 실행 · 맵 첫 그리기 · u00 표지 컷 그림(내장 `/static`) 렌더 · 메모리.
- **호스트 테스트 고정물 음성 셋** — 바꾸려면 두 호스트 테스트를 기기 빌드로 다시 돌려야 한다.
- GitHub wiki 이벤트 사전(이름 44 → 36 · `episodeId` 값 · `prologueKind`)은 저장소 밖이라 따로 고친다.

## 적용 기록 ⟨2026-10-22 — 학습 문항 음성 · 「천천히」⟩

결정은 [ADR-0082](0082-item-audio-and-slow-playback.md). 이 문서의 결정은 바뀌지 않는다.

- **D12 · 「대가」 7의 「`S2` · `S7` 빈 레슨」이 해소됐다** — 학습 문항 음성이 연결되어 `S2`(`LISTEN_SELECT`)는 듣기 화면으로, `S7`(`LISTEN_BUILD`)은 기존 문장 순서 화면(상대 말풍선 자리에 재생 줄)으로 선다. 통합 테스트가 u00 `S2` 실데이터로 「처음엔 대본 없음 → 답하면 보임」을 지킨다.
- **D12의 「음성 id 12는 첫 온라인 실행에 받는다 · 오프라인 첫 설치는 소리가 없다」는 그대로다** — 소리는 기기에 받아 둔 파일만 친다(ADR-0082 v4). 오프라인 첫 설치에서는 `S2`가 **대본(한국어 · 로마자)과 보기가 처음부터 보이는 소리 없는 듣기 화면**으로 서고 `S7`은 건너뛰어져 빈 레슨이다(ADR-0082 「대가」 4 — 받은 파일을 치워 흉내 낸 시뮬레이터 회차 [학습 문항 음성 e2e](../e2e/item-audio.md) EU8b 통과). [튜토리얼 u00 e2e](../e2e/tutorial-u00.md) EU-1의 「소리는 없다」 판정에 이 모양이 들어온다.
- u00의 그 밖의 소리 있는 문항(음성 id 12의 `audio_url` 27)도 유형에 따라 서면 한 번 또는 판정 순간 한 번 소리를 낸다(ADR-0082 D5 · D6).

## 적용 기록 ⟨2026-10-22 — u00 내장본의 둘째 소비자: 랜딩 웹 체험판의 사본⟩

- **D1의 내장본(`apps/mobile/content/episodes/u00-tutorial.json`, `2026-10-21.3`)을 랜딩이 바이트 그대로 복사했다** — `apps/landing/src/trial/content/u00-tutorial.json`([ADR-0083](0083-web-trial-and-episode-core.md) D6). 랜딩은 앱을 import하지 않으므로 경로가 아니라 사본이다.
- **동기 검사** `devtools/trial-assets/sync.unit.test.mjs`(`pnpm verify` 안) — TA1 사본 = 내장본, TA5 앱 매니페스트의 u00 version · sha256이 체험판 핀(`TRIAL_CONTENT`)과 같다. **u00 판을 올리면(D1의 「버킷 새 버전」 → 내장본 교체) 같은 변경에서 랜딩 사본 · 핀도 바꿔야 verify가 지난다.**
- **D2의 내장 그림 14장 중 10장**(`u00-tutorial/{pre-1..6,post-1,post-2,cult-u00-jalhasineyo}.webp` · `items/hello.webp`)도 랜딩 사본이다(TA2). 이름이 내용의 주소라는 규칙(대가 2)이 사본에도 그대로 걸린다.
- **D12의 음성 id**는 랜딩이 버킷에서 직접 받는다 — 내장하지 않는다는 결정과 같다. 체험판은 단어 카드 음성(`s1-01-word` · `d-02`)도 낸다(디코더 확장, ADR-0083 D4) — 앱은 여전히 읽지 않는다.

## 적용 기록 ⟨2026-10-23 — 내장 u00 `2026-10-23.1` · 상대 아바타 그림 내장⟩

- **D1의 「버킷 새 버전 → 내장본 교체」를 한 번 더 했다** — 내장 u00을 버킷 `2026-10-23.1`(37,847 B)로 바이트 그대로 바꾸고 매니페스트 u00 항목(version · sha256 · bytes)만 고쳤다. 앞 판과의 차이는 둘이다: 최상위 `counterpart_avatar`(`content/images/u00-tutorial/avatar.webp`, [ADR-0084](0084-lesson-item-redesign.md) D16) 추가, 에필로그 컷 1의 음성 id `post-1` → `post-1-v3`. 문항 · 그 밖의 그림은 같다. 랜딩 사본 · 핀도 같은 변경에서 바꿨다(위 적용 기록의 동기 검사).
- **D2의 내장 그림이 14장 → 15장** — `u00-tutorial/avatar.webp`(256×256 WebP, 10,364 B)를 같은 자리 · 같은 표에 더했다. 주소 순서(받아 둔 파일 → 내장 → 원격)는 그대로라 오프라인 첫 실행에도 상대 아바타가 그림이다. 랜딩 체험판은 아바타를 그리지 않아 그림 사본 12는 그대로다.
