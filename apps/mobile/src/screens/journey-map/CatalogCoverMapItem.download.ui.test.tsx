import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { CatalogCoverMapItem } from "./CatalogCoverMapItem";
import type { CoverDownloadState } from "./catalog-map.contract";
import type { JourneyMapNodeStatus } from "./journey-map-types";

// `ui` 계층(CCD1 ~ CCD4, ADR-0165): 사용자 차례인 편의 표지가 받는 중이면 고리와 「Getting ready · n%」, 받아야 하면
// 「Tap to download · 크기」를 라벨 자리에 세우고, 낭독 이름에도 같은 말을 붙입니다. 상태 판정은 unit이 집니다.

afterEach(() => {
  cleanup();
});

const episodeId = "u11-bookstore";
const unitTestId = `ui-lynx-special-unit-catalog-cover-${episodeId}`;
const titleTestId = `journey-special-unit-title-catalog-cover-${episodeId}`;
const ringTestId = `catalog-cover-ring-${episodeId}`;

function mount(download: CoverDownloadState | undefined, status: JourneyMapNodeStatus) {
  const onSelect = vi.fn<(episodeId: string) => void>();
  render(
    <CatalogCoverMapItem
      episodeId={episodeId}
      ordinal={11}
      status={status}
      onSelect={onSelect}
      {...(download === undefined ? {} : { download })}
    />,
  );
  return { onSelect };
}

describe("CatalogCoverMapItem 받기 표시", () => {
  test("CCD1. 표시가 없으면 라벨은 「Intro」이고 고리가 없다", () => {
    mount(undefined, "available");
    expect(screen.getByTestId(titleTestId)).toHaveTextContent("Intro");
    expect(screen.queryByTestId(ringTestId)).toBeNull();

    cleanup();
    mount({ kind: "none" }, "available");
    expect(screen.getByTestId(titleTestId)).toHaveTextContent("Intro");
  });

  test("CCD2. 받는 중이면 노드 둘레에 고리가 서고 라벨이 「Getting ready · 42%」다", () => {
    mount({ kind: "getting-ready", percent: 42 }, "available");
    expect(screen.getByTestId(titleTestId)).toHaveTextContent("Getting ready · 42%");
    const ring = screen.getByTestId(ringTestId);
    expect(ring).toHaveClass("catalog-cover-ring");
    expect(ring).toHaveAttribute("content", expect.stringContaining("<path"));
    expect(screen.getByTestId(unitTestId)).toHaveAttribute(
      "accessibility-label",
      expect.stringContaining("Getting ready · 42%"),
    );
  });

  test("CCD3. 받아야 하면 라벨이 「Tap to download · 12 MB」이고 고리가 없다", () => {
    mount({ kind: "tap-to-download", bytes: 12 * 1024 ** 2 }, "available");
    expect(screen.getByTestId(titleTestId)).toHaveTextContent("Tap to download · 12 MB");
    expect(screen.queryByTestId(ringTestId)).toBeNull();
    expect(screen.getByTestId(unitTestId)).toHaveAttribute(
      "accessibility-label",
      expect.stringContaining("Tap to download · 12 MB"),
    );
  });

  test("CCD4. 「Tap to download」 표지를 누르면 그 편의 고름(받기 문지기)이 불린다", () => {
    const { onSelect } = mount({ kind: "tap-to-download", bytes: null }, "available");
    fireEvent.tap(screen.getByTestId(unitTestId));
    expect(onSelect).toHaveBeenCalledWith(episodeId);
  });
});
