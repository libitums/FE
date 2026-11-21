import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { lettersStorageKey } from "../lib/letters-recommend";
import { emptyWordbook } from "../lib/wordbook";
import { createLearningTrail } from "./learning-trail";
import type { MoreWiring } from "./more-wiring";
import { useLettersRecommend } from "./use-letters-recommend";

// `ui` 계층: Letters 추천 훅(ADR-0169 D5) — 신호 · 지연 · 띄우지 않는 규칙을 띄우기 직전에도 다시 본다(리뷰 M1).

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  return store;
}

function Host({
  trail,
  more,
}: {
  trail: ReturnType<typeof createLearningTrail>;
  more: MoreWiring;
}) {
  return <view>{useLettersRecommend({ trail, more, ready: true }).layer}</view>;
}

function setup() {
  const store = installStorage();
  const trail = createLearningTrail({
    today: () => "2026-11-20",
    updateWordbook: () => {},
    readWordbook: () => emptyWordbook,
  });
  trail.lessonEnded("exited");
  const emit = vi.fn();
  const more = { emit, onOpenLetters: vi.fn() } as unknown as MoreWiring;
  return { store, trail, more, emit };
}

test("UR1. 끝난 레슨 신호가 있으면 지연 뒤 대화상자 · 노출 기록 · 이벤트", () => {
  vi.useFakeTimers();
  const { store, trail, more, emit } = setup();
  render(<Host trail={trail} more={more} />);
  expect(screen.queryByTestId("letters-recommend")).toBeNull();
  act(() => {
    vi.advanceTimersByTime(1200);
  });
  expect(screen.getByTestId("letters-recommend")).toBeInTheDocument();
  expect(JSON.parse(store.get(lettersStorageKey) ?? "{}")).toMatchObject({ shows: 1 });
  expect(emit).toHaveBeenCalledWith({ name: "letters_recommend_shown", reason: "failed" });
});

test("UR2. 기다리는 사이 Letters를 열었으면 띄우지 않는다", () => {
  vi.useFakeTimers();
  const { store, trail, more, emit } = setup();
  render(<Host trail={trail} more={more} />);
  store.set(lettersStorageKey, JSON.stringify({ lettersOpened: true, shows: 0, keepGoing: 0 }));
  act(() => {
    vi.advanceTimersByTime(1200);
  });
  expect(screen.queryByTestId("letters-recommend")).toBeNull();
  expect(emit).not.toHaveBeenCalled();
});
