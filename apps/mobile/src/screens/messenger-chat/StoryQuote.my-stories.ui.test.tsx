import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { friendStoriesTestIds as ids } from "./friend-stories.contract";
import { StoryQuoteCard } from "./StoryQuote";

// `ui` 계층(MS-UI8): 대화방 인용의 kind(ADR-0194 · ADR-0191) — 내 글 위 내 스토리는 「You answered about your story」, 인물의 반응 위는
// 「Replied to your story」 + 단어, 지운 스토리는 「Deleted story」. 「Answer」 인용 띠는 없어졌습니다(띠는 친구 스토리만).

afterEach(cleanup);

const NOW = Date.UTC(2026, 10, 23, 12);

test("MS-UI8. 내 스토리 인용 카드 — 단어와 내 스토리 캡션(내 글 · 인물의 반응), 그림 없음", () => {
  const quote = {
    storyId: "ms-1",
    characterId: "mina",
    line: "야근",
    imagePath: null,
    postedAt: NOW - 3_600_000,
    kind: "mine" as const,
  };
  render(<StoryQuoteCard quote={quote} name="미나" now={NOW} />);
  const card = screen.getByTestId(ids.quote);
  expect(card.textContent).toContain("You answered about your story");
  expect(card.textContent).toContain("야근");
  expect(card.getAttribute("accessibility-label")).toContain("You answered about your story");
  cleanup();
  render(<StoryQuoteCard quote={quote} name="미나" now={NOW} from="them" />);
  expect(screen.getByTestId(ids.quote).textContent).toContain("Replied to your story");
  expect(screen.getByTestId(ids.quote).textContent).toContain("야근");
});

test("MS-UI8. 지운 스토리 인용 — 「Deleted story」만, 경과 없음", () => {
  render(
    <StoryQuoteCard
      quote={{
        storyId: "",
        characterId: "mina",
        line: "",
        imagePath: null,
        postedAt: null,
        kind: "deleted",
      }}
      name="미나"
      now={NOW}
    />,
  );
  const card = screen.getByTestId(ids.quote);
  expect(card.textContent).toContain("Deleted story");
  expect(card.textContent).not.toContain("Story ·");
  expect(card.getAttribute("accessibility-label")).toBe("Reply to a deleted story");
});
