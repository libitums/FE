import type { ReactNode } from "@lynx-js/react";

import refresh from "@libitums/icons/lynx/refresh";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { ChatModalFrame } from "./ChatModalFrame";
import type { ChatServerRoom } from "./chat-delivery.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { myMessageTestIds as mine } from "./my-message.contract";

import "./chat-delivery.css";

// 서버 모드 배달 실패 화면 부품입니다(ADR-0138) — 보내지 못한 내 글 · 다시 보내기 대화상자 · 끊긴 답 채우기 줄 · 기록 실패.
// 빨강을 쓰지 않습니다(ADR-0062 D7): 보내지 못한 글은 옅은 주황 면 + 진한 주황 글, 줄은 회색.

const SLOP = { top: "6px", bottom: "6px", left: "6px", right: "6px" } as const;

type UnsentMessageProps = {
  readonly ko: string;
  readonly speaker: string;
  readonly onOpen: () => void;
};

/** 서버가 받지 못한 내 글 — 흐린 말풍선 + 「Not sent」 + 다시 보내기(↻). 말풍선을 눌러도 같은 대화상자가 열립니다. */
export function UnsentMessage({ ko, speaker, onOpen }: UnsentMessageProps): ReactNode {
  const copy = useUiCopy().messengerChat.remote;
  const open = () => {
    "background only";
    onOpen();
  };
  return (
    <view className="my-message-stack" data-testid={ids.unsent}>
      <view
        className="my-message-bubble chat-unsent-bubble"
        data-testid={mine.bubble}
        flatten={false}
        accessibility-element={true}
        accessibility-label={`${speaker}: ${ko}, ${copy.notSent}`}
        accessibility-enable-tap={true}
        catchtap={open}
      >
        <text className="my-message-ko chat-unsent-ko">{ko}</text>
      </view>
      <view className="chat-unsent-line">
        <text className="chat-unsent-label" accessibility-elements-hidden={true}>
          {copy.notSent}
        </text>
        <view
          className="chat-unsent-retry"
          data-testid={ids.unsentRetry}
          hit-slop={SLOP}
          flatten={false}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.sendAgain}
          accessibility-enable-tap={true}
          catchtap={open}
        >
          <svg
            className="chat-unsent-icon"
            content={refresh}
            current-color={color.fg["neutral-muted"]}
          />
        </view>
      </view>
    </view>
  );
}

type UnsentDialogProps = {
  readonly onSendAgain: () => void;
  readonly onDelete: () => void;
  readonly onCancel: () => void;
};

// ui-lynx `Dialog`는 버튼이 둘까지라 앱 상자(`ChatModalFrame`)에 셋을 세로로 둡니다 — 다시 보내기가 주 버튼.
export function UnsentDialog({ onSendAgain, onDelete, onCancel }: UnsentDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.remote;
  const button = (id: string, label: string, variant: "brand" | "outline", onTap: () => void) => (
    <view className="chat-modal-action" data-testid={`${ids.unsentDialog}-${id}`}>
      <Button label={label} variant={variant} size="xl" width="fill" bindtap={onTap} />
    </view>
  );
  return (
    <view className="chat-unsent-dialog">
      <ChatModalFrame
        testId={ids.unsentDialog}
        title={copy.unsentTitle}
        description={copy.unsentDescription}
        actions={
          <>
            {button("send", copy.sendAgain, "brand", onSendAgain)}
            {button("delete", copy.deleteUnsent, "outline", onDelete)}
            {button("cancel", copy.cancel, "outline", onCancel)}
          </>
        }
      />
    </view>
  );
}

function TextButton({
  label,
  testId,
  onTap,
}: {
  label: string;
  testId: string;
  onTap: () => void;
}) {
  return (
    <view
      className="chat-delivery-action"
      data-testid={testId}
      hit-slop={SLOP}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      accessibility-enable-tap={true}
      catchtap={() => {
        "background only";
        onTap();
      }}
    >
      <text className="chat-delivery-action-text">{label}</text>
    </view>
  );
}

/** 끊긴 답 채우기 줄 — 채우는 중(문장만) · 못 채움(Refresh). */
export function ChatRecoveryRow({
  recovery,
  onRefresh,
}: {
  readonly recovery: ChatServerRoom["recovery"];
  readonly onRefresh: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.remote;
  if (recovery === "none") return null;
  const text = recovery === "fetching" ? copy.recovering : copy.stalled;
  return (
    <view className="chat-delivery-row" data-testid={ids.recovery} data-state={recovery}>
      <text
        className="chat-delivery-text"
        flatten={false}
        accessibility-element={true}
        accessibility-label={text}
      >
        {text}
      </text>
      {recovery === "stalled" ? (
        <TextButton label={copy.refresh} testId={ids.recoveryRefresh} onTap={onRefresh} />
      ) : null}
    </view>
  );
}

/** 기록 · 첫 인사를 못 받음 — 빈 방은 가운데 안내, 글이 있는 방은 맨 위 한 줄. 둘 다 Try again. */
export function ChatHistoryFailed({
  empty,
  onRetry,
}: {
  readonly empty: boolean;
  readonly onRetry: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.remote;
  if (!empty) {
    return (
      <view className="chat-delivery-row" data-testid={ids.historyFailed} data-layout="row">
        <text
          className="chat-delivery-text"
          flatten={false}
          accessibility-element={true}
          accessibility-label={copy.loadFailedNew}
        >
          {copy.loadFailedNew}
        </text>
        <TextButton label={copy.tryAgain} testId={ids.historyRetry} onTap={onRetry} />
      </view>
    );
  }
  return (
    <view className="chat-history-failed" data-testid={ids.historyFailed} data-layout="empty">
      <view className="chat-history-failed-icon" accessibility-elements-hidden={true}>
        <svg
          className="chat-unsent-icon"
          content={refresh}
          current-color={color.fg["neutral-subtle"]}
        />
      </view>
      <view
        className="chat-history-failed-copy"
        flatten={false}
        accessibility-element={true}
        accessibility-label={`${copy.loadFailedTitle}. ${copy.loadFailedBody}`}
      >
        <text className="chat-history-failed-title">{copy.loadFailedTitle}</text>
        <text className="chat-history-failed-body">{copy.loadFailedBody}</text>
      </view>
      <TextButton label={copy.tryAgain} testId={ids.historyRetry} onTap={onRetry} />
    </view>
  );
}
