import { describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";

import type { DownloadProgressSummary } from "../../app/download-progress";
import { DownloadSettingsScreen } from "./DownloadSettingsScreen";
import type { DownloadSettingsScreenProps } from "./download-settings.contract";

// `ui` 계층: 설정 › 다운로드(ADR-0095 D8) — 정책 셋 중 고르기, 「모두 받기」(요금제면 확인 창), 받은 크기 줄, 뒤로.

const emptyProgress: DownloadProgressSummary = { rows: [], current: null };
const row1 = { episodeId: "e01", ordinal: 1, downloadedLessons: 11, totalLessons: 11 };
const row2 = { episodeId: "e02", ordinal: 2, downloadedLessons: 3, totalLessons: 11 };
const progress = (current: DownloadProgressSummary["current"]): DownloadProgressSummary => ({
  rows: [row1, row2],
  current,
});

function props(over: Partial<DownloadSettingsScreenProps> = {}): DownloadSettingsScreenProps {
  return {
    loadPolicy: () => "ask",
    savePolicy: vi.fn(),
    isOnMobileData: () => false,
    loadDownloadedBytes: () => null,
    loadDownloadProgress: () => emptyProgress,
    onDownloadAll: vi.fn(),
    onDownloadRestOfCurrent: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
}

const tap = (element: Element) => fireEvent.tap(element, {});
const downloadAllButton = () =>
  within(screen.getByTestId("download-settings-download-all")).getByTestId("ui-lynx-button");
const restButton = () =>
  within(screen.getByTestId("download-settings-download-rest")).getByTestId("ui-lynx-button");
const dialogAction = (id: string) =>
  within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button");

describe("DownloadSettingsScreen", () => {
  test("DSU1. 제목과 정책 셋이 서고, 지금 정책이 골라져 있다", () => {
    render(<DownloadSettingsScreen {...props({ loadPolicy: () => "wifi-only" })} />);
    expect(screen.getByTestId("download-settings-title")).toHaveTextContent("Downloads");
    for (const [id, label] of [
      ["ask", "Ask every time"],
      ["always", "Always download"],
      ["wifi-only", "Wi-Fi only"],
    ]) {
      expect(screen.getByTestId(`ui-lynx-option-selector-item-${id}`)).toHaveTextContent(label);
    }
    expect(screen.getByTestId("ui-lynx-option-selector-item-wifi-only")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  test("DSU2. 정책을 고르면 곧바로 골라진 표시가 바뀌고 그 값으로 저장한다", () => {
    const savePolicy = vi.fn();
    render(<DownloadSettingsScreen {...props({ savePolicy })} />);
    tap(screen.getByTestId("ui-lynx-option-selector-item-always"));
    expect(savePolicy).toHaveBeenCalledWith("always");
    expect(screen.getByTestId("ui-lynx-option-selector-item-always")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  test("DSU3. 요금 없는 연결에서 「모두 받기」는 곧바로 받고 안내를 보인다", () => {
    const onDownloadAll = vi.fn();
    render(<DownloadSettingsScreen {...props({ onDownloadAll })} />);
    tap(downloadAllButton());
    expect(onDownloadAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("download-settings-confirm")).not.toBeInTheDocument();
    expect(screen.getByTestId("download-settings-download-all-started")).toBeInTheDocument();
  });

  test("DSU4. 요금제 연결에서 「모두 받기」는 확인 창을 띄우고, 확인해야 받는다 · 취소하면 받지 않는다", () => {
    const onDownloadAll = vi.fn();
    render(<DownloadSettingsScreen {...props({ onDownloadAll, isOnMobileData: () => true })} />);
    tap(downloadAllButton());
    expect(screen.getByTestId("download-settings-confirm")).toBeInTheDocument();
    expect(onDownloadAll).not.toHaveBeenCalled();
    tap(dialogAction("cancel"));
    expect(screen.queryByTestId("download-settings-confirm")).not.toBeInTheDocument();
    expect(onDownloadAll).not.toHaveBeenCalled();

    tap(downloadAllButton());
    tap(dialogAction("download"));
    expect(onDownloadAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("download-settings-confirm")).not.toBeInTheDocument();
  });

  test("DSU8. 편별 집계 줄이 id별로 서고, 행이 비면 스택이 없다", () => {
    const { unmount } = render(
      <DownloadSettingsScreen {...props({ loadDownloadProgress: () => progress(row2) })} />,
    );
    expect(screen.getByTestId("download-settings-episodes")).toBeInTheDocument();
    expect(screen.getByTestId("download-settings-episode-e01")).toHaveTextContent(
      "Episode 1: complete",
    );
    expect(screen.getByTestId("download-settings-episode-e02")).toHaveTextContent(
      "Episode 2: 3 of 11 lessons",
    );
    unmount();
    render(<DownloadSettingsScreen {...props()} />);
    expect(screen.queryByTestId("download-settings-episodes")).not.toBeInTheDocument();
  });

  test("DSU9. 나머지 받기 버튼은 진행 중인 편이 남았을 때만 선다", () => {
    const first = render(
      <DownloadSettingsScreen {...props({ loadDownloadProgress: () => progress(row2) })} />,
    );
    expect(screen.getByTestId("download-settings-download-rest")).toHaveTextContent(
      "Download the rest of Episode 2",
    );
    first.unmount();
    const done = render(
      <DownloadSettingsScreen {...props({ loadDownloadProgress: () => progress(row1) })} />,
    );
    expect(screen.queryByTestId("download-settings-download-rest")).not.toBeInTheDocument();
    done.unmount();
    render(<DownloadSettingsScreen {...props({ loadDownloadProgress: () => progress(null) })} />);
    expect(screen.queryByTestId("download-settings-download-rest")).not.toBeInTheDocument();
  });

  test("DSU10. 나머지 받기 — 요금 없으면 곧바로, 요금제면 확인해야 편 id로 받는다", () => {
    const onDownloadRestOfCurrent = vi.fn();
    const current = { ...row2, episodeId: "u02-checkin" };
    const loadDownloadProgress = () => ({ rows: [row1, current], current });
    const first = render(
      <DownloadSettingsScreen {...props({ onDownloadRestOfCurrent, loadDownloadProgress })} />,
    );
    tap(restButton());
    expect(onDownloadRestOfCurrent).toHaveBeenCalledWith("u02-checkin");
    expect(screen.queryByTestId("download-settings-confirm")).not.toBeInTheDocument();
    expect(screen.getByTestId("download-settings-download-all-started")).toBeInTheDocument();
    first.unmount();

    onDownloadRestOfCurrent.mockClear();
    render(
      <DownloadSettingsScreen
        {...props({ onDownloadRestOfCurrent, loadDownloadProgress, isOnMobileData: () => true })}
      />,
    );
    tap(restButton());
    expect(screen.getByTestId("download-settings-confirm")).toHaveTextContent(
      "The rest of Episode 2 downloads on mobile data.",
    );
    expect(onDownloadRestOfCurrent).not.toHaveBeenCalled();
    tap(dialogAction("cancel"));
    expect(onDownloadRestOfCurrent).not.toHaveBeenCalled();
    tap(restButton());
    tap(dialogAction("download"));
    expect(onDownloadRestOfCurrent).toHaveBeenCalledTimes(1);
    expect(onDownloadRestOfCurrent).toHaveBeenCalledWith("u02-checkin");
  });

  test("DSU5. 받은 크기는 값이 있을 때만 줄로 선다", () => {
    const { unmount } = render(<DownloadSettingsScreen {...props()} />);
    expect(screen.queryByTestId("download-settings-downloaded")).not.toBeInTheDocument();
    unmount();
    render(<DownloadSettingsScreen {...props({ loadDownloadedBytes: () => 45 * 1024 * 1024 })} />);
    expect(screen.getByTestId("download-settings-downloaded")).toHaveTextContent(
      "Downloaded: 45 MB",
    );
  });

  test("DSU6. 뒤로 버튼은 onBack을 부른다", () => {
    const onBack = vi.fn();
    render(<DownloadSettingsScreen {...props({ onBack })} />);
    tap(screen.getByTestId("ui-lynx-round-button"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

test("DSU7. 다시 그려져도(새 함수를 받아도) 저장소는 화면을 열 때 한 번만 읽는다", () => {
  const loadDownloadedBytes = vi.fn<() => number | null>(() => null);
  const loadPolicy = vi.fn<() => "ask">(() => "ask");
  const loadDownloadProgress = vi.fn<() => DownloadProgressSummary>(() => emptyProgress);
  const { rerender } = render(
    <DownloadSettingsScreen
      {...props({ loadPolicy, loadDownloadedBytes, loadDownloadProgress })}
    />,
  );
  rerender(
    <DownloadSettingsScreen
      {...props({
        loadPolicy: () => loadPolicy(),
        loadDownloadedBytes: () => loadDownloadedBytes(),
        loadDownloadProgress: () => loadDownloadProgress(),
      })}
    />,
  );
  expect(loadPolicy).toHaveBeenCalledTimes(1);
  expect(loadDownloadedBytes).toHaveBeenCalledTimes(1);
  expect(loadDownloadProgress).toHaveBeenCalledTimes(1);
});

test("DSU11. 확인 창이 떠 있으면 뒤로가기는 창만 닫고(onBack 0회), 뒤쪽 내용은 보조기술에서 숨는다", () => {
  const onBack = vi.fn();
  const onDownloadRestOfCurrent = vi.fn();
  render(
    <DownloadSettingsScreen
      {...props({
        isOnMobileData: () => true,
        loadDownloadProgress: () => progress(row2),
        onBack,
        onDownloadRestOfCurrent,
      })}
    />,
  );
  tap(restButton());
  expect(screen.getByTestId("download-settings-confirm")).toBeInTheDocument();
  const content = screen.getByTestId("download-settings-screen").querySelector("scroll-view");
  expect(content).toHaveAttribute("accessibility-elements-hidden", "true");

  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(screen.queryByTestId("download-settings-confirm")).not.toBeInTheDocument();
  expect(content).not.toHaveAttribute("accessibility-elements-hidden", "true");
  expect(onBack).toHaveBeenCalledTimes(0);
  expect(onDownloadRestOfCurrent).toHaveBeenCalledTimes(0);
});
