# Card ReactLynx 구현 계약

- 디자인 원본: `libitums/design-system/components/card.md`
- 디자인 revision: `b53b03ac887bd89ab246f8de1c1d4716900d1c4d`
- 구현 기준: `main` `ecab84077cfaee02849af50074236d80912c80a2`
- deviation: ReactLynx에서 언어별 낭독을 직접 지정하는 공개 prop이 없어 `BodyText`의
  `languageTag`는 `data-lang`으로 보존한다. 제품 route 채택 시 host 접근성 동작을 검증한다.

## 목표

한 주제의 정보와 행동을 표면으로 묶는 Card를 `@libitums/ui-lynx`의 compound component로
제공한다. Card는 표면과 영역 배치만 소유하고 구체 콘텐츠와 행동은 기존 컴포넌트를 조합한다.

## 공개 API

- `Card`: M/L padding, LTR/RTL, Static/Interactive Root
- `Card.Media`: 상단 edge-to-edge media slot. 접근성 이름을 생략하면 장식으로 숨김
- `Card.Content`: padding과 영역 간격을 소유하는 content slot
- `Card.Header`: 필수 title, optional overline/trailing. Interactive에서는 이동 화살표 자동 표시
- `Card.Body`: 임의 콘텐츠 slot
- `Card.BodyText`: body.m, fg.neutral-muted 기본 본문과 optional `languageTag`
- `Card.Footer`: primary action과 optional secondary action. Static에서만 사용
- `getCardContract`, `validateCardHeader`: 기본값과 접근성/문자열 계약을 검증하는 순수 함수

Interactive Card는 `accessibilityLabel`, `accessibilityRole`, `bindtap`을 필수로 받고 Card 하나를
focusable link 또는 button으로 노출한다. 하위 텍스트와 장식은 별도 접근성 node로 노출하지 않는다.
Interactive 안의 Footer와 사용자 제공 trailing은 런타임 오류로 거부한다.

## 시각 및 상태

- surface.default, radius.md, shadow.s1, z.default를 사용하고 부모 너비를 채운다.
- M은 16px, L은 24px Content padding을 사용한다.
- Overline↔Title 4px, Header↔Body 12px, Body/Header↔Footer 20px, Footer actions 8px이다.
- Interactive pressed는 gray.100 배경으로 150ms 전환한다. reduced motion에서는 100ms linear다.
- Interactive focus는 white 2px inner ring과 border.strong 2px outer ring을 더한다.
- Media만 overflow hidden으로 상단 모서리를 자르고 Content는 focus ring을 자르지 않는다.
- RTL에서는 이동 화살표를 좌우 반전한다.

## 검증

- unit: 기본값, interactive 접근성 계약, 빈 입력, token/CSS 상태
- UI: Static slot 순서, Interactive tap/단일 접근성 node, nested action 거부, Media 의미
- integration: root/subpath identity, aggregate/component CSS, pack 산출물
- Storybook: Static, Interactive, Large with Media, RTL
- 전체 `pnpm verify`
