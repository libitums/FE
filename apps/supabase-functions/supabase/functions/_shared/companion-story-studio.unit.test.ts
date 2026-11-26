import { expect, test } from "vitest";

import type { ChatSendEnv } from "./chat-send.contract.ts";
import { sceneryPrompt, sceneryVerdictFrom } from "./companion-story-image-prompts.ts";
import { createStudioHandler, type StudioDeps } from "./companion-story-studio-handler.ts";
import {
  catalogWordFor,
  draftItems,
  nounInLine,
  verbInLine,
} from "./companion-story-studio-items.ts";
import {
  fakeStudioLlm,
  finalTextOf,
  sourcesFrom,
  STORY_OTHER_LANGS,
  type StudioLlm,
  type WrittenStory,
} from "./companion-story-studio-llm.ts";
import { personaForStory, writeSystem, writeUserText } from "./companion-story-studio-prompts.ts";
import {
  allocateShots,
  allocateWeek,
  DEFAULT_SHOT_MIX,
  shotMixFrom,
} from "./companion-story-studio-shots.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// 친구 스토리 주간 기획(ADR-0192): 초안 정리 · 단어 붙이기 · 프롬프트 · 스튜디오 함수(서버 키만 — 조사 · 초안 쓰기 · 검토).
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};
const catalog = [
  { ko: "먹다", episodeId: "u05-baekban", ref: "voca:1" },
  { ko: "김치찌개", episodeId: "u05-baekban", ref: "voca:2" },
  { ko: "김치", episodeId: "u05-baekban", ref: "voca:3" },
  { ko: "가다", episodeId: "u09-subway", ref: "voca:4" },
];
const story = (day: string, extra: Partial<WrittenStory> = {}): WrittenStory => ({
  day,
  topic: "붕어빵",
  note: "일상",
  ko: "붕어빵을  먹었어요!\n따뜻해요.",
  reading: "",
  en: "I had a fish-shaped pastry! It's warm.",
  replies: ["맛있겠다!", " 맛있겠다! ", "어디서 샀어요?", "저도요", "넷째"],
  scene: "Holding a paper bag of fish-shaped pastries on a winter street.",
  word: null,
  ...extra,
});

test("단어: 낱말로 들어 있을 때만 붙인다 — 글자만 겹치는 것 · 뜻이 다른 용언은 붙이지 않는다", () => {
  // 체언: 낱말의 처음 + 끝이거나 조사.
  expect(nounInLine("시장에서는 귤을 팔아요", "시장")).toBe(true);
  expect(nounInLine("친구들이랑 갔어요", "친구")).toBe(true);
  expect(nounInLine("커피예요", "커피")).toBe(true);
  for (const [line, word] of [
    ["눈사람을 만들었어요!", "사람"],
    ["포장마차에서 어묵을 먹었어요.", "포장"],
    ["어느새 겨울이에요.", "어느"],
    ["잠자리가 날아다녀요.", "자리"],
    ["주말에는 뭐 하나요?", "하나"],
    ["김치가 좋아요", "김"],
  ] as const)
    expect([line, word, nounInLine(line, word)]).toEqual([line, word, false]);
  // 용언은 모델이 고른 것을 확인할 때만.
  expect(verbInLine("주말에 공부했어요", "공부하다")).toBe(true);
  expect(verbInLine("김밥을 만들었어요", "만들다")).toBe(true);
  expect(verbInLine("점심을 맛있게 먹어요.", "먹다")).toBe(true);
  expect(verbInLine("어제 시장에 갔어요", "가다")).toBe(true);
  expect(verbInLine("김치찌개가 매워요", "맵다")).toBe(true);
  expect(verbInLine("지나가다가 붕어빵을 샀어요.", "나가다")).toBe(false);
  expect(verbInLine("문을 두드리는 소리가 나요.", "드리다")).toBe(false);
  expect(verbInLine("매일 해요", "하다")).toBe(false);

  const words = [
    ...catalog,
    { ko: "내리다", episodeId: "u09-subway", ref: "voca:5" },
    { ko: "맵다", episodeId: "u05-baekban", ref: "voca:6" },
    { ko: "사람", episodeId: "u01-water", ref: "voca:7" },
  ];
  // 모델이 고른 단어가 한 줄에서 확인되면 그것(다른 단어가 더 길어도).
  expect(catalogWordFor("김치찌개에 김치가 많아요", "김치", words)?.ref).toBe("voca:3");
  expect(catalogWordFor("김치찌개를 맛있게 먹어요.", "먹다", words)?.ref).toBe("voca:1");
  expect(catalogWordFor("김치찌개가 매워요", "맵다", words)?.ref).toBe("voca:6");
  // 고른 것이 없으면 체언만 찾는다 — 「첫눈이 내리네요」에 「내리다(차에서)」를 붙이지 않는다.
  expect(catalogWordFor("첫눈이 내리네요!", null, words)).toBeNull();
  expect(catalogWordFor("눈사람을 만들었어요!", null, words)).toBeNull();
  expect(catalogWordFor("김치찌개를 먹었어요", null, words)?.ref).toBe("voca:2");
  // 고른 단어가 한 줄에 없으면 버리고 체언을 찾는다.
  expect(catalogWordFor("김치찌개가 좋아요", "내리다", words)?.ref).toBe("voca:2");
  expect(catalogWordFor("오늘은 비가 와요", "비", words)).toBeNull();
});

test("초안 정리: 빈 자리의 날짜만 · 날짜마다 하나 · 글을 다듬는다", () => {
  const items = draftItems(
    [
      story("2026-11-23"),
      story("2026-11-23", { ko: "같은 날 둘째" }),
      story("2026-11-30"),
      story("2026-11-24", { replies: ["", "  "] }),
      story("2026-11-25", { en: " " }),
      story("2026-11-26", { ko: "김치찌개를 끓였어요.", word: "김치찌개" }),
    ],
    {
      characterId: "duksu",
      // 컷은 모델이 아니라 자리에서 온다.
      slots: [
        { day: "2026-11-23", shot: "selfie" },
        { day: "2026-11-24", shot: "other" },
        { day: "2026-11-25", shot: "scene" },
        { day: "2026-11-26", shot: "scene", topic: "백반집" },
      ],
      catalog,
    },
  );
  expect(items.map((item) => item.publishOn)).toEqual(["2026-11-23", "2026-11-26"]);
  expect(items[0]).toMatchObject({
    characterId: "duksu",
    ko: "붕어빵을 먹었어요! 따뜻해요.",
    // 로마자는 모델이 아니라 규칙으로 만든다.
    roman: "bungeoppangeul meogeosseoyo! ttatteuthaeyo.",
    meaning: { en: "I had a fish-shaped pastry! It's warm." },
    replies: ["맛있겠다!", "어디서 샀어요?", "저도요"],
    shot: "selfie",
    // 모델이 고른 단어가 없으면 용언(먹다)은 혼자 찾지 않는다.
    word: null,
  });
  expect(items[1]).toMatchObject({
    shot: "scene",
    word: { episodeId: "u05-baekban", ref: "voca:2", ko: "김치찌개" },
  });
  // 로마자: 숫자 · 로마자가 있는 줄만 읽는 법을 쓴다. 소리 나는 대로 고쳐 적은 읽는 법은 쓰지 않는다.
  const romans = draftItems(
    [
      story("2026-11-23", { ko: "벌써 12월이에요!", reading: "벌써 십이월이에요!" }),
      story("2026-11-24", { ko: "따뜻한 물을 마셔요.", reading: "따뜨탄 무를 마셔요." }),
      story("2026-11-25", { ko: "3시에 만나요.", reading: "" }),
    ],
    {
      characterId: "mina",
      slots: ["2026-11-23", "2026-11-24", "2026-11-25"].map((day) => ({
        day,
        shot: "scene" as const,
      })),
      catalog: [],
    },
  ).map((item) => item.roman);
  expect(romans).toEqual([
    "beolsseo sibiworieyo!",
    "ttatteuthan mureul masyeoyo.",
    "3sie mannayo.",
  ]);
});

test("컷 배정: 셀카 0.3 · 남이 찍어 준 컷 0.2 · 인물 없음 0.5에 가깝게, 최근 컷에 이어서", () => {
  const days = (n: number) =>
    Array.from({ length: n }, (_, i) => `2026-12-${String(i + 1).padStart(2, "0")}`);
  const count = (shots: Record<string, string>) => {
    const out = { selfie: 0, other: 0, scene: 0 };
    for (const shot of Object.values(shots)) out[shot as keyof typeof out] += 1;
    return out;
  };
  // 열 자리면 정확히 3 · 2 · 5.
  expect(count(allocateShots(days(10), [], DEFAULT_SHOT_MIX, true))).toEqual({
    selfie: 3,
    other: 2,
    scene: 5,
  });
  // 처음 셋은 하나씩 — 적은 표본에서도 한쪽으로 몰리지 않는다.
  expect(Object.values(allocateShots(days(3), [], DEFAULT_SHOT_MIX, true))).toEqual([
    "scene",
    "selfie",
    "other",
  ]);
  // 최근 컷에 이어서 맞춘다 — 셀카만 올렸던 인물은 한동안 셀카가 없다.
  expect(
    Object.values(allocateShots(days(3), ["selfie", "selfie", "selfie"], DEFAULT_SHOT_MIX, true)),
  ).toEqual(["scene", "scene", "other"]);
  // 기준 그림 묶음이 없는 인물은 인물 없는 컷만.
  expect(count(allocateShots(days(4), [], DEFAULT_SHOT_MIX, false))).toEqual({
    selfie: 0,
    other: 0,
    scene: 4,
  });
  // 한 주 기획은 모든 인물을 합쳐 맞춘다 — 인물마다 두세 자리뿐이어도 남이 찍어 준 컷이 모자라지 않는다.
  const sizes = [7, 1, 2, 2, 3, 2, 2, 3, 2];
  const week = allocateWeek(
    sizes.map((size, index) => ({ id: `c${index}`, days: days(size), recent: [], hasRef: true })),
    DEFAULT_SHOT_MIX,
  );
  const whole = { selfie: 0, other: 0, scene: 0 };
  for (const shots of Object.values(week))
    for (const shot of Object.values(shots)) whole[shot] += 1;
  expect(whole).toEqual({ selfie: 7, other: 5, scene: 12 });
  // 한 인물이 같은 컷만 받지 않는다(일곱 자리 인물).
  const seven = count(week["c0"]!);
  expect(Math.min(seven.selfie, seven.other, seven.scene)).toBeGreaterThanOrEqual(1);
  // 묶음이 없는 인물은 인물 없는 컷만, 그만큼 다른 인물이 인물 컷을 더 받는다.
  const mixed = allocateWeek(
    [
      { id: "a", days: days(5), recent: [], hasRef: false },
      { id: "b", days: days(5), recent: [], hasRef: true },
    ],
    DEFAULT_SHOT_MIX,
  );
  expect(count(mixed["a"]!)).toEqual({ selfie: 0, other: 0, scene: 5 });
  expect(count(mixed["b"]!).scene).toBeLessThanOrEqual(1);
  // 설정값: 합이 1이 아니어도 되고, 틀린 값은 0으로, 모두 틀리면 기본값.
  expect(shotMixFrom({ selfie: 3, other: 2, scene: 5 })).toEqual({
    selfie: 0.3,
    other: 0.2,
    scene: 0.5,
  });
  expect(shotMixFrom({ selfie: 1, other: "x", scene: -2 })).toEqual({
    selfie: 1,
    other: 0,
    scene: 0,
  });
  expect(shotMixFrom({ selfie: 0 })).toEqual(DEFAULT_SHOT_MIX);
  expect(shotMixFrom(null)).toEqual(DEFAULT_SHOT_MIX);
  expect(count(allocateShots(days(4), [], shotMixFrom({ selfie: 1 }), true))).toEqual({
    selfie: 4,
    other: 0,
    scene: 0,
  });
});

test("프롬프트: 덕수쌤만 학습 스토리 · 카탈로그, 나머지는 문화 · 유행", () => {
  const character = { id: "duksu", name: "덕수쌤", persona: {}, look: "", hasRef: true };
  const teacher = writeSystem({ learning: true, character });
  expect(teacher).toContain("This character is the teacher");
  expect(teacher).toContain("Catalog words");
  const friend = writeSystem({ learning: false, character });
  expect(friend).toContain("K-pop");
  expect(friend).toContain("Always set `word` to null");
  for (const system of [teacher, friend]) {
    // 컷은 정해져서 온다 — 세 종류의 뜻을 알려 준다.
    expect(system).toContain("selfie = a selfie");
    expect(system).toContain("other = a photo someone else took");
    expect(system).toContain("only their hand at the edge of the frame");
    expect(system).toContain("Never mention events of the app's main storyline");
    expect(system).toContain("a brand mark");
  }
  const input = {
    character: {
      ...character,
      persona: { name: "덕수쌤", memorySeed: ["비밀"], speech: "해요체" },
    },
    learning: true,
    slots: [
      {
        day: "2026-11-23",
        shot: "selfie" as const,
        topic: "첫눈",
        brief: "궁 마당에서 첫눈을 본다.",
      },
      { day: "2026-11-24", shot: "scene" as const },
    ],
    recent: ["점심은 김치찌개예요."],
    notes: "첫눈",
    catalog,
    others: [{ characterId: "mina", day: "2026-11-23", topic: "붕어빵", line: "붕어빵을 샀어요!" }],
  };
  const text = writeUserText(input);
  expect(text).toContain(
    "Dates:\n2026-11-23 | shot: selfie | topic: 첫눈 — 궁 마당에서 첫눈을 본다.\n2026-11-24 | shot: scene",
  );
  expect(text).toContain("Catalog words:\n먹다, 김치찌개, 김치, 가다");
  expect(text).not.toContain("비밀");
  expect(text).toContain(
    "Other characters this week:\n- 2026-11-23 mina: 붕어빵 — 붕어빵을 샀어요!",
  );
  expect(writeUserText({ ...input, others: [] })).toContain(
    "Other characters this week:\n(none yet)",
  );
  expect(writeUserText({ ...input, learning: false })).not.toContain("Catalog words");
  // 뜻이 있으면 같이 보여 준다(같은 꼴의 다른 뜻을 고르지 않게).
  expect(writeUserText({ ...input, catalog: [{ ...catalog[0]!, meaning: "to eat" }] })).toContain(
    "Catalog words:\n먹다 (to eat)",
  );
  expect(personaForStory({ name: "미나", glossary: { 쌤: "teacher" } })).toEqual({ name: "미나" });
  expect(personaForStory(null)).toEqual({});
});

test("사물 · 풍경 컷: 규칙 문장은 고정이고, 주문이 없으면 뜻에서 만든다", () => {
  const prompt = sceneryPrompt("A bowl of red stew on a table.  ", "");
  expect(prompt.startsWith("A bowl of red stew on a table. Korean webtoon")).toBe(true);
  expect(prompt).toContain("Vertical 2:3 portrait");
  expect(prompt).toContain("photographer's hand at the edge of the frame");
  expect(prompt).toContain("Never a visible face");
  expect(prompt).toContain("No text, letters, logos");
  expect(sceneryPrompt("", 'It "snowed" today')).toContain("fits this caption: It 'snowed' today.");
  expect(
    sceneryVerdictFrom({
      safe: true,
      face: false,
      person: false,
      text_or_logo: false,
      matches: true,
    })?.pass,
  ).toBe(true);
  const verdict = { safe: true, face: false, person: false, text_or_logo: false, matches: true };
  // 얼굴이 안 보여도 사람이 주인공이면 떨어진다(인물 없는 컷).
  expect(sceneryVerdictFrom({ ...verdict, person: true })?.pass).toBe(false);
  expect(sceneryVerdictFrom({ ...verdict, face: true })?.pass).toBe(false);
  expect(sceneryVerdictFrom({ ...verdict, text_or_logo: true })?.pass).toBe(false);
  expect(sceneryVerdictFrom({ ...verdict, matches: false })?.pass).toBe(false);
  // 빠진 칸을 「문제없음」으로 읽지 않는다.
  expect(sceneryVerdictFrom({ safe: true, face: false })).toBeNull();
  expect(
    sceneryVerdictFrom({ safe: true, face: false, text_or_logo: false, matches: true }),
  ).toBeNull();
  expect(sceneryVerdictFrom({ safe: "yes" })).toBeNull();
});

test("조사의 출처: 검색 결과 블록에서 모으고 오류 블록 · 중복은 버린다", () => {
  expect(
    sourcesFrom([
      { type: "text", text: "x" },
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", title: "A", url: "https://a.example/1" },
          { type: "web_search_result", title: "A again", url: "https://a.example/1" },
          { type: "web_search_result", title: "bad", url: "javascript:alert(1)" },
        ],
      },
      {
        type: "web_search_tool_result",
        content: { type: "error", error_code: "max_uses_exceeded" },
      },
    ]),
  ).toEqual([{ title: "A", url: "https://a.example/1" }]);
});

test("조사의 글: 마지막 도구 블록 뒤의 글만 — 검색 사이의 혼잣말은 버린다", () => {
  expect(
    finalTextOf([
      { type: "text", text: "Results are JSON strings; parse them." },
      { type: "server_tool_use", name: "web_search" },
      { type: "web_search_tool_result", content: [] },
      { type: "thinking", thinking: "" },
      { type: "text", text: "# 소재 " },
      { type: "text", text: "노트" },
    ]),
  ).toBe("# 소재 노트");
  expect(finalTextOf([{ type: "text", text: "a" }, { type: "code_execution_tool_result" }])).toBe(
    "",
  );
});

// ------------------------------------------------------------------ 핸들러

type Rpc = { fn: string; args: Record<string, unknown> };
const DRAFT = "11111111-1111-4111-8111-111111111111";
function setup(options: {
  llm?: StudioLlm | null;
  context?: unknown;
  /** 인물마다 다른 기획 맥락(한 주 기획). */
  contexts?: Record<string, unknown>;
  /** 맥락 읽기가 실패하는 인물. */
  failingContexts?: string[];
  draft?: unknown;
  results?: Record<string, unknown>;
  failing?: string[];
}) {
  const rpcs: Rpc[] = [];
  const logs: string[] = [];
  const deps: StudioDeps = {
    env,
    llm: options.llm === undefined ? fakeStudioLlm : options.llm,
    nowMs: () => Date.parse("2026-11-22T03:00:00Z"),
    log: (entry) => logs.push(`${entry.status}:${entry.outcome ?? ""}`),
    outbound: async (request: OutboundRequest) => {
      const fn = request.url.split("/rpc/")[1] ?? "";
      const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
      rpcs.push({ fn, args });
      if (options.failing?.includes(fn)) return { status: 500, text: async () => "" };
      if (
        fn === "companion_story_plan_context" &&
        options.failingContexts?.includes(String(args["p_character_id"]))
      )
        return { status: 500, text: async () => "" };
      const body =
        fn === "companion_story_plan_context"
          ? (options.contexts?.[String(args["p_character_id"])] ?? options.context)
          : fn === "companion_story_draft"
            ? options.draft
            : fn === "companion_add_story_drafts"
              ? {
                  drafts: (args["p_drafts"] as unknown[]).map((_, i) => ({ id: `d${i}` })),
                  skipped: 0,
                }
              : fn === "companion_review_story_draft"
                ? { result: "ok", draft: { id: args["p_id"], status: args["p_action"] } }
                : (options.results?.[fn] ?? { ok: fn });
      return { status: 200, text: async () => JSON.stringify(body ?? null) };
    },
  };
  const call = async (body: unknown, token = "service-secret", method = "POST") => {
    const response = await createStudioHandler(deps)(
      new Request("https://fn/companion-story-studio", {
        method,
        headers: { authorization: `Bearer ${token}` },
        ...(method === "POST"
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      }),
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  return { call, rpcs, logs };
}
const context = (extra: Record<string, unknown> = {}) => ({
  character: {
    id: "duksu",
    name: "덕수쌤",
    persona: { name: "덕수쌤" },
    look: "bow tie",
    hasRef: true,
  },
  slots: ["2026-11-23", "2026-11-24"],
  recent: ["점심은 김치찌개예요."],
  others: [{ characterId: "mina", day: "2026-11-23", topic: "붕어빵", line: "붕어빵을 샀어요!" }],
  plan: { notes: "사람 메모", research: "조사 메모" },
  ...extra,
});

test("서버 키 · POST · 본문 모양", async () => {
  const { call, rpcs } = setup({});
  expect((await call({}, "service-secret", "GET")).status).toBe(405);
  expect((await call({ action: "calendar", from: "2026-11-23" }, "app-token")).status).toBe(401);
  expect((await call("not json")).status).toBe(400);
  expect((await call({ action: "nope" })).status).toBe(400);
  expect((await call({ action: "calendar", from: "next week" })).status).toBe(400);
  expect((await call({ action: "drafts", from: "2026-11-23" })).status).toBe(400);
  expect(rpcs).toEqual([]);
});

test("읽기 · 메모 저장은 RPC 그대로", async () => {
  const { call, rpcs } = setup({ results: { companion_story_drafts: { drafts: [{ id: "x" }] } } });
  expect(await call({ action: "calendar", from: "2026-11-23", days: 99 })).toEqual({
    status: 200,
    body: { result: "ok", calendar: { ok: "companion_story_calendar" } },
  });
  expect(rpcs[0]).toEqual({
    fn: "companion_story_calendar",
    args: { p_from: "2026-11-23", p_days: 7 },
  });
  expect((await call({ action: "drafts", from: "2026-11-23", to: "2026-11-29" })).body).toEqual({
    result: "ok",
    drafts: [{ id: "x" }],
  });
  await call({ action: "save_plan", week: "2026-11-23", notes: "덕수쌤: 첫눈", by: "혜성" });
  expect(rpcs.at(-1)).toEqual({
    fn: "companion_save_story_plan",
    args: {
      p_week: "2026-11-23",
      p_notes: "덕수쌤: 첫눈",
      p_research: null,
      p_sources: null,
      p_by: "혜성",
      p_now: "2026-11-22T03:00:00.000Z",
    },
  });
});

test("조사: 웹 검색 결과를 주간 메모의 research · sources에 저장한다", async () => {
  const { call, rpcs } = setup({});
  expect((await call({ action: "research", week: "2026-11-23" })).body["result"]).toBe("ok");
  expect(rpcs.at(-1)?.args).toMatchObject({
    p_notes: null,
    p_research: "- (가짜) 2026-11-23 주의 소재: 붕어빵 · 첫눈 · 연말 콘서트",
    p_sources: [{ title: "fake source", url: "https://example.com/fake" }],
    p_by: "ops",
  });
  // 실패하면 저장하지 않는다.
  const failed = setup({});
  expect(
    (await failed.call({ action: "research", week: "2026-11-23", hints: "[fail]" })).body,
  ).toEqual({
    result: "failed",
  });
  expect(failed.rpcs).toEqual([]);
  expect(
    (await setup({ llm: null }).call({ action: "research", week: "2026-11-23" })).body,
  ).toEqual({
    result: "not_configured",
  });
});

test("초안 쓰기: 빈 자리마다 쓰고, 메모 · 조사 · 최근 한 줄을 모델에 준다", async () => {
  const seen: Parameters<StudioLlm["write"]>[0][] = [];
  const llm: StudioLlm = {
    ...fakeStudioLlm,
    write: async (input) => {
      seen.push(input);
      return fakeStudioLlm.write(input);
    },
  };
  const { call, rpcs } = setup({ llm, context: context() });
  const written = await call({
    action: "write",
    characterId: "duksu",
    from: "2026-11-23",
    catalog: [...catalog, { ko: 1 }],
    by: "혜성",
  });
  expect(written.body).toMatchObject({
    result: "ok",
    drafts: [{ id: "d0" }, { id: "d1" }],
    skipped: 0,
  });
  expect(seen[0]).toMatchObject({
    learning: true,
    // 컷은 코드가 비율대로 배정한다(처음 둘: 인물 없음 → 셀카).
    slots: [
      { day: "2026-11-23", shot: "scene" },
      { day: "2026-11-24", shot: "selfie" },
    ],
    recent: ["점심은 김치찌개예요."],
    notes: "사람 메모\n\n조사 메모",
    others: [{ characterId: "mina", day: "2026-11-23", topic: "붕어빵", line: "붕어빵을 샀어요!" }],
  });
  expect(seen[0]!.catalog).toHaveLength(4);
  const added = rpcs.find((rpc) => rpc.fn === "companion_add_story_drafts")!;
  expect(added.args["p_by"]).toBe("혜성");
  expect(added.args["p_drafts"]).toMatchObject([
    {
      characterId: "duksu",
      publishOn: "2026-11-23",
      shot: "scene",
      meaning: { en: expect.any(String) },
    },
    { characterId: "duksu", publishOn: "2026-11-24", shot: "selfie" },
  ]);
  // 덕수쌤이 아니면 학습 스토리가 아니다.
  const friend = setup({
    llm,
    context: context({ character: { ...context().character, id: "mina" } }),
  });
  await friend.call({ action: "write", characterId: "mina", from: "2026-11-23" });
  expect(seen.at(-1)?.learning).toBe(false);
});

test("한 주 기획: 소재를 인물에 나누고(중앙 배정) 인물마다 초안을 쓴다", async () => {
  const assigned: Parameters<StudioLlm["assign"]>[0][] = [];
  const writes: Parameters<StudioLlm["write"]>[0][] = [];
  const llm: StudioLlm = {
    ...fakeStudioLlm,
    assign: async (input) => {
      assigned.push(input);
      return [
        {
          characterId: "duksu",
          day: "2026-11-23",
          topic: "첫눈 인사",
          brief: "첫눈 인사를 가르친다.",
        },
        { characterId: "duksu", day: "2026-11-24", topic: "붕어빵 주문", brief: "하나 주세요." },
        { characterId: "mina", day: "2026-11-25", topic: "성수 팝업", brief: "줄을 선다." },
      ];
    },
    write: async (input) => {
      if (input.character.id === "haejun") throw new Error("boom");
      writes.push(input);
      return fakeStudioLlm.write(input);
    },
  };
  const contexts: Record<string, unknown> = {
    duksu: context({ shots: ["scene", "scene"] }),
    mina: context({
      character: { ...context().character, id: "mina", name: "미나", hasRef: false },
      slots: ["2026-11-25"],
    }),
    haejun: context({ character: { ...context().character, id: "haejun" }, slots: ["2026-11-25"] }),
    yoonkyung: context({ character: { ...context().character, id: "yoonkyung" }, slots: [] }),
  };
  const { call, rpcs } = setup({
    llm,
    contexts,
    results: {
      companion_story_calendar: {
        characters: [{ id: "duksu" }, { id: "mina" }, { id: "haejun" }, { id: "yoonkyung" }],
      },
    },
  });
  const planned = await call({ action: "plan_week", from: "2026-11-23", catalog, by: "혜성" });
  // 쓰기에 실패한 인물만 빠진다.
  // 네 자리 중 셋을 썼고(해준의 한 자리는 못 씀), 배정이 빠뜨린 자리는 해준의 하나.
  expect(planned.body).toMatchObject({
    result: "ok",
    failed: ["haejun"],
    skipped: 1,
    unassigned: 1,
  });
  // 그 무렵 이미 있는 초안을 배정에 알려 준다(다시 돌릴 때 같은 소재를 또 나누지 않게).
  expect(assigned[0]!.taken).toEqual([
    { characterId: "mina", day: "2026-11-23", topic: "붕어빵", line: "붕어빵을 샀어요!" },
  ]);
  // 배정에는 빈 자리가 있는 인물만 — 덕수쌤은 선생님으로 표시.
  expect(assigned[0]!.characters.map((c) => [c.id, c.learning, c.days])).toEqual([
    ["duksu", true, ["2026-11-23", "2026-11-24"]],
    ["mina", false, ["2026-11-25"]],
    ["haejun", false, ["2026-11-25"]],
  ]);
  expect(assigned[0]!.notes).toBe("사람 메모\n\n조사 메모");
  const duksu = writes.find((input) => input.character.id === "duksu")!;
  // 최근 컷이 인물 없음 둘이었으니 셀카 · 남이 찍어 준 컷부터.
  expect(duksu.slots).toEqual([
    { day: "2026-11-23", shot: "selfie", topic: "첫눈 인사", brief: "첫눈 인사를 가르친다." },
    { day: "2026-11-24", shot: "other", topic: "붕어빵 주문", brief: "하나 주세요." },
  ]);
  expect(duksu.catalog).toHaveLength(4);
  const mina = writes.find((input) => input.character.id === "mina")!;
  // 기준 그림이 없는 인물은 인물 없는 컷. 카탈로그는 모두에게 간다(한 줄에 단어가 있으면 붙이는 데 — D6. 초안 쓰기에 보이는 것은 덕수쌤뿐).
  expect(mina.slots).toEqual([
    { day: "2026-11-25", shot: "scene", topic: "성수 팝업", brief: "줄을 선다." },
  ]);
  expect(mina.catalog).toHaveLength(4);
  const added = rpcs.filter((rpc) => rpc.fn === "companion_add_story_drafts");
  expect(added).toHaveLength(1);
  expect(
    (added[0]!.args["p_drafts"] as { characterId: string; topic: string; shot: string }[]).map(
      (draft) => [draft.characterId, draft.topic, draft.shot],
    ),
  ).toEqual([
    ["duksu", "첫눈 인사", "selfie"],
    ["duksu", "붕어빵 주문", "other"],
    ["mina", "성수 팝업", "scene"],
  ]);
});

test("한 주 기획: 한 인물의 맥락 읽기가 실패해도 나머지는 쓴다 · 배정이 자리와 하나도 맞지 않으면 쓰지 않는다", async () => {
  const calendar = {
    companion_story_calendar: { characters: [{ id: "duksu" }, { id: "broken" }] },
  };
  const partial = setup({
    contexts: { duksu: context() },
    failingContexts: ["broken"],
    results: calendar,
  });
  const body = (await partial.call({ action: "plan_week", from: "2026-11-23", days: 14 })).body;
  expect(body).toMatchObject({ result: "ok", failed: ["broken"], skipped: 0, unassigned: 0 });
  // 한 주 기획은 한 주씩(주간 메모가 주마다 하나다).
  expect(partial.rpcs.find((rpc) => rpc.fn === "companion_story_calendar")?.args["p_days"]).toBe(7);

  const llm: StudioLlm = {
    ...fakeStudioLlm,
    assign: async () => [{ characterId: "A", day: "11-23", topic: "x", brief: "y" }],
  };
  const useless = setup({ llm, contexts: { duksu: context() }, results: calendar });
  expect((await useless.call({ action: "plan_week", from: "2026-11-23" })).body).toMatchObject({
    result: "failed",
  });
  expect(useless.rpcs.some((rpc) => rpc.fn === "companion_add_story_drafts")).toBe(false);
});

test("한 주 기획: 빈 자리가 없거나 배정이 실패하면 쓰지 않는다", async () => {
  const none = setup({
    contexts: { duksu: context({ slots: [] }) },
    results: { companion_story_calendar: { characters: [{ id: "duksu" }] } },
  });
  expect((await none.call({ action: "plan_week", from: "2026-11-23" })).body).toEqual({
    result: "no_slots",
    drafts: [],
    skipped: 0,
    failed: [],
  });
  const failed = setup({
    contexts: { duksu: context({ plan: { notes: "[assign-fail]" } }) },
    results: { companion_story_calendar: { characters: [{ id: "duksu" }] } },
  });
  expect((await failed.call({ action: "plan_week", from: "2026-11-23" })).body).toEqual({
    result: "failed",
  });
  expect(failed.rpcs.some((rpc) => rpc.fn === "companion_add_story_drafts")).toBe(false);
  expect((await setup({}).call({ action: "plan_week" })).body).toEqual({ result: "invalid" });
  expect(
    (await setup({ llm: null }).call({ action: "plan_week", from: "2026-11-23" })).body,
  ).toEqual({
    result: "not_configured",
  });
});

test("초안 쓰기: 빈 자리 없음 · 없는 인물 · 모델 실패는 넣지 않는다", async () => {
  const none = setup({ context: context({ slots: [] }) });
  expect(
    (await none.call({ action: "write", characterId: "duksu", from: "2026-11-23" })).body,
  ).toEqual({
    result: "no_slots",
    drafts: [],
    skipped: 0,
  });
  const missing = setup({ context: { character: null, slots: [], recent: [], plan: null } });
  expect(
    (await missing.call({ action: "write", characterId: "x", from: "2026-11-23" })).body,
  ).toEqual({
    result: "not_found",
  });
  const failed = setup({ context: context({ plan: { notes: "[fail]" } }) });
  expect(
    (await failed.call({ action: "write", characterId: "duksu", from: "2026-11-23" })).body,
  ).toEqual({
    result: "failed",
  });
  expect(failed.rpcs.some((rpc) => rpc.fn === "companion_add_story_drafts")).toBe(false);
  expect((await setup({}).call({ action: "write", characterId: "duksu" })).body).toEqual({
    result: "invalid",
  });
  const down = setup({ failing: ["companion_story_plan_context"] });
  expect(await down.call({ action: "write", characterId: "duksu", from: "2026-11-23" })).toEqual({
    status: 502,
    body: { result: "rpc_failed" },
  });
});

test("검토: 최종 승인은 빠진 언어를 번역해 채운 뒤 승인한다", async () => {
  const draft = {
    id: DRAFT,
    status: "ready",
    line: { ko: "첫눈이 와요!", meaning: { en: "First snow!", ja: "初雪！" } },
  };
  const { call, rpcs } = setup({ draft });
  const approved = await call({ action: "review", id: DRAFT, step: "approve", by: "혜성" });
  expect(approved.body).toMatchObject({ result: "ok", draft: { status: "approve" } });
  const reviews = rpcs.filter((rpc) => rpc.fn === "companion_review_story_draft");
  expect(reviews.map((rpc) => rpc.args["p_action"])).toEqual(["edit", "approve"]);
  const meaning = (reviews[0]!.args["p_patch"] as { meaning: Record<string, string> }).meaning;
  expect(Object.keys(meaning).sort()).toEqual(["en", ...STORY_OTHER_LANGS].sort());
  // 이미 있는 언어는 그대로 둔다.
  expect(meaning).toMatchObject({ en: "First snow!", ja: "初雪！", es: "[es] First snow!" });
  expect(reviews[1]!.args["p_by"]).toBe("혜성");
  // 번역한 글을 같이 낸다 — 그 사이 글이 바뀌었으면 서버가 승인하지 않는다.
  expect(reviews[1]!.args["p_patch"]).toEqual({ expect: "첫눈이 와요!" });

  // 다 있으면 번역하지 않는다.
  const full = setup({
    draft: {
      ...draft,
      line: {
        ko: "x",
        meaning: Object.fromEntries(["en", ...STORY_OTHER_LANGS].map((l) => [l, "t"])),
      },
    },
  });
  await full.call({ action: "review", id: DRAFT, step: "approve" });
  expect(
    full.rpcs
      .filter((rpc) => rpc.fn === "companion_review_story_draft")
      .map((rpc) => rpc.args["p_action"]),
  ).toEqual(["approve"]);

  // 번역이 실패하면 승인하지 않는다.
  const failed = setup({ draft: { ...draft, line: { ko: "x", meaning: { en: "[fail]" } } } });
  expect((await failed.call({ action: "review", id: DRAFT, step: "approve" })).body["result"]).toBe(
    "translate_failed",
  );
  expect(failed.rpcs.some((rpc) => rpc.fn === "companion_review_story_draft")).toBe(false);
  expect(
    (await setup({ draft: null }).call({ action: "review", id: DRAFT, step: "approve" })).body[
      "result"
    ],
  ).toBe("not_found");
});

test("검토: 나머지 단계는 RPC 한 번 · 한 줄을 고치면 로마자를 다시 만든다 · 모르는 단계는 받지 않는다", async () => {
  const { call, rpcs } = setup({ llm: null });
  const edited = await call({
    action: "review",
    id: DRAFT,
    step: "edit",
    patch: { ko: "같이 가요!" },
    by: "혜성",
  });
  expect(edited.body["result"]).toBe("ok");
  expect(rpcs).toEqual([
    {
      fn: "companion_review_story_draft",
      args: {
        p_id: DRAFT,
        p_action: "edit",
        p_patch: { ko: "같이 가요!", roman: "gachi gayo!" },
        p_by: "혜성",
        p_now: "2026-11-22T03:00:00.000Z",
      },
    },
  ]);
  // 숫자는 읽는 법을 같이 주면 그것으로, 로마자를 직접 주면 그대로.
  await call({
    action: "review",
    id: DRAFT,
    step: "edit",
    patch: { ko: "12월이에요", reading: "십이월이에요" },
  });
  expect((rpcs.at(-1)!.args["p_patch"] as { roman: string }).roman).toBe("sibiworieyo");
  await call({
    action: "review",
    id: DRAFT,
    step: "edit",
    patch: { ko: "신문로예요", roman: "sinmunnoyeyo" },
  });
  expect((rpcs.at(-1)!.args["p_patch"] as { roman: string }).roman).toBe("sinmunnoyeyo");
  await call({ action: "review", id: DRAFT, step: "discard" });
  expect(rpcs.at(-1)!.args).toMatchObject({ p_action: "discard", p_patch: {} });
  const before = rpcs.length;
  expect((await call({ action: "review", id: DRAFT, step: "delete_everything" })).body).toEqual({
    result: "invalid",
  });
  expect((await call({ action: "review", id: "1; drop", step: "discard" })).body).toEqual({
    result: "invalid",
  });
  expect(rpcs).toHaveLength(before);
});
