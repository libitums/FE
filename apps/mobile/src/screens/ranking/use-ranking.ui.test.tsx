import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { RankingBoard, RankingBoardKind, RankingClient } from "../../lib/ranking.contract";
import { useRanking } from "./use-ranking";

// `ui` 계층(RK-H1 ~ H3): 순위 훅의 「지난번에 본 내 점수」 결선(ADR-0170 D12, 리뷰 #550) — 읽을 때 꺼내고, 숫자 오름이 돈 뒤에야 지운다.
// 기기 저장(`takeSeenScore`)만 대역으로 바꿉니다.

const taken = vi.hoisted(() => ({ calls: [] as string[], next: 4 as number | null }));
vi.mock("../../lib/ranking-seen-score", () => ({
  takeSeenScore: (kind: string) => {
    taken.calls.push(kind);
    return taken.next;
  },
}));

afterEach(() => {
  cleanup();
  taken.calls = [];
  taken.next = 4;
});

const boardOf = (kind: RankingBoardKind): RankingBoard => ({
  kind,
  groupSize: 15,
  endsAt: "2026-11-23T00:00:00Z",
  reward: null,
  rows: [{ rank: 1, name: "Mai", countryCode: "VN", episode: 2, score: 7, me: true }],
  me: { rank: 1, score: 7 },
  next: null,
});

function Harness({ client }: { readonly client: RankingClient }) {
  const controls = useRanking({
    client,
    signedIn: true,
    initialBoard: "lessons",
    source: "tab",
    eventSink: null,
  });
  return (
    <view>
      <text data-testid="seen">{String(controls.seenScore)}</text>
      <text data-testid="board">{controls.board}</text>
      <view data-testid="to-words" bindtap={() => controls.select("chat-words")} />
      <view data-testid="to-lessons" bindtap={() => controls.select("lessons")} />
      <view data-testid="counted" bindtap={controls.scoreCounted} />
      <view data-testid="retry" bindtap={controls.retry} />
    </view>
  );
}

const client: RankingClient = {
  load: async (kind) => ({ status: "ready", board: boardOf(kind) }),
  preferences: async () => ({ hidden: false }),
  setHidden: async (hidden) => ({ hidden }),
};

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}
const seen = () => screen.getByTestId("seen").textContent;
const tap = (testId: string) => fireEvent.tap(screen.getByTestId(testId), {});

test("RK-H1. 보드를 읽으면 본 점수를 꺼내고, 세기 전에 다른 보드에 다녀와도 남아 있다", async () => {
  render(<Harness client={client} />);
  await settle();
  expect(seen()).toBe("4");

  taken.next = 2;
  tap("to-words");
  await settle();
  expect(seen()).toBe("2");
  tap("to-lessons");
  await settle();
  expect(seen()).toBe("4");
  expect(taken.calls).toEqual(["lessons", "chat-words"]);
});

test("RK-H2. 숫자 오름이 돌면 그 보드의 본 점수만 지운다 — 돌아와도 다시 세지 않는다", async () => {
  render(<Harness client={client} />);
  await settle();
  taken.next = 2;
  tap("to-words");
  await settle();
  tap("to-lessons");
  await settle();

  tap("counted");
  await settle();
  expect(seen()).toBe("null");
  tap("to-words");
  await settle();
  expect(seen()).toBe("2");
  tap("to-lessons");
  await settle();
  expect(seen()).toBe("null");
});

test("RK-H3. 다시 시도 — 이미 센 보드는 새로 꺼낸 값(지금 점수와 같아 세지 않음), 아직 못 센 보드는 그대로", async () => {
  render(<Harness client={client} />);
  await settle();
  taken.next = 2;
  tap("to-words");
  await settle();
  tap("to-lessons");
  await settle();
  tap("counted");
  await settle();

  taken.next = 7;
  tap("retry");
  await settle();
  expect(seen()).toBe("7");
  tap("to-words");
  await settle();
  expect(seen()).toBe("2");
});
