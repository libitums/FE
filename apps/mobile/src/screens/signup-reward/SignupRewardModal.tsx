import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef, useState } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { coinIcon } from "../../components/coin-icon";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import bigPouchArt from "../coin-shop/assets/big-pouch.webp";
import { LAUNCH_FLYING_COINS, LaunchCoinFlight } from "../launch/LaunchCoinFlight";
import { useCountUp } from "../launch/LaunchModals";
import {
  signupRewardCoinSourceId,
  signupRewardTestIds as ids,
  type SignupRewardModalProps,
} from "./signup-reward.contract";

import "../launch/launch.css";
import "./signup-reward.css";

/** 톡 튀는 엽전 수 — 시안의 여섯 자리. */
const POPS = [0, 1, 2, 3, 4, 5];
/** 금액이 오르기 시작하는 때 — 주머니가 튀어 앉은 뒤(d1 × 18). */
const COUNT_DELAY_MS = 900;

// 가입 보상 모달(ADR-0174, 시안 Reward · Wallet) — 엽전 출시 모달(ADR-0140)과 같은 틀(막 · 흰 상자 · 위 알약 · Got it)입니다.
// big-pouch가 튀어 나타나고 엽전 여섯이 위로 톡 튀며 +0 → +N이 오릅니다. 「Got it」이면 막과 상자가 걷히고 금액 줄의 엽전에서 머리
// 엽전 칩으로 실제 자리를 재어 날아갑니다(LaunchCoinFlight). 움직임 줄이기면 처음부터 최종 값이고 날지 않고 곧바로 닫힙니다.
export function SignupRewardModal({
  amount,
  fromGuest,
  coinTargetId,
  onCoinLanded,
  onFlightStart,
  onDone,
}: SignupRewardModalProps): ReactNode {
  const copy = useUiCopy().signupReward;
  const reduced = useMotion() === "reduced";
  const [flying, setFlying] = useState(false);
  const shown = useCountUp(amount, COUNT_DELAY_MS, reduced);
  // 움직임 줄이기면 날지 않고 곧바로 닫습니다.
  useEffect(() => {
    if (!flying || !reduced) return undefined;
    const handle = setTimeout(() => onDone(), 0);
    return () => clearTimeout(handle);
  }, [flying, reduced, onDone]);
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
    if (!reduced) onFlightStart?.();
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
          {copy.tag}
        </text>
        <scroll-view
          className="launch-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="launch-scroll-body">
            <view className="signup-reward-stage" accessibility-elements-hidden={true}>
              <view className="signup-reward-glow" />
              {POPS.map((index) => (
                <view key={index} className={`signup-reward-pop signup-reward-pop-${index}`}>
                  <svg className="signup-reward-pop-icon" content={coinIcon} />
                </view>
              ))}
              <image className="signup-reward-pouch" src={bigPouchArt} mode="aspectFit" />
            </view>
            <text className="launch-title" accessibility-traits="header">
              {copy.title}
            </text>
            <view
              className="signup-reward-amount-row"
              flatten={false}
              accessibility-element={true}
              accessibility-label={copy.amountSpoken(amount)}
            >
              <svg
                id={signupRewardCoinSourceId}
                className="signup-reward-amount-icon"
                content={coinIcon}
              />
              <text className="signup-reward-amount" data-testid={ids.amount}>
                {`+${shown}`}
              </text>
            </view>
            <text className="launch-body">{fromGuest ? copy.bodyGuest : copy.bodyNew}</text>
          </view>
        </scroll-view>
        <view className="launch-actions" data-testid={ids.gotIt}>
          <Button label={copy.gotIt} variant="brand" size="xl" width="fill" bindtap={done} />
        </view>
      </view>
      {flying && !reduced ? (
        <LaunchCoinFlight
          targetId={coinTargetId}
          sourceId={signupRewardCoinSourceId}
          onLanded={landed}
        />
      ) : null}
    </view>
  );
}
