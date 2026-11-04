import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { AllClearedSheet } from "./AllClearedSheet";

// `ui` 계층: 모두 끝낸 뒤 새 편을 확인하게 하는 시트(ADR-0095 D9, 시안 5).

const tap = (element: Element) => fireEvent.tap(element, {});
const action = (id: string) =>
  within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${id}`)).getByTestId("ui-lynx-button");

describe("AllClearedSheet", () => {
  test("ACS1. 제목 · 안내 · 마지막 확인 줄 · 지금 확인 / 나중에가 선다", () => {
    render(
      <AllClearedSheet daysAgo={5} isOffline={() => true} onCheckNow={vi.fn()} onLater={vi.fn()} />,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      "You've finished every story here",
    );
    expect(screen.getByTestId("all-cleared-sheet-status")).toHaveTextContent(
      "Last checked 5 days ago",
    );
    expect(screen.getByTestId("all-cleared-sheet-note")).toHaveTextContent(
      "We'll also check automatically when you're back online.",
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-action-check-now")).toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-bottom-sheet-action-later")).toBeInTheDocument();
  });

  test("ACS2. 오프라인에서 지금 확인은 닫지 않고 연결되면 확인한다는 안내만 보인다", () => {
    const onCheckNow = vi.fn();
    render(
      <AllClearedSheet
        daysAgo={null}
        isOffline={() => true}
        onCheckNow={onCheckNow}
        onLater={vi.fn()}
      />,
    );
    expect(screen.getByTestId("all-cleared-sheet-status")).toHaveTextContent("Not checked yet");
    tap(action("check-now"));
    expect(onCheckNow).not.toHaveBeenCalled();
    expect(screen.getByTestId("all-cleared-sheet-hint")).toHaveTextContent(
      "We'll check as soon as you're connected.",
    );
  });

  test("ACS3. 연결돼 있으면 지금 확인은 onCheckNow, 나중에는 onLater", () => {
    const onCheckNow = vi.fn();
    const onLater = vi.fn();
    render(
      <AllClearedSheet
        daysAgo={4}
        isOffline={() => false}
        onCheckNow={onCheckNow}
        onLater={onLater}
      />,
    );
    tap(action("check-now"));
    expect(onCheckNow).toHaveBeenCalledTimes(1);
    tap(action("later"));
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});
