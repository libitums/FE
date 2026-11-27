import { expect, test } from "vitest";

import { rpcRequest } from "./companion-rpc.ts";
import { fnv1a, guardrailRev, guardrailSource } from "./guardrail-rev.ts";

// 가드레일 리비전(ops-dashboard 계약 G-A절, 마이그레이션 20270118).

test("GV1. FNV-1a — 알려진 값 · 8자리 16진수", () => {
  expect(fnv1a("")).toBe("811c9dc5");
  expect(fnv1a("a")).toBe("e40c292c");
  expect(guardrailRev()).toMatch(/^[0-9a-f]{8}$/);
});

test("GV2. 같은 코드면 같은 값, 검사 지시문 · 답 프롬프트 앞부분이 모두 들어간다", () => {
  expect(guardrailRev()).toBe(fnv1a(guardrailSource()));
  const source = guardrailSource();
  expect(source).toContain("You review a message the learner sent");
  expect(source).toContain("You review a reply the AI character is about to send");
  expect(source).toContain("# Common requests");
  expect(source).toContain("No explicit sexual content"); // open 인물의 Hard limits
});

test("GV3. RPC 요청은 헤더 x-guardrail-rev를 싣는다", () => {
  const request = rpcRequest(
    {
      supabaseUrl: "https://x.supabase.co",
      supabaseAnonKey: "anon",
      supabaseServiceRoleKey: "sb_secret_test",
    },
    "companion_finish_turn",
    {},
  );
  expect(request.headers["x-guardrail-rev"]).toBe(guardrailRev());
});
