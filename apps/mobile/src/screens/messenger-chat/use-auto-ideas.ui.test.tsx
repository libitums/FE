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
