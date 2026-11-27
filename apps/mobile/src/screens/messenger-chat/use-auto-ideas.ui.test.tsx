import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import type { ChatRoomAction } from "./chat-room-state";
import type { ChatReplyIdea } from "./chat-source.contract";
import { useAutoIdeas, type AutoIdeasInput } from "./use-auto-ideas";

// `ui` 계층(AI-UI1 · AI-UI2, 2026-11-17 리뷰): 추천 답변을 끈 채로는 새로 온 보기 판을 열지 않고, 끈 채로 판이 열리면 바로 접는다.

afterEach(cleanup);

const idea = (ko: string): ChatReplyIdea => ({ ko, en: ko }) as unknown as ChatReplyIdea;

function Probe(props: AutoIdeasInput): ReactNode {
  useAutoIdeas(props);
  return <view />;
}

test("AI-UI1. 추천 답변이 꺼져 있으면 답과 함께 새로 온 보기에도 판을 열지 않는다", () => {
  const dispatch = vi.fn<(action: ChatRoomAction) => void>();
  const base = { text: "", ideasOpen: false, enabled: false, dispatch } as const;
  const view = render(<Probe {...base} ideas={null} busy={true} />);
  view.rerender(<Probe {...base} ideas={[idea("네")]} busy={false} />);
  expect(dispatch).not.toHaveBeenCalledWith({ type: "open-ideas" });
});

test("AI-UI2. 꺼진 채로 판이 열려 있게 되면 바로 접는다", () => {
  const dispatch = vi.fn<(action: ChatRoomAction) => void>();
  const base = { ideas: null, busy: false, text: "", enabled: false, dispatch } as const;
  const view = render(<Probe {...base} ideasOpen={false} />);
  dispatch.mockClear();
  view.rerender(<Probe {...base} ideasOpen={true} />);
  expect(dispatch).toHaveBeenCalledWith({ type: "close-keyboard" });
});

// `ui` 계층(GA-UI4 ~ UI6, ADR-0137 · 0190 개정 2026-11-28): 방 안내가 서 있는 동안 새로 온 보기는 미뤘다가 안내가 끝나면 연다.

test("GA-UI4 안내 중 새로 온 보기는 열지 않고, 안내가 끝나면 그때 연다", () => {
  const dispatch = vi.fn<(action: ChatRoomAction) => void>();
  const base = { text: "", ideasOpen: false, dispatch } as const;
  const ideas = [idea("네")];
  const view = render(<Probe {...base} ideas={null} busy={true} guiding={true} />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={true} />);
  expect(dispatch).not.toHaveBeenCalledWith({ type: "open-ideas" });
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={false} />);
  expect(dispatch).toHaveBeenCalledWith({ type: "open-ideas" });
});

test("GA-UI5 안내가 끝날 때 쓰던 글이 있으면 열지 않는다", () => {
  const dispatch = vi.fn<(action: ChatRoomAction) => void>();
  const base = { ideasOpen: false, dispatch } as const;
  const ideas = [idea("네")];
  const view = render(<Probe {...base} ideas={null} busy={true} guiding={true} text="" />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={true} text="" />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={false} text="안" />);
  expect(dispatch).not.toHaveBeenCalledWith({ type: "open-ideas" });
});

test("GA-UI6 안내가 끝나 한 번 연 뒤에는 미룬 보기를 다시 열지 않는다", () => {
  const dispatch = vi.fn<(action: ChatRoomAction) => void>();
  const base = { text: "", ideasOpen: false, dispatch } as const;
  const ideas = [idea("네")];
  const view = render(<Probe {...base} ideas={null} busy={true} guiding={true} />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={true} />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={false} />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={true} />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={false} />);
  expect(dispatch.mock.calls.filter(([action]) => action.type === "open-ideas")).toHaveLength(1);
});

test("GA-UI7 안내 중(전구 단계) 사용자가 판을 직접 열었다 접었으면 안내가 끝나도 다시 열지 않는다", () => {
  const dispatch = vi.fn<(action: ChatRoomAction) => void>();
  const base = { text: "", dispatch } as const;
  const ideas = [idea("네")];
  const view = render(
    <Probe {...base} ideas={null} busy={true} guiding={true} ideasOpen={false} />,
  );
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={true} ideasOpen={false} />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={true} ideasOpen={true} />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={true} ideasOpen={false} />);
  view.rerender(<Probe {...base} ideas={ideas} busy={false} guiding={false} ideasOpen={false} />);
  expect(dispatch).not.toHaveBeenCalledWith({ type: "open-ideas" });
});
