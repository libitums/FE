import type { ReactNode } from "@lynx-js/react";

import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { Fog } from "@libitums/ui-lynx/fog";

import { SyllableSlots } from "../../components/SyllableSlots";
import { WritingCanvas, type WritingCanvasBadge } from "../../components/WritingCanvas";
import { WritingPrompt } from "../../components/WritingPrompt";
import { useWritingPractice } from "../../components/use-writing-practice";
import type { AnswerResult } from "../../lib/answer-result";
import type { SafeAreaInsets } from "../../lib/safe-area";
import type { EpisodeFinalWritingQuestion } from "./episode-final.contract";
import { episodeFinalTestIds } from "./episode-final.contract";

export type FinalWritingPanelProps = {
  readonly insets: SafeAreaInsets;
  readonly question: EpisodeFinalWritingQuestion;
  /**
   * 마지막 음절의 `Next`에서 한 번 불립니다. 잰 음절이 없었으면 `null`이고, 그 문항은 결과에
   * 싣지 않습니다(말하기의 건너뛰기와 같은 규칙입니다).
   */
  readonly onDone: (result: AnswerResult | null) => void;
};

// 잴 수 없을 때 캔버스 위에 서는 한 줄입니다. 이 화면의 다른 문구(`Say` · `Speak` · `Next`)와
// 같이 영어입니다(2026-09-28 결정).
const unmeasurableNotice = "Writing can't be checked here. Tap Next.";

/**
 * 쓰기 문항입니다(Figma 79-6378). 서사 장면 위의 어두운 반투명 패널(말하기 패널과 같은 면)에
 * `Write` 표식 · 빈칸 문장 · 음절 칸 · 쓰기 캔버스가 서고, 아래 포그 위에 주 버튼이 섭니다.
 * 디자인은 흰 시트를 깔지만 최종 테스트의 다른 문항처럼 장면 위 패널로 둡니다(2026-09-29 결정) —
 * 빈칸 앞 글자는 패널 위에서 읽히도록 밝은 글자(`tone="scene"`)입니다. 빈칸의 음절을 하나씩 — 흐린 안내 위에 쓰고
 * `Check`로 견주고, 판정을 본 뒤 `Next`로 다음 음절로 갑니다. 마지막 음절의 `Next`가 문항을
 * 끝냅니다.
 *
 * 다른 문항과 달리 판정 뒤 저절로 넘어가지 않습니다 — 음절마다 판정이 서고, 틀리면 다시 쓸 수
 * 있어(캔버스의 `다시 쓰기`) 학습자가 언제 넘어갈지를 고릅니다. 디자인의 `Next →`가 그 자리입니다.
 */
export function FinalWritingPanel({ insets, question, onDone }: FinalWritingPanelProps): ReactNode {
  const practice = useWritingPractice({ question, size: "stage", onQuestionDone: onDone });
  const { state } = practice;

  // 주 버튼 — 쓰는 중에 획이 있으면 `Check`, 판정 · 잴 수 없음 뒤면 `Next`입니다. 빈 판과 재는
  // 중에는 없습니다 — 누를 수 없는 버튼을 두지 않습니다(ADR-0016 D10).
  const action =
    practice.check !== null
      ? { label: "Check", run: practice.check, icon: undefined }
      : practice.next !== null
        ? { label: "Next", run: practice.next, icon: arrowRight }
        : null;

  const badge: WritingCanvasBadge =
    state.phase === "judged" && state.verdict !== null
      ? { kind: "verdict", result: state.verdict }
      : state.phase === "unmeasurable"
        ? { kind: "notice", text: unmeasurableNotice }
        : { kind: "none" };

  return (
    <view
      className="episode-final-writing"
      data-testid={episodeFinalTestIds.writing}
      data-phase={state.phase}
    >
      <view className="episode-final-writing-body">
        {/* `Say`와 같은 모양의 표식입니다 — 이 문항이 무엇을 하라는지 한 낱말로 말합니다. */}
        <view className="episode-final-say">
          <text className="episode-final-say-label">Write</text>
        </view>
        <WritingPrompt question={question} tone="scene" />
        <SyllableSlots syllables={question.syllables} currentIndex={state.syllableIndex} />
        {practice.syllable === null ? null : (
          <WritingCanvas
            size="stage"
            glyph={practice.syllable}
            guide={practice.guide}
            strokes={state.strokes}
            badge={badge}
            erase={practice.erase}
            onStrokeComplete={practice.addStroke}
          />
        )}
      </view>
      {/* 아래 버튼은 캔버스 위에 떠 있고 뒤에 포그를 깝니다. 포그는 자식을 받지 않아 버튼과 형제로 두고, DOM에서 버튼을 뒤에 두어
          버튼이 포그 위에 섭니다. 버튼이 없어도 포그 · 여백은 남아 판이 움직이지 않습니다. */}
      <view className="episode-final-writing-footer">
        <view className="episode-final-writing-fog" event-through={true}>
          {/* 어두운 패널 위의 어두운 포그입니다(Figma 80:6794 — 어두운 포그 + 주색 `Next`). */}
          <Fog direction="bottom" size="full" color="dark" />
        </view>
        <view className="episode-final-writing-action-slot">
          {action === null ? null : (
            <view data-testid={episodeFinalTestIds.writingAction}>
              <Button
                label={action.label}
                variant="brand"
                size="xl"
                width="fill"
                icon={action.icon}
                iconPosition="trailing"
                bindtap={action.run}
              />
            </view>
          )}
        </view>
        {/* 홈 인디케이터 몫입니다. 인라인 여백은 CSS 여백을 덮어써 상자로 둡니다. */}
        <view style={{ height: `${insets.bottom}px` }} />
      </view>
    </view>
  );
}
