import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import diamond from "@libitums/icons/lynx/diamond";
import fire from "@libitums/icons/lynx/fire";
import trophy from "@libitums/icons/lynx/trophy";
import { color, motion as motionTokens } from "@libitums/design-tokens";
import { motionDurationMs, useMotion } from "@libitums/ui-lynx/motion";

import { statBumpStart } from "../lib/stat-bump";

import "./stat-chip.css";
import "./stat-chip-motion.css";

// 지표 칩 하나 — 아이콘 + 숫자입니다. 여정 맵 상단 바와 학습 완료 화면 머리가 함께 씁니다
// (화면 둘 이상이 쓰는 컴포넌트, ADR-0008).
//
// 숫자만 낭독되면 무엇의 3인지 알 수 없으므로 칩마다 이름(`accessibilityLabel`)을 답니다 —
// 아이콘은 그 이름 안에 이미 들어 있습니다. `onTap`이 있으면 버튼이고 없으면 읽기 전용입니다.
//
// **값이 활동으로 오른 순간 한 번 움직입니다**(ADR-0064 — 시안 ①D 「불씨 + 빛 훑기」). 아이콘이 톡 튀며 알갱이
// 여섯이 퍼지고, 테두리가 칩 색으로 물들며 빛 한 줄기가 지나가고, 숫자가 아래에서 밀려 올라옵니다. 움직임
// 줄이기에서는 숫자만 페이드로 바뀝니다. 오르기 전 값(`bumpFrom`)은 칩이 기억하지 않고 받습니다
// (`lib/stat-bump.ts`). 재생 전에는 그 값을 보이고, 이름(`accessibilityLabel`)은 처음부터 새 값입니다.

export type StatChipTone = "streak" | "trophy" | "diamond";

/**
 * 칩의 면입니다. `none`은 바탕이 그대로 비치고(학습 완료 머리), `white`는 흰 면을 칠합니다
 * (상단 바 — 스크롤되는 내용 위에 떠 있어 면이 없으면 칩이 내용과 섞입니다).
 */
export type StatChipSurface = "none" | "white";

// 다이아 색은 디자인 값(#00C3FF, Figma 65-466)이고 맞는 색 토큰이 패키지에 없어 적어 둡니다.
export const statChipDiamondColor = "#00C3FF";

const iconByTone: Record<StatChipTone, string> = { streak: fire, trophy, diamond };

const iconColorByTone: Record<StatChipTone, string> = {
  streak: color.brand.secondary,
  trophy: color.feedback.warning,
  diamond: statChipDiamondColor,
};

const sparkSlots = [0, 1, 2, 3, 4, 5] as const;

/** 오름 재생의 길이입니다 — 가장 긴 빛 훑기(`d8`)가 끝나면 끝입니다. 줄이기에서는 숫자 페이드(`d2`)입니다. */
export const statChipBumpDurationMs = {
  standard: motionDurationMs(motionTokens.duration.d8),
  reduced: motionDurationMs(motionTokens.duration.d2),
} as const;

export type StatChipProps = {
  readonly tone: StatChipTone;
  readonly value: number;
  readonly accessibilityLabel: string;
  readonly testId: string;
  readonly onTap?: () => void;
  /** 기본값은 `none`입니다. */
  readonly surface?: StatChipSurface;
  /** 오르기 전 값입니다. 지금 값보다 작으면 그 값에서 지금 값으로 한 번 굴립니다. */
  readonly bumpFrom?: number | null;
  /** 참인 동안 재생을 미룹니다 — 모달이 덮고 있으면 보이지 않는 재생이 됩니다. */
  readonly bumpHeld?: boolean;
  /** 재생을 시작하기 전에 기다리는 시간입니다(학습 완료 화면 — 배지가 자리 잡은 뒤). */
  readonly bumpDelayMs?: number;
  /** 재생을 마쳤거나 굴릴 것이 없어 표식을 지워도 될 때 부릅니다. */
  readonly onBumped?: () => void;
};

export function StatChip({
  tone,
  value,
  accessibilityLabel,
  testId,
  onTap,
  surface = "none",
  bumpFrom = null,
  bumpHeld = false,
  bumpDelayMs = 0,
  onBumped,
}: StatChipProps): ReactNode {
  const motion = useMotion();
  const start = statBumpStart(bumpFrom, value);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // 표식은 있는데 굴릴 것이 없으면(값이 내려갔거나 같아졌으면) 바로 지웁니다.
    if (bumpFrom !== null && start === null) {
      onBumped?.();
      return;
    }
    if (start === null || bumpHeld) return;
    const begin = setTimeout(() => setPlaying(true), bumpDelayMs);
    const end = setTimeout(() => {
      setPlaying(false);
      onBumped?.();
    }, bumpDelayMs + statChipBumpDurationMs[motion]);
    return () => {
      clearTimeout(begin);
      clearTimeout(end);
      setPlaying(false);
    };
    // `onBumped`는 부모가 매번 새로 만들어 넘기므로 뺍니다. `bumpFrom`은 넣습니다 — 값이 그대로인 채 표식만
    // 들어오면 `start`가 계속 `null`이라 그것만으로는 다시 돌지 않습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bumpFrom, start, value, bumpHeld, bumpDelayMs, motion]);

  const handleTap = () => {
    "background only";
    onTap?.();
  };

  const bursting = playing && start !== null && motion === "standard";
  const valueClass = `stat-chip-value stat-chip-value-${tone}`;

  return (
    <view
      className={["stat-chip", surface === "white" ? "stat-chip-surface-white" : undefined]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={accessibilityLabel}
      accessibility-traits={onTap ? "button" : undefined}
      bindtap={onTap ? handleTap : undefined}
    >
      {bursting ? (
        <view className="stat-chip-sheen" data-testid={`${testId}-sheen`}>
          <view className={`stat-chip-sheen-band stat-chip-sheen-band-${tone}`} />
        </view>
      ) : null}
      {bursting ? <view className={`stat-chip-glow stat-chip-glow-${tone}`} /> : null}
      <view className={bursting ? "stat-chip-icon-box stat-chip-pop" : "stat-chip-icon-box"}>
        <svg
          className="stat-chip-icon"
          content={iconByTone[tone]}
          current-color={iconColorByTone[tone]}
        />
        {bursting
          ? sparkSlots.map((slot) => (
              <view
                key={slot}
                className="stat-chip-spark-ray"
                style={{ transform: `rotate(${slot * 60}deg)` }}
              >
                <view
                  className={`stat-chip-spark stat-chip-spark-${tone}`}
                  data-testid={`${testId}-spark`}
                />
              </view>
            ))
          : null}
      </view>
      {start === null ? (
        <text className={valueClass}>{String(value)}</text>
      ) : !playing ? (
        <text className={valueClass}>{String(start)}</text>
      ) : motion === "reduced" ? (
        <text className={`${valueClass} stat-chip-value-fade`}>{String(value)}</text>
      ) : (
        <view className="stat-chip-digits" data-testid={`${testId}-roll`}>
          <view className="stat-chip-roll">
            <text className={valueClass}>{String(start)}</text>
            <text className={valueClass}>{String(value)}</text>
          </view>
        </view>
      )}
    </view>
  );
}
