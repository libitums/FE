import type { ReactNode } from "@lynx-js/react";

import arrowUp from "@libitums/icons/lynx/arrow-up";
import light from "@libitums/icons/lynx/light";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { PHONE_INPUT_ELEMENT_ID } from "./chat-input-id";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatRoomState } from "./chat-room-state";
import { SLOP_BULB, SLOP_ROUND } from "./hit-slop";
import type { PhoneFocus } from "./keyboard-height";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./messenger-chat.css";

export type IdeasBulbButtonProps = {
  readonly disabled: boolean;
  /** 보기 패널이 열려 있으면 면이 짙어집니다. */
  readonly open?: boolean;
  readonly onTap: () => void;
};
export type SendButtonProps = { readonly enabled: boolean; readonly onTap: () => void };
export type ComposerFieldProps = {
  readonly state: ChatRoomState;
  readonly onPhoneInput: (value: string) => void;
  readonly onPhoneFocus: (focus: PhoneFocus) => void;
  readonly onConfirm: () => void;
  /** 키보드가 닫혀 있을 때 입력 칸을 누르면 키보드를 엽니다. */
  readonly onOpenKeyboard: () => void;
};
export type ComposerRowProps = ComposerFieldProps & {
  readonly ideasDisabled: boolean;
  readonly sendEnabled: boolean;
  readonly onIdeas: () => void;
  readonly onSend: () => void;
};

type NativeInputEvent = { readonly detail: { readonly value: string } };

// 입력 줄 — 입력 칸(왼쪽 안에 전구)과 보내기. 칸 안은 학습 키보드 · 보기 모드의 글 표시와 늘 마운트된 <input>이 겹칩니다.
export function ComposerRow({
  state,
  ideasDisabled,
  sendEnabled,
  onIdeas,
  onSend,
  onPhoneInput,
  onPhoneFocus,
  onConfirm,
  onOpenKeyboard,
}: ComposerRowProps): ReactNode {
  const phoneFocused = state.keyboard === "phone" && state.phoneFocus === "focused";
  return (
    <view className="messenger-chat-composer" data-testid={ids.composer}>
      <view
        className={
          phoneFocused
            ? "messenger-chat-composer-pill messenger-chat-composer-pill-focused"
            : "messenger-chat-composer-pill"
        }
        data-focused={phoneFocused ? "true" : "false"}
      >
        <IdeasBulbButton
          disabled={ideasDisabled}
          open={state.slot.kind === "ideas"}
          onTap={onIdeas}
        />
        <ComposerField
          state={state}
          onPhoneInput={onPhoneInput}
          onPhoneFocus={onPhoneFocus}
          onConfirm={onConfirm}
          onOpenKeyboard={onOpenKeyboard}
        />
      </view>
      <SendButton enabled={sendEnabled} onTap={onSend} />
    </view>
  );
}

export function IdeasBulbButton({ disabled, open, onTap }: IdeasBulbButtonProps): ReactNode {
  const copy = useUiCopy().messengerChat.composer;
  const classes = ["messenger-chat-bulb"];
  if (open === true) classes.push("messenger-chat-bulb-open");
  if (disabled) classes.push("messenger-chat-bulb-disabled");
  return (
    <view
      className={classes.join(" ")}
      id={ids.ideasButton}
      data-testid={ids.ideasButton}
      data-open={open === true ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
      hit-slop={SLOP_BULB}
      accessibility-element={true}
      accessibility-traits={disabled ? "disabled" : "button"}
      accessibility-label={open === true ? copy.ideasOpen : copy.ideas}
      bindtap={
        disabled
          ? undefined
          : () => {
              "background only";
              onTap();
            }
      }
    >
      <svg
        className="messenger-chat-icon-xs"
        content={light}
        current-color={color.fg["neutral-muted"]}
      />
    </view>
  );
}

// 입력 칸 — 학습 키보드 · 보기 모드에서는 글 표시가 보이고 <input>은 투명 · 터치 없음 · 낭독 숨김(숨은 입력),
// 휴대폰 키보드 모드에서는 <input>이 보이고 글 표시가 빠집니다. <input>은 늘 마운트되어 있어 초점을 바로 줄 수 있습니다.
// 휴대폰 밖에서 글이 바뀌면(epoch) <input>을 default-value로 다시 마운트해 넣습니다.
export function ComposerField({
  state,
  onPhoneInput,
  onPhoneFocus,
  onConfirm,
  onOpenKeyboard,
}: ComposerFieldProps): ReactNode {
  const copy = useUiCopy().messengerChat.composer;
  const phoneActive = state.keyboard === "phone" && state.slot.kind === "keyboard";
  const empty = state.text === "";
  const caret = <view className="messenger-chat-caret" accessibility-elements-hidden={true} />;
  return (
    <view
      className="messenger-chat-field"
      data-testid={ids.field}
      data-keyboard={state.keyboard}
      bindtap={
        state.slot.kind === "closed"
          ? () => {
              "background only";
              onOpenKeyboard();
            }
          : undefined
      }
    >
      <view
        className={`messenger-chat-display${phoneActive ? " messenger-chat-display-off" : ""}`}
        data-testid={ids.display}
        accessibility-element={!phoneActive}
        accessibility-label={copy.placeholder}
        accessibility-value={empty ? undefined : state.text}
      >
        {empty ? caret : null}
        <text
          className={`messenger-chat-display-text${empty ? " messenger-chat-display-placeholder" : ""}`}
          accessibility-element={false}
        >
          {empty ? copy.placeholder : state.text}
        </text>
        {empty ? null : caret}
      </view>
      <input
        key={state.inputEpoch}
        id={PHONE_INPUT_ELEMENT_ID}
        className={`messenger-chat-phone-input${phoneActive ? "" : " messenger-chat-phone-input-off"}`}
        data-testid={ids.input}
        default-value={state.text}
        placeholder={copy.placeholder}
        maxlength={CHAT_PLACEHOLDERS.messageMaxLength}
        confirm-type="send"
        confirm-enter={true}
        accessibility-element={phoneActive}
        accessibility-label={copy.placeholder}
        accessibility-elements-hidden={phoneActive ? undefined : true}
        user-interaction-enabled={phoneActive}
        bindinput={(event: NativeInputEvent) => {
          "background only";
          onPhoneInput(event.detail.value);
        }}
        bindfocus={() => {
          "background only";
          onPhoneFocus("focused");
        }}
        bindblur={() => {
          "background only";
          onPhoneFocus("blurred");
        }}
        bindconfirm={() => {
          "background only";
          onConfirm();
        }}
      />
    </view>
  );
}

export function SendButton({ enabled, onTap }: SendButtonProps): ReactNode {
  const copy = useUiCopy().messengerChat.composer;
  return (
    <view
      className={
        enabled ? "messenger-chat-send" : "messenger-chat-send messenger-chat-send-disabled"
      }
      id={ids.send}
      data-testid={ids.send}
      data-enabled={enabled ? "true" : "false"}
      hit-slop={SLOP_ROUND}
      accessibility-element={true}
      accessibility-traits={enabled ? "button" : "disabled"}
      accessibility-label={copy.send}
      bindtap={
        enabled
          ? () => {
              "background only";
              onTap();
            }
          : undefined
      }
    >
      <svg
        className="messenger-chat-icon-sm"
        content={arrowUp}
        current-color={enabled ? color.white : color.fg["neutral-subtlest"]}
      />
    </view>
  );
}
