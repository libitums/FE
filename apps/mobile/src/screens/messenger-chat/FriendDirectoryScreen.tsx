import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { safeAreaInsetsFrom, tappableBottomInsetFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { filterKeyOf } from "./friend-directory";
import { DirectoryRowView } from "./FriendDirectoryRow";
import type { DirectoryFilter } from "./friend-directory";
import type {
  FriendDirectoryScreenProps,
  SuggestedFriendsCopy,
} from "./suggested-friends.contract";
import { friendDirectoryTestIds as ids } from "./suggested-friends.contract";

import "./messenger-list.css";
import "./suggested-friends.css";
import "./friend-directory.css";

/** 목록 아래 기본 여백(CSS `--libitum-spacing-16`) — 아래 시스템 바 몫을 더합니다(ADR-0044 D3). */
const LIST_BOTTOM_PADDING = 16;

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
        <view
          className="friend-directory-list"
          style={{ paddingBottom: `${LIST_BOTTOM_PADDING + bottom}px` }}
        >
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
