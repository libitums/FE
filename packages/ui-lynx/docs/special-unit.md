# Special Unit

`SpecialUnit`은 학습 목록에서 레슨이 아닌 단위(표지 · 대화 장면 · 문화 · 최종 테스트 등)를 나타내는
124px 자리의 둥근 사각 control이다. 디자인 계약은 `libitums/design-system`의 `components/special-unit.md`
revision `f3271ae`을 따른다 — 아이콘 하나만 벗어난다(아래). 결정의 근거는 앱 저장소
[ADR-0068](../../../docs/adr/0068-special-unit-map-marker.md)이 진다.

- `status`: `default | checking | available | active | clear`(기본 `default`)
- `accessibilityLabel`: 상위 목록이 조합한 이름(보조 라벨 + 제목). 비면 던진다
- `id`: testid 꼬리(`ui-lynx-special-unit-<id>`). 한 화면에 여럿 설 때 쓴다
- `focused`: ReactLynx host가 전달하는 키보드 focus-visible 상태. Available · Active · Clear에서만 효력이 있다
- `bindtap`: Available · Active · Clear에서만 단다

**아이콘 prop이 없다.** 모든 Status에서 같은 아이콘을 컴포넌트가 고정한다 — `@libitums/icons/lynx/five-pointed-star`(오각 별).
⚠ **정본과 다르다**: 정본의 Icon 에셋은 `4-nature/star`(반짝임 둘)다. 사용자 결정(2026-10-17)으로 시안과 같은 오각 별을 쓰고,
정본 정정은 후속이다. 크기 46 · 색 · 숨김 규칙은 정본 그대로다.

구조는 루트(124×124 hit area · 접근성 요소 하나) › Halo(모서리 40) › Body(109×110, focus ring 자리) › Shade + Face(104, 모서리 32 · 아이콘 46)다.
**Shade는 `box-shadow`가 아니라 별도 view다** — 눌림(Available · Active · Clear)에서 Face만 `translate(5px, 6px)`로 Shade 자리에 내려앉고
Shade · Halo · hit area · ring은 움직이지 않는다. 기하값은 정본이 「현재 대응 토큰 없음」으로 적은 값이고 `special-unit.css`에만 있다.

| Status | Face · Shade | Icon | Halo | 입력 · focus | 접미사 · traits |
| --- | --- | --- | --- | --- | --- |
| Default | `gray-500` · `gray-600` | white | 없음 | 없음 | `locked` · `disabled` |
| Checking | `gray-300` · 투명 | `gray-400` | 없음 | 없음 | `loading` · `disabled` |
| Available | `brand-primary` · `brand-strong` | white | 없음 | 탭 · focus | 없음 · `button` |
| Active | `brand-primary` · `brand-strong` | white | `brand-reward-disabled-surface` | 탭 · focus | `current` · `button` |
| Clear | `feedback-correct` · `feedback-correct-text` | white | 없음 | 탭 · focus | `completed` · `button` |

**자물쇠 · tick · Narrative 배지가 없다.** 상태는 화면에서는 색으로만 보이고(정본 `foundations/accessibility.md`
「Special Unit 상태 색 예외」가 승인한 예외), 보조기술에는 접근성 이름 뒤 접미사로 간다(ADR-0016 D3 · D13).
접미사 낱말은 `LearningUnit`과 같고 기본 문구는 영어 고정이다(ADR-0031 D6). Checking의 Shade는 요소를 지우지 않고 투명으로 둔다 —
상태가 정해질 때 Shade 색이 Face와 같은 시간에 들어온다. 아이콘 색은 SVG 문자열 안이라 계약이 토큰의 JS 값으로 고른다.

동작 줄이기(`MotionProvider`의 `reduced`)에서는 루트에 `ui-lynx-special-unit-motion-reduced` · `data-motion="reduced"`가 붙고,
Face 이동이 걷히며(색 전환은 유지) Face 첫 자식 막 `ui-lynx-special-unit-pressed-shade`(검정, `opacity.pressed-shade`)가 눌림을 알린다.
막은 Default · Checking에서는 그리지 않는다(`hasSpecialUnitPressedShade`).

focus ring은 `focused`일 때 Body의 두 겹 `box-shadow`(LearningUnit · SettingsCell · Card와 같은 값, 모서리 32)이고 124 자리 안에 든다.
Lynx가 `:focus-visible`을 적용하지 않아 host가 넘기는 `focused`로만 켠다.

Active는 컴포넌트가 지원하지만 앱의 여정 맵은 쓰지 않는다(맵에 「지금 할 것」 개념이 없다). Active · Focused는 Storybook과 ui 테스트가 지킨다.

보조 라벨(`SPECIAL`)과 제목, 그 색 · 줄바꿈, 접근성 이름의 접두(`special, `)와 목록 위치는 상위 목록이 소유한다. 소비 앱은
`@libitums/ui-lynx/special-unit/styles.css`를 진입점에서 불러야 한다 — 빠지면 배지가 크기 · 색 없이 사라진다(jsdom 테스트는 CSS를 적용하지 않아 잡지 못한다).
