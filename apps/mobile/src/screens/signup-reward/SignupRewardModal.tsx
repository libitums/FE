import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef, useState } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { coinIcon } from "../../components/coin-icon";
import { infinityHeroIcon } from "../../components/infinity-icon";
import { ticketIcon } from "../../components/ticket-icon";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import bigPouchArt from "../coin-shop/assets/big-pouch.webp";
import { LAUNCH_FLYING_COINS, LaunchCoinFlight } from "../launch/LaunchCoinFlight";
import { useCountUp } from "../launch/LaunchModals";
import {
  signupRewardCoinSourceId,
  signupRewardTestIds as ids,
  type RewardModalProps,
  type SignupRewardModalProps,
} from "./signup-reward.contract";

import "../launch/launch.css";
import "./signup-reward.css";

/** 톡 튀는 엽전 수 — 시안의 여섯 자리. */
const POPS = [0, 1, 2, 3, 4, 5];
/** 금액이 오르기 시작하는 때 — 주머니가 튀어 앉은 뒤(d1 × 18). */
const COUNT_DELAY_MS = 900;

// 보상 모달 틀 — 가입 보상(ADR-0174, 시안 Reward · Wallet)과 푸시 캠페인 보상(ADR-0175)이 함께 씁니다. 엽전 출시 모달(ADR-0140)과
// 같은 틀(막 · 흰 상자 · 위 알약 · Got it)입니다.
// - 엽전: big-pouch가 튀어 나타나고 엽전 여섯이 위로 톡 튀며 +0 → +N이 오릅니다. 「Got it」이면 막과 상자가 걷히고 금액 줄의 엽전에서
//   머리 엽전 칩으로 실제 자리를 재어 날아갑니다(LaunchCoinFlight).
// - 무제한 티켓: 같은 무대에 주황 무한 기호(무제한 모달의 큰 값)와 티켓 아이콘 여섯이 톡 튑니다. 금액 줄은 시간(`24h`)이고 날지 않습니다 —
//   「Got it」이면 곧바로 닫히고 머리 칩이 무제한 칩으로 서 있습니다. 새 그림은 없습니다.
// 움직임 줄이기면 처음부터 최종 값이고 날지 않고 곧바로 닫힙니다.
export function RewardModal({
  tag,
  title,
  body,
  reward,
  coinTargetId,
  onCoinLanded,
  onFlightStart,
  onDone,
}: RewardModalProps): ReactNode {
  const { signupReward: copy, tickets } = useUiCopy();
  const reduced = useMotion() === "reduced";
  const coins = reward.kind === "coins";
  // 엽전은 제 색 그림, 티켓은 브랜드 주황으로 칠하는 선 그림입니다.
  const icon = coins ? coinIcon : ticketIcon;
  const tint = coins ? undefined : color.brand.primary;
  const [flying, setFlying] = useState(false);
  const shown = useCountUp(coins ? reward.amount : 0, COUNT_DELAY_MS, reduced);
  // 움직임 줄이기 · 티켓이면 날지 않고 곧바로 닫습니다.
  const flies = coins && !reduced;
  useEffect(() => {
    if (!flying || flies) return undefined;
    const handle = setTimeout(() => onDone(), 0);
    return () => clearTimeout(handle);
  }, [flying, flies, onDone]);
  // 마지막 엽전이 닿으면 한 번만 닫습니다 — 안전 타이머와 실제 착지가 겹쳐도 두 번 부르지 않습니다.
  const closed = useRef(false);
  const landed = (n: number) => {
    onCoinLanded?.(n, LAUNCH_FLYING_COINS);
    if (n >= LAUNCH_FLYING_COINS && !closed.current) {
      closed.current = true;
      onDone();
    }
  };
  const done = () => {
    "background only";
    if (flies) onFlightStart?.();
    setFlying(true);
  };
  useLayerBack(flying ? null : done);
  const still = reduced ? " launch-still signup-still" : "";
  return (
    <view className="launch" data-testid={ids.modal} event-through={false}>
      <view className={`launch-scrim${flying ? " launch-scrim-out" : ""}`}>
        <Overlay scope="screen" surface="dialog" dismiss="none" />
      </view>
      <view
        className={`launch-box${still}${flying ? " launch-box-out" : ""}`}
        accessibility-role-description="dialog"
      >
        <text className="launch-tag" accessibility-elements-hidden={true}>
          {tag}
        </text>
        <scroll-view
          className="launch-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="launch-scroll-body">
            <view
              className="signup-reward-stage"
              data-testid={coins ? undefined : ids.ticketStage}
              accessibility-elements-hidden={true}
            >
              <view className="signup-reward-glow" />
              {POPS.map((index) => (
                <view key={index} className={`signup-reward-pop signup-reward-pop-${index}`}>
                  <svg className="signup-reward-pop-icon" content={icon} current-color={tint} />
                </view>
              ))}
              {coins ? (
                <image className="signup-reward-pouch" src={bigPouchArt} mode="aspectFit" />
              ) : (
                <svg
                  className="signup-reward-pouch reward-ticket-infinity"
                  content={infinityHeroIcon}
                  current-color={color.brand.secondary}
                />
              )}
            </view>
            <text className="launch-title" accessibility-traits="header">
              {title}
            </text>
            <view
              className="signup-reward-amount-row"
              flatten={false}
              accessibility-element={true}
              accessibility-label={
                coins
                  ? copy.amountSpoken(reward.amount)
                  : `${tickets.unlimited}, ${copy.hoursShort(reward.hours)}`
              }
            >
              <svg
                id={coins ? signupRewardCoinSourceId : undefined}
                className="signup-reward-amount-icon"
                content={icon}
                current-color={tint}
              />
              <text className="signup-reward-amount" data-testid={ids.amount}>
                {coins ? `+${shown}` : copy.hoursShort(reward.hours)}
              </text>
            </view>
            <text className="launch-body">{body}</text>
          </view>
        </scroll-view>
        <view className="launch-actions" data-testid={ids.gotIt}>
          <Button label={copy.gotIt} variant="brand" size="xl" width="fill" bindtap={done} />
        </view>
      </view>
      {flying && flies ? (
        <LaunchCoinFlight
          targetId={coinTargetId}
          sourceId={signupRewardCoinSourceId}
          onLanded={landed}
        />
      ) : null}
    </view>
  );
}

/** 가입 보상 모달(ADR-0174) — 보상 틀에 가입 문구를 꽂습니다. */
export function SignupRewardModal({
  amount,
  fromGuest,
  ...rest
}: SignupRewardModalProps): ReactNode {
  const copy = useUiCopy().signupReward;
  return (
    <RewardModal
      {...rest}
      tag={copy.tag}
      title={copy.title}
      body={fromGuest ? copy.bodyGuest : copy.bodyNew}
      reward={{ kind: "coins", amount }}
    />
  );
}
