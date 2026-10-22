import { afterEach, describe, expect, test } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { tutorialDoneProgress } from "../../app/test-helpers/progress-seed";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import { u00Catalog, u00Screen } from "./JourneyMapScreen.tutorial-u00.test-support";

// `ui` 계층: 레슨 말풍선의 티켓 태그 — 튜토리얼(u00)은 티켓을 쓰지 않아 태그가 서지 않는다.

afterEach(() => {
  cleanup();
});

const tapNode = (episodeId: string, key: string) => {
  act(() => {
    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-${episodeId}-${key}`), {
      detail: { y: 300 },
    });
  });
};

describe("CatalogUnitSheet 티켓 태그", () => {
  test("TK3. u00 레슨 말풍선에는 티켓 태그가 없다", () => {
    render(u00Screen(u00Catalog({ progress: { [TUTORIAL_EPISODE_ID]: ["intro"] } })));

    tapNode(TUTORIAL_EPISODE_ID, "S1");

    expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
    expect(screen.queryAllByTestId("step-sheet-ticket-cost").length).toBe(0);
  });

  test("TK3. u01의 안 끝낸 레슨에는 태그가 있고 끝낸 레슨에는 없다", () => {
    render(
      u00Screen(
        u00Catalog({ progress: { ...tutorialDoneProgress(), "u01-water": ["intro", "S1"] } }),
      ),
    );

    tapNode("u01-water", "S2");
    expect(screen.getByTestId("step-sheet-ticket-cost")).toBeInTheDocument();

    act(() => {
      fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
    });
    tapNode("u01-water", "S1");
    expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
    expect(screen.queryAllByTestId("step-sheet-ticket-cost").length).toBe(0);
  });
});
