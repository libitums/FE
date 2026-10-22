import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";
import { Dialog } from "@libitums/ui-lynx/dialog";
import { LearningShellActions } from "./LearningShellActions";
import { LearningShellBody } from "./LearningShellBody";
import { useLearningShellFlow } from "./use-learning-shell-flow";
import { useLearningDensity } from "./use-learning-density";
import { useQuestionTransition } from "./use-question-transition";
import {
  learningShellArrangement,
  learningShellScene,
  learningTimingFlag,
  learningWorkspaceMode,
} from "./learning-shell.contract";
import { LearningShellHeader } from "./LearningShellHeader";
import type { LearningShellProps } from "./learning-shell-props";
import { scrollLearningShellToTop, useLearningShellScrollReset } from "./learning-shell-scroll";
import { useUiCopy } from "../../lib/ui-copy";
import { playSound } from "../../lib/sound-effects";
import { useLayerBack, useScreenBack } from "../../lib/use-back-handler";

import "./learning-shell.css";

export type { LearningShellProps, LearningShellStage } from "./learning-shell-props";

/**
 * 학습 화면의 고정 뼈대입니다(Figma 65-14). 활동이 바뀌어도 이 뼈대는 그대로이고,
 * **가운데 카드 안만** 갈립니다 — 학습 내용이 거기서 전개되고 성공 · 실패 판정도
 * 거기서 뒤집힙니다.
 *
 * 위에서 아래로 상단 바 · 세션 헤더 · 지시문 · 가운데 카드 · 작업 영역 · 아래 버튼이고,
 * 낭독 순서가 곧 DOM 순서입니다.
 *
 * 껍데기는 정답 판정 없이 활동의 카드와 완료 여부를 받아 그립니다.
 */
export function LearningShell({
  form,
  questionIndex,
  questionCount,
  complete = false,
  instruction,
  onExit,
  card,
  workspace,
  workspaceScrolls = true,
  scrollCard = false,
  stage = "card",
  secondaryAction,
  actionLabel,
  onAction,
  actionSound = "button",
  advance,
  obscured,
  runProgress,
  actionButton,
  verdict,
  feedback,
  actionPlacement = "floating",
  densityOverride,
}: LearningShellProps): ReactNode {
  const copy = useUiCopy();
  const deviceDensity = useLearningDensity();
  const density = densityOverride ?? deviceDensity;
  const actionsShown =
    actionButton !== undefined || (actionLabel !== undefined && onAction !== undefined);
  const workspaceMode = learningWorkspaceMode({ scrolls: workspaceScrolls, actionsShown });
  const { flow, reportViewportHeight } = useLearningShellFlow(workspaceMode);
  const arrangement = learningShellArrangement({ scrollCard, flow });
  useLearningShellScrollReset({
    arrangement,
    questionIndex,
    complete,
    // 넘김 걸음이 생기거나 판정 · 해설 판이 서는 순간이 「답한 순간」입니다.
    answered: advance !== undefined || verdict !== undefined || feedback !== undefined,
  });
  // 나가기는 **두 걸음**입니다 ⟨2026-09-28⟩. `×`는 묻기만 하고, 실제로 떠나는 것은
  // 모달의 `그만두기`입니다.
  //
  // 한 걸음이면 손이 스친 한 번에 세션이 사라집니다 — 진행은 저장되지 않아 다음에
  // 처음부터 다시 풀어야 하고, 되돌릴 수단이 없습니다. 되돌릴 수 없는 일 앞에서는
  // 묻는 것이 맞습니다.
  const [exitAsked, setExitAsked] = useState(false);

  const handleExit = () => {
    "background only";
    playSound("button");
    setExitAsked(true);
  };

  const handleExitAction = (id: string) => {
    "background only";
    playSound("button");
    setExitAsked(false);
    if (id === "leave") {
      onExit();
    }
  };

  // 시스템 뒤로가기: 확인창이 떠 있으면 그것만 닫고(`stay`), 아니면 `×`와 같은 함수입니다.
  useScreenBack(handleExit);
  useLayerBack(exitAsked ? () => handleExitAction("stay") : null);

  const handleAction = () => {
    "background only";
    if (actionSound === "button") playSound("button");
    // 문장 만들기의 `Check`는 프롭을 바꾸지 않아 효과가 못 봅니다 — 답한 순간이라 여기서 보냅니다.
    if (arrangement === "merged") scrollLearningShellToTop();
    onAction?.();
  };

  // 스스로 넘어가는 걸음입니다. 타이머가 저절로 밟거나 사용자가 층을 눌러 앞당기거나
  // 둘 중 하나이고, **둘이 겹쳐 두 번 밟히면 문항 하나가 통째로 건너뛰어집니다.** 그
  // 겹침을 껍데기가 혼자 막습니다 — 「부른 뒤 `advance`가 바뀌어 cleanup이 정리한다」에
  // 기대면 걸음을 주는 화면이 그렇게 만들어 줄 때만 참인 규칙이 되고, 어긋나는 순간은
  // 조용합니다(사용자에게는 문항이 하나 사라진 것으로만 보입니다).
  //
  // 자물쇠는 **이미 밟은 걸음 자체**입니다. boolean이 아니라 밟은 객체를 적어 두므로
  // 다음 걸음이 오면(참조가 갈리면) 저절로 열립니다 — 따로 되돌릴 자리가 없습니다.
  const spentAdvance = useRef<LearningShellProps["advance"]>(undefined);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAdvance = (step: NonNullable<LearningShellProps["advance"]>): void => {
    if (spentAdvance.current === step) {
      return;
    }
    // oxlint-disable-next-line react/immutability -- ReactLynx useRef는 렌더 · effect에서 갱신하는 mutable ref입니다.
    spentAdvance.current = step;
    if (advanceTimer.current !== null) {
      clearTimeout(advanceTimer.current);
      // oxlint-disable-next-line react/immutability -- ReactLynx useRef는 렌더 · effect에서 갱신하는 mutable ref입니다.
      advanceTimer.current = null;
    }
    step.run();
  };

  const handleAdvance = () => {
    "background only";
    if (advance === undefined) {
      return;
    }
    runAdvance(advance);
  };

  // dep이 `advance`라 걸음이 생길 때 한 번 걸리고, cleanup이 화면을 떠나는 길과 걸음이
  // 사라지는 길을 함께 집습니다.
  useEffect(() => {
    if (advance === undefined) {
      return;
    }
    const timer = setTimeout(() => runAdvance(advance), advance.delayMs);
    // oxlint-disable-next-line react/immutability -- ReactLynx useRef는 렌더 · effect에서 갱신하는 mutable ref입니다.
    advanceTimer.current = timer;
    return () => {
      clearTimeout(timer);
      advanceTimer.current = null;
    };
  }, [advance]);

  const motion = useMotion();
  const phase = useQuestionTransition(questionIndex, complete, motion);

  return (
    <view
      className={`learning-shell learning-shell-density-${density}`}
      data-testid="learning-shell"
      data-density={density}
      accessibility-elements-hidden={obscured}
      // 이 화면이 서는 한 바퀴를 SDK가 재게 하는 표식입니다 — 값과 근거는 계약이 집니다.
      __lynx_timing_flag={learningTimingFlag(form)}
    >
      <LearningShellHeader
        form={form}
        questionIndex={questionIndex}
        questionCount={questionCount}
        runProgress={runProgress}
        onExit={handleExit}
      />
      {/* 카드 스크롤 모드는 버튼 행의 실제 높이를 먼저 확보합니다. */}
      <LearningShellBody
        arrangement={arrangement}
        instruction={complete ? undefined : instruction}
        verdict={complete ? undefined : verdict}
        card={card}
        stage={stage}
        workspace={workspace}
        workspaceMode={workspaceMode}
        onViewportHeight={reportViewportHeight}
        transition={{ phase, motion }}
        scene={learningShellScene(complete)}
      />
      {/* 스스로 넘어가는 동안 화면 전체가 이 이름의 조작 단위입니다 — 보이는 버튼은
          없지만 기다리는 것 말고 할 수 있는 일이 있어야 합니다(WCAG 2.2.1). 세션 헤더는
          이 층보다 위에 있어 `×`로 나가는 길은 막히지 않습니다. */}
      {advance === undefined ? null : (
        <view
          className="learning-shell-advance"
          data-testid="learning-shell-advance"
          accessibility-element={true}
          accessibility-label={advance.label}
          accessibility-traits="button"
          bindtap={handleAdvance}
        />
      )}
      {actionsShown ? (
        <LearningShellActions
          button={actionButton}
          label={actionLabel ?? ""}
          onAction={handleAction}
          secondaryAction={secondaryAction}
          inFlow={arrangement !== "split" || actionPlacement === "in-flow"}
          feedback={complete ? undefined : feedback}
        />
      ) : null}
      {/* 나가기 확인입니다. **무엇을 잃는지 본문에 적습니다** — 「그만두시겠어요?」만
          물으면 사용자가 대가를 모른 채 고릅니다.

          `Leave`(그만두기)가 첫째라 강조 변형을 받습니다(`Dialog` 계약: 첫 액션이 brand).
          묻는 말에 답하는 순서대로 읽히는 것이 낭독 순서와도 맞습니다. */}
      {exitAsked ? (
        <Dialog
          title={copy.learningShell.leaveDialog.title}
          description={copy.learningShell.leaveDialog.description}
          actions={[
            { id: "leave", label: copy.learningShell.leaveDialog.leave },
            { id: "stay", label: copy.learningShell.leaveDialog.stay },
          ]}
          bindaction={handleExitAction}
        />
      ) : null}
    </view>
  );
}
