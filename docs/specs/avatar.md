# Avatar 계약

- 시각 원본: `libitums/design-system/components/avatar.md` revision
  `666d2fc6e50a8cc3aaf49aaad7148e94a4abc14e`
- 상태: **고정**
- measurement: 없음. 분석 이벤트, sink, payload를 추가하지 않는다.

## 1. 범위와 수용 기준

`Avatar`는 사용자나 캐릭터를 나타내는 원형 표시 요소다. 이름·상태·배지·행동은 상위 화면이
조합하며 Avatar 자체는 tap이나 focus를 소유하지 않는다.

1. Size는 `xs | sm | md | lg | xl`이고 지름은 각각 24/32/48/64/96px이다.
2. 이미지가 성공하면 `aspectFill` Image를, 로딩·실패 중 이름이 있으면 Initials를, 이미지와
   유효한 Initials가 모두 없으면 Placeholder를 표시한다.
3. 라틴 다단어 이름은 첫 두 단어의 첫 글자, CJK 이름은 첫 글자 하나를 사용한다. 숫자·기호·
   이모지로 시작하면 Initials를 만들지 않는다.
4. 배경은 `gray.100`, Initials는 `fg.brand`, Placeholder `user` padding icon은
   `fg.neutral-subtle`을 사용한다. 테두리와 그림자는 없다.
5. Image·Initials·Placeholder 전환은 위치·크기 animation 없이 같은 자리에서 즉시 일어난다.
6. 기본 접근성 이름은 전체 이름이며 Initials 자체는 숨긴다. 이름이 없으면 이미지 상태를
   설명하고, 옆에 이름이 있는 조합은 `accessibility="hidden"`으로 Avatar 전체를 숨긴다.

## 2. 공개 경계와 테스트

- root와 `@libitums/ui-lynx/avatar`가 같은 구현, 타입, `getAvatarContract`,
  `getAvatarInitials`를 내보낸다.
- aggregate CSS와 `@libitums/ui-lynx/avatar/styles.css`를 제공한다.
- unit은 Initials·fallback·접근성 계약, UI는 native image lifecycle·토큰·비조작 구조,
  integration은 package artifact와 Storybook entry를 검증한다.
- Storybook은 Image, Initials, CJK Initials, Placeholder, Broken Image, All Sizes,
  Decorative를 제공한다.
