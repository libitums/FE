// 내 스토리 RPC(ADR-0194 · ADR-0191, 모양은 `@libitums/companion-contract` my-stories) — 대화 원격과 같은 토큰 · 전송(`call`)을 씁니다.
// 함수가 없는 서버(배포 전)는 404 → null · failed. 글 스토리 · 교정은 Edge Function `companion-my-story`(글 스토리는 서버 반영 예상).

import type { CompanionMyStoriesRemote } from "../screens/messenger-chat/chat-remote.contract";
import { myStoriesFrom, myStoryPostFrom } from "../screens/messenger-chat/my-stories-parse";

type Call = (path: string, body: unknown) => Promise<string | null>;

const MY_STORY_FUNCTION = "/functions/v1/companion-my-story";

function keepFrom(body: string | null): boolean | null {
  if (body === null) return null;
  try {
    const value: unknown = JSON.parse(body);
    const keep =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)["keep"]
        : null;
    return typeof keep === "boolean" ? keep : null;
  } catch {
    return null;
  }
}

export function myStoriesRemote(call: Call): CompanionMyStoriesRemote {
  return {
    list: async (tzOffsetMin) =>
      myStoriesFrom(
        await call("/rest/v1/rpc/companion_my_stories", { p_tz_offset_min: tzOffsetMin }),
      ),
    post: async (draft) =>
      myStoryPostFrom(
        await call("/rest/v1/rpc/companion_post_my_story", {
          p_client_id: draft.clientId,
          p_kind: draft.kind,
          p_word: draft.word,
          p_ko: draft.ko,
          p_roman: draft.roman,
          p_meaning: draft.meaning,
          p_example_ko: draft.example?.ko ?? null,
          p_example_meaning: draft.example?.meaning ?? null,
          p_lang: draft.lang,
          p_tz_offset_min: draft.tzOffsetMin,
        }),
      ),
    // 글 스토리 — 사진 `post`와 같은 함수 · 같은 action에서 `image_path` 대신 `background`(서버 반영 예상, ADR-0194 적용 기록).
    postText: async (draft) =>
      myStoryPostFrom(
        await call(MY_STORY_FUNCTION, {
          action: "post",
          client_id: draft.clientId,
          background: draft.background,
          ko: draft.ko,
          overlays: draft.overlays,
          lang: draft.lang,
          tz_offset_min: draft.tzOffsetMin,
        }),
      ),
    remove: async (storyId) =>
      (await call("/rest/v1/rpc/companion_delete_my_story", { p_story_id: storyId })) !== null,
    setKeep: async (keep) =>
      keepFrom(await call("/rest/v1/rpc/companion_set_keep_my_stories", { p_keep: keep })),
  };
}
