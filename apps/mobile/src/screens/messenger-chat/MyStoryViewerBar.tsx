// 내 스토리를 친구 스토리와 같은 전체 화면 보기로(ADR-0194 개정 ⟨보기⟩, 시안 34 ~ 36번) — 답장 칸 대신 아래 바(본 친구 · 새 스토리 ·
// 지우기)와 그 위 새 답 줄, 위로 밀거나 「Seen by」를 누르면 답 목록 시트, 글 · 사진은 화면 가득. 판정은 `my-story-viewer.ts`입니다.

import { useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import menu from "@libitums/icons/lynx/menu";
import plus from "@libitums/icons/lynx/plus";
import trash from "@libitums/icons/lynx/trash";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { spokenOf } from "./friend-stories";
import { myStoriesTestIds as ids, type MyStory } from "./my-stories.contract";
import { isSwipeUp, myStoryBarOf } from "./my-story-viewer";
import type { MyStoryViewerMine } from "./my-story-viewer.contract";
import { MyPhotoStoryCard } from "./MyPhotoStoryCard";
import { MyTextStoryCard, SeenBy } from "./MyStoryReactions";
import { MyStoryReplyList } from "./MyStoryReplyList";
import { IconButton } from "./StoryViewerParts";

import "./my-story-viewer.css";

type Touch = { readonly detail: { readonly x: number; readonly y: number } };

/** 낭독 이름 · 눌림 · 소리를 갖춘 단추(44 이상) — 바의 둥근 단추 · 새 답 줄 · Seen by 자리가 함께 씁니다. */
function Tap({
  testId,
  className,
  label,
  onTap,
  children,
}: {
  readonly testId: string;
  readonly className: string;
  readonly label: string;
  readonly onTap: () => void;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <view
      className={className}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={() => {
        "background only";
        playSound("button");
        onTap();
      }}
    >
      {children}
    </view>
  );
}

/**
 * 아래 바 + 새 답 줄(시안 34 · 36번) — 줄은 최근 답 최대 2(최신이 아래, 계속 보임), 누르면 그 친구 방. 답이 없으면 한 시간 안내, 친구가
 * 없으면 친구 추가 안내, 지난 스토리(보관함)면 「친구에게 24시간」. 바 왼쪽 「Seen by」(얼굴 3 + 수, 위로 밀기 안내)는 답 목록, 오른쪽은 새 스토리 · 지우기. 위로 밀어도 답 목록.
 */
export function MyStoryViewerBottom({
  story,
  now,
  mine,
  onReplies,
}: {
  readonly story: MyStory;
  readonly now: number;
  readonly mine: MyStoryViewerMine;
  readonly onReplies: () => void;
}): ReactNode {
  const all = useUiCopy().messengerChat;
  const copy = all.myStories.viewer;
  const sep = all.stories.listSeparator;
  const bar = myStoryBarOf(story, mine.face, mine.hasFriends, now);
  const start = useRef<{ x: number; y: number } | null>(null);
  const { note } = bar;
  const seenText = bar.seen > 0 ? copy.seenBy(bar.seen) : copy.noViews;
  const findFriends = mine.onFindFriends;
  return (
    <view
      className="my-story-bar-group"
      data-testid={ids.bar}
      bindtouchstart={(event: Touch) => {
        "background only";
        start.current = { x: event.detail.x, y: event.detail.y };
      }}
      bindtouchend={(event: Touch) => {
        "background only";
        const from = start.current;
        start.current = null;
        if (from !== null && isSwipeUp(event.detail.x - from.x, event.detail.y - from.y))
          onReplies();
      }}
    >
      {note.kind === "lines" ? (
        note.lines.map(({ reaction, who }) => (
          <Tap
            key={reaction.id}
            testId={ids.replyLine(reaction.id)}
            className="my-story-line"
            label={spokenOf(sep, [
              copy.reactionLabel(who.name, reaction.text, reaction.meaning),
              copy.openChatLabel(who.name),
            ])}
            onTap={() => mine.onOpenChat(reaction)}
          >
            <Avatar
              imageSource={who.avatarUrl ?? undefined}
              name={who.name}
              size="xs"
              accessibility="hidden"
            />
            <text className="my-story-line-text" accessibility-elements-hidden={true}>
              <text className="my-story-line-name">{`${who.name} `}</text>
              {reaction.text}
            </text>
          </Tap>
        ))
      ) : note.kind === "noFriends" && findFriends !== undefined ? (
        <Tap
          testId={ids.barNoFriends}
          className="my-story-line"
          label={copy.noFriendsTitle}
          onTap={findFriends}
        >
          <text className="my-story-line-text">{copy.noFriendsTitle}</text>
        </Tap>
      ) : (
        <view
          className="my-story-line"
          data-testid={
            note.kind === "noFriends"
              ? ids.barNoFriends
              : note.kind === "hidden"
                ? ids.barHidden
                : ids.barWaiting
          }
          flatten={false}
        >
          <text className="my-story-line-text">
            {note.kind === "noFriends"
              ? copy.noFriendsTitle
              : note.kind === "hidden"
                ? copy.hidden
                : copy.waiting}
          </text>
        </view>
      )}
      <view className="my-story-bar">
        <Tap
          testId={ids.barSeen}
          className="my-story-bar-seen"
          label={spokenOf(sep, [
            bar.seen > 0 ? copy.seenByLabel(bar.seen) : copy.noViews,
            copy.showReplies,
          ])}
          onTap={onReplies}
        >
          {bar.faces.map((who, index) => (
            <view
              key={`${who.name}-${index}`}
              className={index === 0 ? "my-story-bar-face" : "my-story-bar-face overlap"}
              data-testid={ids.barFace}
            >
              <Avatar
                imageSource={who.avatarUrl ?? undefined}
                name={who.name}
                size="xs"
                accessibility="hidden"
              />
            </view>
          ))}
          <view className="my-story-bar-words" accessibility-elements-hidden={true}>
            <text className="my-story-bar-title">{seenText}</text>
            {bar.seen > 0 || bar.replies > 0 ? (
              <text className="my-story-bar-hint" data-testid={ids.barSwipeHint}>
                {copy.swipeUp}
              </text>
            ) : null}
          </view>
        </Tap>
        {mine.onCreate === undefined ? null : (
          <Tap
            testId={ids.barAdd}
            className="my-story-bar-button"
            label={all.myStories.start.title}
            onTap={mine.onCreate}
          >
            <svg className="my-story-bar-icon" content={plus} current-color={color.white} />
          </Tap>
        )}
        <Tap
          testId={ids.barDelete}
          className="my-story-bar-button"
          label={copy.delete}
          onTap={() => mine.onDelete(story)}
        >
          <svg className="my-story-bar-icon" content={trash} current-color={color.white} />
        </Tap>
      </view>
    </view>
  );
}

/** 답 목록 시트(시안 35번) — 설정 › My stories 보기의 목록을 그대로(Seen by · 반응 줄 · Open chat · 저장 안내). 닫기 · 바깥 · 뒤로 = 닫힘. */
export function MyStoryRepliesSheet({
  story,
  now,
  mine,
  onClose,
}: {
  readonly story: MyStory;
  readonly now: number;
  readonly mine: MyStoryViewerMine;
  readonly onClose: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.viewer;
  useLayerBack(onClose);
  const bar = myStoryBarOf(story, mine.face, mine.hasFriends);
  return (
    <view className="my-story-replies-sheet" data-testid={ids.repliesSheet}>
      <AppBottomSheet
        title={copy.replied(bar.replies)}
        closeAccessibilityLabel={copy.close}
        ondismiss={onClose}
      >
        <scroll-view
          className="my-story-replies-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="my-story-reactions">
            <SeenBy story={story} face={mine.face} />
            <MyStoryReplyList
              story={story}
              now={now}
              face={mine.face}
              hasFriends={mine.hasFriends}
              {...(mine.onFindFriends === undefined ? {} : { onFindFriends: mine.onFindFriends })}
              onOpenChat={mine.onOpenChat}
            />
          </view>
        </scroll-view>
      </AppBottomSheet>
    </view>
  );
}

/** 글 · 사진 스토리를 화면 가득 — 얹은 것은 편집 때 비율 자리 그대로(편집도 화면 가득), 위아래 그늘은 친구 스토리와 같음. */
export function MyStoryFace({
  story,
  insetTop,
  photoUrl,
}: {
  readonly story: MyStory;
  readonly insetTop: number;
  readonly photoUrl: ((imagePath: string) => Promise<string | null>) | undefined;
}): ReactNode {
  return (
    <>
      <view className="my-story-face">
        {story.kind === "photo" ? (
          <MyPhotoStoryCard story={story} {...(photoUrl === undefined ? {} : { photoUrl })} />
        ) : (
          <MyTextStoryCard story={story} />
        )}
      </view>
      <view
        className="story-viewer-shade-top"
        style={{ height: `${insetTop + 150}px` }}
        accessibility-elements-hidden={true}
      />
      <view className="story-viewer-shade-bottom" accessibility-elements-hidden={true} />
    </>
  );
}

/**
 * ⋯ 메뉴(시안 34번 — 메뉴는 그대로 둠) — `story`가 없으면 머리 줄의 ⋯ 단추, 있으면 그 아래 「Delete story」(바의 지우기와 같은 확인 상자).
 */
export function MyStoryMenu({
  story,
  onTap,
}: {
  readonly story?: MyStory;
  readonly onTap: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.viewer;
  return story === undefined ? (
    <IconButton testId={ids.viewerMenu} icon={menu} label={copy.options} onTap={onTap} />
  ) : (
    <Tap
      testId={ids.viewerDelete}
      className="my-story-menu-item my-story-viewer-menu"
      label={copy.delete}
      onTap={onTap}
    >
      <svg className="my-story-bar-icon" content={trash} current-color={color.fg.neutral} />
      <text className="my-story-menu-text">{copy.delete}</text>
    </Tap>
  );
}
