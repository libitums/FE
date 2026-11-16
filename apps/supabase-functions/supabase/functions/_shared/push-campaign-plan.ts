// 자동 푸시 캠페인의 순수 판정입니다(ADR-0130 D12). 입출력이 없어 Node(vitest)와 Deno에서 같게 돕니다.
// 로컬 푸시 콘솔(devtools/push-console)의 segments · audience · story 판정을 서버로 옮긴 것입니다 —
// 대조군 · 변형 칸 해시(FNV-1a)와 세그먼트 규칙을 콘솔과 같게 둬, 콘솔 결과 탭이 자동 발송도 같은 잣대로 읽습니다.

import {
  copyLanguageFor,
  localHourOf,
  storyLanguageFor,
  timeZoneFor,
} from "./push-campaign-locale.ts";
import { classify, keysIn, storyOptions, storyPlaceOf } from "./push-campaign-progress.ts";
import {
  inHoldout,
  reengagementOverlap,
  renderCopy,
  seriesOf,
  variantIndexOf,
} from "./push-campaign-text.ts";
import type {
  CampaignConfig,
  CampaignLearner,
  CatalogEpisode,
  PlannedRow,
  StoryUnits,
} from "./push-campaign-types.ts";

export * from "./push-campaign-locale.ts";
export * from "./push-campaign-progress.ts";
export * from "./push-campaign-text.ts";
export type * from "./push-campaign-types.ts";

const HOUR_MS = 60 * 60 * 1000;

/**
 * 이번 회차에 보낼 사람과 대조군입니다. 시험 계정은 호출하는 쪽이 미리 뺍니다.
 * A = 세그먼트의 승자 문구(캐릭터 톤), B = 단계별 예고(규칙에 `story`가 있고 예고할 자리가 있을 때만).
 */
export function planCampaign(input: {
  learners: readonly CampaignLearner[];
  catalog: readonly CatalogEpisode[];
  storyCatalog: readonly CatalogEpisode[];
  storyUnits: StoryUnits;
  config: CampaignConfig;
  nowMs: number;
}): { rows: PlannedRow[]; skipped: Record<string, number> } {
  const { learners, catalog, storyCatalog, storyUnits, config, nowMs } = input;
  const skipped: Record<string, number> = {
    "no-rule": 0,
    "no-time-zone": 0,
    "local-hour": 0,
    idle: 0,
    reengagement: 0,
    cooldown: 0,
    "no-copy": 0,
  };
  const titles = new Map(storyCatalog.map((episode) => [episode.id, episode.title]));
  const rows: PlannedRow[] = [];
  for (const learner of learners) {
    const { segment, episode } = classify(learner.catalogProgress, catalog);
    const rule = config.rules[segment];
    const copy = config.copy[segment];
    if (rule === undefined) {
      skipped["no-rule"]! += 1;
      continue;
    }
    const timeZone = timeZoneFor(learner.country);
    if (timeZone === null) {
      skipped["no-time-zone"]! += 1;
      continue;
    }
    if (localHourOf(nowMs, timeZone) !== config.localHour) {
      skipped["local-hour"]! += 1;
      continue;
    }
    const idleHours = (nowMs - learner.lastActiveMs) / HOUR_MS;
    if (idleHours < rule.minIdleHours || idleHours > rule.maxIdleHours) {
      skipped.idle! += 1;
      continue;
    }
    if (reengagementOverlap(learner.lastActiveMs, nowMs)) {
      skipped.reengagement! += 1;
      continue;
    }
    if (
      learner.lastCampaignMs !== null &&
      nowMs - learner.lastCampaignMs < config.cooldownHours * HOUR_MS
    ) {
      skipped.cooldown! += 1;
      continue;
    }
    if (copy?.en === undefined) {
      skipped["no-copy"]! += 1;
      continue;
    }

    const series = seriesOf(segment);
    const seed = `series:${series}`;
    const group = inHoldout(seed, learner.userId, rule.holdoutPercent) ? "control" : "sent";
    const place = rule.story ? storyPlaceOf(learner.catalogProgress, storyCatalog) : null;
    const options = storyOptions(storyUnits, place);
    const abTest = rule.story && options.length > 0;
    const variant: "a" | "b" | null = abTest
      ? variantIndexOf(seed, learner.userId, 2) === 0
        ? "a"
        : "b"
      : "a";

    let lang: string;
    let title: string;
    let body: string;
    let storyStep: string | null = null;
    if (variant === "b" && place !== null) {
      // B — 단계별 예고. 훅은 예고 안에서 다시 무작위(콘솔 D11과 같은 키)입니다.
      const option = options[variantIndexOf(seed, learner.userId, options.length)]!;
      const text = option.text ?? {};
      const wanted = storyLanguageFor(learner.country);
      lang = text[wanted] ? wanted : "en";
      const titleId =
        place.stepId === "RP" && place.nextEpisodeId ? place.nextEpisodeId : place.unitId;
      title = titles.get(titleId) ?? storyUnits[titleId]?.title_en ?? "DURU";
      body = String(text[lang] ?? "").trim();
      storyStep = `${place.unitId}:${place.stepId}${option.hook_name ? `:${option.hook_name}` : ""}`;
    } else {
      const wanted = copyLanguageFor(learner.country);
      lang = copy[wanted]?.title && copy[wanted]?.body ? wanted : "en";
      const chosen = copy[lang]!;
      const vars = {
        name: learner.name,
        episode: episode?.title ?? "",
        character: episode?.character ?? "",
        steps: episode
          ? episode.steps.filter(
              (step) => !keysOfLearner(learner.catalogProgress, episode.id).includes(step),
            ).length
          : 0,
      };
      title = renderCopy(chosen.title, vars);
      body = renderCopy(chosen.body, vars);
    }
    if (title === "" || body === "") {
      skipped["no-copy"]! += 1;
      continue;
    }
    rows.push({
      series,
      segment,
      userId: learner.userId,
      group,
      variant: group === "sent" ? variant : null,
      lang,
      storyStep,
      title,
      body,
    });
  }
  return { rows, skipped };
}

const keysOfLearner = (progress: Record<string, unknown> | null, id: string): string[] =>
  keysIn(progress ?? {}, id);

/** 같은 제목 · 본문끼리 묶어 1,000명씩 자릅니다(`send-push` announcement의 상한). */
