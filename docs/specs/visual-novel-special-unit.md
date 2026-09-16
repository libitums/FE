# 작업 스펙: 카페 도착 비주얼 노벨 특별 유닛

상태: **계약 고정**  
타입 정본: `apps/mobile/src/screens/visual-novel/visual-novel.contract.ts`

## 목적 (goal)

사용자가 여정 맵에서 짧은 비주얼 노벨을 열어 배경·캐릭터·대사를 정해진 순서로 감상하고,
중간 진행을 잃지 않은 채 마지막 대사까지 도달해 특별 유닛을 완료한다.

## 타깃 (target)

- 디바이스: 모바일 iPhone, iOS 17.4 이상인 기존 Lynx Host.
- 브라우저 하한: 브라우저는 지원 범위가 아니다. Safari/web 화면을 추가하지 않는다.

## 디자인 (design_ref)

DESIGN.md 표준 따름. 벗어남: 없음. 토큰·레이아웃·컴포넌트 시각값은 디자인 산출물이
소유하며 이 계약은 픽셀값을 중복 고정하지 않는다.

## 범위

- 포함(scope_in): 여정 맵의 별도 비주얼 노벨 항목, 한 화면, 정해진 3개 beat, 배경 1종,
  같은 캐릭터의 pose 2종, 대사 패널, 다음/맵으로/처음부터 보기, 마지막 대사에서만 완료,
  앱 세션 동안 중간 진행·완료 보존, 완료 후 replay, 네 사용자 행동 지표, 교체 가능한 GPT
  임시 이미지 bundle.
- 제외(scope_out): 분기 선택지, 호감도, 애니메이션·transition, 음성·립싱크, 전화/메신저
  UI나 상태 재사용, 롤플레이, 채점·점수·미통과, 자유 입력, API·서버 동기화, 앱 재실행을
  넘는 영속 저장, 원격/런타임 이미지 생성.

## 수용 기준 (acceptance_criteria)

1. 맵에서 `약속 확인 전화` 뒤이자 `길 묻기` 앞의 `카페에 도착한 지민` 항목을 누르면
   `cafe-arrival-visual-novel` 한 화면이 열리고 일반 스텝·메신저·전화 상태는 바뀌지 않는다.
2. 첫 진입은 `arrive`를 보이며 `다음`을 누를 때만 `arrive → find → enter`로 한 칸씩
   진행한다. 각 beat의 배경, character pose, 화자, 대사는 §2의 exact tuple과 일치한다.
3. 열기나 `arrive`/`find`에서는 완료하지 않고, `find`에서 다음을 눌러 마지막 `enter`
   대사가 화면에 존재하게 되는 같은 전이에서만 최초 완료를 한 번 기록한다.
4. 미완료 상태에서 `맵으로` 나갔다 다시 열면 마지막으로 도달한 beat에서 재개한다. 완료 후
   나갔다 다시 열면 `enter`와 완료 상태를 보인다. 앱 세션 안에서 이 진행과 완료는 단조롭다.
5. 완료 상태의 `처음부터 보기`는 화면 표시만 `arrive`로 되돌리고 완료와 저장된 최원점
   `enter`를 지우지 않는다. replay에서 `다음`으로 다시 `enter`까지 간 뒤 나가도 재진입은
   `enter`이며 완료 이벤트와 `이야기 완료` 능동 발화는 최초 회차의 각 1건에서 늘지 않는다.
6. 비주얼 노벨 진입·진행·완료·이탈·replay 전후에 `completedStepCount`, 일반 스텝 상태와
   열림, 메신저 완료/세션/이벤트, 전화 완료/세션/오디오가 동일하다.
7. §5의 정확한 GPT 임시 자산 3개만 전용 `assets/temporary` 경로에서 bundle되고, 닫힌
   `VisualNovelArtworkBundle`과 총함수 `artworkFor`를 통해서만 scene source가 resolve된다.
   runtime 생성·네트워크 fetch가 없으며 같은 ID의 교체 파일은 계약 치수·형식·투명도를 만족한다.
8. unit/UI/integration 자동 테스트와 §9의 iOS Release 수동 E2E 경계가 각각 자기 단언을
   통과하며, VoiceOver에서 제목·현재 대사·조작 순서와 최초 완료 발화가 확인된다.

## 측정 (measurement)

출시 후 비주얼 노벨의 진입 수, 최초 완료 수/진입 대비 완료율, 마지막 대사 전 명시적
`맵으로` 이탈 수/진입 대비 이탈률, 완료 후 `처음부터 보기` 수를 안다. 대사, 화자명,
asset path, 사용자 식별자는 보내지 않는다.

## 제약 (constraints)

- ReactLynx `@lynx-js/react` 0.125.0과 기존 iOS Host만 사용한다. 모든 조작은 `bindtap`
  경계이며 custom prop을 건너는 handler는 `'background only'` 규약을 따른다.
- 새 전역 토큰·공용 primitive, main-thread script, native module, storage key, image SDK,
  animation을 추가하지 않는다.
- 배경과 캐릭터는 장식 이미지로 접근성 순회에서 제외하고, 동일 정보는 보이는 speaker/dialogue
  텍스트로 제공한다. completion transition은 기존 접근성 helper를 통해 `이야기 완료`를 최초
  한 번 발화하며 자동 focus 이동은 하지 않는다.
- 성능 임계값은 승인되지 않았으므로 새 수치 예산을 만들지 않는다. 자산 3개 외 media를
  bundle하지 않으며 bundle-size 영향은 구현 검토에서 보고하되 pass/fail로 오독하지 않는다.

## 시각 레퍼런스 (visual_reference)

저장소에서 확인 가능한 참조는 `docs/screens.md`의 특별 유닛 설명(같은 여정 줄의 별도 항목,
끝까지 도달하면 완료)뿐이다. 요청에 언급된 별도 저해상도 비주얼 노벨 wireframe 파일은
저장소와 전달 자료에 없다. 이 슬롯은 권장 항목이므로 계약을 막지 않으며, 디자인은
DESIGN.md를 벗어나지 않는 보수적 한 화면 구성을 사용한다.

## 우선순위 / 데이터 (선택)

선형 흐름과 상태 격리를 우선한다. 제품 데이터와 asset manifest는 로컬 고정값이며 App이
앱 세션 진행과 완료, 이벤트 sink를 소유한다. API/fetch hook은 없다.

## 비고

- [추론] 표시 항목: 없음. 별도 wireframe 부재는 미해결 제품 결정이 아니라 입력 자료의
  부재로 기록했다.

## 1. 고정 불변식과 컴포넌트 경계

```text
App
├─ JourneyMapScreen
│  ├─ JourneyStepNode × 5                    (기존, 불변)
│  ├─ MessengerMapItem                       (기존, 독립)
│  ├─ PhoneCallMapItem                       (기존, 독립)
│  └─ VisualNovelMapItem                     (신규 명시적 변형)
└─ VisualNovelScreen
   └─ scene stage
      ├─ VisualNovelScene
      └─ DialoguePanel
```

| 컴포넌트 | 예정 경로 | 단일 책임 |
|---|---|---|
| `VisualNovelMapItem` | `screens/journey-map/VisualNovelMapItem.tsx` | 제목·독립 완료 상태를 내고 선택한 unit ID를 올린다 |
| `VisualNovelScreen` | `screens/visual-novel/VisualNovelScreen.tsx` | 화면 로컬 재생 위치를 조정하고 진행·완료·이탈·replay 의도를 App에 올린다 |
| `VisualNovelScene` | `screens/visual-novel/VisualNovelScene.tsx` | 현재 beat의 배경과 character pose 두 이미지 layer를 그린다 |
| `DialoguePanel` | `screens/visual-novel/DialoguePanel.tsx` | 현재 화자·대사와 `advance|replay` 판별 action 하나를 낸다 |

`다음`과 `처음부터 보기`는 한 화면만 소비하는 단순 action surface라 public 컴포넌트로
고정하지 않는다. `DialoguePanelAction`은 `advance(label: 다음) | replay(label: 처음부터 보기)`
판별 union이고 handler가 custom prop을 건너므로 구현에서 `'background only'`를 선언한다.
`VisualNovelMapItem`은 `JourneyStepNode`, `MessengerMapItem`,
`PhoneCallMapItem`의 boolean mode가 아니다. layer 순서는 background → character →
dialogue panel이고 header/나가기는 scene layer 밖에 둔다.

## 2. 스토리·상태 계약

ID는 `cafe-arrival-visual-novel`, 제목은 `카페에 도착한 지민`, character는
`jimin`/`지민`으로 고정한다. `visualNovelStoryFor(id)`가 다음 3-tuple의 유일한 제품 정본을
반환한다.

| index | beat ID | background | pose | speaker | dialogue | action 뒤 결과 |
|---:|---|---|---|---|---|---|
| 0 | `arrive` | `cafe-exterior-day` | `jimin-neutral` | `지민` | `여기가 우리가 만나기로 한 카페예요.` | `find` |
| 1 | `find` | `cafe-exterior-day` | `jimin-smile` | `지민` | `2번 출구 오른쪽이라 금방 찾았죠?` | `enter` + 최초 완료 |
| 2 | `enter` | `cafe-exterior-day` | `jimin-smile` | `지민` | `그럼 들어가서 같이 주문해 봐요.` | advance 없음; replay 가능 |

App-session progress는 `active(beatIndex: 0|1) | completed(beatIndex: 2)` 판별 union이다.
완료와 마지막 beat가 타입에서 어긋나지 않는다. App은 unit ID를 키로 이 값을 소유한다.
화면 session은 별도로 `viewing(0|1, replaying) | final(2, replaying)`을 쓰며 replay가 App
progress를 낮추지 못한다.

- 최초 App 진입값은 active(0)이다.
- advance는 0→1→2이고, 1→2에서 마지막 대사가 렌더되는 상태와 progress completed가
  같은 event turn에 성립한다.
- `resolveVisualNovelAdvance(progress, session)`가 다음 session, 단조 progress,
  `progressChanged`, `completedNow`, nullable announcement를 한 번에 낸다. 화면과 App은 이
  결과를 소비하고 같은 판정을 다시 쓰지 않는다.
- progress write, completion event와 announcement는 위 outcome이 각각 지시할 때만 수행한다.
  replay advance는 progress를 같은 참조로 유지하고 `completedNow=false`, announcement `null`이다.
- 미완료 `맵으로`는 진행을 유지하고 `incomplete`; 완료와 replay 중 이탈은 `completed`다.
- 앱 프로세스 재실행 뒤 초기화된다. 기존 `storage.ts`는 로그인 토큰 전용이므로 이 기능은
  storage, API, 서버를 사용하지 않는다.

## 3. 순수 함수 계약 (`screens/visual-novel/visual-novel.ts`)

모든 함수는 DOM, clock, random, network, storage, analytics 부수효과가 없고 던지지 않는
총함수다.

| export | 입력 | 출력·오류·책임 |
|---|---|---|
| `visualNovelStoryFor` | `VisualNovelUnitId` | §2의 exact `VisualNovelStory`; 닫힌 ID라 오류 없음 |
| `initialVisualNovelProgress` | 없음 | `{status:"active", beatIndex:0}` |
| `initialVisualNovelSessionState` | `VisualNovelProgress` | active는 해당 beat viewing(false), completed는 final(false) |
| `visualNovelSessionReducer` | state, `advance|replay` | viewing 0→1→final 2; final replay→viewing 0(replaying true); 적용 불가 action은 같은 참조 |
| `currentVisualNovelBeat` | story, session | tuple의 현재 beat, `undefined` 없음 |
| `advanceVisualNovelProgress` | progress, reached `VisualNovelBeatIndex` | furthest-only 단조 갱신; 2는 completed; 이미 completed/같거나 이전 index면 같은 참조 |
| `didVisualNovelComplete` | before, after progress | active→completed일 때만 true |
| `resolveVisualNovelAdvance` | progress, session | reducer의 next session과 단조 next progress를 합성한 `VisualNovelAdvanceOutcome`; replay 재주행은 progress same-reference, completedNow false, announcement null |
| `visualNovelCompletionStatus` | progress | active→`available`, completed→`completed` |
| `visualNovelExitOutcome` | progress | completed만 completed, 나머지는 incomplete |
| `visualNovelEntrySnapshot` | progress, story | helper로 파생한 exact `entryStatus`와 `entryBeatId`; App의 ternary 재구성 금지 |
| `visualNovelProgressLabel` | session | `장면 1 / 3`, `장면 2 / 3`, `이야기 완료` |
| `visualNovelCompletionAnnouncement` | before, after progress | active→completed면 `이야기 완료`, 그 밖은 `null` |
| `artworkFor` | `VisualNovelArtworkId` | 닫힌 `VisualNovelArtworkBundle`의 typed artwork; fallback/undefined/throw 없음 |

UI는 위 함수 결과만 렌더하며 index 계산, progress object literal, 완료·이탈·진입 판정,
announcement 문자열, asset ID ternary를 다시 구현하지 않는다. `App.tsx`도 같은 금지 대상이다.

## 4. 맵·App·내비게이션·격리 경계

- 비공개 순서는 기존 `standard(첫 네 step) → messenger → phone-call → visual-novel →
  standard(directions)`다. `journeySteps`, `JourneyStepId`, `completedStepCount`,
  `journeyStepOrdinal`, 일반 상태 계산은 바꾸지 않는다.
- map item kind는 `visual-novel`, navigation screen은
  `{name:"visual-novel", unitId:"cafe-arrival-visual-novel"}`다. 선택은 journey stack에
  push, `맵으로`는 `backToRoot`다.
- App은 visual-novel progress와 optional `visualNovelEventSink`만 새로 소유한다. 별도
  `completedVisualNovelUnitIds`는 두 번째 완료 정본이므로 금지하고, 맵 상태는
  `visualNovelCompletionStatus(progress)` 하나에서 파생한다. 공개 props는
  기존 `MessengerAppProps & VisualNovelAppProps`로 합성해 기존 sink 계약을 바꾸지 않는다. sink는
  App 기본값에서 `null`로 정규화하고 production entry도 명시적 `null`을 전달한다. screen과
  하위 컴포넌트는 sink를 알지 않는다.
- messenger state/sink, phone-call state/audio, general learning/assessment state를 읽거나
  쓰지 않는다. 기존 special unit의 helper/type을 공유하지 않고 navigation과 map의 닫힌
  union 경계에서만 공존한다.
- 이미지 3개는 `visual-novel-artwork.ts`가 build-time local import하고 exact-key
  `VisualNovelArtworkBundle` 한 개를 만든다. `artworkFor(id)`만 이를 읽고,
  `VisualNovelScene`은 `{id, kind, source}` artwork를 받는다. story/beat는 경로를 모르며
  미등록 ID의 fallback, optional key, direct path ternary가 없다. render 중 native/storage/
  network 접근은 없다.

## 5. GPT 임시 asset interface

물리 경로 root는 `apps/mobile/src/screens/visual-novel/assets/temporary/`다. 화면과 함께
colocate한 `temporary` 디렉터리가 임시 생성물을 제품 코드에서 한 번에 교체하는 경계다.
다른 화면에서 이 경로를 import하지 않는다.

| asset ID | 정확한 파일 | 형식/치수 | alpha | beat |
|---|---|---|---|---|
| `cafe-exterior-day` | `background-cafe-exterior-day.png` | PNG, sRGB RGB/RGBA, 1290×2150, 3:5 | 없음(모든 pixel alpha 255) | 0,1,2 |
| `jimin-neutral` | `character-jimin-neutral.png` | PNG, sRGB RGBA, 1536×2048, 3:4 | 배경 완전 투명 | 0 |
| `jimin-smile` | `character-jimin-smile.png` | PNG, sRGB RGBA, 1536×2048, 3:4 | 배경 완전 투명 | 1,2 |

생성·교체 요구사항:

- 배경: 맑은 낮의 한국 도심 지하철 2번 출구 오른쪽 작은 카페 외관, 세로 구도, 사람·문자·
  상표·말풍선 없음. 중앙 인물 영역과 아래 dialogue overlay 영역에 중요한 간판/단서를 두지
  않는다. crop focal point는 정규화 좌표 `(0.5, 0.44)`다.
- 캐릭터: 같은 20대 한국인 여성 지민, 어깨 길이의 짙은 갈색 머리·따뜻한 갈색 눈·cream
  knit cardigan·muted sage shirt·dark straight trousers·작은 tan crossbody bag을 두 pose에
  동일하게 유지한다. 3/4 front, 머리부터 무릎 아래까지, 프레임 중앙이며 neutral은 편안한
  기본 표정, smile은 온화한 미소와 카페를 안내하는 한 손 gesture다. 문자·상표·별도 소품·
  그림자·배경은 없다.
- 두 pose의 canvas, scale, 발 위치, 의상과 identity를 맞춘다. premultiplied black/white
  fringe, 반투명 배경 잔여물, embedded color profile 불일치는 허용하지 않는다.
- 파일 이름/ID/치수/format을 바꾸는 교체는 specification 재고정 대상이다. 그림 내용만 같은
  interface 안에서 교체할 수 있다. 생성 prompt나 원본 작업 파일은 runtime bundle에 넣지 않는다.

## 6. UI 상태·상호작용·접근성 계약

| 상태 | 보이는 내용 | 가능한 조작 |
|---|---|---|
| 최초/active 0 | title, 맵으로, 장면 1/3, arrive scene/dialogue | 다음, 맵으로 |
| active 1 | title, 맵으로, 장면 2/3, find scene/dialogue | 다음, 맵으로 |
| completed/final | title, 맵으로, 이야기 완료, enter scene/dialogue | 처음부터 보기, 맵으로 |
| replay 0/1 | 완료 기록 유지, 해당 scene, 장면 1/3 또는 2/3 | 다음, 맵으로 |
| replay final | 이야기 완료와 enter; 재완료 없음 | 처음부터 보기, 맵으로 |
| image decode 전/오류 | token fallback 면과 dialogue/action은 즉시 유지; 실패한 layer만 숨김 | 현재 상태와 같은 조작 |

scene 전체 탭으로 진행하지 않는다. 명시적 `다음` button만 한 beat를 전진시켜 VoiceOver와
touch가 같은 action을 갖는다. async/loading/error/disabled/selected/branch 상태는 없다.
배경과 character image는 접근성 요소가 아니며 DOM/접근성 순서는 나가기 → title → progress →
speaker+dialogue → 현재 action의 논리 순서를 보장한다. `DialoguePanel`은
`지민, {dialogue}` 한 접근성 단위다. 마지막 대사는 순회로 다시 들을 수 있고 최초 완료
발화가 속성 채널을 대체하지 않는다.

> **2026-09-15 LIB-255 머리 재배치.** 나가기(`visual-novel-exit-button`)는 메신저·전화처럼 머리
> 행의 첫 흐름 자식이고, title과 progress는 그 옆의 제목 묶음(`visual-novel-header-text`, test-id ·
> 접근성 속성 없음) 안에 세로로 선다. 나가기의 절대 배치와 title의 고정 여백은 없다. 여정
> (`맵으로`)과 롤플레이(`목록으로`) 두 경로가 같은 구조이고 라벨 문자열만 다르다. 그래서 위 순서에서
> 나가기가 맨 앞이다(이전에는 맨 뒤였다). 머리 안 정지는 나가기 · title · progress 셋 그대로이고
> header trait는 title 하나다. 시각 값은 [디자인](../design/visual-novel.md) §4.1에 있다.

## 7. test-id 계약 (specification.testids)

| 표면 | 안정적인 test-id / data |
|---|---|
| 맵 항목 | `journey-map-visual-novel-cafe-arrival-visual-novel`; `data-status="available|completed"` |
| 화면/제목/나가기/진행 | `visual-novel-screen`, `visual-novel-title`, `visual-novel-exit-button`, `visual-novel-progress` |
| scene | `visual-novel-scene-<arrive|find|enter>`; `data-replaying="true|false"` |
| background | `visual-novel-background-cafe-exterior-day`; asset ID는 test-id suffix로 관찰 |
| character | `visual-novel-character-<jimin-neutral|jimin-smile>`; pose ID는 test-id suffix, character ID는 typed artwork로 관찰 |
| dialogue | `visual-novel-dialogue-<arrive|find|enter>` |
| actions | `visual-novel-advance-button`, `visual-novel-replay-button` |

`data-status`, beat, asset/pose ID는 조건부 누락이나 CSS class 이름으로 관찰하지 않는다.
ReactLynx 0.125.0의 native element property parser가 임의의 `data-asset-id`와
`data-character-id`를 지원하지 않아 UI red 실행에서 property-name 오류가 확인됐다. 따라서
맵 상태만 저장소에서 이미 쓰는 `data-status`로 두고, image identity는 위의 닫힌 test-id와
`VisualNovelArtworkBundle` 타입으로 관찰한다. 지원되지 않는 custom property를 테스트만 위해
제품 element에 추가하지 않는다.

## 8. 관측성 계약

> **2026-09-15 LIB-255 재고정.** 모든 이벤트가 진입 출처 `entrySource: "journey" | "roleplay"`를
> 싣는다. 롤플레이 탭에서 연 연습 세션도 같은 이벤트를 내고, 열림만 출처별 변형이 둘이다.
> 여정 쪽 발생 조건·횟수·순서는 그대로이고 속성 하나가 늘었을 뿐이다. 목록과 연습 모드,
> 나가기 라벨 `목록으로`는 [롤플레이 목록 스펙](roleplay-list.md)에 있다.

| event | 출처 | payload | 정확한 발생 시점 | 지표 |
|---|---|---|---|---|
| `visual_novel_unit_opened` | journey | `unitId`, `entrySource: "journey"`, `entryStatus`, `entryBeatId` | map **또는 알림**(LIB-257) 선택 후 push 직전, 매 진입 | entries, completed re-entry |
| `visual_novel_unit_opened` | roleplay | `unitId`, `entrySource: "roleplay"` | 롤플레이 목록 항목 선택 후 push 직전, 매 진입. `entryStatus`·`entryBeatId`를 싣지 않는다 — 연습 진입은 언제나 `arrive`라 정보가 없고, 실으면 여정 상태로 오독된다 | roleplay share |
| `visual_novel_unit_completed` | journey | `unitId`, `entrySource: "journey"` | active(1)→completed(2)가 최초 성립할 때, progress write와 같은 handler에서 한 번 | completions, completion rate |
| `visual_novel_unit_completed` | roleplay | `unitId`, `entrySource: "roleplay"` | `find`에서 `다음`으로 `enter`에 닿는 전이마다 — 연습 진행값이 늘 처음이라 **회차마다**(replay 뒤 재완료 포함). 같은 handler에서 `이야기 완료` 능동 발화 뒤 | roleplay completions |
| `visual_novel_unit_exited_incomplete` | journey | `unitId`, `beatId`, `entrySource: "journey"` | active progress에서 `맵으로`를 눌러 backToRoot 직전 | abandonment |
| `visual_novel_unit_exited_incomplete` | roleplay | `unitId`, `beatId`, `entrySource: "roleplay"` | `목록으로`를 누른 장면이 `enter`가 아닐 때(`practiceVisualNovelExitOutcome(beatId)`), backToRoot 직전 | abandonment |
| `visual_novel_unit_replay_started` | 둘 다 | `unitId`, `entrySource` | completed final에서 `처음부터 보기`를 눌러 local replay를 시작할 때 | replay |

**롤플레이 출처는 판정 입력이 다르다.** 연습에는 App 진행이 없어, 화면이 넘기는 이탈
`outcome`(연습 진행값이 늘 처음이라 늘 `incomplete`)을 버리고 나간 장면 `beatId`로 판정한다 —
`enter`에서 나가면 완료, `arrive`·`find`면 이탈이다. 그래서 롤플레이에서 `처음부터 보기` 뒤
`arrive`·`find`에서 나가면 이탈로 센다(여정은 replay 중 이탈을 세지 않는다). 수용 기준 5의
*"완료 이벤트와 `이야기 완료` 능동 발화는 최초 회차의 각 1건에서 늘지 않는다"* 는 **여정 출처의
규칙**이다 — 롤플레이 출처는 회차마다 둘 다 난다. 롤플레이 진행은 App의 visual-novel progress를
읽지도 쓰지도 않는다.

sink가 `null`이어도 progress, completion, replay, navigation 결과는 같다. 완료 뒤 또는 replay
중 `맵으로`는 abandonment가 아니며 app background/kill, tab 전환은 이 이벤트로 세지 않는다.
payload exact-key 테스트로 대사·speaker·asset path·사용자 ID가 없음을 고정한다. 현재 제품에
운영 sink가 없으면 계약과 테스트는 발생 경계만 증명하며 실제 출시 집계 완료를 주장하지 않는다.

## 9. 계층별 테스트 계획 (specification.test-plan + applicability)

### unit — required / applicable

행동 계산과 상태 보존이 새 순수 로직이다. `visual-novel.unit.test.ts`는 exact 3-tuple,
0→1→2, 마지막에서만 completion, invalid action same-reference, progress 단조성, completed
불변, replay local reset, progress/status/announcement label을 검증한다.
`journey-map.visual-novel.unit.test.ts`는 map 순서와 기존 다섯 steps 불변을 검증하고,
`navigation.unit.test.ts`는 visual-novel push/current/backToRoot를 검증한다.

### ui — required / applicable

`VisualNovelMapItem.ui.test.tsx`는 상태·이름·button trait·ID 전달을 검증한다.
`VisualNovelScene.ui.test.tsx`는 각 beat의 background/character/dialogue test-id, layer/DOM
순서, 장식 이미지 접근성 제외, 배경/캐릭터 decode 실패의 독립 fallback을 검증한다.
`VisualNovelScreen.ui.test.tsx`는 active0/active1/
final/replay, 명시적 action 하나, progress text, header/button semantics, 완료 callback의 정확한
시점을 검증한다. `VisualNovelScreen.header.ui.test.tsx`(LIB-255)는 머리 구조 — 나가기 → 제목
묶음(title → progress), 화면 루트의 자식은 머리와 scene 둘 — 와 접근성 시맨틱 불변(나가기 이름·
역할, header trait 하나, 제목 묶음에 접근성 속성 없음)을 두 진입 출처에서 검증한다. 계산
스타일·pixel snapshot은 디자인 검증의 책임이고 여기서 단언하지 않는다.

### integration — required / applicable

`App.visual-novel.integration.test.tsx`는 map→screen, advance, 미완료 이탈/재진입 resume,
최초 완료, map 완료 표시, 완료 재진입 final, replay 후 이탈/재진입 final을 검증한다. 같은
흐름에서 일반 progress, messenger, phone-call이 불변임을 단언한다. callback spy/null 두 경로로
네 이벤트의 순서·exact payload, 완료/abandonment 중복 금지를 검증한다. build integration은
세 exact local image import가 bundle에서 resolve되고 network 요청이 없음을 확인한다.

### e2e — required / applicable, automatic runner unavailable

repository profile에는 `test.e2e` command가 없고 iOS Release 실제 발화·Dynamic Type·image
crop을 자동 판정할 러너도 없다. 구현 후 `docs/e2e/visual-novel.md`의 수동 절차가 다음 경계를
실기에서 닫는다: map 위치/진입, 3 beat와 마지막 완료, 중간/완료 재진입, replay, asset crop과
투명 edge, 기본/최대 Dynamic Type, VoiceOver의 제목·대사·button 순서 및 최초 완료 발화.
자동 unit/UI/integration green을 이 실기 결과로 확대하지 않는다.

## 10. 병렬 구현 경계

- logic/state: `visual-novel.ts`와 App-session progress pure helpers.
- UI: `VisualNovelScreen`, `VisualNovelScene`, `DialoguePanel`; 계약 props와 generated assets만 소비.
- journey/app integration: map item, closed unions, App progress/event/navigation wiring.
- asset generation: §5의 전용 bundle root에 exact 세 파일만 생성.
- documentation: 아래 documentation-impact가 지정한 문서와 수동 E2E.

같은 파일 동시 쓰기는 금지하고 app integration은 logic/UI/map 계약 소비가 준비된 뒤 결선한다.

## 11. 계약 차이 (contract-diff)

- 추가: visual-novel unit/story/beat/asset/progress/session/event/props/test-id 타입과 별도 map
  item/screen discriminant.
- 정정: `VisualNovelSceneProps.replaying: boolean`을 필수로 내려 scene의 고정
  `data-replaying="true|false"` 관찰 계약을 충족한다.
- 추가: 기존 map 목록의 phone-call과 directions 사이에 special item 한 개, App 소유
  visual-novel progress + optional sink, build-time image imports 3개.
- 변경 없음: 기존 public type 의미, `JourneyStepId`, 일반 step count/status, messenger state/
  events, phone-call state/audio, storage/native interfaces.
- 삭제 없음. 분기, affection, animation, voice sync, roleplay 확장점도 만들지 않는다.

```yaml
kind: contract-diff
status: recorded
summary: "독립 visual-novel 계약과 map/screen 결선, App-session resume/completion, 네 관측 이벤트, exact GPT 임시 asset interface를 추가하며 기존 learning/messenger/phone-call 계약은 변경하지 않는다; 삭제 0개"
artifact: docs/specs/visual-novel-special-unit.md#11-계약-차이-contract-diff
producedBy: specification
```

## 12. 문서 영향 판정 (documentation-impact)

```yaml
kind: documentation-impact
status: required
summary: "셋째 특별 유닛의 실제 구성·map 순서·완료/재진입·임시 image bundle·수동 iOS 여정이 새로 생겨 현재 화면 목록과 특별 유닛 실체화 기록이 낡는다"
documents:
  - docs/screens.md
  - docs/adr/0024-journey-units-and-special-unit-placement.md
  - docs/adr/README.md
  - docs/e2e/README.md
  - docs/e2e/visual-novel.md
artifact: docs/specs/visual-novel-special-unit.md#12-문서-영향-판정-documentation-impact
producedBy: specification
```

## 13. 계약 고정 증거

```yaml
kind: specification.contract
status: frozen
summary: "linear 3-beat story, pure state/progress responsibilities, UI/integration/persistence/observability boundaries and exact asset interface are frozen"
artifact: apps/mobile/src/screens/visual-novel/visual-novel.contract.ts
producedBy: specification
```

```yaml
kind: specification.testids
status: frozen
summary: "map, screen, beat, asset, dialogue and action selectors are closed by VisualNovelTestId and section 7"
artifact: docs/specs/visual-novel-special-unit.md#7-test-id-계약-specificationtestids
producedBy: specification
```

```yaml
kind: specification.test-plan
status: frozen
summary: "unit, UI, integration and manual iOS E2E responsibilities and boundaries are assigned"
artifact: docs/specs/visual-novel-special-unit.md#9-계층별-테스트-계획-specificationtest-plan--applicability
producedBy: specification
```

```yaml
kind: test.unit.applicability
status: applicable
summary: "새 선형 전이, 마지막 완료 판정, 단조 progress와 replay 분리가 순수 함수 책임이다"
artifact: docs/specs/visual-novel-special-unit.md#9-계층별-테스트-계획-specificationtest-plan--applicability
producedBy: specification
```

```yaml
kind: test.ui.applicability
status: applicable
summary: "새 map item과 layered scene/dialogue/action의 상태·상호작용·접근성 표면이 사용자에게 보인다"
artifact: docs/specs/visual-novel-special-unit.md#9-계층별-테스트-계획-specificationtest-plan--applicability
producedBy: specification
```

```yaml
kind: test.integration.applicability
status: applicable
summary: "map, navigation, App progress/completion, local assets and event sink가 여러 모듈 경계를 잇는다"
artifact: docs/specs/visual-novel-special-unit.md#9-계층별-테스트-계획-specificationtest-plan--applicability
producedBy: specification
```

```yaml
kind: test.e2e.applicability
status: applicable
summary: "자동 E2E는 없으며 iOS Release에서 실제 image crop, Dynamic Type, VoiceOver와 전체 재진입 여정을 수동 검증해야 한다"
artifact: docs/specs/visual-novel-special-unit.md#9-계층별-테스트-계획-specificationtest-plan--applicability
producedBy: specification
```

필수 요구사항 슬롯 7/7, 객관적 수용 기준 8개, 미승인 추론 0개, 미해결 계약 결정 0개다.
이 문서와 type-only 계약이 하류 정본이며 변경하려면 specification 단계로 돌아와 위 diff와
test plan을 함께 재고정한다.
