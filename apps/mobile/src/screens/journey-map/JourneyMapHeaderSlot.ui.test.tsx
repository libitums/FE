import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapHeaderSlot } from "./JourneyMapHeaderSlot";
import type {
  CatalogMapSection,
  JourneyMapHeaderSlotProps,
  SheetTargetId,
} from "./catalog-map.contract";
import { catalogSheetKey } from "./catalog-sheet";
import { sheetEntranceClasses } from "./journey-map-sheet-motion";
import type { JourneyMapProgressLoad } from "./journey-map-load.contract";
import { realSections } from "./JourneyMapScreen.tutorial-u00.test-support";

// `ui` 계층: 머리 슬롯이 load 상태를 줄 변형으로 옮기고, 띠가 말풍선이 열린 동안만 서는지 봅니다.

afterEach(() => {
  cleanup();
});

// 열린 유닛의 키입니다 — 내장 튜토리얼(u00) 구획의 레슨 n번입니다.
const lesson = (n: number): SheetTargetId => catalogSheetKey("u00-tutorial", `S${n}`);

// ⟨§20⟩ 띠는 말풍선이 열린 동안(openStepId !== null)만 선다. load 변형 테스트는 말풍선이 열린
// 상태(S1)에서 본다. 확인 중(checking)은 말풍선이 못 열리므로 슬롯 단언은 띠 없음만 본다.
function mount(load: JourneyMapProgressLoad, openStepId: SheetTargetId | null = lesson(1)) {
  render(
    <JourneyMapHeaderSlot
      catalogSections={realSections}
      catalogProgress={{}}
      load={load}
      openStepId={openStepId}
    />,
  );
}

const count = () => screen.queryByTestId("ui-lynx-episode-header-count");
const row = () => screen.queryByTestId("journey-progress-load-row");
const header = () => screen.queryByTestId("ui-lynx-episode-header");

describe("JourneyMapHeaderSlot load", () => {
  test("HS1. checking에는 줄이 없고 loading에는 loading 줄이 선다", () => {
    mount({ status: "checking" }, null);
    expect(row()).not.toBeInTheDocument();
    cleanup();

    mount({ status: "loading" }, null);
    expect(row()).toHaveAttribute("data-status", "loading");
  });

  test("HS1. retrying이면 줄은 loading이고 머리 카드는 숫자를 보인다", () => {
    mount({ status: "retrying" });

    expect(row()).toHaveAttribute("data-status", "loading");
    expect(count()).toBeInTheDocument();
  });

  test("HS1. failed면 줄이 failed이고 머리 카드는 숫자를 보인다", () => {
    mount({ status: "failed", onRetry: vi.fn<() => void>() });

    expect(row()).toHaveAttribute("data-status", "failed");
    expect(count()).toBeInTheDocument();
  });

  test("HS1(가드). known이면 줄이 없고 머리 카드는 숫자를 보인다", () => {
    mount({ status: "known" });

    expect(row()).not.toBeInTheDocument();
    expect(count()).toBeInTheDocument();
  });

  test("HS1. (§20) checking이면 열린 유닛이 없어 띠가 없다", () => {
    mount({ status: "checking" }, null);

    expect(header()).not.toBeInTheDocument();
  });

  test("HS2. 줄이 서고 사라져도 머리 카드는 같은 노드다(다시 마운트하지 않는다)", () => {
    const props = {
      catalogSections: realSections,
      catalogProgress: {},
      openStepId: lesson(1),
    } as const;
    const { rerender } = render(<JourneyMapHeaderSlot {...props} load={{ status: "retrying" }} />);
    const card = screen.getByTestId("ui-lynx-episode-header");
    expect(row()).toBeInTheDocument();

    rerender(<JourneyMapHeaderSlot {...props} load={{ status: "known" }} />);
    expect(row()).not.toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-episode-header")).toBe(card);

    rerender(<JourneyMapHeaderSlot {...props} load={{ status: "loading" }} />);
    expect(row()).toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-episode-header")).toBe(card);
  });
});

// ---------------------------------------------------------------- 띠 개편 (spec §19 + §20)
// 설명 줄은 `Episode n, unit NN`입니다. 구획의 항목 자리는 표지 00 · 첫 레슨 01 ...
// §20: 띠는 말풍선이 열린 동안만 서고, 구획은 스크롤 index가 아니라 열린 유닛이 든 구획이다.

const label = () => screen.getByTestId("ui-lynx-episode-header-label");
const band = () => screen.getByTestId("ui-lynx-episode-header").parentElement as Element;
const rowBox = () => screen.getByTestId("journey-progress-load-row").parentElement as Element;

type SlotProps = JourneyMapHeaderSlotProps;

function slot(overrides: Partial<SlotProps> = {}) {
  return (
    <JourneyMapHeaderSlot
      catalogSections={realSections}
      catalogProgress={{}}
      load={{ status: "known" }}
      {...overrides}
    />
  );
}

describe("JourneyMapHeaderSlot 띠는 말풍선이 열린 동안만", () => {
  test("HB0. 열린 유닛이 없으면 띠가 없다", () => {
    render(slot());

    expect(header()).not.toBeInTheDocument();
  });

  test("HB0. 열린 유닛이 null이면 띠도 설명 줄도 없다", () => {
    render(slot({ openStepId: null }));

    expect(header()).not.toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-episode-header-label")).not.toBeInTheDocument();
  });

  test("HB0. 유닛이 열리면 띠가 서고 닫히면(null) DOM에서 사라진다", () => {
    const view = render(slot());
    expect(header()).not.toBeInTheDocument();

    view.rerender(slot({ openStepId: lesson(1) }));
    expect(header()).toBeInTheDocument();

    view.rerender(slot({ openStepId: null }));
    expect(header()).not.toBeInTheDocument();
  });
});

describe("JourneyMapHeaderSlot 설명 줄", () => {
  test("HB3. 열린 유닛 번호다 (S1 = 01)", () => {
    render(slot({ openStepId: lesson(1) }));

    expect(label()).toHaveTextContent("Episode 0, unit 01");
  });

  test("HB3. 열린 유닛이 바뀌면 설명 줄이 따라 바뀐다 (rerender)", () => {
    const view = render(slot({ openStepId: lesson(1) }));
    expect(label()).toHaveTextContent("Episode 0, unit 01");

    view.rerender(slot({ openStepId: lesson(3) }));

    expect(label()).toHaveTextContent("Episode 0, unit 03");
  });

  test("HB4. 준비 중 구획이 함께 있어도 열린 유닛의 구획 띠가 선다 (준비 중 카드가 아니다)", () => {
    const pendingSection: CatalogMapSection = {
      kind: "catalog-unavailable",
      episodeId: "u09-later",
      ordinal: 9,
      title: "Coming later.",
      reason: "pending",
    };
    render(
      slot({
        catalogSections: [...realSections, pendingSection],
        openStepId: lesson(2),
      }),
    );

    expect(label()).toHaveTextContent("Episode 0, unit 02");
    expect(screen.queryByText(/Episode 9/)).not.toBeInTheDocument();
  });

  test("HB5. 접근성 이름이 설명 줄을 앞에 쉼표로 잇는다", () => {
    render(slot({ openStepId: lesson(1) }));

    expect(
      screen.getByTestId("ui-lynx-episode-header").getAttribute("accessibility-label"),
    ).toMatch(/^Episode 0, unit 01, /);
  });
});

describe("JourneyMapHeaderSlot 줄 자리", () => {
  // 말풍선이 열린 채로 줄이 서는 상태는 실패(재시도 가능)뿐입니다 — 확인 중에는 노드를 누를 수 없습니다.
  const failed: JourneyMapProgressLoad = { status: "failed", onRetry: vi.fn<() => void>() };

  test("HB7. 띠가 없으면 줄 상자의 위 여백이 없다 (0이거나 선언 없음)", () => {
    render(slot({ load: { status: "loading" } }));

    expect(header()).not.toBeInTheDocument();
    expect(rowBox().getAttribute("style") ?? "").not.toMatch(/margin-top:\s*[1-9]/);
    expect(rowBox().getAttribute("style") ?? "").not.toContain("110px");
  });

  test("HB7. 띠가 없는 failed 줄도 위 여백이 없다", () => {
    render(slot({ load: { status: "failed", onRetry: vi.fn<() => void>() } }));

    expect(rowBox().getAttribute("style") ?? "").not.toMatch(/margin-top:\s*[1-9]/);
  });

  test("HB7. 띠가 있으면 줄의 위 여백은 재기 전 110px이고, 잰 뒤에는 잰 높이를 따른다", () => {
    render(slot({ load: failed, openStepId: lesson(1) }));

    expect(rowBox().getAttribute("style")).toContain("110px");

    fireEvent.layoutchange(band(), { detail: { height: 142 } });

    expect(rowBox().getAttribute("style")).toContain("142px");
    expect(rowBox().getAttribute("style")).not.toContain("110px");
  });

  test("HB7. 말풍선을 닫으면 줄의 위 여백이 다시 없어진다", () => {
    const view = render(slot({ load: failed, openStepId: lesson(1) }));
    expect(rowBox().getAttribute("style")).toContain("110px");

    view.rerender(slot({ load: failed, openStepId: null }));

    expect(header()).not.toBeInTheDocument();
    expect(rowBox().getAttribute("style") ?? "").not.toMatch(/margin-top:\s*[1-9]/);
  });

  test("HB6. layoutchange를 받아도 던지지 않는다", () => {
    render(slot({ openStepId: lesson(1) }));

    expect(() => fireEvent.layoutchange(band(), { detail: { height: 132 } })).not.toThrow();
  });
});

describe("JourneyMapHeaderSlot 등장 종류", () => {
  test("HS-E1. 열린 유닛에 expressive를 주면 띠 래퍼에 등장 클래스가, 안 주면 기본 클래스만 선다", () => {
    // 채움 빛은 채움이 있을 때만 섭니다 — 표지와 첫 레슨을 끝낸 진행으로 봅니다.
    const progress = { catalogProgress: { "u00-tutorial": ["intro", "S1"] } };
    const view = render(slot({ ...progress, openStepId: lesson(2), sheetEntrance: "expressive" }));
    expect(band().getAttribute("class")).toBe(sheetEntranceClasses("expressive").band);
    expect(screen.queryByTestId("ui-lynx-episode-header-fill-sheen")).toBeInTheDocument();

    view.rerender(slot({ ...progress, openStepId: lesson(2) }));
    expect(band().getAttribute("class")).toBe("journey-map-screen-episode-header");
    expect(screen.queryByTestId("ui-lynx-episode-header-fill-sheen")).not.toBeInTheDocument();
  });
});
