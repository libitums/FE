# ADR-0068 — 맵의 레슨이 아닌 단위는 새 `SpecialUnit` 배지로 선다: 둥근 사각 면 · 오른쪽 아래 두께 · 오각 별 하나 · 두 줄 라벨, 상태는 색으로만 보인다

- 상태: **채택 — 클라이언트 쪽.** 사용자 결정(2026-10-17)은 둘이다 — **아이콘은 오각 별(`five-pointed-star`)**(정본의 `4-nature/star`가 아니다 — 시안과 일치) ·
  **별 아이콘 통일(최종 테스트 포함) · 아래+오른쪽 두께 · 자물쇠 · 체크는 스페셜 유닛에서만 걷는다**(요구사항 비고). 나머지 셋(카탈로그 낭독 이름에 `Episode n.` 유지 · 맵 바탕 대비는 정본 값 그대로 · testid 개명)은
  **메인이 추천안을 골랐다** — 사용자 명시 승인이 아니다(아래 「사용자 결정과 메인 추천안」).
  ⚠ **기기 확인이 일부다.** iOS 시뮬레이터 한 회차(진행이 많이 된 계정)가 끝남 · 열림 상태의 면 · 두께 · 별 · 라벨과 접근성 트리를 봤고,
  **잠김 · 확인 중 · 안내 말풍선 · 눌림 이동 · 동작 줄이기 막 · VoiceOver 발화 · Android는 보지 못했다**([스페셜 유닛 e2e](../e2e/special-unit.md)).
- 날짜: 2026-10-17.
- 다루는 축: **맵의 레슨이 아닌 단위(스페셜 항목 여덟 종)의 표식** — 어느 컴포넌트가 그리는가(새 컴포넌트 · 기존 `LearningUnit` 넓힘), 아이콘의 출처와 고정, 두께(Shade)를 그리는 수단과 눌림, 상태 표현(글리프 없는 색 예외),
  접근성 이름의 분업, 맵 쪽 공유 항목과 라벨, 카탈로그 레슨 노드와의 분리, Active의 맵 결선, testid, 앱 진입점의 CSS.
  **다루지 않는 것**: 레슨 노드(튜토리얼 스텝 · 카탈로그 레슨 — `LearningUnit` 그대로), 맵 배치(줄 · 칸 · 간격 규칙 — 바뀌지 않았다), 보상 · 잠금 해제 연출, 「지금 할 것」 노드(Active · Start 말풍선 — 후속 제품 결정), 다크 모드(앱에 없음),
  서버 · 진행 · 이벤트(변경 0).
- 부분 대체:
  - [ADR-0066](0066-episode-format-screens.md) D7의 **「아이콘 `@libitums/icons/lynx/lantern-05`(열린 상태에서만 보인다 — 잠김 · 끝은 자물쇠 · 체크)」** — 문화 노드는 이제 `SpecialUnit`(오각 별 · 글리프 없음)이다(D2 · D3). 판별 · 라벨 `Culture` · 낭독 이름 · 한 줄 배치는 그대로다.
  - [ADR-0024](0024-journey-units-and-special-unit-placement.md) D15의 **카탈로그 노드 아이콘**(⟨2026-10-16⟩ 정정 기록의 `lantern-05` 문면 · 실체화 기록의 role → 아이콘 표 `play` · `lantern-05` · `flag`) — 문화 · 최종은 `SpecialUnit`, `play`는 레슨에만 남는다(D7).
- 이어받는 결정: [ADR-0024](0024-journey-units-and-special-unit-placement.md) D7(어느 유닛이 특별한가는 콘텐츠 판단) · ⟨2026-10-14⟩ 정정 기록(특별 유닛 · 표지 · 최종은 한 줄을 다 쓴다),
  [ADR-0016](0016-assistive-technology-semantics.md) D3 · D5 · D13(상태는 이름 뒤 접미사 · 잎은 요소가 아니다), [ADR-0031](0031-ui-language-catalog.md) D6(패키지 접미사 낱말은 영어 고정), [ADR-0014](0014-design-system-consumption-verified.md)(토큰은 CSS 커스텀 프로퍼티로),
  [ADR-0062](0062-progress-cache-first.md) D7(「확인 중」 노드 — 누를 수 없고 접미사 `loading`), [ADR-0065](0065-episode-format-additions.md) · [ADR-0066](0066-episode-format-screens.md)(문화 노드의 판별). 각 ADR에는 적용 기록이 붙었다.

**왜 새 번호인가** — ADR-0066 D7의 「아이콘 `lantern-05` · 잠김 · 끝은 자물쇠 · 체크」와 ADR-0024 D15의 노드 아이콘 표 위에 이미 코드 · 테스트가 지어졌다(README 「이미 무언가가 그 위에 지어진 결정이 바뀌면 → 새 번호」).
게다가 바뀌는 결정이 하나가 아니다 — 컴포넌트 · 아이콘 · 상태 표현 · 낭독 · testid가 함께 바뀌어 한 번호로 묶는다(같은 README 둘째 줄).

근거 표시: **[코드]** 저장소 코드 · **[정본]** design-system `components/special-unit.md` revision `f3271ae`(2026-10-17) · `foundations/accessibility.md` 「Special Unit 상태 색 예외」 · `foundations/motion.md` · **[실측]** 빌드 · 계산 · **[실기]** iOS 시뮬레이터 관찰 · **[추론]**.
계약의 정본은 저장소 밖 작업 폴더의 spec이고 이 문서는 그중 **결정**만 옮긴다. 시그니처는 코드가 지고, 컴포넌트 사용법은 [`packages/ui-lynx/docs/special-unit.md`](../../packages/ui-lynx/docs/special-unit.md)가 진다.

## 맥락

1. **레슨과 레슨이 아닌 단위가 같은 모양이었다** [코드]. 스페셜 항목 여덟 종(튜토리얼 표지 · 메신저 · 전화 · 비주얼 노벨 · 최종 테스트, 카탈로그 표지 · 문화 · 최종)이 모두 100px 원형 `LearningUnit`이었고,
   잠기면 자물쇠만 보여 레슨과 갈리지 않았다. 종류별 아이콘(`bookmark` · `message-02` · `phone` · `book` · `flag` · `lantern-05`)은 한 단위 안에 여러 장면이 섞이면 틀린 정보가 된다.
2. **일곱 파일이 같은 상태 표를 일곱 벌 가졌다** [코드]. 어댑터 여섯(`EpisodeIntro` · `Messenger` · `PhoneCall` · `VisualNovel` · `EpisodeFinal` · `CatalogCover`)과 `CatalogUnitNode`가 `locked → default` · `available` · `completed → clear` · `checking`을 각자 옮겼다.
3. **카탈로그 레슨 노드가 스페셜 라벨 클래스를 빌려 썼다** [코드]. `CatalogUnitNode`의 레슨 갈래도 `journey-special-unit*`를 써서 스페셜 라벨 구조를 바꾸면 레슨이 딸려 갔다.
4. **정본이 섰다** [정본]. design-system에 Special Unit 컴포넌트 문서(PR #79)가 병합됐다 — Halo 124 · Face 104(모서리 32) · Shade(오른쪽 5 · 아래 6, 흐림 0) · 아이콘 46 · Status 다섯 · 글리프 없는 상태 색(승인된 예외).
5. **맵 바탕은 `white`가 아니다** [코드 · 실측]. 맵(`.journey-map-screen`)은 `background-primary`(#FFFDFC)이고, 정본 대비 표는 `white`를 가정했다.

## 결정

### D1. 새 컴포넌트 — ui-lynx `SpecialUnit`, `LearningUnit`을 넓히지 않는다

- `packages/ui-lynx/src/special-unit/`(`SpecialUnit.tsx` · `special-unit.contract.ts` · `special-unit.css` · `index.ts`), 공개 subpath `@libitums/ui-lynx/special-unit` · `@libitums/ui-lynx/special-unit/styles.css`, 루트 재수출.
- props는 `id` · `accessibilityLabel` · `status`(`default | checking | available | active | clear`) · `focused` · `bindtap`뿐이다. **아이콘 prop이 없다** — 정본 「모든 Special Unit · 모든 Status에서 같은 아이콘」을 타입으로 강제한다.
- 왜 넓히지 않는가: 둘은 구조(원 · 링 · 배지 / Halo · Body · Shade · Face), 상태 표현(글리프 / 색만), 눌림(축소 / 이동), 아이콘 소유(호출자 / 고정)가 모두 다르다. 모드 prop을 두면 「narrative인 스페셜」 「아이콘을 받는 스페셜」 같은 정본이 금지한 조합이 타입에 생긴다.

### D2. 아이콘 — `five-pointed-star` 고정, 정본에서 벗어남 (사용자 결정)

- `@libitums/icons/lynx/five-pointed-star`(오각 별, padding 변형 기본 경로) — 루트 `fill="currentColor"` 하나를 계약이 고른 색으로 치환하고 같은 값을 `current-color`로 넘긴다(`LearningUnit` 선례). 크기 46 · 색 · 숨김 규칙은 정본 그대로다.
- **벗어남**: 정본 「Icon 에셋 `4-nature/star`」(반짝임 둘)와 다르다. 사용자가 시안과 같은 오각 별을 골랐다(2026-10-17). **정본 한 줄 정정은 후속이고 사용자 몫이다** — ADR README 보류 표 「Special Unit 아이콘 정본 불일치」.
- 아이콘 색은 SVG 문자열 안이라 CSS 변수를 쓰지 못하는 자리다 — 계약이 `@libitums/design-tokens`의 JS `color`에서 고른다(Checking `gray[400]`, 나머지 `white`). `LearningUnit` · 배지와 같은 예외다.

### D3. 상태는 색으로만 보인다 — 글리프 없는 상태 색 예외 (정본 승인)

| Status | Face | Shade | Icon | Halo | 입력 · focus | 접미사 · traits |
|---|---|---|---|---|---|---|
| Default | `gray-500` | `gray-600` | `white` | 없음 | 없음 | `locked` · `disabled` |
| Checking | `gray-300` | 투명(요소는 남음) | `gray-400` | 없음 | 없음 | `loading` · `disabled` |
| Available | `brand-primary` | `brand-strong` | `white` | 없음 | 탭 · focus | (없음) · `button` |
| Active | `brand-primary` | `brand-strong` | `white` | `brand-reward-disabled-surface` | 탭 · focus | `current` · `button` |
| Clear | `feedback-correct` | `feedback-correct-text` | `white` | 없음 | 탭 · focus | `completed` · `button` |

- **자물쇠 · 체크 · Narrative 배지 · 종류별 아이콘이 없다.** 상태는 화면에서는 색으로만, 보조기술에는 이름 뒤 접미사로 간다(ADR-0016 D3). 정본 `foundations/accessibility.md` 「Special Unit 상태 색 예외」가 승인한 예외이고,
  Default · Checking · Active Halo의 낮은 대비(1.1 ~ 2.7)도 그 예외 범위다. 「AA 충족」으로 기록하지 않는다.
- Checking의 Shade는 요소를 지우지 않고 투명으로 둔다 — 상태가 정해질 때 Shade 색이 Face와 같은 시간에 들어오고 DOM이 상태로 갈리지 않는다.
- 접미사 낱말은 `LearningUnit`과 같은 어휘다(ADR-0031 D6 — 패키지 영어 고정). `story` 접미사는 없다(Narrative가 없다).

### D4. Shade는 별도 view, 눌림은 Face의 `translate`만

- 구조: 루트(124×124, 접근성 요소 하나) › Halo(124, 모서리 40) › Body(109×110, 모서리 32 — focus ring 자리) › Shade(104, top 6 · left 5) + Face(104 · 아이콘 46). DOM 순서가 칠 순서다.
- **Shade는 `box-shadow`가 아니라 형제 view다.** 눌림(Available · Active · Clear의 `:active`)은 Face만 `transform: translate(5px, 6px)`로 움직여 정확히 Shade 자리에 놓인다 — 결과 화면이 정본 「Shade 오프셋 0」과 같다. Halo · Body · hit area · ring은 움직이지 않는다.
- 동작 줄이기(`ui-lynx-special-unit-motion-reduced`): Face 이동을 걷고(`transform: none`, 색 전환은 유지) Face 첫 자식 막 `-pressed-shade`(검정, `opacity-pressed-shade`)로 눌림을 알린다. 막은 reduced이고 Default · Checking이 아닐 때만 그린다(`hasSpecialUnitPressedShade`).
- focus ring: `.ui-lynx-special-unit-focused .ui-lynx-special-unit-body`의 두 겹 `box-shadow`(LearningUnit · SettingsCell · Card와 같은 값, 모서리 32) — 범위 117×118로 124 자리 안이다. `focused`는 Available · Active · Clear에서만 효력이 있다.
- 기하값(124 · 104 · 40 · 32 · 10 · 109 · 110 · 5 · 6 · 46)은 정본이 「현재 대응 토큰 없음」으로 적은 컴포넌트 고유 값이고 `special-unit.css` 한 파일에만 있다. 새 토큰은 0이다.

### D5. 접근성 이름 — 상태 접미사는 컴포넌트, `special` 접두는 상위 목록

- 컴포넌트는 받은 `accessibilityLabel` 뒤에 **상태 접미사만** 붙인다(`LearningUnit`과 같은 분업). 보이는 보조 라벨 `SPECIAL`과 낭독 접두 `special, `은 **같은 앱 문구표(`UiCopy.specialUnitMap`)가 함께** 진다 — 한 자리에서 바뀐다.
- 읽히는 예: `special, A Message from Minseo` · `special, Episode intro, completed` · `special, Episode 1. Final test, locked`.
- 접근성 요소는 루트 하나다. 별 · 라벨은 요소가 아니다(자손 view · svg는 기본으로 요소가 아니고 라벨 `<text>`는 `accessibility-element={false}` — ADR-0016 D5).

### D6. 맵 공유 항목 `SpecialUnitMapItem` — 어댑터는 남기고 몸통을 하나로

- `apps/mobile/src/screens/journey-map/SpecialUnitMapItem.tsx`가 `SpecialUnit` + 두 줄 라벨 + 잠김 가드를 진다. 어댑터 여섯과 `CatalogUnitNode`의 스페셜 갈래는 **자기 props 계약을 그대로 두고** id · 제목 · 낭독 이름 · 고름 콜백만 고른다.
- 상태 표는 한 벌이다 — `specialUnitStatusByNodeStatus`(`journey-special-unit.ts`): `locked → default` · `checking → checking` · `available → available` · `completed → clear`.
- **잠김 가드는 두 겹이다**: 컴포넌트가 Default · Checking에 `bindtap`을 달지 않고, 공유 항목의 탭 핸들러도 `canSelectMapNode(status)`일 때만 `onSelect()`를 부른다 — 컴포넌트 내부가 바뀌어도 맵의 잠김이 버틴다.
- 안내 말풍선: `EpisodeIntroMapItem`이 `layer="guide"`와 `children`(말풍선 — 자체 탭 + 같은 가드)을 넘긴다. 새 boolean prop은 0이다.
- **라벨은 두 줄, 톤 셋**: 「SPECIAL」(`typography-label-s`) + 제목(`typography-label-m`). 톤 `muted`(Default · Checking — 둘 다 `fg-neutral-muted`) · `brand`(Available · Active — `fg-brand` + 제목 `fg-neutral`) · `correct`(Clear — `feedback-correct-text` + 제목 `fg-neutral`).
  대문자는 문자열 자체다(`text-transform` 미사용). 안내 말풍선 겹에서는 **두 줄 모두** 흰색이다(스크림 위 `fg-brand`는 1.205:1).
- 맵 배치는 바뀌지 않았다 — 스페셜 여덟 종은 이미 전부 한 줄을 다 쓰는 자리(`solo`)라 124 자리가 칸 폭(최소 248)을 넘지 않는다. 스페셜 줄만 표식 +24 · 「SPECIAL」 줄 +14 높아지고, 자동 스크롤은 셀을 재므로 그대로 따라간다.

### D7. 카탈로그 노드 — role로 두 명시 변형

`CatalogUnitNode`(props 불변)는 `node.role === "lesson"`이면 같은 파일 안 **`CatalogLessonNode`**(`LearningUnit` · `play`)를, 아니면(`culture` · `final`) `SpecialUnitMapItem`을 그린다.
레슨 갈래의 클래스는 `journey-step-node` · `journey-step-node-label`로 옮겼다 — 값이 같아 레슨 화면은 그대로이고, 스페셜 라벨이 바뀌어도 레슨이 딸려 가지 않는다. role → 아이콘 표(`iconByRole`)는 지웠다.

### D8. Active — 컴포넌트만, 맵은 쓰지 않는다

맵의 상태 어휘는 넷(`locked` · `checking` · `available` · `completed`)이고 「지금 할 것」이 없다. 그래서 맵은 Active를 내지 않는다. Active(Halo · `current`)는 Storybook과 ui 테스트가 지킨다. 어느 노드를 Active로 할지는 후속 제품 결정이다.
맵은 `focused`도 넘기지 않는다 — 맵에 키보드 focus를 넘기는 호스트 경로가 없다(`LearningUnit`과 같은 상태).

### D9. testid — 컴포넌트 이름을 따른다

스페셜 항목의 유닛 testid는 `ui-lynx-learning-unit-<id>`에서 **`ui-lynx-special-unit-<id>`**로 바뀌었다(id 꼬리는 그대로). 옛 접두를 남기면 「이 노드는 LearningUnit이다」를 테스트가 거짓으로 말한다.
자식은 `-halo` · `-body` · `-shade` · `-face` · `-icon` · `-pressed-shade`, 라벨은 `journey-special-unit-label-<id>` · `-eyebrow-<id>` · `-title-<id>`다. 계약 유니온 `PhoneCallTestId` · `VisualNovelTestId`도 바뀌었다.

### D10. 앱 진입점이 컴포넌트 CSS를 부른다

ui-lynx 컴포넌트 CSS는 앱이 subpath로 부른다. `apps/mobile/src/app/index.tsx`에 `import "@libitums/ui-lynx/special-unit/styles.css"`가 있어야 배지가 선다.
첫 기기 회차에서 이 import가 빠져 배지가 크기 · 색 없이 사라지고 라벨만 남았다 [실기] — jsdom은 CSS를 적용하지 않아 ui 테스트가 통과했다. import를 더하고, 진입점이 그 CSS를 부르는지 검사하는 회귀 단위 테스트(SC8, `journey-special-unit.css.unit.test.ts`)를 붙였다.

### 측정

없음 — 표시만 바뀌고 새 행동이 없다. 이벤트 · 속성 변경 0. 기존 맵 · 유닛 진입 이벤트가 그대로다.

## 버린 대안

1. **`LearningUnit`에 `shape` · `variant`를 더한다** — 정본이 금지한 조합이 타입에 생기고, 상태 표현 · 눌림 · 아이콘 소유가 갈래마다 달라 계약 함수가 둘로 갈린다(D1).
2. **Shade를 `box-shadow: 5px 6px 0 0 <색>`으로** — 눌림에 `box-shadow` 오프셋 **전환**이 필요한데 Lynx `transition-property`에서 확인되지 않았다(Android 무전환 위험). focus ring과 같은 요소면 그림자 목록을 Status마다 합쳐 다시 적어야 하고(Card 선례), ring이 Face 윤곽을 따라 Shade와 겹친다(정본 「ring은 Shade 범위 밖」 위반). 별도 view는 view 하나(유닛 여덟 × 1)가 대가다(D4).
3. **컴포넌트가 `special`을 스스로 붙인다** — 보이는 라벨(앱 문구)과 낭독(패키지 고정)이 두 출처가 된다(D5).
4. **아이콘을 prop으로 받는다** — 「모든 Status에서 같은 아이콘」을 호출자 규율에 맡기게 된다(D1 · D2).
5. **정본 아이콘 `4-nature/star`** — 사용자가 시안과 같은 오각 별을 골랐다(D2).
6. **비-Active Status의 Halo를 `white`로 칠해 맵 바탕 대비를 메운다** — 안내 말풍선(스크림 위로 들림)에서 흰 124 사각이 드러나고 정본 「Halo 없음」에서 벗어난다(「대가」 2).
7. **testid 접두를 `ui-lynx-learning-unit-`로 유지** — `SpecialUnit`이 남의 이름을 내야 한다(D9).

## 사용자 결정과 메인 추천안

**사용자가 고른 것**(2026-10-17):

| # | 질문 | 답 |
|---|---|---|
| — | 스페셜 항목의 아이콘 · 두께 · 글리프 | **별 아이콘 하나로 통일(최종 테스트 포함) · 아래+오른쪽 두께 · 자물쇠 · 체크는 스페셜에서만 걷는다** |
| Q1 | 아이콘 에셋 | **오각 별 `five-pointed-star`**(정본 `4-nature/star`가 아니다). 정본 정정은 후속(사용자 몫) |

**메인이 추천안을 고른 것** — 사용자에게 따로 묻지 않았다. **사용자 명시 승인은 아니다.**

| # | 정한 값 | 답이 다르면 |
|---|---|---|
| Q2 | 카탈로그 스페셜의 낭독 이름에 `Episode n.`을 남긴다(`special, Episode 1. Final test`) — 에피소드마다 `Episode intro` · `Culture` · `Final test`가 되풀이된다 | 보이는 제목만 — 어댑터의 낭독 이름 한 줄 |
| Q3 | 맵 바탕 대비 2.974:1은 정본 값 그대로 두고 design-system 대비 표 보완을 이슈로 올린다 | 비-Active Halo를 `white`로(버린 대안 6) — CSS 한 규칙 |
| Q4 | testid를 개명한다(D9) | 옛 접두 유지 — 버린 대안 7 |

## 구현 판단

1. **svg에 `accessibility-element={false}`를 붙이지 않았다** — 루트가 요소라 자손은 기본으로 요소가 아니다. `LearningUnit`과 같은 DOM 꼴이고 결과가 같다(ADR-0016 D5).
2. **라벨 색은 상태 다섯이 아니라 톤 셋의 클래스(`journey-special-unit-label-<tone>`)다** — 정본 색 조합이 셋뿐이라 CSS 규칙이 조합 수만큼만 선다.
3. **`journey-special-unit.css` 머리 주석을 고쳤다** — 「표식은 LearningUnit이 그린다」 · 「`.journey-step-node`와 값이 같다」는 더 이상 참이 아니다.

## 대가

1. **번들** [실측] — 앱 `main.lynx.bundle` CI 설정 2,170,031 · 운영 설정 2,170,220 bytes(직전 main CI 2,163,501 대비 +6,530), ui-lynx dist 527,984 bytes(special-unit 13파일 17,391 bytes). 새 의존성 · 미디어 0.
   상한은 앱 2,164,000 → 2,172,000 · ui-lynx 513,000 → 529,000으로 올렸다(**사용자 사전 승인 규칙**) — [성능 보고서](../performance/reports/special-unit-iphone-17-pro-simulator-01.md) · `devtools/bundle-size/budget.json` note.
2. **맵 바탕 위 Available · Active Face 대비가 2.974:1이다** [실측] — 정본 계산 3.016은 `white` 기준이고 맵 바탕 `background-primary`(#FFFDFC)에서는 3:1에 0.026 모자란다. 아래 · 오른쪽 두 변은 Shade(5.385:1)가 윤곽을 주고,
   컨트롤은 라벨 「SPECIAL」 + 제목 + button trait로도 식별된다. **AA 충족으로 기록하지 않는다** — ADR README 보류 표 「Special Unit Available Face ↔ 맵 바탕 대비」. 같은 조합(2.97)은 온보딩 강조 · Page Indicator에 이미 부채로 있다.
3. **아이콘이 정본과 다르다**(D2) — 정본이 바뀔 때까지 앱 · Storybook과 design-system 문서가 다른 별을 말한다.
4. **스페셜 줄이 약 38 높아졌다**(표식 +24 · 「SPECIAL」 줄 +14) — 맵이 그만큼 길어진다.
5. **테스트 약 60파일의 testid가 기계적으로 바뀌었다**(D9) — 옛 접두를 기억하는 로컬 스크립트 · 메모는 낡는다.
6. **Shade view 하나가 유닛마다 더 선다**(D4 · 버린 대안 2).

## 미확인 · 후속

1. **기기 미확인** [실기]. iOS 시뮬레이터 한 회차(2026-10-17, `d53a372a` 운영 설정 번들, 진행이 많이 된 계정)가 **본 것**: 튜토리얼 스페셜 다섯과 카탈로그 표지 · 최종의 끝남(초록 면 · 짙은 초록 두께 · 흰 오각 별 · `SPECIAL` 짙은 초록),
   문화의 열림(주황 면 · 진한 주황 두께), 자물쇠 · 체크 · 배지 · 종류별 아이콘 없음, 스텝 · 레슨 노드는 원형 그대로, 접근성 트리의 이름 · traits · 높이 124 · 항목당 정지 하나.
   **보지 못한 것**: 잠김 · 확인 중 상태 · 안내 말풍선(새 설치 씨앗이 없었다) · 눌림 이동과 그 보간 · 동작 줄이기 막 · VoiceOver 발화 · 글자 크기 · 두 열 폴백 · Android. 목록은 [스페셜 유닛 e2e](../e2e/special-unit.md) 「미확인」.
2. **design-system 정본 정정 둘** — Icon 에셋 행(`4-nature/star` → `five-pointed-star`)과 대비 표의 「Available Face ↔ `background.primary` 2.974」 행. 저장소 밖이라 사용자 몫이다.
3. **Active의 맵 결선** — 어느 노드가 「지금 할 것」인지는 제품 결정이 먼저다(D8).
4. **런타임 성능** — 맵 첫 렌더 · 스크롤은 재지 않았다(성능 보고서 「제한 사항」).

## 재검토 조건

1. **design-system 정본의 아이콘이 바뀌거나 오각 별이 정본에 들어가면** — D2의 「벗어남」을 닫는다(보류 표 행을 닫는다).
2. **맵 바탕이 `white`가 되거나 정본 대비 표에 맵 바탕 행이 서면** — 「대가」 2를 닫거나 버린 대안 6을 다시 본다.
3. **맵에 「지금 할 것」 노드가 생기면** — 맵이 Active를 내게 한다(D8).
4. **같은 블록 모양(면 + 두께)을 쓰는 두 번째 컴포넌트가 생기면** — 정본이 말한 대로 Shade 오프셋 · 모서리를 토큰으로 올린다(D4).
5. **Android에서 `translate` 보간이나 둥근 view 겹침이 어긋나면** — 즉시 이동으로 물러난다(결과 위치가 같아 정본 위배가 아니다). 그 결과를 이 문서 적용 기록에 적는다.

## 적용 기록

- ⟨2026-10-17, 접근성 점검 반영⟩ **안내 겹(스크림 위로 들린 튜토리얼 표지)에서만 Halo를 `white`로 칠한다.** 스크림 합성색(#767678) 위에서 Face가 1.503:1 · Shade가 1.205:1로 묻혀, 교체 전 Learning Unit(4.071:1)보다 후퇴했다. 흰 Halo가 Face 옆을 흰색으로 두면 Face ↔ 흰색 3.016:1 · 흰색 ↔ 스크림 4.533:1이다. 규칙은 `first-unit-guide.css` 한 곳(선택자 클래스 셋 — Active Halo 규칙을 이긴다)이고 정본 「Halo 없음」의 벗어남은 안내 겹에 한정된다. 버린 대안 6(맵 전체 흰 Halo)은 그대로 버린다 — 맵 바탕 위에서는 흰 사각이 드러난다. 기기 확인은 안내 겹 씨앗(새 설치)이 생기는 회차 몫이다(SUE1).
- ⟨2026-10-17⟩ **잠긴 이유 문구는 이번 범위 밖**이다 — 보류 표 「Special Unit 잠긴 이유 문구」.
