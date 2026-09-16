# LIB-255 계약 — 롤플레이 목록: 특별 유닛 셋을 연습 모드로 연다

- 기준: 계약 고정 `main@538e038`, 구현 기점 `ecab840`.
- 요구사항: 2026-09-15 사용자 결정 Q1~Q10(목록 항목 · 나가기 라벨 · 완료 공유 · 측정 · 시작
  상태 · 목록 표식 · 전화 측정 · 연습 모드 이벤트)을 이 계약에 통합했다. 같은 날의 후속 결정
  넷(항목 글 묶음 가림 제거 · 비주얼 노벨 머리 재배치 · 기존 테스트 수정 해석 수락 · 형태 낱말
  유지)도 반영했다(§2 · §4 · §6 · 비고).
- 계약 타입: `apps/mobile/src/screens/roleplay-list/roleplay-list.contract.ts`, 진입 출처 어휘
  `apps/mobile/src/lib/special-unit-entry-source.ts`, 그리고 세 특별 유닛 계약의 개정분
  (`messenger.contract.ts` · `phone-call.contract.ts` · `visual-novel.contract.ts`).
- 상태: **고정·구현됨.** unit · ui · integration 계층이 녹색이다. 수동 iOS 흐름은 설계됐고 아직
  실행되지 않았다(§6).
- 이 문서는 공개 계약의 요약이다. 유닛별 이벤트 표는 각 유닛 스펙에 있고 여기에 복사하지
  않는다(§5).

## 0. 고정 범위와 불변식

1. 롤플레이 탭 루트(`roleplay-list`)에 목록이 선다. 항목은 특별 유닛 **셋 전부**이고 **여정
   순서**이며 잠김이 없다.
2. 항목은 **제목 + 형태 낱말**만 보인다. 완료·잠김 표식(체크 아이콘 · `완료됨` · `잠김` · 흐린
   모양)은 0건이다 — 항목 타입에 상태 필드가 없어 그릴 입력이 없다.
3. 항목을 누르면 해당 특별 유닛 화면이 **롤플레이 탭 스택에** 쌓인다. 여정 탭 스택은 참조까지
   그대로다.
4. 롤플레이에서 연 화면은 **연습 모드**다. 여정에서 완료했거나 중간까지 갔어도 처음부터
   시작하고(메신저 첫 공개 단계 · 전화 `통화 준비` · 비주얼 노벨 `arrive`), 여정의 완료·도달
   상태를 **읽지도 쓰지도 않는다.**
5. 롤플레이에서 연 화면의 나가기는 보이는 텍스트와 `accessibility-label` 모두 `목록으로`이고,
   누르면 목록으로 돌아온다. 여정에서 연 화면은 `맵으로` 그대로다.
6. 특별 유닛 이벤트가 진입 출처를 싣는다. 전화에 열림 이벤트가 생겼다.
7. 새 화면 컴포넌트가 없다 — 구현 순서 6번의 세 화면을 그대로 연다. 서버 · fetch · 영속 저장이
   없다(ADR-0007 D1).

## 1. 컴포넌트와 데이터 흐름

```text
App (app/App.tsx)                                    ← 유일한 결선 자리
├─ RoleplayListScreen  { items, onSelectItem }       ← 롤플레이 탭 루트. 목록을 계산하지 않고 그린다
│   └─ RoleplayListItem × items  { item, onSelect }   ← 항목 하나 = 조작 단위 하나
└─ renderRoleplayUnitScreen(screen, wiring.roleplay)  ← 롤플레이 route 셋의 렌더(모듈 수준 함수)
    ├─ MessengerScreen   { 연습 입력 · exitLabel="목록으로" · 롤플레이 콜백 }
    ├─ PhoneCallScreen   { 〃 }
    └─ VisualNovelScreen { 〃 }
```

- 목록 데이터는 App이 모듈 로드 때 `roleplayItemsFrom(journeyMapItems)`로 한 번 만든다. 화면
  폴더 사이에서는 값을 import하지 않으므로([코드 규약](../conventions/code.md) 「import」) 여정
  유닛 목록은 App이 넘긴다.
- 항목 탭 → `onSelectItem(item)` → App의 `onStartRoleplayUnit(item)` → 열림 이벤트(출처
  `roleplay`) → `push(roleplayScreenFor(item))`.

## 2. 목록과 항목

| 순서 | `unitId` | 제목 | 형태 낱말 | 아이콘 |
|---:|---|---|---|---|
| 1 | `appointment-confirmation` | 약속 확인 메시지 | 메신저 | `message-02` |
| 2 | `appointment-confirmation-phone-call` | 약속 확인 전화 | 전화 | `phone` |
| 3 | `cafe-arrival-visual-novel` | 카페에 도착한 지민 | 비주얼 노벨 | `book` |

- `roleplayItemsFrom`은 여정 항목 순서를 보존하고 일반 스텝을 뺀다. 판별자는 `form`
  (`messenger` · `phone-call` · `visual-novel`)이다 — 여정 항목의 `kind`(`"special"`이 메신저를
  뜻하는 역사적 이름)를 옮기지 않는다. `default` 없는 `switch`라 여정 항목 종류가 늘면 `tsc`가
  선다.
- 형태 낱말은 `roleplayFormLabel`의 표 한 곳이 진다(2026-09-15 유지 결정 — 비고). 아이콘은 여정 맵 항목이
  같은 유닛에 쓰는 것과 같다.
- 컴포넌트는 `RoleplayListItem` 하나다. 세 형태는 조작과 상태 어휘가 같고 다른 것은 데이터와
  아이콘뿐이라 변형으로 가르지 않는다.

**접근성.** 항목 루트 하나가 조작 단위이고 이름을 진다 — `accessibility-traits="button"`, 이름
`<제목>, <형태 낱말>`([ADR-0016](../adr/0016-assistive-technology-semantics.md) D3의 쉼표
구분자). 기대 낭독은 `약속 확인 메시지, 메신저, 버튼`처럼 항목마다 정지 하나이고 `완료됨`·`잠김`은
없다. 제목 · 형태 `<text>`와 그 둘을 품은 글 묶음에는 가림(`accessibility-elements-hidden`)을 걸지
않는다 — 보이는 이름을 지는 요소는 가리지 않는다(ADR-0016 D5). 글 묶음은 레이아웃 상자일 뿐이다.
목록 상태의 `header`는 화면 제목 `롤플레이` 하나다 — 항목 제목은 구획 제목이 아니다(D12).

**스크롤.** 제목 [고정] · 흐르는 영역 [흐름] · 액션 없음
([ADR-0022](../adr/0022-scroll-regions-and-fixed-affordances.md)). 목록 상자
`roleplay-list-screen-list`가 스크롤의 유일한 직계 자식이고, 스크롤과 목록 상자에는
`accessibility-*`가 없다.

| 표면 | test-id |
|---|---|
| 목록 제목 · 흐르는 영역 · 목록 상자 | `roleplay-list-screen-title` · `roleplay-list-screen-scroll` · `roleplay-list-screen-list` |
| 항목 루트 | `roleplay-list-item-<unitId>` |
| 항목 글 묶음 · 제목 · 형태 | `roleplay-list-item-text-<unitId>` · `roleplay-list-item-title-<unitId>` · `roleplay-list-item-form-<unitId>` |
| 나가기(기존 그대로) | `messenger-screen-exit` · `phone-call-exit-button` · `visual-novel-exit-button` |

## 3. 연습 모드 — 여정 상태를 읽지도 쓰지도 않는다

대상은 넷이다 — `completedStepCount` · `completedMessengerUnitIds` · `completedPhoneCallUnitIds` ·
`visualNovelProgress`.

| 겹 | 무엇이 | 무엇을 막나 | 누가 지키나 |
|---|---|---|---|
| 시작 입력 | `practiceMessengerCompletionStatus()`(→ `available`) · `practicePhoneCallCompletionStatus()`(→ `available`) · `practiceVisualNovelProgress()`(→ `{ status: "active", beatIndex: 0 }`) | 인자가 없어 여정 상태를 받을 자리가 없다 (읽기) | `tsc` + unit |
| 렌더 경로 | 모듈 수준 `renderRoleplayUnitScreen(screen, wiring)` | 매개변수에 여정 상태가 없고 App 상태를 캡처할 수 없다 (읽기) | `tsc` |
| 콜백 | App의 `onStartRoleplayUnit`과 `RoleplayUnitWiring` 여덟 | sink 호출 · `이야기 완료` 발화 · `push`/`backToRoot` 말고 아무것도 하지 않는다 (쓰기) | integration + 리뷰 |
| 영속 | — | 저장소 호출 0 | 리뷰 |

- 세 화면의 세션은 원래 화면 로컬이다. 연습은 그 세션을 그대로 쓰고 App에 새 상태를 두지 않는다.
- 비주얼 노벨의 나가기 판정은 `practiceVisualNovelExitOutcome(beatId)`가 진다 — `enter`면 완료,
  `arrive`·`find`면 이탈이다. 화면이 넘기는 `outcome`은 연습 진행값이 늘 처음이라 뜻이 없어
  버린다.
- 전화 연습 완료는 아무것도 하지 않는다 — 기록도 이벤트도 없다.
- 롤플레이 유닛을 연 채 다른 탭을 다녀오면 그 화면은 다시 마운트되어 처음부터 선다. 연습에는
  이어 갈 진행이 없다.
- [ADR-0024](../adr/0024-journey-units-and-special-unit-placement.md)의 특별 유닛 격리와 맞물린다 —
  연습은 어느 유닛의 상태도, 일반 스텝 진행도 바꾸지 않는다.

## 4. 나가기 라벨과 네비게이션

| 사건 | 동작 | 스택 |
|---|---|---|
| 항목 선택 | `push(roleplayScreenFor(item))` | `stacks.roleplay`에만. `stacks.journey`는 참조까지 같다 |
| 롤플레이에서 연 화면의 `목록으로` | `backToRoot` | `stacks.roleplay` → `[roleplay-list]` |
| 여정에서 연 화면의 `맵으로` | `backToRoot`(그대로) | `stacks.journey` → `[journey-map]` |

- route는 여정과 따로 셋이다 — `roleplay-messenger` · `roleplay-phone-call` ·
  `roleplay-visual-novel`(`{ name, unitId }`). 여정 route 셋과 그 소비자는 한 글자도 바뀌지
  않는다. 대가로 `Screen` 멤버와 화면 컴포넌트의 1:1이 깨졌다 — 컴포넌트 하나를 route 둘이 연다.
- 라벨은 `specialUnitExitLabel(source)`가 진입 출처에서 고른다(`journey` → `맵으로`, `roleplay` →
  `목록으로`). 세 화면은 `exitLabel?` prop을 받고 기본값이 `맵으로`라 기존 호출이 그대로
  성립한다. App은 여섯 결선 모두에서 명시적으로 넘긴다.
- 비주얼 노벨의 나가기는 메신저 · 전화처럼 머리 행의 첫 흐름 자식이다. 2026-09-15 결정으로 이
  단위에서 옮겼다 — 이전의 절대 배치와 제목 고정 여백은 큰 글자 배율에서 `목록으로`가 제목과
  겹치게 했다. 두 경로가 같은 구조이고 라벨 문자열만 다르며, 낭독 순서는 나가기 → 제목 → 진행 →
  대사 → 현재 동작이다. 머리 구조는 [비주얼 노벨 스펙](visual-novel-special-unit.md) §6에 있다.
- 이 변경이 ADR-0007 D6의 재검토 조건(*"나가는 수단의 라벨이 `맵으로`가 아닌 화면이 처음 생기는
  시점"*)을 발동시켰다. 판정은 **D6.1 유지**다 — 두 라벨 모두 활성 스택의 루트를 가리키고 액션은
  `backToRoot` 하나다. 기록은 [ADR-0007](../adr/0007-app-internals-state-routing-data-errors.md)
  「정정 기록」 2026-09-15에 있다.

## 5. 측정 이벤트

| 지표 | 계산 |
|---|---|
| 특별 유닛 열림 중 롤플레이 출처 비율(유닛별) | 유닛 `u`의 열림 중 `entrySource = "roleplay"`인 것의 비율. 열림 = `messenger_unit_opened` · `phone_call_unit_opened` · `visual_novel_unit_opened` |
| 롤플레이 출처 완료 수 | `messenger_unit_completed` · `visual_novel_unit_completed` 중 `entrySource = "roleplay"`. **전화는 셀 이벤트가 없다** |

- 모든 특별 유닛 이벤트가 `entrySource: "journey" | "roleplay"`를 싣는다. 열림만 출처별 변형이
  둘이고, 롤플레이 열림은 `entryStatus`(비주얼 노벨은 `entryBeatId`도)를 싣지 않는다 — 타입이
  초과 속성으로 막는다.
- 롤플레이 출처의 완료는 **회차마다** 난다(완료 기록이 없어 거를 상태가 없다). 여정 출처는 앱
  세션의 최초 완료 1회 그대로다.
- 롤플레이에서도 중도 이탈과 다시 보기를 출처를 붙여 낸다. 메신저·비주얼 노벨은 발화 집합이
  두 출처에서 같다. 전화는 열림 이벤트 하나뿐이다.
- payload에 대화 본문 · 답장 · 제목 · 형태 낱말 · 사용자 식별자를 싣지 않는다. 제목은
  `unitId`로 복원된다.
- 세 sink 모두 `App`의 optional prop이고 기본값 `null`로 정규화되며, 제품 진입점은 `null`을
  명시한다. **이 변경이 병합돼도 실제 집계는 0건이다.** 계약과 테스트는 발생 경계만 증명한다.
  운영 sink 연결은 별도 후속이다.

유닛별 이벤트 표(이름 · payload · 발생 시점)는 [메신저 스펙](messenger-special-unit.md) §6,
[전화 스펙](phone-call-special-unit.md) §13, [비주얼 노벨 스펙](visual-novel-special-unit.md) §8에
있다.

## 6. 테스트 계층

경로는 `apps/mobile/src/` 기준이다.

| 계층 | 파일 |
|---|---|
| unit | `lib/special-unit-entry-source.unit.test.ts` · `screens/roleplay-list/roleplay-list.unit.test.ts` · `app/navigation.unit.test.ts` · 세 유닛의 `*.unit.test.ts`(연습 입력) |
| ui | `screens/roleplay-list/RoleplayListItem.ui.test.tsx` · `RoleplayListScreen.ui.test.tsx` · `MessengerScreen.exit-label.ui.test.tsx` · `PhoneCallScreen.exit-label.ui.test.tsx` · `VisualNovelScreen.exit-label.ui.test.tsx` · `VisualNovelScreen.header.ui.test.tsx`(머리 구조 · 두 경로) · 기존 `VisualNovelScreen.ui.test.tsx`의 낭독 순서 케이스(갱신 — 아래) |
| integration | `app/App.roleplay.integration.test.tsx`(목록 · 롤플레이 스택 · 연습 경계 · 라벨 · 이벤트) · `app/App.phone-call.integration.test.tsx`(여정 전화 열림) · `app/App.messenger.integration.test.tsx` · `app/App.visual-novel.integration.test.tsx`(여정 payload의 `entrySource: "journey"`) |
| e2e (수동) | [롤플레이 목록 e2e](../e2e/roleplay-list.md) — F1–F8 · D1 · V1–V3. **실행 0회.** V는 iPhone 실기 · Release · VoiceOver로 사람만 판정한다 |

- 기존 여정 통합 테스트의 나가기 라벨·여정 동작 단언은 고치지 않았다. 고친 것은 정확 payload
  리터럴 13건에 `entrySource: "journey"`를 더한 것뿐이다 — 수용 기준 6이 여정 이벤트에도 출처를
  싣게 해서 피할 수 없다. 이 수정이 수용 기준 4를 충족한다는 해석은 2026-09-15 사용자가
  수락했다(비고).
- 기존 ui 테스트는 한 곳을 고쳤다 — `VisualNovelScreen.ui.test.tsx` 낭독 순서 케이스의 기대 순서를
  나가기 → 제목 → 진행 → 대사 → 현재 동작으로 바꿨다. 비주얼 노벨 머리 재배치(§4)가 DOM 순서를
  바꿨기 때문이다. 같은 케이스의 다른 단언과 나머지 케이스는 그대로다.
- 이벤트는 e2e 항목이 아니다 — 운영 sink가 `null`이라 기기에서 관측할 수 없다.

## 7. 성능 기록

[ADR-0021](../adr/0021-performance-report-ci-automation.md)이 요구하는 기록은
[`roleplay-list-iphone-17-pro-simulator-01`](../performance/reports/roleplay-list-iphone-17-pro-simulator-01.md)이다.
관찰 구간과 한계는 그 보고서에 있다.

## 비고

- **형태 낱말 — 2026-09-15 유지 결정.** `메신저` · `전화` · `비주얼 노벨`은 요구사항의 `[추론]`
  값을 계약이 고정한 것이고(근거: [화면 명세](../screens.md) 구현 순서 6의 유형 이름과 요구사항
  문면), 사용자가 이 값을 유지하기로 정했다. 전화 항목은 `약속 확인 전화, 전화`로 읽혀 낱말이
  겹친다. 값이 바뀌면 바뀌는 자리는 `roleplayFormLabel`의 표 한 곳과 `RoleplayFormLabel` 타입이다.
- **기존 테스트 수정의 해석 — 2026-09-15 수락.** 수용 기준 4의 *"기존 테스트가 수정 없이
  통과한다"* 를 나가기 라벨·여정 동작 테스트로 읽은 해석(§6)을 사용자가 수락했다.
- **후속 후보 — 전화 완료 측정.** 전화에는 열림 이벤트만 있어 롤플레이 완료 수가 전화를 덮지
  않는다.
- 항목 탭 뒤와 `목록으로` 뒤의 VoiceOver 포커스 위치는 ADR-0016 D8의 기존 후속이다.
