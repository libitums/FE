# UI Lynx Storybook 수동 확인

## 준비

```sh
nvm use
pnpm install --frozen-lockfile
pnpm storybook:lynx
```

Storybook이 출력한 localhost URL을 브라우저에서 연다.

Canvas의 `<lynx-view>`는 Lynx Web의 시각·tap 확인 표면이다. 내부 control은 브라우저 DOM
접근성 트리에서 일반 텍스트로 보일 수 있으므로 이 흐름을 웹 키보드·스크린리더 접근성
검증으로 세지 않는다.

## 확인 흐름

1. `Components/Button/Default`를 열고 Canvas 안에 `lynx-view` 요소가 있으며 내부 Lynx
   버튼이 보이는지 확인한다.
2. Controls에서 variant, size, width, disabled, loading, label을 바꾸고 Canvas가 새 값으로
   갱신되는지 확인한다.
3. 활성 Button을 tap해 Actions의 `onTap`에 label이 기록되는지 확인한다. disabled/loading
   상태에서는 기록되지 않아야 한다.
4. `Components/Back Header/Default`에서 title, subtitle, showInfo를 바꾸고 back/info를 tap해
   `onBack`과 `onInfo` Actions를 확인한다.
5. `Components/Status Indicator`의 네 story를 열고 completed, in-progress, needs-retry,
   locked가 서로 구별되는지 확인한다.
6. 브라우저 개발자 도구에서 각 Canvas가 `button.web.bundle`, `back-header.web.bundle`,
   `status-indicator.web.bundle`을 정상 응답으로 가져오는지 확인한다.

## native에서만 확인할 항목

- VoiceOver/TalkBack label·traits와 읽기 순서
- iOS/Android 시스템 글꼴과 Dynamic Type
- native gesture/pressed-state timing
- safe area 및 `apps/ios` 호스트 통합

이 문서의 통과는 native 실기기 검증을 대체하지 않는다.
현재 제품 소비 route가 없으므로 위 native 접근성 항목은 **미검증·이번 납품에는 비차단**
상태다. package/catalog 접근성 게이트는 정적 구조·token·배율 안전 CSS와 ReactLynx UI
test로 닫는다. package를 제품에 채택하는 릴리스에서는 소비 route를 먼저 만들고 실기기
검증을 필수로 완료해야 한다.
