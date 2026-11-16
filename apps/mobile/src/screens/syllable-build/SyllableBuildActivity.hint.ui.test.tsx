import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ItemAnswerReport } from "../../lib/item-answer";
import { SyllableBuildActivity } from "./SyllableBuildActivity";
import type { SyllableBuildQuestion } from "./syllable-build.contract";

// `ui` 계층: 음절 조립의 타일 로마자 · 힌트(ADR-0153, 팀 요청 ①). 재생 접점(`lib/audio`)만 대역입니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../../lib/audio", () => audio);

const card: SyllableBuildQuestion = {
  meaning: "card",
  tiles: ["현", "드", "카", "찮"],
  slotCount: 2,
  answers: ["카드"],
  tileReading: { values: ["hyeon", "deu", "ka", "chan"], shown: "always" },
  hint: { ghost: ["카", "드"], listenSource: "https://cdn/card.m4a" },
};

const id = (testId: string) => screen.getByTestId(testId);
const tapSheetAction = (action: string) =>
  fireEvent.tap(
    within(id(`ui-lynx-bottom-sheet-action-${action}`)).getByTestId("ui-lynx-button"),
    {},
  );
const mount = (
  questions: SyllableBuildQuestion[],
  onItemAnswered = vi.fn<(r: ItemAnswerReport) => void>(),
) => {
  render(
    <SyllableBuildActivity
      questions={questions}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
    />,
  );
  return onItemAnswered;
};

beforeEach(() => {
  audio.playAudio.mockReset();
  audio.playAudio.mockReturnValue("started");
});
afterEach(cleanup);

describe("타일 로마자 (UH1)", () => {
  test("UH1. 창고 타일마다 글자 위에 로마자가 서고, 놓인 타일에는 없다", () => {
    mount([card]);
    expect(id("syllable-build-tile-2-roman")).toHaveTextContent("ka");
    expect(id("syllable-build-tile-0-roman")).toHaveTextContent("hyeon");
    fireEvent.tap(id("syllable-build-tile-2"), {});
    expect(screen.queryByTestId("syllable-build-tile-2-roman")).toBeNull();
  });
});

describe("힌트 (UH2~UH5)", () => {
  test("UH2. Hint를 누르면 시트에 정답 듣기 · 정답 보기가 서고, 정답 듣기는 정답 소리를 한 번 낸다", () => {
    const report = mount([card]);
    fireEvent.tap(id("assembled-hint-button"), {});
    expect(id("ui-lynx-bottom-sheet-action-listen")).toBeTruthy();
    tapSheetAction("listen");
    expect(audio.playAudio).toHaveBeenCalledWith("https://cdn/card.m4a", expect.any(Function));
    expect(screen.queryByTestId("assembled-hint-sheet")).toBeNull();
    fireEvent.tap(id("syllable-build-tile-2"), {});
    fireEvent.tap(id("syllable-build-tile-1"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "correct", hintUsed: "listen" }),
    );
  });

  test("UH3. 정답 보기는 빈 칸마다 정답 조각을 흐리게 깔고, 채점은 그대로이며 hintUsed는 show다", () => {
    const report = mount([card]);
    fireEvent.tap(id("assembled-hint-button"), {});
    tapSheetAction("show");
    expect(id("syllable-build-slot-0-ghost")).toHaveTextContent("카");
    expect(id("syllable-build-slot-1-ghost")).toHaveTextContent("드");
    fireEvent.tap(id("syllable-build-tile-2"), {});
    expect(screen.queryByTestId("syllable-build-slot-0-ghost")).toBeNull();
    fireEvent.tap(id("syllable-build-tile-0"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "incorrect", hintUsed: "show" }),
    );
  });

  test("UH4. 정답 소리가 없으면 정답 듣기 줄이 없다", () => {
    mount([{ ...card, hint: { ghost: ["카", "드"] } }]);
    fireEvent.tap(id("assembled-hint-button"), {});
    expect(screen.queryByTestId("ui-lynx-bottom-sheet-action-listen")).toBeNull();
    expect(id("ui-lynx-bottom-sheet-action-show")).toBeTruthy();
  });

  test("UH5. 채점 뒤에는 힌트 버튼이 없고, 힌트를 안 쓰면 hintUsed 키가 없다", () => {
    const report = mount([card]);
    fireEvent.tap(id("syllable-build-tile-2"), {});
    fireEvent.tap(id("syllable-build-tile-1"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    expect(screen.queryByTestId("assembled-hint-button")).toBeNull();
    expect(report.mock.calls[0]?.[0]).not.toHaveProperty("hintUsed");
  });
});

describe("문항이 바뀌면 (UH6)", () => {
  test("UH6. 앞 문항에서 쓴 힌트는 다음 문항으로 넘어가지 않는다", () => {
    const report = mount([card, { ...card, answers: ["드카"], hint: { ghost: ["드", "카"] } }]);
    fireEvent.tap(id("assembled-hint-button"), {});
    tapSheetAction("show");
    fireEvent.tap(id("syllable-build-tile-2"), {});
    fireEvent.tap(id("syllable-build-tile-1"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    expect(screen.queryByTestId("syllable-build-slot-0-ghost")).toBeNull();
    fireEvent.tap(id("syllable-build-tile-1"), {});
    fireEvent.tap(id("syllable-build-tile-2"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    expect(report.mock.calls[0]?.[0]).toMatchObject({ hintUsed: "show" });
    expect(report.mock.calls[1]?.[0]).not.toHaveProperty("hintUsed");
  });
});

describe("낭독 · 소리 (UH7 · UH8 · UH9)", () => {
  test("UH7. 정답 보기를 고르면 칸 줄의 낭독 이름에 정답이 실린다", () => {
    mount([card]);
    fireEvent.tap(id("assembled-hint-button"), {});
    tapSheetAction("show");
    expect(id("syllable-build-word").getAttribute("accessibility-label")).toContain(
      "Answer shown: 카드",
    );
  });

  test("UH8. 정답 소리를 낼 수 없으면(unavailable) hintUsed listen을 기록하지 않는다", () => {
    audio.playAudio.mockReturnValue("unavailable");
    const report = mount([card]);
    fireEvent.tap(id("assembled-hint-button"), {});
    tapSheetAction("listen");
    fireEvent.tap(id("syllable-build-tile-2"), {});
    fireEvent.tap(id("syllable-build-tile-1"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    expect(report.mock.calls[0]?.[0]).not.toHaveProperty("hintUsed");
  });

  test("UH9. 힌트로 튼 정답 소리는 다음 문항으로 넘어가면 멈춘다", () => {
    mount([card, { ...card, answers: ["드카"], hint: { ghost: ["드", "카"] } }]);
    fireEvent.tap(id("assembled-hint-button"), {});
    tapSheetAction("listen");
    audio.stopAudio.mockClear();
    fireEvent.tap(id("syllable-build-tile-2"), {});
    fireEvent.tap(id("syllable-build-tile-1"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    fireEvent.tap(id("learning-shell-action"), {});
    expect(audio.stopAudio).toHaveBeenCalled();
  });
});
