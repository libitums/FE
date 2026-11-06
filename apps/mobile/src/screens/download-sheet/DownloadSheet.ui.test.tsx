import { describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";

import type { DownloadSheetUnit } from "../../app/download-gate-target";
import { DownloadSheet } from "./DownloadSheet";
import type {
  DownloadSheetProps,
  DownloadSheetState,
  DownloadSheetTarget,
} from "./download-sheet.contract";

// `ui` 계층: 받기 시트(ADR-0095 D6 · D7, 레슨 단위) — 매번 묻기 · Wi-Fi만 · 오프라인, 본문 행.

function props(
  state: DownloadSheetState,
  over: Partial<DownloadSheetProps> = {},
): DownloadSheetProps {
  return {
    state,
    onDownloadNow: vi.fn(),
    onWifiLater: vi.fn(),
    onUseMobileDataOnce: vi.fn(),
    onOpenAnyway: vi.fn(),
    onChangeSetting: vi.fn(),
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
const episodeTarget = (ordinal: number, sizeBytes: number | null = null): DownloadSheetTarget => ({
  kind: "episode",
  ordinal,
  sizeBytes,
});
const unitTarget = (unit: DownloadSheetUnit, ordinal = 2): DownloadSheetTarget => ({
  kind: "unit",
  ordinal,
  unit,
});
const lesson = (ordinal: number): DownloadSheetUnit => ({ role: "lesson", ordinal });
const rowStatus = (id: string) =>
  screen.getByTestId(`download-sheet-row-${id}`).getAttribute("data-status");
const rowIds = () =>
  Array.from(document.querySelectorAll('[data-testid^="download-sheet-row-"]')).map((element) =>
    element.getAttribute("data-testid")?.replace("download-sheet-row-", ""),
  );

describe("DownloadSheet", () => {
  test("DSH1. 편 묻기 — 제목 · 크기 · 두 행 · 안내 · 두 버튼이 서고 지금 받기는 인자 없이 부른다", () => {
    const onDownloadNow = vi.fn();
    render(
      <DownloadSheet
        {...props(
          { kind: "ask", target: episodeTarget(3, 12 * 1024 * 1024), commonDone: false },
          { onDownloadNow },
        )}
      />,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      "Download Episode 3?",
    );
    expect(screen.getByTestId("download-sheet-size")).toHaveTextContent("About 12 MB");
    expect(rowIds()).toEqual(["common", "target"]);
    expect(rowStatus("common")).toBe("pending");
    expect(rowStatus("target")).toBe("pending");
    expect(screen.getByTestId("download-sheet-hint")).toBeInTheDocument();
    expect(screen.queryByTestId("download-sheet-dont-ask")).not.toBeInTheDocument();
    expect(actionIds()).toEqual(["download-now", "wifi-later"]);
    tap(action("download-now"));
    expect(onDownloadNow).toHaveBeenCalledTimes(1);
    expect(onDownloadNow).toHaveBeenCalledWith();
  });

  test("DSH1b. 편 묻기 — 크기를 모르면 크기 줄이 없다", () => {
    render(
      <DownloadSheet
        {...props({ kind: "ask", target: episodeTarget(3, null), commonDone: false })}
      />,
    );
    expect(screen.queryByTestId("download-sheet-size")).not.toBeInTheDocument();
  });

  test("DSH2. 유닛 묻기 — 제목 · 크기 줄 없음 · 세 행(받음 · 받을 것 · Wi-Fi) · Wi-Fi에서 받기", () => {
    const onWifiLater = vi.fn();
    render(
      <DownloadSheet
        {...props(
          { kind: "ask", target: unitTarget(lesson(3)), commonDone: true },
          { onWifiLater },
        )}
      />,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      "Download Lesson 3?",
    );
    expect(screen.queryByTestId("download-sheet-size")).not.toBeInTheDocument();
    expect(rowIds()).toEqual(["common", "target", "rest"]);
    expect(rowStatus("common")).toBe("done");
    expect(rowStatus("target")).toBe("pending");
    expect(rowStatus("rest")).toBe("wifi");
    expect(screen.getByTestId("download-sheet-row-target")).toHaveTextContent("Lesson 3");
    tap(action("wifi-later"));
    expect(onWifiLater).toHaveBeenCalledTimes(1);
  });

  test("DSH3. Wi-Fi만(편 4) — 제목 · 두 행 · 세 출구가 각자의 콜백을 한 번씩 부른다", () => {
    const onUseMobileDataOnce = vi.fn();
    const onOpenAnyway = vi.fn();
    const onChangeSetting = vi.fn();
    render(
      <DownloadSheet
        {...props(
          { kind: "wifi-only", target: episodeTarget(4), commonDone: false },
          { onUseMobileDataOnce, onOpenAnyway, onChangeSetting },
        )}
      />,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      "Episode 4 downloads on Wi-Fi",
    );
    expect(actionIds()).toEqual(["mobile-data-once", "open-anyway", "change-setting"]);
    expect(rowIds()).toEqual(["common", "target"]);
    tap(action("mobile-data-once"));
    tap(action("open-anyway"));
    tap(action("change-setting"));
    expect(onUseMobileDataOnce).toHaveBeenCalledTimes(1);
    expect(onOpenAnyway).toHaveBeenCalledTimes(1);
    expect(onChangeSetting).toHaveBeenCalledTimes(1);
  });

  test("DSH4. 오프라인(레슨 2) — 열 수 있으면 그냥 열기 · 확인에 안내가 서고 행은 없다, 없으면 확인만", () => {
    const onOpenAnyway = vi.fn();
    const { unmount } = render(
      <DownloadSheet
        {...props(
          { kind: "offline", target: unitTarget(lesson(2), 5), canOpenAnyway: true },
          { onOpenAnyway },
        )}
      />,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent("You're offline");
    expect(screen.getByTestId("ui-lynx-bottom-sheet-description")).toHaveTextContent(
      "Lesson 2 isn't downloaded yet.",
    );
    expect(actionIds()).toEqual(["open-anyway", "ok"]);
    expect(rowIds()).toEqual([]);
    expect(screen.getByTestId("download-sheet-hint")).toBeInTheDocument();
    tap(action("open-anyway"));
    expect(onOpenAnyway).toHaveBeenCalledTimes(1);
    unmount();
    render(
      <DownloadSheet
        {...props({ kind: "offline", target: unitTarget(lesson(2), 5), canOpenAnyway: false })}
      />,
    );
    expect(actionIds()).toEqual(["ok"]);
  });

  test("DSH5. 바깥(딤)을 누르면 닫는다", () => {
    const onClose = vi.fn();
    render(
      <DownloadSheet
        {...props({ kind: "ask", target: episodeTarget(3), commonDone: false }, { onClose })}
      />,
    );
    tap(screen.getByTestId("ui-lynx-bottom-sheet-scrim"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("DSH6. 유닛 라벨 — 문화 · 최종 · 이야기가 제목에 선다", () => {
    for (const [role, title] of [
      ["culture", "Download Culture?"],
      ["final", "Download Final test?"],
      ["story", "Download Story?"],
    ] as const) {
      const { unmount } = render(
        <DownloadSheet
          {...props({
            kind: "ask",
            target: unitTarget({ role, ordinal: 0 }),
            commonDone: false,
          })}
        />,
      );
      expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(title);
      unmount();
    }
  });

  test("DSH7. 시스템 뒤로가기는 닫기와 같다 — onClose 1회, 내려가면 핸들러가 남지 않는다", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <DownloadSheet
        {...props({ kind: "ask", target: episodeTarget(3), commonDone: false }, { onClose })}
      />,
    );
    let handled = false;
    act(() => {
      handled = backHandlers.runTop();
    });
    expect(handled).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(backHandlers.runTop()).toBe(false);
  });

  test("DSH8. 행은 접근성 요소 하나로 라벨과 상태를 함께 읽힌다", () => {
    render(
      <DownloadSheet
        {...props({ kind: "ask", target: unitTarget(lesson(3)), commonDone: true })}
      />,
    );
    expect(screen.getByTestId("download-sheet-row-common")).toHaveAttribute(
      "accessibility-label",
      "Shared pictures and audio, On your phone",
    );
    expect(screen.getByTestId("download-sheet-row-target")).toHaveAttribute(
      "accessibility-label",
      "Lesson 3, Downloads now",
    );
  });
});
