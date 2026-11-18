import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@lynx-js/react/testing-library";

import { recognized, stubSpeechHost } from "../../lib/speech-host.test-support";
import { MissionTalkScreen } from "./MissionTalkScreen";
import {
  A1,
  U1,
  cafeCard,
  event,
  id,
  insets,
  maybe,
  sessionAfter,
  startedActions,
  tapButton,
  tapDialogAction,
  tapRound,
  typeInto,
} from "./mission-ui.test-support";
import type { MissionInputMode, MissionSessionState } from "./roleplay-mission.contract";

// `ui` 계층(MT-UI1 ~): 미션 대화 화면을 실제 컴포넌트로 — 국면별 렌더(진입 대사 · 입력 중 · 끝 · 채점 중), 목표 체크리스트의
// 접근성 이름, 보내기 · 마이크(받아 적은 글 그대로) · 힌트 카드(그대로 쓰기) · 그만두기 확인. 상태는 순수 리듀서로 만든다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(state: MissionSessionState) {
  const onSend = vi.fn<(text: string, mode: MissionInputMode) => void>();
  const onHint = vi.fn<() => void>();
  const onDismissHint = vi.fn<() => void>();
  const onQuit = vi.fn<() => void>();
  render(
    <MissionTalkScreen
      insets={insets}
      card={cafeCard}
      state={state}
      onSend={onSend}
      onHint={onHint}
      onDismissHint={onDismissHint}
      onQuit={onQuit}
    />,
  );
  return { onSend, onHint, onDismissHint, onQuit };
}

const talking = sessionAfter(startedActions);

test("MT-UI1 대화 시작 — 진입 대사 말풍선 · 목표 넷(필수 둘) · 남은 턴 · 남은 힌트", () => {
  mount(talking);
  expect(id("roleplay-mission-talk")).toHaveAttribute("data-phase", "talking");
  expect(id("roleplay-mission-talk-title")).toHaveTextContent("Order a coffee");
  expect(id("roleplay-mission-turns-left")).toHaveTextContent("10 turns left");
  expect(id("roleplay-mission-log")).toHaveTextContent("반가워요. 뭐 드릴까요?");
  expect(id("roleplay-mission-goal-order")).toHaveAttribute(
    "accessibility-label",
    "Order a drink, required, not done",
  );
  expect(id("roleplay-mission-goal-price")).toHaveAttribute(
    "accessibility-label",
    "Ask how much it is, optional, not done",
  );
  expect(id("roleplay-mission-hint-button")).toHaveTextContent("Hint · 3 left");
  expect(id("roleplay-mission-talk-quit")).toBeInTheDocument();
});

test("MT-UI2 글을 치고 보내면 글 그대로 text로 보낸다 — 빈 글은 보내기가 잠긴다", () => {
  const { onSend } = mount(talking);
  expect(id("roleplay-mission-send")).toHaveAttribute("data-enabled", "false");
  typeInto("roleplay-mission-input", "아메리카노 한 잔 주세요");
  expect(id("roleplay-mission-send")).toHaveAttribute("data-enabled", "true");
  expect(id("roleplay-mission-send")).toHaveAttribute("accessibility-label", "Send");
  fireEvent.tap(id("roleplay-mission-send"), {});
  expect(onSend).toHaveBeenCalledWith("아메리카노 한 잔 주세요", "text");
});

test("MT-UI3 답 기다림 — 입력 중 줄이 서고 보내기 · 마이크가 잠긴다", () => {
  mount(sessionAfter([...startedActions, { type: "send", text: "안녕하세요", inputMode: "text" }]));
  expect(id("roleplay-mission-typing")).toHaveAttribute(
    "accessibility-label",
    "카페 직원 is typing",
  );
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-traits", "disabled");
  typeInto("roleplay-mission-input", "또");
  expect(id("roleplay-mission-send")).toHaveAttribute("data-enabled", "false");
});

test("MT-UI4 이룬 목표는 체크되고 낭독이 done, 교정 카드는 내 글 아래 선다", () => {
  const state = sessionAfter([
    ...startedActions,
    { type: "send", text: "가지고 가요", inputMode: "text" },
    event("start", { userMessageId: U1, assistantMessageId: A1 }),
    event("delta", { segment: 0, kind: "speech", text: "네, 포장해 드릴게요." }),
    event("correction", {
      userMessageId: U1,
      status: "ok",
      kind: "better",
      original: "가지고 가요",
      corrected: "포장이요",
      items: [],
      better: null,
      meaning: "To go, please.",
    }),
    event("mission", { goals: [{ id: "stay", done: true }], turnsLeft: 9, ended: null }),
    event("done", { assistantMessageId: A1, creditsSpent: 0, balance: null }),
  ]);
  mount(state);
  expect(id("roleplay-mission-goal-stay")).toHaveAttribute("data-done", "true");
  expect(id("roleplay-mission-goal-stay")).toHaveAttribute(
    "accessibility-label",
    "Say for here or to go, optional, done",
  );
  expect(id("roleplay-mission-turns-left")).toHaveTextContent("9 turns left");
  expect(id("messenger-chat-fix-card")).toHaveAttribute("data-kind", "better");
  expect(id("roleplay-mission-log")).toHaveTextContent("네, 포장해 드릴게요.");
});

test("MT-UI5 보내지 못한 글은 Not sent와 다시 보내기 — 누르면 같은 글을 다시 보낸다", () => {
  const { onSend } = mount(
    sessionAfter([
      ...startedActions,
      { type: "send", text: "안녕", inputMode: "voice" },
      { type: "turn-closed" },
    ]),
  );
  fireEvent.tap(id("messenger-chat-unsent-retry"), { eventType: "catchEvent" });
  expect(onSend).toHaveBeenCalledWith("안녕", "voice");
});

test("MT-UI6 마이크 — 받아 적은 글을 그대로 voice로 보낸다, 듣는 중 안내가 선다", () => {
  const host = stubSpeechHost({ result: () => null });
  const { onSend } = mount(talking);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  expect(id("roleplay-mission-mic")).toHaveAttribute("data-listening", "true");
  expect(id("roleplay-mission-composer-note")).toHaveTextContent("Listening…");
  host.pending[0]?.(recognized("카드로 할게요"));
  expect(onSend).toHaveBeenCalledWith("카드로 할게요", "voice");
});

test("MT-UI7 힌트 단추 → 부름, 펼친 카드는 한국어 · 로마자 · 뜻 · 감점 안내, Use this는 입력 칸을 채운다", () => {
  const { onHint, onDismissHint } = mount(talking);
  fireEvent.tap(id("roleplay-mission-hint-button"), {});
  expect(onHint).toHaveBeenCalledTimes(1);
  cleanup();
  const withHint = sessionAfter([
    ...startedActions,
    { type: "hint-requested" },
    {
      type: "hint-received",
      value: {
        goalId: "pay",
        ko: "카드로 할게요.",
        roman: "kadeuro halgeyo.",
        meaning: "I'll pay by card.",
        hintsLeft: 2,
      },
    },
  ]);
  const second = mount(withHint);
  expect(id("roleplay-mission-hint-card")).toHaveTextContent("카드로 할게요.");
  expect(id("roleplay-mission-hint-card")).toHaveTextContent("kadeuro halgeyo.");
  expect(id("roleplay-mission-hint-card")).toHaveTextContent("Each hint takes 5 points.");
  expect(id("roleplay-mission-hint-button")).toHaveTextContent("Hint · 2 left");
  tapButton("roleplay-mission-hint-use");
  expect(second.onDismissHint).toHaveBeenCalledTimes(1);
  expect(id("roleplay-mission-send")).toHaveAttribute("data-enabled", "true");
  fireEvent.tap(id("roleplay-mission-send"), {});
  expect(second.onSend).toHaveBeenCalledWith("카드로 할게요.", "text");
  expect(onDismissHint).not.toHaveBeenCalled();
});

test("MT-UI8 힌트를 다 쓰면 힌트 단추가 잠긴다", () => {
  mount(
    sessionAfter([...startedActions, { type: "hint-requested" }, { type: "hint-unavailable" }]),
  );
  expect(id("roleplay-mission-hint-button")).toHaveAttribute("data-enabled", "false");
  expect(id("roleplay-mission-hint-button")).toHaveAttribute("accessibility-traits", "disabled");
});

test("MT-UI9 끝 · 채점 중 — 끝 줄과 채점 중 줄, 입력이 잠긴다", () => {
  const ended = sessionAfter([
    ...startedActions,
    { type: "send", text: "카드로 할게요", inputMode: "text" },
    event("start", { userMessageId: U1, assistantMessageId: A1 }),
    event("delta", { segment: 0, kind: "speech", text: "감사합니다." }),
    event("mission", {
      goals: [
        { id: "order", done: true },
        { id: "pay", done: true },
      ],
      turnsLeft: 8,
      ended: "goals",
    }),
    event("done", { assistantMessageId: A1, creditsSpent: 0, balance: null }),
  ]);
  mount(ended);
  expect(id("roleplay-mission-status")).toHaveTextContent("Mission complete!");
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-traits", "disabled");
  cleanup();
  mount({ ...ended, phase: "grading" });
  expect(id("roleplay-mission-status")).toHaveTextContent("Scoring your conversation…");
});

test("MT-UI10 그만두기 — 확인 다이얼로그, Keep going이면 머물고 Quit이면 onQuit", () => {
  const { onQuit } = mount(talking);
  tapRound("roleplay-mission-talk-quit");
  expect(id("roleplay-mission-quit-dialog")).toHaveTextContent("Quit this mission?");
  tapDialogAction("cancel");
  expect(maybe("roleplay-mission-quit-dialog")).not.toBeInTheDocument();
  expect(onQuit).not.toHaveBeenCalled();
  tapRound("roleplay-mission-talk-quit");
  tapDialogAction("quit");
  expect(onQuit).toHaveBeenCalledTimes(1);
});
