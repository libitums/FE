import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { CatalogCoverMapItem } from "./CatalogCoverMapItem";
import type { CatalogCoverIllustration } from "./catalog-cover-illustration";
import type { JourneyMapNodeStatus } from "./journey-map-types";

// `ui` 계층: 카탈로그 표지 노드가 일러스트를 노드 뒤(DOM 앞 · z 아래)에 그리고, 라벨을 제목 한 줄로 세우는지 봅니다.
// 좌우 · 주소의 계산은 unit(`catalog-cover-illustration.unit.test.ts`)이 집니다.

afterEach(() => {
  cleanup();
});

const episodeId = "u02-checkin";
const unitTestId = `ui-lynx-special-unit-catalog-cover-${episodeId}`;
const imageTestId = `catalog-cover-illustration-${episodeId}`;
const wrapperTestId = `catalog-cover-illustrated-${episodeId}`;
const url = "https://x.supabase.co/storage/v1/object/public/content/images/covers/u02-checkin.webp";

type MountOptions = {
  /** 없으면 기본 일러스트(왼쪽). `"omit"`은 prop 자체를 넘기지 않습니다. */
  readonly illustration?: CatalogCoverIllustration | null | "omit";
  readonly layer?: "map" | "guide";
};

function mount(status: JourneyMapNodeStatus, options: MountOptions = {}) {
  const onSelect = vi.fn<(episodeId: string) => void>();
  const onTapBackdrop = vi.fn<() => void>();
  const illustration =
    options.illustration === undefined ? { url, side: "left" as const } : options.illustration;
  render(
    <CatalogCoverMapItem
      episodeId={episodeId}
      ordinal={2}
      status={status}
      onSelect={onSelect}
      layer={options.layer ?? "map"}
      onTapBackdrop={onTapBackdrop}
      {...(illustration === "omit" ? {} : { illustration })}
    />,
  );
  return { onSelect, onTapBackdrop };
}

describe("CatalogCoverMapItem 일러스트", () => {
  test("CCM1. 일러스트가 있으면 image가 유닛 앞(문서 순서)에 서고 src · 좌우 클래스가 맞다", () => {
    mount("available", { illustration: { url, side: "left" } });

    const image = screen.getByTestId(imageTestId);
    const unit = screen.getByTestId(unitTestId);
    expect(image).toHaveAttribute("src", url);
    expect(image).toHaveClass("catalog-cover-illustration");
    expect(image.compareDocumentPosition(unit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const wrapper = screen.getByTestId(wrapperTestId);
    expect(wrapper).toHaveClass("catalog-cover-illustrated");
    expect(wrapper).toHaveClass("catalog-cover-illustrated-left");
    expect(wrapper.contains(image)).toBe(true);
    expect(wrapper.contains(unit)).toBe(true);

    cleanup();
    mount("available", { illustration: { url, side: "right" } });
    expect(screen.getByTestId(wrapperTestId)).toHaveClass("catalog-cover-illustrated-right");
    expect(screen.getByTestId(wrapperTestId)).not.toHaveClass("catalog-cover-illustrated-left");
  });

  test.each([
    ["locked", true],
    ["checking", false],
    ["available", false],
    ["completed", false],
  ] as const)("CCM2. %s 표지의 일러스트 흐림 클래스는 %s", (status, dimmed) => {
    mount(status);

    const image = screen.getByTestId(imageTestId);
    if (dimmed) {
      expect(image).toHaveClass("catalog-cover-illustration-locked");
    } else {
      expect(image).not.toHaveClass("catalog-cover-illustration-locked");
    }
  });

  test("CCM3. 일러스트는 장식(낭독 아님)이고 라벨은 SPECIAL 없이 제목 한 줄이다", () => {
    mount("available");

    expect(screen.getByTestId(imageTestId)).toHaveAttribute("accessibility-element", "false");
    expect(
      screen.queryByTestId(`journey-special-unit-eyebrow-catalog-cover-${episodeId}`),
    ).toBeNull();
    const title = screen.getByTestId(`journey-special-unit-title-catalog-cover-${episodeId}`);
    expect(title).toHaveTextContent("Intro");
    expect(screen.getByTestId(`journey-special-unit-label-catalog-cover-${episodeId}`)).toHaveClass(
      "journey-special-unit-label-brand",
    );
  });

  test("CCM5. 안내 겹이면 일러스트 · 노드 · 라벨을 담은 래퍼가 통째로 들리고, 안내가 아니면 들리지 않는다", () => {
    mount("available", { layer: "guide" });

    const wrapper = screen.getByTestId(wrapperTestId);
    expect(wrapper).toHaveClass("catalog-cover-illustrated-guided");
    expect(wrapper.contains(screen.getByTestId(imageTestId))).toBe(true);
    expect(wrapper.contains(screen.getByTestId(unitTestId))).toBe(true);

    cleanup();
    mount("available");
    expect(screen.getByTestId(wrapperTestId)).not.toHaveClass("catalog-cover-illustrated-guided");
  });

  test("CCM6. 들린 일러스트 자리를 누르면 바깥 탭으로 올리고 표지는 고르지 않는다 — 안내가 아니면 아무것도 없다", () => {
    const guided = mount("available", { layer: "guide" });
    fireEvent.tap(screen.getByTestId(wrapperTestId), {});
    expect(guided.onTapBackdrop).toHaveBeenCalledTimes(1);
    expect(guided.onSelect).not.toHaveBeenCalled();

    cleanup();
    const plain = mount("available");
    fireEvent.tap(screen.getByTestId(wrapperTestId), {});
    expect(plain.onTapBackdrop).not.toHaveBeenCalled();
  });

  test.each([["없음", "omit"] as const, ["null", null] as const])(
    "CCM4. 일러스트가 %s이면 image · 래퍼 없이 유닛과 한 줄 라벨만 선다",
    (_name, illustration) => {
      mount("available", { illustration });

      expect(screen.queryByTestId(imageTestId)).toBeNull();
      expect(screen.queryByTestId(wrapperTestId)).toBeNull();
      expect(screen.getByTestId(unitTestId)).toHaveAttribute("data-status", "available");
      expect(
        screen.queryByTestId(`journey-special-unit-eyebrow-catalog-cover-${episodeId}`),
      ).toBeNull();
      expect(
        screen.getByTestId(`journey-special-unit-title-catalog-cover-${episodeId}`),
      ).toHaveTextContent("Intro");
    },
  );
});
