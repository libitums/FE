import type { ReactNode } from "@lynx-js/react";

import { AskMediaOverlay } from "./AskMediaOverlay";
import { BirthYearSheet } from "./BirthYearSheet";
import { ChatSettingsSidebar } from "./ChatSettingsSidebar";
import type { ChatRoomAction, ChatRoomState } from "./chat-room-state";
import type {
  ChatBirthYear,
  ChatPreferences,
  ChatSource,
  ChatThread,
} from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";
import { ClearChatDialog } from "./ClearChatDialog";
import { UnsentDialog } from "./ChatDelivery";
import { FeedbackModeSheet } from "./FeedbackModeSheet";
import { CoinShopLayer } from "./CoinShopLayer";
import { ChatPhotoLayer } from "./ChatPhotoLayer";
import { RatingSheet } from "./RatingSheet";
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
  /** 인물 앨범 화면을 메신저 스택에 쌓습니다(ADR-0150). */
  readonly onOpenAlbum?: (roomId: string, name: string) => void;
  /** 사이드바 My profile — 설정 탭의 User profile로 갑니다(ADR-0156, 없으면 무동작). */
  readonly onOpenMyProfile?: () => void;
};

// `state.overlay.kind` → 겹침 하나(동시에 둘 없음). 「…」 메뉴는 독 쪽이, 프로필 시트는 방 화면이 그리므로 여기서는 아무것도 그리지 않습니다.
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
  onOpenAlbum,
  onOpenMyProfile,
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
    case "profile":
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
    case "rate-down": {
      const save = () =>
        source.rateMessage(roomId, overlay.messageId, {
          value: "down",
          reasons: overlay.reasons,
          note: overlay.note.trim() === "" ? null : overlay.note.trim(),
        });
      return (
        <RatingSheet
          name={thread.counterpart.name}
          reasons={overlay.reasons}
          note={overlay.note}
          onToggle={(reason) => dispatch({ type: "toggle-rate-reason", reason })}
          onNote={(value) => dispatch({ type: "rate-note", value })}
          onSend={() => {
            save();
            dispatch({ type: "close-overlay" });
          }}
          onReport={() => {
            // 평가를 남기고 신고 시트로 넘어갑니다 — 신고 사유는 새로 고릅니다.
            save();
            dispatch({
              type: "open-overlay",
              overlay: { kind: "report", reasons: [], from: "rating" },
            });
          }}
          onClose={close}
        />
      );
    }
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
        <AskMediaOverlay
          media={overlay.media}
          {...{ dispatch, thread, source, wallet, coinBalance, preferences }}
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
          onAlbum={() => {
            dispatch({ type: "close-overlay" });
            onOpenAlbum?.(roomId, thread.counterpart.name);
          }}
          feedbackMode={preferences.feedbackMode}
          onFeedbackMode={() =>
            dispatch({
              type: "open-overlay",
              overlay: { kind: "feedback-mode", selected: preferences.feedbackMode },
            })
          }
          onMyProfile={() => {
            dispatch({ type: "dismiss-overlays" });
            onOpenMyProfile?.();
          }}
          replyIdeas={preferences.replyIdeas}
          onReplyIdeas={(on) => source.setPreferences({ replyIdeas: on })}
          onClear={() =>
            dispatch({ type: "open-overlay", overlay: { kind: "clear-confirm", failure: null } })
          }
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
    case "clear-confirm":
      return (
        <ClearChatDialog
          name={thread.counterpart.name}
          failure={overlay.failure}
          // 비우면 방은 남고(대화만 빔) 겹침을 모두 닫고 키보드 자리도 접습니다 — 빈 방은 키보드가 닫힌 채 첫 인사를 받습니다.
          // 못 비우면 대화상자에 까닭이 섭니다.
          onConfirm={() => {
            // 출처 계약은 던지지 않지만, 던져도 대화상자가 멈추지 않게 실패로 둡니다.
            void source
              .clearRoom(roomId)
              .catch(() => "failed" as const)
              .then((outcome) => {
                if (outcome !== "cleared") {
                  dispatch({
                    type: "open-overlay",
                    overlay: { kind: "clear-confirm", failure: outcome },
                  });
                  return;
                }
                dispatch({ type: "dismiss-overlays" });
                dispatch({ type: "close-keyboard" });
              });
          }}
          onCancel={close}
        />
      );
    case "unsent":
      return (
        <UnsentDialog
          onSendAgain={() => {
            source.server?.resend(roomId, overlay.messageId);
            close();
          }}
          onDelete={() => {
            source.server?.discard(roomId, overlay.messageId);
            close();
          }}
          onCancel={close}
        />
      );
    case "coin-shop":
      return (
        <CoinShopLayer
          coinBalance={coinBalance}
          onClose={close}
          ownsBack={false}
          from={overlay.from === "send" ? "send" : null}
        />
      );
    case "photo":
    case "photo-redraw":
      return (
        <ChatPhotoLayer
          step={overlay.kind === "photo" ? "view" : "redraw"}
          messageId={overlay.messageId}
          {...{ thread, source, wallet, coinBalance, dispatch }}
        />
      );
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
