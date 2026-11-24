// `companion_friend_stories()` 응답을 앱의 스토리로 풉니다(ADR-0178 D2). 순수 · 던지지 않습니다.
// 모양이 틀린 줄은 버리고(나머지는 남김), 몸이 틀리면 null(못 읽음 — 스토리 없음과 같음)입니다.

import type { LocalizedLine } from "./friend-catalog.contract";
import type { ChatMessage } from "./chat-source.contract";
import type { ChatStoryQuote, FriendStory, FriendStoryWord } from "./friend-stories.contract";

const MAX_REPLIES = 3;
const MEANING_LANGUAGES = ["es", "id", "ja", "vi", "th", "my"] as const;

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

function meaningOf(raw: unknown): LocalizedLine | null {
  if (!isRecord(raw)) return null;
  const en = text(raw["en"]);
  if (en === null) return null;
  const line: Record<string, string> = { en };
  for (const language of MEANING_LANGUAGES) {
    const value = text(raw[language]);
    if (value !== null) line[language] = value;
  }
  return line as LocalizedLine;
}

/** 없음(null) → null, 모양이 틀리면 undefined(줄을 버림). */
function wordOf(raw: unknown): FriendStoryWord | null | undefined {
  if (raw === null || raw === undefined) return null;
  if (!isRecord(raw)) return undefined;
  const episodeId = text(raw["episodeId"]);
  const ref = text(raw["ref"]);
  return episodeId === null || ref === null ? undefined : { episodeId, ref };
}

function storyOf(raw: unknown): FriendStory | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"]);
  const characterId = text(raw["characterId"]);
  const postedAt = time(raw["postedAt"]);
  const expiresAt = time(raw["expiresAt"]);
  const imagePath = text(raw["imagePath"]);
  const line = isRecord(raw["line"]) ? raw["line"] : null;
  const ko = text(line?.["ko"]);
  const roman = typeof line?.["roman"] === "string" ? line["roman"] : "";
  const meaning = meaningOf(line?.["meaning"]);
  const word = wordOf(raw["word"]);
  if (id === null || characterId === null || postedAt === null || expiresAt === null) return null;
  if (imagePath === null || ko === null || meaning === null || word === undefined) return null;
  const replies = Array.isArray(raw["replies"])
    ? raw["replies"].filter((reply): reply is string => typeof reply === "string" && reply !== "")
    : [];
  return {
    id,
    characterId,
    postedAt,
    expiresAt,
    imagePath,
    line: { ko, roman, meaning },
    word,
    replies: replies.slice(0, MAX_REPLIES),
    freeReply: raw["freeReply"] === true,
  };
}

export function friendStoriesFrom(body: string | null): readonly FriendStory[] | null {
  if (body === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed["stories"])) return null;
  const stories: FriendStory[] = [];
  for (const raw of parsed["stories"]) {
    const story = storyOf(raw);
    if (story !== null) stories.push(story);
  }
  return stories;
}

/** 내 글의 스토리 인용(`message_json.story`, ADR-0178 D5) — id · 인물 · 한 줄이 없으면 빈 칸(인용 없음). 그림 · 시각은 없어도 됩니다. */
export function storyQuoteOf(raw: unknown): { readonly story?: ChatStoryQuote } {
  if (!isRecord(raw)) return {};
  // 지운 내 스토리(ADR-0179) — 인물만 남습니다(「Deleted story」).
  if (raw["kind"] === "deleted") {
    const who = text(raw["characterId"]);
    return who === null
      ? {}
      : {
          story: {
            storyId: "",
            characterId: who,
            line: "",
            imagePath: null,
            postedAt: null,
            kind: "deleted",
          },
        };
  }
  const storyId = text(raw["id"]);
  const characterId = text(raw["characterId"]);
  const line = text(raw["line"]);
  if (storyId === null || characterId === null || line === null) return {};
  return {
    story: {
      storyId,
      characterId,
      line,
      imagePath: text(raw["imagePath"]),
      postedAt: time(raw["postedAt"]),
      ...(raw["kind"] === "mine" ? { kind: "mine" as const } : {}),
    },
  };
}

/** 서버 기록의 내 글 한 줄 — 스토리 답장이면 인용이 함께 섭니다(`companion-parse`가 씁니다). */
export function myTextOf(id: string, at: number, text: string, story: unknown): ChatMessage {
  return { id, at, kind: "text", from: "me", text: { ko: text, en: "" }, ...storyQuoteOf(story) };
}
