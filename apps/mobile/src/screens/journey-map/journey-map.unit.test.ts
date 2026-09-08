import { describe, expect, it } from "vitest";

import type { LearningForm } from "../../lib/learning-form";
// LIB-236 계약 §3.1 U4의 교차 불변식이 보는 조회 함수 셋. 셋 다 순수 로직 모듈이고
// DOM·컴포넌트를 import하지 않으므로 unit 계층의 경계를 넘지 않는다 (ADR-0006 D4).
// 듣기 쪽의 실제 이름은 `questionsForStep`이다 (listening.ts:236) — 계약 §3.1이 쓴
// `listeningQuestionsForStep`은 뜻을 가리키는 이름이라, 저장소의 이름을 그대로 쓰고
// 여기서 별칭을 준다.
import {
  listeningQuestionsByStep,
  questionsForStep as listeningQuestionsForStep,
} from "../listening/listening";
import { sentenceOrderQuestionsForStep } from "../sentence-order/sentence-order";
import { wordChoiceQuestionsForStep } from "../word-choice/word-choice";
import {
  canOpenStep,
  completeStep,
  initialCompletedStepCount,
  findStep,
  initialStepSheetState,
  journeySteps,
  journeyStepOrdinal,
  learningFormForStep,
  standardUnitSteps,
  stepAccessibilityLabel,
  stepSheetReducer,
  stepStatusAt,
  type JourneyStep,
  type JourneyStepId,
  type JourneyUnit,
  type StepSheetState,
} from "./journey-map";

// 계약: .agent-harness/work/lib-222/spec.md §3.1 (`unit` 테스트 계획, pureFunctions 표)
// 진행 갱신 둘(journeyStepOrdinal · completeStep)은 LIB-223 계약 §3.1(b)·§1.5(a)다.
// DOM·컴포넌트를 import하지 않는다 — 순수 함수 일곱 + 고정 데이터만 본다.

describe("stepStatusAt", () => {
  // 계약 §3.1 표 · §1.5 판정 규칙: index < completedCount → "done"
  it("index가 completedCount보다 작으면 done이다", () => {
    expect(stepStatusAt(0, 2)).toBe("done");
    expect(stepStatusAt(1, 2)).toBe("done");
  });

  // index === completedCount → "current"
  it("index가 completedCount와 같으면 current다", () => {
    expect(stepStatusAt(2, 2)).toBe("current");
  });

  // 그 밖 → "locked"
  it("index가 completedCount보다 크면 locked다", () => {
    expect(stepStatusAt(3, 2)).toBe("locked");
    expect(stepStatusAt(4, 2)).toBe("locked");
  });

  it("아무것도 완료되지 않은 여정의 첫 스텝(0, 0)은 current다", () => {
    expect(stepStatusAt(0, 0)).toBe("current");
  });

  it("전부 완료되면(completedCount === steps.length) current가 없다 — 마지막 index도 done이다", () => {
    expect(stepStatusAt(4, 5)).toBe("done");
  });
});

describe("stepAccessibilityLabel", () => {
  // 계약 §1.5 접미사 표: "<title>, <접미사>"
  it("done 상태는 완료됨 접미사를 낸다", () => {
    expect(stepAccessibilityLabel("첫 인사", "done")).toBe("첫 인사, 완료됨");
  });

  it("current 상태는 현재 스텝 접미사를 낸다", () => {
    expect(stepAccessibilityLabel("주문하기", "current")).toBe("주문하기, 현재 스텝");
  });

  it("locked 상태는 잠김 접미사를 낸다", () => {
    expect(stepAccessibilityLabel("약속 잡기", "locked")).toBe("약속 잡기, 잠김");
  });
});

// 계약 재고정(§1.5.1, §4.4): "이 상태가 시트를 여는가"의 판정만 하는 순수 함수.
// 아무것도 막지 않는다 — 실제 차단(게이트)은 JourneyStepNode.ui.test.tsx가
// bindtap 뒤 onSelect 호출 횟수로 본다(§1.7.2). 여기서는 반환값만 본다.
describe("canOpenStep", () => {
  it("done은 시트를 연다 — true", () => {
    expect(canOpenStep("done")).toBe(true);
  });

  it("current는 시트를 연다 — true", () => {
    expect(canOpenStep("current")).toBe(true);
  });

  it("locked는 시트를 열지 않는다 — false", () => {
    expect(canOpenStep("locked")).toBe(false);
  });
});

describe("findStep", () => {
  it("배열에 있는 id면 그 스텝을 돌려준다", () => {
    const found = findStep(journeySteps, "ordering");

    expect(found?.title).toBe("주문하기");
  });

  it("배열에 없는 id면 undefined를 돌려준다", () => {
    // JourneyStepId는 닫힌 union이라, 계약이 없다고 명시한 경우는 as로만 만들 수 있다.
    expect(findStep(journeySteps, "not-a-real-step" as never)).toBeUndefined();
  });
});

describe("stepSheetReducer", () => {
  it("openStep — 닫혀 있던 시트가 그 스텝으로 열린다", () => {
    const next = stepSheetReducer(initialStepSheetState, {
      type: "openStep",
      stepId: "ordering",
    });

    expect(next).toEqual({ openStepId: "ordering" });
  });

  it("openStep — 다른 스텝이 열려 있으면 그 스텝으로 바뀐다", () => {
    const state: StepSheetState = { openStepId: "ordering" };

    const next = stepSheetReducer(state, { type: "openStep", stepId: "greeting" });

    expect(next).toEqual({ openStepId: "greeting" });
  });

  it("openStep — 이미 그 스텝이 열려 있으면 같은 참조를 돌려준다", () => {
    const state: StepSheetState = { openStepId: "ordering" };

    const next = stepSheetReducer(state, { type: "openStep", stepId: "ordering" });

    expect(next).toBe(state);
  });

  it("closeSheet — 열려 있던 시트를 닫는다", () => {
    const state: StepSheetState = { openStepId: "ordering" };

    const next = stepSheetReducer(state, { type: "closeSheet" });

    expect(next).toEqual({ openStepId: null });
  });

  it("closeSheet — 이미 닫혀 있으면 같은 참조를 돌려준다", () => {
    const next = stepSheetReducer(initialStepSheetState, { type: "closeSheet" });

    expect(next).toBe(initialStepSheetState);
  });

  it("부수효과 없음 — 호출 뒤 입력 state 객체가 변형되지 않는다", () => {
    const state: StepSheetState = { openStepId: "ordering" };
    const snapshot: StepSheetState = { openStepId: "ordering" };

    stepSheetReducer(state, { type: "openStep", stepId: "greeting" });
    stepSheetReducer(state, { type: "closeSheet" });

    expect(state).toEqual(snapshot);
  });
});

describe("journeySteps · initialCompletedStepCount (고정 데이터)", () => {
  it("스텝이 다섯이다", () => {
    expect(journeySteps).toHaveLength(5);
  });

  it("id가 중복되지 않는다", () => {
    const ids = journeySteps.map((step) => step.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("initialCompletedStepCount가 0 이상 스텝 개수 이하다", () => {
    expect(initialCompletedStepCount).toBeGreaterThanOrEqual(0);
    expect(initialCompletedStepCount).toBeLessThanOrEqual(journeySteps.length);
  });

  it("initialCompletedStepCount가 계약 §1.4가 고정한 값(2)이다", () => {
    expect(initialCompletedStepCount).toBe(2);
  });

  // 계약 §1.4 표: 파생 상태가 done 2 · current 1 · locked 2가 되게 한다.
  it("파생 상태가 §1.4 표와 일치한다 — greeting·introduction done, ordering current, appointment·directions locked", () => {
    const derived = journeySteps.map((step, index) => ({
      id: step.id,
      status: stepStatusAt(index, initialCompletedStepCount),
    }));

    expect(derived).toEqual([
      { id: "greeting", status: "done" },
      { id: "introduction", status: "done" },
      { id: "ordering", status: "current" },
      { id: "appointment", status: "locked" },
      { id: "directions", status: "locked" },
    ]);
  });
});

// LIB-249 계약 §4.7 — 접근성 점검(u8) 지적 ②의 축을 unit이 진다.
// 지키는 것은 「데이터가 낳는 낭독 이름」이지 렌더 표면이 아니다. 표면(속성으로 나가는
// 것)은 JourneyStepNode.ui.test.tsx의 라벨 케이스들이 같은 리터럴로 진다.
// ⚠ 기대값을 journeySteps에서 다시 뽑지 않는다 — 그러면 동어반복이 되어 title이 바뀌어도
// 통과한다. 리터럴로 못 박는 것이 이 케이스의 전부다.
describe("낭독 이름의 데이터 앵커 (계약 §4.7)", () => {
  // U-N6
  it("실제 journeySteps가 초기 진행에서 내는 낭독 이름 다섯이 리터럴 표와 같다", () => {
    const labels = journeySteps.map((step, index) =>
      stepAccessibilityLabel(step.title, stepStatusAt(index, initialCompletedStepCount)),
    );

    expect(labels).toEqual([
      "첫 인사, 완료됨",
      "이름 묻기, 완료됨",
      "주문하기, 현재 스텝",
      "약속 잡기, 잠김",
      "길 묻기, 잠김",
    ]);
  });

  // U-N7 — 시트가 읽는 표면. 낭독 이름과 다른 자리라 케이스를 가른다.
  it("실제 journeySteps의 id별 description이 리터럴 표와 같다", () => {
    const described = journeySteps.map((step) => ({
      id: step.id,
      description: step.description,
    }));

    expect(described).toEqual([
      { id: "greeting", description: "카페에서 처음 인사를 나눈다" },
      { id: "introduction", description: "상대의 이름을 묻고 자기를 소개한다" },
      { id: "ordering", description: "카페에서 마실 것을 주문한다" },
      { id: "appointment", description: "다음에 만날 날짜와 시간을 정한다" },
      { id: "directions", description: "약속 장소까지 가는 길을 묻는다" },
    ]);
  });
});

// ------------------------------------------------- 진행 갱신 (LIB-223 계약 §3.1(b))
// 여기부터가 LIB-223이 더하는 것이다. 위의 케이스는 하나도 지우거나 뜻을 바꾸지 않는다.

// 계약 §1.4 표의 스텝 다섯. 서수는 journeySteps의 자리(1-based)와 같다.
const allStepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

describe("journeyStepOrdinal", () => {
  // 계약 §3.1(b) 표: ("greeting") ("ordering") ("directions") → 1 · 3 · 5
  it("스텝의 1-based 자리를 돌려준다", () => {
    expect(journeyStepOrdinal("greeting")).toBe(1);
    expect(journeyStepOrdinal("ordering")).toBe(3);
    expect(journeyStepOrdinal("directions")).toBe(5);
  });

  it("나머지 둘도 자리대로다", () => {
    expect(journeyStepOrdinal("introduction")).toBe(2);
    expect(journeyStepOrdinal("appointment")).toBe(4);
  });

  // 계약 §1.5(a): 던지지 않는다 — union이 닫혀 있고 journeySteps가 다섯을 전부 갖는다
  it("다섯 스텝의 서수가 journeySteps의 자리와 1:1이다", () => {
    const ordinals = journeySteps.map((step) => journeyStepOrdinal(step.id));

    expect(ordinals).toEqual([1, 2, 3, 4, 5]);
  });

  it("서수가 서로 겹치지 않는다", () => {
    const ordinals = allStepIds.map((id) => journeyStepOrdinal(id));

    expect(new Set(ordinals).size).toBe(allStepIds.length);
  });
});

describe("completeStep", () => {
  // 계약 §3.1(b) 표 · §1.5(a): Math.max(completedCount, journeyStepOrdinal(id))

  // 수용 기준 8 — 방금 학습한 스텝이 done이 되고 다음이 current가 된다
  it("현재 스텝을 끝내면 진행이 그 스텝의 서수로 는다", () => {
    expect(completeStep(2, "ordering")).toBe(3);
  });

  // 수용 기준 9 — 진행은 되돌아가지 않는다
  it("이미 완료한 스텝을 다시 끝내도 진행이 줄지 않는다", () => {
    expect(completeStep(3, "greeting")).toBe(3);
  });

  it("이미 done인 스텝을 다시 돌아도 진행이 그대로다", () => {
    expect(completeStep(2, "greeting")).toBe(2);
  });

  // 계약 §1.5(a): 여정이 전부 완료된다 — current인 스텝이 없는 것이 정상이다
  it("마지막 스텝을 끝내면 진행이 5가 된다", () => {
    expect(completeStep(4, "directions")).toBe(5);
  });

  it("아무것도 완료되지 않은 여정에서 첫 스텝을 끝내면 1이 된다", () => {
    expect(completeStep(0, "greeting")).toBe(1);
  });

  it("건너뛴 스텝을 끝내면 그 스텝의 서수까지 한 번에 는다", () => {
    expect(completeStep(0, "directions")).toBe(5);
  });

  // 계약 §1.5(a) 「단조성이 계약이다」: 모든 입력에 대해 completeStep(c, id) >= c.
  // 조합으로 단언하지 않으면 분기 하나가 바뀌었을 때 조용히 깨진다.
  it("단조성 — 다섯 id × 진행 0..5의 모든 조합에서 진행이 줄지 않는다", () => {
    for (const id of allStepIds) {
      for (let count = 0; count <= 5; count += 1) {
        expect(completeStep(count, id)).toBeGreaterThanOrEqual(count);
      }
    }
  });

  it("모든 조합에서 결과가 진행과 서수 중 큰 쪽이다", () => {
    for (const id of allStepIds) {
      for (let count = 0; count <= 5; count += 1) {
        expect(completeStep(count, id)).toBe(Math.max(count, journeyStepOrdinal(id)));
      }
    }
  });

  it("같은 스텝을 두 번 끝내도 값이 더 늘지 않는다 — 멱등이다", () => {
    for (const id of allStepIds) {
      for (let count = 0; count <= 5; count += 1) {
        const once = completeStep(count, id);

        expect(completeStep(once, id)).toBe(once);
      }
    }
  });

  it("어떤 조합에서도 진행이 스텝 개수를 넘지 않는다", () => {
    for (const id of allStepIds) {
      for (let count = 0; count <= journeySteps.length; count += 1) {
        expect(completeStep(count, id)).toBeLessThanOrEqual(journeySteps.length);
      }
    }
  });

  it("부수효과 없음 — 같은 입력을 두 번 불러도 같은 값이다", () => {
    expect(completeStep(2, "ordering")).toBe(completeStep(2, "ordering"));
  });
});

describe("여정 전부 완료 (계약 §1.5(a)의 빈칸)", () => {
  // 계약 §3.1(b) 표: stepStatusAt(0..4, 5) → 전부 "done". current인 스텝이 없다.
  it("진행이 5면 다섯 스텝이 전부 done이고 current가 없다", () => {
    const statuses = journeySteps.map((_step, index) => stepStatusAt(index, 5));

    expect(statuses).toEqual(["done", "done", "done", "done", "done"]);
  });

  it("전부 done이어도 다섯 스텝이 전부 열린다 — 다시 돌 수 있다", () => {
    const openable = journeySteps.map((_step, index) => canOpenStep(stepStatusAt(index, 5)));

    expect(openable).toEqual([true, true, true, true, true]);
  });

  it("마지막 스텝을 끝내면 그 진행에 닿는다", () => {
    const completed = completeStep(4, "directions");

    expect(journeySteps.map((_step, index) => stepStatusAt(index, completed))).toEqual([
      "done",
      "done",
      "done",
      "done",
      "done",
    ]);
  });
});

// ------------------------------------- 스텝의 학습형 (LIB-236 계약 §3.1 U1·U4)
// 여기부터가 LIB-236이 더하는 것이다. 위의 케이스는 하나도 지우거나 뜻을 바꾸지 않는다.

// 계약 §1.3의 어휘 넷. **어휘이지 배정이 아니다** — 어느 스텝이 어느 값인지는 이
// 파일 어디에서도 단언하지 않는다.
//
// LIB-238: "culture"가 는다. journeyStepForStep이 culture를 돌려주는 스텝은 아직
// 없다 — 배정은 여전히 열려 있다(§8.2 보류 1b). 이 어휘 배열은 그 배정과 무관하게
// LearningForm의 네 값을 그대로 나열한다.
const allLearningForms: readonly LearningForm[] = [
  "listening",
  "sentence-order",
  "word-choice",
  "culture",
];

// 학습형 → 그 학습형의 문항 개수. 교차 불변식을 학습형 축으로도 돌기 위한 모듈 내부
// 표다. `Record<LearningForm, …>`이므로 넷째 학습형이 늘면 여기가 tsc로 선다.
//
// culture: () => 0 — 문화 학습에는 문항이 없다(LIB-238 계약 §1). 판정 축이 없고
// 제시 형태가 서사(글) 하나뿐이라 사용자 입력이 0건이고, 채점할 문항 자체가 없다.
// 서사는 문항이 아니다.
const questionCountForForm: Record<LearningForm, (id: JourneyStepId) => number> = {
  listening: (id) => listeningQuestionsForStep(id).length,
  "sentence-order": (id) => sentenceOrderQuestionsForStep(id).length,
  "word-choice": (id) => wordChoiceQuestionsForStep(id).length,
  culture: () => 0,
};

describe("learningFormForStep (계약 §3.1 U1)", () => {
  // ⚠ **어느 스텝이 어느 학습형인지를 단언하지 않는다** (계약 §3.1 U1). 그것은 배정이고
  // §8.2 보류 1b로 아직 열려 있다 — 배정을 단언에 박으면 값이 오는 날 계약이 아니라
  // 이 테스트가 배정을 잠근다. 여기서 보는 것은 「던지는가 · undefined인가 ·
  // LearningForm의 한 값인가」뿐이다.

  // 계약 §1.8: 던지지 않는다 — Record가 다섯 키를 전부 덮는 것을 tsc가 진다.
  it("다섯 스텝 어느 것에도 던지지 않는다", () => {
    for (const id of allStepIds) {
      expect(() => learningFormForStep(id)).not.toThrow();
    }
  });

  it("다섯 스텝 어느 것에도 undefined를 돌려주지 않는다", () => {
    for (const id of allStepIds) {
      expect(learningFormForStep(id)).not.toBeUndefined();
    }
  });

  it("다섯 스텝 각각에 LearningForm의 한 값을 돌려준다", () => {
    for (const id of allStepIds) {
      expect(allLearningForms).toContain(learningFormForStep(id));
    }
  });

  // journeySteps에서 온 id로도 같은 것을 본다 — allStepIds가 그 배열과 어긋나면
  // 이 케이스가 먼저 말한다.
  it("journeySteps의 다섯 스텝에도 그대로 성립한다", () => {
    const forms = journeySteps.map((step) => learningFormForStep(step.id));

    expect(forms).toHaveLength(5);
    for (const form of forms) {
      expect(allLearningForms).toContain(form);
    }
  });

  it("부수효과 없음 — 같은 스텝을 두 번 불러도 같은 값이다", () => {
    for (const id of allStepIds) {
      expect(learningFormForStep(id)).toBe(learningFormForStep(id));
    }
  });
});

describe("교차 불변식 — 학습형과 문항 표 (계약 §3.1 U4 · §1.5(d))", () => {
  // ⚠ **이 이슈가 만든 「덮지 않는다」의 유일한 판정자다** (수용 기준 2).
  // 타입은 이것을 원리적으로 못 짓는다 — 세 문항 표가 `Record<JourneyStepId, …>`로
  // 다섯 키를 그대로 두므로, 듣기가 아닌 스텝에 듣기 문항이 남아 있어도 tsc가 아무
  // 말도 안 한다 (계약 §1.5(b)(d)가 좁히는 안을 버린 자리).
  //
  // **양방향(⇔)이다.** 한쪽만 보면 「듣기가 아닌 스텝에 듣기 문항이 남아 있는 것」을
  // 못 잡는다. 배정이 바뀌는 날 이 단언이 먼저 빨개지고, 옮길 문항을 함께 옮기라고 말한다.

  it("듣기인 스텝에만 듣기 문항이 있다 — 양방향", () => {
    for (const id of allStepIds) {
      expect(learningFormForStep(id) === "listening").toBe(
        listeningQuestionsForStep(id).length > 0,
      );
    }
  });

  it("문장 순서인 스텝에만 문장 순서 문항이 있다 — 양방향", () => {
    for (const id of allStepIds) {
      expect(learningFormForStep(id) === "sentence-order").toBe(
        sentenceOrderQuestionsForStep(id).length > 0,
      );
    }
  });

  it("단어 선택인 스텝에만 단어 선택 문항이 있다 — 양방향", () => {
    for (const id of allStepIds) {
      expect(learningFormForStep(id) === "word-choice").toBe(
        wordChoiceQuestionsForStep(id).length > 0,
      );
    }
  });

  // 위 셋을 스텝 × 학습형 격자로 한 번에 돈다. LIB-238로 학습형이 넷째(culture)로
  // 늘어 이제 스무 칸이다 — culture의 questionCountForForm이 항상 0이고
  // learningFormForStep이 아직 culture를 돌려주는 스텝이 없으므로(§8.2 보류 1b), 이
  // 넷째 열은 오늘 전부 false === false로 통과한다. **문화가 배정되는 날** 이 격자가
  // 먼저 갈라진다 — questionCountForForm이 아니라 배정 쪽이 무너진 것이라는 신호다.
  it("다섯 스텝 × 학습형 넷 스무 칸 전부에서 ⇔가 성립한다", () => {
    for (const id of allStepIds) {
      for (const form of allLearningForms) {
        expect(learningFormForStep(id) === form).toBe(questionCountForForm[form](id) > 0);
      }
    }
  });

  // ⇔ 셋에서 따라 나오는 것이지만, 깨졌을 때 무엇이 깨졌는지를 다르게 말해 준다 —
  // 「한 스텝이 두 학습형의 문항을 갖는다」와 「문항이 아예 없다」를 가른다.
  it("다섯 스텝 각각에서 문항이 있는 표가 정확히 하나다", () => {
    for (const id of allStepIds) {
      const nonEmpty = allLearningForms.filter((form) => questionCountForForm[form](id) > 0);

      expect(nonEmpty).toHaveLength(1);
    }
  });

  it("다섯 스텝 각각에서 문항이 있는 그 하나가 그 스텝의 학습형이다", () => {
    for (const id of allStepIds) {
      const nonEmpty = allLearningForms.filter((form) => questionCountForForm[form](id) > 0);

      expect(nonEmpty).toEqual([learningFormForStep(id)]);
    }
  });

  // ⚠ 계약이 미래에 거는 단언이다(LIB-236 계약 §6.1의 U6 주석). 오늘은 어느 스텝도
  // culture가 아니므로 다섯 칸 전부 통과한다. **문화가 스텝에 배정되는 날** 이
  // 단언이 먼저 빨개져 「culture는 문항 축이 아니다 — 배정하려면 questionCountForForm이
  // 아니라 이 불변식 자체를 다시 봐야 한다」를 말해 준다. 그 전까지는 이 계약이
  // 근거 없는 예외를 코드에 남기지 않기 위해 그대로 둔다.
  it("어느 스텝도 문항이 0개인 학습형에 배정되지 않는다", () => {
    for (const id of allStepIds) {
      expect(questionCountForForm[learningFormForStep(id)](id)).toBeGreaterThan(0);
    }
  });
});

// ------------------------------------------------- 유닛 (LIB-249 계약 §4.1)
// 여기부터가 LIB-249가 더하는 것이다. 위의 케이스는 하나도 지우거나 뜻을 바꾸지 않는다.
//
// standardUnitSteps는 픽스처로 검사한다(계약 §3.4·§4.1) — 실제 journeyUnits의 구성
// (유닛이 몇 개인지, 어느 스텝이 어느 유닛에 속하는지)은 이음매(§3)이므로 이 파일
// 어디에서도 단언하지 않는다. 아래 픽스처가 쓰는 id는 JourneyStepId가 닫힌 union이라
// 실재하는 값을 빌린 것일 뿐, 그 스텝이 실제로 그 유닛에 속한다는 뜻이 아니다 — title도
// description도 실제 값이 아닌 임의 라벨(A·B·C)을 쓴다.

const fixtureStep = (id: JourneyStepId, label: string): JourneyStep => ({
  id,
  title: label,
  description: label,
});

const standardUnitFixture = (...steps: readonly JourneyStep[]): JourneyUnit => ({
  kind: "standard",
  steps,
});

const specialUnitFixture = (): JourneyUnit => ({ kind: "special" });

describe("standardUnitSteps (LIB-249 계약 §4.1)", () => {
  const a = fixtureStep("greeting", "A");
  const b = fixtureStep("ordering", "B");
  const c = fixtureStep("directions", "C");

  // U-N1: 일반 유닛 하나의 스텝을 순서 그대로 낸다.
  it("일반 유닛 하나의 스텝을 순서 그대로 낸다 (U-N1)", () => {
    const units: readonly JourneyUnit[] = [standardUnitFixture(a, b, c)];

    expect(standardUnitSteps(units)).toEqual([a, b, c]);
  });

  // U-N2: 특별 유닛이 사이에 낀 목록에서 앞뒤 일반 유닛의 스텝이 이어져 나온다.
  // ⚠ 특별 유닛을 끝이 아니라 사이에 둔다 — 끝에 두면 slice로도, 첫 유닛만 읽는
  // 구현으로도 통과한다 (계약 §4.1 「U-N2가 왜 사이에여야 하나」).
  it("특별 유닛이 사이에 낀 목록에서 앞뒤 일반 유닛의 스텝이 이어져 나온다 (U-N2)", () => {
    const units: readonly JourneyUnit[] = [
      standardUnitFixture(a, b),
      specialUnitFixture(),
      standardUnitFixture(c),
    ];

    expect(standardUnitSteps(units)).toEqual([a, b, c]);
  });

  // U-N3: 특별 유닛만 있는 목록은 빈 배열을 낸다 — 던지지 않는다.
  it("특별 유닛만 있는 목록은 빈 배열을 낸다 (U-N3)", () => {
    const units: readonly JourneyUnit[] = [specialUnitFixture(), specialUnitFixture()];

    expect(standardUnitSteps(units)).toEqual([]);
  });

  // U-N4: 빈 목록은 빈 배열을 낸다.
  it("빈 목록은 빈 배열을 낸다 (U-N4)", () => {
    expect(standardUnitSteps([])).toEqual([]);
  });
});

// U-N5 (파수꾼): journeySteps의 id 집합과 JourneyStepId의 런타임 열거가 양방향으로
// 차가 없다. learningFormByStep은 export하지 않으므로, 같은 union으로 타입된
// listeningQuestionsByStep(Record<JourneyStepId, …>)을 그 열거의 대리로 쓴다
// (계약 §4.1).
//
// 집합의 차로 짓는다 — 개수를 세지 않는다. 길이만 비교하면 「하나 빠지고 하나 늘었다」를
// 통과시킨다.
describe("journeySteps ⇔ JourneyStepId (파수꾼, LIB-249 계약 §4.1 U-N5)", () => {
  it("journeySteps의 id 집합과 JourneyStepId의 런타임 열거가 양방향으로 차가 없다", () => {
    const journeyStepIds = new Set<string>(journeySteps.map((step) => step.id));
    const enumeratedIds = new Set<string>(Object.keys(listeningQuestionsByStep));

    const missingFromEnumeration = [...journeyStepIds].filter((id) => !enumeratedIds.has(id));
    const missingFromJourneySteps = [...enumeratedIds].filter((id) => !journeyStepIds.has(id));

    expect(missingFromEnumeration).toEqual([]);
    expect(missingFromJourneySteps).toEqual([]);
  });
});
