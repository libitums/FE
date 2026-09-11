# Progress Header 계약과 변경 증거

- design-system 기준 revision: `87c1b0d2b745429be9b586cef772deb6c8707ab6`
- 대상: `@libitums/ui-lynx` 공개 `ProgressHeader`와 Storybook Lynx 카탈로그
- 상태: 계층 검증 완료. 후속 폴더 구조·`brand.primary`·세로 중심선 변경까지
  자동화된 contract/UI/integration/package 검사와 `pnpm verify`가 PASS했다.
- 실행 조건: 저장소의 `.nvmrc`에 따라 `nvm use`한 Node 22와 잠긴 pnpm을 사용한다.

## 실행 컨텍스트와 읽은 원본

design-system 항목은 `libitums/design-system` 저장소의 revision
`87c1b0d2b745429be9b586cef772deb6c8707ab6` 안에서 읽은 repository-relative 경로다.
FE와 agent harness 항목은 각각 `/Users/sehyun/Documents/GitHub/FE`와 그 아래
`.agent-harness/harness`를 기준으로 읽은 절대 local source context를 함께 적는다.

계약 고정과 구현 판단은 다음 문서를 읽은 결과를 보존한다.

- `libitums/design-system/components/header/progress-header.md`
- `libitums/design-system/components/bottom-navigator.md`
- `libitums/design-system/components/button.md`
- `libitums/design-system/foundations/color.json`
- `libitums/design-system/foundations/spacing.json`
- `libitums/design-system/foundations/typography.json`
- `libitums/design-system/foundations/radius.json`
- `libitums/design-system/foundations/iconography.json`
- `libitums/design-system/foundations/motion.json`
- `libitums/design-system/foundations/layout.json`
- `libitums/design-system/foundations/stroke.json`
- `libitums/design-system/foundations/accessibility.md`
- `libitums/design-system/foundations/international-design.md`
- `libitums/design-system/foundations/writing-tone.md`
- `/Users/sehyun/Documents/GitHub/FE/AGENTS.md`
- `/Users/sehyun/Documents/GitHub/FE/.codex/AGENTS.md`
- `/Users/sehyun/Documents/GitHub/FE/.agent-harness/profile.yaml`
- `/Users/sehyun/Documents/GitHub/FE/.agent-harness/harness/workflows/change.yaml`
- `/Users/sehyun/Documents/GitHub/FE/.agent-harness/harness/packages/orchestrator/orchestrator.md`
- `/Users/sehyun/Documents/GitHub/FE/.agent-harness/harness/profiles/frontend/profile.yaml`
- `/Users/sehyun/Documents/GitHub/FE/.agent-harness/harness/capabilities/documentation/agents/documentation.md`
- `/Users/sehyun/Documents/GitHub/FE/docs/adr/0025-ui-lynx-package-and-storybook-catalog.md`
- `/Users/sehyun/Documents/GitHub/FE/packages/ui-lynx/README.md`
- `/Users/sehyun/Documents/GitHub/FE/apps/storybook-lynx/README.md`
- `/Users/sehyun/Documents/GitHub/FE/docs/e2e/ui-lynx-storybook.md`

design-system 문서는 위 revision의 시각 계약 원본이다. FE는 원본에 없는 semantic token이나
hex를 만들지 않는다. ReactLynx와 Storybook Lynx의 플랫폼 한계는 원본 계약을 없애는 근거가
아니며, 아래 명시적 gap과 native 후속 검증으로 남긴다.

## 채택 계약

`ProgressHeaderProps`는 다음 공개 표면으로 고정한다.

```ts
type ProgressHeaderMotion = "standard" | "reduced";

type ProgressHeaderProps = {
  title: string;
  activity: string;
  progress: number;
  exitAccessibilityLabel: string;
  motion?: ProgressHeaderMotion;
  onExit: () => void;
};
```

- 단일 정규화 결과가 root의 `data-progress`, percentage label, fill width를 구동한다.
  `NaN`, `-Infinity`, 음수, 음수 0은 0이고 100 초과와 `Infinity`는 100이다. 소수는
  반올림하지 않는다.
- 0은 fill node가 없다. 양수는 percentage width와 8px `min-width`를 함께 사용하고,
  100은 전체 track을 채운다. fill 색상은 `brand.primary`다.
- exit는 진행률과 무관하게 항상 활성인 48×48 이름 있는 button이다. tap 하나는 한 handler를
  거쳐 `onExit`를 정확히 한 번 호출한다. disabled/loading 변형은 없다.
- title row는 48px `min-height`와 중앙 정렬을 사용한다. 48px exit를 row의 `top: 0`에
  배치하고 좌우 48px 대칭 gutter를 둬 title과 exit의 세로 중심선, title 중심,
  텍스트 배율을 함께 지킨다.
- title은 sibling `header` leaf다. activity와 정규화 percentage는 하나의 접근성 이름을 가진
  caption leaf이고, 보이는 두 child는 접근성 트리에서 숨긴다.
- `standard`는 design-system의 progress duration/enter easing과 color duration/easing
  token을 쓴다. `reduced`는 progress width transition을 없애고 exit crossfade를
  `d2`/`linear` token으로 줄인다. prop 생략값은 `standard`다.

## 명시적 contract diff

| 이전 | 채택 후 |
|---|---|
| 공개 컴포넌트 3개 | `ProgressHeader`를 더한 4개 |
| root와 기존 세 component subpath | root export와 `./progress-header` runtime/types subpath |
| 통합 stylesheet 하나 | `./styles.css`가 Progress Header CSS를 포함하고 `./progress-header.css`도 공개 |
| Storybook Lynx bundle 3개 | 실제 Rspeedy `progress-header.web.bundle`을 포함한 4개 |
| Progress Header catalog 없음 | Default, Zero, Minimum Fill, Complete, Reduced Motion 5 stories와 Controls/Action |

패키지는 `progress-header/index.js`, `progress-header/index.d.ts`,
`progress-header/ProgressHeader.jsx`, `progress-header/contract.js`,
`progress-header/progress-header.css`를 실제 tarball에
싣는다. Storybook Lynx entry는 workspace source나 DOM mock이 아니라
`@libitums/ui-lynx/progress-header` 공개 subpath를 import한다. Controls의 직렬화 가능한
`title`, `activity`, `progress`, `exitAccessibilityLabel`, `motion`은 `useInitData()`로 가고,
exit는 `STORYBOOK_ACTION`의 `onExit` bridge로 돌아온다.

## test-id와 관찰 채널

| 표면 | test-id / data |
|---|---|
| root | `ui-lynx-progress-header`; `data-progress`, `data-motion` |
| title row / title | `ui-lynx-progress-header-title-row`, `ui-lynx-progress-header-title` |
| exit / 대표 icon | `ui-lynx-progress-header-exit`, `ui-lynx-progress-header-exit-icon` |
| track / 조건부 fill | `ui-lynx-progress-header-track`, `ui-lynx-progress-header-fill` |
| caption / 숨김 visual group | `ui-lynx-progress-header-caption`, `ui-lynx-progress-header-caption-content` |
| activity / percentage | `ui-lynx-progress-header-activity`, `ui-lynx-progress-header-percentage` |

test-id는 테스트 선택자이고 접근성 이름을 대신하지 않는다. normalized progress는 root data와
caption label에서 일치해야 하며, 0 fill의 부재는 조건부 렌더 계약이다.

## 계층 계획과 변경 워크플로 증거

```text
logic scaffold
  → unit red
  → logic green
  → UI red
  → component/CSS green
  → accessibility reloop
  → Storybook integration red
  → catalog/package integration green
  → pack check
  → source/test/build review (PASS)
```

| 계층 | 보존 증거 | 판정 |
|---|---|---|
| logic scaffold | Progress Header 타입, 정규화 함수, 공개 export 골격을 먼저 세움 | 완료 |
| unit | 행동 단언 12개가 red임을 확인한 뒤 전체 unit 44개 green | 완료 |
| UI | 새 단언 13개 red 확인 뒤 전체 UI 25개 green | 완료 |
| accessibility reloop | 최초 재감사 단언 2개 red; 수정 뒤 대상 14/14 green, 최종 UI 25개 green | 완료 |
| integration | 정적 build 자체는 성공했지만 Progress Header integration 6개 fail로 red 확인; 구현 뒤 integration 11개 green | 완료 |
| package | pack check가 허용된 12 files를 검사하고 pass | 완료 |
| state/data | 서버, storage, 제품 route 변경이 없어 N/A | 해당 없음 |
| 전체 repository verify | 1차 exit 0 PASS; lint warning cleanup 뒤 최종 재실행도 exit 0 | **PASS** |
| E2E | `docs/e2e/ui-lynx-storybook.md`의 최종 localhost Storybook 수동 절차 | **PASS** |

자동 검증은 각 단계에서 다음 형태로 Node 22 조건을 먼저 적용한다. 실제 red/green 수치는 위
표가 이 변경의 보존 증거다.

```sh
nvm use
pnpm --filter @libitums/ui-lynx test:unit
pnpm --filter @libitums/ui-lynx test:ui
pnpm --filter @libitums/storybook-lynx test
pnpm --filter @libitums/ui-lynx pack:check
pnpm storybook:lynx:build
```

1차 전체 repository gate `pnpm verify`는 exit 0으로 PASS했다. 보존된 세부 증거는 다음과
같다.

- format: 180 files PASS
- typecheck: UI package, mobile, Storybook Lynx PASS
- lint, token check, cycle check: PASS
- tests: mobile 83, Storybook integration 11, report 49와 UI package tests PASS
- builds: package와 앱 build PASS
- performance gate: runtime report가 필요하지 않은 변경으로 PASS

후속 리뷰는 Computer Use와 스크린샷 증거를 사용하지 않는다. 구조, token, 정렬,
상호작용은 source contract, ReactLynx UI test, Storybook integration test, package build/pack
결과로 판정한다. native 기기의 접근성 동작과 host OS reduced-motion 매핑은 이 결과로
닫지 않으며 아래 known gap으로 유지한다.

## 접근성 감사와 남은 gap

첫 감사에서는 major 2건이 발견됐다. 작은 title row를 고정 높이로 읽은 배율 문제와,
접근성 label을 가진 caption outer와 `accessibility-elements-hidden`을 같은 node에 둬 그
label 자체가 숨겨질 위험이 수정 대상이었다. title row를 `min-height`와 absolute exit 및
대칭 gutter로 바꾸고, caption outer에는 label을 유지하되 숨김 속성은 visual child group으로
옮긴 뒤 재감사는 **Critical 0, Major 0**이다.

다음은 알려진 미해결 gap이며 통과로 과장하지 않는다.

- `gray.300` track과 `background.secondary`의 대비는 1.078:1이다. 진행 표시의 3:1에 못
  미치는 known minor design-system gap이며 임의 token/hex로 우회하지 않는다.
- ReactLynx의 `:focus`는 best-effort fallback이다. Storybook과 정적 CSS 검사는 native
  focus 표시를 증명하지 않는다.
- ReactLynx iOS에서 `accessibility-value` 채널이 도달하지 않는 기존 한계 때문에 activity와
  percentage를 합친 label을 쓴다. native VoiceOver/TalkBack 낭독은 별도 실기 대상이다.
- `motion`은 명시적 union이지 host OS 설정 감지가 아니다. 소비 host가 reduced-motion
  설정을 prop에 매핑해야 하며 현재 제품 route가 없어 아직 검증하지 않았다.
- 긴/의사 현지화 title/activity와 native 최대 텍스트 크기의 레이아웃·도달 가능성은
  `docs/e2e/ui-lynx-storybook.md` 절차와 제품 채택 시 native 실기로 닫는다.

## 변경 통제

이 작업은 제품 상태, 서버/API, storage, navigation route를 추가하지 않는다. 자동 commit과
push도 수행하지 않는다. 문서·구현·테스트 증거는 작업 트리에 남겨 검토자가 명시적으로 다음
Git 작업을 선택하게 한다.
