import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import type { RankingBoard, RankingBoardKind } from "../../lib/ranking.contract";
import { rankingTestIds as ids } from "./ranking.contract";
import { avatarToneOf, type RankingView } from "./ranking-rules";
import { RankingScreen } from "./RankingScreen";

// `ui` 계층(ADR-0170 RK-UI1 ~ UI9): 순위 화면의 렌더와 상호작용.

afterEach(cleanup);

const NOW = Date.parse("2026-11-20T00:00:00Z");
const board: RankingBoard = {
  kind: "lessons",
  groupSize: 24,
  endsAt: "2026-11-23T00:00:00Z",
  reward: null,
  rows: [
    { rank: 1, name: "Linh", countryCode: "VN", episode: 6, score: 14, me: false },
    { rank: 2, name: "Andrés", countryCode: "MX", episode: 5, score: 12, me: false },
    { rank: 3, name: "Putri", countryCode: "ID", episode: 4, score: 9, me: false },
    { rank: 4, name: "Yuki", countryCode: null, episode: null, score: 8, me: false },
    { rank: 5, name: "Mai", countryCode: "VN", episode: 2, score: 7, me: true },
  ],
  me: { rank: 5, score: 7 },
  next: { name: "Yuki", more: 2 },
};

type Handlers = {
  readonly onSelectBoard: (board: RankingBoardKind) => void;
  readonly onRetry: () => void;
  readonly onSignIn: () => void;
  readonly onShowMe: () => void;
};

function mount(view: RankingView, kind: RankingBoardKind = "lessons"): Handlers {
  const handlers: Handlers = {
    onSelectBoard: vi.fn<(board: RankingBoardKind) => void>(),
    onRetry: vi.fn<() => void>(),
    onSignIn: vi.fn<() => void>(),
    onShowMe: vi.fn<() => void>(),
  };
  render(<RankingScreen view={view} board={kind} nowMs={NOW} {...handlers} />);
  return handlers;
}

const text = (testId: string) => screen.getByTestId(testId).textContent ?? "";
const tapButton = (testId: string) => {
  const el = screen.getByTestId(testId);
  fireEvent.tap(el.querySelector('[data-testid="ui-lynx-button"]') ?? el, {});
};

test("RK-UI1. 머리: 제목 · 그룹 인원 · 남은 날, 제목은 머리 낭독", () => {
  mount({ kind: "ready", board });
  expect(text(ids.title)).toBe("Weekly ranking");
  expect(screen.getByTestId(ids.title)).toHaveAttribute("accessibility-traits", "header");
  expect(text(ids.group)).toBe("Your group · 24 learners");
  expect(text(ids.ends)).toBe("Ends in 3 days");
});

test("RK-UI2. 보드 전환: Lessons가 선택(낭독 selected), Chat words를 누르면 onSelectBoard", () => {
  const handlers = mount({ kind: "ready", board });
  const lessons = screen.getByTestId(ids.board("lessons"));
  const chat = screen.getByTestId(ids.board("chat-words"));
  expect(lessons).toHaveAttribute("data-selected", "true");
  expect(lessons).toHaveAttribute("accessibility-label", "Lessons, selected");
  expect(chat).toHaveAttribute("data-selected", "false");
  expect(chat).toHaveAttribute("accessibility-label", "Chat words");
  fireEvent.tap(chat, {});
  expect(handlers.onSelectBoard).toHaveBeenCalledWith("chat-words");
});

test("RK-UI3. 줄: 순위 · 이름 · 점수 · 단위, 낭독은 줄 하나 — 에피소드 보조 줄은 없다(ADR-0170 D11)", () => {
  mount({ kind: "ready", board });
  const first = screen.getByTestId(ids.row(1));
  expect(first).toHaveTextContent("Linh");
  expect(first).not.toHaveTextContent("Episode");
  expect(first).toHaveTextContent("14");
  expect(first).toHaveTextContent("lessons");
  expect(first).toHaveAttribute("accessibility-label", "#1, Linh, 14 lessons");
  expect(screen.getByTestId(ids.row(4))).toHaveAttribute(
    "accessibility-label",
    "#4, Yuki, 8 lessons",
  );
});

test("RK-UI4. 1 ~ 3위만 메달, 4위부터 숫자", () => {
  mount({ kind: "ready", board });
  expect(screen.getByTestId(ids.medal(1))).toHaveAttribute("data-medal", "gold");
  expect(screen.getByTestId(ids.medal(2))).toHaveAttribute("data-medal", "silver");
  expect(screen.getByTestId(ids.medal(3))).toHaveAttribute("data-medal", "bronze");
  expect(screen.queryByTestId(ids.medal(4))).toBeNull();
});

test("RK-UI5. 구역 줄: 보상이 꺼지면 「Top 3 this week」, 켜지면 액수, 4위 앞 「Keep climbing」 + 3위까지 남은 점수(D13)", () => {
  mount({ kind: "ready", board });
  expect(text(ids.zoneTop)).toBe("Top 3 this week");
  // 3위 9점 · 나 7점 → 넘으려면 3점(같은 점수는 먼저 닿은 사람이 위).
  expect(text(ids.zoneClimb)).toBe("Keep climbing · 3 more to reach the top 3");
  cleanup();
  mount({ kind: "ready", board: { ...board, reward: 30 } });
  expect(text(ids.zoneTop)).toBe("Top 3 get a bonus 30 Yeopjeon");
});

test("RK-UI6. 내 줄은 목록 밖 고정 칸 — 순위 · You · 차이, 1위면 「You're #1!」", () => {
  mount({ kind: "ready", board });
  const me = screen.getByTestId(ids.me);
  expect(within(screen.getByTestId(ids.list)).queryByTestId(ids.me)).toBeNull();
  expect(me).toHaveTextContent("5");
  expect(me).toHaveTextContent("You");
  expect(text(ids.meGap)).toBe("2 more to pass Yuki");
  expect(screen.getByTestId(ids.row(5))).toHaveAttribute("data-me", "true");
  cleanup();
  mount({ kind: "ready", board: { ...board, me: { rank: 1, score: 20 }, next: null } });
  expect(text(ids.meGap)).toBe("You're #1!");
});

test("RK-UI7. 채팅 단어 보드는 단위가 words", () => {
  mount({ kind: "ready", board: { ...board, kind: "chat-words" } }, "chat-words");
  expect(screen.getByTestId(ids.row(1))).toHaveTextContent("words");
  expect(screen.getByTestId(ids.board("chat-words"))).toHaveAttribute("data-selected", "true");
});

test("RK-UI8. 상태 안내 — 비회원 Sign in · 숨김 Show me · 오류/오프라인 Try again · 빈은 단추 없음", () => {
  const guest = mount({ kind: "guest" });
  expect(screen.getByTestId(ids.notice)).toHaveAttribute("data-view", "guest");
  expect(screen.queryByTestId(ids.board("lessons"))).toBeNull();
  tapButton(ids.noticeAction);
  expect(guest.onSignIn).toHaveBeenCalledTimes(1);
  cleanup();
  const hidden = mount({ kind: "hidden" });
  tapButton(ids.noticeAction);
  expect(hidden.onShowMe).toHaveBeenCalledTimes(1);
  cleanup();
  const error = mount({ kind: "error" });
  expect(text(ids.notice)).toContain("Couldn't load the ranking");
  tapButton(ids.noticeAction);
  expect(error.onRetry).toHaveBeenCalledTimes(1);
  cleanup();
  const offline = mount({ kind: "offline" });
  expect(screen.getByTestId(ids.notice)).toHaveAttribute("data-view", "offline");
  tapButton(ids.noticeAction);
  expect(offline.onRetry).toHaveBeenCalledTimes(1);
  cleanup();
  mount({ kind: "not-joined", endsAt: board.endsAt });
  expect(screen.getByTestId(ids.notice)).toHaveAttribute("data-view", "not-joined");
  expect(text(ids.ends)).toBe("Ends in 3 days");
  expect(screen.queryByTestId(ids.noticeAction)).toBeNull();
  expect(screen.queryByTestId(ids.me)).toBeNull();
});

test("RK-UI9. 불러오는 중은 자리 표시와 낭독 한 줄, 줄 · 내 줄 없음", () => {
  mount({ kind: "loading" });
  expect(screen.getByTestId(ids.loading)).toHaveAttribute(
    "accessibility-label",
    "Loading the ranking",
  );
  expect(screen.queryByTestId(ids.row(1))).toBeNull();
  expect(screen.queryByTestId(ids.me)).toBeNull();
});

test("RK-UI10. Android 낭독 — 줄 · 내 줄 · 보드 칸 · 불러오는 중은 flatten false, 내 줄은 목록에서도 You를 읽는다(접근성 C1 ~ C4 · S1)", () => {
  mount({ kind: "ready", board });
  for (const testId of [ids.row(1), ids.me, ids.board("lessons"), ids.board("chat-words")])
    expect(screen.getByTestId(testId)).toHaveAttribute("flatten", "false");
  expect(screen.getByTestId(ids.board("lessons"))).toHaveAttribute(
    "accessibility-enable-tap",
    "true",
  );
  expect(screen.getByTestId(ids.row(5))).toHaveAttribute(
    "accessibility-label",
    "#5, Mai, You, 7 lessons",
  );
  cleanup();
  mount({ kind: "loading" });
  expect(screen.getByTestId(ids.loading)).toHaveAttribute("flatten", "false");
});

test("RK-UI11. 아바타 색은 이름 해시 번호(tone) — 줄마다 그 번호, 고정 내 줄은 목록의 내 줄과 같은 색(ADR-0170 D10)", () => {
  mount({ kind: "ready", board });
  const faceClass = (testId: string) =>
    screen.getByTestId(testId).querySelector(".ranking-face")?.getAttribute("class") ?? "";
  for (const row of board.rows)
    expect(faceClass(ids.row(row.rank))).toBe(
      `ranking-face ranking-face-tone-${avatarToneOf(row.name)}`,
    );
  expect(faceClass(ids.me)).toBe(`ranking-face ranking-face-tone-${avatarToneOf("Mai")}`);
});

const bigGroup: RankingBoard = {
  ...board,
  groupSize: 25,
  rows: Array.from({ length: 25 }, (_, index) => ({
    rank: index + 1,
    name: `P${index + 1}`,
    countryCode: null,
    episode: 3,
    score: 60 - index * 2,
    me: index + 1 === 12,
  })),
  me: { rank: 12, score: 38 },
  next: { name: "P11", more: 3 },
};

test("RK-UI12. 큰 그룹은 상위 3 · 생략 · 내 위 2 · 나 · 내 아래 1만 그린다 — 생략은 낭독에서 숨김, 「Keep climbing」은 생략 뒤(ADR-0170 D11)", () => {
  mount({ kind: "ready", board: bigGroup });
  const list = within(screen.getByTestId(ids.list));
  for (const rank of [1, 2, 3, 10, 11, 12, 13])
    expect(list.getByTestId(ids.row(rank))).toBeTruthy();
  for (const rank of [4, 9, 14, 25]) expect(list.queryByTestId(ids.row(rank))).toBeNull();
  const gap = list.getByTestId(ids.gap);
  expect(gap).toHaveAttribute("accessibility-elements-hidden", "true");
  const order = Array.from(screen.getByTestId(ids.list).querySelectorAll("[data-testid]"))
    .map((el) => el.getAttribute("data-testid"))
    .filter(
      (id) => id === ids.gap || id === ids.zoneClimb || id === ids.row(3) || id === ids.row(10),
    );
  expect(order).toEqual([ids.row(3), ids.gap, ids.zoneClimb, ids.row(10)]);
  // 그룹 인원은 전체 그대로.
  expect(text(ids.group)).toBe("Your group · 25 learners");
});

test("RK-UI13. 바로 위 사람과의 차이는 고정 내 줄에서 강조 글로 — 「3 more to pass P11」", () => {
  mount({ kind: "ready", board: bigGroup });
  const gapText = screen.getByTestId(ids.meGap);
  expect(gapText).toHaveTextContent("3 more to pass P11");
  expect(gapText.getAttribute("class")).toBe("ranking-sub ranking-sub-gap");
});

// ---- 모션(ADR-0170 D12, 시안 「랭킹 모션」 2026-11-22) ----

const classOf = (testId: string) => screen.getByTestId(testId).getAttribute("class") ?? "";
const itemClassOf = (rank: number) =>
  screen.getByTestId(ids.row(rank)).parentElement?.getAttribute("class") ?? "";

function mountMotion(seenScore: number | null, reduced = false) {
  const node = (
    <RankingScreen
      view={{ kind: "ready", board }}
      board="lessons"
      nowMs={NOW}
      seenScore={seenScore}
      onSelectBoard={vi.fn<(board: RankingBoardKind) => void>()}
      onRetry={vi.fn<() => void>()}
      onSignIn={vi.fn<() => void>()}
      onShowMe={vi.fn<() => void>()}
    />
  );
  render(reduced ? <MotionProvider motion="reduced">{node}</MotionProvider> : node);
}

test("RK-UI20. 줄은 차례로 올라오고(칸 번호 0부터 · 7에서 멈춤), 메달은 튀어나오고, 내 줄은 한 번 강조된다", () => {
  mountMotion(null);
  expect(itemClassOf(1)).toContain("ranking-in ranking-in-0");
  expect(itemClassOf(2)).toContain("ranking-in-1");
  expect(itemClassOf(5)).toContain("ranking-in-4");
  expect(classOf(ids.medal(1))).toContain("ranking-medal-in ranking-medal-in-1");
  expect(classOf(ids.medal(3))).toContain("ranking-medal-in-3");
  // 목록의 내 줄과 고정된 내 줄 모두.
  expect(classOf(ids.row(5))).toContain("ranking-row-pulse");
  expect(classOf(ids.me)).toContain("ranking-row-pulse");
  expect(screen.getAllByTestId(ids.ring)).toHaveLength(2);
});

test("RK-UI21. 움직임 줄이기면 모션 클래스 · 강조 고리가 서지 않는다", () => {
  mountMotion(4, true);
  expect(itemClassOf(1)).not.toContain("ranking-in");
  expect(classOf(ids.medal(1))).not.toContain("ranking-medal-in");
  expect(classOf(ids.me)).not.toContain("ranking-row-pulse");
  expect(screen.queryByTestId(ids.ring)).toBeNull();
  expect(text(ids.meScore)).toBe("7");
});

test("RK-UI22. 지난번에 본 점수보다 올랐으면 그 점수에서 지금 점수까지 센다 — 줄이 다 뜬 뒤에", () => {
  vi.useFakeTimers();
  try {
    mountMotion(4);
    expect(text(ids.meScore)).toBe("4");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(text(ids.meScore)).toBe("4");
    // 칸마다 다시 그린 뒤 다음 타이머가 걸리므로 잘게 나눠 돌립니다.
    for (let tick = 0; tick < 20; tick += 1) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(text(ids.meScore)).toBe("7");
  } finally {
    vi.useRealTimers();
  }
});

test("RK-UI23. 본 적이 없거나 오르지 않았으면 세지 않는다", () => {
  mountMotion(null);
  expect(text(ids.meScore)).toBe("7");
  cleanup();
  mountMotion(9);
  expect(text(ids.meScore)).toBe("7");
});

test("RK-UI24. 세는 동안 단위는 보이는 숫자를 따른다 — 「1 lessons」가 아니라 「1 lesson」(리뷰 #549)", () => {
  vi.useFakeTimers();
  try {
    mountMotion(1);
    expect(text(ids.meScore)).toBe("1");
    expect(text(ids.me)).toMatch(/1lesson$/);
    for (let tick = 0; tick < 20; tick += 1) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(text(ids.me)).toMatch(/7lessons$/);
  } finally {
    vi.useRealTimers();
  }
});
