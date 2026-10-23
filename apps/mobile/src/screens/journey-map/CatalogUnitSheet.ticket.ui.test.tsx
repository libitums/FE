import { afterEach, describe, expect, test } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { tutorialDoneProgress } from "../../app/test-helpers/progress-seed";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import { u00Catalog, u00Screen } from "./JourneyMapScreen.tutorial-u00.test-support";

// `ui` 계층: 레슨 말풍선의 티켓 태그 — 튜토리얼(u00)은 티켓을 쓰지 않아 태그가 서지 않는다. 티켓으로 연 유닛은
// 태그 없이 진한 색(`active`)으로 선다.

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

describe("티켓으로 연 유닛", () => {
  const progress = { ...tutorialDoneProgress(), "u01-water": ["intro", "S1"] };
  const nodeOf = (key: string) =>
    screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-u01-water-${key}`);

  test("TK8. 티켓으로 연 열린 레슨은 진한 색(active)으로 서고 말풍선에 티켓 태그가 없다", () => {
    render(u00Screen({ ...u00Catalog({ progress }), ticketUnits: { "u01-water": ["S2"] } }));

    expect(nodeOf("S2")).toHaveAttribute("data-status", "active");
    tapNode("u01-water", "S2");
    expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
    expect(screen.queryAllByTestId("step-sheet-ticket-cost").length).toBe(0);
  });

  test("TK8. 끝낸 유닛은 끝낸 색, 잠긴 유닛은 잠김 그대로이고 기록이 없는 열린 레슨은 연한 색이다", () => {
    render(u00Screen({ ...u00Catalog({ progress }), ticketUnits: { "u01-water": ["S1", "S3"] } }));

    expect(nodeOf("S1")).toHaveAttribute("data-status", "clear");
    expect(nodeOf("S3")).toHaveAttribute("data-status", "default");
    expect(nodeOf("S2")).toHaveAttribute("data-status", "available");
  });
});
