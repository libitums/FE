import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { RankingBoard, RankingBoardKind, RankingClient } from "../../lib/ranking.contract";
import { rankingTestIds as ids } from "./ranking.contract";
import { RankingScreen } from "./RankingScreen";
import { useRanking } from "./use-ranking";

// `ui` 계층(RK-H1 ~ H5): 순위 훅 ↔ 화면의 「지난번에 본 내 점수」 왕복(ADR-0170 D12, 리뷰 #550). 기기 저장만 대역으로 바꿉니다.
// 규칙: 저장은 **지금 점수를 다 보여 준 뒤에만** 고친다 — 세는 도중에 떠나면 다음에 다시 센다. 읽기는 저장을 건드리지 않는다.

const store = vi.hoisted(() => ({ scores: {} as Record<string, number>, saves: [] as string[] }));
vi.mock("../../lib/ranking-seen-score", () => ({
  readSeenScore: (kind: string) => store.scores[kind] ?? null,
  saveSeenScore: (kind: string, _endsAt: string, score: number) => {
    store.scores[kind] = score;
    store.saves.push(`${kind}:${score}`);
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  store.scores = {};
  store.saves = [];
});

let score = 7;
const boardOf = (kind: RankingBoardKind): RankingBoard => ({
  kind,
  groupSize: 15,
  endsAt: "2026-11-23T00:00:00Z",
  reward: null,
  rows: [{ rank: 1, name: "Mai", countryCode: "VN", episode: 2, score, me: true }],
  me: { rank: 1, score },
  next: null,
});
const client: RankingClient = {
  load: async (kind) => ({ status: "ready", board: boardOf(kind) }),
  preferences: async () => ({ hidden: false }),
  setHidden: async (hidden) => ({ hidden }),
};

function Harness() {
  const controls = useRanking({
    client,
    signedIn: true,
    initialBoard: "lessons",
    source: "tab",
    eventSink: null,
  });
  return (
    <RankingScreen
      view={controls.view}
      board={controls.board}
      nowMs={Date.parse("2026-11-20T00:00:00Z")}
      seenScore={controls.seenScore}
      onScoreCounted={controls.scoreCounted}
      onSelectBoard={controls.select}
      onRetry={controls.retry}
      onSignIn={() => undefined}
      onShowMe={controls.showMe}
    />
  );
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}
async function run(ms: number): Promise<void> {
  for (let passed = 0; passed < ms; passed += 100) {
    act(() => {
      vi.advanceTimersByTime(100);
    });
  }
  await settle();
}
const shown = () => screen.getByTestId(ids.meScore).textContent;
const tapBoard = async (kind: RankingBoardKind) => {
  fireEvent.tap(screen.getByTestId(ids.board(kind)), {});
  await settle();
};

beforeEach(() => {
  score = 7;
});

test("RK-H1. 처음 보는 주면 세지 않고 지금 점수를 본 것으로 적는다", async () => {
  render(<Harness />);
  await settle();
  expect(shown()).toBe("7");
  expect(store.saves).toEqual(["lessons:7"]);
});

test("RK-H2. 올랐으면 저장된 점수에서 세고, 다 센 뒤에야 저장을 고친다 — 보드를 오가도 다시 세지 않는다", async () => {
  store.scores = { lessons: 4, "chat-words": 7 };
  render(<Harness />);
  await settle();
  expect(shown()).toBe("4");
  expect(store.saves).toEqual([]);
  await run(2500);
  expect(shown()).toBe("7");
  expect(store.saves).toEqual(["lessons:7"]);

  await tapBoard("chat-words");
  await tapBoard("lessons");
  expect(shown()).toBe("7");
});

test("RK-H3. 세는 도중에 화면을 떠나면 저장을 고치지 않는다 — 다시 들어오면 처음부터 센다(탭 이탈)", async () => {
  store.scores = { lessons: 4 };
  const view = render(<Harness />);
  await settle();
  await run(900);
  view.unmount();
  await run(3000);
  expect(store.scores["lessons"]).toBe(4);

  render(<Harness />);
  await settle();
  expect(shown()).toBe("4");
  await run(2500);
  expect(shown()).toBe("7");
  expect(store.scores["lessons"]).toBe(7);
});

test("RK-H4. 세기 전에 다른 보드에 다녀와도 못 본 오름은 남는다", async () => {
  store.scores = { lessons: 4, "chat-words": 7 };
  render(<Harness />);
  await settle();
  await tapBoard("chat-words");
  await tapBoard("lessons");
  expect(shown()).toBe("4");
  await run(2500);
  expect(shown()).toBe("7");
});

test("RK-H5. 다른 보드도 저장된 점수에서 세고, 다 센 뒤에 그 보드의 저장만 고친다", async () => {
  store.scores = { lessons: 7, "chat-words": 7 };
  render(<Harness />);
  await settle();
  expect(shown()).toBe("7");
  score = 9;
  await tapBoard("chat-words");
  await run(2500);
  expect(store.scores).toEqual({ lessons: 7, "chat-words": 9 });
});
