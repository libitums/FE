import { afterEach, expect, test } from "vitest";

import { messengerChatSource, resetMessengerChatSourceForTests } from "./messenger-chat-wiring";

// `unit` 계층(기기 결함 D3, device-findings-1): 방 · 목록 아바타에 캐릭터 그림이 나오지 않고 이니셜만 보였다.
// 원인: 출처는 앱 프로세스 싱글턴이라 **처음 부를 때 받은 `imageUrlOf`**를 평생 쥐었다. 앱은 에피소드 콘텐츠가 읽히기 전
// 첫 렌더(`useState(noEpisodeContent)`)에서 결선을 한 번 지나므로 그때의 `() => null`이 박혔고, 요약의 `avatarUrl`도
// 그 값으로 캐시됐다. 학습 메신저는 렌더 때마다 최신 `content.imageUrlOf`를 부르므로 같은 문제가 없었다.

afterEach(() => {
  resetMessengerChatSourceForTests();
});

const cdn = (path: string): string => `https://cdn.example/${path}`;
const avatarUrls = (source: ReturnType<typeof messengerChatSource>): (string | null)[] =>
  source.snapshot().rooms.map((room) => room.counterpart.avatarUrl);

test("D3. 처음에 그림 해석기가 null만 돌려줘도, 나중에 실제 해석기가 오면 아바타 주소가 풀린다", () => {
  const first = messengerChatSource(() => null);
  expect(avatarUrls(first).every((url) => url === null)).toBe(true);

  const second = messengerChatSource(cdn);

  expect(second).toBe(first);
  const urls = avatarUrls(second);
  expect(urls.some((url) => url === cdn("content/images/profiles/mina-casual.webp"))).toBe(true);
});

test("D3. 같은 해석기를 다시 넘기면 스냅숏 참조가 그대로다(불필요한 재렌더를 만들지 않는다)", () => {
  const source = messengerChatSource(cdn);
  const before = source.snapshot();

  messengerChatSource(cdn);

  expect(source.snapshot()).toBe(before);
});

test("D3. 해석기가 바뀐 뒤 방 한 개(thread)의 상대 아바타도 새 주소다", () => {
  messengerChatSource(() => null);
  const source = messengerChatSource(cdn);

  expect(source.thread("mina")?.counterpart.avatarUrl).toBe(
    cdn("content/images/profiles/mina-casual.webp"),
  );
});
