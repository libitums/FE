import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";
import { Dialog } from "@libitums/ui-lynx/dialog";
import { Fog } from "@libitums/ui-lynx/fog";
import { TopBar } from "../../components/TopBar";
import { learningTimingFlag } from "./learning-shell.contract";
import { LearningSessionHeader } from "./LearningSessionHeader";
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
  /**
   * 활동 안에서 지금 몇 번째 문항인가입니다(0부터). 세션 헤더의 `Lesson n / N`과 진행
   * 막대가 이 값에서 납니다.
   *
   * ⟨2026-09-28⟩ 전에는 유닛 안의 **활동** 순번이었고 문항 순번은 오른쪽에 따로 섰는데,
   * 한 줄에 숫자 쌍이 둘이라 어느 것이 지금 나의 위치인지가 읽히지 않았습니다.
   */
  questionIndex: number;
  questionCount: number;
  /** 카드 위 회색 한 줄 — 「무엇을 하라」입니다. */
  instruction: string;
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
  /**
   * 스스로 넘어가는 걸음입니다. 주면 `delayMs` 뒤에 `run`을 부르고, 그 전에 화면을
   * 누르면 즉시 부릅니다.
   *
   * 시간제한이 생기므로(WCAG 2.2.1) 조작을 남깁니다 — 보이는 버튼은 없지만 화면
   * 전체가 이 이름의 조작 단위가 됩니다. 기다리는 것 말고 할 수 있는 일이 없는 화면이
   * 되지 않게 하는 자리입니다.
   */
  advance?: { readonly label: string; readonly run: () => void; readonly delayMs: number };
  streakDays?: number;
  trophyCount?: number;
  onOpenNotifications?: () => void;
};

export function LearningShell({
  form,
  questionIndex,
  questionCount,
  instruction,
  onExit,
  card,
  workspace,
  actionLabel,
  onAction,
  advance,
  streakDays = 0,
  trophyCount = 0,
  onOpenNotifications = () => {},
}: LearningShellProps): ReactNode {
  // 나가기는 **두 걸음**입니다 ⟨2026-09-28⟩. `×`는 묻기만 하고, 실제로 떠나는 것은
  // 모달의 `그만두기`입니다.
  //
  // 한 걸음이면 손이 스친 한 번에 세션이 사라집니다 — 진행은 저장되지 않아 다음에
  // 처음부터 다시 풀어야 하고, 되돌릴 수단이 없습니다. 되돌릴 수 없는 일 앞에서는
  // 묻는 것이 맞습니다.
  const [exitAsked, setExitAsked] = useState(false);

  const handleExit = () => {
    "background only";
    setExitAsked(true);
  };

  const handleExitAction = (id: string) => {
    "background only";
    setExitAsked(false);
    if (id === "leave") {
      onExit();
    }
  };

  const handleAction = () => {
    "background only";
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
    spentAdvance.current = step;
    if (advanceTimer.current !== null) {
      clearTimeout(advanceTimer.current);
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
    advanceTimer.current = timer;
    return () => {
      clearTimeout(timer);
      advanceTimer.current = null;
    };
  }, [advance]);

  return (
    <view
      className="learning-shell"
      data-testid="learning-shell"
      // 이 화면이 서는 한 바퀴를 SDK가 재게 하는 표식입니다 — 값과 근거는 계약이 집니다.
      __lynx_timing_flag={learningTimingFlag(form)}
    >
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
      {/* 세션 헤더를 상자로 감쌉니다 — 스스로 넘어가는 층(`-advance`)보다 위에 서야
          `×`로 나가는 길이 막히지 않습니다. */}
      <view className="learning-shell-session-layer">
        <LearningSessionHeader
          form={form}
          questionIndex={questionIndex}
          questionCount={questionCount}
          onExit={handleExit}
        />
      </view>
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
      {/* 작업 영역 — **스크롤이 여기 하나뿐입니다.** 머리(상단 바 · 세션 헤더) · 지시문 ·
          무대 카드 · 아래 버튼은 자리에 고정되고, 넘치면 고를 것들만 흐릅니다. 화면
          전체가 흐르면 문항을 다시 듣고 싶을 때 카드를 찾아 되올려야 합니다 — 무대는 늘
          같은 자리에 있어야 합니다. 이 골격이 ADR-0022 **D1-2**이고, 이름이 prop과 다른
          근거는 짝 CSS가 집니다.

          **무대 안에 스크롤을 두지 않은 이유**는 넘치는 것이 카드 하나가 아니기
          때문입니다. 무대만 스크롤하면 카드는 잘리지 않고 **보기 위로 넘쳐 나옵니다** —
          기기에서 그렇게 겹치는 것을 봤습니다.

          `scroll-orientation`·`scroll-bar-enable`을 적습니다 — 안 적으면 초기값이 각각
          가로·꺼짐이라 세로 스크롤이 원리적으로 불가능합니다. */}
      {workspace === undefined ? null : (
        <scroll-view
          className="learning-shell-scroll"
          data-testid="learning-shell-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={true}
        >
          {workspace}
        </scroll-view>
      )}
      {/* 아래 버튼은 **떠 있습니다** — 자기 줄을 차지하지 않고 작업 영역 위에 얹힙니다.
          그 줄(56 + 간격)을 돌려받은 만큼 보기가 더 들어가 스크롤이 덜 생깁니다.

          버튼 뒤에 포그를 깝니다. 버튼이 가리는 자리에서 내용이 **잘려 보이면** 「여기가
          끝」으로 읽히는데, 흐려지면 「아래에 더 있다」로 읽힙니다 — 그것이 사실입니다.
          포그는 자식을 받지 않으므로(`children?: never`) 버튼과 형제로 두고, DOM에서
          버튼을 뒤에 두어 버튼이 포그 위에 섭니다.

          포그를 상자로 감싸는 것은 **버튼보다 위까지 번지게** 하기 위해서입니다 — 포그는
          자기 부모의 아래에 붙으므로 감싸지 않으면 번짐이 버튼 뒤에서 끝나 안 보입니다. */}
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
      {actionLabel === undefined || onAction === undefined ? null : (
        <>
          <view className="learning-shell-fog">
            <Fog direction="bottom" size="full" color="surface-default" />
          </view>
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
        </>
      )}
      {/* 나가기 확인입니다. **무엇을 잃는지 본문에 적습니다** — 「그만두시겠어요?」만
          물으면 사용자가 대가를 모른 채 고릅니다.

          `그만두기`가 첫째라 강조 변형을 받습니다(`Dialog` 계약: 첫 액션이 brand).
          묻는 말에 답하는 순서대로 읽히는 것이 낭독 순서와도 맞습니다. */}
      {exitAsked ? (
        <Dialog
          title="학습을 그만둘까요?"
          description="지금까지 푼 문항은 저장되지 않고, 다음에 처음부터 다시 풀어야 합니다."
          actions={[
            { id: "leave", label: "그만두기" },
            { id: "stay", label: "계속하기" },
          ]}
          bindaction={handleExitAction}
        />
      ) : null}
    </view>
  );
}
