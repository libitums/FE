// 서버 자동 캠페인(ADR-0130 D12)의 배정 기록(`push_campaign_sends`) → 콘솔 캠페인 모양입니다. 순수 함수입니다.
// 한 회차(같은 run_at) × 세그먼트가 캠페인 하나이고, 묶음(`자동 · <세그먼트>`)으로 결과 탭에서 합쳐 봅니다.

export const AUTO_VARIANTS = [
  { id: "a", label: "캐릭터 톤" },
  { id: "b", label: "단계별 예고" },
];

/**
 * @param {{ run_at: string, series: string, segment: string, user_id: string, group: "sent" | "control",
 *   variant: string | null, lang: string, story_step: string | null }[]} rows
 * @param {(userId: string) => string | null} timeZoneOf 결과의 「학습한 날」을 현지 날짜로 세려고 씁니다.
 */
export function autoCampaignsFrom(rows, timeZoneOf) {
  const groups = new Map();
  for (const row of rows) {
    const sentAtMs = Date.parse(row.run_at);
    if (!Number.isFinite(sentAtMs)) continue;
    const key = `${row.run_at}|${row.segment}`;
    let campaign = groups.get(key);
    if (campaign === undefined) {
      const stamp = new Date(sentAtMs).toISOString().slice(0, 16).replace(/[-:T]/g, "");
      campaign = {
        id: `auto-${stamp}-${row.segment}`,
        name: `${row.series} · ${new Date(sentAtMs).toISOString().slice(5, 13).replace("T", " ")}시 UTC`,
        series: row.series,
        segment: row.segment,
        auto: true,
        sentAtMs,
        status: "sent",
        holdoutPercent: null,
        copy: null,
        variants: AUTO_VARIANTS,
        recipients: [],
        batches: [],
        totals: null,
      };
      groups.set(key, campaign);
    }
    campaign.recipients.push({
      userId: row.user_id,
      group: row.group,
      variant: row.group === "sent" ? (row.variant ?? "a") : null,
      segment: row.segment,
      lang: row.lang,
      storyStep: row.story_step ?? null,
      timeZone: timeZoneOf(row.user_id),
    });
  }
  return [...groups.values()];
}
