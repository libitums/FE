import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";

import { useUiCopy } from "../../lib/ui-copy";
import coinPouchArt from "../coin-shop/assets/coin-pouch.webp";
import { signupRewardTestIds as ids, type SignupRewardCardProps } from "./signup-reward.contract";

import "./signup-reward.css";

// 가입 권유 카드(ADR-0174, 시안 Main) — 손님에게만, 여정 지도 하단 바텀 내비 위. 그림은 상점의 coin-pouch 그대로(새 그림 없음)이고
// 가끔 통 튑니다(움직임 줄이기면 멈춤). 카드 전체가 단추 하나로 낭독되고, 누르면 손님 로그인(ADR-0111)이 열립니다. 닫기(X)는 두지
// 않습니다 — 지도가 한가할 때만 서는 터치를 막지 않는 띠이고, 지도 아래 여백이 카드 몫보다 커 내용을 가리지 않습니다(ADR-0174 D4).
export function SignupRewardCard({ amount, bottom, onSignUp }: SignupRewardCardProps): ReactNode {
  const copy = useUiCopy().signupReward;
  const reduced = useMotion() === "reduced";
  const title = copy.cardTitle(amount);
  const tap = () => {
    "background only";
    onSignUp();
  };
  return (
    <view
      className={`signup-card${reduced ? " signup-still" : ""}`}
      data-testid={ids.card}
      style={{ bottom: `${bottom}px` }}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={`${title}. ${copy.cardBody}`}
      bindtap={tap}
    >
      <view className="signup-card-art">
        <image className="signup-card-pouch" src={coinPouchArt} mode="aspectFit" />
      </view>
      <view className="signup-card-text">
        <text className="signup-card-title">{title}</text>
        <text className="signup-card-body">{copy.cardBody}</text>
      </view>
      <view className="signup-card-pill">
        <text className="signup-card-pill-label">{copy.signUp}</text>
      </view>
    </view>
  );
}
