import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { myStoriesFrom } from "./my-stories-parse";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { MyStoryFace } from "./MyStoryFace";

// `integration` 계층(ST-I1, 버그 수정 2026-11-27): 서버가 그대로 돌려준 글 상자 overlay의 줄바꿈 → 읽기 풀기 → 전체 화면 보기가 편집과
// 같은 줄 · 같은 비율 자리로 그린다(서버는 overlays를 바꾸지 않음 — 운영 SELECT로 확인).

afterEach(cleanup);

test("ST-I1. 줄바꿈이 든 글 상자 — 읽기 풀기를 지나 보기에서 친 줄대로, 편집과 같은 비율 자리(화면 전체 기준)", () => {
  const state = myStoriesFrom(
    JSON.stringify({
      enabled: true,
      stories: [
        {
          id: "ms-t",
          kind: "text",
          word: null,
          ko: "오늘 김치찌개 만들었어",
          roman: "",
          meaning: "",
          example: null,
          background: "green",
          postedAt: "2026-11-27T03:00:00.000Z",
          expiresAt: "2026-11-28T03:00:00.000Z",
          reactions: [],
          overlays: [
            {
              kind: "text",
              ko: "오늘\n김치찌개 만들었어",
              color: "brown",
              x: 0.4,
              y: 0.72,
              scale: 1,
              rotation: 0,
            },
          ],
        },
      ],
    }),
  );
  const [story] = state?.stories ?? [];
  if (story === undefined) throw new Error("story not parsed");
  render(<MyStoryFace story={story} insetTop={59} photoUrl={undefined} />);
  const box = screen.getByTestId(ids.cardKo);
  const lines = [...box.querySelectorAll("text")].map((el) => el.textContent);
  expect(lines).toEqual(["오늘", "김치찌개 만들었어"]);
  const lane = box.parentElement?.getAttribute("style") ?? "";
  expect(lane).toContain("top: 72%");
  expect(lane).toMatch(/left: -10(\.0+)?%/);
});
