// 미션 턴의 교정 카드 — 고치기(correction · l1_to_ko)와 더 나은 표현(better, ADR-0193 D15). 대본형 롤플레이의 판정 패널과 같은 말로
// 그립니다(ADR-0201 D6 적용 2): 결과 머리(표 · 제목) · 정답 상자(`RoleplayAnswerBox` — 고친 문장이 주인공, 바뀐 낱말 주황 밑줄 ·
// 로마자 · 뜻) · 고친 곳 한 줄. 제목 낱말은 메신저 교정과 같은 문구(FIX · IN KOREAN · MORE NATURAL, 파이프라인 문서 §10.3 1)이고,
// 고치기는 대본형 오답과 같은 ✕ 표 · 빨간 제목, 더 나은 표현은 대본형 close와 같은 ✓ 표 · 초록 제목에 점선 상자입니다.
// 미션은 대화가 이어지므로 Try again · Next를 두지 않고, 소리 단추도 없습니다(서버는 앱이 보낸 글을 합성하지 않음).

import type { ReactNode } from "@lynx-js/react";

import check from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { romanizeKorean } from "../../lib/korean-romanize";
import { wordDiff } from "../../lib/syllable-diff";
import { useUiCopy } from "../../lib/ui-copy";
import type { ChatCorrection } from "../messenger-chat/chat-feedback.contract";
import { correctionSpoken } from "../messenger-chat/chat-feedback-rules";
import { RoleplayAnswerBox } from "../roleplay-story/RoleplayAnswerBox";
import { missionTestIds as ids } from "./mission-test-ids";

import "../roleplay-story/roleplay-story-screen.css";
import "./roleplay-mission-voice.css";

export type MissionFeedbackCardProps = {
  /** 학습자가 보낸 글 — 고친 문장에서 바뀐 낱말을 가려 밑줄을 긋습니다. */
  readonly original: string;
  readonly correction: ChatCorrection;
};

/** 카드에 보일 문장 · 뜻 · 고친 곳 줄 — 더 나은 표현은 `better`(있으면), 아니면 고친 문장. */
export function missionFeedbackOf(correction: ChatCorrection): {
  readonly sentence: string;
  readonly meaning: string | null;
  readonly notes: readonly string[];
} {
  if (correction.kind === "better") {
    const better = correction.better;
    return {
      sentence: better?.text ?? correction.corrected,
      meaning: better?.meaning ?? correction.meaning,
      notes: [better?.explanation ?? correction.items[0]?.reason ?? ""].filter((n) => n !== ""),
    };
  }
  return {
    sentence: correction.corrected,
    meaning: correction.meaning,
    notes: correction.items.map((item) => `${item.original} → ${item.corrected} · ${item.reason}`),
  };
}

export function MissionFeedbackCard({ original, correction }: MissionFeedbackCardProps): ReactNode {
  const feedback = useUiCopy().messengerChat.feedback;
  const better = correction.kind === "better";
  const { sentence, meaning, notes } = missionFeedbackOf(correction);
  const testId = better ? ids.betterCard : ids.fixCard;
  const diff = wordDiff(original, sentence);
  // 영어로만 말한 글(l1_to_ko)은 낱말을 견줄 것이 없어 밑줄을 긋지 않습니다.
  const answer =
    correction.kind === "l1_to_ko" ? [{ text: sentence, differs: false }] : diff.expected;
  return (
    <view
      className={`mission-feedback mission-feedback-${better ? "better" : "fix"}`}
      data-testid={testId}
      data-kind={correction.kind}
      flatten={false}
      accessibility-element={true}
      accessibility-label={correctionSpoken(correction, feedback)}
    >
      <view className="roleplay-story-result-head">
        <view
          className={`roleplay-story-result-mark roleplay-story-result-mark-${better ? "correct" : "incorrect"}`}
        >
          <svg
            className="roleplay-story-result-icon"
            content={better ? check : cross}
            current-color={better ? color.white : color.feedback.incorrect}
          />
        </view>
        <text
          className={`roleplay-story-result-title roleplay-story-result-title-${better ? "correct" : "incorrect"}`}
          data-testid={`${testId}-title`}
        >
          {feedback.titles[correction.kind]}
        </text>
      </view>
      <RoleplayAnswerBox
        testId={`${testId}-answer`}
        answer={answer}
        roman={romanizeKorean(sentence)}
        meaning={meaning}
      />
      {notes.map((note, index) => (
        <text key={String(index)} className="mission-feedback-note" data-testid={`${testId}-note`}>
          {note}
        </text>
      ))}
    </view>
  );
}
