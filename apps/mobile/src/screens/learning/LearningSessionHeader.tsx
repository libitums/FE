import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { useMotion } from "@libitums/ui-lynx/motion";

import { learningProgressFillClassName, learningSessionHeader } from "./learning-shell.contract";
import type { LearningForm } from "../../lib/learning-form";
import { useUiCopy } from "../../lib/ui-copy";

// 학습 껍데기의 세션 헤더입니다 — 나가기 · 문항 순번 · 진행 막대 · 학습형 이름.
//
// ⟨2026-09-28⟩ 껍데기에서 떼어냈습니다. 껍데기가 300줄 한도를 네 번째로 넘겼고, 그때마다
// 주석을 깎아 맞춰 왔는데 이 저장소에서 가장 값나가는 것이 그 주석입니다. 헤더는 자기
// 자리가 뚜렷한 덩어리라(값을 계약에서 받아 그리기만 합니다) 여기로 옮기는 것이 줄 수를
// 맞추는 것보다 먼저 옳습니다.
//
// **상태가 없습니다.** 나가기를 누르면 무엇이 일어나는지는 껍데기가 정합니다 — 이 조각은
// 눌렸다는 것만 올려 보냅니다.

export type LearningSessionHeaderProps = {
  readonly form: LearningForm;
  /** 활동 안에서 지금 몇 번째 문항인가입니다(0부터). */
  readonly questionIndex: number;
  readonly questionCount: number;
  readonly onExit: () => void;
};

export function LearningSessionHeader({
  form,
  questionIndex,
  questionCount,
  onExit,
}: LearningSessionHeaderProps): ReactNode {
  const copy = useUiCopy();
  const motion = useMotion();
  const header = learningSessionHeader(form, questionIndex, questionCount, copy);

  const handleExit = () => {
    "background only";
    onExit();
  };

  return (
    <Card surface="secondary" elevation="flat">
      <Card.Content>
        <view className="learning-shell-session" data-testid="learning-shell-session">
          <view className="learning-shell-session-row">
            <view
              className="learning-shell-exit"
              data-testid="learning-shell-exit"
              accessibility-element={true}
              accessibility-label={copy.learningShell.exitLesson}
              accessibility-traits="button"
              bindtap={handleExit}
            >
              <svg
                className="learning-shell-exit-icon"
                content={cross}
                current-color={color.gray[700]}
              />
            </view>
            {/* 문항이 0개면 셀 것이 없어 순번을 세우지 않습니다 — 빈 `<text>`를 두면
                보조기술에 빈 정지점이 남습니다. */}
            {header.progressLabel === undefined ? null : (
              <text className="learning-shell-progress-label" data-testid="learning-shell-chapter">
                {header.progressLabel}
              </text>
            )}
            {/* 나가기와 마주 보는 빈 자리입니다 — 같은 폭이어야 순번이 줄 가운데 섭니다.
                보이는 것이 없으므로 접근성 트리에 올리지 않습니다. */}
            <view className="learning-shell-session-spacer" />
          </view>
          <view
            className="learning-shell-progress"
            data-testid="learning-shell-progress"
            data-progress={String(header.fillPercent)}
            accessibility-element={true}
            accessibility-label={header.accessibilityLabel}
          >
            <view className="learning-shell-progress-track">
              {/* 0%에서는 그리지 않습니다 — 폭 0짜리 상자가 둥근 끝 때문에 점으로 남아
                  「조금 했다」로 읽힙니다. */}
              {header.fillPercent === 0 ? null : (
                <view
                  className={learningProgressFillClassName(motion)}
                  data-testid="learning-shell-progress-fill"
                  {...(motion === "reduced" ? { "data-motion": "reduced" } : {})}
                  style={{ width: `${String(header.fillPercent)}%` }}
                />
              )}
            </view>
            {/* 학습형 이름만 섭니다. ⟨2026-09-28⟩ 백분율 낱말을 걷었습니다 — 막대가 이미
                같은 것을 말하고, 숫자가 둘이면 「어느 것을 보나」가 또 생깁니다. */}
            <text className="learning-shell-form" data-testid="learning-shell-form">
              {header.formLabel}
            </text>
          </view>
        </view>
      </Card.Content>
    </Card>
  );
}
