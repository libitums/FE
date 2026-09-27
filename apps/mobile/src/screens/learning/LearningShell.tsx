import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";
import { TopBar } from "../../components/TopBar";
import { learningSessionHeader } from "./learning-shell.contract";
import type { LearningForm } from "../../lib/learning-form";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import "./learning-shell.css";

/**
 * 학습 화면의 고정 뼈대입니다(Figma 65-14). 활동이 바뀌어도 이 뼈대는 그대로이고,
 * **가운데 카드 안만** 갈립니다 — 학습 내용이 거기서 전개되고 성공 · 실패 판정도
 * 거기서 뒤집힙니다.
 *
 * 위에서 아래로 상단 바 · 세션 헤더 · 지시문 · 가운데 카드 · 작업 영역 · 아래 버튼이고,
 * 낭독 순서가 곧 DOM 순서입니다.
 *
 * 껍데기는 판정을 모릅니다. 카드 안에 무엇이 서는지도 모릅니다 — 활동이 `card`로
 * 넣어 주는 것을 그릴 뿐입니다. 그래서 활동이 하나 늘어도 이 파일은 안 바뀝니다.
 */
export type LearningShellProps = {
  form: LearningForm;
  /** 유닛 안에서 몇 번째 활동인가입니다(0부터). */
  activityIndex: number;
  totalActivityCount: number;
  /** 카드 위 회색 한 줄 — 「무엇을 하라」입니다. */
  instruction: string;
  /**
   * 세션 헤더 오른쪽의 짧은 한 줄입니다 — 디자인이 그 자리에 빈 상자를 두었고
   * (Figma 65-42), 활동이 자기 진행(`문항 1 / 3` 같은 것)을 거기 겁니다.
   *
   * 없으면 그 자리는 나가기와 마주 보는 빈 자리로 남아 순번을 줄 가운데 세웁니다.
   */
  meta?: string;
  onExit: () => void;
  /** 가운데 카드 안입니다. 활동이 여기서 전개되고 판정도 여기서 납니다. */
  card: ReactNode;
  /**
   * 카드 밖 작업 영역입니다 — 고를 낱말 칩처럼 활동마다 다른 것이 섭니다. 없는
   * 활동도 있으므로 선택입니다.
   */
  workspace?: ReactNode;
  /**
   * 아래 버튼입니다. 라벨이 활동 · 상태마다 갈립니다(`다음` · `결과 보기`). 둘 다
   * 없으면 버튼을 그리지 않습니다 — 영구히 눌리지 않는 버튼을 두지 않기 위해서입니다
   * (ADR-0016 D10). 「아직 할 수 없다」는 버튼이 **없는 것**으로 말합니다.
   */
  actionLabel?: string;
  onAction?: () => void;
  streakDays?: number;
  trophyCount?: number;
  onOpenNotifications?: () => void;
};

export function LearningShell({
  form,
  activityIndex,
  totalActivityCount,
  instruction,
  meta,
  onExit,
  card,
  workspace,
  actionLabel,
  onAction,
  streakDays = 0,
  trophyCount = 0,
  onOpenNotifications = () => {},
}: LearningShellProps): ReactNode {
  const header = learningSessionHeader(form, activityIndex, totalActivityCount);

  const handleExit = () => {
    "background only";
    onExit();
  };

  const handleAction = () => {
    "background only";
    onAction?.();
  };

  return (
    <view className="learning-shell" data-testid="learning-shell">
      <TopBar
        streakDays={streakDays}
        trophyCount={trophyCount}
        onOpenNotifications={onOpenNotifications}
      />
      {/* 세션 헤더 — 나가기 · 순번 · 진행 막대 · 학습형 이름 · 백분율입니다. 면 · 모서리 ·
          안 여백은 ui-lynx `Card`가 집니다: 회색 면에 그림자 없는 변형입니다. 이 화면이
          카드를 손으로 그리지 않는 이유는 카드가 이미 디자인 시스템의 것이기 때문입니다.

          막대는 장식이 아니라 값이므로 낱말 둘을 한 접근성 요소로 묶어 읽히게 하고,
          막대 자신은 트리에서 뺍니다. */}
      <Card surface="secondary" elevation="flat">
        <Card.Content>
          <view className="learning-shell-session" data-testid="learning-shell-session">
            <view className="learning-shell-session-row">
              <view
                className="learning-shell-exit"
                data-testid="learning-shell-exit"
                accessibility-element={true}
                accessibility-label="학습 나가기"
                accessibility-traits="button"
                bindtap={handleExit}
              >
                <svg
                  className="learning-shell-exit-icon"
                  content={cross}
                  current-color={color.gray[700]}
                />
              </view>
              <text className="learning-shell-chapter" data-testid="learning-shell-chapter">
                {header.chapterLabel}
              </text>
              {/* 나가기와 마주 보는 자리입니다 — 비어 있어도 순번을 줄 가운데 세웁니다.
                  활동이 `meta`를 주면 거기 섭니다. 비면 보이는 것이 없으므로 접근성
                  트리에 올리지 않습니다. */}
              <view className="learning-shell-session-spacer">
                {meta === undefined ? null : (
                  <text className="learning-shell-meta" data-testid="learning-shell-meta">
                    {meta}
                  </text>
                )}
              </view>
            </view>
            <view
              className="learning-shell-progress"
              data-testid="learning-shell-progress"
              accessibility-element={true}
              accessibility-label={header.accessibilityLabel}
            >
              <view className="learning-shell-progress-track">
                {/* 0%에서는 그리지 않습니다 — 폭 0짜리 상자가 둥근 끝 때문에 점으로 남아
                    「조금 했다」로 읽힙니다. */}
                {header.fillPercent === 0 ? null : (
                  <view
                    className="learning-shell-progress-fill"
                    data-testid="learning-shell-progress-fill"
                    style={{ width: `${String(header.fillPercent)}%` }}
                  />
                )}
              </view>
              <view className="learning-shell-progress-row">
                <text className="learning-shell-form" data-testid="learning-shell-form">
                  {header.formLabel}
                </text>
                <text className="learning-shell-percent" data-testid="learning-shell-percent">
                  {header.percentLabel}
                </text>
              </view>
            </view>
          </view>
        </Card.Content>
      </Card>
      {/* 흐르는 영역입니다 — 지시문 · 무대 · 작업 영역이 함께 스크롤됩니다. 고정으로
          남는 것은 위의 상단 바 · 세션 헤더와 아래 버튼입니다(Figma 65-14의 배치).

          **스크롤이 무대 안이 아니라 여기 있는 이유**는 넘치는 것이 카드 하나가 아니기
          때문입니다. 문장이 길어 카드가 커지면 그 아래 보기도 함께 밀리는데, 무대만
          스크롤하면 카드는 잘리지 않고 **보기 위로 넘쳐 나옵니다** — 기기에서 그렇게
          겹치는 것을 봤습니다.

          `scroll-orientation`·`scroll-bar-enable`을 적습니다 — 안 적으면 초기값이 각각
          가로·꺼짐이라 세로 스크롤이 원리적으로 불가능합니다. */}
      <scroll-view
        className="learning-shell-scroll"
        data-testid="learning-shell-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="learning-shell-flow">
          <text className="learning-shell-instruction" data-testid="learning-shell-instruction">
            {instruction}
          </text>
          {/* 가운데 카드 — 학습 내용이 전개되고 판정이 뒤집히는 무대입니다. `stage`
          변형이 큰 모서리와 넓은 그림자를 집니다.

          넘치는 것은 위의 스크롤이 집니다 — 이 상자는 자기 높이만 압니다. */}
          <view className="learning-shell-stage" data-testid="learning-shell-stage">
            <Card elevation="stage">
              <Card.Content>{card}</Card.Content>
            </Card>
          </view>
          {workspace === undefined ? null : (
            <view className="learning-shell-workspace" data-testid="learning-shell-workspace">
              {workspace}
            </view>
          )}
        </view>
      </scroll-view>
      {actionLabel === undefined || onAction === undefined ? null : (
        <view
          className="learning-shell-action"
          data-testid="learning-shell-action"
          accessibility-element={true}
          accessibility-label={actionLabel}
          accessibility-traits="button"
          bindtap={handleAction}
        >
          <text className="learning-shell-action-label">{actionLabel}</text>
        </view>
      )}
    </view>
  );
}
