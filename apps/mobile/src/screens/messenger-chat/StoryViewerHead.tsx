// 스토리 보기(ADR-0178 D4)의 머리 줄 — 닫기 · 멈춤 · 경과(또는 NEW FRIEND) · 이름 · 아바타. 아바타 · 이름을 누르면 프로필 시트.

import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { spokenOf, storyAgeOf } from "./friend-stories";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesCopy,
  type StoryViewerItem,
} from "./friend-stories.contract";
import { IconButton } from "./StoryViewerParts";

/** 작은 아바타(sm)도 손가락 자리가 44에 가깝게 — 단어 알약과 같은 여유입니다. */
const SLOP = { top: "8px", bottom: "8px", left: "8px", right: "8px" } as const;

/**
 * 줄은 `row-reverse`라 문서 순서(닫기 · 멈춤 → 이름 → 아바타)가 낭독 순서이고 그림은 왼쪽부터 아바타 · 이름 … 닫기입니다.
 * 이름은 열 때 초점을 받는 자리(「<이름>'s story, Story i of n」, 접근성 M3)라 그 낭독을 두고, 단추 역할은 아바타가 집니다
 * (「<이름>'s profile」). 손가락으로는 이름 · 아바타 어디를 눌러도 같은 시트입니다.
 */
export function StoryViewerHead({
  item,
  now,
  copy,
  groupLabel,
  paused,
  onPause,
  onClose,
  onProfile,
  menu,
}: {
  readonly item: StoryViewerItem;
  readonly now: number;
  readonly copy: FriendStoriesCopy;
  readonly groupLabel: string;
  readonly paused: boolean;
  readonly onPause: () => void;
  readonly onClose: () => void;
  readonly onProfile: () => void;
  /** 내 스토리 장의 ⋯ 단추(ADR-0194 개정 ⟨보기⟩) — 멈춤 다음. */
  readonly menu?: ReactNode;
}): ReactNode {
  // 내 스토리 장은 이름이 곧 제목(「Your story」)이고 아바타는 프로필 단추가 아닙니다.
  const own = item.mine !== undefined;
  const openProfile = () => {
    "background only";
    onProfile();
  };
  return (
    <view className="story-viewer-head">
      <IconButton testId={ids.close} icon={cross} label={copy.viewer.close} onTap={onClose} />
      <IconButton
        testId={ids.pause}
        icon={paused ? play : pause}
        label={paused ? copy.viewer.play : copy.viewer.pause}
        onTap={onPause}
      />
      {menu ?? null}
      <view className="story-viewer-spacer" />
      {item.unmet === null ? (
        <text
          className="story-viewer-age"
          data-testid={ids.age}
          accessibility-elements-hidden={true}
        >
          {copy.age(storyAgeOf(item.story.postedAt, now))}
        </text>
      ) : (
        <view className="story-viewer-new" accessibility-elements-hidden={true}>
          <text className="story-viewer-new-text">{copy.viewer.newFriend}</text>
        </view>
      )}
      <view className="story-viewer-who">
        <text
          className="story-viewer-name"
          id={ids.name}
          data-testid={ids.name}
          accessibility-element={true}
          accessibility-label={spokenOf(copy.listSeparator, [
            own ? item.name : copy.viewer.label(item.name),
            groupLabel,
          ])}
          bindtap={own ? undefined : openProfile}
        >
          {item.name}
        </text>
        <view
          className="story-viewer-avatar"
          data-testid={ids.profile}
          accessibility-element={!own}
          accessibility-label={own ? undefined : copy.viewer.profile(item.name)}
          accessibility-traits={own ? undefined : "button"}
          accessibility-enable-tap={!own}
          flatten={false}
          hit-slop={SLOP}
          bindtap={own ? undefined : openProfile}
        >
          <Avatar
            imageSource={item.avatarUrl ?? undefined}
            name={item.name}
            size="sm"
            accessibility="hidden"
          />
        </view>
      </view>
    </view>
  );
}
