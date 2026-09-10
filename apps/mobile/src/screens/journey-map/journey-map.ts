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
import type { MessengerConversation, MessengerUnitId } from "../messenger/messenger.contract";
import type {
  PhoneCallJourneyUnitContract,
  PhoneCallJourneyMapItemContract,
} from "../phone-call/phone-call.contract";

// ---------------------------------------------------------------- 도메인 타입 (계약 §1.3)

export type JourneyStepId = "greeting" | "introduction" | "ordering" | "appointment" | "directions";

export type JourneyStepStatus = "done" | "current" | "locked";

export type JourneyStep = {
  readonly id: JourneyStepId;
  readonly title: string;
  readonly description: string;
};

/**
 * 여정의 한 마디. **유형이 유닛을 따라간다** (docs/screens.md 「유닛」).
 *
 * 판별 union이고 옵셔널 필드가 없다 — `steps?`를 두면 「스텝이 없을 수도 있는 유닛」이
 * 타입에 생기고 그 분기를 소비자 전부가 진다 (docs/conventions/code.md
 * 「임시 입력값의 이음매」의 「옵셔널 금지」).
 *
 * **특별 유닛은 스텝을 갖지 않는다** — 기본 학습형은 일반 유닛에서만 돌기 때문이다
 * (LIB-249 계약 §1.2). 그래서 `learningFormByStep`의 정의역이 「일반 유닛의 스텝 전부」로
 * 좁혀지고, 그 좁힘을 `Record`의 키가 진다.
 *
 * **`special`이 오늘 아무 필드도 지지 않는 것은 판단이다** (LIB-249 계약 §0.5 Q2) — 그
 * 항목이 무엇을 지고 갈지는 그 유닛으로 가는 화면이 정하고, 화면은 구현 순서 6번의
 * 것이다. 지금 필드를 정하면 화면 없이 그 모양이 굳는다.
 */
export type JourneyUnit =
  | { readonly kind: "standard"; readonly steps: readonly JourneyStep[] }
  | {
      readonly kind: "special";
      readonly id: MessengerUnitId;
      readonly title: "약속 확인 메시지";
      readonly screen: "messenger";
    }
  | PhoneCallJourneyUnitContract;

// 특별 항목 렌더링 계약을 수집하기 위한 타입 껍데기. 실제 항목 삽입·파생은 후속 구현에서 한다.
export type JourneyMapItem =
  | { readonly kind: "standard"; readonly step: JourneyStep }
  | {
      readonly kind: "special";
      readonly id: MessengerUnitId;
      readonly title: MessengerConversation["title"];
    }
  | Omit<PhoneCallJourneyMapItemContract, "status">;

// ---------------------------------------------------------------- 고정 데이터 (계약 §1.4)
// 계약이 값까지 고정했다. 진행의 진실의 출처는 이제 App의 상태이고, 이 상수는 그
// **씨앗**이다 — 값(2)은 그대로이고 이름만 역할이 좁아진 것을 반영한다
// (LIB-223 계약 §1.4(a)·§4.0 3번). 옛 이름(completedStepCount)을 남기지 않는다:
// 남기면 다른 모듈이 그것을 읽고 낡은 진행을 보면서도 통과한다.

// 여정의 유닛 목록. **맵의 세로 줄 순서가 이 목록의 순서다** (LIB-249 계약 §1.1).
//
// ⚠ **이음매다** (LIB-249 계약 §3 · docs/conventions/code.md 「임시 입력값의 이음매」).
//
// **무엇이 임시인가** — 이 목록에 특별 유닛 항목이 **0건인 것**이 임시다. 왼쪽의
// `kind`와 오른쪽의 타입은 임시가 아니다. `culture-quiz.ts`의 문항 표가 「빈 것이
// 임시다」라고 적은 것과 같은 종류이고, `culture.ts`의 서사 표(「차 있는데도 임시」)와
// 반대다.
//
// **왜 빈 채로 둘 수 있나** — 목록이라 원소 0을 표현할 수 있다. `Record<K, union>`이
// 빈 값을 못 갖는 것과 갈리는 자리다 (LIB-249 계약 §3.2).
//
// **이 목록이 배정 근거가 아니다** — 오늘 항목이 일반 유닛 하나인 것은 전사(轉寫)다.
// 유닛 경계가 맵에도 문서에도 그려진 적이 없어 경계를 하나로 옮긴 것이지, 「여정이
// 유닛 하나다」라고 정해진 것이 아니다 (LIB-249 계약 §0.5 A1).
//
// **무엇이 막고 있나** — 어느 유닛이 특별한지는 컨텐츠 판단이고, 특별 유닛이 열 화면은
// 구현 순서 6번이다. 갈 곳은 docs/adr/README.md 보류 표의 「특별 유닛의 구성과 컨텐츠」
// 행이다.
//
// **값이 오는 날 무엇이 바뀌나** — 이 목록에 항목이 늘고, **그 항목이 지는 필드와 맵의
// 노드 컴포넌트를 6번이 함께 더한다.** ⚠ **여기서만 앞선 이음매들과 갈린다** —
// `learningFormByStep`·`cultureNarrativeByStep`이 *"형태는 한 글자도 안 바뀐다"* 라고
// 적을 수 있었던 것은 그 표의 타입이 이미 완성돼 있었기 때문이다. 이 목록은 특별 변형이
// **필드를 얻으면서** 온다. 그 문장을 여기 복사하지 마라 (LIB-249 계약 §3.3).
const journeyUnits: readonly JourneyUnit[] = [
  {
    kind: "standard",
    steps: [
      { id: "greeting", title: "첫 인사", description: "카페에서 처음 인사를 나눈다" },
      { id: "introduction", title: "이름 묻기", description: "상대의 이름을 묻고 자기를 소개한다" },
      { id: "ordering", title: "주문하기", description: "카페에서 마실 것을 주문한다" },
      { id: "appointment", title: "약속 잡기", description: "다음에 만날 날짜와 시간을 정한다" },
    ],
  },
  {
    kind: "special",
    id: "appointment-confirmation",
    title: "약속 확인 메시지",
    screen: "messenger",
  },
  {
    kind: "special",
    id: "appointment-confirmation-phone-call",
    title: "약속 확인 전화",
    screen: "phone-call",
  },
  {
    kind: "standard",
    steps: [{ id: "directions", title: "길 묻기", description: "약속 장소까지 가는 길을 묻는다" }],
  },
];

export const journeyMapItems: readonly JourneyMapItem[] = journeyUnits.flatMap<JourneyMapItem>(
  (unit) =>
    unit.kind === "standard"
      ? unit.steps.map((step) => ({ kind: "standard", step }) as const)
      : unit.screen === "messenger"
        ? [{ kind: "special", id: unit.id, title: unit.title } as const]
        : [{ kind: "phone-call", id: unit.id, title: unit.title } as const],
);

// 맵이 그리는 스텝들. **유닛 목록에서 파생한다** — 스텝을 따로 나열하면 유닛 목록과
// 그 나열이 어긋날 자리가 생긴다 (journeyStepOrdinal이 서수를 따로 안 적는 것과 같은
// 논리, ADR-0007 D3).
//
// 타입도 값도 순서도 파생 전과 문자 그대로 같다 — 오늘 특별 유닛이 0건이기 때문이다
// (LIB-249 계약 §1.2(3)).
export const journeySteps: readonly JourneyStep[] = standardUnitSteps(journeyUnits);

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

/**
 * 유닛 목록에서 일반 유닛의 스텝만 목록 순서대로 이어 낸다. 특별 유닛의 기여는 0이다.
 *
 * 던지지 않는 총함수다 — `kind`가 닫힌 판별자라 방어 분기도 `undefined` 반환도 없다.
 * 목록을 인자로 받는 것은 `findStep(steps, id)`와 같은 형태이고, 그래서 이 함수는
 * 픽스처로 검사된다 (LIB-249 계약 §4.1).
 */
export function standardUnitSteps(units: readonly JourneyUnit[]): readonly JourneyStep[] {
  return units.flatMap((unit) => (unit.kind === "standard" ? unit.steps : []));
}

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

// 스텝→학습형 표. export하지 않는 모듈 내부 상수이고 나가는 것은 아래 함수 하나다 —
// `stepStatusSuffix`(:73) · `stepOpensSheet`(:93) · `lib/answer-result.ts`와 같은
// 형태다 (계약 §1.4(b)). 표를 내보내면 다음 사람이 직접 색인해 자기 답을 짓는다.
//
// ⚠ **오른쪽 다섯 값은 배정이 아니라 2026-09-05 데이터의 전사(轉寫)다** (계약 §1.9).
// 「이 스텝이 듣기로 정해졌다」가 아니라 「오늘 이 스텝에 있는 문항이 듣기 문항뿐이다」를
// 적은 것이다 — `listeningQuestionsByStep`(listening.ts:55)이 다섯 키 전부에 문항 셋을
// 갖고, `sentenceOrderQuestionsByStep`(sentence-order.ts:54) ·
// `wordChoiceQuestionsByStep`(word-choice.ts:53)은 다섯 키가 다 빈 배열이다. 그래서 이
// 값에서 동작 변화가 0이다.
//
// **왜 빈 채로 둘 수 없나** — `LearningForm` union에 빈 값(`""`도 `null`도)이 없고
// `Record`가 다섯 키를 전부 요구한다. 두 문항 표가 쓴 「빈 배열 + 사유 주석」을 이
// 자리는 쓸 수 없다 (계약 §1.9(c)).
//
// **무엇이 막고 있나** — 실제 배정은 컨텐츠 판단이고 계약 §8.2 보류 1b로 아직 열려
// 있다. **문항 값(보류 2)과 같은 시점에 온다** — 문항 없이 배정만 옮기면 그 스텝이
// 문항 0개인 화면을 연다.
//
// **값이 오는 날 무엇만 바뀌나** — **이 표의 오른쪽 다섯 개**와 그 스텝의 문항 배열
// 둘뿐이다. **형태는 한 글자도 안 바뀐다** (계약 수용 기준 5). 어긋나면 교차 불변식
// (계약 §3.1 U4)이 먼저 빨개져 옮길 문항을 함께 옮기라고 말한다.
//
// 문화는 다섯 키 전부에 서사를 갖지만 그 값은 임시라 배정 근거가 못 된다 —
// 문항 표 셋과 성질이 다르다(LIB-238).
//
// **정의역은 「일반 유닛의 스텝 전부」다** (LIB-249 계약 §1.2). 특별 유닛은 기본
// 학습형을 돌지 않아 이 표의 정의역 밖이고, 스텝을 갖지 않으므로 원리적으로 키가 될 수
// 없다. `JourneyStepId`가 곧 그 정의역이라 이 `Record`가 그대로 정의역을 진다 — 표를
// 좁히는 코드가 따로 없는 것이 판정이다.
const learningFormByStep: Record<JourneyStepId, LearningForm> = {
  greeting: "listening",
  introduction: "listening",
  ordering: "listening",
  appointment: "listening",
  directions: "listening",
};

// 던지지 않는 총함수다 — `Record`가 다섯 키를 전부 덮는 것을 tsc가 지므로 방어 분기도
// `undefined` 반환도 없다 (계약 §1.8). `sentenceOrderQuestionsForStep`이 쓴 것과 같은
// 문장이다. 새 스텝이 늘면 위 `Record`가 `TS2741`로 선다.
export function learningFormForStep(id: JourneyStepId): LearningForm {
  return learningFormByStep[id];
}
