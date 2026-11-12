// 서버에서 읽은 표 → 학습자 행 → 캠페인 대상 · 대조군 · 문구입니다. 순수 함수만 둡니다.

import {
  classifyLearner,
  hourWithin,
  inHoldout,
  isStreakAtRisk,
  languageFor,
  localClock,
  reengagementOverlap,
  renderCopy,
  streakFrom,
  timeZoneFor,
} from "./segments.mjs";

const HOUR_MS = 60 * 60 * 1000;

/**
 * 푸시를 받을 수 있는 학습자 행을 만듭니다. 기기가 없는 사용자 · 시험 계정은 뺍니다.
 * @param {{
 *   devices: { user_id: string, last_active_at: string }[],
 *   profiles: { user_id: string, name?: string | null, country_code?: string | null }[],
 *   progress: { user_id: string, cp?: Record<string, string[]> | null }[],
 *   days: { user_id: string, day: string }[],
 *   testers: ReadonlySet<string>,
 *   catalog: ReturnType<typeof import("./segments.mjs").episodeCatalog>,
 *   nowMs: number,
 * }} input
 */
export function buildLearners({ devices, profiles, progress, days, testers, catalog, nowMs }) {
  const lastActive = new Map();
  for (const device of devices) {
    const at = Date.parse(device.last_active_at);
    if (!Number.isFinite(at)) continue;
    lastActive.set(device.user_id, Math.max(lastActive.get(device.user_id) ?? 0, at));
  }
  const profileOf = new Map(profiles.map((row) => [row.user_id, row]));
  const progressOf = new Map(progress.map((row) => [row.user_id, row.cp ?? null]));
  const daysOf = new Map();
  for (const row of days) {
    const list = daysOf.get(row.user_id) ?? [];
    list.push(row.day);
    daysOf.set(row.user_id, list);
  }

  const learners = [];
  for (const [userId, lastActiveMs] of lastActive) {
    if (testers.has(userId)) continue;
    const profile = profileOf.get(userId) ?? {};
    const country = profile.country_code ? String(profile.country_code).toUpperCase() : null;
    const timeZone = timeZoneFor(country);
    const clock = localClock(nowMs, timeZone ?? "UTC");
    const streak = streakFrom(daysOf.get(userId) ?? [], clock.date);
    const place = classifyLearner(progressOf.get(userId), catalog);
    learners.push({
      userId,
      name: profile.name ?? "",
      country,
      lang: languageFor(country),
      timeZone,
      localDate: clock.date,
      localHour: timeZone === null ? null : clock.hour,
      lastActiveMs,
      idleHours: Math.max(0, (nowMs - lastActiveMs) / HOUR_MS),
      ...place,
      streak: streak.current,
      studiedToday: streak.studiedToday,
      atRisk: isStreakAtRisk(streak),
    });
  }
  return learners;
}

/** 세그먼트에 드는지만 봅니다(필터 전). */
export const inSegment = (learner, segment) =>
  segment === "streak-at-risk" ? learner.atRisk : learner.segment === segment;

/**
 * 캠페인 조건으로 대상을 고릅니다. 빠진 이유를 셉니다.
 * @param {{
 *   segment: string,
 *   minIdleHours?: number, maxIdleHours?: number | null,
 *   localHours?: [number, number] | null,
 *   excludeReengagement?: boolean,
 *   cooldownHours?: number,
 * }} filter
 * @param {{ nowMs: number, lastConsoleSendMs: ReadonlyMap<string, number> }} context
 */
export function selectAudience(learners, filter, { nowMs, lastConsoleSendMs }) {
  const excluded = {
    idle: 0,
    "no-time-zone": 0,
    "local-hour": 0,
    reengagement: 0,
    "recent-console": 0,
  };
  const eligible = [];
  const minIdle = filter.minIdleHours ?? 0;
  const maxIdle = filter.maxIdleHours ?? null;
  const cooldownMs = (filter.cooldownHours ?? 24) * HOUR_MS;
  let inSegmentCount = 0;
  const hourCandidates = [];

  for (const learner of learners) {
    if (!inSegment(learner, filter.segment)) continue;
    inSegmentCount += 1;
    if (learner.idleHours < minIdle || (maxIdle !== null && learner.idleHours > maxIdle)) {
      excluded.idle += 1;
      continue;
    }
    if (learner.timeZone !== null) hourCandidates.push(learner);
    if (filter.localHours) {
      if (learner.localHour === null) {
        excluded["no-time-zone"] += 1;
        continue;
      }
      if (!hourWithin(learner.localHour, filter.localHours)) {
        excluded["local-hour"] += 1;
        continue;
      }
    }
    if (filter.excludeReengagement !== false && reengagementOverlap(learner.lastActiveMs, nowMs)) {
      excluded.reengagement += 1;
      continue;
    }
    const lastSent = lastConsoleSendMs.get(learner.userId);
    if (lastSent !== undefined && nowMs - lastSent < cooldownMs) {
      excluded["recent-console"] += 1;
      continue;
    }
    eligible.push(learner);
  }
  return { inSegment: inSegmentCount, eligible, excluded, hourCandidates };
}

/**
 * 앞으로 24시간, 정시마다 현지 시각 창에 드는 사람 수입니다(쉰 시간 조건을 지금 값으로 고정한 어림 —
 * 겹침 · 쉬는 시간은 보지 않음). 직접 돌리는 도구라 「언제 돌리면 되나」를 보여 주려는 것입니다.
 */
export function hourForecast(candidates, window, nowMs) {
  if (!window) return [];
  const firstHour = Math.ceil(nowMs / HOUR_MS) * HOUR_MS;
  return Array.from({ length: 24 }, (_, offset) => {
    const atMs = firstHour + offset * HOUR_MS;
    const count = candidates.filter((learner) =>
      hourWithin(localClock(atMs, learner.timeZone).hour, window),
    ).length;
    return { atMs, count };
  });
}

export const TITLE_MAX = 100;
export const BODY_MAX = 500;

/** 언어별 문구에서 쓸 것을 고릅니다. 없으면 영어입니다. */
export const copyFor = (copy, lang) =>
  copy[lang]?.title && copy[lang]?.body ? copy[lang] : copy.en;

/** 한 사람에게 갈 제목 · 본문입니다. */
export function messageFor(learner, copy) {
  const chosen = copyFor(copy, learner.lang);
  const vars = {
    name: learner.name,
    episode: learner.episodeTitle ?? "",
    streak: learner.streak,
    steps: learner.remainingSteps,
  };
  return {
    lang: copy[learner.lang]?.title ? learner.lang : "en",
    title: renderCopy(chosen.title, vars),
    body: renderCopy(chosen.body, vars),
  };
}

/** 문구 문제를 사람이 읽을 문장으로 돌려줍니다. 없으면 빈 배열입니다. */
export function copyProblems(copy) {
  const problems = [];
  if (!copy?.en?.title || !copy?.en?.body)
    problems.push("영어(en) 제목 · 본문은 꼭 있어야 합니다.");
  for (const [lang, entry] of Object.entries(copy ?? {})) {
    if (!entry?.title && !entry?.body) continue;
    if (!entry.title || !entry.body)
      problems.push(`${lang}: 제목과 본문을 둘 다 적거나 둘 다 비워 주세요.`);
    if ((entry.title ?? "").length > TITLE_MAX - 20)
      problems.push(`${lang}: 제목이 너무 깁니다(이름을 넣으면 ${TITLE_MAX}자를 넘을 수 있음).`);
    if ((entry.body ?? "").length > BODY_MAX - 40) problems.push(`${lang}: 본문이 너무 깁니다.`);
  }
  return problems;
}

/**
 * 대상 → 발송 · 대조군 나누기 + 사람마다 문구입니다. 대조군도 같은 문구를 기록합니다(받지 않을 뿐).
 * @returns {{ userId: string, group: "sent" | "control", segment: string, lang: string, timeZone: string | null,
 *   localDate: string, lastActiveMs: number, title: string, body: string }[]}
 */
export function planRecipients({ campaignId, eligible, holdoutPercent, copy }) {
  return eligible.map((learner) => {
    const message = messageFor(learner, copy);
    return {
      userId: learner.userId,
      group: inHoldout(campaignId, learner.userId, holdoutPercent) ? "control" : "sent",
      segment: learner.segment,
      episodeId: learner.episodeId,
      streak: learner.streak,
      lang: message.lang,
      timeZone: learner.timeZone,
      localDate: learner.localDate,
      lastActiveMs: learner.lastActiveMs,
      title: message.title,
      body: message.body,
    };
  });
}

/** 세그먼트 × 언어 · 쉰 시간 구간 요약입니다(첫 화면 표). */
export function summarize(learners, segments) {
  const idleBucket = (hours) =>
    hours < 24 ? "<1d" : hours < 72 ? "1-3d" : hours < 168 ? "3-7d" : "7d+";
  return segments.map((segment) => {
    const rows = learners.filter((learner) => inSegment(learner, segment.id));
    const byIdle = { "<1d": 0, "1-3d": 0, "3-7d": 0, "7d+": 0 };
    const byLang = {};
    for (const row of rows) {
      byIdle[idleBucket(row.idleHours)] += 1;
      byLang[row.lang] = (byLang[row.lang] ?? 0) + 1;
    }
    return { ...segment, total: rows.length, byIdle, byLang };
  });
}
