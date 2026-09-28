// 학습 껍데기의 세션 헤더가 내는 값들을 뽑습니다. 화면이 계산식을 들고 있지 않도록
// 여기 모읍니다 — 같은 수에서 낱말 셋(순번 · 백분율 · 접근성 이름)과 막대가 나옵니다.

import type { LearningForm } from "../../lib/learning-form";

/**
 * 세션 헤더에 서는 학습형 이름입니다. 영문인 것은 디자인(Figma 65-14)의 어휘이고,
 * 에피소드 헤더(`Episode 0.` · `Tutorial.`) · 말풍선(`Lesson 1:`)과 같은 갈래입니다 —
 * 메타 문구는 영문, 학습 내용은 한국어입니다.
 */
const formLabels: Record<LearningForm, string> = {
  listening: "Listening",
  "sentence-order": "Word order",
  "word-choice": "Word choice",
  culture: "Culture",
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
export function learningTimingFlag(form: LearningForm): string {
  return `libitum:navigation:learning-${form}`;
}

export type LearningSessionHeader = {
  /** `Lesson 1 / 3` — 이 활동 안에서 지금 몇 번째 문항인가입니다. */
  readonly progressLabel: string;
  readonly formLabel: string;
  readonly fillPercent: number;
  readonly accessibilityLabel: string;
};

/**
 * 문항 순번(0부터)과 활동의 전체 문항 수에서 세션 헤더의 값을 뽑습니다. 데이터 오류는
 * 숨기지 않고 던집니다 — 문항이 0개인 활동이나 범위 밖 순번은 값으로 표현할 수 있는
 * 상태가 아닙니다.
 *
 * ⟨2026-09-28⟩ **세는 단위가 활동에서 문항으로 갈렸습니다.** 전에는 `Chapter n / N`이
 * 유닛 안의 활동 순번이었고 문항 순번은 오른쪽에 따로 섰는데, 한 줄에 숫자 쌍이 둘이라
 * 어느 것이 지금 나의 위치인지가 읽히지 않았습니다. 사용자가 실제로 세는 것은 문항이므로
 * 그것 하나만 남깁니다.
 *
 * 채움은 **끝낸 문항 수**를 셉니다. 지금 푸는 문항은 아직 안 끝났으므로 순번이 곧 끝낸
 * 수입니다 — 첫 문항에서 0%, 마지막 문항에서 (N-1)/N입니다. 100%는 활동을 마쳤을 때만
 * 나옵니다. **백분율 낱말은 내지 않습니다** — 막대가 이미 같은 것을 말하고, 숫자가 둘이면
 * 또 「어느 것을 보나」가 생깁니다.
 */
export function learningSessionHeader(
  form: LearningForm,
  questionIndex: number,
  questionCount: number,
): LearningSessionHeader {
  if (!Number.isInteger(questionCount) || questionCount <= 0) {
    throw new Error(`활동의 문항 수는 1 이상의 정수여야 합니다: ${questionCount}`);
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
    formLabel: formLabels[form],
    fillPercent: (questionIndex / questionCount) * 100,
    accessibilityLabel: `${formLabels[form]}, 문항 ${String(questionCount)}개 중 ${String(ordinal)}번째`,
  };
}
