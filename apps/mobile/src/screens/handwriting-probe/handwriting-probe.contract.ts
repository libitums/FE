// 손글씨 탐침의 컴포넌트 props 계약 (.agent-harness/work/lib-263/spec.md §2.2).
// 구현·JSX를 두지 않는다 — 여기 있는 것은 이음매의 이름과 타입뿐이다.
//
// 획 좌표 어휘는 `lib/handwriting-recognition.ts`가 소유한다(계약 §1.1) — 여기서
// re-export하지 않는다. 한 타입에 import 경로가 둘 생기면 다음 사람이 매번 고른다.

import type { Stroke } from "../../lib/handwriting-recognition";

export type DrawingSurfaceProps = {
  /** 이미 끝난 획들. 이 컴포넌트가 소유하지 않는다 (계약 §2.4). */
  readonly strokes: readonly Stroke[];
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly strokeWidth: number;
  /** 손가락이 떨어져 획이 하나 끝났을 때 한 번 부른다. 빈 획은 올리지 않는다. */
  readonly onStrokeComplete: (stroke: Stroke) => void;
  /** 시스템이 제스처를 가져가 획이 버려졌을 때 한 번 부른다. */
  readonly onStrokeCancel: () => void;
};
