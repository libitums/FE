# 컴포넌트 파일 명명 규칙

`packages/ui-lynx/src`의 공개 컴포넌트는 구현, 계약, 스타일, 테스트와 공개 진입점을 한
디렉터리에 둔다. 새 컴포넌트와 기존 컴포넌트를 정리할 때 다음 규칙을 적용한다.

| 역할 | 명명 규칙 | PageIndicator 예시 |
| --- | --- | --- |
| 컴포넌트 디렉터리 | kebab-case | `page-indicator/` |
| 컴포넌트 구현 | PascalCase + `.tsx` | `PageIndicator.tsx` |
| 공개 타입과 순수 계약 로직 | 디렉터리명 + `.contract.ts` | `page-indicator.contract.ts` |
| 전용 스타일 | 디렉터리명 + `.css` | `page-indicator.css` |
| 단위 테스트 | PascalCase + `.unit.test.ts` | `PageIndicator.unit.test.ts` |
| UI 테스트 | PascalCase + `.ui.test.tsx` | `PageIndicator.ui.test.tsx` |
| 공개 배럴 | `index.ts` | `index.ts` |

contract 파일은 props·상태·파생 모델 타입과 그 계약을 계산하는 순수 함수를 함께 소유한다.
컴포넌트 전용 계산만 있는 경우 일반 이름의 `contract.ts`나 별도 `logic.ts`로 나누지 않는다.
`index.ts`는 컴포넌트, 공개 타입과 공개 순수 함수를 재수출하고 구현을 중복하지 않는다.

```text
src/page-indicator/
├── PageIndicator.tsx
├── PageIndicator.ui.test.tsx
├── PageIndicator.unit.test.ts
├── index.ts
├── page-indicator.contract.ts
└── page-indicator.css
```

`RoundButton`도 같은 구조를 사용한다. 아직 `contract.ts`처럼 이전 이름을 쓰는 컴포넌트는
해당 컴포넌트를 수정하는 작업에서 이 규칙으로 이관한다. 이름 변경 시 barrel import,
package 산출물 검사와 관련 테스트의 경로 기대값도 함께 갱신한다.
