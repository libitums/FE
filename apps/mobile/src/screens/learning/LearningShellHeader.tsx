import type { ReactNode } from "@lynx-js/react";

import type { LearningActivityForm } from "../../lib/learning-form";
import { LearningRunHeader } from "./LearningRunHeader";
import { LearningSessionHeader } from "./LearningSessionHeader";
import type { LearningRunProgress } from "./learning-shell.contract";

// 학습 껍데기의 헤더 자리입니다 — 세션 헤더(`Lesson n / N` 상자) 아니면 가벼운 헤더(칸 막대) 하나가
// 섭니다. 둘이 함께 서는 일은 없습니다.
//
// ⟨2026-10-19⟩ 껍데기에서 떼어냈습니다. 헤더가 둘로 갈리면서 껍데기가 300줄 한도를 넘었고, 이 자리는
// 「무엇을 세우나」만 정하는 덩어리라 따로 두는 편이 읽기에도 낫습니다.

export type LearningShellHeaderProps = {
  readonly form: LearningActivityForm;
  readonly questionIndex: number;
  readonly questionCount: number;
  readonly runProgress: LearningRunProgress | undefined;
  readonly onExit: () => void;
  readonly formLabel?: string | undefined;
};

export function LearningShellHeader({
  form,
  questionIndex,
  questionCount,
  runProgress,
  onExit,
  formLabel,
}: LearningShellHeaderProps): ReactNode {
  // 가벼운 헤더는 스스로 층(`z-index`)을 가집니다 — 회색 상자를 감싸는 층이 필요 없습니다.
  if (runProgress !== undefined) {
    return <LearningRunHeader progress={runProgress} onExit={onExit} />;
  }
  // 세션 헤더 — 나가기 · 순번 · 진행 막대 · 학습형 이름입니다. 면 · 모서리 · 안 여백은 ui-lynx
  // `Card`(회색 면 · 그림자 없음)가 집니다. 막대는 값이라 낱말 둘을 한 접근성 요소로 묶고 막대 자신은
  // 트리에서 뺍니다.
  //
  // 상자로 감싸는 것은 스스로 넘어가는 층(`-advance`)보다 위에 서야 `×`로 나가는 길이 막히지 않아서입니다.
  return (
    <view className="learning-shell-session-layer">
      <LearningSessionHeader
        form={form}
        questionIndex={questionIndex}
        questionCount={questionCount}
        onExit={onExit}
        {...(formLabel === undefined ? {} : { formLabel })}
      />
    </view>
  );
}
