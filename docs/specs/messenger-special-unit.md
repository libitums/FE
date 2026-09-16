# LIB-254 계약 — 약속 확인 메신저 특별 유닛

- 기준: `origin/main@cf3cd9e49c680d6a90512524365c7371973d2922`
- 요구사항: 사용자 승인 LIB-254 요구사항을 이 계약에 통합했다.
- 시각 계약: 사용자 승인 LIB-254 시각 계약을 이 문서의 컴포넌트·접근성 경계에 통합했다.
- 계약 타입: `apps/mobile/src/screens/messenger/messenger.contract.ts`
- 상태: **고정**. 구현은 이 문서와 계약 타입을 함께 따른다.

## 0. 고정 범위와 불변식

1. 메신저 특별 유닛 `appointment-confirmation` 하나를 맵의 「약속 잡기」와 「길 묻기」
   사이에 둔다. 제목은 `약속 확인 메시지`다.
2. 특별 유닛은 언제든 열 수 있고 일반 스텝의 `done/current/locked`를 쓰지 않는다. 자체
   상태는 `available/completed`뿐이다. `JourneyStepNode`에 `isSpecial`을 추가하지 않는다.
3. 기존 `completedStepCount`, `JourneyStepId`, `journeySteps`, 일반 스텝의 잠금·열림 계산은
   값과 의미가 모두 그대로다. 특별 유닛 완료는 별도 ID 목록으로만 기록한다.
4. 대화는 승인된 다섯 메시지와 두 답장뿐이다. 자유 입력·선택 분기·채점은 없다.
5. 마지막 답장을 누르면 마지막 수신 메시지가 같은 전이에서 공개되고 그때만 완료한다.
   열기만 하거나 첫 답장 뒤 나가면 완료하지 않는다.
6. 미완료 재진입은 처음부터, 완료 재진입은 전체 기록부터다. `처음부터 보기`는 화면의
   세션만 처음으로 돌리고 완료 기록을 지우지 않는다.
7. 서버/API/AI/영속 저장을 추가하지 않는다. 앱 재기동 시 기존 스텝 진행과 마찬가지로
   메신저 완료도 초기값으로 돌아간다.

## 1. 컴포넌트와 책임

```text
App
├─ JourneyMapScreen
│  ├─ JourneyStepNode × 5                 (기존)
│  └─ MessengerMapItem × 1                (새 명시적 변형)
└─ MessengerScreen
   ├─ MessageBubble × 현재 공개 메시지
   └─ active: ReplyButton | completed: ReplayButton
```

| 컴포넌트 | 경로 | 단일 책임 |
|---|---|---|
| `MessengerMapItem` | `screens/journey-map/MessengerMapItem.tsx` | 특별 유닛 제목·완료 상태를 내고 선택 ID를 올린다 |
| `MessengerScreen` | `screens/messenger/MessengerScreen.tsx` | 로컬 대화 세션을 소유하고 나가기·최초 완료·다시 보기 의도를 올린다 |
| `MessageBubble` | `screens/messenger/MessageBubble.tsx` | `jimin/self` 판별 메시지 하나를 해당 말풍선으로 낸다 |
| `ReplyButton` | `screens/messenger/ReplyButton.tsx` | 현재 고정 답장 하나를 한 번 전송한다 |
| `ReplayButton` | `screens/messenger/ReplayButton.tsx` | 완료 화면을 첫 메시지 상태로 되돌린다 |

머리, 진행 문구, 메시지 목록, 액션 행은 이 화면 한 곳의 구조다. 별도 행동 계약이 없으므로
컴포넌트로 승격하지 않는다. `MessageBubble`은 `sender` 판별 union을 받고,
`MessengerMapItem`은 별도 컴포넌트이므로 불리언 모드 prop을 만들지 않는다.

## 2. 도메인·데이터 계약

### 2.1 타입 정본

`messenger.contract.ts`가 다음을 고정한다.

- ID: `MessengerUnitId = "appointment-confirmation"`
- 완료 상태: `MessengerCompletionStatus = "available" | "completed"`
- 메시지: `JiminMessage | SelfMessage` 판별 union과 리터럴 메시지 ID 다섯
- 대화: `MessengerConversation`의 교대 순서가 지민/나/지민/나/지민인 5-tuple
- 세션: `active(replyIndex: 0|1) | completed`
- 화면/하위 컴포넌트 props와 사용자 행동 이벤트 union

### 2.2 고정 데이터

`screens/messenger/messenger.ts`의 비공개 `Record<MessengerUnitId,
MessengerConversation>` 한 곳을 제품 코드의 정본으로 둔다. 테스트는 독립 검증을 위한
literal 기대값 fixture를 별도로 둘 수 있다.

| 순서 | id | sender | text |
|---:|---|---|---|
| 1 | `jimin-schedule` | `jimin` | `토요일 오후 2시에 역 앞 카페에서 만나요.` |
| 2 | `self-accept` | `self` | `네, 좋아요. 토요일에 봬요!` |
| 3 | `jimin-directions` | `jimin` | `카페는 2번 출구 오른쪽에 있어요.` |
| 4 | `self-thanks` | `self` | `네, 고마워요!` |
| 5 | `jimin-goodbye` | `jimin` | `그럼 토요일에 봬요!` |

`messengerConversationFor(id)`만 데이터를 내보낸다. 조회는 `MessengerUnitId`가 전수성을
보장하는 총함수이며 API 요청/응답 스키마와 데이터 fetch hook은 **없다**. 데이터는 로컬
고정 값이고 서버/API가 명시적 범위 밖이기 때문이다.

### 2.3 순수 함수 계약

구현 위치는 `screens/messenger/messenger.ts`다. 전부 DOM·네트워크·저장소 부수효과가 없다.

| export | 입력 | 출력·규칙 |
|---|---|---|
| `messengerConversationFor` | `MessengerUnitId` | 해당 `MessengerConversation`; 던지지 않음 |
| `initialMessengerSessionState` | `MessengerCompletionStatus` | available→active(0), completed→completed |
| `messengerSessionReducer` | state, `reply/replay` | active 0→active 1→completed; replay는 completed→active 0; 적용 불가 action은 같은 참조 |
| `visibleMessengerMessages` | conversation, state | active 0은 앞 1개, active 1은 앞 3개, completed는 5개 |
| `currentMessengerReply` | conversation, state | 반환형은 `SelfMessage \| null`; active 0은 `self-accept`, active 1은 `self-thanks`, completed는 `null` |
| `messengerProgressLabel` | state | active 0=`대화 1 / 2`, active 1=`대화 2 / 2`, completed=`대화 완료` |
| `messengerExitOutcome` | state | completed만 `completed`, 나머지는 `incomplete` |
| `completeMessengerUnit` | 완료 ID 목록, ID | 이미 있으면 같은 참조, 없으면 한 번 추가; 제거 동작 없음 |
| `messengerCompletionStatus` | 완료 ID 목록, ID | 포함이면 completed, 아니면 available |

`MessengerScreen`의 둘째 답장 핸들러는 완료 전이를 판별해 `onComplete(id)`를 한 번 올린 뒤
리듀서 전이를 적용한다. 완료 후 replay에서 다시 끝까지 가도 ID 목록과 최초 완료 이벤트는
늘지 않는다.

## 3. 여정 맵과 항해 계약

### 3.1 유닛 데이터와 렌더 순서

`JourneyUnit`은 기존 판별 union을 유지하며 `special` 변형만 다음 필드를 얻는다.

```ts
type JourneyUnit =
  | { readonly kind: "standard"; readonly steps: readonly JourneyStep[] }
  | {
      readonly kind: "special";
      readonly id: MessengerUnitId;
      readonly title: "약속 확인 메시지";
      readonly screen: "messenger";
    };
```

비공개 `journeyUnits`는 `standard(첫 네 스텝) → special(appointment-confirmation) →
standard(directions)` 순서다. `journeySteps = standardUnitSteps(journeyUnits)`는 기존 다섯
스텝과 순서를 그대로 낸다. 맵은 새 `journeyMapItems` 파생 목록을 순회하며 step과 special을
명시적으로 갈라 렌더한다. `journeyUnits` 자체는 export하지 않는다.


PR #62 리뷰 반영으로 맵 파생 항목의 특별 변형은 다음 계약을 사용한다.
제목은 `JourneyUnit.title`에서 함께 파생하며, 화면은 `item.title`을 전달한다.
표시 문구·접근성 이름·순서·진행 상태는 바뀌지 않는다.

```ts
type JourneyMapItem =
  | { readonly kind: "standard"; readonly step: JourneyStep }
  | {
      readonly kind: "special";
      readonly id: MessengerUnitId;
      readonly title: MessengerConversation["title"];
    };
```

### 3.2 ADR-0024 D9 C1~C3 — 권장안에도 필수

- **C1:** 일반 스텝 status 입력은 맵 줄의 index가 아니라
  `journeyStepOrdinal(step.id) - 1`이다. `stepStatusAt` 시그니처는 바꾸지 않는다.
- **C2:** 실제 특별 항목이 중간에 있는 렌더 테스트가 뒤의 `directions` 상태·조작 가능성을
  자기 스텝 서수로 단언한다.
- **C3:** 같은 케이스가 뒤쪽 스텝의 실제 `accessibility-label`과 trait를 리터럴로 단언한다.

### 3.3 props와 라우팅

`JourneyMapScreenProps`는 기존 두 필드에 다음을 추가한다.

```ts
readonly completedMessengerUnitIds: readonly MessengerUnitId[];
readonly onStartMessengerUnit: (id: MessengerUnitId) => void;
```

`Screen` union에는 `{ name: "messenger"; unitId: MessengerUnitId }`를 추가한다.
맵 선택은 `push`로 메신저 화면을 연다. 메신저의 `맵으로`는 완료 여부와 관계없이
`backToRoot`다. `App`이 완료 ID 목록을 소유하고 `MessengerScreen`에 대화·완료 상태와
콜백을 내린다. 메신저 화면의 로컬 세션은 화면이 스택에서 사라질 때 함께 사라진다.

`App`의 공개 주입 surface는 `MessengerAppProps` 하나를 사용한다.

```ts
export function App(
  { messengerEventSink = null }: MessengerAppProps = {},
) { /* 구현은 이 시그니처를 따른다 */ }
```

- `messengerEventSink`는 생략 가능한 prop이지만, `App` 안에서 사용하는 유효값은 기본값으로
  정규화된 `MessengerEventSink`, 즉 callback 또는 `null`뿐이다. `undefined`를 이벤트 경계로
  전파하지 않는다.
- 생략 가능성과 함수 인자의 빈 객체 기본값은 기존 `<App />` 렌더 호출을 보존하기 위한
  호환 계약이다. callback이 필요한 통합 테스트만 `<App messengerEventSink={sink} />`로
  주입한다.
- 실제 제품 진입점 `apps/mobile/src/app/index.tsx`는 생략에 기대지 않고
  `<App messengerEventSink={null} />`을 호출해 현재 출시 sink가 없음을 명시한다.
- `MessengerScreenProps`, `MessengerMapItemProps`를 포함한 하위 public props에는 sink를
  추가하지 않는다. `App`이 기존 맵 선택 및 `onExit`/`onComplete`/`onReplay` 콜백을 이벤트
  발생 경계로 감싸므로, 화면은 계측 대상을 알지 않는다.

## 4. 화면 구조·접근성·Lynx 경계

- `MessengerScreen`은 `[고정] 머리(맵으로+제목) / [흐름] 대화 / [고정] 액션 행`이다.
- 흐름은 자식 하나인 세로 `scroll-view`이고 `scroll-orientation="vertical"`,
  `scroll-bar-enable={true}`를 명시한다. 고정 머리·액션은 스크롤 밖이다.
- 모든 보이는 문자열은 `<text>`에 둔다. 버튼은 `<view>`에 보이는 `<text>`를 포함하고
  이름과 `accessibility-traits="button"`을 낸다. 제목은 `header`다.
- `bindtap`을 쓰며 main-thread 이벤트는 없다. custom prop을 거쳐 `bindtap`에 닿는
  핸들러에는 ReactLynx 규칙대로 `'background only'`를 둔다.
- 완료는 색 하나에 기대지 않고 맵 항목의 라벨 접미사 `완료됨`과 `data-status`로도 낸다.
- Dynamic Type 최대 배율에서 머리·액션이 남고 모든 메시지에 스크롤로 닿아야 한다.

## 5. test-id 계약

| 표면 | test-id |
|---|---|
| 맵 특별 항목 | `journey-messenger-item-appointment-confirmation` |
| 메신저 화면/나가기/제목/진행/스크롤/목록 | `messenger-screen`, `messenger-screen-exit`, `messenger-screen-title`, `messenger-screen-progress`, `messenger-screen-scroll`, `messenger-message-list` |
| 메시지 | `messenger-message-<messageId>` |
| 현재 답장 | `messenger-reply-<self-message-id>` |
| 다시 보기 | `messenger-replay` |

맵 항목은 `data-status="available|completed"`, 메시지는 `data-sender="jimin|self"`를 항상
낸다. 조건부 누락으로 상태를 표현하지 않는다.

## 6. 사용자 행동 이벤트 계약

> **2026-09-15 LIB-255 재고정.** 모든 이벤트가 진입 출처 `entrySource: "journey" | "roleplay"`를
> 싣는다. 롤플레이 탭에서 연 연습 세션도 같은 이벤트를 내고, 열림만 출처별 변형이 둘이다.
> 여정 쪽 발생 조건·횟수·순서는 그대로이고 속성 하나가 늘었을 뿐이다. 목록과 연습 모드,
> 나가기 라벨 `목록으로`는 [롤플레이 목록 스펙](roleplay-list.md)에 있다.

타입은 `MessengerEvent`다. 대화 본문·답장 문자열·사용자 식별자는 payload에 넣지 않는다.

| event | 출처 | payload | 발생 시점 | 지표 |
|---|---|---|---|---|
| `messenger_unit_opened` | journey | `unitId`, `entrySource: "journey"`, `entryStatus` | 맵 항목 선택으로 화면을 push하기 직전, 매 진입 | 진입 수, 완료 후 재진입 수 |
| `messenger_unit_opened` | roleplay | `unitId`, `entrySource: "roleplay"` | 롤플레이 목록 항목 선택으로 화면을 push하기 직전, 매 진입. `entryStatus`를 싣지 않는다 — 연습은 여정 상태를 읽지 않고, 타입이 초과 속성으로 막는다 | 롤플레이 출처 비율 |
| `messenger_unit_completed` | journey | `unitId`, `entrySource: "journey"` | available→completed가 처음 성립할 때 한 번 | 진입 대비 완료율 |
| `messenger_unit_completed` | roleplay | `unitId`, `entrySource: "roleplay"` | 회차가 끝에 닿을 때마다 — 처음 열었을 때든 `처음부터 보기` 뒤든. 완료 기록이 없어 거를 상태도 없다 | 롤플레이 출처 완료 수 |
| `messenger_unit_exited_incomplete` | 둘 다 | `unitId`, `entrySource` | active 상태에서 나가기(여정 `맵으로` · 롤플레이 `목록으로`)를 누를 때 | 중도 이탈률 |
| `messenger_unit_replay_started` | 둘 다 | `unitId`, `entrySource` | completed 상태에서 `처음부터 보기`를 누를 때 | 완료 후 재진입 대비 다시 보기율 |

`App`의 경계 타입은 `MessengerEventSink`이며 값은 callback 또는 `null`이다. 주입된 callback이
있을 때 위 발생점에서 호출하고, 제품 진입점은 현재 sink 부재를 `null`로 명시한다. no-op
함수·메모리 배열·새 SDK·서버 전송을 만들지 않는다. 테스트는 callback spy로 발생 계약을
검증한다. **이는 실제 출시 집계 전송 완료가 아니다.** 배포 전에 기존 sink를 연결하는 별도
후속이 필요하며, 그 전에는 measurement가 실제로 집계되지 않는다.

주입과 이벤트 source의 최소 결선 계약은 다음과 같다. 모든 source를 `App`이 소유하며
`MessengerScreen`에 sink를 직접 전달하지 않는다. 롤플레이 쪽 콜백은 private
`RoleplayUnitWiring`에 모이고, 모듈 수준 `renderRoleplayUnitScreen`이 화면에 잇는다
([롤플레이 목록 스펙](roleplay-list.md) §3).

| event | 출처 | App의 실제 source callback | sink 호출 순서·조건 |
|---|---|---|---|
| `messenger_unit_opened` | journey | `JourneyMapScreen.onStartMessengerUnit` | 현재 완료 ID 목록에서 `entryStatus`를 계산하고, messenger 화면 `push` 직전에 호출 |
| `messenger_unit_opened` | roleplay | `RoleplayListScreen.onSelectItem` → `onStartRoleplayUnit(item)` | `item.form`이 `messenger`일 때 `roleplay-messenger` 화면 `push` 직전에 호출 |
| `messenger_unit_completed` | journey | `MessengerScreen.onComplete` | ID가 완료 목록에 없을 때 sink 호출 후 완료 목록에 한 번 추가; replay 뒤 재완료에는 호출하지 않음 |
| `messenger_unit_completed` | roleplay | 롤플레이에서 연 `MessengerScreen.onComplete` | 매번 호출. 완료 목록을 읽지도 쓰지도 않음 |
| `messenger_unit_exited_incomplete` | 둘 다 | `MessengerScreen.onExit` | 전달된 outcome이 `incomplete`일 때 `backToRoot` 직전에 호출; `completed` 이탈에는 호출하지 않음 |
| `messenger_unit_replay_started` | 둘 다 | `MessengerScreen.onReplay` | completed 화면의 `처음부터 보기` 탭으로 callback이 올라온 시점에 호출 |

내부 `ScreenWiring`에는 정규화된 `messengerEventSink: MessengerEventSink`를 required로 두어
`renderScreen`까지 전달한다. 이는 private 결선이며 새 public 컴포넌트 prop가 아니다. sink가
`null`이면 위 지점들은 호출만 생략하고 완료 상태·세션 전이·navigation은 callback 주입
경로와 동일해야 한다.

## 7. 계층별 테스트 계획

### unit — required

- `messenger.unit.test.ts`: 고정 5-tuple과 정확한 대사, 세션 0→1→완료, 공개 개수 1/3/5,
  현재 답장, replay 초기화, exit outcome, 완료 ID의 멱등·단조성을 검증한다.
- `journey-map.unit.test.ts`: 실제 `journeySteps` 다섯 불변, map items의
  `appointment → special → directions` 순서, special이 standard step 파생에 기여하지
  않음을 검증한다. `JourneyUnit.special`의 필수 필드가 늘어 기존 fieldless special fixture가
  수집 단계에서 컴파일 오류를 내는 것은 red가 아니다. tester가 새 계약 모양으로 fixture를
  먼저 이관한 뒤 행동 단언의 실패를 red로 확인한다.
- `navigation.unit.test.ts`: messenger screen의 push/current/backToRoot를 기존 리듀서
  불변식으로 검증한다.

### ui — required

- `MessengerMapItem.ui.test.tsx`: available/completed의 test-id, data-status, 라벨 접미사,
  button trait와 선택 ID 전달.
- `MessageBubble.ui.test.tsx`, `ReplyButton.ui.test.tsx`, `ReplayButton.ui.test.tsx`: sender와
  보이는 이름, 접근성 이름·역할, 탭 콜백.
- `MessengerScreen.ui.test.tsx`: 초기/첫 답장/완료/완료 재진입/replay/중도 이탈의 요소
  존재와 순서, 3분할 scroll props, 완료 callback 시점을 검증한다. 트리 전체 snapshot과
  계산 스타일은 단언하지 않는다.
- `JourneyMapScreen.ui.test.tsx`: C1~C3를 실제 중간 특별 항목으로 검증하고, special 선택
  콜백과 기존 step sheet 동작이 공존함을 검증한다.

### integration — required

- `App.integration.test.tsx`: 맵 특별 항목→메신저 push, 미완료 `맵으로`→맵→재진입 초기화,
  최초 완료→맵 완료 표시→재진입 전체 기록→replay, 기존 `completedStepCount`와
  `directions` 상태 불변을 검증한다.
- `App.messenger.integration.test.tsx`의 계측 케이스는 먼저 App prop scaffold가 생긴 뒤
  `<App messengerEventSink={sink} />`로 spy를 주입한다. 한 사용자 흐름에서 네 이벤트의
  정확한 순서·payload를 단언하고, 완료 뒤 이탈에는 incomplete 이벤트가 없으며 replay 뒤
  재완료에는 completed 이벤트가 늘지 않는다고 단언한다. 이벤트 객체의 key 집합을 정확히
  비교해 대화 문자열·답장 문자열·사용자 식별자가 payload에 없음을 검증한다.
- 별도 케이스는 `<App messengerEventSink={null} />`로 같은 완료 흐름을 실행해 예외 없이
  동일한 화면·완료 결과를 단언한다. 기존 `<App />` 호출을 유지하는 케이스도 기본값 호환
  증거로 남긴다. 실제 App prop scaffold 전 현재 compile-only spy 케이스를 coverage 완료로
  계산하지 않는다.

### e2e — required (저장소 규약에 따른 수동 실기)

`docs/e2e/messenger.md`를 새로 만들고 iOS Release Host에서 다음 한 흐름을 검증한다.

1. 맵 지정 위치와 언제든 진입, 5개 메시지의 순차 공개, 중도 이탈 후 초기화.
2. 마지막 수신 표시와 완료 맵 표식, 완료 재진입 전체 기록, 처음부터 보기.
3. 전후 일반 스텝 상태·잠금·열림 불변과 `directions`의 정확한 이름·상태.
4. 기본/최대 Dynamic Type에서 모든 메시지·고정 머리·고정 액션 도달, VoiceOver의 제목·
   버튼 이름·대화 읽기 순서.

자동 e2e 명령은 새로 만들지 않는다. 이 저장소의 iOS e2e 판정 채널이 문서화된 수동
절차이므로 `required`는 해당 절차와 결과를 요구한다.

## 8. 병렬화 가능한 구현 단위

계약 고정 뒤에도 같은 파일 동시 쓰기는 금지한다. 아래는 구현 경로의 소유 단위이며,
테스트 작성은 각 계층의 tester, 테스트 실행·증거 발급은 test-runner가 맡는다. 구현자가
자기 green을 증명하는 구조로 읽지 않는다.

- **logic/state:** `messenger.ts`와 unit 테스트, 계약 타입 소비.
- **UI:** messenger 폴더의 다섯 컴포넌트·CSS·ui 테스트. logic의 함수와 계약 props만 소비.
- **journey integration:** journey unit/map item/C1~C3와 map 테스트.
- **app integration:** navigation/App/index 결선과 integration 테스트. 앞 세 단위가 끝난 뒤
  순차 통합한다. 계측 테스트 red 작성에 앞서 type-only `MessengerAppProps`를 소비해 App의
  optional prop/default null, private `ScreenWiring` required sink, production entry의 명시적
  null을 세우는 compile scaffold가 선행되어야 한다. 이 scaffold 단계에서는 이벤트를
  호출하지 않는다. 이후 tester가 spy/null 케이스를 실제 red로 만들고, implementation이
  네 기존 callback source에 sink 호출을 연결한다.
- **documentation:** `docs/screens.md`, ADR/보류표, `docs/e2e/messenger.md`.

## 9. 문서 영향 판정

```yaml
kind: documentation-impact
status: required
summary: "첫 특별 유닛의 실제 구성·화면·완료 기록이 서고 ADR-0024 D9 C1~C3가 실체화되어 화면 목록, 결정의 코드 상태, 보류표와 수동 사용자 흐름이 바뀐다"
documents:
  - docs/screens.md
  - docs/adr/0024-journey-units-and-special-unit-placement.md
  - docs/adr/README.md
  - docs/e2e/messenger.md
artifact: docs/specs/messenger-special-unit.md#9-문서-영향-판정
producedBy: specification
```

## 10. 계약 고정 증거

```yaml
kind: changed-files
status: recorded
summary: "specification은 추적 문서 1개와 type-only 계약 파일 1개, ignored requirements/run evidence만 작성했다; JSX·CSS·상태 구현은 0건이다"
artifact: .agent-harness/harness/.harness/runs/lib-254/evidence.yaml
producedBy: specification
```

```yaml
kind: contract-diff
status: recorded
summary: "Messenger 계약에 기존 App 호출 호환형 MessengerAppProps 1개를 더하고, 이벤트 변형 4개의 이름·payload·발생 시점은 그대로 둔 채 App 주입·기본값·production null·source callback·테스트 선행조건을 고정한다; 제거 0개"
artifact: apps/mobile/src/screens/messenger/messenger.contract.ts
producedBy: specification
```

```yaml
kind: test.ui.applicability
status: applicable
summary: "새 맵 항목과 메신저 화면의 상태·상호작용·접근성 표면이 사용자에게 보인다"
artifact: docs/specs/messenger-special-unit.md#7-계층별-테스트-계획
producedBy: specification
```

```yaml
kind: test.integration.applicability
status: applicable
summary: "맵 진입, App 소유 완료 상태, backToRoot, 재진입과 이벤트 발생 경계가 여러 모듈을 잇는다"
artifact: docs/specs/messenger-special-unit.md#7-계층별-테스트-계획
producedBy: specification
```

```yaml
kind: test.e2e.applicability
status: applicable
summary: "iOS Host에서 실제 맵 위치·진입·완료 표식·Dynamic Type·VoiceOver를 수동 절차로 관찰해야 한다"
artifact: docs/specs/messenger-special-unit.md#7-계층별-테스트-계획
producedBy: specification
```

## 11. 고정 판정

- 요구사항 필수 슬롯 7/7, 수용 기준 4개, 승인된 `[추론]` 비고, 미해결 모순 0개다.
- 타입·props, 로컬 데이터 접근, 순수 함수, 라우팅, test-id, 이벤트, 네 계층 테스트,
  문서 영향을 모두 고정했다. API 요청/응답과 fetch hook은 범위 밖이라 없음을 명시했다.
- 실제 출시 이벤트 sink 미연결은 숨기지 않은 배포 전제이며 계약 미정이 아니다.
- 시각 값·토큰·좁은 폭·Dynamic Type 계약은 이 문서 5절에 통합돼 있다. 신규 토큰은
  0건이며, 남은 실기 Dynamic Type 판정은 아래 수동 E2E 추적에서 닫는다.
- 이 문서와 `messenger.contract.ts`가 하류의 정본이다. 변경하려면 specification으로
  되돌아와 contract-diff와 함께 재고정한다.

## 12. 구현·검증 연결

7~8절은 구현 전에 고정한 계획이다. 실제 구현은 `MessengerMapItem`,
`MessengerScreen`, `MessageBubble`, `ReplyButton`, `ReplayButton`과 App 결선에
착지했다. 테스트 파일은 책임별로 다음처럼 나뉘었다.

- unit: `messenger.unit.test.ts`, `messenger-state.unit.test.ts`,
  `journey-map.messenger.unit.test.ts`, `navigation.unit.test.ts`
- ui: `messenger-components.ui.test.tsx`, `messenger-accessibility.ui.test.tsx`,
  `MessengerMapItem.ui.test.tsx`, `MessengerMapItem.accessibility.ui.test.tsx`,
  `JourneyMapScreen.messenger.ui.test.tsx`
- integration: `App.messenger.integration.test.tsx`

App의 optional sink/default `null`, 내부 required wiring, 제품 진입점의 명시적 `null`,
네 이벤트의 순서·payload와 null 경로는 위 통합 테스트에 실체화됐다. 제품 진입점은 여전히
운영 sink가 없으므로 출시 집계 완료를 뜻하지 않는다.

Simulator 공통 초기 load의 Rendering·Memory 수집은 아래 세 회차에 기록했다.

- [회차 01](../performance/reports/messenger-bundle-app-launch-iphone-17-pro-simulator-01.md)
- [회차 02](../performance/reports/messenger-bundle-app-launch-iphone-17-pro-simulator-02.md)
- [회차 03](../performance/reports/messenger-bundle-app-launch-iphone-17-pro-simulator-03.md)

세 보고서는 보고서 정책의 필수 형식을 통과했다. 성능 예산이 없으므로 수집 완료를
성능 pass/fail로 읽지 않으며, 메신저 상호작용과 실기 성능은 측정하지 않았다.

수동 실기 E2E는 [절차와 부분 관찰](../e2e/messenger.md) 및
[GitHub #44](https://github.com/libitums/FE/issues/44#issuecomment-5594887444)가 계속
추적한다. 692366…에서 확인한 일부 VoiceOver 관찰을 최신 a7ce…에 승계하지 않는다.
`MessageBubble`의 화자·본문 초점 분리는 합의된 이번 범위 밖이며 잔여 Warning이다.
