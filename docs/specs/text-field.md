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

## 범위 밖

- controlled value 동기화와 form store
- 검증 시점·검증 규칙·오류 summary announcement
- Text Area, Select, Search Field, 날짜·OTP 같은 형식 전용 입력
- 제품 화면 이관, analytics, persistence

