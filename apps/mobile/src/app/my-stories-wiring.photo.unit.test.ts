import { afterEach, expect, test, vi } from "vitest";

import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { myStoriesPortOf } from "./my-stories-wiring";
import { setEarlyAccessRemote } from "./suggested-friends-wiring";

// `unit` 계층(CT-U9, state-data): 대화방에서 여러 판이 같은 내 사진을 동시에 그려도(ADR-0194 개정 ⟨판⟩) 서명 요청은 한 번 — 받은 주소는
// 다시 쓰고(45분), 같은 경로를 기다리는 요청은 하나로 묶습니다. 못 받았으면(null) 다음에 다시 요청합니다.

vi.mock("../lib/story-photo", () => ({
  storyPhotosAvailable: () => true,
  pickStoryPhoto: vi.fn(),
  discardStoryPhoto: vi.fn(),
}));

afterEach(() => setEarlyAccessRemote(null));

const portWith = (sign: (path: string) => Promise<string | null>) => {
  setEarlyAccessRemote(() => ({ myStories: { photo: { sign } } }) as unknown as ChatRemote);
  return myStoriesPortOf({
    catalog: () => [],
    accountKey: () => "acct",
    seen: () => ({ seenIds: () => new Set(), markSeen: () => undefined }),
  });
};

test("CT-U9 같은 경로를 동시에 · 다시 요청해도 서명은 한 번", async () => {
  let release: (url: string) => void = () => undefined;
  const sign = vi.fn(
    () =>
      new Promise<string | null>((resolve) => {
        release = resolve;
      }),
  );
  const photo = portWith(sign).photo;
  const first = photo?.url("u/a.jpg");
  const second = photo?.url("u/a.jpg");
  release("https://signed/a");
  expect(await first).toBe("https://signed/a");
  expect(await second).toBe("https://signed/a");
  expect(await photo?.url("u/a.jpg")).toBe("https://signed/a");
  expect(sign).toHaveBeenCalledTimes(1);
});

test("CT-U9 못 받았으면(null) 다음 요청에 다시 서명", async () => {
  const sign = vi.fn(async () => null);
  const photo = portWith(sign).photo;
  expect(await photo?.url("u/b.jpg")).toBeNull();
  expect(await photo?.url("u/b.jpg")).toBeNull();
  expect(sign).toHaveBeenCalledTimes(2);
});
