import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { DownloadSettingsScreen } from "./DownloadSettingsScreen";
import type { DownloadSettingsScreenProps } from "./download-settings.contract";

// `ui` 계층: 설정 › 다운로드(ADR-0095 D8) — 정책 셋 중 고르기, 「모두 받기」(요금제면 확인 창), 받은 크기 줄, 뒤로.

function props(over: Partial<DownloadSettingsScreenProps> = {}): DownloadSettingsScreenProps {
  return {
    loadPolicy: () => "ask",
    savePolicy: vi.fn(),
    isOnMobileData: () => false,
    loadDownloadedBytes: () => null,
    onDownloadAll: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
}

const tap = (element: Element) => fireEvent.tap(element, {});
const downloadAllButton = () =>
  within(screen.getByTestId("download-settings-download-all")).getByTestId("ui-lynx-button");
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
  const { rerender } = render(
    <DownloadSettingsScreen {...props({ loadPolicy, loadDownloadedBytes })} />,
  );
  rerender(
    <DownloadSettingsScreen
      {...props({
        loadPolicy: () => loadPolicy(),
        loadDownloadedBytes: () => loadDownloadedBytes(),
      })}
    />,
  );
  expect(loadPolicy).toHaveBeenCalledTimes(1);
  expect(loadDownloadedBytes).toHaveBeenCalledTimes(1);
});
