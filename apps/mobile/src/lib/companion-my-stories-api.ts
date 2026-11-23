// 내 스토리 RPC(ADR-0179) — 대화 원격과 같은 토큰 · 전송(`call`)을 씁니다. 함수가 없는 서버(배포 전)는 404 → null · failed.

import type { CompanionMyStoriesRemote } from "../screens/messenger-chat/chat-remote.contract";
import { myStoriesFrom, myStoryPostFrom } from "../screens/messenger-chat/my-stories-parse";

type Call = (path: string, body: unknown) => Promise<string | null>;

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
    list: async () => myStoriesFrom(await call("/rest/v1/rpc/companion_my_stories", {})),
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
        }),
      ),
    remove: async (storyId) =>
      (await call("/rest/v1/rpc/companion_delete_my_story", { p_story_id: storyId })) !== null,
    setKeep: async (keep) =>
      keepFrom(await call("/rest/v1/rpc/companion_set_keep_my_stories", { p_keep: keep })),
  };
}
