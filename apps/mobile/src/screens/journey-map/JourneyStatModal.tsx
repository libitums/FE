import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import fire from "@libitums/icons/lynx/fire";
import meteor from "@libitums/icons/lynx/meteor";
import tick from "@libitums/icons/lynx/tick";
import trophy from "@libitums/icons/lynx/no-padding/trophy";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { journeyStatSlotCount, type JourneyStatKind, type JourneyStatTrack } from "./journey-stat";

import "./journey-stat-modal.css";

// 상단 지표 칩(연속 학습 · 트로피)을 누르면 맵 위에 뜨는 전체 화면 모달입니다
// (Figma 47-14057 · 74-419). 두 모달은 뼈대가 같고 색 · 머리 아이콘 · 문구만 갈립니다.
// 문구는 디자인 표기(영문) 그대로입니다.

type JourneyStatCopy = {
  readonly title: string;
  readonly message: string;
  /** 스크린리더가 큰 숫자와 제목을 한 문장으로 읽게 하는 이름입니다. */
  readonly heroLabel: (value: number) => string;
};

const copy: Record<JourneyStatKind, JourneyStatCopy> = {
  streak: {
    title: "day streak",
    message: "Amazing work! Come back tomorrow to keep your streak alive!",
    heroLabel: (value) => `연속 학습 ${value}일`,
  },
  trophy: {
    title: "Episode Clear!",
    // Figma 원문은 "…to clear chapter"입니다. 제목(Episode Clear!)과 용어를 맞추고 관사 ·
    // 문장 부호를 보태 고쳤습니다(PR #124 리뷰). Figma 쪽 반영이 뒤따라야 합니다.
    message: "Amazing work! Come back tomorrow to clear the next episode!",
    heroLabel: (value) => `에피소드 클리어 ${value}개`,
  },
};

export type JourneyStatModalProps = {
  readonly kind: JourneyStatKind;
  /** 큰 숫자입니다 — 연속일수 또는 트로피 수입니다. */
  readonly value: number;
  readonly track: JourneyStatTrack;
  readonly onClose: () => void;
};

// 칸 번호 0 … 6입니다. 칸 수가 고정이라 렌더마다 만들지 않습니다.
const slotIndexes = Array.from({ length: journeyStatSlotCount }, (_, index) => index);

export function JourneyStatModal({
  kind,
  value,
  track,
  onClose,
}: JourneyStatModalProps): ReactNode {
  // 이 레이어는 셸 밖(`position: fixed`)이라 셸의 safe area 여백을 받지 못합니다 —
  // 같은 값을 스스로 읽어 안쪽 여백으로 잡습니다(lib/safe-area.ts).
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const { title, message, heroLabel } = copy[kind];
  const done = slotIndexes.slice(0, track.completedCount);
  const rest = slotIndexes.slice(track.completedCount);

  const handleClose = () => {
    "background only";
    onClose();
  };

  return (
    <view
      className={`journey-stat-modal journey-stat-modal-${kind}`}
      data-testid={`journey-stat-modal-${kind}`}
      // 맵으로 가는 탭을 가로챕니다 — 뒤쪽 맵은 모달이 떠 있는 동안 조작 대상이 아닙니다.
      event-through={false}
      style={{
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      {/* 장식 운석 셋 — 연속 학습에만 있습니다. 낭독하지 않습니다. */}
      {kind === "streak" ? (
        <view className="journey-stat-modal-decor" accessibility-elements-hidden={true}>
          {(["a", "b", "c"] as const).map((slot) => (
            <svg
              key={slot}
              className={`journey-stat-modal-meteor journey-stat-modal-meteor-${slot}`}
              content={meteor}
              current-color={color.brand.primary}
            />
          ))}
        </view>
      ) : null}

      <view className="journey-stat-modal-header">
        <view data-testid="journey-stat-modal-back">
          <RoundButton
            icon={arrowLeft}
            size="xl"
            accessibilityLabel="맵으로"
            bindtap={handleClose}
          />
        </view>
      </view>

      <view
        className="journey-stat-modal-hero"
        data-testid="journey-stat-modal-hero"
        accessibility-element={true}
        accessibility-traits="header"
        accessibility-label={heroLabel(value)}
      >
        <view className="journey-stat-modal-value-box">
          <text className="journey-stat-modal-value" data-testid="journey-stat-modal-value">
            {String(value)}
          </text>
          {/* 트로피는 숫자 바로 위 가운데에 얹힙니다. */}
          {kind === "trophy" ? (
            <view className="journey-stat-modal-trophy-anchor">
              <svg
                className="journey-stat-modal-trophy-icon"
                content={trophy}
                current-color={color.feedback.warning}
              />
            </view>
          ) : null}
          {/* 불꽃은 숫자의 오른쪽 위 끝에 걸칩니다 — 숫자 폭이 달라져도 끝을 따라갑니다. */}
          {kind === "streak" ? (
            <svg
              className="journey-stat-modal-fire"
              content={fire}
              current-color={color.brand.primary}
            />
          ) : null}
        </view>
        <text className="journey-stat-modal-title" data-testid="journey-stat-modal-title">
          {title}
        </text>
      </view>

      <view className="journey-stat-modal-spacer" />

      {/* 진행 줄 — 찬 칸은 한 알약으로 묶이고 남은 칸은 빈 원입니다. 요일 줄과 칸이
          같은 폭 · 같은 간격이라 요일 아래 칸이 정확히 섭니다. */}
      <view
        className="journey-stat-modal-track"
        data-testid="journey-stat-modal-track"
        accessibility-element={true}
        accessibility-label={`${journeyStatSlotCount}칸 중 ${track.completedCount}칸 완료`}
      >
        {track.dayLabels ? (
          <view className="journey-stat-modal-days" data-testid="journey-stat-modal-days">
            {track.dayLabels.map((label, index) => (
              <view className="journey-stat-modal-slot" key={index}>
                <text className="journey-stat-modal-day">{label}</text>
              </view>
            ))}
          </view>
        ) : null}
        <view className="journey-stat-modal-slots">
          {done.length > 0 ? (
            <view className="journey-stat-modal-done" data-testid="journey-stat-modal-done">
              {done.map((index) => (
                <view className="journey-stat-modal-slot" key={index}>
                  <svg
                    className="journey-stat-modal-tick"
                    content={tick}
                    current-color={color.white}
                  />
                </view>
              ))}
            </view>
          ) : null}
          {rest.map((index) => (
            <view
              className="journey-stat-modal-slot journey-stat-modal-empty"
              data-testid="journey-stat-modal-empty"
              key={index}
            />
          ))}
        </view>
      </view>

      <text className="journey-stat-modal-message" data-testid="journey-stat-modal-message">
        {message}
      </text>

      <view className="journey-stat-modal-footer" data-testid="journey-stat-modal-continue">
        {/* 화살표는 디자인 표기대로 라벨 글자(→)입니다 — 아이콘 패키지의 arrow-right는
            모양이 달라 쓰지 않습니다. */}
        <Button label="Continue →" variant="outline" size="xl" bindtap={handleClose} />
      </view>
    </view>
  );
}
