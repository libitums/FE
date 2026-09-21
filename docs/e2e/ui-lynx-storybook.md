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
    `page-indicator.web.bundle`, `bottom-navigator.web.bundle`, `step-indicator.web.bundle`,
    `chat-bubble.web.bundle`, `text-field.web.bundle`, `visual-novel-dialog.web.bundle`,
    `overlay.web.bundle`, `fog.web.bundle`, `tooltip.web.bundle`, `avatar.web.bundle`을 정상
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
22. `Components/Overlay/Sheet Dismissible`에서 gray.950 45% dim이 viewport 전체를 덮고
    sheet는 dim 위에 보이는지 확인한다. dim을 tap하면 `onDismiss`가 1회 기록되고 sheet와
    overlay가 함께 사라져야 한다.
23. `Dialog Modal`에서 dialog가 dim 위에 보이고 dim을 tap해도 닫히거나 Action이 생기지 않는지
    확인한다.
24. `Area`에서 dim이 둥근 media 경계 안에서만 잘리고 중앙 foreground가 dim 위에 보이는지
    확인한다. `Area Blur`는 지원되는 환경에서 4px blur를 더하며, Web에서 blur가 지원되지
    않아도 같은 dim과 입력 차단은 유지되어야 한다.
25. Overlay Controls의 scope, surface, blur, dismiss, phase, motion을 바꿔 Canvas가 갱신되는지
    확인한다. Area 또는 Dialog에서 요청한 Tap은 None으로 보정되어야 한다.
26. `Reduced Motion`에서 이동·확대 없이 100ms linear opacity 전환만 남는지 확인한다.
27. `Components/Chat Bubble/Incoming`, `Outgoing`, `Small`, `Large`를 열어 방향별 정렬과 한쪽
    아래 0px 모서리, S/M/L padding·typography가 구별되는지 확인한다. Bubble 안에는 Message만
    보이고 speaker·delivery 문구가 시각 자손으로 추가되지 않아야 한다.
28. `Failed`에서 Outgoing surface와 Message 색은 유지되는지, Controls를 Incoming으로 바꾸면
    delivery가 Default로 돌아가는지 확인한다. Bubble 자체를 tap해도 Action이 생기지 않아야 한다.
29. `Long Content`를 320px와 390px Canvas에서 확인해 Bubble이 280px보다 넓어지지 않고 긴 URL과
    연속 문자열이 내부에서 줄바꿈되며 내용 전체가 보이는지 확인한다. `Learning Language`의
    contentLanguage와 languageTag Controls도 갱신한다.
30. `Components/Text Field/Default`, `Filled`, `Error`, `Read Only`, `Disabled`를 열어 Label,
    Placeholder/Value, Helper/Error와 배경·테두리·텍스트 상태가 구별되는지 확인한다. Field는
    부모 폭을 채우고 최소 높이 56px, radius 16px, 좌우 padding 16px을 유지해야 한다.
31. Default에서 실제 문자를 입력하고 focus/blur 시 Empty/Filled와 Focused 상태가 바뀌는지
    확인한다. Email, Password, Search, Telephone purpose에서 native keyboard/보안 동작은
    Storybook Web 결과만으로 통과 처리하지 않는다.
32. `Prefix And Suffix`, `Trailing Action`, `Counter`를 열어 고정 텍스트가 value와 분리되고,
    Action hit area가 48 × 48px이며, Counter가 오른쪽에 고정되는지 확인한다. 큰 글자에서도
    Label, Field, Supporting row가 잘리거나 겹치지 않아야 한다.
33. `Components/Visual Novel Dialog/Speech`, `Narration`, `Thought`를 열어 화자 행 조건,
    variant별 본문·이름·테두리 색과 2줄 최소 높이를 확인한다. Avatar on/off에서도 화자 행
    간격과 32px slot이 유지되어야 한다.
34. `Translucent`, `Revealing`, `Auto Advance`에서 0.9 surface, 일부 문자열, Ready에서만 보이는
    Continue indicator를 확인한다. 패널을 tap해도 자체 Action이 생기지 않아야 한다.
35. `Learning Language`, `Right To Left`, `Long Content`에서 전체 문장이 잘리지 않고 RTL 논리
    끝 indicator와 긴 문장의 reflow가 유지되는지 확인한다.
36. `Components/Tooltip/Top`, `Bottom`, `Start`, `End`를 열어 Trigger와 Bubble 사이 8px 간격,
    논리 방향 배치, 12×6px Arrow와 12px 모서리 여백을 확인한다.
37. `Brand`, `No Arrow`, `Aligned Start`, `Learning Language`에서 tone·arrow·alignment·language
    metadata가 독립적으로 반영되고 Bubble이 240px를 넘지 않는지 확인한다.
38. Controls의 visibility를 Hidden/Visible로 바꿔 100ms opacity 전환만 사용하는지, Hidden이
    접근성 트리에서 숨고 Tooltip이 Trigger hit area를 가로채지 않는지 확인한다.
39. `Components/Fog/Bottom`과 `Top`을 열어 80px gradient가 각각 해당 가장자리에서 같은 RGB의
    완전 투명 색으로 사라지는지 확인한다. Controls에서 S는 40px, M은 80px인지 비교한다.
40. `Horizontal RTL`에서 Start가 오른쪽에 놓이고 gradient가 안쪽으로 사라지는지 확인한다.
    layoutDirection을 LTR로 바꾸면 같은 Start가 왼쪽으로 이동해야 한다.
41. `Hidden`은 opacity 0이되 레이아웃을 제거하지 않고, `Full`은 진행 축 전체를 채워야 한다.
    Fog 위의 입력/스크롤 조작이 그대로 통과하며 Fog 자체에 Action이나 focus가 생기지 않아야 한다.
42. `Components/Avatar/All Sizes`에서 XS/SM/MD/LG/XL 지름이 24/32/48/64/96px이고 각
    Placeholder icon과 Initials typography가 Size에 맞게 커지는지 확인한다.
43. `Image`에서 사진이 원형을 가득 채우고 중앙 기준으로 잘리는지 확인한다. 로드 전과
    `Broken Image`에서는 빈 원·깨진 이미지 대신 Initials가 유지되어야 한다.
44. `Initials`, `CJK Initials`, `Placeholder`가 각각 KR, 김, 사람 icon을 표시하고 Avatar를
    tap해도 Action이나 focus 상태가 생기지 않는지 확인한다.

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
- Screen Overlay host의 target 접근성 제외, foreground focus trap·복귀와 safe area
- Area Overlay target control의 접근성 제외
- iOS/Android의 4px backdrop blur와 투명도 줄이기 설정 시 blur off fallback
- Chat Bubble의 실제 speaker+Message 단일 낭독, delivery value, RTL 논리 방향과 학습 언어 발음
- Text Field native keyboard·selection/copy·focus ring, required/invalid 관계와 Label/Error/Counter 낭독
- Visual Novel Dialog의 Typewriter 중 전체 문장 낭독, 학습 언어 발음과 host의 tap/keyboard/auto pause 연결
- Tooltip pointer/focus/press, ESC·뒤로가기, outside tap, Auto timer와 trigger-description 연결
- Tooltip 스크롤·회전·글자 크기 변경 시 재측정 및 native 경계에서의 Flip·Shift
- Fog의 실제 ScrollView offset 기반 visibility 전환과 native RTL 배치
- Avatar 전체 이름 낭독, Decorative 숨김, 이미지 load/error fallback의 native 동작

이 문서의 통과는 native 실기기 검증을 대체하지 않는다.
현재 제품 소비 route가 없으므로 위 native 접근성 항목은 **미검증·이번 납품에는 비차단**
상태다. package/catalog 접근성 게이트는 정적 구조·token·배율 안전 CSS와 ReactLynx UI
test로 닫는다. package를 제품에 채택하는 릴리스에서는 소비 route를 먼저 만들고 실기기
검증을 필수로 완료해야 한다.
