import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { CatalogCoverScreen } from "./CatalogCoverScreen";
import type { CatalogCutView, CatalogCuts } from "./catalog-cover.contract";

// `ui` 계층: 이야기 컷 대사 위 다시 듣기 스피커(ADR-0188) — 소리 있는 컷은 그 소리를 다시, 없는 컷은 회색.
// 대사 토글 · 진행과 겹치지 않는다. 소리 모듈만 대역입니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(() => "started"),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../../lib/audio", () => audio);

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const SOURCE = "https://cdn/audio/u01-water/pre-2.m4a";

const line = (index: number, audioSource?: string): CatalogCutView => ({
  kind: "line",
  voice: "speech",
  index,
  speaker: { kind: "named", name: "점원" },
  text: { ko: `대사 ${index}`, en: `Line ${index}`, roman: `daesa ${index}` },
  aside: null,
  imageUrl: null,
  ...(audioSource === undefined ? {} : { audioSource }),
});

const cuts: CatalogCuts = [line(0, SOURCE), line(1), line(2)];

function mount() {
  const onReplay = vi.fn<(cutIndex: number) => void>();
  const onComplete = vi.fn();
  render(
    <CatalogCoverScreen
      stage="epilogue"
      insets={insets}
      ordinal={1}
      cuts={cuts}
      onComplete={onComplete}
      onExit={() => {}}
      onReplay={onReplay}
    />,
  );
  return { onReplay, onComplete };
}

const replay = () => screen.getByTestId("catalog-cover-screen-replay");
const tapReplay = () => fireEvent.tap(within(replay()).getByTestId("ui-lynx-round-button"), {});
const tapNext = () =>
  fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CatalogCoverScreen 다시 듣기", () => {
  test("CR1. 소리 있는 컷 — 스피커를 누르면 그 컷 소리를 다시 내고 onReplay(컷 순번)", () => {
    const { onReplay } = mount();
    audio.playAudio.mockClear();

    expect(replay().getAttribute("data-state")).toBe("available");
    tapReplay();

    expect(audio.playAudio).toHaveBeenCalledTimes(1);
    expect(audio.playAudio.mock.calls[0]?.[0]).toBe(SOURCE);
    expect(onReplay).toHaveBeenCalledWith(0);
  });

  test("CR2. 스피커는 대사 토글 · 진행을 건드리지 않는다", () => {
    const { onComplete } = mount();
    tapReplay();

    const root = screen.getByTestId("catalog-cover-screen");
    expect(root.getAttribute("data-script")).toBe("en");
    expect(root.getAttribute("data-cut-index")).toBe("0");
    expect(onComplete).not.toHaveBeenCalled();
  });

  test("CR3. 소리 없는 컷으로 넘어가면 회색 — 눌러도 소리 · onReplay 없음", () => {
    const { onReplay } = mount();
    tapNext();
    tapNext();
    audio.playAudio.mockClear();

    expect(screen.getByTestId("catalog-cover-screen").getAttribute("data-cut-index")).toBe("1");
    expect(replay().getAttribute("data-state")).toBe("unavailable");
    fireEvent.tap(replay(), {});
    expect(audio.playAudio).not.toHaveBeenCalled();
    expect(onReplay).not.toHaveBeenCalled();
  });

  test("CR4. 스피커는 대사 상자(토글 단추) 밖 형제다 — 단추 안 단추가 아니다", () => {
    mount();
    expect(
      within(screen.getByTestId("catalog-cover-screen-line")).queryByTestId(
        "catalog-cover-screen-replay",
      ),
    ).toBeNull();
  });
});
