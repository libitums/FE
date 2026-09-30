import { fireEvent, screen } from "@lynx-js/react/testing-library";

export function revealNarrative(): void {
  if (
    screen.getByTestId("ui-lynx-visual-novel-dialog").getAttribute("data-status") === "revealing"
  ) {
    fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {});
  }
}

export function advanceNarrative(): void {
  revealNarrative();
  fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {});
}
