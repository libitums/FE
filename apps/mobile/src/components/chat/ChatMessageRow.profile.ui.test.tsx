import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@lynx-js/react/testing-library";

import { tapEl } from "../../screens/messenger-chat/lynx-tap.test-support";
import { ChatHeader } from "./ChatHeader";
import { ChatIncomingRow } from "./ChatMessageRow";

// `ui` 계층(CP-UI4 · UI5): 상대 줄 아바타 · 머리 제목이 프로필 단추가 된다(ADR-0178 개정 ⟨대화방⟩).
// 아바타는 버튼 역할 · 낭독 이름 · 32 + 사방 6 = 손가락 자리 44. `profile`이 없으면 지금처럼 숨긴 그림.

afterEach(cleanup);

test("CP-UI4. profile이 있으면 아바타 감싸개가 버튼(이름 · 44 자리)이고 누르면 onTap, 안쪽 그림은 낭독에서 숨는다", () => {
  const onTap = vi.fn();
  render(
    <ChatIncomingRow
      avatar={{
        name: "미나",
        imageUrl: null,
        profile: { label: "미나's profile", testId: "row-avatar", onTap },
      }}
      testId="row-in"
    >
      <view />
    </ChatIncomingRow>,
  );
  const button = screen.getByTestId("row-avatar");
  expect(button.getAttribute("accessibility-element")).toBe("true");
  expect(button.getAttribute("accessibility-traits")).toBe("button");
  expect(button.getAttribute("accessibility-label")).toBe("미나's profile");
  expect(button.getAttribute("flatten")).toBe("false");
  expect(button.getAttribute("hit-slop")).toBe("6px");
  expect(
    within(button).getByTestId("ui-lynx-avatar").getAttribute("accessibility-elements-hidden"),
  ).toBe("true");
  tapEl(button);
  expect(onTap).toHaveBeenCalledTimes(1);
});

test("CP-UI4. profile이 없으면 단추 감싸개가 없다", () => {
  render(
    <ChatIncomingRow avatar={{ name: "미나", imageUrl: null }} testId="row-in">
      <view />
    </ChatIncomingRow>,
  );
  expect(screen.getByTestId("row-in").querySelector("[accessibility-traits='button']")).toBeNull();
});

test("CP-UI5. 머리 제목은 onTitleTap이 있으면 손가락으로 누를 수 있고 낭독 역할은 header 그대로", () => {
  const onTitleTap = vi.fn();
  render(
    <ChatHeader
      title="미나"
      insetTop={0}
      testIds={{ root: "h", title: "h-title" }}
      start={null}
      end={null}
      onTitleTap={onTitleTap}
    />,
  );
  const title = screen.getByTestId("h-title");
  expect(title.getAttribute("accessibility-traits")).toBe("header");
  tapEl(title);
  expect(onTitleTap).toHaveBeenCalledTimes(1);
});
