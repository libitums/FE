import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";
import { TextField } from "@libitums/ui-lynx/text-field";

import { useUiCopy } from "../../lib/ui-copy";
import { ChatModalFrame } from "./ChatModalFrame";
import { canSendFix } from "./chat-rules";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-overlays.css";

export type FixRequestDialogProps = {
  readonly text: string;
  readonly onInput: (value: string) => void;
  readonly onSend: () => void;
  readonly onCancel: () => void;
};

// 「고쳐 주세요」 대화상자(O2)입니다. 입력은 ui-lynx `TextField`(카운터 n/200 · native maxlength 200)이고, 글은
// 상태(`text`)가 정본입니다 — 빈 글(공백만 포함)이면 Send가 꺼집니다.
export function FixRequestDialog({
  text,
  onInput,
  onSend,
  onCancel,
}: FixRequestDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.fix;
  const enabled = canSendFix(text);
  return (
    <ChatModalFrame
      testId={ids.fixDialog}
      title={copy.title}
      description={copy.description}
      align="start"
      actions={
        <>
          <view className="chat-modal-action" data-testid={ids.fixCancel}>
            <Button
              label={copy.cancel}
              variant="outline"
              size="xl"
              width="fill"
              bindtap={onCancel}
            />
          </view>
          <view
            className="chat-modal-action"
            data-testid={ids.fixSend}
            data-enabled={enabled ? "true" : "false"}
          >
            <Button
              label={copy.send}
              variant="brand"
              size="xl"
              width="fill"
              disabled={!enabled}
              bindtap={onSend}
            />
          </view>
        </>
      }
    >
      <view className="chat-fix-field" data-testid={ids.fixField}>
        <TextField
          accessibilityLabel={copy.title}
          placeholder={copy.placeholder}
          defaultValue={text}
          counter={{ maxLength: CHAT_PLACEHOLDERS.fixMaxLength }}
          bindinput={onInput}
        />
      </view>
    </ChatModalFrame>
  );
}
