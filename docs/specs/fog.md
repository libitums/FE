# Fog 계약

- 시각 원본: `libitums/design-system/components/fog.md` 최신 `main` revision
  `456a121fdfee60dfceaba2ac8f9e989a1275c066`
- 상태: **고정**
- measurement: 없음. 분석 이벤트, sink, payload를 추가하지 않는다.

## 1. 범위와 수용 기준

`Fog`는 스크롤 viewport 가장자리에서 콘텐츠가 이어짐을 알리는 장식 gradient layer다.

1. `direction`은 `top | bottom | start | end`, `size`는 `s | m | full`이다. S/M은 진행 축에서
   각각 40/80px, Full은 해당 축 전체를 채운다.
2. 색은 `white`, `surface-default`, `surface-basement`, `surface-floating`, `dark`다. 투명 stop은
   generic `transparent`가 아니라 같은 RGB의 alpha 0을 사용한다.
3. Start/End는 `layoutDirection="ltr" | "rtl"`에 따라 실제 left/right 배치와 gradient 방향을
   함께 뒤집는다.
4. `visibility="visible" | "hidden"`은 opacity만 바꾸고 color duration/easing token으로
   전환한다. Scroll offset과 표시 판단은 host 책임이다.
5. Fog는 pointer event를 통과시키고 focusable하지 않으며 접근성 트리에서 숨긴다.

## 2. 공개 경계

- root와 `@libitums/ui-lynx/fog`가 같은 `Fog`, 타입, `getFogContract`를 내보낸다.
- CSS는 aggregate styles와 `@libitums/ui-lynx/fog/styles.css`에서 제공한다.
- package build/pack은 authored ReactLynx JSX, declaration, canonical contract, CSS를 보존한다.

## 3. Storybook과 테스트

Storybook title은 `Components/Fog`이며 Bottom, Top, Horizontal RTL, Hidden, Full을 제공한다.
init data는 direction, size, color, visibility, layoutDirection의 JSON 값만 전달한다.

- unit: 기본값, class, 색·방향·크기 계약을 검사한다.
- ui: 장식/비조작 속성, 동일 RGB gradient, 40/80/full 크기, opacity transition과 RTL 실제
  left/right 배치를 검사한다.
- integration: root/subpath/CSS export, tarball artifact, Rspeedy entry와 Storybook catalog를 검사한다.
- native E2E: 제품 ScrollView가 채택될 때 offset 기반 visibility와 실제 RTL을 검증한다.
