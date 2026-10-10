import type { ReactNode } from "@lynx-js/react";
import { Fog } from "@libitums/ui-lynx/fog";

import { layoutHeightFrom } from "./learning-shell.contract";
import type { LearningWorkspaceMode } from "./learning-shell.contract";
import { learningShellScrollId } from "./learning-shell-scroll";
import {
  questionTransitionAttributes,
  questionTransitionClassName,
  type QuestionTransition,
} from "./question-transition";

export type LearningShellWorkspaceProps = {
  readonly mode: LearningWorkspaceMode;
  /** 스크롤이 담는 것 — 작업 영역만(`split`)인가 몸통 전체(`merged`)인가입니다. */
  readonly content: "workspace" | "body";
  /** 스크롤 상자의 높이가 정해지거나 바뀔 때마다 부릅니다(레이아웃 px). */
  readonly onViewportHeight: (height: number) => void;
  /** 문항 전환의 현재 단계입니다. 이 스크롤 상자가 전환 클래스 · 속성을 집니다. */
  readonly transition: QuestionTransition;
  readonly children: ReactNode;
};

/**
 * 학습 껍데기 기본 가지의 스크롤입니다. 액션 행이 없는 동안(`scroll-with-rest-fog`)에는
 * 스크롤 내용 끝에 끝 상자를, 껍데기 루트 기준 아래에 fog 상자를 함께 세웁니다 — 둘은
 * 같은 모드에서만 서므로 따로 켜고 끄지 않습니다.
 *
 * `content="workspace"`는 작업 영역만 담고 높이를 보고합니다. `content="body"`는 몸통 전체를
 * 담으며 높이를 보고하지 않습니다(그 높이는 판정의 입력이 아닙니다).
 */
export function LearningShellWorkspace({
  mode,
  content,
  onViewportHeight,
  transition,
  children,
}: LearningShellWorkspaceProps): ReactNode {
  const restFog = mode === "scroll-with-rest-fog";
  const merged = content === "body";
  // 전환 속성은 스프레드로 둡니다(idle이면 속성 자체가 없다). 스프레드는 `scroll-bar-enable={false}`보다
  // 앞에 와야 lint:scroll-bars를 지납니다(ADR-0055 D1).
  const attributes = questionTransitionAttributes(transition);

  const handleLayoutChange = (event: unknown): void => {
    "background only";
    const height = layoutHeightFrom(event);
    if (height !== undefined) {
      onViewportHeight(height);
    }
  };

  return (
    <>
      <scroll-view
        {...attributes}
        className={questionTransitionClassName(
          "learning-shell-scroll",
          merged ? ["learning-shell-card-scroll", "learning-shell-body-scroll"] : [],
          transition.phase,
          transition.motion,
        )}
        id={learningShellScrollId}
        data-testid="learning-shell-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        enable-scroll={mode === "fixed" ? false : undefined}
        bindlayoutchange={merged ? undefined : handleLayoutChange}
      >
        {children}
        {restFog ? (
          <view className="learning-shell-scroll-end" data-testid="learning-shell-scroll-end" />
        ) : null}
      </scroll-view>
      {restFog ? (
        <view
          className="learning-shell-rest-fog"
          data-testid="learning-shell-rest-fog"
          user-interaction-enabled={false}
        >
          <Fog direction="bottom" size="full" color="surface-default" />
        </view>
      ) : null}
    </>
  );
}
