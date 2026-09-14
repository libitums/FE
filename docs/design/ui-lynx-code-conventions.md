# UI Lynx 파일 컨벤션 — 시각 비변경 계약

- 대상: `packages/ui-lynx`의 contract/logic/test 파일명과 구조 통일
- 비교 기준: `main` `a8316a4ba0748b95aae40e10a37a562486176b66`
- 디자인 기준: harness `profiles/frontend/knowledge/DESIGN.md`
- deviation: 없음

이 작업은 파일 경계와 이름을 통일하는 내부 정리다. 같은 public props와 상태를 주면 패키지
소비자가 받는 ReactLynx element tree, 스타일, 이벤트와 접근성 결과가 기준 커밋과 같아야 한다.
새 토큰, 새 스타일, 새 시각 상태는 각각 0건이다.

## 1. 최신 정본과 고정 대상

시각·상태 계약의 원본은 별도 `libitums/design-system` 저장소의 대응
`components/**/*.md`이고, 이 패키지는 `@libitums/design-tokens`와 `@libitums/icons`
`0.2.0`을 소비한다. 이 저장소에서 실제 구현과 배포 경계를 확인할 정본은 다음과 같다.

- `packages/ui-lynx/README.md`: 여덟 컴포넌트와 공개 subpath·상태 계약
- `packages/ui-lynx/src/{button,back-header,status-indicator,round-button,progress-header,page-indicator,bottom-navigator,step-indicator}/`
  의 PascalCase 컴포넌트 `.tsx`: 실제 JSX, props 소비, state, events, testids
- 위 여덟 디렉터리의 `<directory>.css`: 컴포넌트별 시각 선언
- `packages/ui-lynx/src/styles.css`: 토큰 CSS와 여덟 전용 CSS를 묶는 aggregate stylesheet
- `packages/ui-lynx/src/index.ts`와 각 컴포넌트의 `index.ts`: root/subpath runtime 및 type export
- `packages/ui-lynx/package.json`: 공개 exports, style subpath, `sideEffects`, peer/dependency 경계
- `packages/ui-lynx/scripts/copy-styles.mjs`와 `check-pack.mjs`: CSS 복사와 배포 산출물 계약
- `packages/ui-lynx/src/index.integration.test.ts`와 `styles.unit.test.ts`: root/subpath identity,
  산출물, aggregate CSS와 핵심 스타일 계약
- `packages/ui-lynx/docs/component-file-conventions.md`: 이번 이름·병합 작업이 따르는 파일 규칙

contract와 logic의 파일명·분리는 디자인 정본이 아니다. 이를 `<directory>.contract.ts` 하나로
합치고 unit/UI test 파일명을 통일해도 위 시각·런타임 정본은 바뀌지 않는다.

## 2. 시각·상호작용 비변경 계약

다음은 기준 커밋과 동일하게 고정한다.

| 축 | 비변경 조건 |
|---|---|
| 토큰 | 토큰 패키지 버전, CSS 변수 이름·사용처, TS 아이콘 색 상수와 raw-value 예외를 바꾸지 않는다. |
| 스타일 | 여덟 전용 CSS와 aggregate `styles.css`의 import, selector, property, value, cascade와 `sideEffects`를 바꾸지 않는다. CSS 의미 diff는 0이다. |
| JSX·element tree | 여덟 컴포넌트의 element 종류, 조건부 렌더, 자식·형제 순서, class 적용 대상과 장식 subtree를 바꾸지 않는다. |
| public props | 이름, 타입, optional/default 규칙과 유효 입력 범위를 바꾸지 않는다. root와 subpath는 같은 runtime value와 type을 계속 내보낸다. |
| state | default, pressed/active, focus, selected/current/completed/upcoming, disabled, loading과 조합 상태의 파생·표현을 바꾸지 않는다. |
| events | `bindtap`, `catchtap`, `bindselect`, `onExit` 등 기존 callback의 연결, 차단 조건과 호출 횟수를 바꾸지 않는다. |
| testids·data | `data-testid`, 상태 `data-*`, focus id/index와 next-focus 연결을 추가·삭제·이름 변경하지 않는다. |
| 접근성 | label, traits, element/hidden/focusable 속성, 장식 자손 숨김과 읽기 순서를 바꾸지 않는다. |
| 반응형·대비·모션 | 크기·최소 터치 영역, Dynamic Type, 색 대비, focus ring, transition 및 reduced motion 결과를 바꾸지 않는다. |

컴포넌트 `.tsx`에서 허용되는 변경은 합쳐진 contract 파일을 가리키는 **import source 한정**이다.
import 뒤의 컴포넌트 함수와 JSX는 byte-for-byte 동일해야 한다. 각 `index.ts`에서는 내부
contract/logic 재수출 source만 바꿀 수 있고, 공개 export 이름·종류·identity는 동일해야 한다.

## 3. 적용 금지

- 여덟 컴포넌트 `.css`, `src/styles.css`, 디자인 토큰·아이콘 dependency와 asset 변경
- selector/class, CSS property/value, token, raw 색·치수, typography, radius, shadow,
  motion 또는 inline style 추가·교체·삭제
- JSX, element tree, className, props, state 계산 결과, events, testids/data/focus/accessibility 변경
- `package.json`의 public component/style subpath, `sideEffects`, ReactLynx peer 범위 변경
- contract/logic 병합을 이유로 public export를 삭제·개명하거나 새 runtime API를 추가하는 일
- 테스트 파일 rename/merge 중 기존 렌더·상태·이벤트·스타일 assertion을 삭제하거나 기대값을
  바꾸어 회귀를 통과시키는 일

## 4. 구현 후 객관적 검증

아래의 기준 커밋은 모두 `a8316a4ba0748b95aae40e10a37a562486176b66`이다.

1. **changed-files 분류**

   `git diff --name-status --find-renames=100% <base>`로 rename과 내용 수정을 분리한다.
   변경은 contract/logic/unit/UI test와 그 내부 경로를 잇는 `index.ts`·컴포넌트 import,
   packaging 검사·규약 문서에 한정한다. 전용 CSS, `src/styles.css`, icon asset은 0건이어야 한다.

2. **CSS·토큰 의미 diff 0**

   ```sh
   git diff --exit-code <base> -- 'packages/ui-lynx/src/**/*.css'
   git diff --exit-code <base> -- pnpm-lock.yaml packages/ui-lynx/package.json
   ```

   첫 명령은 aggregate와 전용 CSS의 byte diff 0을 요구한다. 두 번째 명령은 토큰/icon 버전,
   public style/runtime exports와 `sideEffects`가 그대로임을 보수적으로 보장한다. packaging
   검사 갱신이 필요해도 `package.json`은 바꾸지 않는다.

3. **JSX 본문·runtime import 고정**

   여덟 구현 `.tsx`의 `git diff -U0 <base>`에서 허용되는 hunk는 `./contract`·`./logic`을
   `<directory>.contract`로 바꾸는 import source뿐이다. 첫 `export function` 이후 diff는
   0이어야 한다. `src/index.ts`와 각 `index.ts`는 내부 source 변경 외 공개 export symbol의
   추가·삭제가 0이어야 한다.

   `pnpm --filter @libitums/ui-lynx test:integration`으로 root/subpath runtime identity,
   package export target, compiled JSX와 CSS 산출물의 존재를 확인한다. 소비자 import
   `@libitums/ui-lynx`, 여덟 component subpath와 공개 style subpath는 모두 기준과 동일해야 한다.

4. **rename/merge 무손실 확인**

   순수 rename은 `--find-renames=100%`에서 `R100`이어야 한다. contract와 logic을 합친 파일은
   기준의 public type·constant·function export를 모두 포함해야 하고, 새 unit test에는 기존 두
   파일의 test case와 assertion이 빠짐없이 남아야 한다. `pnpm --filter @libitums/ui-lynx
   test:unit`과 `typecheck`를 실행해 파생 state와 public type 계약이 동일함을 확인한다.

5. **render/state/event/testid 고정**

   `pnpm --filter @libitums/ui-lynx test:ui`를 기존 assertion 변경 없이 통과시킨다. test 파일명
   변경에 필요한 import만 고치고, assertion 삭제·기대값 변경은 0건이어야 한다. 이 결과로
   element, class, props/state data, events, testids, focus와 접근성 속성을 고정한다.

6. **전체 패키지 판정**

   `pnpm --filter @libitums/ui-lynx test`와 `pnpm --filter @libitums/ui-lynx build`를 통과시킨다.
   CSS/JSX 본문에 diff가 없으므로 별도 시각 baseline 갱신은 하지 않는다. 2~3에서 의미 diff가
   하나라도 생기면 이 작업의 디자인 계약 위반이며, 시각 확인으로 승인할 수 없다.

## 5. 디자인 고정 요약

고정 대상은 Button, BackHeader, StatusIndicator, RoundButton, ProgressHeader,
PageIndicator, BottomNavigator, StepIndicator 여덟 컴포넌트다. 새 토큰 0건, 변경 토큰 0건,
새 스타일 0건, CSS 의미 diff 0, JSX 본문 diff 0, 새 시각 상태 0건, deviation 0건으로 고정한다.
파일명이 바뀌어도 public runtime/style import와 사용자에게 보이는 결과는 기준 커밋 그대로다.
