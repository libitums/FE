// 따라 쓴 음절 하나를 판정하는 순수 규칙과 그 **통과 문턱**을 소유합니다. UI를 import하지
// 않습니다.
//
// 쓰기 학습형과 최종 테스트의 쓰기 문항이 같은 규칙으로 채점합니다 — 그래서 화면 폴더가 아니라
// 여기 둡니다(`lib/speaking-judge.ts`와 같은 자리). 접점(`handwriting-trace.ts`)이 문턱을 박지
// 않고 수만 실어 나르는 설계라, 「얼마가 통과인가」를 정하는 자리가 이 파일 하나입니다.

import type { AnswerResult } from "./answer-result";
import type { HandwritingTraceOutcome } from "./handwriting-trace";

/**
 * 통과 문턱입니다. 두 지표가 **둘 다** 문턱 이상이어야 정답입니다 — `coverage`만 보면 판을
 * 칠해 버린 낙서가, `stay`만 보면 한 획만 정확히 그은 것이 통과합니다.
 */
export type WritingPassCriterion = {
  /** 안내를 얼마나 채웠나(0~1)의 하한입니다. */
  readonly coverage: number;
  /** 안내 밖으로 얼마나 안 나갔나(0~1)의 하한입니다. */
  readonly stay: number;
};

/**
 * 기본 통과 문턱입니다. 문항은 이 값을 그대로 쓰거나(`passCriterion`) 글자 복잡도에 맞춰
 * 덮어씁니다.
 *
 * ⚠ **임시입니다 — 기기에서 잡습니다.** 근거는 시뮬레이터의 합성 직선 한 벌뿐입니다
 * (`docs/e2e/handwriting-probe.md` 「계산 버그 둘을 잡고」): 통과 쪽 최솟값이 덮음 0.748 ·
 * 머무름 0.752, 실패 쪽 최댓값이 0.493 · 0.471이라 그 사이에 둡니다. `stay`를 0.7로 조금 높인
 * 것은 「다섯 획 중 둘을 빠뜨림」(머무름 0.775)을 `coverage`가 걸러 내므로 `stay`는 낙서를
 * 거르는 데만 쓰면 되기 때문입니다.
 *
 * **무엇이 막고 있나** — 사람이 손가락으로 쓴 획의 분포입니다. 사람은 곡선을 따라 그으므로
 * 통과 쪽이 더 올라갈 것으로 보이지만 추측입니다. **값이 오는 날 무엇이 바뀌나** — 이 두
 * 수뿐입니다. 판정 함수 · 문항 모양 · 화면은 그대로입니다.
 */
export const writingPassCriterion: WritingPassCriterion = { coverage: 0.6, stay: 0.7 };

/**
 * 견주기 한 번을 판정으로 옮긴 것입니다.
 *
 * - `judged` — 수가 왔고 문턱으로 갈랐습니다.
 * - `unmeasurable` — 잴 수 없었습니다(모듈 없음 · 안내가 안 그려짐 · 실패 · 모양 어긋남).
 *   **결과에 싣지 않고 넘어갑니다** — 기기 탓을 학습자의 오답으로 접지 않습니다(말하기와 같은
 *   규칙입니다).
 * - `rewrite` — 호스트가 「획이 없다」고 답했습니다. 잴 수 없는 것이 아니라 **아직 안 쓴
 *   것**이라, 넘기지 않고 다시 쓰게 합니다. 화면은 획이 있을 때만 견주기를 열므로 보통은 오지
 *   않습니다 — 온다면 획이 호스트에 닿기 전에 잃어버린 것이고, 그때 문항을 건너뛰면 학습자는
 *   쓴 글자를 판정받지 못한 채 지나갑니다.
 */
export type WritingJudgement =
  | { readonly kind: "judged"; readonly result: AnswerResult }
  | { readonly kind: "unmeasurable" }
  | { readonly kind: "rewrite" };

/** 견주기 결과를 문턱으로 판정합니다. 던지지 않습니다. */
export function judgeWriting(
  outcome: HandwritingTraceOutcome,
  criterion: WritingPassCriterion,
): WritingJudgement {
  switch (outcome.status) {
    case "compared": {
      const passed = outcome.coverage >= criterion.coverage && outcome.stay >= criterion.stay;
      return { kind: "judged", result: passed ? "correct" : "incorrect" };
    }
    case "empty-strokes": {
      return { kind: "rewrite" };
    }
    // `default`를 두지 않습니다 — 접점에 사유가 늘면 여기가 TS2366으로 서서, 그 사유를 잴 수
    // 없음으로 접을지 다시 쓰기로 돌릴지 정하지 않고 지나가는 일을 막습니다.
    case "empty-glyph":
    case "invalid-arguments":
    case "failed":
    case "malformed": {
      return { kind: "unmeasurable" };
    }
  }
}

/**
 * 음절들의 판정을 문항 하나의 판정으로 모읍니다. 잰 음절이 모두 맞아야 정답이고, **잰 음절이
 * 하나도 없으면 `null`** — 그 문항은 결과에 싣지 않습니다.
 */
export function writingQuestionResult(results: readonly AnswerResult[]): AnswerResult | null {
  if (results.length === 0) {
    return null;
  }
  return results.every((result) => result === "correct") ? "correct" : "incorrect";
}
