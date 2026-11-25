// 내 스토리 서버 응답을 앱 모양으로 풉니다(ADR-0194 · ADR-0191 — 모양은 `@libitums/companion-contract` my-stories). 순수 · 던지지
// 않습니다. 틀린 줄 · 반응은 버리고, 몸이 틀리면 null(못 읽음). 사진(`photo`) · 확인 중(`checking`) 스토리는 이 앱 판이 그리지 않아 건너뜁니다.
// 글 스토리(`text`) · `kinds` · 글 검수의 `crisis`는 서버 반영 예상 칸입니다(ADR-0194 적용 기록).

import { crisisOf } from "./companion-parse";
import type {
  MyStoriesState,
  MyStory,
  MyStoryExample,
  MyStoryOverlay,
  MyStoryPostKind,
  MyStoryPostResult,
  MyStoryReaction,
  MyStorySeen,
  MyStoryWindow,
  StoryBackground,
  StoryTextColor,
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
  return {
    id,
    characterId,
    messageId: text(raw["messageId"]),
    text: reply,
    meaning: text(raw["meaning"]),
    at,
  };
}

function seenOf(raw: unknown): MyStorySeen | null {
  if (!isRecord(raw)) return null;
  const characterId = text(raw["characterId"]);
  const at = time(raw["at"]);
  return characterId === null || at === null ? null : { characterId, at };
}

const SLOTS = new Set(["morning", "day", "night"]);

/** 올리기 창(ADR-0191 D8) — 칸이 틀리면 null(창 판정 없이 「+」). */
export function myStoryWindowOf(raw: unknown): MyStoryWindow | null {
  if (!isRecord(raw)) return null;
  const slot = raw["slot"];
  const day = text(raw["day"]);
  const nextAt = time(raw["nextAt"]);
  if (typeof slot !== "string" || !SLOTS.has(slot) || day === null || nextAt === null) return null;
  if (typeof raw["used"] !== "boolean") return null;
  return { slot: slot as MyStoryWindow["slot"], day, nextAt, used: raw["used"] };
}

const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const BACKGROUNDS = new Set(["orange", "green", "blue", "purple"]);
const KINDS = new Set(["word", "card", "text", "photo"]);
const INKS = new Set(["brown", "black", "white", "orange"]);

/** 얹은 단어 · 카드 · 글(계약 `myStoryOverlaySchema`) — 한국어 · 위치가 틀리면 버립니다. */
function overlayOf(raw: unknown): MyStoryOverlay | null {
  if (!isRecord(raw)) return null;
  const kind = raw["kind"];
  const ko = text(raw["ko"]);
  const x = number(raw["x"]);
  const y = number(raw["y"]);
  if ((kind !== "word" && kind !== "card" && kind !== "text") || ko === null) return null;
  if (x === null || y === null) return null;
  const roman = text(raw["roman"]);
  const meaning = text(raw["meaning"]);
  const word = isRecord(raw["word"]) ? raw["word"] : null;
  const episodeId = text(word?.["episodeId"]);
  const ref = text(word?.["ref"]);
  return {
    kind,
    ko,
    ...(roman === null ? {} : { roman }),
    ...(meaning === null ? {} : { meaning }),
    ...(episodeId === null || ref === null ? {} : { word: { episodeId, ref } }),
    ...(typeof raw["color"] === "string" && INKS.has(raw["color"])
      ? { color: raw["color"] as StoryTextColor }
      : {}),
    x,
    y,
    scale: number(raw["scale"]) ?? 1,
    rotation: number(raw["rotation"]) ?? 0,
  };
}

export function myStoryOf(raw: unknown): MyStory | null {
  if (!isRecord(raw)) return null;
  // 확인 중 사진(ADR-0191 D11)은 올린 사람에게만 보이고 반응이 없습니다 — 사진 화면 전이라 건너뜁니다.
  if (raw["status"] !== undefined && raw["status"] !== "live") return null;
  const id = text(raw["id"]);
  // 글 스토리(`text`, 서버 반영 예상)는 단어 없이 바탕 · 한 줄 · 얹은 것으로 섭니다. 사진은 건너뜁니다.
  const isText = raw["kind"] === "text";
  const kind: MyStory["kind"] | null =
    raw["kind"] === "word" || raw["kind"] === "card" || raw["kind"] === "text" ? raw["kind"] : null;
  const word = isRecord(raw["word"]) ? raw["word"] : null;
  const episodeId = text(word?.["episodeId"]);
  const ref = text(word?.["ref"]);
  const ko = text(raw["ko"]);
  const meaning = isText
    ? typeof raw["meaning"] === "string"
      ? raw["meaning"]
      : ""
    : text(raw["meaning"]);
  const postedAt = time(raw["postedAt"]);
  const expiresAt = time(raw["expiresAt"]);
  if (id === null || kind === null || (!isText && (episodeId === null || ref === null)))
    return null;
  if (ko === null || meaning === null || postedAt === null || expiresAt === null) return null;
  const background = raw["background"];
  const reactions = Array.isArray(raw["reactions"])
    ? raw["reactions"].map(reactionOf).filter((r): r is MyStoryReaction => r !== null)
    : [];
  return {
    id,
    kind,
    word: episodeId === null || ref === null ? null : { episodeId, ref },
    ko,
    roman: typeof raw["roman"] === "string" ? raw["roman"] : "",
    meaning,
    example: exampleOf(raw["example"]),
    postedAt,
    expiresAt,
    reactions,
    seenBy: Array.isArray(raw["seenBy"])
      ? raw["seenBy"].map(seenOf).filter((s): s is MyStorySeen => s !== null)
      : [],
    // 모르는 바탕색은 기본(orange)으로 — 글 스토리가 아니면 null.
    background: !isText
      ? null
      : typeof background === "string" && BACKGROUNDS.has(background)
        ? (background as StoryBackground)
        : "orange",
    overlays: Array.isArray(raw["overlays"])
      ? raw["overlays"].map(overlayOf).filter((o): o is MyStoryOverlay => o !== null)
      : [],
  };
}

/** 올릴 수 있는 종류(서버 반영 예상) — 칸이 없으면 지금 서버의 word · card, 모르는 종류는 버림. */
function kindsOf(raw: unknown): readonly MyStoryPostKind[] {
  if (!Array.isArray(raw)) return ["word", "card"];
  return raw.filter((kind): kind is MyStoryPostKind => typeof kind === "string" && KINDS.has(kind));
}

/** `companion_my_stories()` — `enabled`가 없으면 꺼진 것으로, `keep`이 없으면 켠 것으로 읽습니다. */
export function myStoriesFrom(body: string | null): MyStoriesState | null {
  const value = parsed(body);
  if (!isRecord(value)) return null;
  const stories = Array.isArray(value["stories"])
    ? value["stories"].map(myStoryOf).filter((s): s is MyStory => s !== null)
    : [];
  return {
    enabled: value["enabled"] === true,
    keep: value["keep"] !== false,
    stories,
    window: myStoryWindowOf(value["window"]),
    kinds: kindsOf(value["kinds"]),
  };
}

/** `companion_post_my_story(…)` — `window_used`는 다음 창과 함께. 모르는 결과 · `invalid` · 스토리 없는 ok는 failed. */
export function myStoryPostFrom(body: string | null): MyStoryPostResult {
  const value = parsed(body);
  if (!isRecord(value)) return { result: "failed" };
  const result = value["result"];
  if (result === "off" || result === "daily_limit" || result === "text_blocked") return { result };
  if (result === "crisis") return { result, resources: crisisOf(value) ?? [] };
  const window = myStoryWindowOf(value["window"]);
  if (result === "window_used") return { result, window };
  if (result !== "ok") return { result: "failed" };
  const story = myStoryOf(value["story"]);
  return story === null ? { result: "failed" } : { result: "ok", story, window };
}
