import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import diamond from "@libitums/icons/lynx/diamond";
import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { ChatModalFrame } from "./ChatModalFrame";
import { askMediaPlan } from "./chat-rules";
import type { ChatMediaKind } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-overlays.css";

export type AskMediaDialogProps = {
  readonly media: ChatMediaKind;
  readonly name: string;
  readonly balance: number;
  readonly price: number;
  readonly onConfirm: () => void;
  readonly onGetGems: () => void;
  readonly onCancel: () => void;
};

type GemPriceButtonProps = {
  readonly price: number;
  readonly label: string;
  readonly onTap: () => void;
};

// 주 버튼: 흰 다이아몬드 아이콘 + 수. 아이콘만으로 뜻을 전하지 않도록 낭독은 「Ask for {n} gems」 한 문장입니다.
function GemPriceButton({ price, label, onTap }: GemPriceButtonProps): ReactNode {
  const handleTap = () => {
    "background only";
    onTap();
  };
  return (
    <view
      className="chat-modal-action chat-gem-button"
      data-testid={ids.askConfirm}
      data-plan="ask"
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      bindtap={handleTap}
    >
      <svg className="chat-gem-button-icon" content={diamond} current-color={color.white} />
      <text className="chat-gem-button-label" accessibility-elements-hidden={true}>
        {price}
      </text>
    </view>
  );
}

// 사진 · 음성 요청 대화상자(Z4 · Z6)입니다. 미리보기 · 가격 줄은 없고 가격은 주 버튼에만 있습니다.
// 잔액이 모자라면(top-up) 주 버튼이 「Get gems」가 되어 젬 화면으로 갑니다.
export function AskMediaDialog({
  media,
  name,
  balance,
  price,
  onConfirm,
  onGetGems,
  onCancel,
}: AskMediaDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.askMedia;
  const plan = askMediaPlan(balance, price);
  const text = copy[media];
  return (
    <view data-testid={ids.askDialog} data-media={media} data-plan={plan.kind}>
      <ChatModalFrame
        testId={`${ids.askDialog}-frame`}
        title={text.title}
        description={text.description(name)}
        actions={
          <>
            <view className="chat-modal-action" data-testid={ids.askCancel}>
              <Button
                label={copy.cancel}
                variant="outline"
                size="xl"
                width="fill"
                bindtap={onCancel}
              />
            </view>
            {plan.kind === "ask" ? (
              <GemPriceButton
                price={plan.price}
                label={copy.confirmLabel(plan.price)}
                onTap={onConfirm}
              />
            ) : (
              <view className="chat-modal-action" data-testid={ids.askConfirm} data-plan="top-up">
                <Button
                  label={copy.getGems}
                  variant="brand"
                  size="xl"
                  width="fill"
                  bindtap={onGetGems}
                />
              </view>
            )}
          </>
        }
      >
        <text className="chat-ask-balance" data-testid={ids.askBalance}>
          {copy.balance(balance)}
        </text>
      </ChatModalFrame>
    </view>
  );
}
