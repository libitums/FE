// 단계별 예고 푸시(버킷 `content/push/level-5/`, 스키마 push-1)의 순수 판정입니다 — ADR-0130 D11.
// 사람마다 「마지막으로 끝낸 단계」의 `after[단계]` 문구 중 훅 하나를 고릅니다. 입출력은 없습니다.

import { variantIndexOf } from "./segments.mjs";

/** 예고 문구의 언어입니다. 말레이시아는 말레이어가 없어 가까운 인도네시아어(사용자 결정 2026-11-13). */
export const STORY_LANGUAGES = ["en", "vi", "id", "ja", "es", "th", "my", "ko"];

const SPANISH = new Set("AR BO CL CO CR CU DO EC ES GT HN MX NI PA PE PR PY SV UY VE".split(" "));

/** 나라 → 예고 문구 언어입니다. `my`는 미얀마어입니다. 한국에 있는 사람도 학습자라 영어입니다. */
export function storyLanguageFor(countryCode) {
  const code = String(countryCode ?? "").toUpperCase();
  if (code === "VN") return "vi";
  if (code === "ID" || code === "MY") return "id";
  if (code === "JP") return "ja";
  if (code === "TH") return "th";
  if (code === "MM") return "my";
  if (SPANISH.has(code)) return "es";
  return "en";
}

/**
 * 카탈로그 진행 → 예고할 자리입니다. 지금 에피소드(파이널이 없는 첫 에피소드)에서 단계 순서상 마지막으로 끝낸 단계,
 * 지금 에피소드를 아직 시작 안 했으면 앞 에피소드의 파이널(RP)입니다. 표지(intro)는 단계가 아닙니다.
 * 튜토리얼 S1 전이면 `null`, 다 끝냈으면 마지막 에피소드의 파이널입니다.
 * @returns {{ unitId: string, stepId: string, nextEpisodeId: string | null } | null}
 */
export function storyStepOf(catalogProgress, catalog) {
  const progress = catalogProgress && typeof catalogProgress === "object" ? catalogProgress : {};
  const keysOf = (episode) => (Array.isArray(progress[episode.id]) ? progress[episode.id] : []);
  const currentIndex = catalog.findIndex((episode) => !keysOf(episode).includes("RP"));
  const finale = (index) => ({
    unitId: catalog[index].id,
    stepId: "RP",
    nextEpisodeId: catalog[index + 1]?.id ?? null,
  });
  if (currentIndex === -1) return catalog.length > 0 ? finale(catalog.length - 1) : null;
  const current = catalog[currentIndex];
  const keys = keysOf(current);
  const cleared = current.steps.filter((step) => keys.includes(step));
  if (cleared.length > 0)
    return { unitId: current.id, stepId: cleared.at(-1), nextEpisodeId: null };
  return currentIndex > 0 ? finale(currentIndex - 1) : null;
}

/** 그 자리의 훅 목록입니다. 없으면 빈 배열입니다. */
export const storyOptions = (content, place) =>
  place ? (content?.[place.unitId]?.after?.[place.stepId] ?? []) : [];

/**
 * 한 사람에게 갈 예고입니다. 제목은 에피소드 영어 이름 — 파이널 뒤면 다음 에피소드 이름입니다(사용자 결정 2026-11-13).
 * 본문은 그 사람 언어, 없으면 영어입니다. 훅은 묶음 · 사람마다 늘 같은 칸입니다(대조군과 다른 키).
 * @returns {{ hook: string, lang: string, title: string, body: string } | null}
 */
export function storyMessage({ content, place, titles, lang, seed, userId, hookIndex }) {
  const options = storyOptions(content, place);
  if (options.length === 0) return null;
  const index = hookIndex ?? variantIndexOf(seed, userId, options.length);
  const option = options[index % options.length];
  const text = option.text ?? {};
  const chosen = text[lang] ? lang : "en";
  const titleId = place.stepId === "RP" && place.nextEpisodeId ? place.nextEpisodeId : place.unitId;
  return {
    hook: String(option.hook_name ?? `hook-${index}`),
    lang: chosen,
    title: titles[titleId] ?? content[titleId]?.title_en ?? "DURU",
    body: String(text[chosen] ?? "").trim(),
  };
}

/**
 * 버킷에서 읽은 `index.json` + 단위 파일들 → 예고 묶음입니다. 단계 순서는 `index.json`의 `steps`를 따릅니다
 * (앱 묶음 카탈로그보다 에피소드가 많을 수 있어 예고는 예고 파일의 순서를 씁니다).
 * @param {{ units: { unit: string, steps: string[] }[] }} index
 * @param {Record<string, { title_en?: string, after?: Record<string, unknown[]> }>} units
 */
export function storyPack(index, units) {
  const catalog = (index?.units ?? [])
    .filter((entry) => units[entry.unit])
    .map((entry) => ({
      id: entry.unit,
      steps: Array.isArray(entry.steps) ? entry.steps : [],
      title: units[entry.unit].title_en ?? entry.unit,
    }));
  return {
    catalog,
    units,
    titles: Object.fromEntries(catalog.map((episode) => [episode.id, episode.title])),
  };
}

/** 예고 파일 묶음 문제입니다 — 학습자 카탈로그의 단계와 맞는지, 영어 본문이 있는지. */
export function storyContentProblems(content, catalog) {
  const problems = [];
  for (const episode of catalog) {
    const unit = content?.[episode.id];
    if (!unit) {
      problems.push(`${episode.id}: 예고 파일이 없습니다.`);
      continue;
    }
    for (const [stepId, options] of Object.entries(unit.after ?? {})) {
      if (!episode.steps.includes(stepId)) problems.push(`${episode.id}: 모르는 단계 ${stepId}`);
      for (const option of options) {
        if (!option?.text?.en) problems.push(`${episode.id} ${stepId}: 영어 본문이 없습니다.`);
      }
    }
  }
  return problems;
}
