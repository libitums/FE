import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ItemAnswerReport } from "../../lib/item-answer";
import { useCompactDevice } from "../learning/compact-device.test-support";
import { SentenceOrderActivity } from "./SentenceOrderScreen";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `ui` 계층: 문장 조립 · 듣고 조립의 조각 로마자 · 힌트 · 작은 화면 답 줄(ADR-0153, 팀 요청 ②③).

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../../lib/audio", () => audio);

// u01 S6-04 꼴 — 조각은 섞인 순서, 정답은 [1, 2, 0].
const wordOrder: SentenceOrderQuestion = {
  prompt: "Thank you. Goodbye.",
  chips: ["안녕히", "가세요.", "감사합니다."],
  answerOrder: [2, 0, 1],
  instruction: "Build the sentence.",
  chipReading: { values: ["annyeonghi", "gaseyo.", "gamsahamnida."], shown: "always" },
  hint: { ghost: ["감사합니다. 안녕히 가세요."], listenSource: "https://cdn/s6-04.m4a" },
};

const listenBuild: SentenceOrderQuestion = {
  prompt: "Hello! Is this your first time in Korea?",
  chips: ["처음이세요?", "안녕하세요!", "한국은", "처음이에요!"],
  answerOrder: [1, 2, 0],
  chipReading: {
    values: ["cheoeumiseyo?", "annyeonghaseyo!", "hangugeun", "cheoeumieyo!"],
    shown: "review",
  },
  audio: {
    kind: "listen",
    source: "https://cdn/a.m4a",
    ref: { itemId: "S2-02", itemType: "LISTEN_BUILD" },
  },
};

const id = (testId: string) => screen.getByTestId(testId);
const tapSheetAction = (action: string) =>
  fireEvent.tap(
    within(id(`ui-lynx-bottom-sheet-action-${action}`)).getByTestId("ui-lynx-button"),
    {},
  );
const tapCheck = () =>
  fireEvent.tap(within(id("sentence-order-check")).getByTestId("ui-lynx-button"), {});

function mount(
  questions: SentenceOrderQuestion[],
  extra: { inReview?: boolean } = {},
  onItemAnswered = vi.fn<(r: ItemAnswerReport) => void>(),
) {
  render(
    <SentenceOrderActivity
      questions={questions}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
      {...extra}
    />,
  );
  return onItemAnswered;
}

let restore: (() => void) | null = null;
beforeEach(() => {
  audio.playAudio.mockReset();
  audio.playAudio.mockReturnValue("started");
  audio.isAudioAvailable.mockReturnValue(true);
});
afterEach(() => {
  restore?.();
  restore = null;
  cleanup();
});

describe("조각 로마자 (SH1 · SH2)", () => {
  test("SH1. 문장 조립은 창고 조각마다 로마자가 서고, 답 줄에 놓인 조각에는 없다", () => {
    mount([wordOrder]);
    expect(id("sentence-order-chip-2-roman")).toHaveTextContent("gamsahamnida.");
    fireEvent.tap(id("sentence-order-chip-2"), {});
    expect(screen.queryByTestId("sentence-order-chip-2-roman")).toBeNull();
  });

  test("SH2. 듣고 조립은 첫 시도에 로마자가 없고 다시 풀기에서만 선다, 힌트 버튼은 없다", () => {
    mount([listenBuild]);
    expect(screen.queryByTestId("sentence-order-chip-0-roman")).toBeNull();
    expect(screen.queryByTestId("assembled-hint-button")).toBeNull();
    cleanup();
    mount([listenBuild], { inReview: true });
    expect(id("sentence-order-chip-0-roman")).toHaveTextContent("cheoeumiseyo?");
    expect(id("sentence-order-chip-3-roman")).toHaveTextContent("cheoeumieyo!");
  });
});

describe("힌트 (SH3 · SH4)", () => {
  test("SH3. 정답 보기는 답 줄에 정답 문장을 흐리게 깔고 hintUsed는 show다(채점 그대로)", () => {
    const report = mount([wordOrder]);
    fireEvent.tap(id("assembled-hint-button"), {});
    tapSheetAction("show");
    expect(id("sentence-order-lines-ghost")).toHaveTextContent("감사합니다. 안녕히 가세요.");
    fireEvent.tap(id("sentence-order-chip-2"), {});
    fireEvent.tap(id("sentence-order-chip-0"), {});
    fireEvent.tap(id("sentence-order-chip-1"), {});
    tapCheck();
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "correct", hintUsed: "show" }),
    );
  });

  test("SH4. 정답 듣기 뒤 정답 보기를 쓰면 show가 남고, 정답 듣기는 소리를 한 번 낸다", () => {
    const report = mount([wordOrder]);
    fireEvent.tap(id("assembled-hint-button"), {});
    tapSheetAction("listen");
    expect(audio.playAudio).toHaveBeenCalledWith("https://cdn/s6-04.m4a", expect.any(Function));
    fireEvent.tap(id("assembled-hint-button"), {});
    tapSheetAction("show");
    fireEvent.tap(id("sentence-order-chip-0"), {});
    tapCheck();
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ hintUsed: "show" }));
  });
});

describe("작은 화면 (SH5)", () => {
  test("SH5. compact 밀도에서 로마자가 서면 답 줄이 하나로 준다 — 로마자가 없으면 둘 그대로", () => {
    restore = useCompactDevice();
    mount([wordOrder]);
    expect(id("sentence-order-lines")).toHaveAttribute("data-compact", "true");
    expect(screen.queryByTestId("sentence-order-line-1")).toBeNull();
    cleanup();
    mount([listenBuild]);
    expect(id("sentence-order-lines")).toHaveAttribute("data-compact", "false");
    expect(id("sentence-order-line-1")).toBeTruthy();
  });
});
