import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { infinityHeroIcon } from "../../components/infinity-icon";
import bigPouchArt from "../coin-shop/assets/big-pouch.webp";
import {
  signupRewardCoinSourceId,
  signupRewardTestIds as ids,
  type RewardGiftRows,
} from "./signup-reward.contract";

// 선물 두 줄(ADR-0186 개정 3, 시안 GiftA) — 가입 보상 창에서 첫날 무제한이 적용될 때 무대 · 금액 줄 대신 그립니다.
// 엽전 줄: 상점 큰 주머니 그림 + `+N Yeopjeon`(0에서 오름) + 짧은 설명. 주머니가 날기의 출발점입니다.
// 무제한 줄: 주황 칸 위 흰 무한 기호(무제한 모달의 큰 값) + 「Unlimited tickets · 24h」 + 끝 시각 문장. 새 그림은 없습니다.
// 줄마다 한 덩이로 읽힙니다(엽전 줄은 최종 값으로).

export type SignupRewardGiftsProps = {
  readonly rows: RewardGiftRows;
  /** 지금 보이는 금액 줄(`+0` → `+100`)과 낭독할 최종 값. */
  readonly amountShown: string;
  readonly amountSpoken: string;
};

export function SignupRewardGifts({
  rows,
  amountShown,
  amountSpoken,
}: SignupRewardGiftsProps): ReactNode {
  return (
    <view className="signup-gifts" data-testid={ids.gifts}>
      <view
        className="signup-gift signup-gift-coins"
        data-testid={ids.coinsRow}
        flatten={false}
        accessibility-element={true}
        accessibility-label={`${amountSpoken}. ${rows.coinsLine}`}
      >
        <image
          id={signupRewardCoinSourceId}
          className="signup-gift-art"
          src={bigPouchArt}
          mode="aspectFit"
        />
        <view className="signup-gift-text">
          <text className="signup-gift-title" data-testid={ids.amount}>
            {amountShown}
          </text>
          <text className="signup-gift-line">{rows.coinsLine}</text>
        </view>
      </view>
      <view
        className="signup-gift signup-gift-unlimited"
        data-testid={ids.unlimitedRow}
        flatten={false}
        accessibility-element={true}
        accessibility-label={`${rows.unlimitedTitle}. ${rows.unlimitedLine}`}
      >
        <view className="signup-gift-art signup-gift-infinity-tile">
          <svg
            className="signup-gift-infinity"
            content={infinityHeroIcon}
            current-color={color.white}
          />
        </view>
        <view className="signup-gift-text">
          <text className="signup-gift-title">{rows.unlimitedTitle}</text>
          <text className="signup-gift-line">{rows.unlimitedLine}</text>
        </view>
      </view>
    </view>
  );
}
