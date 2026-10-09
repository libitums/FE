import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";
import type { Motion } from "@libitums/ui-lynx/motion";

import { questionTransitionClassName, type QuestionTransitionPhase } from "./question-transition";

export type LearningShellBodyProps = {
  readonly card: ReactNode;
  readonly workspace: ReactNode | undefined;
  readonly scrollCard: boolean;
  readonly workspaceScrolls: boolean;
  /** 문항 전환의 현재 단계와 모션 모드입니다. idle이면 전환 클래스 · 속성이 붙지 않습니다. */
  readonly transition: { readonly phase: QuestionTransitionPhase; readonly motion: Motion };
};

/**
 * 가운데 카드(무대)와 카드 밖 작업 영역의 배치입니다. 문항이 바뀔 때의 전환 클래스와
 * 속성은 이 둘에만 붙습니다 — 헤더 · 지시문 · 액션 · 넘김 층은 이 밖에 있어 움직이지
 * 않습니다. 카드 스크롤 모드에서는 바깥 스크롤 뷰가 전환을 지고 안쪽 무대는 기본 클래스만
 * 가집니다.
 */
export function LearningShellBody({
  card,
  workspace,
  scrollCard,
  workspaceScrolls,
  transition,
}: LearningShellBodyProps): ReactNode {
  const { phase, motion } = transition;
  const attrs = {
    ...(phase === "idle" ? {} : { "data-page": phase }),
    ...(motion === "reduced" && phase !== "idle" ? { "data-motion": "reduced" } : {}),
  };

  const stage = (
    <view
      className={
        scrollCard
          ? "learning-shell-stage"
          : questionTransitionClassName("learning-shell-stage", [], phase, motion)
      }
      data-testid="learning-shell-stage"
      {...(scrollCard ? {} : attrs)}
    >
      <Card elevation="stage">
        <Card.Content>{card}</Card.Content>
      </Card>
    </view>
  );

  if (scrollCard) {
    return (
      <scroll-view
        className={questionTransitionClassName(
          "learning-shell-scroll",
          ["learning-shell-card-scroll"],
          phase,
          motion,
        )}
        data-testid="learning-shell-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
        {...attrs}
      >
        {stage}
        {workspace}
      </scroll-view>
    );
  }

  return (
    <>
      {stage}
      {workspace === undefined ? null : (
        <scroll-view
          className={questionTransitionClassName("learning-shell-scroll", [], phase, motion)}
          data-testid="learning-shell-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={true}
          enable-scroll={workspaceScrolls ? undefined : false}
          {...attrs}
        >
          {workspace}
        </scroll-view>
      )}
    </>
  );
}
