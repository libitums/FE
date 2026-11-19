// 친구 찾기(R5)의 줄 하나와 오른쪽 동작 알약입니다(ADR-0162). 판정은 `friend-directory`가 집니다.

import type { ReactNode } from "@lynx-js/react";
import lock from "@libitums/icons/lynx/lock";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { coinIcon } from "../../components/coin-icon";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import type { DirectoryRow } from "./friend-directory";
import type { SuggestedFriendsCopy } from "./suggested-friends.contract";
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

export function DirectoryRowView({
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
