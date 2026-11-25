// 내 스토리 테스트 대역(ADR-0194) — 메모리 서버 · 고를 거리 · 처음 안내 · 본 반응.

import { vi } from "vitest";

import type {
  MyStoriesPort,
  MyStoriesState,
  MyStory,
  MyStoryChoice,
  MyStoryDraft,
  MyStoryPostKind,
  MyStoryPostResult,
  MyStoryReaction,
  MyTextStoryDraft,
  MyStoryWindow,
} from "./my-stories.contract";
import type {
  MyPhotoStoryDraft,
  MyStoryPhotoPort,
  PhotoPickResult,
  StoryPhotoSource,
} from "./my-story-photo.contract";

export const MS_NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
export const MS_HOUR = 3_600_000;

export function myStory(id: string, patch: Partial<MyStory> = {}): MyStory {
  const postedAt = patch.postedAt ?? MS_NOW - 2 * MS_HOUR;
  return {
    id,
    kind: "word",
    status: "live",
    imagePath: null,
    word: { episodeId: "u01", ref: `voca:${id}` },
    ko: "야근",
    roman: "yageun",
    meaning: "overtime",
    example: { ko: "오늘도 야근이야… 피곤해", meaning: "Working late again today… tired." },
    postedAt,
    expiresAt: postedAt + 24 * MS_HOUR,
    reactions: [],
    seenBy: [],
    background: null,
    overlays: [],
    ...patch,
  };
}

/** 반응 하나 — 그 인물 방의 메시지 id는 `msg-<id>`. */
export const reaction = (
  id: string,
  characterId: string,
  patch: Partial<MyStoryReaction> = {},
): MyStoryReaction => ({
  id,
  characterId,
  messageId: `msg-${id}`,
  text: "야근 끝나면 라면 먹어!",
  meaning: "Have ramen after overtime!",
  at: MS_NOW - MS_HOUR,
  ...patch,
});

export const wordChoice = (key: string, ko = "야근", meaning = "overtime"): MyStoryChoice => ({
  key,
  kind: "word",
  word: { episodeId: "u01", ref: `voca:${key}` },
  ko,
  roman: "yageun",
  meaning,
  example: null,
  source: "Lesson 1",
});

export type FakeMyStories = {
  readonly port: MyStoriesPort;
  readonly post: ReturnType<typeof vi.fn<(draft: MyStoryDraft) => Promise<MyStoryPostResult>>>;
  readonly remove: ReturnType<typeof vi.fn<(id: string | null) => Promise<boolean>>>;
  readonly postText: ReturnType<
    typeof vi.fn<(draft: MyTextStoryDraft) => Promise<MyStoryPostResult>>
  >;
  readonly setKeep: ReturnType<typeof vi.fn<(keep: boolean) => Promise<boolean | null>>>;
  readonly state: () => MyStoriesState;
  /** 사진 포트 대역(ADR-0199) — `photo` 옵션이 없으면 null(포트에 사진 없음). */
  readonly photo: FakePhoto | null;
};

export type FakePhoto = {
  readonly pick: ReturnType<typeof vi.fn<(source: StoryPhotoSource) => Promise<PhotoPickResult>>>;
  readonly post: ReturnType<typeof vi.fn<(draft: MyPhotoStoryDraft) => Promise<MyStoryPostResult>>>;
  readonly url: ReturnType<typeof vi.fn<(path: string) => Promise<string | null>>>;
  readonly requestReview: ReturnType<typeof vi.fn<(id: string) => Promise<boolean>>>;
  readonly discard: ReturnType<typeof vi.fn<(path: string) => void>>;
};

export const PICKED: PhotoPickResult = {
  status: "picked",
  photo: {
    url: "file:///cache/story-photos/p1.jpg",
    path: "/cache/story-photos/p1.jpg",
    width: 1200,
    height: 1600,
  },
};
export const PHOTO_PATH = "0f8fad5b-d9cb-469f-a165-70867728950e/p1.jpg";

export function fakeMyStories(options: {
  readonly enabled?: boolean;
  readonly keep?: boolean;
  readonly stories?: readonly MyStory[];
  readonly words?: readonly MyStoryChoice[];
  readonly guideSeen?: boolean;
  readonly postResult?: Exclude<MyStoryPostResult["result"], "crisis" | "rejected">;
  readonly removeOk?: boolean;
  /** 지금의 올리기 창 — 없으면 null(옛 서버). 올리면 이 창을 쓴 것으로 돌려줍니다. */
  readonly window?: MyStoryWindow | null;
  /** 올릴 수 있는 종류(서버 반영 예상) — 없으면 word · card. */
  readonly kinds?: readonly MyStoryPostKind[];
  /** 사진 포트(ADR-0199) — 고르기 결과 · 올리기 결과(없으면 live로 올림). */
  readonly photo?: {
    readonly pick?: PhotoPickResult;
    readonly post?: MyStoryPostResult | "checking";
  };
}): FakeMyStories {
  let stories = [...(options.stories ?? [])];
  let keep = options.keep ?? true;
  let guide = options.guideSeen ?? false;
  const seen = new Set<string>();
  let ids = 0;
  let window = options.window ?? null;
  const state = (): MyStoriesState => ({
    enabled: options.enabled ?? true,
    keep,
    stories,
    window,
    kinds: options.kinds ?? ["word", "card"],
  });
  const post = vi.fn(async (draft: MyStoryDraft): Promise<MyStoryPostResult> => {
    const result = options.postResult ?? "ok";
    if (result === "window_used") return { result, window };
    if (result !== "ok") return { result };
    const story = myStory(`new-${draft.clientId}`, {
      kind: draft.kind,
      word: draft.word,
      ko: draft.ko,
      roman: draft.roman,
      meaning: draft.meaning,
      example: draft.example,
      postedAt: Date.now(),
    });
    stories = [story, ...stories];
    window = window === null ? null : { ...window, used: true };
    return { result: "ok", story, window };
  });
  const postText = vi.fn(async (draft: MyTextStoryDraft): Promise<MyStoryPostResult> => {
    const story = myStory(`text-${draft.clientId}`, {
      kind: "text",
      word: null,
      ko: draft.ko,
      roman: "",
      meaning: "",
      example: null,
      background: draft.background,
      overlays: draft.overlays,
      postedAt: Date.now(),
    });
    stories = [story, ...stories];
    return { result: "ok", story, window };
  });
  const remove = vi.fn(async (id: string | null) => {
    if (options.removeOk === false) return false;
    stories = id === null ? [] : stories.filter((story) => story.id !== id);
    return true;
  });
  const setKeep = vi.fn(async (value: boolean) => {
    keep = value;
    return value;
  });
  const photo: FakePhoto | null =
    options.photo === undefined
      ? null
      : {
          pick: vi.fn(async () => options.photo?.pick ?? PICKED),
          post: vi.fn(async (draft: MyPhotoStoryDraft): Promise<MyStoryPostResult> => {
            const planned = options.photo?.post;
            if (planned !== undefined && planned !== "checking") return planned;
            const story = myStory(`photo-${draft.clientId}`, {
              kind: "photo",
              status: planned === "checking" ? "checking" : "live",
              imagePath: PHOTO_PATH,
              word: null,
              ko: draft.ko,
              roman: "",
              meaning: "",
              example: null,
              overlays: draft.overlays,
              postedAt: Date.now(),
            });
            stories = [story, ...stories];
            return { result: "ok", story, window };
          }),
          url: vi.fn(async () => "https://signed.example/p1.jpg"),
          requestReview: vi.fn(async () => true),
          discard: vi.fn(),
        };
  const photoPort: MyStoryPhotoPort | undefined = photo === null ? undefined : photo;
  const port: MyStoriesPort = {
    ...(photoPort === undefined ? {} : { photo: photoPort }),
    load: async () => state(),
    post,
    postText,
    remove,
    setKeep,
    choices: () => ({ words: options.words ?? [] }),
    guideSeen: () => guide,
    markGuideSeen: () => {
      guide = true;
    },
    seenReactions: () => new Set(seen),
    markReactionsSeen: (list) => {
      for (const id of list) seen.add(id);
    },
    newClientId: () => `cid-${++ids}`,
  };
  return { port, post, postText, remove, setKeep, state, photo };
}
