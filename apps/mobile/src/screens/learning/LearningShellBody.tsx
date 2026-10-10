import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";

import { LearningShellWorkspace } from "./LearningShellWorkspace";
import type { LearningShellArrangement, LearningWorkspaceMode } from "./learning-shell.contract";
import {
  questionTransitionAttributes,
  questionTransitionClassName,
  type QuestionTransition,
} from "./question-transition";

export type LearningShellBodyProps = {
  readonly arrangement: LearningShellArrangement;
  /** 완료 화면이면 `undefined`입니다 — 지시문을 그리지 않습니다. */
  readonly instruction: string | undefined;
  /** 가운데 카드 안입니다. 무대 상자(`learning-shell-stage`)는 이 컴포넌트가 만듭니다. */
  readonly card: ReactNode;
  readonly workspace: ReactNode | undefined;
  readonly workspaceMode: LearningWorkspaceMode;
  readonly onViewportHeight: (height: number) => void;
  /** 문항 전환의 현재 단계와 모션 모드입니다. idle이면 전환 클래스 · 속성이 붙지 않습니다. */
  readonly transition: QuestionTransition;
};

/**
 * 지시문 · 무대 · 작업 영역을 배치에 맞게 놓습니다. 판정하지 않습니다.
 *
 * 문항이 바뀔 때의 전환 클래스와 속성은 **스크롤 밖에 선 상자 하나**가 집니다. 나뉜 배치
 * (`split`)에서는 무대와 작업 영역 스크롤이 각각 지고, 무대가 스크롤 안에 드는 카드 스크롤
 * (`card-scroll`)과 합친 흐름(`merged`)에서는 바깥 스크롤이 지며 안쪽 무대는 기본 클래스만
 * 가집니다. 헤더 · 액션 · 넘김 층은 이 밖에 있어 움직이지 않습니다.
 */
export function LearningShellBody({
  arrangement,
  instruction,
  card,
  workspace,
  workspaceMode,
  onViewportHeight,
  transition,
}: LearningShellBodyProps): ReactNode {
  // 전환 속성은 스프레드로 둡니다(idle이면 속성 자체가 없다). `<scroll-view>`에서는 스프레드가
  // `scroll-bar-enable={false}`보다 앞에 와야 lint:scroll-bars를 지납니다(ADR-0055 D1).
  const attributes = questionTransitionAttributes(transition);
  const stageCarriesTransition = arrangement === "split";
  const stage = (
    <view
      className={
        stageCarriesTransition
          ? questionTransitionClassName(
              "learning-shell-stage",
              [],
              transition.phase,
              transition.motion,
            )
          : "learning-shell-stage"
      }
      data-testid="learning-shell-stage"
      {...(stageCarriesTransition ? attributes : {})}
    >
      <Card elevation="stage">
        <Card.Content>{card}</Card.Content>
      </Card>
    </view>
  );

  const instructionNode =
    instruction === undefined ? null : (
      <text className="learning-shell-instruction" data-testid="learning-shell-instruction">
        {instruction}
      </text>
    );

  if (arrangement === "card-scroll") {
    return (
      <>
        {instructionNode}
        <scroll-view
          {...attributes}
          className={questionTransitionClassName(
            "learning-shell-scroll",
            ["learning-shell-card-scroll"],
            transition.phase,
            transition.motion,
          )}
          data-testid="learning-shell-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          {stage}
          {workspace}
        </scroll-view>
      </>
    );
  }

  if (arrangement === "merged") {
    return (
      <LearningShellWorkspace
        mode={workspaceMode}
        content="body"
        onViewportHeight={onViewportHeight}
        transition={transition}
      >
        <view className="learning-shell-flow" data-testid="learning-shell-flow">
          {instructionNode}
          {stage}
          {workspace}
        </view>
      </LearningShellWorkspace>
    );
  }

  return (
    <>
      {instructionNode}
      {stage}
      {workspace === undefined ? null : (
        <LearningShellWorkspace
          mode={workspaceMode}
          content="workspace"
          onViewportHeight={onViewportHeight}
          transition={transition}
        >
          {workspace}
        </LearningShellWorkspace>
      )}
    </>
  );
}
