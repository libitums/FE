# 컴포넌트 파일 명명 규칙

`packages/ui-lynx/src`의 공개 컴포넌트는 구현, 계약, 스타일, 테스트와 공개 진입점을 한
디렉터리에 둔다. 새 컴포넌트와 기존 컴포넌트를 정리할 때 다음 규칙을 적용한다.

| 역할                       | 명명 규칙                    | PageIndicator 예시           |
| -------------------------- | ---------------------------- | ---------------------------- |
| 컴포넌트 디렉터리          | kebab-case                   | `page-indicator/`            |
| 컴포넌트 구현              | PascalCase + `.tsx`          | `PageIndicator.tsx`          |
| 공개 타입과 순수 계약 로직 | 디렉터리명 + `.contract.ts`  | `page-indicator.contract.ts` |
| 전용 스타일                | 디렉터리명 + `.css`          | `page-indicator.css`         |
| 단위 테스트                | PascalCase + `.unit.test.ts` | `PageIndicator.unit.test.ts` |
| UI 테스트                  | PascalCase + `.ui.test.tsx`  | `PageIndicator.ui.test.tsx`  |
| 공개 배럴                  | `index.ts`                   | `index.ts`                   |

contract 파일은 props·상태·파생 모델 타입과 그 계약을 계산하는 순수 함수를 함께 소유한다.
순수 runtime export가 없어도 타입은 같은 `<component>.contract.ts`에 둔다. 일반 이름의
`contract.ts`나 별도 `logic.ts`는 허용하지 않는다. `index.ts`는 컴포넌트, 공개 타입과
공개 순수 함수를 이 canonical contract에서 재수출하고 구현을 중복하지 않는다.

```text
src/page-indicator/
├── PageIndicator.tsx
├── PageIndicator.ui.test.tsx
├── PageIndicator.unit.test.ts
├── index.ts
├── page-indicator.contract.ts
└── page-indicator.css
```

현재 공개 컴포넌트 열여섯 개(`Button`, `BackHeader`, `StatusIndicator`, `RoundButton`,
`ProgressHeader`, `PageIndicator`, `BottomNavigator`, `StepIndicator`, `BottomSheet`,
`Card`, `CompactNumericInput`, `ChatBubble`, `TextField`, `AnswerLabel`, `Overlay`, `Tooltip`)가 모두 이 구조를
사용한다. 순수 runtime export가 없는 `BackHeader`만 빈 unit test를 두지 않고, 나머지
열다섯 개는 PascalCase unit/UI test 쌍을 둔다.

`scripts/component-file-conventions.mjs`의 순수 checker는 컴포넌트 디렉터리와 파일 목록을
받아 canonical 구현·contract·CSS·barrel·test 이름을 검사하고, generic `contract.ts`,
`logic.ts`, kebab-case component test와 `index.ui.test.tsx`를 거부한다. 현재 열여섯
디렉터리의 멤버십은 `component-file-conventions.unit.test.mjs`가 repository tree에서
검증한다. `scripts/check-pack.mjs`는 배포 tarball에 열여섯 canonical
`<component>.contract.{js,d.ts}`와 CSS·JSX·barrel이 있고 개발 입력이 없는지
검사하며 generic `contract.*`/`logic.*` 산출물을 직접 거부한다. package integration
test도 같은 부재 계약을 열여섯 디렉터리 전체에서 검증한다.
