// 내 스토리 서버 응답을 앱 모양으로 풉니다(ADR-0179). 순수 · 던지지 않습니다. 틀린 줄 · 반응은 버리고, 몸이 틀리면 null(못 읽음).

import type {
  MyStoriesState,
  MyStory,
  MyStoryExample,
  MyStoryPostResult,
  MyStoryReaction,
} from "./my-stories.contract";

type Raw = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;
const time = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

function parsed(body: string | null): unknown {
  if (body === null) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function exampleOf(raw: unknown): MyStoryExample | null {
  if (!isRecord(raw)) return null;
  const ko = text(raw["ko"]);
  return ko === null
    ? null
    : { ko, meaning: typeof raw["meaning"] === "string" ? raw["meaning"] : "" };
}

function reactionOf(raw: unknown): MyStoryReaction | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"]);
  const characterId = text(raw["characterId"]);
  const reply = text(raw["text"]);
  const at = time(raw["at"]);
  if (id === null || characterId === null || reply === null || at === null) return null;
  return { id, characterId, text: reply, meaning: text(raw["meaning"]), at };
}

export function myStoryOf(raw: unknown): MyStory | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"]);
  const kind = raw["kind"] === "word" || raw["kind"] === "card" ? raw["kind"] : null;
  const word = isRecord(raw["word"]) ? raw["word"] : null;
  const episodeId = text(word?.["episodeId"]);
  const ref = text(word?.["ref"]);
  const ko = text(raw["ko"]);
  const meaning = text(raw["meaning"]);
  const postedAt = time(raw["postedAt"]);
  const expiresAt = time(raw["expiresAt"]);
  if (id === null || kind === null || episodeId === null || ref === null) return null;
  if (ko === null || meaning === null || postedAt === null || expiresAt === null) return null;
  const reactions = Array.isArray(raw["reactions"])
    ? raw["reactions"].map(reactionOf).filter((r): r is MyStoryReaction => r !== null)
    : [];
  return {
    id,
    kind,
    word: { episodeId, ref },
    ko,
    roman: typeof raw["roman"] === "string" ? raw["roman"] : "",
    meaning,
    example: exampleOf(raw["example"]),
    postedAt,
    expiresAt,
    reactions,
  };
}

/** `companion_my_stories()` — `enabled`가 없으면 꺼진 것으로, `keep`이 없으면 켠 것으로 읽습니다. */
export function myStoriesFrom(body: string | null): MyStoriesState | null {
  const value = parsed(body);
  if (!isRecord(value)) return null;
  const stories = Array.isArray(value["stories"])
    ? value["stories"].map(myStoryOf).filter((s): s is MyStory => s !== null)
    : [];
  return { enabled: value["enabled"] === true, keep: value["keep"] !== false, stories };
}

/** `companion_post_my_story(…)` — 모르는 결과 · 스토리 없는 ok는 failed. */
export function myStoryPostFrom(body: string | null): MyStoryPostResult {
  const value = parsed(body);
  if (!isRecord(value)) return { result: "failed" };
  const result = value["result"];
  if (result === "off" || result === "daily_limit") return { result };
  if (result !== "ok") return { result: "failed" };
  const story = myStoryOf(value["story"]);
  return story === null ? { result: "failed" } : { result: "ok", story };
}
