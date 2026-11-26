import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf, tapId } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendStoriesTestIds as fsIds, type FriendStoriesPort } from "./friend-stories.contract";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { fakeMyStories, MS_NOW, PICKED, wordChoice } from "./my-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(MSP-UI1 ~ UI7, ADR-0199): 내 스토리 사진 — 시작 시트의 Camera · 사진, 고르기 결과, 사진 위 편집 · 올리기, 확인 중 · 거절 ·
// 다시 확인 요청, 업로드 실패, 닫으면 파일 지움. 서버 · 호스트는 메모리 대역입니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 1 })]),
  add: () => "added",
  earlyAccess: null,
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
}

async function mount(fake: ReturnType<typeof fakeMyStories>) {
  const sink = vi.fn();
  const stories: FriendStoriesPort = {
    load: async () => [],
    imageUrl: () => null,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    mine: fake.port,
  };
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={makeSource(
          seedOf(
            fixtureRoom("mina", {
              counterpart: { id: "mina", name: "미나", avatarPath: null },
              messages: [
                { kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 30 },
              ],
            }),
          ),
        )}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        friends={friendsPort()}
        stories={stories}
      />
    </ChatEventsContext.Provider>,
  );
  await flush();
  return {
    events: () =>
      sink.mock.calls.map(([event]) => event as { name: string } & Record<string, unknown>),
  };
}

const words = [wordChoice("w1"), wordChoice("w2", "찌개", "stew")];
const photoKinds = ["text", "photo"] as const;

async function openPhotoEditor(fake: ReturnType<typeof fakeMyStories>) {
  const mounted = await mount(fake);
  tapId(ids.create);
  tapId(ids.startPhotos);
  await flush();
  return mounted;
}

test("MSP-UI1. 사진 선택지 — kinds에 photo가 있고 호스트 포트가 있을 때만 Camera · 사진이 선다", async () => {
  await mount(fakeMyStories({ guideSeen: true, words, kinds: ["text"], photo: {} }));
  tapId(ids.create);
  expect(screen.queryByTestId(ids.startCamera)).toBeNull();
  expect(screen.queryByTestId(ids.startPhotos)).toBeNull();
  cleanup();
  await mount(fakeMyStories({ guideSeen: true, words, kinds: [...photoKinds] }));
  tapId(ids.create);
  expect(screen.queryByTestId(ids.startCamera)).toBeNull();
  cleanup();
  await mount(fakeMyStories({ guideSeen: true, words, kinds: [...photoKinds], photo: {} }));
  tapId(ids.create);
  expect(screen.getByTestId(ids.startCamera).textContent).toContain("Camera");
  expect(screen.getByTestId(ids.startPhotos).textContent).toContain("Recent photos");
  expect(screen.getByTestId(ids.startBackground)).not.toBeNull();
});

test("MSP-UI2. 고르기 결과 — 카메라 거부는 시트에 안내, 취소는 시트에 그대로, 고르면 사진 바탕 편집(색 고르기 없음 · Aa 있음) · photo_picked", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    words,
    kinds: [...photoKinds],
    photo: { pick: { status: "denied" } },
  });
  const { events } = await mount(fake);
  tapId(ids.create);
  tapId(ids.startCamera);
  await flush();
  expect(fake.photo?.pick).toHaveBeenCalledWith("camera");
  expect(screen.getByTestId(ids.startError).textContent).toBe(
    "Camera access is off. Turn it on in Settings to take a photo.",
  );
  fake.photo?.pick.mockResolvedValueOnce({ status: "cancelled" });
  tapId(ids.startPhotos);
  await flush();
  expect(fake.photo?.pick).toHaveBeenLastCalledWith("library");
  expect(screen.getByTestId(ids.start)).not.toBeNull();
  expect(screen.queryByTestId(ids.startError)).toBeNull();
  fake.photo?.pick.mockResolvedValueOnce(PICKED);
  tapId(ids.startPhotos);
  await flush();
  expect(screen.queryByTestId(ids.start)).toBeNull();
  expect(screen.getByTestId(ids.editorPhoto).getAttribute("src")).toBe(
    "file:///cache/story-photos/p1.jpg",
  );
  expect(screen.queryByTestId(ids.swatch("orange"))).toBeNull();
  expect(screen.getByTestId(ids.toolText)).not.toBeNull();
  expect(
    events()
      .filter((e) => e.name === "my_story_photo_picked")
      .map((e) => [e["source"], e["outcome"]]),
  ).toEqual([
    ["camera", "denied"],
    ["library", "cancelled"],
    ["library", "picked"],
  ]);
});

test("MSP-UI3. 사진 위 편집 — 한 줄이 없으면 Share 꺼짐 · 안내, 단어를 얹으면 업로드 → 게시(사진 · 한 줄 · 얹은 것), 올리는 동안 안내 → 올린 뒤 확인 중 안내, 보기는 서명 주소 사진 · Photo story", async () => {
  const fake = fakeMyStories({ guideSeen: true, words, kinds: [...photoKinds], photo: {} });
  let release: () => void = () => undefined;
  const { events } = await openPhotoEditor(fake);
  expect(screen.getByTestId(ids.editorHint).textContent).toBe(
    "Add a word or write a line to share your photo.",
  );
  tapId(ids.share);
  await flush();
  expect(fake.photo?.post).not.toHaveBeenCalled();
  tapId(ids.toolWords);
  tapId(ids.choice("w2"));
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  expect(screen.getByTestId(ids.sticker("s1"))).not.toBeNull();
  expect(screen.getByTestId(ids.sticker("s2"))).not.toBeNull();
  const original = fake.photo?.post.getMockImplementation();
  let uploaded: () => void = () => undefined;
  fake.photo?.post.mockImplementationOnce(
    (draft, onUploaded) =>
      new Promise((resolve) => {
        uploaded = () => onUploaded?.();
        release = () => void original?.(draft).then(resolve);
      }),
  );
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.editorHint).textContent).toBe("Uploading your photo…");
  // 사진이 올라가면 서버 확인(검수 · 장면 읽기, 운영 5 ~ 9초) 동안은 확인 중 안내로 바뀝니다.
  uploaded();
  await flush();
  expect(screen.getByTestId(ids.editorHint).textContent).toBe("Checking your photo…");
  expect(fake.photo?.post).toHaveBeenCalledWith(
    expect.objectContaining({
      photo: PICKED.status === "picked" ? PICKED.photo : null,
      ko: "찌개",
      overlays: [
        expect.objectContaining({ kind: "word", ko: "찌개" }),
        expect.objectContaining({ kind: "word", ko: "야근" }),
      ],
      region: null,
    }),
    expect.any(Function),
  );
  release();
  await flush();
  // 막 올린 사진은 전체 화면 보기(ADR-0194 개정 ⟨보기⟩) — 사진 · 얹은 것을 화면 가득.
  expect(screen.getByTestId(fsIds.viewer)).not.toBeNull();
  const card = screen.getByTestId(ids.photoCard);
  expect(card.textContent).toContain("찌개");
  await flush(); // 서명 주소는 보기가 선 뒤에 옵니다
  expect(screen.getByTestId(ids.storyPhoto).getAttribute("src")).toBe(
    "https://signed.example/p1.jpg",
  );
  expect(screen.queryByTestId(ids.photoChecking)).toBeNull();
  expect(events().find((e) => e.name === "my_story_posted")?.["kind"]).toBe("photo");
});

test("MSP-UI4. 확인 중(checking)으로 올라가면 보기에 「Checking your photo」 띠", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    words,
    kinds: [...photoKinds],
    photo: { post: "checking" },
  });
  await openPhotoEditor(fake);
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.photoChecking).textContent).toContain("Checking your photo");
  expect(screen.getByTestId(ids.photoChecking).textContent).toContain(
    "Only you can see it until the check is done.",
  );
});

test("MSP-UI5. 거절 — 거절 판 · Share 꺼짐 · post_failed(rejected), 「Ask for a review」 → 요청 · 고맙다 줄 · review_requested", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    words,
    kinds: [...photoKinds],
    photo: { post: { result: "rejected", rejection: { id: "r-1", category: "nudity" } } },
  });
  const { events } = await openPhotoEditor(fake);
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  tapId(ids.share);
  await flush();
  const panel = screen.getByTestId(ids.photoRejected).textContent;
  expect(panel).toContain("This photo can't be shared");
  expect(panel).toContain("Our check found something stories can't include.");
  expect(panel).not.toContain("nudity");
  tapId(ids.share);
  await flush();
  expect(fake.photo?.post).toHaveBeenCalledTimes(1);
  tapId(ids.photoReview);
  await flush();
  expect(fake.photo?.requestReview).toHaveBeenCalledWith("r-1");
  expect(screen.getByTestId(ids.photoReviewSent).textContent).toBe(
    "Thanks — we'll take another look.",
  );
  expect(screen.queryByTestId(ids.photoReview)).toBeNull();
  const names = events();
  expect(names.find((e) => e.name === "my_story_post_failed")?.["reason"]).toBe("rejected");
  expect(names.find((e) => e.name === "my_story_review_requested")?.["ok"]).toBe(true);
});

test("MSP-UI6. 업로드 실패 · 하루 검수 상한은 편집에 안내, 다시 Share할 수 있다", async () => {
  const fake = fakeMyStories({
    guideSeen: true,
    words,
    kinds: [...photoKinds],
    photo: { post: { result: "upload_failed" } },
  });
  await openPhotoEditor(fake);
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.composerError).textContent).toBe(
    "Couldn't upload your photo. Check your connection and try again.",
  );
  fake.photo?.post.mockResolvedValueOnce({ result: "check_limit" });
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.composerError).textContent).toBe(
    "You've tried enough for today. Try again tomorrow.",
  );
  expect(fake.photo?.post).toHaveBeenCalledTimes(2);
});

test("MSP-UI7. 사진 편집을 닫으면 고른 파일을 지운다", async () => {
  const fake = fakeMyStories({ guideSeen: true, words, kinds: [...photoKinds], photo: {} });
  await openPhotoEditor(fake);
  tapId(ids.composerClose);
  await flush();
  expect(screen.queryByTestId(ids.editor)).toBeNull();
  expect(fake.photo?.discard).toHaveBeenCalledWith("/cache/story-photos/p1.jpg");
});
