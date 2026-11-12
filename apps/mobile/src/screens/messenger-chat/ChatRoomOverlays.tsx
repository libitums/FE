import type { ReactNode } from "@lynx-js/react";

import { AskMediaDialog } from "./AskMediaDialog";
import { BirthYearSheet } from "./BirthYearSheet";
import { ChatSettingsSidebar } from "./ChatSettingsSidebar";
import { CHAT_COIN_PRICES } from "./chat-coins";
import type { ChatOverlay, ChatRoomAction, ChatRoomState } from "./chat-room-state";
import type {
  ChatBirthYear,
  ChatMediaKind,
  ChatPreferences,
  ChatSource,
  ChatThread,
} from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";
import { DeleteChatDialog } from "./DeleteChatDialog";
import { FeedbackModeSheet } from "./FeedbackModeSheet";
import { FixRequestDialog } from "./FixRequestDialog";
import { CoinShopLayer } from "./CoinShopLayer";
import { RegenerateIdeasDialog } from "./RegenerateIdeasDialog";
import { ReportSheet } from "./ReportSheet";
import { birthYearOptions } from "./safety-rules";
import { StoryPointSheet } from "./StoryPointSheet";

import "./chat-overlays.css";

export type ChatRoomOverlaysProps = {
  readonly state: ChatRoomState;
  readonly dispatch: (action: ChatRoomAction) => void;
  readonly thread: ChatThread;
  readonly source: ChatSource;
  readonly learnerName: string;
  /** 지갑입니다 — 요청 모달이 확정할 때 여기서 엽전을 씁니다(spec §6.3). */
  readonly wallet: CoinWallet;
  /** 지금 잔액입니다(지갑 구독 값 — 사이드바 · 모달 · 상점이 같은 수를 봅니다). */
  readonly coinBalance: number;
  readonly birthYear: ChatBirthYear;
  readonly preferences: ChatPreferences;
  /** 인물 기억 화면을 메신저 스택에 쌓습니다(ADR-0126). */
  readonly onOpenMemories: (characterId: string, name: string) => void;
};

const askShop = (media: ChatMediaKind): Extract<ChatOverlay, { kind: "coin-shop" }> => ({
  kind: "coin-shop",
  from: media === "photo" ? "ask-photo" : "ask-voice",
});

// `state.overlay.kind` → 겹침 하나(동시에 둘 없음). 「…」 메뉴는 독 쪽이 그리므로 여기서는 아무것도 그리지 않습니다.
// 시스템 뒤로가기는 여기도 겹침 화면들도 등록하지 않습니다 — `useChatRoom`이 단 하나의 주인입니다(리뷰 #8).
export function ChatRoomOverlays({
  state,
  dispatch,
  thread,
  source,
  learnerName,
  wallet,
  coinBalance,
  birthYear,
  preferences,
  onOpenMemories,
}: ChatRoomOverlaysProps): ReactNode {
  const { overlay } = state;
  const { roomId } = thread;
  const close = () => {
    "background only";
    dispatch({ type: "close-overlay" });
  };
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
          balance={coinBalance}
          price={CHAT_COIN_PRICES[overlay.media]}
          onConfirm={() => {
            // 무제한이어도 요청은 엽전을 냅니다(턴과 별개). 모자라면(그 사이 잔액이 줄었으면) 요청 없이 상점으로 갑니다.
            const spent = wallet.spend(CHAT_COIN_PRICES[overlay.media], overlay.media);
            if (spent.kind === "short") {
              dispatch({ type: "open-overlay", overlay: askShop(overlay.media) });
              return;
            }
            source.requestMedia(roomId, overlay.media);
            dispatch({ type: "close-overlay" });
          }}
          onGetCoins={() => dispatch({ type: "open-overlay", overlay: askShop(overlay.media) })}
          onCancel={close}
        />
      );
    case "sidebar":
      return (
        <ChatSettingsSidebar
          thread={thread}
          learnerName={learnerName}
          coinBalance={coinBalance}
          onGetCoins={() =>
            dispatch({ type: "open-overlay", overlay: { kind: "coin-shop", from: "sidebar" } })
          }
          onStoryPoint={() =>
            dispatch({
              type: "open-overlay",
              overlay: { kind: "story-point", selected: thread.settings.storyPointId },
            })
          }
          birthYear={birthYear}
          onBirthYear={() =>
            dispatch({
              type: "open-overlay",
              overlay: {
                kind: "birth-year",
                selected: birthYear.kind === "set" ? birthYear.year : null,
                from: "sidebar",
              },
            })
          }
          memories={source.memories({ kind: "character", characterId: thread.counterpart.id })}
          onMemories={() => {
            dispatch({ type: "close-overlay" });
            onOpenMemories(thread.counterpart.id, thread.counterpart.name);
          }}
          feedbackMode={preferences.feedbackMode}
          onFeedbackMode={() =>
            dispatch({
              type: "open-overlay",
              overlay: { kind: "feedback-mode", selected: preferences.feedbackMode },
            })
          }
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
    case "coin-shop":
      return <CoinShopLayer coinBalance={coinBalance} onClose={close} ownsBack={false} />;
    case "birth-year":
      return (
        <BirthYearSheet
          years={birthYearOptions(Date.now())}
          selected={overlay.selected}
          dismissible={overlay.from !== "room"}
          onSelect={(year) => dispatch({ type: "select-birth-year", year })}
          onContinue={() => {
            if (overlay.selected === null) return;
            source.setBirthYear(overlay.selected);
            dispatch({ type: "close-overlay" });
          }}
          onSkip={() => {
            source.setBirthYear(null);
            dispatch({ type: "close-overlay" });
          }}
          onClose={close}
        />
      );
    case "feedback-mode":
      return (
        <FeedbackModeSheet
          name={thread.counterpart.name}
          selected={overlay.selected}
          onSelect={(mode) => dispatch({ type: "select-feedback-mode", mode })}
          onSave={() => {
            source.setPreferences({ feedbackMode: overlay.selected });
            dispatch({ type: "close-overlay" });
          }}
          onClose={close}
        />
      );
    default: {
      const unreachable: never = overlay;
      return unreachable;
    }
  }
}
