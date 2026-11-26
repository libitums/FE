import type { ReactNode } from "@lynx-js/react";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { chatStoryThumbTestIds as ids, type ChatStoryThumbView } from "./chat-story-thumb.contract";
import { MyPhotoStoryCard } from "./MyPhotoStoryCard";
import { MyTextStoryCard } from "./MyStoryReactions";

import "./chat-story-thumb.css";

/** 내 스토리를 그리는 기준 바탕 390 × 694(9:16) — 보기와 같은 카드를 이 크기로 그린 뒤 판 너비(인물의 반응 위 118 · 내 답 위 96)로 줄입니다. */
const BASE_W = 390;
const BASE_H = 694;

/** 기준 바탕을 판 가운데에 두고 가운데 기준으로 줄입니다(transform-origin 없이). */
function canvasStyle(width: number) {
  return {
    left: `${(width - BASE_W) / 2}px`,
    top: `${((width * BASE_H) / BASE_W - BASE_H) / 2}px`,
    transform: `scale(${width / BASE_W})`,
  };
}

/**
 * 대화방 스토리 인용 판(ADR-0178 D5 개정 ⟨판⟩ · ADR-0194 개정 ⟨판⟩, 시안 37 ~ 39 · 40a) — 내 스토리는 전체 화면 보기와 같은 카드(사진 · 글)를
 * 줄여 올린 그대로, 친구 스토리는 그림을 판 가득(지났으면 흐리게 + 「Ended」), 지운 것은 회색 판. 낭독은 감싸는 인용이 한 덩어리로 집니다.
 */
export function ChatStoryThumbFace({
  view,
  incoming,
  imageUrl,
  photoUrl,
}: {
  readonly view: ChatStoryThumbView;
  readonly incoming: boolean;
  readonly imageUrl: string | null;
  readonly photoUrl: ((imagePath: string) => Promise<string | null>) | undefined;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.quote;
  const ended = view.kind === "friend" && view.ended;
  return (
    <view
      className={`chat-story-thumb chat-story-thumb-${incoming ? "in" : "out"}`}
      data-testid={ids.thumb}
      accessibility-elements-hidden={true}
    >
      {view.kind === "deleted" ? (
        <text className="chat-story-thumb-note">{copy.deleted}</text>
      ) : view.kind === "mine" ? (
        <view className="chat-story-thumb-canvas" style={canvasStyle(incoming ? 118 : 96)}>
          {view.story.kind === "photo" ? (
            <MyPhotoStoryCard
              story={view.story}
              {...(photoUrl === undefined ? {} : { photoUrl })}
            />
          ) : (
            <MyTextStoryCard story={view.story} />
          )}
        </view>
      ) : imageUrl === null ? null : (
        <image className="my-story-photo" src={imageUrl} mode="aspectFill" />
      )}
      {ended ? (
        <view className="chat-story-thumb-ended" data-testid={ids.ended}>
          <text className="chat-story-thumb-note">{copy.ended}</text>
        </view>
      ) : null}
    </view>
  );
}

/** 24시간 지난 친구 스토리 판을 누르면 서는 안내 시트(시안 40번) — 제목과 OK만, 지난 스토리 보기 단추는 아직 없습니다(유료 지난 스토리 미결정). */
export function ChatStoryEndedSheet({ onClose }: { readonly onClose: () => void }): ReactNode {
  const copy = useUiCopy().messengerChat.myStories;
  useLayerBack(onClose);
  return (
    <view data-testid={ids.endedSheet}>
      <AppBottomSheet
        title={copy.quote.endedTitle}
        closeAccessibilityLabel={copy.window.close}
        actions={[{ id: "ok", label: copy.window.ok, bindtap: onClose }]}
        ondismiss={onClose}
      />
    </view>
  );
}
