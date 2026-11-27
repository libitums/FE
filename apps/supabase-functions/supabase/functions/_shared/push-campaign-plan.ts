// 자동 푸시 캠페인의 순수 판정입니다(ADR-0130 D12). 입출력이 없어 Node(vitest)와 Deno에서 같게 돕니다.
// 로컬 푸시 콘솔(devtools/push-console)의 segments · audience · story 판정을 서버로 옮긴 것입니다 —
// 대조군 · 변형 칸 해시(FNV-1a)와 세그먼트 규칙을 콘솔과 같게 둬, 콘솔 결과 탭이 자동 발송도 같은 잣대로 읽습니다.

import { copyLanguageFor, localHourOf, timeZoneFor } from "./push-campaign-locale.ts";
import { classify, keysIn } from "./push-campaign-progress.ts";
import { armOf, frequencySeriesOf, hash32, renderCopy } from "./push-campaign-text.ts";
import type {
  CampaignConfig,
  CampaignLearner,
  CatalogEpisode,
  Copy,
  PlannedRow,
  Slot,
} from "./push-campaign-types.ts";

export * from "./push-campaign-locale.ts";
export * from "./push-campaign-progress.ts";
export * from "./push-campaign-text.ts";
export type * from "./push-campaign-types.ts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * 이번 회차의 배정입니다(빈도 실험, ADR-0208). 시험 계정은 호출하는 쪽이 미리 뺍니다.
 * - 칸은 사람마다 고정: 대조군 · 하루 1번(저녁) · 하루 2번(점심 + 저녁). 점심 회차는 「하루 2번」 칸만 줄이 생깁니다.
 * - 쉰 날수가 `dailyDays` 미만이면 매일, 그 뒤는 `winbackDays`인 날 저녁에만(보내는 두 칸 모두) 보냅니다.
 * - 대조군 줄은 저녁 회차에 남깁니다 — 보낸 쪽과 같은 날 · 같은 조건의 사람을 비교합니다.
 */
export function planCampaign(input: {
  learners: readonly CampaignLearner[];
  catalog: readonly CatalogEpisode[];
  config: CampaignConfig;
  nowMs: number;
}): { rows: PlannedRow[]; skipped: Record<string, number> } {
  const { learners, catalog, config, nowMs } = input;
  const skipped: Record<string, number> = {
    "no-rule": 0,
    "no-time-zone": 0,
    "local-hour": 0,
    idle: 0,
    gap: 0,
    arm: 0,
    "no-copy": 0,
  };
  const dayIndex = Math.floor(nowMs / DAY_MS);
  const rows: PlannedRow[] = [];
  for (const learner of learners) {
    const { segment, episode } = classify(learner.catalogProgress, catalog);
    const stage = config.stages[segment];
    if (stage === undefined) {
      skipped["no-rule"]! += 1;
      continue;
    }
    const timeZone = timeZoneFor(learner.country);
    if (timeZone === null) {
      skipped["no-time-zone"]! += 1;
      continue;
    }
    const hour = localHourOf(nowMs, timeZone);
    const slot: Slot | null =
      hour === config.localHours.noon
        ? "noon"
        : hour === config.localHours.evening
          ? "evening"
          : null;
    if (slot === null) {
      skipped["local-hour"]! += 1;
      continue;
    }
    const idleHours = (nowMs - learner.lastActiveMs) / HOUR_MS;
    const idleDays = Math.floor(idleHours / 24);
    const daily = idleDays < config.dailyDays;
    const winback = slot === "evening" && config.winbackDays.includes(idleDays);
    if (idleHours < config.minIdleHours || (!daily && !winback)) {
      skipped.idle! += 1;
      continue;
    }
    if (
      learner.lastCampaignMs !== null &&
      nowMs - learner.lastCampaignMs < config.minGapHours * HOUR_MS
    ) {
      skipped.gap! += 1;
      continue;
    }
    const arm = armOf(learner.userId);
    if (slot === "noon" && arm !== "twice") {
      skipped.arm! += 1;
      continue;
    }

    // 문구 — 매일 단계의 마지막 날 저녁은 「멈춘다」 알림, 나머지는 자리의 문구를 날마다 돌려 씁니다.
    const last = daily && slot === "evening" && idleDays === config.dailyDays - 1;
    const pool = daily ? config.copy[stage][slot] : config.copy[stage].winback;
    const index =
      pool.length === 0 ? 0 : (dayIndex + hash32(`copy:${learner.userId}`)) % pool.length;
    const copy: Copy | undefined = last ? config.lastCopy : pool[index];
    const wanted = copyLanguageFor(learner.country);
    const lang = copy?.[wanted]?.title && copy[wanted]?.body ? wanted : "en";
    const chosen = copy?.[lang];
    if (chosen === undefined) {
      skipped["no-copy"]! += 1;
      continue;
    }
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
    const title = renderCopy(chosen.title, vars);
    const body = renderCopy(chosen.body, vars);
    if (title === "" || body === "") {
      skipped["no-copy"]! += 1;
      continue;
    }
    rows.push({
      series: frequencySeriesOf(stage),
      segment,
      userId: learner.userId,
      group: arm === "control" ? "control" : "sent",
      variant: arm === "control" ? null : arm === "once" ? "a" : "b",
      lang,
      storyStep: last ? "daily:last" : daily ? `daily:${slot}:${index}` : `winback:${index}`,
      title,
      body,
    });
  }
  return { rows, skipped };
}

const keysOfLearner = (progress: Record<string, unknown> | null, id: string): string[] =>
  keysIn(progress ?? {}, id);

/** 같은 제목 · 본문끼리 묶어 1,000명씩 자릅니다(`send-push` announcement의 상한). */
