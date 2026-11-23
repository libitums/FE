import { expect, test } from "vitest";

import type { ChatSendEnv } from "./chat-send.contract.ts";
import {
  proactivePushPlan,
  PROACTIVE_PUSH_HOLDOUT,
  pushProactive,
} from "./companion-proactive-push.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";
import { inHoldout, variantIndexOf } from "./push-campaign-text.ts";

// 선톡 푸시(ADR-0127 서버 쪽, 2026-11-22): 스위치(off · testers · on) · 대조군 30% · 미리보기 A/B(사용자 id 해시) · 배정 기록 뒤 발송.
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SEED = "series:선톡";
const pick = (want: { control: boolean; variant?: 0 | 1 }) => {
  for (let n = 1; n < 500; n += 1) {
    const id = uuid(n);
    if (inHoldout(SEED, id, PROACTIVE_PUSH_HOLDOUT) !== want.control) continue;
    if (want.variant !== undefined && variantIndexOf(SEED, id, 2) !== want.variant) continue;
    return id;
  }
  throw new Error("no id");
};
const segments = [
  { kind: "action" as const, text: "(창밖을 본다)" },
  { kind: "speech" as const, text: "오늘 뭐 했어?\n나는 방금 퇴근했어!" },
];
const base = { name: "미나", characterId: "mina", segments, hasDevice: true, hasRoom: true };

test("PP1. 스위치 — off는 아무도, testers는 시험 계정만(대조군 없이 모두 받음 · 기록 없음), 기기가 없으면 보내지 않는다", () => {
  const userId = pick({ control: true });
  expect(proactivePushPlan({ ...base, userId, mode: "off", tester: true })).toEqual({
    skip: "off",
  });
  expect(proactivePushPlan({ ...base, userId, mode: "testers", tester: false })).toEqual({
    skip: "not_tester",
  });
  expect(proactivePushPlan({ ...base, userId, mode: "testers", tester: true })).toMatchObject({
    group: "sent",
    record: false,
  });
  expect(
    proactivePushPlan({ ...base, userId, mode: "on", tester: false, hasDevice: false }),
  ).toEqual({ skip: "no_device" });
});

test("PP7. 기기에 그 방이 없으면(새로 깐 뒤 그 인물과 말한 적 없음) 보내지 않는다 — 시험 계정 단계도 같다", () => {
  const userId = pick({ control: false });
  expect(proactivePushPlan({ ...base, userId, mode: "on", tester: false, hasRoom: false })).toEqual(
    { skip: "no_room" },
  );
  expect(
    proactivePushPlan({ ...base, userId, mode: "testers", tester: true, hasRoom: false }),
  ).toEqual({ skip: "no_room" });
});

test("PP2. on — 대조군 30%는 기록만(변형 없음), 받는 쪽은 A 한국어 첫 말 · B 「{이름} sent you a message」", () => {
  const control = proactivePushPlan({
    ...base,
    userId: pick({ control: true }),
    mode: "on",
    tester: false,
  });
  expect(control).toMatchObject({ group: "control", variant: null, record: true });

  const a = proactivePushPlan({
    ...base,
    userId: pick({ control: false, variant: 0 }),
    mode: "on",
    tester: false,
  });
  expect(a).toEqual({
    group: "sent",
    variant: "a",
    record: true,
    lang: "ko",
    title: "미나",
    body: "오늘 뭐 했어? 나는 방금 퇴근했어!",
  });
  const b = proactivePushPlan({
    ...base,
    userId: pick({ control: false, variant: 1 }),
    mode: "on",
    tester: false,
  });
  expect(b).toMatchObject({
    group: "sent",
    variant: "b",
    lang: "en",
    title: "미나",
    body: "미나 sent you a message",
  });

  const ids = Array.from({ length: 2000 }, (_, n) => uuid(n + 1000));
  const share = ids.filter((id) => inHoldout(SEED, id, PROACTIVE_PUSH_HOLDOUT)).length / ids.length;
  expect(share).toBeGreaterThan(0.26);
  expect(share).toBeLessThan(0.34);
});

test("PP3. A — 긴 말은 120자에서 자르고, 말(speech)이 없으면 B 문구로 바꾼다", () => {
  const userId = pick({ control: false, variant: 0 });
  const long = proactivePushPlan({
    ...base,
    userId,
    mode: "on",
    tester: false,
    segments: [{ kind: "speech", text: "가".repeat(300) }],
  });
  expect(long).toMatchObject({ variant: "a", body: `${"가".repeat(119)}…` });
  const silent = proactivePushPlan({
    ...base,
    userId,
    mode: "on",
    tester: false,
    segments: [{ kind: "action", text: "(웃는다)" }],
  });
  expect(silent).toMatchObject({ variant: "b", lang: "en", body: "미나 sent you a message" });
});

function setup(options: {
  gate?: unknown;
  gateStatus?: number;
  recordStatus?: number;
  send?: { status: number; body?: unknown };
}) {
  const requests: OutboundRequest[] = [];
  const outbound = async (request: OutboundRequest) => {
    requests.push(request);
    if (request.url.endsWith("/rpc/companion_proactive_push_gate"))
      return {
        status: options.gateStatus ?? 200,
        text: async () => JSON.stringify(options.gate ?? null),
      };
    if (request.url.endsWith("/rest/v1/push_campaign_sends"))
      return { status: options.recordStatus ?? 201, text: async () => "" };
    if (request.url.endsWith("/functions/v1/send-push"))
      return {
        status: options.send?.status ?? 200,
        text: async () =>
          JSON.stringify(options.send?.body ?? { devices: 1, sent: 1, failed: 0, removed: 0 }),
      };
    return { status: 404, text: async () => "" };
  };
  const run = (userId: string) =>
    pushProactive(outbound, env, {
      userId,
      characterId: "mina",
      name: "미나",
      segments,
      now: "2026-11-22T09:30:00.000Z",
    });
  const bodyOf = (suffix: string) => {
    const request = requests.find((r) => r.url.endsWith(suffix));
    return request === undefined ? undefined : (JSON.parse(request.body ?? "null") as unknown);
  };
  return { run, requests, bodyOf };
}
const on = { mode: "on", tester: false, hasDevice: true, hasRoom: true };

test("PP4. 받는 쪽 — 배정을 먼저 남기고 send-push에 그 사람 하나 · 목적지 companion-chat · 변형을 싣는다", async () => {
  const userId = pick({ control: false, variant: 0 });
  const t = setup({ gate: on });
  expect(await t.run(userId)).toBe("sent");
  expect(t.requests.map((r) => r.url.split(".co")[1])).toEqual([
    "/rest/v1/rpc/companion_proactive_push_gate",
    "/rest/v1/push_campaign_sends",
    "/functions/v1/send-push",
  ]);
  expect(t.bodyOf("/rest/v1/rpc/companion_proactive_push_gate")).toEqual({
    p_user_id: userId,
    p_character_id: "mina",
  });
  expect(t.bodyOf("/rest/v1/push_campaign_sends")).toEqual([
    {
      run_at: "2026-11-22T09:30:00.000Z",
      series: "선톡",
      segment: "companion-proactive",
      user_id: userId,
      group: "sent",
      variant: "a",
      lang: "ko",
      story_step: null,
      title: "미나",
      body: "오늘 뭐 했어? 나는 방금 퇴근했어!",
    },
  ]);
  expect(t.bodyOf("/functions/v1/send-push")).toEqual({
    kind: "announcement",
    audience: { userIds: [userId] },
    title: "미나",
    body: "오늘 뭐 했어? 나는 방금 퇴근했어!",
    target: { kind: "companion-chat", characterId: "mina", variant: "a" },
  });
});

test("PP5. 대조군은 기록만 남기고 보내지 않는다. 기록에 실패하면 보내지 않는다", async () => {
  const control = setup({ gate: on });
  expect(await control.run(pick({ control: true }))).toBe("control");
  expect(control.bodyOf("/rest/v1/push_campaign_sends")).toMatchObject([
    { group: "control", variant: null },
  ]);
  expect(control.bodyOf("/functions/v1/send-push")).toBeUndefined();

  const failed = setup({ gate: on, recordStatus: 500 });
  expect(await failed.run(pick({ control: false }))).toBe("record_failed");
  expect(failed.bodyOf("/functions/v1/send-push")).toBeUndefined();
});

test("PP6. 시험 계정 단계 — 기록 없이 보낸다. 스위치를 못 읽으면(옛 DB · 오류) 꺼진 것으로 보고, 발송 실패는 던지지 않는다", async () => {
  const tester = setup({ gate: { mode: "testers", tester: true, hasDevice: true, hasRoom: true } });
  expect(await tester.run(pick({ control: true }))).toBe("sent");
  expect(tester.bodyOf("/rest/v1/push_campaign_sends")).toBeUndefined();
  expect(tester.bodyOf("/functions/v1/send-push")).toMatchObject({
    target: { kind: "companion-chat", characterId: "mina" },
  });

  expect(await setup({ gateStatus: 404 }).run(uuid(1))).toBe("off");
  expect(await setup({ gate: { mode: "weird" } }).run(uuid(1))).toBe("off");
  expect(await setup({ gate: on, send: { status: 502 } }).run(pick({ control: false }))).toBe(
    "send_failed",
  );
  expect(
    await setup({ gate: on, send: { status: 200, body: { devices: 0, sent: 0 } } }).run(
      pick({ control: false }),
    ),
  ).toBe("send_failed");
});
