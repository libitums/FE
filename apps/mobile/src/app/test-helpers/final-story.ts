import { fireEvent, screen } from "@lynx-js/react/testing-library";
import { episodeFinalTestFor } from "../../screens/episode-final/episode-final-tests";

export function readFinalStory(stage: "introduction" | "ending" | "retry"): void {
  const test = episodeFinalTestFor("tutorial-final-test");
  if (test.format !== "visual-novel" || !test.story) throw new Error("Expected final story");
  for (const _beat of test.story[stage].beats) {
    fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {});
  }
}
