import { expect, test } from "vitest";
import { episodeFinalTestFor } from "./episode-final-tests";
import { passesEpisodeFinalStory } from "./episode-final-story";

test("3문항 중 2개 이상 정답이어야 통과하고 누락·초과된 결과는 거부한다", () => {
  const review = episodeFinalTestFor("tutorial-final-test");
  if (review.format !== "visual-novel") throw new Error("Expected visual novel");
  expect(passesEpisodeFinalStory(review, ["correct", "correct", "incorrect"])).toBe(true);
  expect(passesEpisodeFinalStory(review, ["correct", "incorrect", "incorrect"])).toBe(false);
  expect(passesEpisodeFinalStory(review, ["correct", "correct"])).toBe(false);
  expect(passesEpisodeFinalStory(review, ["correct", "correct", "correct", "correct"])).toBe(false);
  expect(passesEpisodeFinalStory(review, [])).toBe(false);
});
