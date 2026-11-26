import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import trash from "@libitums/icons/lynx/trash";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { SettingsCell } from "@libitums/ui-lynx/settings-cell";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { useChatEvents } from "./chat-events";
import type { ChatSource } from "./chat-source.contract";
import { archiveOf, dayOf, openReactionChat, unseenReactionIdsOf } from "./my-stories";
import {
  myStoriesTestIds as ids,
  type MyStoriesPort,
  type MyStoriesState,
  type MyStory,
} from "./my-stories.contract";
import { ArchiveTile } from "./MyStoryArchiveTile";
import { MyStoryDeleteDialog } from "./MyStoryDialogs";
import { MyStoryFullOpen } from "./MyStoryFullOpen";
import { useMyStoryLive } from "./use-my-story-live";
import { useChatSnapshot } from "./use-chat-source";

import "./chat-settings.css";
import "./my-stories.css";
import "./my-stories-archive.css";

export type MyStoriesScreenProps = {
  readonly port: MyStoriesPort;
  readonly source: ChatSource;
  readonly onBack: () => void;
  /** 반응의 Open chat — 메신저 탭으로 옮겨 그 방을 엽니다. */
  readonly onOpenRoom: (roomId: string) => void;
};

type Confirm = {
  readonly storyId: string | null;
  readonly replies: number | null;
  readonly failed: boolean;
};

/**
 * 설정 › My stories(ADR-0194, 시안 10번) — 보관 스위치 · 최신 먼저 칸(단어 · 날짜 · 반응 수 · LIVE) · 칸마다 지우기 · 모두 지우기. 칸을 누르면
 * 친구 스토리와 같은 전체 화면 보기(답 줄 · 답 목록 · 지우기). 사진이 없어 칸은 단어 카드입니다. 시스템 뒤로 = 위 층을 닫거나 설정으로.
 */
export function MyStoriesScreen({
  port,
  source,
  onBack,
  onOpenRoom,
}: MyStoriesScreenProps): ReactNode {
  const all = useUiCopy().messengerChat.myStories;
  const copy = all.archive;
  const { emit } = useChatEvents();
  const { rooms } = useChatSnapshot(source);
  const [state, setState] = useState<MyStoriesState | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  // 지우기 확인을 두 번 눌러도 RPC · 이벤트는 한 번(리뷰 m7).
  const removing = useRef(false);
  useEffect(() => {
    let live = true;
    void port
      .load()
      .catch(() => null)
      .then((loaded) => {
        if (live) setState(loaded);
      });
    return () => {
      live = false;
    };
  }, []);
  useMyStoryLive({
    port,
    open: opened !== null,
    rooms,
    setState,
  });
  useScreenBack(() => {
    "background only";
    if (confirm !== null) setConfirm(null);
    else if (opened !== null) setOpened(null);
    else onBack();
  });

  const now = Date.now();
  const list = state === null ? [] : archiveOf(state, now);
  const dateOf = (story: MyStory) => {
    const day = dayOf(story.postedAt, now);
    return day.kind === "today" ? copy.today : copy.date(day.month, day.day);
  };
  const dropped = (storyId: string | null) =>
    setState((before) =>
      before === null
        ? before
        : {
            ...before,
            stories: storyId === null ? [] : before.stories.filter((s) => s.id !== storyId),
          },
    );

  async function handleKeep(keep: boolean) {
    "background only";
    setState((before) => (before === null ? before : { ...before, keep }));
    const saved = await port.setKeep(keep);
    if (saved === null) {
      setState((before) => (before === null ? before : { ...before, keep: !keep }));
      return;
    }
    emit({ name: "my_story_keep_toggled", surface: "chat", keep: saved });
  }

  async function handleConfirm() {
    "background only";
    if (confirm === null || removing.current) return;
    removing.current = true;
    const ok = await port.remove(confirm.storyId).catch(() => false); // 던져도 다시 누를 수 있게(리뷰 지적)
    removing.current = false;
    if (!ok) return setConfirm({ ...confirm, failed: true });
    dropped(confirm.storyId);
    emit({
      name: "my_story_deleted",
      surface: "chat",
      scope: confirm.storyId === null ? "all" : "one",
      from: "archive",
    });
    setConfirm(null);
  }

  const openStory = opened === null ? null : (list.find((s) => s.id === opened) ?? null);
  const layerOpen = confirm !== null || openStory !== null;

  return (
    <view className="chat-settings-screen" data-testid={ids.archive}>
      <view
        className="chat-settings-body"
        flatten={false}
        accessibility-elements-hidden={layerOpen ? true : undefined}
      >
        <ChatHeader
          title={copy.title}
          insetTop={0}
          testIds={{ root: `${ids.archive}-header`, title: `${ids.archive}-title` }}
          start={
            <ChatHeaderSide testId={ids.archiveBack}>
              <RoundButton
                accessibilityLabel={copy.back}
                icon={arrowLeft03}
                variant="neutral"
                size="l"
                bindtap={onBack}
              />
            </ChatHeaderSide>
          }
          end={<ChatHeaderSide />}
        />
        <scroll-view
          className="chat-settings-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="chat-settings-content">
            <view className="chat-settings-card" data-testid={ids.keep}>
              <SettingsCell
                trailing="toggle"
                title={copy.keep}
                description={copy.keepBody}
                checked={state?.keep ?? true}
                onChange={(on: boolean) => void handleKeep(on)}
              />
            </view>
            {state === null ? null : list.length === 0 ? (
              <text className="my-story-note" data-testid={ids.archiveEmpty}>
                {copy.empty}
              </text>
            ) : (
              <>
                <view className="my-story-section-head">
                  <text
                    className="my-story-section-title"
                    data-testid={ids.count}
                    accessibility-traits="header"
                    flatten={false}
                  >
                    {copy.count(list.length)}
                  </text>
                  <text className="my-story-section-meta">{copy.newest}</text>
                </view>
                <view className="my-archive-grid">
                  {list.map((story) => (
                    <ArchiveTile
                      key={story.id}
                      story={story}
                      date={dateOf(story)}
                      today={dayOf(story.postedAt, now).kind === "today"}
                      live={story.expiresAt > now}
                      onOpen={() => {
                        // 보관함에서 열어도 새 반응은 본 것으로(감사 A9).
                        const unseen = unseenReactionIdsOf(story, port.seenReactions());
                        port.markReactionsSeen(unseen, story.expiresAt);
                        emit({
                          name: "my_story_viewed",
                          surface: "chat",
                          reactions: String(story.reactions.length),
                          unseen: String(unseen.length),
                          from: "archive",
                        });
                        setOpened(story.id);
                      }}
                      onDelete={() =>
                        setConfirm({
                          storyId: story.id,
                          replies: story.reactions.length,
                          failed: false,
                        })
                      }
                    />
                  ))}
                </view>
                <view className="my-archive-delete-all" data-testid={ids.deleteAll}>
                  <Button
                    label={copy.deleteAll}
                    variant="outline"
                    size="l"
                    width="fill"
                    bindtap={() => {
                      "background only";
                      setConfirm({ storyId: null, replies: null, failed: false });
                    }}
                  />
                </view>
                <text className="my-story-note">{copy.deleteAllNote}</text>
              </>
            )}
          </view>
        </scroll-view>
      </view>
      {openStory === null ? null : (
        // 설정에서도 같은 전체 화면 보기 — 그 스토리 한 장(지난 것도), 「+」 없음(ADR-0194 개정 ⟨보기⟩).
        <MyStoryFullOpen
          stories={[openStory]}
          openedId={openStory.id}
          now={now}
          rooms={rooms}
          romanization={true}
          onShown={() => undefined}
          remove={(id) => port.remove(id)}
          {...(port.photo === undefined ? {} : { photoUrl: port.photo.url })}
          onOpenChat={(reaction) => {
            if (!openReactionChat(rooms, reaction, onOpenRoom)) return;
            emit({
              name: "my_story_chat_opened",
              surface: "chat",
              characterId: reaction.characterId,
              message: reaction.messageId !== null,
            });
            setOpened(null);
          }}
          onDeleted={(id) => {
            dropped(id);
            emit({ name: "my_story_deleted", surface: "chat", scope: "one", from: "archive" });
            setOpened(null);
          }}
          onClose={() => setOpened(null)}
        />
      )}
      {confirm === null ? null : (
        <MyStoryDeleteDialog
          replies={confirm.replies}
          failed={confirm.failed}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </view>
  );
}
