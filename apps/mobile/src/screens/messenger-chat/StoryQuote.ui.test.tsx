import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { tapId } from "./chat-ui.test-support";
import { friendStoriesTestIds as ids } from "./friend-stories.contract";
import { StoryImageContext } from "./story-image-context";
import { StoryQuoteBar, StoryQuoteCard } from "./StoryQuote";

// `ui` 계층(FS-UI8): 대화방의 스토리 인용(ADR-0178 D5) — 내 말풍선 위 카드 · 입력 줄 위 인용 띠.

afterEach(cleanup);

const NOW = 1_800_000_000_000;
const quote = {
  storyId: "st-1",
  characterId: "yoonkyung",
  line: "야근 끝! 편의점 라면이 최고야",
  imagePath: "content/images/a.webp",
  postedAt: NOW - 2 * 3_600_000,
};

test("FS-UI8. 카드 — 캡션 · 그림(해석기 주소) · 한 줄 · Story · 경과, 낭독은 하나로", () => {
  render(
    <StoryImageContext.Provider value={(path) => `https://cdn/${path}`}>
      <StoryQuoteCard quote={quote} name="윤경" now={NOW} />
    </StoryImageContext.Provider>,
  );
  const card = screen.getByTestId(ids.quote);
  expect(card.textContent).toContain("You replied to 윤경's story");
  expect(card.textContent).toContain("야근 끝! 편의점 라면이 최고야");
  expect(card.textContent).toContain("Story · 2h");
  expect(card.querySelector("image")?.getAttribute("src")).toBe(
    "https://cdn/content/images/a.webp",
  );
  expect(card.getAttribute("accessibility-label")).toBe(
    "You replied to 윤경's story: 야근 끝! 편의점 라면이 최고야, Story · 2h",
  );
});

test("FS-UI8. 카드 — 그림 · 시각이 없으면 글만 · Story", () => {
  render(
    <StoryQuoteCard quote={{ ...quote, imagePath: null, postedAt: null }} name="윤경" now={NOW} />,
  );
  const card = screen.getByTestId(ids.quote);
  expect(card.querySelector("image")).toBeNull();
  expect(card.textContent).toContain("Story");
  expect(card.textContent).not.toContain("·");
});

test("FS-UI8. 인용 띠 — Replying to · 한 줄 · ×로 뗌", () => {
  const onRemove = vi.fn();
  render(<StoryQuoteBar quote={quote} name="윤경" onRemove={onRemove} />);
  const bar = screen.getByTestId(ids.quoteBar);
  expect(bar.textContent).toContain("Replying to 윤경's story");
  expect(bar.textContent).toContain("야근 끝! 편의점 라면이 최고야");
  tapId(ids.quoteBarRemove);
  expect(onRemove).toHaveBeenCalledTimes(1);
});
