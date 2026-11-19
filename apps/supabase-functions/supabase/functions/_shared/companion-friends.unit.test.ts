import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

import type { AgeBand, PersonaCard, RomanceTier } from "./chat-send.contract.ts";
import { bodySchema } from "./companion-eval-schema.ts";
import { companionEvalSets } from "./companion-eval-sets.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { refusalTopic } from "./companion-llm-prompts.ts";
import { companionSystemPrompt, type PromptInput } from "./companion-prompt.ts";
import {
  effectiveRomanceTier,
  moderationInstruction,
  outputCheckRequired,
} from "./companion-safety.ts";
import { checkSystem, promptSystem } from "./companion-snapshot-prompts.ts";

// 추천 친구 · 완화 수위(ADR-0163). 수위 표: open 인물 × {성인 + 동의(open), 성인 동의 없음(standard), 나이 모름, 미성년자}와 standard 인물.
const seoyeon: PersonaCard = {
  name: "차서연",
  kind: "friend",
  met: "friend_app",
  romanceTier: "open",
  mbti: "ENTP",
  role: "A stranger the learner matched with on a friend-finding app.",
  background: ["Lives with a black cat named 먹물."],
  personality: ["ENTP: turns small talk into a playful debate."],
  romance: "You flirt first, as a game.",
};
const haejun: PersonaCard = {
  ...seoyeon,
  name: "권해준",
  dialect: "Busan dialect (부산말).",
  romance: "You are in no hurry.",
};
const daeun: PersonaCard = {
  name: "송다은",
  kind: "friend",
  met: "language_exchange",
  romanceTier: "standard",
  romance: "A friend first.",
};
const duksu: PersonaCard = { name: "덕수쌤", romance: "You are their teacher." };

const prompt = (persona: PersonaCard, ageBand: AgeBand, romanceTier?: RomanceTier) => {
  const input: PromptInput = {
    persona,
    speechLevel: "polite",
    ageBand,
    l1: "en",
    expressions: [],
    summary: null,
    feedbackMode: "separate",
    memories: [],
    directive: null,
    ...(romanceTier === undefined ? {} : { romanceTier }),
  };
  return companionSystemPrompt(input);
};
const romanceLine = (persona: PersonaCard, ageBand: AgeBand, tier?: RomanceTier) =>
  prompt(persona, ageBand, tier)
    .dynamic.split("\n")
    .find((line) => line.startsWith("- Romance:"))!;

test("FT1. 적용 수위 — open은 성인 + open일 때만, 출력 검사는 성인 standard만 건너뛴다", () => {
  const matrix: [AgeBand, RomanceTier | undefined, RomanceTier, boolean][] = [
    ["adult", "open", "open", true],
    ["adult", "standard", "standard", false],
    ["adult", undefined, "standard", false],
    ["unknown", "open", "standard", true],
    ["minor", "open", "standard", true],
    ["minor", "standard", "standard", true],
  ];
  for (const [ageBand, tier, effective, check] of matrix) {
    expect(effectiveRomanceTier(ageBand, tier), `${ageBand} ${tier}`).toBe(effective);
    expect(outputCheckRequired(ageBand, tier), `${ageBand} ${tier}`).toBe(check);
  }
});

test("FT2. 검사 지시 — open(성인)만 연인 · 키스 · 껴안기 통과, 성적 내용은 모두 차단 · 나머지는 지금 그대로", () => {
  for (const layer of ["input", "output_sync"] as const) {
    const open = moderationInstruction(layer, "adult", "open");
    expect(open).toContain("kissing, cuddling or embracing, leaning on each other");
    expect(open).toContain('"사랑해"');
    expect(open).toContain(
      'explicit description of bodies or arousal, sexual talk, dirty talk or sexual jokes (음담패설), and sexual requests — spoken, requested or as an *action* → "block" with category "sexual"',
    );
    expect(open).not.toContain("beyond holding hands or a hug");
    // 성인 동의 없음(standard) · 나이 모름 · 미성년자는 수위를 넘겨도 지금 그대로다.
    expect(moderationInstruction(layer, "adult", "standard")).toBe(
      moderationInstruction(layer, "adult"),
    );
    for (const band of ["unknown", "minor"] as const)
      expect(moderationInstruction(layer, band, "open")).toBe(moderationInstruction(layer, band));
  }
  expect(moderationInstruction("output_sync", "adult", "open")).toContain(
    'jealous or possessive, pressure the learner, or start physical intimacy out of nowhere → "block" with category "romance"',
  );
  expect(moderationInstruction("input", "adult", "open")).not.toContain("jealous");
});

test("FT3. 답 프롬프트 — open 인물의 Romance 줄은 성인 + open만 완화, 앞부분(캐시)은 수위와 상관없이 인물마다 같다", () => {
  const open = romanceLine(seoyeon, "adult", "open");
  expect(open).toContain("You may be a couple, say 사랑해, kiss, cuddle, embrace");
  expect(open).toContain("move the scene on, in character (fade to black)");
  expect(open).toContain("never act jealous or possessive");
  expect(open).toContain("You flirt first, as a game.");
  // 성인 동의 없음 = standard: 포옹까지.
  expect(romanceLine(seoyeon, "adult", "standard")).toContain("never go past a hug");
  expect(romanceLine(seoyeon, "adult")).toContain("never go past a hug");
  for (const band of ["unknown", "minor"] as const)
    expect(romanceLine(seoyeon, band, "open")).toContain("- Romance: none.");
  // standard 인물은 open이 와도 standard(앞부분 수위선과 어긋나지 않게).
  expect(romanceLine(daeun, "adult", "open")).toContain("never go past a hug");
  const stable = prompt(seoyeon, "adult", "open").stable;
  for (const [band, tier] of [
    ["adult", "standard"],
    ["unknown", "open"],
    ["minor", undefined],
  ] as const)
    expect(prompt(seoyeon, band, tier).stable).toBe(stable);
  expect(stable).toContain("No explicit sexual content: no sexual acts, nudity or undressing");
  expect(stable).toContain('follows the "Romance" line under "This learner" — never go beyond it');
  // standard 인물 · 스토리 인물의 앞부분 수위선은 지금 그대로(키스 없음).
  for (const persona of [daeun, duksu])
    expect(prompt(persona, "adult", "open").stable).toContain(
      "No physical intimacy beyond holding hands or a hug — never kissing",
    );
});

test("FT4. 답 프롬프트 — 친구는 스토리 밖 · 만난 길 · 가르치지 않기 · 사투리, AI 고지는 그대로, 스토리 인물은 지금 그대로", () => {
  const friend = prompt(seoyeon, "adult").stable;
  expect(friend).toContain(
    "You are 차서연, an ordinary person living in Korea. You are chatting in Duru, a Korean-learning app, with a learner you met through a friend-finding app.",
  );
  expect(prompt(daeun, "adult").stable).toContain("met through a language exchange");
  expect(friend).toContain("you do not know its characters, the guesthouse or its episodes");
  expect(friend).not.toContain("You only know the parts of the story");
  expect(friend).toContain(
    "Never lecture, explain grammar or correct the learner's Korean unprompted",
  );
  expect(friend).toContain("one step above their level");
  expect(friend).toContain("you never claim to be a real human if sincerely asked");
  expect(friend).toContain("- Background:\n- Lives with a black cat named 먹물.");
  expect(friend).toContain("- Personality (MBTI ENTP):\n- ENTP: turns small talk");
  expect(friend).not.toContain("dialect");
  const busan = prompt(haejun, "adult").stable;
  expect(busan).toContain("- Dialect: Busan dialect (부산말).");
  expect(busan).toContain(
    "teach one phrase in your dialect together with its standard Korean form",
  );
  const story = prompt(duksu, "adult").stable;
  expect(story).toContain("You are 덕수쌤, a character in Duru");
  expect(story).toContain("You only know the parts of the story the learner has reached.");
  expect(story).not.toContain("Personality");
  expect(story).toBe(prompt({ ...duksu, mbti: "ENFJ", romanceTier: "standard" }, "adult").stable);
});

test("FT5. 거절 분류 말 — open이면 로맨스 · 성 분류의 말이 다르고, 그 밖은 그대로", () => {
  expect(refusalTopic("romance")).toBe("physical intimacy beyond holding hands or a hug");
  expect(refusalTopic("romance", "open")).toBe(
    "pushy, possessive or out-of-nowhere romantic behaviour",
  );
  expect(refusalTopic("sexual", "open")).toBe("explicit sexual content");
  expect(refusalTopic("profanity", "open")).toBe(refusalTopic("profanity"));
});

test("FT6. 스냅샷 그림 규칙은 수위로 넓어지지 않는다 — 성인도 키스 이상 없음, 함수에 수위 인수가 없다", () => {
  expect(promptSystem.length).toBe(1);
  expect(checkSystem.length).toBe(1);
  expect(promptSystem("adult")).toContain("No kissing or anything more intimate");
  expect(checkSystem("adult")).toContain("kissing or anything more intimate than holding hands");
  // 스냅샷 작업은 연령대만 싣는다 — 수위 칸이 없다.
  const run = readFileSync(new URL("./companion-media-run.ts", import.meta.url), "utf8");
  const prompts = readFileSync(new URL("./companion-snapshot-prompts.ts", import.meta.url), "utf8");
  expect(run).not.toContain("romanceTier");
  expect(prompts).not.toContain("romanceTier");
});

test("FT7. 가짜 검사 — open(성인)은 키스 · 사랑해 통과, 성적인 말은 입력 · 출력 차단, 그 밖은 지금 그대로", async () => {
  const llm = fakeCompanionLlm();
  const verdict = (
    text: string,
    ageBand: AgeBand,
    romanceTier: RomanceTier,
    layer: "input" | "output_sync" = "input",
  ) =>
    llm.moderate({
      layer,
      text,
      context: null,
      ageBand,
      romanceTier,
      signal: new AbortController().signal,
    });
  expect(await verdict("*볼에 키스한다*", "adult", "open")).toEqual({
    category: "safe",
    action: "allow",
  });
  expect(await verdict("사랑해", "adult", "open")).toMatchObject({ action: "allow" });
  expect(await verdict("*볼에 키스한다*", "adult", "standard")).toEqual({
    category: "romance",
    action: "block",
  });
  for (const band of ["unknown", "minor"] as const)
    expect(await verdict("사랑해", band, "open")).toMatchObject({ category: "romance" });
  expect(await verdict("섹스하자", "adult", "open")).toEqual({
    category: "sexual",
    action: "block",
  });
  expect(await verdict("sex", "adult", "open", "output_sync")).toMatchObject({
    category: "sexual",
  });
});

test("FT8. 평가 세트 — 본문 스키마를 지나고(≤ 20), 친구 넷마다 10개 · 경계 세트는 수위 표를 덮는다", () => {
  const friendSets = companionEvalSets.filter((set) => set.id.startsWith("friend-"));
  expect(friendSets.map((set) => set.id)).toEqual([
    "friend-seoyeon",
    "friend-haejun",
    "friend-daeun",
    "friend-geonwoo",
  ]);
  const ids = new Set<string>();
  for (const set of companionEvalSets) {
    expect(bodySchema.safeParse({ kind: set.kind, cases: set.cases }).success, set.id).toBe(true);
    for (const item of set.cases) {
      expect(ids.has(item.id), item.id).toBe(false);
      ids.add(item.id);
    }
  }
  for (const set of friendSets) expect(set.cases).toHaveLength(10);
  const moderation = companionEvalSets.find((set) => set.kind === "moderation")!;
  expect(Object.keys(moderation.expect!).sort()).toEqual(
    moderation.cases.map((item) => item.id).sort(),
  );
  const combos = new Set(moderation.cases.map((item) => `${item.ageBand}/${item.romanceTier}`));
  for (const combo of ["adult/open", "adult/standard", "unknown/open", "minor/open"])
    expect(combos.has(combo), combo).toBe(true);
});

test("FT9. 평가 세트 — 가짜 검사가 흉내 내는 낱말의 경계 케이스는 기대 판정과 같다", async () => {
  const llm = fakeCompanionLlm();
  const moderation = companionEvalSets.find((set) => set.kind === "moderation")!;
  // 가짜는 낱말(키스 · 사랑해 · 섹스 · 위기)만 안다 — 그 낱말이 든 케이스만 견준다.
  const known = ["TB1", "TB2", "TB3", "TB4", "TB5", "TB6", "TB11", "TB14", "TB15"];
  for (const item of moderation.cases.filter((entry) => known.includes(entry.id))) {
    const verdict = await llm.moderate({
      layer: item.layer ?? "input",
      text: item.text,
      context: item.context ?? null,
      ageBand: item.ageBand ?? "adult",
      romanceTier: item.romanceTier ?? "standard",
      signal: new AbortController().signal,
    });
    expect(verdict, item.id).toMatchObject(moderation.expect![item.id]!);
  }
});

test("FT10. 속 이야기 — 있는 칸만 「한꺼번에 늘어놓지 말 것」과 함께 그리고, 하나도 없으면 줄이 없다", () => {
  const withLife = prompt(
    { ...seoyeon, values: ["Honesty over politeness."], likes: ["Rainy days"] },
    "adult",
  ).stable;
  expect(withLife).toContain("- Your life (never recite these; bring up one detail at a time");
  expect(withLife).toContain("- What you believe:\n- Honesty over politeness.");
  expect(withLife).toContain("- You like:\n- Rainy days");
  expect(withLife).not.toContain("Your past");
  expect(prompt(seoyeon, "adult").stable).not.toContain("Your life");
});
