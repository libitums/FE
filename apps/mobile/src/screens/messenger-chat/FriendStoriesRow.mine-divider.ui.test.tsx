import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { storyRowOf } from "./friend-stories";
import { friendStoriesTestIds as ids } from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { FriendStoriesRow } from "./FriendStoriesRow";
import { myStoriesTestIds, type MineRowSlot } from "./my-stories.contract";
import { suggestedFriendsOf } from "./suggested-friends";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `ui` 계층(FS-UI49): 스토리 줄의 내 스토리 | 다른 인물 사이 세로 구분 선(ADR-0178 D3 개정 ⟨내 스토리 구분 선⟩).

afterEach(cleanup);

const mineSlot: MineRowSlot = {
  live: null,
  unseen: false,
  nextAt: null,
  onCreate: vi.fn<() => void>(),
  onOpen: vi.fn<() => void>(),
};

function mount(options: {
  readonly mine: boolean;
  readonly stories: boolean;
  readonly others: boolean;
}) {
  const catalog = catalogOf([friend("a"), ...(options.others ? [general("h")] : [])]);
  const rooms = [room("a", true), ...(options.others ? [room("h", false)] : [])];
  const row = storyRowOf({
    stories: options.stories ? [story("a")] : [],
    rooms,
    suggested: suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: STORY_NOW }),
    seen: new Set(),
    now: STORY_NOW,
  });
  render(
    <FriendStoriesRow
      row={row}
      mine={options.mine ? mineSlot : null}
      now={STORY_NOW}
      onOpenFriend={vi.fn<() => void>()}
      onOpenUnmet={vi.fn<() => void>()}
      onOpenSuggested={vi.fn<() => void>()}
      onWatchAll={vi.fn<() => void>()}
      onFindFriends={vi.fn<() => void>()}
    />,
  );
}

const trackOrder = () =>
  Array.from(screen.getByTestId(ids.row).querySelectorAll("[data-testid]"))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter(
      (id) =>
        id === myStoriesTestIds.rowDivider ||
        id === myStoriesTestIds.create ||
        id === ids.friend("a"),
    );

test("FS-UI49. 내 스토리와 다른 인물 사이에 세로 구분 선 하나 — 낭독은 건너뜀", () => {
  mount({ mine: true, stories: true, others: false });
  expect(trackOrder()).toEqual([
    myStoriesTestIds.create,
    myStoriesTestIds.rowDivider,
    ids.friend("a"),
  ]);
  const divider = screen.getByTestId(myStoriesTestIds.rowDivider);
  expect(divider.getAttribute("class")).toBe("story-mine-divider");
  expect(divider.getAttribute("accessibility-element")).toBe("false");
});

test("FS-UI49. 다른 인물이 추천만 있어도 구분 선", () => {
  mount({ mine: true, stories: false, others: true });
  expect(screen.queryByTestId(myStoriesTestIds.rowDivider)).not.toBeNull();
});

test("FS-UI49. 내 스토리가 없거나, 내 스토리 말고 인물이 없으면 구분 선 없음", () => {
  mount({ mine: false, stories: true, others: true });
  expect(screen.queryByTestId(myStoriesTestIds.rowDivider)).toBeNull();
  cleanup();
  mount({ mine: true, stories: false, others: false });
  expect(screen.queryByTestId(myStoriesTestIds.rowDivider)).toBeNull();
});
