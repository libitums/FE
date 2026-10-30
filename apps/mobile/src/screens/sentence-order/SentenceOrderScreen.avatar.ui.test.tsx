import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { SentenceOrderActivity } from "./SentenceOrderScreen";
import type { ConversationCast } from "../../lib/conversation-cast";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `ui` 계층: 대화 조립(대화 순서 문항)의 줄마다 36px 원형 아바타가 말풍선 옆 아래에 붙습니다 — 상대 줄은
// 말풍선 왼쪽, 내 줄은 말풍선 오른쪽입니다. 고정된 첫 줄과 빈 칸 줄에도 붙고, 아바타는 장식이라 낭독 트리에서
// 빠지며 칸의 낭독(「Partner」 · 「You」)은 그대로입니다. 대화 순서가 아닌 문항에는 아바타가 없습니다.

const turns: SentenceOrderQuestion = {
  prompt: "대화 순서대로 놓으세요.",
  chips: ["며칠 묵으시죠?", "일주일 묵어요.", "여권 여기 있어요."],
  answerOrder: [2, 0, 1],
  instruction: "Put the conversation in order.",
  dialogue: {
    opening: { speaker: "counterpart", text: "네, 여권 좀 보여주세요." },
    speakers: ["me", "counterpart", "me"],
    chipSpeakers: ["counterpart", "me", "me"],
  },
};

const plain: SentenceOrderQuestion = {
  prompt: "Here's my passport.",
  chips: ["있어요.", "여권", "여기"],
  answerOrder: [1, 2, 0],
  instruction: "Build the sentence.",
};

afterEach(cleanup);

const CAST: ConversationCast = { counterpart: { name: "편의점 점원" }, me: { name: "Sehyun" } };

function mount(questions: readonly SentenceOrderQuestion[], cast?: ConversationCast) {
  return render(
    <SentenceOrderActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
      {...(cast === undefined ? {} : { cast })}
    />,
  );
}

const row = (position: number) => screen.getByTestId(`sentence-order-dialogue-row-${position}`);
const avatarBox = (position: number) =>
  screen.getByTestId(`sentence-order-dialogue-avatar-${position}`);
/** 줄 안 자식의 순서입니다 — 아바타가 말풍선 앞(왼쪽)인지 뒤(오른쪽)인지를 봅니다. */
const childOrderOf = (position: number) =>
  Array.from(row(position).children).map((child) =>
    child.getAttribute("data-testid")?.startsWith("sentence-order-dialogue-avatar")
      ? "avatar"
      : "bubble",
  );

test("UA1. 고정된 첫 줄과 빈 칸 줄마다 아바타가 서고 상대 줄은 말풍선 왼쪽 · 내 줄은 말풍선 오른쪽이다", () => {
  mount([turns], CAST);

  expect([0, 1, 2, 3].map((position) => row(position).getAttribute("data-speaker"))).toEqual([
    "counterpart",
    "me",
    "counterpart",
    "me",
  ]);
  expect(childOrderOf(0)).toEqual(["avatar", "bubble"]);
  expect(childOrderOf(1)).toEqual(["bubble", "avatar"]);
  expect(childOrderOf(2)).toEqual(["avatar", "bubble"]);
  expect(childOrderOf(3)).toEqual(["bubble", "avatar"]);
  expect(avatarBox(0)).toHaveClass("sentence-order-dialogue-avatar-counterpart");
  expect(avatarBox(1)).toHaveClass("sentence-order-dialogue-avatar-me");
  expect(within(row(0)).getByTestId("sentence-order-dialogue-slot-0")).toHaveAttribute(
    "data-filled",
    "true",
  );
  for (const position of [1, 2, 3]) {
    expect(
      within(row(position)).getByTestId(`sentence-order-dialogue-slot-${position}`),
    ).toHaveAttribute("data-filled", "false");
  }
});

test("UA2. 놓은 말풍선 줄에도 아바타가 같은 쪽에 남는다", () => {
  mount([turns], CAST);

  fireEvent.tap(screen.getByTestId("sentence-order-dialogue-chip-2"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-dialogue-chip-0"), {});

  expect(screen.getByTestId("sentence-order-dialogue-slot-1")).toHaveAttribute(
    "data-filled",
    "true",
  );
  expect(screen.getByTestId("sentence-order-dialogue-slot-2")).toHaveAttribute(
    "data-filled",
    "true",
  );
  expect(childOrderOf(1)).toEqual(["bubble", "avatar"]);
  expect(childOrderOf(2)).toEqual(["avatar", "bubble"]);
});

test("UA3. 상대 아바타는 에피소드 상대 이름의 첫 글자, 내 아바타는 학습자 이름의 머리글자다", () => {
  mount([turns], { counterpart: { name: "편의점 점원" }, me: { name: "Sehyun Kim" } });

  expect(within(avatarBox(0)).getByTestId("ui-lynx-avatar-initials")).toHaveTextContent("편");
  expect(within(avatarBox(1)).getByTestId("ui-lynx-avatar-initials")).toHaveTextContent("SK");
});

test("UA4. 이름이 없으면 상대는 중립 자리표시 그림, 나는 문구표 대체 이름(You)의 머리글자다", () => {
  mount([turns]);

  expect(within(avatarBox(0)).getByTestId("ui-lynx-avatar-placeholder")).toBeInTheDocument();
  expect(within(avatarBox(0)).queryByTestId("ui-lynx-avatar-initials")).not.toBeInTheDocument();
  expect(within(avatarBox(1)).getByTestId("ui-lynx-avatar-initials")).toHaveTextContent("Y");
});

test("UA5. 아바타는 장식이라 낭독 트리에서 빠지고 칸 낭독은 그대로다", () => {
  mount([turns], CAST);

  for (const position of [0, 1, 2, 3]) {
    expect(avatarBox(position)).toHaveAttribute("accessibility-elements-hidden", "true");
    const avatar = within(avatarBox(position)).getByTestId("ui-lynx-avatar");
    expect(avatar).toHaveAttribute("accessibility-element", "false");
    expect(avatar).not.toHaveAttribute("accessibility-label");
  }
  expect(screen.getByTestId("sentence-order-dialogue-slot-0")).toHaveAttribute(
    "accessibility-label",
    "Partner, turn 1: 네, 여권 좀 보여주세요.",
  );
  expect(screen.getByTestId("sentence-order-dialogue-slot-1")).toHaveAttribute(
    "accessibility-label",
    "You, turn 2, empty",
  );
});

test("UA6. 대화 순서가 아닌 문항에는 아바타가 없다", () => {
  mount([plain], CAST);

  expect(screen.getByTestId("sentence-order-screen-prompt")).toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-avatar")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-dialogue-avatar-0")).not.toBeInTheDocument();
});

test("SO12. cast.counterpart.imageUrl은 상대 아바타의 imageSource가 되고 내 아바타는 이니셜이다", () => {
  mount([turns], {
    counterpart: { name: "편의점 점원", imageUrl: "file:///episodes/u00/avatar.webp" },
    me: { name: "Sehyun" },
  });

  expect(within(avatarBox(0)).getByTestId("ui-lynx-avatar-image")).toHaveAttribute(
    "src",
    "file:///episodes/u00/avatar.webp",
  );
  expect(within(avatarBox(2)).getByTestId("ui-lynx-avatar-image")).toHaveAttribute(
    "src",
    "file:///episodes/u00/avatar.webp",
  );
  expect(within(avatarBox(1)).queryByTestId("ui-lynx-avatar-image")).not.toBeInTheDocument();
  expect(within(avatarBox(1)).getByTestId("ui-lynx-avatar-initials")).toHaveTextContent("S");
});

test("SO12. imageUrl이 없으면 상대 아바타는 이름 첫 글자 이니셜이고 그림 요소가 없다", () => {
  mount([turns], CAST);

  expect(within(avatarBox(0)).queryByTestId("ui-lynx-avatar-image")).not.toBeInTheDocument();
  expect(within(avatarBox(0)).getByTestId("ui-lynx-avatar-initials")).toHaveTextContent("편");
});

test("SO12. 상대 그림이 읽힌 뒤에도 아바타 뿌리는 칸 옆 32 원(sm)이고 그림 자식의 배치 클래스를 받지 않는다", () => {
  mount([turns], {
    counterpart: { name: "편의점 점원", imageUrl: "file:///episodes/u00/avatar.webp" },
    me: { name: "Sehyun" },
  });
  const image = lynx.createSelectorQuery().select('[data-testid="ui-lynx-avatar-image"]');
  fireEvent(image as unknown as Element, new Event("bindEvent:load"));

  const avatar = within(avatarBox(0)).getByTestId("ui-lynx-avatar");
  expect(avatar).toHaveAttribute("data-content", "image");
  expect(avatar).toHaveClass("ui-lynx-avatar-sm", "ui-lynx-avatar-content-image");
  expect(avatar).not.toHaveClass("ui-lynx-avatar-image");
  expect(within(avatarBox(0)).getByTestId("ui-lynx-avatar-image")).toHaveAttribute(
    "mode",
    "aspectFill",
  );
});
