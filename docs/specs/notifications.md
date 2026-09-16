# LIB-257 계약 — 여정 맵 머리의 알림 화면

- 기준: 계약 고정 · 구현 기점 `7b6dda1`(PR #81 — LIB-255 위에 쌓았다).
- 요구사항: 2026-09-15 사용자 결정 Q1~Q10(홈 탭 제거 · 알림 진입 경로 · 목록 · 항목 동작 · 여정
  입장 · 측정)을 이 계약에 통합했다. 화면 명세 쪽 변경(홈 계획 제거 · 9번 진입점 · 11번 여정 입장)은
  [화면 명세](../screens.md)가 진다.
- 계약 타입: `apps/mobile/src/screens/notifications/notifications.contract.ts`, 네비게이션 어휘
  `apps/mobile/src/app/navigation.ts`(`Tab` · `Screen` · `initialNav` · `tabRootActions`).
- 상태: **고정·구현됨.** unit · ui · integration 계층이 녹색이다. 수동 iOS 흐름은 설계됐고 아직
  실행되지 않았다(§5).
- 이 문서는 공개 계약의 요약이다. 특별 유닛의 열림 이벤트 표는 각 유닛 스펙에 있고 여기에 복사하지
  않는다(§4).

## 0. 고정 범위와 불변식

1. 탭은 **셋**(여정 · 롤플레이 · 설정)이고 앱 첫 화면은 **여정 맵**이다. `Tab` · `Screen`에 홈이 없다.
2. 여정 맵 머리에 알림 버튼 하나가 늘 선다 — 아이콘 + 보이는 낱말 `알림`, 접근성 이름도 `알림`.
   누르면 알림 화면이 **여정 스택**에 쌓인다.
3. 알림 화면의 제목은 `알림`, 나가기는 `맵으로`(`backToRoot`)다. 액션 행이 없다.
4. 항목은 **넷(임시)**이고 각 항목이 **메시지 + 행선지 낱말**로 어디로 가는지 보인다. 읽음 · 안읽음 ·
   배지 · 새 알림 점은 **0건**이다 — 항목 타입의 필드가 셋(`id` · `message` · `target`)뿐이라 그릴 입력이
   없다.
5. 특별 유닛 알림은 해당 화면을 **여정 모드**로 여정 스택에 연다. 롤플레이 알림은 롤플레이 탭으로 바꾸고
   목록을 보인다 — 여정 스택의 알림 화면은 남는다.
6. 이벤트는 둘 — 열림 · 항목 탭(대상 포함). 알림 화면 · 항목에 로컬 상태가 없다. 서버 · fetch · 영속
   저장이 없다(ADR-0007 D1).

## 1. 컴포넌트와 데이터 흐름

```text
App (app/App.tsx)                                         ← 유일한 결선 자리
├─ JourneyMapScreen     { …, onOpenNotifications }        ← 머리 행 = 제목 + 액션 래퍼(알림 버튼)
├─ NotificationsScreen  { items, onSelectItem, onExit }   ← route "notifications", 여정 스택 위
│   └─ NotificationListItem × items  { item, onSelect }   ← 항목 하나 = 조작 단위 하나
└─ BottomNavigator                                        ← 탭 셋
```

- 목록은 App이 모듈 로드 때 `notificationItems()`로 한 번 받는다. 그 모듈이 임시값의 유일한 자리다
  ([코드 규약](../conventions/code.md) 「임시 입력값의 이음매」). 화면은 목록을 계산 · 정렬 · 거르지 않는다.
- 행선지 낱말 · 항목 접근성 이름 · 탭 이벤트 payload는 순수 모듈 `notifications.ts`가 계산한다.
  컴포넌트는 그 결과를 그린다.
- 열기: 버튼 → `onOpenNotifications` → `notifications_opened` → `push({ name: "notifications" })`.
- 선택: 항목 → `onSelectItem(item)` → App `onSelectNotification(item)` → `notification_item_tapped` →
  대상 분기(§3).
- 나가기: `맵으로` → `onExit` → `backToRoot`.

## 2. 목록과 항목

| 순서 | `id` | 메시지 (임시) | 대상 | 행선지 낱말 |
|---:|---|---|---|---|
| 1 | `notification-messenger` | 지민이 약속 확인 메시지를 보냈어요 | 메신저 `appointment-confirmation` | 메신저 열기 |
| 2 | `notification-phone-call` | 지민에게서 약속 확인 전화가 왔어요 | 전화 `appointment-confirmation-phone-call` | 전화 열기 |
| 3 | `notification-visual-novel` | 지민이 카페에 도착했어요 | 비주얼 노벨 `cafe-arrival-visual-novel` | 비주얼 노벨 열기 |
| 4 | `notification-roleplay-list` | 배운 대화를 롤플레이로 연습해 보세요 | 롤플레이 목록 | 롤플레이 목록 보기 |

- 넷은 대상 종류마다 하나를 둔 판정용 값이다 — 수용 기준의 네 경로를 한 목록에서 전부 밟는 최소
  수다. **메시지와 개수가 임시**이고, 항목 타입과 행선지 낱말 표는 임시가 아니다. 진짜 출처가 오는 날
  `notificationItems`의 본문만 바뀐다.
- 행선지 낱말은 `notificationDestinationLabel`의 표 한 곳이 진다 — `Record`라 대상 종류가 늘면 `tsc`가
  선다. 형태 낱말(`메신저` · `전화` · `비주얼 노벨`)에 동작을 붙였고, 목록은 「보는」 곳이라 동사가 갈린다.
- 항목 아이콘은 대상별(`message-02` · `phone` · `book` · `user-group`)이다. 행선지 낱말과 함께 「어디로
  가는지」의 둘째 채널이고, 색에 기대지 않는다.

**접근성** ([ADR-0016](../adr/0016-assistive-technology-semantics.md)).

- 여정 맵 머리: `여정 맵, 머리말` → `알림, 버튼`. 버튼 안 낱말은 따로 정지하지 않는다. 스텝 시트가 열린
  동안 머리의 액션 래퍼 `journey-map-screen-actions`가 `accessibility-elements-hidden`으로 버튼을 가린다 —
  늘 붙고 값만 갈린다(D9). 제목은 가리지 않는다.
- 알림 화면: `맵으로, 버튼` → `알림, 머리말` → 항목마다 정지 하나. 항목 루트가
  `accessibility-traits="button"`이고 이름이 `<메시지>, <행선지>`다(D3의 쉼표 구분자). 메시지 · 행선지
  `<text>`와 글 묶음에는 가림을 걸지 않는다(D5). 알림 상태의 `header`는 화면 제목 `알림` 하나다(D12).
- 탭 바: `여정, 선택됨, 버튼` · `롤플레이, 버튼` · `설정, 버튼`.

**스크롤과 머리.** 알림 화면은 머리 [고정] · 흐르는 영역 [흐름] · 액션 없음이다
([ADR-0022](../adr/0022-scroll-regions-and-fixed-affordances.md) D2 표 11번). 목록 상자
`notifications-screen-list`가 스크롤의 유일한 직계 자식이다. 여정 맵은 머리에 버튼이 더해졌을 뿐
3분할 구조가 그대로다. 머리 정렬은 여정 맵이 제목 · 버튼 프레임 top 동률 모양, 알림 화면이 메신저와
같은 안 B다([ADR-0023](../adr/0023-scale-mismatch-in-flex-boxes.md) 사례 ㉓ · ㉔).

| 표면 | test-id |
|---|---|
| 여정 맵 액션 래퍼 · 알림 버튼 | `journey-map-screen-actions` · `journey-map-screen-notifications` |
| 알림 화면 나가기 · 제목 · 흐르는 영역 · 목록 상자 | `notifications-screen-exit` · `notifications-screen-title` · `notifications-screen-scroll` · `notifications-screen-list` |
| 항목 루트 | `notification-list-item-<id>` |
| 항목 글 묶음 · 메시지 · 행선지 | `notification-list-item-text-<id>` · `notification-list-item-message-<id>` · `notification-list-item-destination-<id>` |
| 제거됨 | `home-screen-title` · `home-screen-icon` · `home-screen-scroll` · `bottom-navigator-tab-home` · `bottom-navigator-icon-home` |

## 3. 네비게이션

| 사건 | 동작 | 스택 |
|---|---|---|
| 앱 시작 | `initialNav` | `tab: "journey"`, 현재 화면 여정 맵 |
| 알림 버튼 | `push({ name: "notifications" })` | `stacks.journey = [journey-map, notifications]` |
| 알림의 `맵으로` | `backToRoot` | `[journey-map]` |
| 특별 유닛 알림 | 기존 여정 콜백(`onStartMessengerUnit` · `onStartPhoneCallUnit` · `onStartVisualNovelUnit`) → `push` | `[journey-map, notifications, <유닛>]`, 나가기 `맵으로` |
| 그 유닛의 `맵으로` | `backToRoot`(그대로) | `[journey-map]` — 알림으로 돌아가지 않는다 |
| 롤플레이 알림 | `tabRootActions("roleplay")` = `switchTab("roleplay")` → `backToRoot`를 순서대로 `dispatch` | `tab: "roleplay"`, `stacks.roleplay = [roleplay-list]`, `stacks.journey`는 그대로(알림이 남는다) |

- **여정 모드.** 알림에서 연 특별 유닛은 맵에서 연 것과 같다 — 완료가 기록되고 나가기는 `맵으로`다.
  연습 모드 입력은 쓰지 않는다. 여정 스택 위에 롤플레이 route(`목록으로`)를 세우면 라벨이 가리키는
  목록이 그 스택에 없어 라벨이 거짓이 된다
  ([ADR-0007](../adr/0007-app-internals-state-routing-data-errors.md) D6).
- **롤플레이 알림이 동작 둘인 이유.** `switchTab`만 하면 롤플레이 스택이 깊을 때(연습 유닛을 연 채
  떠난 경우) 목록이 아니라 그 유닛이 보인다. 행선지 낱말 `롤플레이 목록 보기`가 가리키는 곳은 롤플레이
  스택의 루트다 — 라벨이 가리키는 곳으로 곧장 가는 결선이다. 새 `NavAction`은 없다. 여정 스택은 접지
  않는다 — `switchTab`은 각 스택을 보존한다(D3). 대가로 여정 탭에 돌아오면 알림 화면이 서 있다.
- 알림 화면과 알림에서 연 유닛 위에서도 선택 탭은 `여정`이다.
- 새 D-번호가 없다. 기록은 ADR-0007 「정정 기록」 2026-09-15(홈 탭 제거)에 있다.

## 4. 측정 이벤트

| 이름 | 속성 | 발생 시점 | 발생하지 않는 때 |
|---|---|---|---|
| `notifications_opened` | 없음(`{ name }`만) | 알림 버튼 tap → `push` 직전 1회 | 탭을 다녀와 알림 화면이 다시 마운트될 때 · 알림 화면 안의 조작 |
| `notification_item_tapped` | `notificationId`(string) · `target`(`messenger` · `phone-call` · `visual-novel` · `roleplay-list`) | 항목 tap → 다른 sink 호출 · `dispatch`보다 먼저 1회 | `맵으로` · 탭 전환 |

| 지표 | 계산 |
|---|---|
| 알림 화면 열림 수 | `notifications_opened` 개수 |
| 항목 탭 비율 | `notification_item_tapped` ÷ `notifications_opened`. **1을 넘을 수 있다** — 탭을 다녀와 알림 화면에서 다시 누르면 열림 없이 탭이 는다 |
| 대상별 분포 | `notification_item_tapped`를 `target`으로 묶는다. 항목 단위는 `notificationId` |

- 대상이 특별 유닛이면 그 유닛의 열림 이벤트가 **여정 변형 그대로**(`entrySource: "journey"` +
  `entryStatus` · 비주얼 노벨은 `entryBeatId`까지) 뒤따른다. 한 tap 안의 순서는
  `notification_item_tapped` → `*_unit_opened` → `push`다. 새 진입 출처 값을 만들지 않았다 — 진입 출처는
  「어느 모드 · 어느 스택에서 열렸나」의 어휘이고 알림에서 연 화면은 여정 모드다. 그래서 유닛 이벤트만으로는
  맵과 알림을 가를 수 없고, 같은 세션에서 바로 앞의 `notification_item_tapped`로 잇는다.
- 대상이 롤플레이 목록이면 뒤따르는 이벤트가 없다.
- payload에 메시지 문구 · 사용자 식별자 · 시각을 싣지 않는다 — 타입이 초과 속성으로 막는다.
- sink는 `App`의 optional prop `notificationEventSink`이고 기본값 `null`로 정규화되며, 제품 진입점은
  `null`을 명시한다. **이 변경이 병합돼도 실제 집계는 0건이다.** 운영 sink 연결은 LIB-256이다.

특별 유닛의 열림 이벤트 표는 [메신저 스펙](messenger-special-unit.md) §6,
[전화 스펙](phone-call-special-unit.md) §13, [비주얼 노벨 스펙](visual-novel-special-unit.md) §8에 있다.

## 5. 테스트 계층

경로는 `apps/mobile/src/` 기준이다.

| 계층 | 파일 |
|---|---|
| unit | `app/navigation.unit.test.ts`(첫 화면 · `tabRootActions` · 홈 치환) · `screens/notifications/notifications.unit.test.ts` · `screens/notifications/notification-items.unit.test.ts` |
| ui | `screens/notifications/NotificationListItem.ui.test.tsx` · `NotificationsScreen.ui.test.tsx` · `screens/journey-map/JourneyMapScreen.notifications.ui.test.tsx` · `components/BottomNavigator.ui.test.tsx`(탭 셋) |
| integration | `app/App.notifications.integration.test.tsx`(열기 · 행선지 · 여정 모드 · 롤플레이 알림 · 이벤트 순서) · 홈 치환 `app/App.integration.test.tsx` · `app/App.heading-trait.integration.test.tsx`(알림 상태의 제목 축) · `app/App.learning-form.integration.test.tsx` |
| e2e (수동) | [알림 e2e](../e2e/notifications.md) — N1–N9 · D1 · V1–V4. **실행 0회.** V는 iPhone 실기 · Release · VoiceOver로 사람만 판정한다. V4는 관찰 기록형이다(통과/실패가 없다) |

- 홈 전용 테스트 `HomeScreen.ui.test.tsx`는 화면과 함께 지웠다. 홈을 부르던 기존 테스트는 케이스를
  지우지 않고 여정 · 설정으로 치환했다.
- 이벤트는 e2e 항목이 아니다 — 운영 sink가 `null`이라 기기에서 관측할 수 없다.

## 6. 성능 기록

[ADR-0021](../adr/0021-performance-report-ci-automation.md)이 요구하는 기록은
[`notifications-iphone-17-pro-simulator-01`](../performance/reports/notifications-iphone-17-pro-simulator-01.md)이다.
첫 화면이 홈에서 여정 맵으로 바뀌어 앞선 보고서들과 같은 조건의 기준선이 아니다. 관찰 구간과 한계는 그
보고서에 있다.

## 비고

- **임시 문구 · 행선지 낱말 — 확인 권장.** 메시지 넷과 행선지 낱말 넷은 계약이 고정한 값이다. 바뀌면
  `notification-items.ts`(메시지)와 `notifications.ts`의 표(행선지)만 바뀐다 — 형태는 그대로다.
- **열림 수는 버튼 누름으로 센다.** 화면 마운트로 세지 않는다 — 그래서 탭 비율이 1을 넘을 수 있다.
- **여정 맵 머리의 순회 순서는 실기 전이다.** 제목 · 버튼 top 동률에서 VoiceOver가 `여정 맵` → `알림`으로
  도는지는 e2e V1이 답한다. 역전되면 버튼을 머리 첫 자식으로 옮기는 대안으로 계약을 다시 연다.
- **롤플레이 알림 뒤의 포커스.** 롤플레이 알림을 누른 직후와 여정 탭에 돌아온 직후의 VoiceOver 포커스는
  ADR-0016 D8의 기존 후속이다(`docs/adr/README.md` 보류 표 「전환 통지」 행의 여섯째 사례). e2e V4가
  숫자를 기록하고, 그 기록이 「이해 안 됨」이면 여정 스택 보존을 다시 연다.
- 여정 입장 화면과 진행 중 선택지는 명세만 고쳤다 — [화면 명세](../screens.md) 「여정 입장 화면」.
