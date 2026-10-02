import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import type { AnswerResult } from "../lib/answer-result";
import { playSound } from "../lib/sound-effects";
import { useUiCopy } from "../lib/ui-copy";

import "./answer-verdict.css";

// 판정 배지입니다(Figma 53-14231의 79-6138 · 65-327). **무대 카드 안**에 섭니다 — 학습
// 내용이 전개되는 그 자리에서 성공 · 실패가 뒤집힌다는 것이 학습 화면 구조의 핵심입니다.
//
// ⟨2026-09-28⟩ 듣기의 것이었다가 `components/`로 올라왔습니다 — 낱말 고르기 · 문장
// 만들기도 같은 배지를 씁니다(ADR-0008: 화면 둘 이상이 쓰면 공용).
//
// **낱말은 한국어입니다.** 낱말 고르기 디자인은 `Correct!`(영문)인데 따르지 않았습니다 —
// 같은 판정을 화면마다 다른 낱말로 배우게 되고, 학습자가 배우는 중인 언어가 한국어라
// 판정은 모국어로 주는 것이 낫습니다.
//
// 보기의 표식(✓ · ✗)이 걷히면서 **보이는 판정 채널이 이것 하나가 됐습니다.** 그래서
// 채널을 셋으로 둡니다: 아이콘 모양 · 면 색 · 낱말. 색만으로 가르지 않습니다
// (WCAG 1.4.1) — 아이콘이 크기를 못 받아 안 보여도 낱말이 남고, 색을 못 가려도
// 모양이 갈립니다.

const iconByResult: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// 면 색입니다. 흰 잉크가 올라가므로 `-text` 변형이 아니라 면 변형을 씁니다 —
// `feedback.correct`(#35A66F)가 디자인 값이고 흰 글자가 그 위에서 3.28:1입니다.
// ⚠ 알려진 대비 위반: WCAG 1.4.3의 4.5:1에 미달합니다. 같은 화면의 `시작` · 아래
// 버튼과 같은 갈래로 디자인 값을 따르기로 한 자리이고, 되돌릴 때 갈 곳은 각 색의
// `-text` 변형(6.90 / 6.76)입니다.
const surfaceByResult: Record<AnswerResult, string> = {
  correct: color.feedback.correct,
  incorrect: color.feedback.incorrect,
};

export type AnswerVerdictProps = {
  result: AnswerResult;
};

export function AnswerVerdict({ result }: AnswerVerdictProps): ReactNode {
  const copy = useUiCopy();
  useEffect(() => {
    playSound(result === "correct" ? "correct_answer" : "wrong_answer");
  }, [result]);
  return (
    <view
      className="answer-verdict"
      data-testid="answer-verdict"
      data-result={result}
      // 면 색이 판정마다 갈리는 값이라 인라인 스타일이 집니다 — 상태 클래스를 만들면
      // ADR-0003 D7의 예약 상태어가 늘어납니다.
      //
      // 단축(`background`)이 아니라 홑(`backgroundColor`)입니다. 단축은 적지 않은
      // 나머지 배경 속성까지 초기값으로 되돌리므로, 나중에 클래스가 배경에 무엇을
      // 더하면 이 줄이 그것을 조용히 지웁니다. 여기서 정하는 것은 색 하나뿐입니다.
      style={{ backgroundColor: surfaceByResult[result] }}
      // 하나의 접근성 요소입니다. 조작 단위가 아니므로 traits를 주지 않습니다 —
      // 누를 수 없는 것을 button으로 읽히게 하지 않습니다.
      accessibility-element={true}
      accessibility-label={copy.common.answerResult[result]}
    >
      {/* 아이콘은 장식이 아니라 채널이지만 이름은 감싼 상자가 집니다(ADR-0016 D5).
          자손 없는 잎이라 가림 속성을 붙이지 않습니다 — 붙여도 가릴 자손이 없습니다. */}
      <svg
        className="answer-verdict-icon"
        data-testid="answer-verdict-icon"
        content={iconByResult[result]}
        current-color={color.fg["neutral-inverted"]}
      />
      <text className="answer-verdict-label">{copy.common.answerResult[result]}</text>
    </view>
  );
}
