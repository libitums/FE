import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { RankingBoard, RankingBoardKind } from "../../lib/ranking.contract";
import { rankingTestIds as ids } from "./ranking.contract";
import type { RankingView } from "./ranking-rules";
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

test("RK-UI3. 줄: 순위 · 이름 · 에피소드 · 점수 · 단위, 낭독은 줄 하나", () => {
  mount({ kind: "ready", board });
  const first = screen.getByTestId(ids.row(1));
  expect(first).toHaveTextContent("Linh");
  expect(first).toHaveTextContent("Episode 6");
  expect(first).toHaveTextContent("14");
  expect(first).toHaveTextContent("lessons");
  expect(first).toHaveAttribute("accessibility-label", "#1, Linh, Episode 6, 14 lessons");
  // 에피소드를 모르면 그 칸 없이.
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

test("RK-UI5. 구역 줄: 보상이 꺼지면 「Top 3 this week」, 켜지면 액수, 4위 앞 「Keep climbing」", () => {
  mount({ kind: "ready", board });
  expect(text(ids.zoneTop)).toBe("Top 3 this week");
  expect(text(ids.zoneClimb)).toBe("Keep climbing");
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
