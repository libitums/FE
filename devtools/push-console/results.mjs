// 캠페인 결과 — 발송 그룹 vs 대조군의 복귀율 · 차이 · 신뢰구간 · 복귀 곡선입니다. 순수 함수만 둡니다.
//
// 지표 (발송 시각 T 기준, 사람 수 비율)
// - opened   T ~ T+창 안에 앱 이벤트가 하나라도 있음 (PostHog — 키가 없으면 null)
// - tapped   T ~ T+창 안에 push_notification_opened (PostHog — 대조군은 0이 정상)
// - studied  현지 날짜로 T의 날 ~ T+창의 날 사이에 학습한 날이 있음 (learning_days)
// - since    지금까지 T 뒤에 앱을 연 적이 있음 (push_devices.last_active_at — 창 없음)

import { localClock } from "./segments.mjs";

const HOUR_MS = 60 * 60 * 1000;
export const WINDOWS = [24, 72];

/** 표준정규 누적분포(Abramowitz–Stegun 7.1.26)입니다. */
function normalCdf(z) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * 두 비율의 차이(발송 − 대조) · 95% 신뢰구간 · 양측 p값입니다. 한쪽이 비면 null.
 * @param {{ hits: number, n: number }} sent
 * @param {{ hits: number, n: number }} control
 */
export function compareRates(sent, control) {
  if (sent.n === 0 || control.n === 0) return null;
  const pSent = sent.hits / sent.n;
  const pControl = control.hits / control.n;
  const diff = pSent - pControl;
  const se = Math.sqrt((pSent * (1 - pSent)) / sent.n + (pControl * (1 - pControl)) / control.n);
  const pooled = (sent.hits + control.hits) / (sent.n + control.n);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / sent.n + 1 / control.n));
  const pValue = sePooled === 0 ? 1 : 2 * (1 - normalCdf(Math.abs(diff) / sePooled));
  return { diff, low: diff - 1.96 * se, high: diff + 1.96 * se, pValue };
}

const within = (ms, from, to) => ms !== null && ms !== undefined && ms > from && ms <= to;

/** 현지 날짜 범위 `[from, to]` 안에 학습한 날이 있는지 봅니다. */
const studiedBetween = (days, from, to) => {
  if (!days) return false;
  for (const day of days) if (day >= from && day <= to) return true;
  return false;
};

/**
 * @param {{ id: string, sentAtMs: number, recipients: { userId: string, group: "sent" | "control",
 *   timeZone: string | null }[] }} campaign
 * @param {{
 *   lastActiveNow: ReadonlyMap<string, number>,
 *   learningDays: ReadonlyMap<string, ReadonlySet<string>>,
 *   posthog: ReadonlyMap<string, { firstEventMs: number | null, firstTapMs: number | null }> | null,
 * }} observations
 * @param {number} nowMs
 */
export function campaignResults(campaign, observations, nowMs) {
  const sentAt = campaign.sentAtMs;
  const groups = { sent: [], control: [] };
  for (const recipient of campaign.recipients) groups[recipient.group]?.push(recipient);
  const hasPosthog = observations.posthog !== null;

  const rateOf = (rows, test) => ({ hits: rows.filter(test).length, n: rows.length });
  const startDay = (row) => localClock(sentAt, row.timeZone ?? "UTC").date;
  const endDay = (row, hours) => localClock(sentAt + hours * HOUR_MS, row.timeZone ?? "UTC").date;
  const ph = (row) =>
    observations.posthog?.get(row.userId) ?? { firstEventMs: null, firstTapMs: null };

  const metrics = [];
  for (const hours of WINDOWS) {
    const to = sentAt + hours * HOUR_MS;
    const complete = nowMs >= to;
    const tests = {
      opened: hasPosthog ? (row) => within(ph(row).firstEventMs, sentAt, to) : null,
      tapped: hasPosthog ? (row) => within(ph(row).firstTapMs, sentAt, to) : null,
      studied: (row) =>
        studiedBetween(
          observations.learningDays.get(row.userId),
          startDay(row),
          endDay(row, hours),
        ),
    };
    for (const [metric, test] of Object.entries(tests)) {
      if (test === null) continue;
      const sent = rateOf(groups.sent, test);
      const control = rateOf(groups.control, test);
      metrics.push({
        metric,
        hours,
        complete,
        sent,
        control,
        compare: compareRates(sent, control),
      });
    }
  }
  const sinceTest = (row) => (observations.lastActiveNow.get(row.userId) ?? 0) > sentAt;
  const sinceSent = rateOf(groups.sent, sinceTest);
  const sinceControl = rateOf(groups.control, sinceTest);
  metrics.push({
    metric: "since",
    hours: null,
    complete: true,
    sent: sinceSent,
    control: sinceControl,
    compare: compareRates(sinceSent, sinceControl),
  });

  return {
    campaignId: campaign.id,
    elapsedHours: Math.max(0, (nowMs - sentAt) / HOUR_MS),
    hasPosthog,
    counts: { sent: groups.sent.length, control: groups.control.length },
    metrics,
    curve: returnCurve(groups, observations, sentAt, nowMs),
  };
}

/**
 * 누적 복귀 곡선입니다. PostHog가 있으면 시간별(0~72) 앱 열기, 없으면 날별(0~3) 학습입니다.
 * 아직 오지 않은 시점은 넣지 않습니다.
 */
export function returnCurve(groups, observations, sentAt, nowMs) {
  const elapsed = Math.max(0, (nowMs - sentAt) / HOUR_MS);
  if (observations.posthog !== null) {
    const points = [];
    for (let hour = 0; hour <= Math.min(72, Math.floor(elapsed)); hour += 1) {
      const to = sentAt + hour * HOUR_MS;
      const share = (rows) =>
        rows.length === 0
          ? null
          : rows.filter((row) =>
              within(observations.posthog.get(row.userId)?.firstEventMs, sentAt, to),
            ).length / rows.length;
      points.push({ x: hour, sent: share(groups.sent), control: share(groups.control) });
    }
    return { unit: "hour", metric: "opened", points };
  }
  const points = [];
  for (let day = 0; day <= Math.min(3, Math.floor(elapsed / 24)); day += 1) {
    const share = (rows) => {
      if (rows.length === 0) return null;
      const hits = rows.filter((row) => {
        const zone = row.timeZone ?? "UTC";
        const from = localClock(sentAt, zone).date;
        const to = localClock(sentAt + day * 24 * HOUR_MS, zone).date;
        return studiedBetween(observations.learningDays.get(row.userId), from, to);
      }).length;
      return hits / rows.length;
    };
    points.push({ x: day, sent: share(groups.sent), control: share(groups.control) });
  }
  return { unit: "day", metric: "studied", points };
}

// ------------------------------------------------------------------ 같은 실험 묶어 보기

/**
 * 캠페인의 묶음 이름입니다. 보낼 때 적은 이름이 있으면 그것, 없으면 캠페인 이름에서 끝의 「N차」를 뗀 것입니다.
 * 같은 실험을 며칠 반복하면 같은 묶음이 되어 결과를 합쳐 봅니다.
 */
export function seriesOf(campaign) {
  const explicit = String(campaign.series ?? "").trim();
  if (explicit !== "") return explicit;
  const name = String(campaign.name ?? campaign.segment ?? "").trim();
  return name.replace(/\s*\d+\s*차$/u, "").trim() || name;
}

/**
 * 같은 묶음의 캠페인 결과를 합칩니다. 캠페인마다 무작위로 나눈 대조군이라 사람 수를 더해 비율을 다시 계산합니다.
 * 창이 하나라도 덜 끝났으면 그 지표는 `complete: false`입니다. 곡선은 단위가 같을 때만 사람 수로 가중 평균합니다.
 */
export function poolResults(list) {
  const byKey = new Map();
  for (const result of list) {
    for (const metric of result.metrics) {
      const key = `${metric.metric}:${metric.hours}`;
      const pooled = byKey.get(key) ?? {
        metric: metric.metric,
        hours: metric.hours,
        complete: true,
        sent: { hits: 0, n: 0 },
        control: { hits: 0, n: 0 },
      };
      pooled.complete &&= metric.complete;
      pooled.sent.hits += metric.sent.hits;
      pooled.sent.n += metric.sent.n;
      pooled.control.hits += metric.control.hits;
      pooled.control.n += metric.control.n;
      byKey.set(key, pooled);
    }
  }
  const metrics = [...byKey.values()]
    .filter((metric) =>
      list.every((result) =>
        result.metrics.some((row) => row.metric === metric.metric && row.hours === metric.hours),
      ),
    )
    .map((metric) => ({ ...metric, compare: compareRates(metric.sent, metric.control) }));

  const units = new Set(list.map((result) => result.curve?.unit));
  let curve = null;
  if (list.length > 0 && units.size === 1) {
    const sums = new Map();
    for (const result of list) {
      for (const point of result.curve.points) {
        const slot = sums.get(point.x) ?? {
          x: point.x,
          sent: 0,
          sentN: 0,
          control: 0,
          controlN: 0,
        };
        if (point.sent !== null) {
          slot.sent += point.sent * result.counts.sent;
          slot.sentN += result.counts.sent;
        }
        if (point.control !== null) {
          slot.control += point.control * result.counts.control;
          slot.controlN += result.counts.control;
        }
        sums.set(point.x, slot);
      }
    }
    curve = {
      unit: list[0].curve.unit,
      metric: list[0].curve.metric,
      points: [...sums.values()]
        .sort((a, b) => a.x - b.x)
        .map((slot) => ({
          x: slot.x,
          sent: slot.sentN === 0 ? null : slot.sent / slot.sentN,
          control: slot.controlN === 0 ? null : slot.control / slot.controlN,
        })),
    };
  }
  return {
    campaigns: list.length,
    hasPosthog: list.length > 0 && list.every((result) => result.hasPosthog),
    counts: {
      sent: list.reduce((sum, result) => sum + result.counts.sent, 0),
      control: list.reduce((sum, result) => sum + result.counts.control, 0),
    },
    metrics,
    curve,
  };
}
