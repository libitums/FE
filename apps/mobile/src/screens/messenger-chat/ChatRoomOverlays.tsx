import type { ReactNode } from "@lynx-js/react";

import { useLayerBack } from "../../lib/use-back-handler";
import { AskMediaDialog } from "./AskMediaDialog";
import { ChatSettingsSidebar } from "./ChatSettingsSidebar";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatRoomAction, ChatRoomState } from "./chat-room-state";
import type { ChatSource, ChatThread } from "./chat-source.contract";
import { DeleteChatDialog } from "./DeleteChatDialog";
import { FixRequestDialog } from "./FixRequestDialog";
import { GemShopLayer } from "./GemShopLayer";
import { RegenerateIdeasDialog } from "./RegenerateIdeasDialog";
import { ReportSheet } from "./ReportSheet";
import { StoryPointSheet } from "./StoryPointSheet";

import "./chat-overlays.css";

export type ChatRoomOverlaysProps = {
  readonly state: ChatRoomState;
  readonly dispatch: (action: ChatRoomAction) => void;
  readonly thread: ChatThread;
  readonly source: ChatSource;
  readonly learnerName: string;
  readonly gemBalance: number;
};

// `state.overlay.kind` → 겹침 하나(동시에 둘 없음). 「…」 메뉴는 독 쪽이 그리므로 여기서는 아무것도 그리지 않습니다.
// ui-lynx 시트 · 대화상자 · 사이드바에는 닫기와 같은 함수를 시스템 뒤로가기에 올립니다(`ChatModalFrame` · `GemShopLayer`는
// 스스로 올립니다).
export function ChatRoomOverlays({
  state,
  dispatch,
  thread,
  source,
  learnerName,
  gemBalance,
}: ChatRoomOverlaysProps): ReactNode {
  const { overlay } = state;
  const { roomId } = thread;
  const close = () => {
    "background only";
    dispatch({ type: "close-overlay" });
  };
  const ownsBack =
    overlay.kind === "report" ||
    overlay.kind === "regen" ||
    overlay.kind === "sidebar" ||
    overlay.kind === "story-point" ||
    overlay.kind === "delete-confirm";
  useLayerBack(ownsBack ? close : null);

  switch (overlay.kind) {
    case "none":
    case "more-menu":
      return null;
    case "report":
      return (
        <ReportSheet
          reasons={overlay.reasons}
          onToggle={(id) => dispatch({ type: "toggle-report-reason", id })}
          onSend={() => {
            source.report(roomId, overlay.reasons);
            dispatch({ type: "close-overlay" });
          }}
          onClose={close}
        />
      );
    case "fix":
      return (
        <FixRequestDialog
          text={overlay.text}
          onInput={(value) => dispatch({ type: "fix-input", value })}
          onSend={() => {
            source.requestFix(roomId, overlay.text);
            dispatch({ type: "close-overlay" });
          }}
          onCancel={close}
        />
      );
    case "regen":
      return (
        <RegenerateIdeasDialog
          onConfirm={() => {
            source.regenerateIdeas(roomId);
            // 보기 패널이 열려 있으면 그대로 새 보기로 — 고른 표시는 지웁니다.
            if (state.slot.kind === "ideas") dispatch({ type: "open-ideas" });
            dispatch({ type: "close-overlay" });
          }}
          onCancel={close}
        />
      );
    case "ask-media":
      return (
        <AskMediaDialog
          media={overlay.media}
          name={thread.counterpart.name}
          balance={gemBalance}
          price={CHAT_PLACEHOLDERS.price[overlay.media]}
          onConfirm={() => {
            source.requestMedia(roomId, overlay.media);
            dispatch({ type: "close-overlay" });
          }}
          onGetGems={() =>
            dispatch({
              type: "open-overlay",
              overlay: {
                kind: "gem-shop",
                from: overlay.media === "photo" ? "ask-photo" : "ask-voice",
              },
            })
          }
          onCancel={close}
        />
      );
    case "sidebar":
      return (
        <ChatSettingsSidebar
          thread={thread}
          learnerName={learnerName}
          gemBalance={gemBalance}
          onGetGems={() =>
            dispatch({ type: "open-overlay", overlay: { kind: "gem-shop", from: "sidebar" } })
          }
          onStoryPoint={() =>
            dispatch({
              type: "open-overlay",
              overlay: { kind: "story-point", selected: thread.settings.storyPointId },
            })
          }
          onAutoIdeas={(on) => source.setAutoIdeas(roomId, on)}
          onDelete={() => dispatch({ type: "open-overlay", overlay: { kind: "delete-confirm" } })}
          onClose={close}
        />
      );
    case "story-point":
      return (
        <StoryPointSheet
          name={thread.counterpart.name}
          storyPoints={thread.storyPoints}
          currentId={thread.settings.storyPointId}
          selected={overlay.selected}
          onSelect={(id) => dispatch({ type: "select-story-point", id })}
          onChange={() => {
            source.setStoryPoint(roomId, overlay.selected);
            dispatch({ type: "close-overlay" });
          }}
          onClose={close}
        />
      );
    case "delete-confirm":
      return (
        <DeleteChatDialog
          name={thread.counterpart.name}
          // 지우면 방이 사라져 화면이 `onExit`로 나갑니다 — 여기서 겹침을 따로 닫지 않습니다.
          onConfirm={() => source.deleteRoom(roomId)}
          onCancel={close}
        />
      );
    case "gem-shop":
      return <GemShopLayer gemBalance={gemBalance} onClose={close} />;
    default: {
      const unreachable: never = overlay;
      return unreachable;
    }
  }
}
