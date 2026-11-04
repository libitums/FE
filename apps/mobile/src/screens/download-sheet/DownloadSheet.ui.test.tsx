import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { DownloadSheet } from "./DownloadSheet";
import type { DownloadSheetProps, DownloadSheetState } from "./download-sheet.contract";

// `ui` 계층: 에피소드를 열 때의 받기 시트(ADR-0095 D6 · D7) — 묻기 · Wi-Fi만 안내 · 오프라인.

function props(
  state: DownloadSheetState,
  over: Partial<DownloadSheetProps> = {},
): DownloadSheetProps {
  return {
    state,
    onDownloadNow: vi.fn(),
    onWifiLater: vi.fn(),
    onOpenAnyway: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
}

const tap = (element: Element) => fireEvent.tap(element, {});
const action = (id: string) =>
  within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${id}`)).getByTestId("ui-lynx-button");
const actionIds = () =>
  Array.from(document.querySelectorAll('[data-testid^="ui-lynx-bottom-sheet-action-"]')).map(
    (element) => element.getAttribute("data-testid")?.replace("ui-lynx-bottom-sheet-action-", ""),
  );

describe("DownloadSheet", () => {
  test("DSH1. 묻기 — 제목 · 크기 · 두 버튼 · 다시 묻지 않기가 서고, 체크한 채 지금 받기면 true로 부른다", () => {
    const onDownloadNow = vi.fn();
    render(
      <DownloadSheet
        {...props({ kind: "ask", ordinal: 3, sizeBytes: 12 * 1024 * 1024 }, { onDownloadNow })}
      />,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      "Download Episode 3?",
    );
    expect(screen.getByTestId("download-sheet-size")).toHaveTextContent("About 12 MB");
    expect(actionIds()).toEqual(["download-now", "wifi-later"]);
    tap(screen.getByTestId("download-sheet-dont-ask"));
    expect(screen.getByTestId("download-sheet-dont-ask")).toHaveAttribute(
      "accessibility-label",
      "Don't ask again, checked",
    );
    tap(action("download-now"));
    expect(onDownloadNow).toHaveBeenCalledWith(true);
  });

  test("DSH2. 묻기 — 크기를 모르면 크기 줄이 없고, 체크 없이 Wi-Fi에서 받기면 false로 부른다", () => {
    const onWifiLater = vi.fn();
    render(
      <DownloadSheet {...props({ kind: "ask", ordinal: 3, sizeBytes: null }, { onWifiLater })} />,
    );
    expect(screen.queryByTestId("download-sheet-size")).not.toBeInTheDocument();
    tap(action("wifi-later"));
    expect(onWifiLater).toHaveBeenCalledWith(false);
  });

  test("DSH3. Wi-Fi만 — 안내와 확인 하나뿐이고, 확인은 닫는다", () => {
    const onClose = vi.fn();
    render(<DownloadSheet {...props({ kind: "wifi-only", ordinal: 4 }, { onClose })} />);
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      "Episode 4 downloads on Wi-Fi",
    );
    expect(actionIds()).toEqual(["ok"]);
    expect(screen.queryByTestId("download-sheet-dont-ask")).not.toBeInTheDocument();
    tap(action("ok"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("DSH4. 오프라인 — 열 수 있으면 확인 · 그냥 열기, 없으면 확인만", () => {
    const onOpenAnyway = vi.fn();
    const { unmount } = render(
      <DownloadSheet
        {...props({ kind: "offline", ordinal: 5, canOpenAnyway: true }, { onOpenAnyway })}
      />,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent("You're offline");
    expect(screen.getByTestId("ui-lynx-bottom-sheet-description")).toHaveTextContent(
      "Episode 5 isn't downloaded yet.",
    );
    expect(actionIds()).toEqual(["ok", "open-anyway"]);
    tap(action("open-anyway"));
    expect(onOpenAnyway).toHaveBeenCalledTimes(1);
    unmount();
    render(<DownloadSheet {...props({ kind: "offline", ordinal: 5, canOpenAnyway: false })} />);
    expect(actionIds()).toEqual(["ok"]);
  });

  test("DSH5. 바깥(딤)을 누르면 닫는다", () => {
    const onClose = vi.fn();
    render(<DownloadSheet {...props({ kind: "ask", ordinal: 3, sizeBytes: null }, { onClose })} />);
    tap(screen.getByTestId("ui-lynx-bottom-sheet-scrim"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
