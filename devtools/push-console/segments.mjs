// 푸시 콘솔의 순수 판정입니다 — 진행 단계 세그먼트 · 연속 학습 · 현지 시각 · 문구 언어 · 겹침 · 대조군.
// 입출력은 없습니다(sources.mjs가 읽고, server.mjs가 묶습니다).

const DAY_MS = 24 * 60 * 60 * 1000;

/** 세그먼트 목록입니다. `progress`는 사용자마다 하나, `overlay`는 진행 단계와 겹쳐 붙습니다. */
export const SEGMENTS = [
  {
    id: "tutorial-cover",
    kind: "progress",
    label: "표지도 안 봄",
    hint: "튜토리얼 표지를 열지 않았다",
  },
  {
    id: "tutorial-lesson1",
    kind: "progress",
    label: "컷까지 보고 레슨 1을 안 엶",
    hint: "표지(intro)는 있고 S1이 없다",
  },
  {
    id: "tutorial-lesson2",
    kind: "progress",
    label: "레슨 1만 함 (레슨 2에서 막힘)",
    hint: "S1은 있고 S2가 없다",
  },
  {
    id: "tutorial-rest",
    kind: "progress",
    label: "튜토리얼 중간",
    hint: "S2는 있고 파이널(RP)이 없다",
  },
  {
    id: "episode-next",
    kind: "progress",
    label: "다음 에피소드를 시작 안 함",
    hint: "튜토리얼 또는 앞 에피소드를 끝냈고 다음 에피소드 진행이 비었다",
  },
  {
    id: "episode-mid",
    kind: "progress",
    label: "에피소드 진행 중",
    hint: "시작한 에피소드의 파이널이 없다",
  },
  {
    id: "all-done",
    kind: "progress",
    label: "나온 에피소드를 다 끝냄",
    hint: "모든 에피소드에 RP가 있다",
  },
  {
    id: "streak-at-risk",
    kind: "overlay",
    label: "스트릭이 끊기기 직전",
    hint: "연속 2일 이상 · 현지 오늘 아직 학습 없음",
  },
];

export const SEGMENT_IDS = new Set(SEGMENTS.map((segment) => segment.id));

/**
 * 매니페스트 + 에피소드 JSON → 순서대로 놓인 카탈로그입니다.
 * @param {{ episodes: { id: string, order: number }[] }} manifest
 * @param {Record<string, { title_en?: string, title?: string, steps?: { id: string }[] }>} episodesById
 */
export function episodeCatalog(manifest, episodesById) {
  return [...manifest.episodes]
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const episode = episodesById[entry.id] ?? {};
      return {
        id: entry.id,
        order: entry.order,
        title: episode.title_en || episode.title || entry.id,
        steps: (episode.steps ?? []).map((step) => step.id),
        character: typeof episode.counterpart === "string" ? episode.counterpart : "",
      };
    });
}

const hasKey = (keys, key) => Array.isArray(keys) && keys.includes(key);

/**
 * 카탈로그 진행(`progress.catalogProgress`) → 진행 단계 세그먼트입니다. 첫 에피소드가 튜토리얼입니다.
 * @returns {{ segment: string, episodeId: string | null, episodeTitle: string | null, remainingSteps: number }}
 */
export function classifyLearner(catalogProgress, catalog) {
  const progress = catalogProgress && typeof catalogProgress === "object" ? catalogProgress : {};
  const [tutorial, ...episodes] = catalog;
  const tutorialKeys = progress[tutorial.id] ?? [];
  const remainingOf = (episode, keys) => episode.steps.filter((step) => !hasKey(keys, step)).length;
  const at = (segment, episode, keys) => ({
    segment,
    episodeId: episode.id,
    episodeTitle: episode.title,
    character: episode.character ?? "",
    remainingSteps: remainingOf(episode, keys),
  });

  if (!hasKey(tutorialKeys, "intro")) return at("tutorial-cover", tutorial, tutorialKeys);
  if (!hasKey(tutorialKeys, "S1")) return at("tutorial-lesson1", tutorial, tutorialKeys);
  if (!hasKey(tutorialKeys, "S2")) return at("tutorial-lesson2", tutorial, tutorialKeys);
  if (!hasKey(tutorialKeys, "RP")) return at("tutorial-rest", tutorial, tutorialKeys);

  const current = episodes.find((episode) => !hasKey(progress[episode.id], "RP"));
  if (current === undefined)
    return {
      segment: "all-done",
      episodeId: null,
      episodeTitle: null,
      character: "",
      remainingSteps: 0,
    };
  const keys = progress[current.id] ?? [];
  return at(keys.length === 0 ? "episode-next" : "episode-mid", current, keys);
}

/** `YYYY-MM-DD`에 하루를 더하거나 뺍니다. */
export function shiftDay(day, delta) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/**
 * 학습한 날 목록 → 연속 학습입니다. 오늘 했으면 오늘까지, 아니면 어제까지 이어진 날 수입니다.
 * @param {readonly string[]} days `YYYY-MM-DD`
 * @param {string} today 사용자 현지 날짜
 */
export function streakFrom(days, today) {
  const set = new Set(days);
  const studiedToday = set.has(today);
  const yesterday = shiftDay(today, -1);
  const studiedYesterday = set.has(yesterday);
  let cursor = studiedToday ? today : yesterday;
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }
  return { current, studiedToday, studiedYesterday };
}

/** 연속이 2일 이상인데 오늘 아직 안 했으면 끊기기 직전입니다. */
export const isStreakAtRisk = (streak) => streak.current >= 2 && !streak.studiedToday;

/** 나라 → 대표 시간대입니다. 여러 시간대인 나라는 사람이 가장 많은 쪽입니다. 없는 나라는 `null`. */
export const COUNTRY_TIME_ZONES = {
  AE: "Asia/Dubai",
  AF: "Asia/Kabul",
  AL: "Europe/Tirane",
  AR: "America/Argentina/Buenos_Aires",
  AT: "Europe/Vienna",
  AU: "Australia/Sydney",
  BD: "Asia/Dhaka",
  BR: "America/Sao_Paulo",
  CA: "America/Toronto",
  CL: "America/Santiago",
  CN: "Asia/Shanghai",
  CO: "America/Bogota",
  DE: "Europe/Berlin",
  DZ: "Africa/Algiers",
  EG: "Africa/Cairo",
  ES: "Europe/Madrid",
  FR: "Europe/Paris",
  GB: "Europe/London",
  HK: "Asia/Hong_Kong",
  ID: "Asia/Jakarta",
  IN: "Asia/Kolkata",
  IT: "Europe/Rome",
  JP: "Asia/Tokyo",
  KE: "Africa/Nairobi",
  KH: "Asia/Phnom_Penh",
  KR: "Asia/Seoul",
  LK: "Asia/Colombo",
  MM: "Asia/Yangon",
  MX: "America/Mexico_City",
  MY: "Asia/Kuala_Lumpur",
  NG: "Africa/Lagos",
  NP: "Asia/Kathmandu",
  PE: "America/Lima",
  PH: "Asia/Manila",
  PK: "Asia/Karachi",
  RU: "Europe/Moscow",
  SA: "Asia/Riyadh",
  SG: "Asia/Singapore",
  TH: "Asia/Bangkok",
  TR: "Europe/Istanbul",
  TW: "Asia/Taipei",
  US: "America/New_York",
  UZ: "Asia/Tashkent",
  VN: "Asia/Ho_Chi_Minh",
};

export const timeZoneFor = (countryCode) =>
  (countryCode && COUNTRY_TIME_ZONES[String(countryCode).toUpperCase()]) || null;

const clockFormats = new Map();

/** 시각 → 그 시간대의 날짜 · 시(0~23)입니다. */
export function localClock(nowMs, timeZone) {
  let format = clockFormats.get(timeZone);
  if (format === undefined) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    clockFormats.set(timeZone, format);
  }
  const parts = format.formatToParts(new Date(nowMs));
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return { date: `${part("year")}-${part("month")}-${part("day")}`, hour: Number(part("hour")) };
}

/** 시 창 안인지 봅니다. `[from, to)`이고, `from > to`면 자정을 넘는 창입니다. */
export function hourWithin(hour, window) {
  if (window === null || window === undefined) return true;
  const [from, to] = window;
  if (from === to) return true;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

export const LANGUAGES = ["en", "vi", "id", "ms", "es", "ja"];

const SPANISH = new Set("AR BO CL CO CR CU DO EC ES GT HN MX NI PA PE PR PY SV UY VE".split(" "));

/** 나라 → 문구 언어입니다. 서버는 앱 UI 언어를 모릅니다 — 나머지는 영어입니다. */
export function languageFor(countryCode) {
  const code = String(countryCode ?? "").toUpperCase();
  if (code === "VN") return "vi";
  if (code === "ID") return "id";
  if (code === "MY") return "ms";
  if (code === "JP") return "ja";
  if (SPANISH.has(code)) return "es";
  return "en";
}

/** 매일 10:00 UTC 「다시 돌아오기」 cron(ADR-0034 D5)의 직전 · 다음 실행 시각입니다. */
export function reengagementRuns(nowMs) {
  const today = new Date(nowMs);
  const run = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 10);
  return run <= nowMs ? [run, run + DAY_MS] : [run - DAY_MS, run];
}

/**
 * 앞뒤 24시간 안의 cron이 이 사용자에게 3일 · 7일 알림을 보냈거나 보낼지 봅니다.
 * RPC는 「마지막으로 연 때가 정확히 n일 전 하루 안」을 고릅니다.
 */
export function reengagementOverlap(lastActiveMs, nowMs) {
  return reengagementRuns(nowMs).some((run) => {
    if (lastActiveMs > run) return false;
    const idleDays = (run - lastActiveMs) / DAY_MS;
    return (idleDays >= 3 && idleDays < 4) || (idleDays >= 7 && idleDays < 8);
  });
}

/** FNV-1a 32비트 — 캠페인 · 사용자마다 늘 같은 칸에 떨어집니다. */
function hash32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** 대조군(보내지 않음)이면 `true`입니다. `percent`는 0~90. */
/** 문구 변형 칸(0 ~ n-1)입니다. 대조군 배정과 다른 키를 써서 서로 섞이지 않습니다. */
export const variantIndexOf = (campaignId, userId, count) =>
  count <= 1 ? 0 : hash32(`variant:${campaignId}:${userId}`) % count;

export const inHoldout = (campaignId, userId, percent) =>
  hash32(`${campaignId}:${userId}`) % 10000 < Math.round(percent * 100);

/** 사용자가 적은 이름을 문구에 넣을 수 있게 다듬습니다 — 첫 단어 · 첫 글자 대문자 · 제어 문자 제거 · 20자. */
export function cleanName(name) {
  const [first = ""] = String(name ?? "")
    .replace(/[\p{C}{}]/gu, "")
    .trim()
    .split(/\s+/u);
  const text = first.charAt(0).toUpperCase() + first.slice(1);
  return [...text].slice(0, 20).join("");
}

/**
 * 문구 자리표시를 채웁니다 — `{name}` `{episode}` `{character}` `{streak}` `{steps}`.
 * 이름이 없으면 `{name}`과 붙은 쉼표 · 「さん」을 함께 지우고 첫 글자를 대문자로 올립니다.
 */
export function renderCopy(template, vars) {
  let text = String(template);
  const name = cleanName(vars.name);
  if (name === "") {
    text = text
      .replace(/\{name\}(さん)?\s*[,、]\s*/gu, "")
      .replace(/\s*[,、]?\s*\{name\}(さん)?/gu, "");
    text = text.charAt(0).toUpperCase() + text.slice(1);
  } else {
    text = text.replaceAll("{name}", name);
  }
  // 인물 이름이 없으면(다 끝낸 사람) 「{character}: 」 머리말째 지웁니다.
  const character = String(vars.character ?? "").trim();
  if (character === "") {
    text = text.replace(/\{character\}\s*[:：]\s*/gu, "").replaceAll("{character}", "");
  } else {
    text = text.replaceAll("{character}", character);
  }
  return text
    .replaceAll("{episode}", String(vars.episode ?? ""))
    .replaceAll("{streak}", String(vars.streak ?? ""))
    .replaceAll("{steps}", String(vars.steps ?? ""))
    .trim();
}

/** 같은 제목 · 본문끼리 묶어 1,000명씩 자릅니다(`send-push` announcement의 상한). */
export function batchesByMessage(messages, size = 1000) {
  const groups = new Map();
  for (const message of messages) {
    const key = `${message.title}\u0000${message.body}`;
    const group = groups.get(key) ?? { title: message.title, body: message.body, userIds: [] };
    group.userIds.push(message.userId);
    groups.set(key, group);
  }
  const batches = [];
  for (const group of groups.values()) {
    for (let start = 0; start < group.userIds.length; start += size) {
      batches.push({
        title: group.title,
        body: group.body,
        userIds: group.userIds.slice(start, start + size),
      });
    }
  }
  return batches;
}
