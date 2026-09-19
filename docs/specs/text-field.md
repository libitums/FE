# TextField 계약

- 시각·상태 원본: `libitums/design-system/components/text-field.md` revision
  `1ba6b55103663c407f073f9ede3a2e700bf9b722`
- 기반 결정: ADR-0025 D0–D6와 2026-09-15 TextField 확장
- 상태: **고정**. 공개 union, 기본값, test-id, story 이름과 package subpath는 이 계약을 따른다.
- measurement: 없음. 분석 이벤트나 payload를 추가하지 않는다.

## 범위와 불변식

`@libitums/ui-lynx`에 한 줄 일반 텍스트용 ReactLynx `TextField`를 추가한다. native `<input>`을
사용하고 Label row, Leading, Trailing, Supporting row, Counter를 독립적으로 조합한다.

1. `purpose`는 `text | email | password | search | url | telephone`, `availability`는
   `enabled | read-only | disabled`의 닫힌 union이다. 기본값은 각각 `text`, `enabled`다.
2. Lynx native type은 email/password/telephone을 `email/password/tel`로, search는
   `text + confirm-type=search`로 연결한다. 현재 native API에 URL 전용 type이 없어 URL은
   `text`로 유지한다.
3. uncontrolled native input 계약을 따라 초기값은 `defaultValue`, 이후 값은
   `bindinput(value)`로 전달한다. focus/blur/confirm callback도 native event의 value만 전달한다.
4. Content, Interaction, Validation, Availability는 독립적으로 파생하고 시각 우선순위는
   Disabled → ReadOnly → Error → Focused → Filled/Empty다.
5. Error는 `supporting: { kind: "error", message }`로만 만들며 Helper와 동시에 렌더하지 않는다.
   Label 또는 별도 `accessibilityLabel` 중 하나가 반드시 필요하고 Placeholder는 이름이 아니다.
6. Counter는 `{ maxLength }`로 켜며 positive integer만 허용한다. native `maxlength`와 보이는
   `현재/최대`, 접근성 설명 `최대자 중 현재자 입력`을 같은 값에서 파생한다.
7. Leading은 Icon 또는 Prefix 하나, Trailing은 Icon, Suffix, Action 중 하나만 허용한다.
   Prefix/Suffix는 표시용이며 입력 값에 합치지 않는다. 빈 slot은 렌더하지 않는다.
8. Trailing Action은 input 다음의 별도 button node, 48 × 48px hit area와 독립 접근성 이름을
   갖는다. Disabled에서는 handler를 연결하지 않는다.
9. Field는 부모 폭을 채우고 56px 최소 높이, 16px 가로 padding, `radius.lg`, 1px border를 쓴다.
   높이를 고정하지 않아 글자 크기 확대 시 내용에 맞춰 늘어날 수 있다.
10. Error, helper, qualifier와 counter 의미는 input의 접근성 이름에 합쳐 제공하고 시각 text는
    중복 접근성 node에서 숨긴다. ReactLynx 0.125 native API에는 HTML의 `aria-invalid`,
    `aria-describedby`, `required`, `autocomplete`, `inputmode`에 해당하는 공개 속성이 없으므로
    제품 route 채택 시 host 연결과 VoiceOver/TalkBack 실청으로 남긴다.

    > ⟨2026-09-17, LIB-261⟩ **이 항목이 처음 실물이 됐다.** 진입 흐름의 코드 검증 칸이
    > `supporting: { kind: "error" }`를 제품에서 처음 넘긴다. **그래서 이 설계의 대가도 처음
    > 실물이 된다 — 오류 문구는 입력 칸의 이름에 합성되고 보이는 `<text>`는 가려지므로 그 칸에
    > 포커스해야 들린다.** 입력 직후의 사용자는 이미 그 칸에 있어 닿지만 포커스를 옮긴 뒤에는
    > 안 들린다. **결함이 아니라 이 설계가 고른 대가**이고, 관측 자리는
    > [진입 흐름 e2e](../e2e/entry-flow.md)의 **K2**(오류 문구가 서는가)와 **K5**(미완성의 이유가
    > 그 이름 채널로 전달되는가)다.

## 공개 package 계약

`text-field/`은 `TextField.tsx`, `text-field.contract.ts`, `text-field.css`, PascalCase unit/UI
test와 `index.ts`를 함께 소유한다. `@libitums/ui-lynx/text-field`와
`@libitums/ui-lynx/text-field/styles.css`를 독립 공개하고 root barrel과 aggregate CSS도 같은
구현을 재수출한다. pack은 type-erased ESM, declaration, CSS와 authored JSX를 검증한다.

## Storybook과 검증

Storybook은 Default, Filled, Error, ReadOnly, Disabled, Prefix And Suffix, Trailing Action,
Counter를 제공한다. Controls는 JSON 직렬화 가능한 값만 넘기며 icon SVG와 callback은 Lynx
runtime 안에서 조립한다.

- unit: 기본값, 상태 우선순위, native purpose 매핑, 접근성 설명, counter와 CSS token
- UI: native 속성, optional slot, error, counter, 독립 action과 disabled tap 차단
- integration: root/subpath identity, export map, dist/tarball, authored JSX, Storybook bundle/story
- manual: Empty/Filled/Error/ReadOnly/Disabled, 입력/focus, affix, action, counter, 큰 글자
- native deferred: 키보드 종류, selection/copy, focus ring, VoiceOver/TalkBack, required/invalid 연결

⟨2026-09-17, LIB-261⟩ **위 `native deferred` 줄의 「제품 route 채택 시」 조건이 발동했다.**
`apps/mobile`의 진입 흐름이 이 컴포넌트를 제품에서 처음 소비한다(로그인 전화번호 칸 · 코드 검증 칸).
**항목을 하나도 지우지 않는다 — 미확인은 실기가 답하기 전까지 미확인이다.** 바뀐 것은 **판정 자리가
이름을 얻었다**는 것뿐이고, 그 자리는 [진입 흐름 e2e](../e2e/entry-flow.md)다.

| `native deferred`의 항목 | 판정 자리 |
|---|---|
| 키보드 종류 | **K1** |
| required/invalid 연결 — **오류 채널** | **K2**(오류 문구가 서는가) · **K5**(미완성의 이유가 이름으로 전달되는가) |
| focus ring | **V1**의 기록 절 — 이 스택에서 `:focus`가 실제로 서는지는 미확인이다 |
| VoiceOver/TalkBack | **V1**(입력 칸 위에서 들리는 것 전부) · **V5** |
| selection/copy | **판정 자리가 없다** — 이 소비가 그 축을 열지 않는다. 미확인인 채로 남는다 |

**이 줄에 없던 축이 하나 함께 열렸다** — **소프트 키보드가 화면을 가리는가**(**K3**)다. `native deferred`의
「키보드 종류」는 *어떤 키보드가 뜨는가*이고 이 축은 *뜬 키보드가 무엇을 덮는가*라 서로 다른 물음이다.
회피 프롭이 `@lynx-js/types`의 `InputProps`에 없어 이 컴포넌트가 넘기지 못하므로 **결정이 아직 없고**,
그 자리는 [ADR 보류 표](../adr/README.md)의 「소프트 키보드가 화면을 가리는 축」 행이 진다.

## 범위 밖

- controlled value 동기화와 form store
- 검증 시점·검증 규칙·오류 summary announcement
- Text Area, Select, Search Field, 날짜·OTP 같은 형식 전용 입력
- 제품 화면 이관, analytics, persistence
