// 학습 껍데기의 세션 헤더가 내는 값들을 뽑습니다. 화면이 계산식을 들고 있지 않도록
// 여기 모읍니다 — 같은 수에서 낱말 셋(순번 · 백분율 · 접근성 이름)과 막대가 나옵니다.

import { motionClassName, type Motion } from "@libitums/ui-lynx/motion";

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { LearningActivityForm } from "../../lib/learning-form";
import type { LearningShellFeedback } from "./learning-shell-props";

/**
 * 세션 헤더에 서는 학습형 이름입니다. 영문인 것은 디자인(Figma 65-14)의 어휘이고,
 * 에피소드 헤더(`Episode 0.` · `Tutorial.`) · 말풍선(`Lesson 1:`)과 같은 갈래입니다 —
 * 메타 문구는 영문, 학습 내용은 한국어입니다.
 */
const formLabels: Record<LearningActivityForm, string> = {
  listening: "Listening",
  "sentence-order": "Word order",
  "word-choice": "Word choice",
  culture: "Culture",
  speaking: "Speaking",
  writing: "Writing",
  typing: "Typing",
  "vocab-card": "New words",
  "pair-match": "Matching",
  "culture-card": "Culture",
  "syllable-build": "Spelling",
  "read-aloud": "Speaking",
  "speak-word": "Speaking",
};

/**
 * 학습 화면이 서는 한 바퀴를 SDK가 재게 하는 표식입니다(ADR-0019 D3).
 *
 * **이 값이 없으면 학습 화면은 원리적으로 못 잽니다.** Lynx는 `__lynx_timing_flag`가
 * 붙은 요소가 그려지는 렌더만 따로 재서 이름표와 함께 내보내고, 안 붙은 렌더는 캡처에
 * 한 줄도 남기지 않습니다 — 실제로 학습 화면을 걸어 보고 캡처를 읽었을 때 entry가 0건
 * 이었습니다(2026-09-28).
 *
 * 접두사가 `libitum:navigation:`인 것은 두 가지를 함께 삽니다. 첫째로 그것이 일어난 일의
 * 이름입니다 — 사용자가 다른 화면으로 갔습니다. 둘째로 네이티브 수집기가 **그 접두사를
 * 보고** 메모리 스냅샷을 함께 뜹니다(`AppDelegate.swift`). 다른 이름을 지으면 시간은
 * 재지만 메모리는 안 재집니다.
 *
 * 학습형마다 값을 가르는 것은 **Lynx가 같은 값의 첫 등장만 재기 때문**입니다(ADR-0019 D3).
 * 하나로 두면 한 실행에서 학습 화면을 처음 연 한 번만 잡히고, 듣기와 낱말 고르기 중
 * 어느 것이었는지도 남지 않습니다.
 *
 * **제품 비식별입니다** — 학습형 이름뿐이고 사용자 · 콘텐츠를 가리키는 것이 없습니다.
 */
export function learningTimingFlag(form: LearningActivityForm): string {
  return `libitum:navigation:learning-${form}`;
}

export type LearningSessionHeader = {
  /**
   * `Lesson 1 / 3` — 이 활동 안에서 지금 몇 번째 문항인가입니다.
   *
   * **문항이 0개면 없습니다.** 셀 것이 없는데 `Lesson 1 / 0`을 적으면 화면이 거짓말을
   * 합니다. 그 상태는 오류가 아니라 실재합니다 — 낱말 고르기는 오늘 다섯 스텝이 전부 빈
   * 배열이고, 그 화면은 마운트가 곧 완료입니다.
   */
  readonly progressLabel: string | undefined;
  readonly formLabel: string;
  readonly fillPercent: number;
  readonly accessibilityLabel: string;
};

/**
 * 문항 순번(0부터)과 활동의 전체 문항 수에서 세션 헤더의 값을 뽑습니다. `formLabelOverride`가 있으면
 * 학습형 이름표를 그것으로 갈음합니다(문화 확인 문항 — 같은 낱말 고르기 형이어도 이름표가 다릅니다).
 *
 * ⟨2026-09-28⟩ **세는 단위가 활동에서 문항으로 갈렸습니다.** 전에는 `Chapter n / N`이
 * 유닛 안의 활동 순번이었고 문항 순번은 오른쪽에 따로 섰는데, 한 줄에 숫자 쌍이 둘이라
 * 어느 것이 지금 나의 위치인지가 읽히지 않았습니다.
 *
 * **문항 0개는 오류가 아닙니다.** 그때는 순번이 없으므로 `progressLabel`이 없고 채움도
 * 0입니다. 나머지 데이터 오류(음수 순번 · 범위 밖 순번 · 정수가 아닌 값)는 숨기지 않고
 * 던집니다 — 값으로 표현할 수 있는 상태가 아닙니다.
 *
 * 채움은 현재 문항의 순번 / 실제 문항 수입니다. 완료 화면은 문항이 아니므로
 * 분모에 포함하지 않습니다. 첫 문항은 1/N, 마지막 문항은 N/N으로 이미 100%입니다.
 */
export function learningSessionHeader(
  form: LearningActivityForm,
  questionIndex: number,
  questionCount: number,
  copy: UiCopy,
  formLabelOverride?: string,
): LearningSessionHeader {
  const formLabel = formLabelOverride ?? formLabels[form];
  if (!Number.isInteger(questionCount) || questionCount < 0) {
    throw new Error(`활동의 문항 수는 0 이상의 정수여야 합니다: ${questionCount}`);
  }
  if (questionCount === 0) {
    return {
      progressLabel: undefined,
      formLabel,
      fillPercent: 0,
      accessibilityLabel: copy.learningShell.headerNoQuestions(formLabel),
    };
  }
  if (!Number.isInteger(questionIndex) || questionIndex < 0) {
    throw new Error(`문항 순번은 0 이상의 정수여야 합니다: ${questionIndex}`);
  }
  if (questionIndex >= questionCount) {
    throw new Error(`문항 순번이 문항 수를 넘습니다: ${questionIndex} / ${questionCount}`);
  }

  const ordinal = questionIndex + 1;

  return {
    progressLabel: `Lesson ${String(ordinal)} / ${String(questionCount)}`,
    formLabel,
    fillPercent: (ordinal / questionCount) * 100,
    accessibilityLabel: copy.learningShell.headerQuestionOf(formLabel, ordinal, questionCount),
  };
}

/** 카드 진행 막대의 칸 하나입니다 — 지난 칸 · 지금 칸 · 남은 칸입니다. */
export type LearningRunSegment = "done" | "current" | "upcoming";

/**
 * 세션 헤더 대신 서는 가벼운 헤더의 값입니다 — 칸마다 상태 하나, 그리고 캡션 겸 접근성 이름
 * (`Word 4 of 7`) 하나입니다. 칸 자체는 낭독에서 빠지고 이 이름이 같은 것을 말합니다.
 */
export type LearningRunProgress = {
  readonly segments: readonly LearningRunSegment[];
  readonly label: string;
};

/** 진행 바 채움의 클래스 문자열입니다. 동작 줄이기에서는 너비 전환을 끄는 변형 클래스가 붙습니다. */
export function learningProgressFillClassName(motion: Motion): string {
  const block = "learning-shell-progress-fill";
  return [block, motionClassName(block, motion)].filter(Boolean).join(" ");
}

/** 작업 영역 스크롤의 세 모드입니다. 불가능한 조합(스크롤이 꺼졌는데 fog가 선다)이 값으로 없습니다. */
export type LearningWorkspaceMode = "fixed" | "scroll" | "scroll-with-rest-fog";

export type LearningWorkspaceModeInput = {
  /** 껍데기의 `workspaceScrolls` 그대로입니다. */
  readonly scrolls: boolean;
  /** 액션 행이 서는가 — `actionLabel`과 `onAction`이 둘 다 있는가입니다. */
  readonly actionsShown: boolean;
};

/** 작업 영역 스크롤이 세 모드 가운데 어느 것인지 입력 둘에서 정합니다. */
export function learningWorkspaceMode({
  scrolls,
  actionsShown,
}: LearningWorkspaceModeInput): LearningWorkspaceMode {
  if (!scrolls) return "fixed";
  return actionsShown ? "scroll" : "scroll-with-rest-fog";
}

/** 껍데기 몸통(지시문 · 무대 · 작업 영역)이 흐르는 두 방식입니다. */
export type LearningShellFlow = "split" | "merged";

/** 작업 영역 스크롤의 높이가 이 값(레이아웃 px) 미만이면 합칩니다. */
export const learningShellMergeBelow = 96;

export type LearningShellFlowInput = {
  /** 지금의 흐름입니다. `merged`는 껍데기가 떠날 때까지 되돌아가지 않습니다. */
  readonly current: LearningShellFlow;
  readonly workspaceMode: LearningWorkspaceMode;
  /** `split`에서 잰 작업 영역 스크롤의 높이입니다(레이아웃 px). */
  readonly viewportHeight: number;
};

/**
 * 다음 흐름을 정합니다. 위에서부터 먼저 맞는 규칙 하나입니다 — 걸쇠(`merged`는 그대로),
 * 쓰기 제외(`fixed`), 못 잰 값(유한하지 않거나 음수), 문턱 미만, 그 밖.
 */
export function learningShellFlow({
  current,
  workspaceMode,
  viewportHeight,
}: LearningShellFlowInput): LearningShellFlow {
  if (current === "merged") return "merged";
  if (workspaceMode === "fixed") return "split";
  if (!Number.isFinite(viewportHeight) || viewportHeight < 0) return "split";
  return viewportHeight < learningShellMergeBelow ? "merged" : "split";
}

function heightIn(source: unknown): number | undefined {
  if (typeof source !== "object" || source === null) return undefined;
  const height = (source as { readonly height?: unknown }).height;
  if (typeof height !== "number" || !Number.isFinite(height) || height < 0) return undefined;
  return height;
}

/**
 * `layoutchange` 이벤트에서 높이를 읽습니다. `detail`이 먼저이고, 없으면 Android의 낡은
 * `params`로 내려갑니다. 0은 유효한 측정입니다. 읽을 수 없으면 `undefined`입니다.
 */
export function layoutHeightFrom(event: unknown): number | undefined {
  if (typeof event !== "object" || event === null) return undefined;
  const { detail, params } = event as { readonly detail?: unknown; readonly params?: unknown };
  return heightIn(detail) ?? heightIn(params);
}

export type LearningShellArrangement = "split" | "merged" | "card-scroll";

export type LearningShellArrangementInput = {
  /** 껍데기의 `scrollCard` 그대로입니다. */
  readonly scrollCard: boolean;
  readonly flow: LearningShellFlow;
};

/** 몸통의 배치를 정합니다. 말하기(`scrollCard`)는 흐름과 상관없이 카드 스크롤입니다. */
export function learningShellArrangement({
  scrollCard,
  flow,
}: LearningShellArrangementInput): LearningShellArrangement {
  if (scrollCard) return "card-scroll";
  return flow;
}

/** 껍데기가 지금 보이는 장면입니다 — 문항을 푸는 중인가, 활동을 끝내 완료 카드가 섰는가. */
export type LearningShellScene = "question" | "complete";

/** 껍데기의 `complete`를 장면으로 바꿉니다. */
export function learningShellScene(complete: boolean): LearningShellScene {
  return complete ? "complete" : "question";
}

/** 장면이 무대 · 합친 흐름 상자의 base 클래스 뒤에 더해 붙이는 클래스입니다. */
export type LearningShellSceneClasses = {
  readonly stage: readonly string[];
  readonly flow: readonly string[];
};

/** 완료 장면에서 무대 카드를 내용 높이로 두고 머리와 아래 버튼 사이 세로 가운데에 세우는 클래스입니다. */
export function learningShellSceneClasses(
  arrangement: LearningShellArrangement,
  scene: LearningShellScene,
): LearningShellSceneClasses {
  if (scene === "question") return { stage: [], flow: [] };
  if (arrangement === "split") {
    return {
      stage: ["learning-shell-stage-scene-complete", "learning-shell-stage-fill-rest"],
      flow: [],
    };
  }
  if (arrangement === "merged") {
    return {
      stage: ["learning-shell-stage-scene-complete", "learning-shell-stage-fill-flow"],
      flow: ["learning-shell-flow-fill-scroll"],
    };
  }
  return {
    stage: ["learning-shell-stage-scene-complete", "learning-shell-stage-fill-scroll"],
    flow: [],
  };
}

/** 해설 판의 낭독 이름입니다(제목 + 줄들, 빈 줄은 건너뜁니다). */
export function learningShellFeedbackLabel(feedback: LearningShellFeedback): string {
  const lines = feedback.lines.map((line) => line.text.trim()).filter((text) => text !== "");
  return [feedback.title, ...lines].join(", ");
}
