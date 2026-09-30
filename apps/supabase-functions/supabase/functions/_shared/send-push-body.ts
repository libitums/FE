import type {
  PushMessage,
  PushTarget,
  ReengagementDays,
  ReengagementMessageFor,
  SendPushBodyFrom,
} from "./send-push.contract.ts";

const unitKinds = new Set(["messenger", "phone-call", "visual-novel"]);
const plainKinds = new Set(["journey-map", "notifications", "roleplay-list"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** 목적지 모양만 봅니다. 유닛 ID가 실제로 있는지는 앱이 가립니다. */
export function pushTargetFrom(value: unknown): PushTarget | null {
  const record = asRecord(value);
  const kind = record?.["kind"];
  if (typeof kind !== "string") return null;
  if (plainKinds.has(kind)) return { kind } as PushTarget;
  const unitId = record?.["unitId"];
  if (unitKinds.has(kind) && typeof unitId === "string" && unitId !== "" && unitId.length <= 100) {
    return { kind, unitId } as PushTarget;
  }
  return null;
}

const textWithin = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() !== "" && value.length <= max ? value : null;

export const sendPushBodyFrom: SendPushBodyFrom = (bodyText) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }
  const body = asRecord(parsed);
  if (body === null) return null;

  if (body["kind"] === "reengagement") {
    const days = body["days"];
    return days === 3 || days === 7 ? { kind: "reengagement", days } : null;
  }

  if (body["kind"] === "announcement") {
    const title = textWithin(body["title"], 100);
    const text = textWithin(body["body"], 500);
    if (title === null || text === null) return null;

    const rawTarget = body["target"];
    const target = rawTarget === undefined || rawTarget === null ? null : pushTargetFrom(rawTarget);
    if (rawTarget !== undefined && rawTarget !== null && target === null) return null;

    const rawAudience = body["audience"];
    if (rawAudience === "all") {
      return { kind: "announcement", audience: "all", title, body: text, target };
    }
    const userIds = asRecord(rawAudience)?.["userIds"];
    if (
      Array.isArray(userIds) &&
      userIds.length >= 1 &&
      userIds.length <= 1000 &&
      userIds.every((id) => typeof id === "string" && uuidPattern.test(id))
    ) {
      return {
        kind: "announcement",
        audience: { userIds: userIds as string[] },
        title,
        body: text,
        target,
      };
    }
    return null;
  }

  return null;
};

const reengagementMessages: Readonly<Record<ReengagementDays, PushMessage>> = {
  3: {
    title: "Your Korean journey is waiting",
    body: "Pick up where you left off. A few minutes today is all it takes.",
    target: { kind: "journey-map" },
  },
  7: {
    title: "We saved your spot",
    body: "Your next conversation in Korean is ready whenever you are.",
    target: { kind: "journey-map" },
  },
};

export const reengagementMessageFor: ReengagementMessageFor = (days) => reengagementMessages[days];
