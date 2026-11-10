import type { ReactNode } from "@lynx-js/react";

import arrowUp from "@libitums/icons/lynx/arrow-up";
import infinity from "@libitums/icons/lynx/infinity";
import { color } from "@libitums/design-tokens";

import { coinIcon, coinTextColor } from "../../components/coin-icon";
import { useUiCopy } from "../../lib/ui-copy";
import {
  chatTurnsTestIds as ids,
  type CoinSendButtonProps,
  type LastFreeStripProps,
  type TurnLineProps,
} from "./chat-turns.contract";
import type { ResetClock, TurnPlan } from "./free-turns";
import { SLOP_ROUND, SLOP_STRIP } from "./hit-slop";
import type { TurnsCopy } from "./messenger-chat-copy-1-5.contract";

import "./chat-turns.css";

// 턴 표시 조각입니다(messenger-chat-1-5 spec §6.2). 계산은 free-turns가 지고 여기서는 계획을 글 · 색 · 단추로 그리기만 합니다.

type LineTone = "muted" | "brand" | "coin";
type LineView = { readonly text: string; readonly tone: LineTone };

function lineOf(
  plan: Exclude<TurnPlan, { kind: "unlimited" }>,
  reset: ResetClock,
  copy: TurnsCopy,
): LineView {
  switch (plan.kind) {
    case "free":
      return { text: copy.freeLeft(plan.remaining, plan.total), tone: "muted" };
    case "last-free":
      return { text: copy.lastFree, tone: "brand" };
    case "coin":
      return plan.outPanel === "due"
        ? { text: copy.used, tone: "brand" }
        : {
            text: copy.coinEach(plan.price, copy.reset(reset.hours, reset.minutes)),
            tone: "coin",
          };
    default: {
      const unreachable: never = plan;
      return unreachable;
    }
  }
}

/** 턴 줄의 글입니다(낭독용으로도 씁니다 — 접근성 M3). 무제한이면 빈 글. */
export function turnLineTextOf(plan: TurnPlan, reset: ResetClock, copy: TurnsCopy): string {
  return plan.kind === "unlimited" ? "" : lineOf(plan, reset, copy).text;
}

/** 머리 제목 아래 한 줄입니다. unlimited면 아무것도 그리지 않습니다(null). */
export function TurnLine({ plan, reset }: TurnLineProps): ReactNode {
  const copy = useUiCopy().messengerChat.turns;
  if (plan.kind === "unlimited") return null;
  const { text, tone } = lineOf(plan, reset, copy);
  return (
    <text
      className={`chat-turn-line chat-turn-line-${tone}`}
      style={tone === "coin" ? { color: coinTextColor } : undefined}
      data-testid={ids.line}
      data-plan={plan.kind}
      accessibility-element={true}
      accessibility-label={text}
      text-maxline="1"
    >
      {text}
    </text>
  );
}

/** 마지막 무료 한 통일 때 입력 줄 위에 서는 띠입니다(T2). */
export function LastFreeStrip({ price, onGoUnlimited }: LastFreeStripProps): ReactNode {
  const copy = useUiCopy().messengerChat.turns;
  const text = copy.strip(price);
  return (
    <view className="chat-turn-strip" data-testid={ids.strip}>
      <text
        className="chat-turn-strip-text"
        accessibility-element={true}
        accessibility-label={text}
      >
        {text}
      </text>
      <view
        className="chat-turn-strip-button"
        id={ids.stripUnlimited}
        data-testid={ids.stripUnlimited}
        hit-slop={SLOP_STRIP}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={copy.goUnlimited}
        bindtap={() => {
          "background only";
          onGoUnlimited();
        }}
      >
        <svg className="chat-turn-icon-xs" content={infinity} current-color={color.white} />
        <text className="chat-turn-strip-button-label" accessibility-elements-hidden={true}>
          {copy.goUnlimited}
        </text>
      </view>
    </view>
  );
}

/** T4 보내기 자리의 알약입니다 — 흰 원판 위 엽전 + 가격 + 화살표. 빈 글이면 꺼집니다(잔액 부족은 켠 채 눌러서 상점으로 갑니다). */
export function CoinSendButton({
  price,
  enabled,
  short = false,
  onTap,
}: CoinSendButtonProps): ReactNode {
  const copy = useUiCopy().messengerChat.turns;
  return (
    <view
      className={enabled ? "chat-coin-send" : "chat-coin-send chat-coin-send-disabled"}
      id={ids.coinSend}
      data-testid={ids.coinSend}
      data-enabled={enabled ? "true" : "false"}
      hit-slop={SLOP_ROUND}
      accessibility-element={true}
      accessibility-traits={enabled ? "button" : "disabled"}
      accessibility-label={short ? copy.coinSendShortLabel : copy.coinSendLabel(price)}
      bindtap={
        enabled
          ? () => {
              "background only";
              onTap();
            }
          : undefined
      }
    >
      <view className="chat-coin-disc" accessibility-elements-hidden={true}>
        <svg className="chat-turn-icon-xs" content={coinIcon} />
      </view>
      <text
        className={
          enabled ? "chat-coin-send-price" : "chat-coin-send-price chat-coin-send-price-disabled"
        }
        accessibility-elements-hidden={true}
      >
        {String(price)}
      </text>
      <svg
        className="chat-turn-icon-xs"
        content={arrowUp}
        current-color={enabled ? color.white : color.fg["neutral-subtlest"]}
      />
    </view>
  );
}
