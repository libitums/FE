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
6. `Components/Round Button/Default`, `Brand`, `Loading`, `Disabled` 네 story를 차례로 열어
   Default/Brand에는 icon, Loading에는 icon 대신 Spinner, Disabled에는 disabled 표현이
   보이는지 확인한다.
7. Round Button Controls에서 `accessibilityLabel`, icon `info-02`, variant `neutral | brand`,
   size `s | m | l | xl`, disabled, loading을 바꾸고 Canvas가 갱신되는지 확인한다. 빈 label은
   유효한 소비 입력으로 사용하지 않는다.
8. Default 또는 Brand에서 Round Button을 한 번 tap하고 Actions의 `onTap`이 label 인자와 함께
   정확히 1회 추가되는지 확인한다. Loading과 Disabled에서 각각 tap해 새 Action이 0회인지
   확인한다. disabled와 loading을 함께 켠 경우도 0회여야 하고 Spinner는 유지돼야 한다.
9. 브라우저 개발자 도구의 element overlay로 Round Button의 바깥 hit area를 확인한다.
   S/M/L은 각각 48 × 48px이고 그 안의 원형 surface는 28/36/44px, XL은 hit area와 surface가
   모두 56 × 56px여야 한다. 이웃 control과 hit area가 겹치지 않아야 한다.
10. `Components/Progress Header/Default`를 열고 Canvas에 실제 `<lynx-view>`와
   `progress-header.web.bundle` 응답이 있는지 확인한다. Controls의 `title`, `activity`,
   `exitAccessibilityLabel`, `motion`을 각각 바꿔 Canvas에 반영되는지 확인한다.
11. Controls의 `progress`를 `-1`, `0`, `0.1`, `33.5`, `100`, `101`로 차례로 설정한다.
   기대 결과는 입력이 유효 범위로 clamp되고, `0`은 fill이 없으며, 양수는 최소 8px의
   시각적 fill, `33.5`는 약 33.5% fill, `100`은 전체 fill, `101`은 100%와 같은
   결과다. 표시 percentage도 clamp된 값(0–100)과 일치해야 한다.
12. exit를 각 progress 값에서 한 번씩 tap하고 Actions의 `onExit`에 매번 정확히 한
   entry만 기록되는지 확인한다. 표준 motion과 reduced motion을 각각 선택해 전환을
   비교하고, 브라우저 설정만으로 OS reduced-motion 지원까지 입증된 것으로 간주하지
   않는다.
13. Progress Header의 `title`과 `activity`를 긴 문자열과 의사 현지화 문자열(예:
    `[!! 오늘의 아주 긴 학습 진행 제목 ää !!]`)로 바꾼다. 제목이 말줄임 없이 여러 줄로
    늘어나고, 48px exit hit area와 대칭 gutter가 제목을 가리지 않으며 activity와 percentage가
    서로 겹치지 않는지 확인한다. 이 브라우저 확인은 native 최대 텍스트 크기 판정을
    대신하지 않는다.
14. Page Indicator의 Default, First, Last, Single, Empty story에서 현재 항목이 하나만 활성이고,
    빈 page count에서는 전체 indicator가 렌더되지 않는지 확인한다.
15. 브라우저 개발자 도구에서 각 Canvas가 `button.web.bundle`, `back-header.web.bundle`,
    `status-indicator.web.bundle`, `round-button.web.bundle`, `progress-header.web.bundle`,
    `page-indicator.web.bundle`, `bottom-navigator.web.bundle`, `step-indicator.web.bundle`을 정상
    응답으로 가져오는지 확인한다.
16. `Components/Bottom Navigator/Default`에서 4개 icon item, 선택된 주황색 pill, dot badge와
    `99+` count badge가 보이는지 확인한다. 선택되지 않은 enabled item을 tap하면 `onSelect`가
    해당 id로 정확히 1회 기록되고 선택 pill도 누른 item으로 이동해야 한다.
17. `Long Accessibility Label`에서 긴 label이 화면에 보이거나 layout을 밀지 않는지 확인한다.
    `All Items`를 320px로 열어 5개 hit area가 겹치거나 잘리지 않는지 확인한다.
18. `Disabled`의 마지막 item을 tap해 새 Action이 0회인지 확인한다. 이 item의 init data에는
    별도 `disabledReason`이 있고 접근성 이름에는 목적지와 이유가 함께 보존되어야 한다.
19. Bottom Navigator Controls에서 `selectedId`를 바꾸면 선택 pill이 정확히 하나만 이동하는지,
    320/390px viewport에서 좌우 padding과 각 item의 최소 48 × 48px hit area가 유지되는지
    확인한다. 300px 미만 viewport는 지원 범위 밖이다.
20. `Components/Step Indicator/First`, `Middle`, `Last`를 열어 Completed, Current, Upcoming
    원과 왼쪽 단계 상태를 따르는 연결선이 구별되는지 확인한다. Controls에서 `totalSteps`를
    2–5, `currentStep`을 1–`totalSteps` 범위로 바꿨을 때 숫자 원의 개수와 현재 위치가 함께
    갱신되어야 한다. 원을 tap해도 이동이나 Action이 발생하지 않아야 한다.
21. 브라우저 개발자 도구의 element overlay로 Step Indicator 원이 모두 32 × 32px이고 연결선이
    2px 두께로 원의 세로 중앙에 놓이며, 남는 가로 공간을 같은 비율로 나누는지 확인한다.

## native에서만 확인할 항목

- VoiceOver/TalkBack label·traits와 읽기 순서
- Progress Header exit의 VoiceOver/TalkBack 이름·button trait, 충분한 hit area와 focus
  동작
- native 시스템 reduced-motion 설정이 Progress Header의 motion 설정에 매핑되는지
- iOS/Android 시스템 글꼴과 Dynamic Type
- Progress Header를 native 최대 텍스트 크기로 설정했을 때 긴/의사 현지화 title과
  activity가 잘리지 않고, exit와 caption을 포함한 모든 내용에 도달할 수 있는지
- native gesture/pressed-state timing
- safe area 및 `apps/ios` 호스트 통합
- Bottom Navigator 키보드/D-pad 선형 이동과 첫·마지막 item 경계 focus 유지
- Bottom Navigator 선택 상태와 dot/count badge에 대한 VoiceOver/TalkBack 낭독
- Step Indicator의 `N단계 중 M단계` 단일 상태 낭독과 숫자 원·연결선 자손 가림

이 문서의 통과는 native 실기기 검증을 대체하지 않는다.
현재 제품 소비 route가 없으므로 위 native 접근성 항목은 **미검증·이번 납품에는 비차단**
상태다. package/catalog 접근성 게이트는 정적 구조·token·배율 안전 CSS와 ReactLynx UI
test로 닫는다. package를 제품에 채택하는 릴리스에서는 소비 route를 먼저 만들고 실기기
검증을 필수로 완료해야 한다.
