import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import type { LearningRunProgress } from "./learning-shell.contract";
import { useUiCopy } from "../../lib/ui-copy";

import "./learning-run-header.css";

// 세션 헤더 대신 서는 가벼운 헤더입니다 — `×` · 칸 막대 · 캡션(`Word 4 of 7`).
//
// ⟨2026-10-19⟩ 단어 카드 구간을 위해 생겼습니다(ADR-0073). 카드는 문제가 아니라서 `Lesson n / N`
// 상자를 세우면 「문제를 풀고 있다」로 읽히고, 카드 수만큼 카운터가 부풀었습니다. 그래서 카드 구간은
// 회색 상자 없이 칸 막대 하나로 「몇 장 중 몇 장째」만 말합니다.
//
// **상태가 없습니다.** 나가기를 누르면 무엇이 일어나는지(두 걸음 확인)는 껍데기가 정합니다 — 이 조각은
// 눌렸다는 것만 올려 보냅니다. 막대는 낭독에서 빼고, 같은 것을 말하는 이름(`Word 4 of 7`)을 막대와
// 캡션을 묶은 한 요소에 답니다 — 칸 일곱 개를 하나씩 읽히게 하지 않기 위해서입니다.

export type LearningRunHeaderProps = {
  readonly progress: LearningRunProgress;
  readonly onExit: () => void;
};

export function LearningRunHeader({ progress, onExit }: LearningRunHeaderProps): ReactNode {
  const copy = useUiCopy();

  const handleExit = () => {
    "background only";
    onExit();
  };

  return (
    <view className="learning-run-header" data-testid="learning-run-header">
      <view
        className="learning-run-header-exit"
        data-testid="learning-run-header-exit"
        accessibility-element={true}
        accessibility-label={copy.learningShell.exitLesson}
        accessibility-traits="button"
        bindtap={handleExit}
      >
        <svg
          className="learning-run-header-exit-icon"
          content={cross}
          current-color={color.gray[700]}
        />
      </view>
      <view
        className="learning-run-header-progress"
        data-testid="learning-run-header-progress"
        accessibility-element={true}
        accessibility-label={progress.label}
      >
        <view
          className="learning-run-header-bar"
          data-testid="learning-run-header-bar"
          accessibility-elements-hidden={true}
        >
          {progress.segments.map((state, index) => (
            <view
              key={index}
              className={`learning-run-header-segment learning-run-header-segment-${state}`}
              data-testid={`learning-run-header-segment-${String(index)}`}
              data-state={state}
            />
          ))}
        </view>
        {/* 캡션은 왼쪽 한 낱말뿐입니다 — 오른쪽 자리(이미 아는 수)는 사용자 결정으로 걷었습니다. */}
        <text className="learning-run-header-caption" data-testid="learning-run-header-caption">
          {progress.label}
        </text>
      </view>
    </view>
  );
}
