// 캠페인 보상(ADR-0175) — 콘솔 양식의 보상 값을 고르고, 서버 기록(보상 · 수신자)과 알림 목적지를 만듭니다. 순수 함수만 있습니다.

/** 양식의 처음 값 — 엽전 100 · 무제한 티켓 24시간 · 받을 기한 발송 뒤 48시간. */
export const REWARD_DEFAULTS = { amount: 100, hours: 24, claimHours: 48 };

const HOUR_MS = 3_600_000;

/** 빈칸 · 없음은 처음 값, 숫자가 아니거나 정수가 아니면 NaN(문제로 잡힙니다). */
const wholeOr = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isInteger(number) ? number : Number.NaN;
};

/** 양식 값 → 보상(없으면 null). */
export function normalizeReward(input) {
  const kind = input?.kind;
  const claimHours = wholeOr(input?.claimHours, REWARD_DEFAULTS.claimHours);
  if (kind === "coins")
    return { kind, amount: wholeOr(input.amount, REWARD_DEFAULTS.amount), claimHours };
  if (kind === "unlimited_tickets")
    return { kind, hours: wholeOr(input.hours, REWARD_DEFAULTS.hours), claimHours };
  return null;
}

const within = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

/** 보상 값의 문제(한국어 문장). 없으면 빈 배열. 범위는 서버 표의 check와 같습니다. */
export function rewardProblems(reward) {
  if (reward === null) return [];
  const problems = [];
  if (reward.kind === "coins" && !within(reward.amount, 1, 1000))
    problems.push("엽전은 1 ~ 1,000 사이 정수로 적어 주세요.");
  if (reward.kind === "unlimited_tickets" && !within(reward.hours, 1, 168))
    problems.push("무제한 티켓 시간은 1 ~ 168 사이 정수로 적어 주세요.");
  if (!within(reward.claimHours, 1, 336))
    problems.push("받을 기한은 1 ~ 336시간 사이 정수로 적어 주세요.");
  return problems;
}

/** 알림 목적지 — 보상이 있으면 캠페인 id를 실은 여정 맵, 없으면 null(지금과 같음). */
export function rewardTarget(campaignId, reward) {
  return reward === null ? null : { kind: "journey-map", campaignId };
}

/** 서버 기록 — 보상 한 줄과 **보낸 그룹만**의 수신자 줄(대조군은 적지 않는다). */
export function rewardRows(campaign) {
  const { id, sentAtMs, reward, recipients } = campaign;
  if (reward === null) return null;
  return {
    reward: {
      campaign_id: id,
      kind: reward.kind,
      amount: reward.kind === "coins" ? reward.amount : null,
      hours: reward.kind === "unlimited_tickets" ? reward.hours : null,
      sent_at: new Date(sentAtMs).toISOString(),
      claim_until: new Date(sentAtMs + reward.claimHours * HOUR_MS).toISOString(),
    },
    recipients: recipients
      .filter((row) => row.group === "sent")
      .map((row) => ({ campaign_id: id, user_id: row.userId })),
  };
}

/** 화면 · 기록용 한 줄 요약. */
export function rewardLabel(reward) {
  if (reward === null || reward === undefined) return "보상 없음";
  const what =
    reward.kind === "coins" ? `엽전 ${reward.amount}` : `무제한 티켓 ${reward.hours}시간`;
  return `${what} · 발송 뒤 ${reward.claimHours}시간 안에 받기`;
}
