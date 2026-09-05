// 여정 맵 화면의 순수 로직 + 고정 데이터 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// LIB-222 (logic): 계약(.agent-harness/work/lib-222/spec.md §1.3~§1.5)이 고정한
// 판정·합성·전이 동작을 구현한다. DOM·컴포넌트·저장소를 만지지 않는다 (순수 함수뿐).
//
// UI를 import하지 않는다 — 화면 폴더에 있지만 화면 컴포넌트를 참조하지 않는
// 순수 모듈이다 (계약 §1.2 「왜 순수 로직이 lib/가 아니라 화면 폴더인가」).

// LIB-236 계약 §1.3(a): 학습형 어휘는 lib/learning-form.ts가 갖는다. screens/ → lib/
// 방향이므로 의존 방향에 어긋나지 않는다 (ADR-0004 D3 · code.md 「import」).
import type { LearningForm } from "../../lib/learning-form";

// ---------------------------------------------------------------- 도메인 타입 (계약 §1.3)

export type JourneyStepId = "greeting" | "introduction" | "ordering" | "appointment" | "directions";

export type JourneyStepStatus = "done" | "current" | "locked";

export type JourneyStep = {
  readonly id: JourneyStepId;
  readonly title: string;
  readonly description: string;
};

// ---------------------------------------------------------------- 고정 데이터 (계약 §1.4)
// 계약이 값까지 고정했다. 진행의 진실의 출처는 이제 App의 상태이고, 이 상수는 그
// **씨앗**이다 — 값(2)은 그대로이고 이름만 역할이 좁아진 것을 반영한다
// (LIB-223 계약 §1.4(a)·§4.0 3번). 옛 이름(completedStepCount)을 남기지 않는다:
// 남기면 다른 모듈이 그것을 읽고 낡은 진행을 보면서도 통과한다.

export const journeySteps: readonly JourneyStep[] = [
  { id: "greeting", title: "첫 인사", description: "카페에서 처음 인사를 나눈다" },
  { id: "introduction", title: "이름 묻기", description: "상대의 이름을 묻고 자기를 소개한다" },
  { id: "ordering", title: "주문하기", description: "카페에서 마실 것을 주문한다" },
  { id: "appointment", title: "약속 잡기", description: "다음에 만날 날짜와 시간을 정한다" },
  { id: "directions", title: "길 묻기", description: "약속 장소까지 가는 길을 묻는다" },
];

export const initialCompletedStepCount = 2;

// ---------------------------------------------------------------- 시트 상태 전이 (계약 §1.5)

export type StepSheetState = {
  readonly openStepId: JourneyStepId | null;
};

export type StepSheetAction =
  | { readonly type: "openStep"; readonly stepId: JourneyStepId }
  | { readonly type: "closeSheet" };

export const initialStepSheetState: StepSheetState = { openStepId: null };

// ---------------------------------------------------------------- 순수 함수 (계약 §1.5·§1.5.1)

// 판정 규칙 (계약 §1.5, 그대로):
//   index < completedCount   → "done"
//   index === completedCount → "current"
//   그 밖                     → "locked"
// 방어 분기를 두지 않는다 — navigation.ts의 currentScreen과 같은 판단으로, 범위 밖
// 입력에도 위 세 줄이 그대로 적용된다.
export function stepStatusAt(index: number, completedCount: number): JourneyStepStatus {
  if (index < completedCount) {
    return "done";
  }
  if (index === completedCount) {
    return "current";
  }
  return "locked";
}

// 접미사 표 (계약 §1.5). export하지 않는 모듈 내부 상수 — 구분자는 쉼표 + 공백이다
// (ADR-0016 D3이 고른 것과 같은 부호).
const stepStatusSuffix: Record<JourneyStepStatus, string> = {
  done: "완료됨",
  current: "현재 스텝",
  locked: "잠김",
};

export function stepAccessibilityLabel(title: string, status: JourneyStepStatus): string {
  return `${title}, ${stepStatusSuffix[status]}`;
}

export function findStep(
  steps: readonly JourneyStep[],
  id: JourneyStepId,
): JourneyStep | undefined {
  return steps.find((step) => step.id === id);
}

// 판정 표 (계약 §1.5.1, 재고정). "이 상태가 시트를 여는가"의 정본 — export하지 않는
// 모듈 내부 상수(stepStatusSuffix와 같은 형태). 부등호 비교가 아니라 표를 쓰는 이유는
// 상태가 하나 늘면 tsc가 그 상태의 답을 쓰라고 강제하기 때문이다.
const stepOpensSheet: Record<JourneyStepStatus, boolean> = {
  done: true,
  current: true,
  locked: false,
};

// 판정만 한다 — 아무것도 막지 않는다. 차단은 JourneyStepNode의 bindtap 핸들러가 진다
// (계약 §1.7.2).
export function canOpenStep(status: JourneyStepStatus): boolean {
  return stepOpensSheet[status];
}

// 변화 없으면 같은 참조를 돌려준다 — navReducer의 switchTab·enterApp과 같은 규약
// (계약 §1.5 전이표).
export function stepSheetReducer(state: StepSheetState, action: StepSheetAction): StepSheetState {
  switch (action.type) {
    case "openStep": {
      if (state.openStepId === action.stepId) {
        return state;
      }
      return { openStepId: action.stepId };
    }
    case "closeSheet": {
      if (state.openStepId === null) {
        return state;
      }
      return { openStepId: null };
    }
  }
}

// ------------------------------------------------- 진행 갱신 (LIB-223 계약 §1.5(a))

// 스텝의 1-based 자리. journeySteps의 순서에서 **파생**한다 — 서수를 따로 표에
// 적으면 journeySteps와 그 표가 어긋날 자리가 생긴다 (ADR-0007 D3과 같은 논리).
// 던지지 않는다: union이 닫혀 있고 journeySteps가 다섯을 전부 갖는다 (계약 §1.5(a)).
export function journeyStepOrdinal(id: JourneyStepId): number {
  return journeySteps.findIndex((step) => step.id === id) + 1;
}

// 단조성이 계약이다 — 모든 입력에 대해 completeStep(c, id) >= c (계약 §1.5(a)).
// 조건 분기(if (ordinal > c) …)로 쓰면 같은 값이 나오지만 단조성이 *분기의 결과*가
// 되어 다음 사람이 분기를 고칠 때 조용히 깨진다. Math.max가 그 성질을 구조적으로
// 보장한다.
export function completeStep(completedCount: number, id: JourneyStepId): number {
  return Math.max(completedCount, journeyStepOrdinal(id));
}

// --------------------------------------------- 스텝의 학습형 (LIB-236 계약 §1.4)

// **껍데기다 — 동작이 아직 없다 (logic-scaffold).** 계약이 고정한 자리·이름·시그니처만
// 세워 다음 단위의 unit 테스트가 import를 해석할 수 있게 한다. 실제 답은 그 단위가 채운다.
//
// 판정 표(`learningFormByStep: Record<JourneyStepId, LearningForm>`)를 여기서 만들지
// 않는다 — 초기 값이 계약 §8.2 보류 1b(배정)에 걸려 아직 열려 있고, 지어내면 그것이
// 배정이 된다. 표를 모듈 내부에 두고 함수 하나만 내보내는 형태는 `stepStatusSuffix` ·
// `stepOpensSheet`와 같다 (§1.4(b)).
//
// 착지하면 던지지 않는 총함수다 — `Record`가 다섯 키를 전부 덮는 것을 tsc가 지므로
// 방어 분기도 `undefined`도 없다 (§1.8). 새 스텝이 늘면 그 `Record`가 `TS2741`로 선다.
export function learningFormForStep(id: JourneyStepId): LearningForm {
  throw new Error(`learningFormForStep: 아직 구현되지 않았다 — ${id}`);
}
