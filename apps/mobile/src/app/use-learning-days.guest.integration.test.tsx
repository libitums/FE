import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";
import { saveGuestSession } from "../lib/guest-session";
import { localDayFrom } from "../lib/progress-api";
import { useJourneyProgress } from "./use-journey-progress";
import { guestDaysKey } from "./test-helpers/guest-entry";

// `integration` 계층: 비회원 진행 훅 + 기기 날짜 저장소(ADR-0111) — 표지는 연속 학습의 하루가 아니고,
// 레슨을 끝내야 기기에 오늘이 적히며 연속이 1이 된다(ADR-0035 U2 개정 2026-11-09). RPC는 0건이다.

const store = new Map<string, string>();
const requests: string[] = [];
let progress: ReturnType<typeof useJourneyProgress>;
function Harness() {
  progress = useJourneyProgress({}, []);
  return null;
}
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}
async function complete(keys: readonly string[]) {
  act(() => progress.setCatalogProgress({ "u00-tutorial": keys }));
  await settle();
}
const savedDays = () => JSON.parse(store.get(guestDaysKey) ?? "null") as string[] | null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12));
  store.clear();
  requests.length = 0;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, value: string) => void store.set(k, value),
      remove: (k: string) => void store.delete(k),
    },
  });
  vi.stubGlobal("fetch", async (url: string) => {
    requests.push(url);
    return { status: 500, text: async () => "" };
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("GLD1. 비회원이 표지만 끝내면 기기에 날짜가 없고 연속 0, 레슨 S1을 끝내면 오늘이 적히고 연속 1이다", async () => {
  saveGuestSession();
  render(<Harness />);
  act(() => progress.wiring.startGuestProgress());
  await settle();

  await complete(["intro"]);
  expect(savedDays()).toBeNull();
  expect(progress.streakDays).toBe(0);

  await complete(["intro", "S1"]);
  expect(savedDays()).toEqual([localDayFrom(new Date())]);
  expect(progress.streakDays).toBe(1);
  expect(requests).toEqual([]);
});
