import { afterEach, expect, test, vi } from "vitest";

import { resetPurchaseContextForTests, setPurchaseContext } from "../lib/purchase-intent";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import type { MyStoryDraft } from "../screens/messenger-chat/my-stories.contract";
import { myStoriesPortOf } from "./my-stories-wiring";
import { setEarlyAccessRemote } from "./suggested-friends-wiring";

// `integration` 계층(MSR1 · MSR2, ADR-0211): 내 스토리 결선이 스토어 나라(요금제 결선이 적은 `storefront`)를 읽기 · 단어/카드 올리기에
// 싣는다 — 기기 UTC 차이가 0일 때 서버가 이 나라로 올리기 창을 센다. 두 글자 대문자가 아니면 싣지 않는다.

afterEach(() => {
  setEarlyAccessRemote(null);
  resetPurchaseContextForTests();
});

const draft: MyStoryDraft = {
  clientId: "11111111-1111-4111-8111-111111111111",
  kind: "word",
  word: { episodeId: "u01", ref: "voca:x" },
  ko: "야근",
  roman: "yageun",
  meaning: "overtime",
  example: null,
  lang: "en",
  tzOffsetMin: 0,
};

function portWithRemote() {
  const list = vi.fn(async () => null);
  const post = vi.fn(async () => ({ result: "failed" as const }));
  setEarlyAccessRemote(() => ({ myStories: { list, post } }) as unknown as ChatRemote);
  const port = myStoriesPortOf({
    catalog: () => [],
    accountKey: () => "acct",
    seen: () => ({ seenIds: () => new Set(), markSeen: () => undefined }),
  });
  return { port, list, post };
}

test("MSR1. 스토어 나라를 알면 읽기 · 단어/카드 올리기에 싣는다", async () => {
  setPurchaseContext({ region: "US", sink: null, storefront: "KR" });
  const { port, list, post } = portWithRemote();
  await port.load();
  await port.post(draft);
  expect(list).toHaveBeenCalledWith(-new Date().getTimezoneOffset() || 0, "KR");
  expect(post).toHaveBeenCalledWith({ ...draft, region: "KR" });
});

test("MSR2. 모르거나 형식이 다르면 null", async () => {
  for (const storefront of [null, "KOR", "kr"]) {
    setPurchaseContext({ region: "US", sink: null, storefront });
    const { port, list, post } = portWithRemote();
    await port.load();
    await port.post(draft);
    expect(list).toHaveBeenCalledWith(expect.any(Number), null);
    expect(post).toHaveBeenCalledWith({ ...draft, region: null });
  }
});
