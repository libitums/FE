import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { advance, clearBackHandlers, systemBack, tapId } from "./chat-ui.test-support";
import {
  friendStoriesTestIds as ids,
  type StoryViewerItem,
  type StoryViewerProps,
  type StoryWordPort,
} from "./friend-stories.contract";
import { HOUR_MS, STORY_NOW, story } from "./friend-stories.test-support";
import { StoryViewer } from "./StoryViewer";
import { setReplyToastShown } from "./reply-toast-presence";
import { general, room } from "./suggested-friends.test-support";

// `ui` 계층(FS-UI3 ~ UI6): 스토리 보기(ADR-0178 D4) — 장 · 한 줄 카드 · 단어 알약 · 무료 안내 · 칩 · 답장 칸, 6초 넘김 · 멈춤 ·
// 모션 줄이기, 안 만난 친구 카드, 시스템 뒤로.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(STORY_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const friendItem = (id: string, name: string, patch = {}): StoryViewerItem => ({
  story: story(id, patch),
  name,
  avatarUrl: `https://img/${id}.webp`,
  imageUrl: `https://cdn/${id}.webp`,
  unmet: null,
});

function words(saved = false): StoryWordPort & { save: ReturnType<typeof vi.fn> } {
  let isSaved = saved;
  const save = vi.fn(() => {
    isSaved = true;
  });
  return {
    lookup: () => ({ ko: "물", roman: "mul", meaning: "water" }),
    saved: () => isSaved,
    save,
  };
}

function mount(over: Partial<StoryViewerProps> = {}) {
  const props: StoryViewerProps = {
    items: [friendItem("a", "윤경"), friendItem("b", "해준", { freeReply: false })],
    start: 0,
    now: STORY_NOW,
    reducedMotion: false,
    romanization: true,
    words: words(),
    keyboardHeight: 300,
    onShown: vi.fn(),
    onReply: vi.fn(async () => ({ kind: "sent" as const })),
    onOpenChat: vi.fn(),
    onSaveWord: vi.fn(),
    onMeet: vi.fn(),
    onProfile: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<StoryViewer {...props} />);
  return props;
}

const shownIds = (onShown: StoryViewerProps["onShown"]) =>
  (onShown as ReturnType<typeof vi.fn>).mock.calls.map(
    ([item]) => (item as StoryViewerItem).story.id,
  );

test("FS-UI3. 장 · 이름 · 경과 · 한 줄 · 로마자 · 뜻 · 단어 알약 · 무료 안내 · 칩 · 답장 칸", () => {
  mount();
  // 이름이 열 때 초점을 받는 자리 — 「<이름>'s story, Story i of n」(접근성 M3).
  expect(screen.getByTestId(ids.name).getAttribute("accessibility-label")).toBe(
    "윤경's story, Story 1 of 1",
  );
  // 진행 막대는 지금 인물의 스토리만 — 윤경 한 장(D4 개정, 자세히는 StoryViewer.segments).
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 1 of 1");
  expect(screen.getByTestId(ids.segment(0))).not.toBeNull();
  expect(screen.queryByTestId(ids.segment(1))).toBeNull();
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
  expect(screen.getByTestId(ids.age).textContent).toBe("2h");
  expect(screen.getByTestId(ids.image).getAttribute("src")).toBe("https://cdn/a.webp");
  expect(screen.getByTestId(ids.image).getAttribute("accessibility-elements-hidden")).toBe("true");
  expect(
    screen.getByTestId(ids.viewer).querySelector('[accessibility-label="Photo from 윤경"]'),
  ).not.toBeNull();
  expect(screen.getByTestId(ids.line).textContent).toBe("야근 끝! 편의점 라면이 최고야");
  expect(screen.getByTestId(ids.roman).textContent).toBe(
    "yageun kkeut! pyeonuijeom ramyeoni choegoya",
  );
  expect(screen.getByTestId(ids.meaning).textContent).toBe(
    "Done with overtime! Convenience-store ramen is the best.",
  );
  expect(screen.getByTestId(ids.word).textContent).toBe("물 · water — Save word");
  expect(screen.getByTestId(ids.free).textContent).toBe("First reply is free");
  expect(screen.getByTestId(ids.chip(0)).textContent).toBe("맛있겠다!");
  expect(screen.getByTestId(ids.chip(2)).textContent).toBe("나도 배고파");
  expect(screen.getByTestId(ids.replyInput).getAttribute("placeholder")).toBe("Reply to 윤경…");
});

test("FS-UI3. 로마자를 끄면 없고, 단어 포트가 없거나 못 찾으면 알약이 없다, 무료가 아니면 안내가 없다", () => {
  mount({ romanization: false, words: undefined, start: 1 });
  expect(screen.queryByTestId(ids.roman)).toBeNull();
  expect(screen.queryByTestId(ids.word)).toBeNull();
  expect(screen.queryByTestId(ids.free)).toBeNull();
});

test("FS-UI3. Save word → 저장 · 콜백, 그 뒤 Saved", () => {
  const port = words();
  const props = mount({ words: port });
  tapId(ids.word);
  expect(port.save).toHaveBeenCalledWith({ episodeId: "u01-water", ref: "voca:e70ba1ce" });
  expect(props.onSaveWord).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(ids.word).textContent).toBe("물 saved to My words");
});

test("FS-UI3. 칩 → onReply(그 말, chip) — 보내기는 보기 안에서(D5 개정, 자세히는 StoryViewer.reply)", () => {
  const props = mount();
  tapId(ids.chip(1));
  expect(props.onReply).toHaveBeenCalledWith(props.items[0], "수고했어!", "chip");
  expect(screen.getByTestId(ids.replyInput).getAttribute("placeholder")).toBe("Reply to 윤경…");
});

test("FS-UI4. 6초 뒤 다음 장, 마지막 뒤 닫힘 — 장마다 onShown", () => {
  const props = mount();
  expect(shownIds(props.onShown)).toEqual(["s-a"]);
  advance(5_999);
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
  advance(1);
  expect(screen.getByTestId(ids.name).textContent).toBe("해준");
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 1 of 1");
  expect(shownIds(props.onShown)).toEqual(["s-a", "s-b"]);
  // 다음 장도 처음부터 6초 — 앞 장에서 흐른 시간이 빠지지 않는다.
  advance(5_999);
  expect(props.onClose).not.toHaveBeenCalled();
  advance(1);
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test("FS-UI3. 한 장에서 단어를 저장해도 다음 장(다른 단어)의 알약은 Save word로 다시 선다", () => {
  const savedRefs = new Set<string>();
  const port: StoryWordPort = {
    lookup: (word) =>
      word.ref === "voca:b"
        ? { ko: "불", roman: "bul", meaning: "fire" }
        : { ko: "물", roman: "mul", meaning: "water" },
    saved: (word) => savedRefs.has(word.ref),
    save: (word) => void savedRefs.add(word.ref),
  };
  mount({
    words: port,
    items: [
      friendItem("a", "윤경"),
      friendItem("b", "해준", { word: { episodeId: "u02-fire", ref: "voca:b" } }),
    ],
  });
  tapId(ids.word);
  expect(screen.getByTestId(ids.word).textContent).toBe("물 saved to My words");
  tapId(ids.next);
  expect(screen.getByTestId(ids.word).textContent).not.toContain("saved to My words");
  expect(screen.getByTestId(ids.word).textContent).toContain("불");
});

test("FS-UI4. 다음 · 이전 탭, 처음에서 이전은 그대로", () => {
  mount();
  tapId(ids.previous);
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
  tapId(ids.next);
  expect(screen.getByTestId(ids.name).textContent).toBe("해준");
  tapId(ids.previous);
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
});

test("FS-UI4. 멈춤이면 넘어가지 않고, 다시 재생하면 이어 간다", () => {
  mount();
  tapId(ids.pause);
  expect(screen.getByTestId(ids.pause).getAttribute("accessibility-label")).toBe("Play");
  advance(20_000);
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
  tapId(ids.pause);
  advance(6_000);
  expect(screen.getByTestId(ids.name).textContent).toBe("해준");
});

test("FS-UI4. 모션 줄이기면 저절로 넘어가지 않는다(넘김은 탭으로)", () => {
  mount({ reducedMotion: true });
  advance(30_000);
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
  expect(screen.getByTestId(ids.viewer).getAttribute("data-motion")).toBe("reduced");
});

test("FS-UI4. 위에 시트가 덮으면 멈추고 낭독에서 숨는다", () => {
  const props = mount({ covered: true });
  advance(20_000);
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
  expect(screen.getByTestId(ids.viewer).getAttribute("accessibility-elements-hidden")).toBe("true");
  expect(props.onClose).not.toHaveBeenCalled();
});

test("RT-UI7. 답장 토스트가 떠 있으면 진행만 멈추고 낭독에서는 숨지 않는다(ADR-0200)", () => {
  setReplyToastShown(true);
  mount();
  advance(20_000);
  setReplyToastShown(false);
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
  expect(screen.getByTestId(ids.viewer).getAttribute("accessibility-elements-hidden")).not.toBe(
    "true",
  );
});

test("FS-UI5. 안 만난 친구: 칩 · 답장 칸 · 멈춤 없음, NEW FRIEND · 소개 카드, addable → Add friend and reply", () => {
  const unmet = {
    character: general("g", { name: "다은", intro: { en: "Loves cafés and old alleys." } }),
    room: room("g", false),
    status: "addable" as const,
    offer: null,
  };
  const props = mount({
    items: [{ ...friendItem("g", "다은", { postedAt: STORY_NOW - HOUR_MS }), unmet }],
  });
  expect(screen.queryByTestId(ids.chip(0))).toBeNull();
  expect(screen.queryByTestId(ids.replyInput)).toBeNull();
  // 안 만난 친구에도 멈춤이 있다 — 자동 넘김을 멈출 길(WCAG 2.2.1, 접근성 C1).
  expect(screen.getByTestId(ids.pause)).not.toBeNull();
  expect(screen.queryByTestId(ids.free)).toBeNull();
  expect(screen.getByTestId(ids.viewer).textContent).toContain("NEW FRIEND");
  expect(screen.getByTestId(ids.meetCard).textContent).toContain("Loves cafés and old alleys.");
  expect(screen.getByTestId(ids.meet).textContent).toContain("Add friend and reply");
  tapId(ids.meet);
  expect(props.onMeet).toHaveBeenCalledWith(props.items[0]);
});

test("FS-UI5. 잠긴 안 만난 친구 → 소개 카드만, 단추 없음(프로필 시트는 위 아바타로 옮김)", () => {
  const unmet = {
    character: general("g", { name: "다은" }),
    room: room("g", false),
    status: "locked" as const,
    offer: null,
  };
  mount({ items: [{ ...friendItem("g", "다은"), unmet }] });
  expect(screen.getByTestId(ids.meetCard)).not.toBeNull();
  expect(screen.queryByTestId(ids.meet)).toBeNull();
  expect(screen.getByTestId(ids.viewer).textContent).not.toContain("See how to meet");
});

test("FS-UI32. 위 아바타 = 「<이름>'s profile」 버튼(flatten false) — 아바타 · 이름을 누르면 onProfile(그 장)", () => {
  const props = mount();
  const avatar = screen.getByTestId(ids.profile);
  expect(avatar.getAttribute("accessibility-label")).toBe("윤경's profile");
  expect(avatar.getAttribute("accessibility-traits")).toBe("button");
  expect(avatar.getAttribute("accessibility-enable-tap")).toBe("true");
  expect(avatar.getAttribute("flatten")).toBe("false");
  tapId(ids.profile);
  expect(props.onProfile).toHaveBeenCalledWith(props.items[0]);
  tapId(ids.name);
  expect(props.onProfile).toHaveBeenCalledTimes(2);
  // 누른 것은 넘김이 아니다 — 장이 그대로.
  expect(screen.getByTestId(ids.name).textContent).toBe("윤경");
});

test("FS-UI32. 안 만난 친구도 아바타가 프로필 버튼", () => {
  const unmet = {
    character: general("g", { name: "다은" }),
    room: room("g", false),
    status: "locked" as const,
    offer: null,
  };
  const props = mount({ items: [{ ...friendItem("g", "다은"), unmet }] });
  expect(screen.getByTestId(ids.profile).getAttribute("accessibility-label")).toBe(
    "다은's profile",
  );
  tapId(ids.profile);
  expect(props.onProfile).toHaveBeenCalledWith(props.items[0]);
});

test("FS-UI48. 안 만난 친구의 아래 소개 카드(얼굴 · 이름 · 소개)를 누르면 위 아바타와 같은 onProfile(그 장) — 넘기지 않음, Add friend는 그대로", () => {
  for (const status of ["locked", "addable"] as const) {
    const unmet = {
      character: general("g", { name: "다은" }),
      room: room("g", false),
      status,
      offer: null,
    };
    const props = mount({
      items: [
        { ...friendItem("g", "다은"), unmet },
        friendItem("b", "보라", { postedAt: STORY_NOW - HOUR_MS }),
      ],
    });
    tapId(ids.meetCard);
    expect(props.onProfile).toHaveBeenCalledWith(props.items[0]);
    expect(screen.getByTestId(ids.name).textContent).toBe("다은");
    if (status === "addable") {
      tapId(ids.meet);
      expect(props.onMeet).toHaveBeenCalledWith(props.items[0]);
      expect(props.onProfile).toHaveBeenCalledTimes(1);
    }
    cleanup();
  }
});

test("FS-UI6. 닫기 · 시스템 뒤로 = onClose", () => {
  const props = mount();
  tapId(ids.close);
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(systemBack()).toBe(true);
  expect(props.onClose).toHaveBeenCalledTimes(2);
});

test("FS-UI6. 낭독 순서 — 닫기 · 멈춤 → 이름 → 프로필(아바타), 이전/다음은 맨 뒤(접근성 M1) · 탭 자리는 flatten false", () => {
  mount();
  const order = Array.from(screen.getByTestId(ids.viewer).querySelectorAll("[data-testid]"))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) =>
      [
        ids.close,
        ids.pause,
        ids.name,
        ids.profile,
        ids.chip(0),
        ids.replyInput,
        ids.replySend,
        ids.previous,
        ids.next,
      ].includes(id),
    );
  expect(order).toEqual([
    ids.close,
    ids.pause,
    ids.name,
    ids.profile,
    ids.chip(0),
    ids.replyInput,
    ids.replySend,
    ids.previous,
    ids.next,
  ]);
  for (const id of [ids.close, ids.pause, ids.profile, ids.previous, ids.next, ids.chip(0)]) {
    expect(screen.getByTestId(id).getAttribute("accessibility-traits"), id).toBe("button");
  }
  expect(screen.getByTestId(ids.previous).getAttribute("flatten")).toBe("false");
});

test("FS-UI6. 저장한 단어 알약은 버튼이 아니다", () => {
  mount({ words: words(true) });
  const pill = screen.getByTestId(ids.word);
  expect(pill.getAttribute("accessibility-traits")).toBeNull();
  expect(pill.getAttribute("accessibility-enable-tap")).toBe("false");
});
