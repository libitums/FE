# VisualNovelDialog 계약

- 시각·상태 원본: `libitums/design-system/components/visual-novel-dialog.md` revision
  `99d1bfbef981d3cdf225a0bad337f3aa3a7b0d55`
- 기반 결정: ADR-0025 D0–D6와 2026-09-16 VisualNovelDialog 확장
- 상태: **고정**. 공개 타입, 기본값, test-id, story 이름과 package subpath를 임의로 바꾸지 않는다.
- measurement: 없음.

## 범위와 불변식

비주얼 노벨의 대사 패널과 텍스트만 표시하는 비인터랙티브 `VisualNovelDialog`를 추가한다.
장면 art, 선택지, 진행 timer, tap/Space/Enter 입력과 자동 진행 pause control은 제품 host가 소유한다.

1. Variant는 `speech | narration | thought`, surface는 `opaque | translucent`, reveal은
   `instant | typewriter`, advance는 `tap | auto`다. 기본값은 Speech/Opaque/Instant/Tap이다.
2. Speech와 Thought는 `speakerName`이 필요하다. Narration은 speaker와 avatar를 허용하지 않는다.
   Avatar는 S 32px slot이며 상위에서 실제 컴포넌트를 조합한다.
3. 패널은 부모 너비를 채우고 24px 수평/20px 수직 padding, radius lg, gray.950 surface,
   elevation s3를 쓴다. Translucent는 `opacity.surface` 0.9다.
4. 본문 최소 높이는 두 줄 48px이다. Speech는 gray.50 이름/gray.300 본문, Narration은
   gray.600 본문, Thought는 brand 색 이름·테두리와 reward-disabled-surface 본문을 쓴다.
5. Continue indicator는 Ready이며 `continueIndicator="on"`일 때만 논리 끝에 표시한다.
6. Typewriter는 `visibleCharacterCount`만큼 Unicode code point를 화면에 표시하지만 접근성 이름은
   항상 전체 문장이다. 문자 수는 `0..line.length`로 clamp하며 reduced motion이면
   Instant/Ready/full text로 정규화한다.
7. Auto는 `autoControlAvailable={true}`가 함께 있어야 한다. 컴포넌트가 timer를 만들지는 않는다.
8. learning content는 `languageTag`가 필요하며 `data-language`와 `data-lang`으로 보존한다.
9. root는 text 접근성 node 하나이고 이벤트를 통과시킨다. tap handler나 button trait을 만들지 않는다.
   호스트는 선택적 `accessibilityLabel`로 번역된 전체 접근성 이름을 주입할 수 있으며, 비어 있는
   값은 허용하지 않는다.

## 공개 표면과 검증

`@libitums/ui-lynx/visual-novel-dialog`와 전용 styles subpath를 공개하고 root barrel과 aggregate
CSS도 같은 구현을 내보낸다. Storybook은 Speech, Narration, Thought, Translucent, Revealing,
Auto Advance, Learning Language, Right To Left, Long Content를 제공한다.

- unit: 기본값, 모든 variant, Unicode reveal, reduced motion, auto/language validation, token CSS
- UI: 단일 접근성 node, speaker/avatar 조건, 전체 접근성 문장, indicator 조건, RTL metadata
- integration: root/subpath identity, export map, dist/tarball, authored JSX, Storybook bundle/story
- native deferred: VoiceOver/TalkBack 전체 문장, learning 발음, 최대 글자 크기와 host 진행 제어

현재 `@libitums/design-tokens@0.2.0`에는 정본의 `opacity.surface` CSS 변수가 아직 없어
`var(--libitum-opacity-surface, 0.9)` 호환 fallback을 쓴다.

> ⟨2026-10-12⟩ **지문(FE 확장)** — `speech` · `thought`에 선택 prop `aside`(지문)와 `asideTranslation`(지문의 번역, `aside`가 있어야 함)을
> 더했다. 화자 줄과 대사 줄 사이에 작은 기울임 두 줄로 서고(`ui-lynx-visual-novel-dialog-aside`), 접근성 이름은 `{화자}, {지문}: {대사}` +
> 번역 꼴이다. `narration`은 지문을 받지 않는다(타입이 `never`). 주지 않으면 DOM은 전과 같다. 소비자는 카탈로그 표지 컷 화면
> ([ADR-0024](../adr/0024-journey-units-and-special-unit-placement.md) D15). 한글은 폰트에 기울임이 없어 기울지 않는다(영어 줄만 기운다).

> ⟨2026-11-24⟩ **로마자 · 이름 줄 스위치(FE 확장, [ADR-0188](../adr/0188-dialogue-romanization.md) D2 · 개정 D7)** — 선택 prop `romanization`(읽는 법)은
> **대사 바로 아래 · 구분선 위** 한 줄이다(순서: 대사 → 로마자 → 구분선 → 번역). 대사가 다 드러난 뒤(`ready`)에만 보이고(`showRomanization`),
> 번역 묶음(구분선 · 번역, `showTranslation`)은 번역이 있을 때만 선다. 빈 문자열은 없음. 색은 `brand.reward-disabled-text` 기울임 · medium.
> 선택 prop `headerSwitch: { label, checked, stateLabel, onChange }`는 이름 줄 오른쪽(화자가 없으면 `header-row` 오른쪽)에 「글자 + 스위치」를 세운다 —
> 누르면 `onChange(!checked)`만 부르고(값의 주인은 부르는 쪽) 대사 상자 `bindtap`으로 번지지 않는다. 낭독은 `{label}, {stateLabel}` ·
> role description `switch`. 스위치가 있으면 루트는 접근성 요소가 아니고 상자 전체를 덮는 낭독 요소(`-reading`)가 대사 이름을 지며, 화면에 선 글은
> 각각 가린다(iOS에서 접근성 요소 안 스위치에 닿을 수 없기 때문). 누르는 자리 높이 44 이상, 글자는 상자 폭 60 %를 넘으면 한 줄 말줄임, 이름은 줄바꿈.
> 둘 다 주지 않으면 DOM은 전과 같다.

## 범위 밖

- 장면 art, 선택지, 대사 queue와 persistence
- timer, tap/keyboard binding, auto pause UI
- Avatar 자체 구현과 제품 화면 이관
- 음성 재생, lip sync, analytics
