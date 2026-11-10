import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { ChatLog } from "./ChatLog";

// `ui` 계층(접근성 M6, a11y-findings): 움직임 줄이기에서 대화 로그는 부드러운 스크롤이 아니라 점프로 끝에 닿는다
// (design 9절 「목록 맨 아래 따라가기 — 애니메이션 없는 점프」).

type InvokeArgs = { readonly method: string; readonly params?: { readonly smooth?: boolean } };

let invoked: InvokeArgs[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  invoked = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: () => ({
          invoke: (args: InvokeArgs) => {
            invoked.push(args);
            return { exec: () => undefined };
          },
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function followTwice(motion: "standard" | "reduced"): void {
  const tree = (key: number) => (
    <MotionProvider motion={motion}>
      <ChatLog testId="log" followKey={key}>
        <view />
      </ChatLog>
    </MotionProvider>
  );
  const { rerender } = render(tree(1));
  act(() => {
    vi.advanceTimersByTime(16);
  });
  rerender(tree(2));
  act(() => {
    vi.advanceTimersByTime(16);
  });
}

test("M6. 움직임 줄이기에서는 끝 맞춤 scrollTo가 smooth: false다", () => {
  followTwice("reduced");

  const scrolls = invoked.filter((call) => call.method === "scrollTo");
  expect(scrolls.length).toBeGreaterThan(0);
  for (const call of scrolls) expect(call.params?.smooth).toBe(false);
});

test("M6. 기본 움직임에서는 끝 맞춤 scrollTo가 smooth: true다", () => {
  followTwice("standard");

  const scrolls = invoked.filter((call) => call.method === "scrollTo");
  expect(scrolls.length).toBeGreaterThan(0);
  for (const call of scrolls) expect(call.params?.smooth).toBe(true);
});
