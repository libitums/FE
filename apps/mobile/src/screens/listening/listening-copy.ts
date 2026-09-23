// 듣기 학습 화면에 나가는 문자열과 발화 문구를 소유합니다. UI를 import하지
// 않습니다.

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";

// `${ordinal}단계 · 듣기` — 구분자는 가운뎃점 양옆 공백입니다.
export function listeningScreenTitle(ordinal: number): string {
  return `${ordinal}단계 · 듣기`;
}

// `문항 ${index + 1} / ${total}` — index는 0-based입니다.
export function questionProgressLabel(index: number, total: number): string {
  return `문항 ${index + 1} / ${total}`;
}

// 접미사는 lib/answer-result.ts의 answerResultLabel이 냅니다. 구분자는
// 쉼표 + 공백입니다(ADR-0016 D3). 판정이 **없는** 경우는 접미사를 붙이지
// 않습니다 — 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는
// 것이 됩니다.
export function choiceAccessibilityLabel(text: string, result: AnswerResult | null): string {
  if (result === null) {
    return text;
  }
  return `${text}, ${answerResultLabel(result)}`;
}

// ---------------------------------------------------------------- 완료 전이 발화

/** 종료 상태 문구입니다. 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 자리**에서 납니다(ADR-0016 D11-1). */
export const listeningCompletionText = "문항을 모두 마쳤어요";

/** 완료 상태에서 화면에 남는 **유일한 조작 단위**의 라벨입니다. 이 화면에서는 `결과 보기`입니다. */
export const listeningFinishLabel = "결과 보기";

/**
 * 완료 전이의 발화 문자열입니다. 구분자는 쉼표+공백 — D3이 고른 부호를 그대로
 * 씁니다(`평가 결과, 통과` · `채점 결과, 정답`과 같은 형태).
 *
 * 인자는 **완료 상태에서 유일한 조작 단위의 라벨**입니다. 발화는 떠다니므로
 * *무엇이* 끝났는지(앞절)와 *이제 무엇이 남았는지*(뒷절)가 소리 안에 있어야
 * 합니다.
 *
 * 앞절은 리터럴을 다시 적지 않고 `listeningCompletionText`를 지납니다 —
 * 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 표를 지납니다.**
 */
export function listeningCompletionAnnouncement(nextActionLabel: string): string {
  return `${listeningCompletionText}, ${nextActionLabel}`;
}
