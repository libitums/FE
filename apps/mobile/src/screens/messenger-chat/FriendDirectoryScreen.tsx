import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import lock from "@libitums/icons/lynx/lock";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { coinIcon } from "../../components/coin-icon";
import { playSound } from "../../lib/sound-effects";
import { safeAreaInsetsFrom, tappableBottomInsetFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { filterKeyOf } from "./friend-directory";
import type { DirectoryFilter, DirectoryRow } from "./friend-directory";
import type {
  FriendDirectoryScreenProps,
  SuggestedFriendsCopy,
} from "./suggested-friends.contract";
import { friendDirectoryTestIds as ids } from "./suggested-friends.contract";
import { localizedLine } from "./suggested-friends";

import "./messenger-list.css";
import "./suggested-friends.css";
import "./friend-directory.css";

type DirectoryCopy = SuggestedFriendsCopy["directory"];

function actionLabel(row: DirectoryRow, copy: DirectoryCopy): string {
  const { name, unlockEpisode } = row.character;
  switch (row.action) {
    case "chat":
      return copy.chatLabel(name);
    case "early":
      return copy.earlyLabel(name, row.offer?.price ?? 0);
    case "locked":
      return copy.lockedLabel(name, unlockEpisode ?? 0);
    case "added":
      return copy.addedLabel(name);
    default: {
      const unreachable: never = row.action;
      return unreachable;
    }
  }
}

function ActionPill({ row }: { readonly row: DirectoryRow }): ReactNode {
  const all = useUiCopy().messengerChat.suggested;
  const copy = all.directory;
  const muted = row.action === "added" || row.action === "locked";
  const icon = row.action === "early" ? coinIcon : row.action === "added" ? tick : lock;
  const text =
    row.action === "chat"
      ? copy.chat
      : row.action === "early"
        ? String(row.offer?.price ?? "")
        : row.action === "added"
          ? copy.added
          : copy.locked(row.character.unlockEpisode ?? 0);
  return (
    <view
      className={
        muted ? "friend-directory-action friend-directory-action-muted" : "friend-directory-action"
      }
      data-testid={ids.action(row.character.id)}
      data-action={row.action}
      accessibility-elements-hidden={true}
    >
      {row.action === "chat" ? null : (
        <svg
          className="friend-directory-action-icon"
          content={icon}
          current-color={color.fg["neutral-muted"]}
        />
      )}
      <text className="friend-directory-action-text">{text}</text>
      {row.action === "early" ? (
        <view className="friend-directory-limited">
          <text className="suggested-tag-text">{all.limited}</text>
        </view>
      ) : null}
    </view>
  );
}

function DirectoryRowView({
  row,
  onOpen,
}: {
  readonly row: DirectoryRow;
  readonly onOpen: (row: DirectoryRow) => void;
}): ReactNode {
  const all = useUiCopy().messengerChat.suggested;
  const { character } = row;
  const added = row.action === "added";
  const locked = row.action === "early" || row.action === "locked";
  const sub =
    locked && character.unlockEpisode !== null
      ? all.directory.meetIn(character.unlockEpisode)
      : character.intro === null
        ? ""
        : localizedLine(character.intro, all.language);
  function handleTap() {
    "background only";
    if (added) return;
    playSound("button");
    onOpen(row);
  }
  return (
    <view
      className={added ? "friend-directory-row friend-directory-row-added" : "friend-directory-row"}
      data-testid={ids.row(character.id)}
      accessibility-element={true}
      accessibility-label={[actionLabel(row, all.directory), sub]
        .filter((part) => part !== "")
        .join(", ")}
      accessibility-traits={added ? undefined : "button"}
      accessibility-enable-tap={!added}
      flatten={false}
      bindtap={handleTap}
    >
      <view className={locked ? "friend-directory-face-dim" : "friend-directory-face"}>
        <Avatar
          imageSource={row.room.counterpart.avatarUrl ?? undefined}
          name={character.name}
          size="md"
          accessibility="hidden"
        />
      </view>
      <view className="friend-directory-body">
        <view className="friend-directory-name-line">
          <text className="friend-directory-name">{character.name}</text>
          {character.kind === "general" && row.action === "chat" ? (
            <view className="messenger-list-new">
              <text className="messenger-list-new-text">{all.newBadge}</text>
            </view>
          ) : null}
        </view>
        {sub === "" ? null : <text className="friend-directory-sub">{sub}</text>}
      </view>
      <ActionPill row={row} />
    </view>
  );
}

/**
 * 친구 찾기(R5, ADR-0162) — 전체 화면 층입니다. 칩 · 섹션은 `friend-directory`가 정하고, 여기서는 그리기 · 탭만 넘깁니다.
 * 시스템 뒤로가기는 뒤로 화살표와 같습니다(층 등록).
 */
export function FriendDirectoryScreen({
  chips,
  filter,
  story,
  general,
  categoryLabel,
  onFilter,
  onOpen,
  onBack,
  covered = false,
}: FriendDirectoryScreenProps): ReactNode {
  const all = useUiCopy().messengerChat.suggested;
  const copy = all.directory;
  const globalProps = useGlobalProps();
  const insets = safeAreaInsetsFrom(globalProps);
  const bottom = tappableBottomInsetFrom(globalProps);
  useLayerBack(onBack);
  const selectedKey = filterKeyOf(filter);
  const chipText = (chip: DirectoryFilter): string =>
    chip.kind === "all"
      ? copy.all
      : chip.kind === "story"
        ? copy.fromStory
        : categoryLabel(chip.id);

  return (
    <view
      className="friend-directory"
      data-testid={ids.screen}
      event-through={false}
      accessibility-elements-hidden={covered}
      style={{
        paddingTop: `${insets.top}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      <view className="friend-directory-head">
        <view data-testid={ids.back}>
          <RoundButton
            accessibilityLabel={copy.back}
            icon={arrowLeft03}
            variant="neutral"
            size="l"
            bindtap={onBack}
          />
        </view>
        <text
          className="friend-directory-title"
          accessibility-traits="header"
          flatten={false}
          accessibility-element={true}
        >
          {copy.title}
        </text>
      </view>
      <scroll-view
        className="friend-directory-chips-scroll"
        scroll-orientation="horizontal"
        scroll-bar-enable={false}
      >
        <view className="friend-directory-chips">
          {chips.map((chip) => {
            const key = filterKeyOf(chip);
            const on = key === selectedKey;
            return (
              <view
                key={key}
                className="friend-directory-chip-hit"
                data-testid={ids.chip(key)}
                data-selected={on ? "true" : "false"}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-enable-tap={true}
                flatten={false}
                accessibility-label={copy.chipLabel(chipText(chip), on)}
                bindtap={() => {
                  "background only";
                  onFilter(chip);
                }}
              >
                <view
                  className={
                    on ? "friend-directory-chip friend-directory-chip-on" : "friend-directory-chip"
                  }
                >
                  <text className="friend-directory-chip-text">{chipText(chip)}</text>
                </view>
              </view>
            );
          })}
        </view>
      </scroll-view>
      <scroll-view
        className="friend-directory-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="friend-directory-list" style={{ paddingBottom: `${16 + bottom}px` }}>
          {story.length === 0 ? null : (
            <view data-testid={ids.sectionStory}>
              <text
                className="friend-directory-section"
                accessibility-traits="header"
                flatten={false}
                accessibility-element={true}
              >
                {copy.sectionStory}
              </text>
              {story.map((row) => (
                <DirectoryRowView key={row.character.id} row={row} onOpen={onOpen} />
              ))}
            </view>
          )}
          {general.length === 0 ? null : (
            <view data-testid={ids.sectionGeneral}>
              <text
                className="friend-directory-section"
                accessibility-traits="header"
                flatten={false}
                accessibility-element={true}
              >
                {copy.sectionNew}
              </text>
              {general.map((row) => (
                <DirectoryRowView key={row.character.id} row={row} onOpen={onOpen} />
              ))}
            </view>
          )}
          <view className="friend-directory-row friend-directory-row-added">
            <view className="friend-directory-more-ring" accessibility-elements-hidden={true} />
            <text
              className="friend-directory-sub"
              data-testid={ids.more}
              flatten={false}
              accessibility-element={true}
            >
              {copy.moreComing}
            </text>
          </view>
        </view>
      </scroll-view>
    </view>
  );
}
