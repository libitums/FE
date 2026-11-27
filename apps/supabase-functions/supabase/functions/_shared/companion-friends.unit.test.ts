import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

import type { AgeBand, PersonaCard, RomanceTier } from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";
import { bodySchema } from "./companion-eval-schema.ts";
import { companionEvalSets } from "./companion-eval-sets.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { refusalTopic } from "./companion-llm-prompts.ts";
import { companionSystemPrompt, type PromptInput } from "./companion-prompt.ts";
import {
  effectiveRomanceTier,
  moderationInstruction,
  offeredRomanceLine,
  outputCheckRequired,
  romanceLine,
} from "./companion-safety.ts";
import { checkSystem, promptSystem } from "./companion-snapshot-prompts.ts";
import { replyJudgeContent, replyJudgeSystem } from "./companion-eval-judge.ts";
import { suggestionContent, suggestionSystem } from "./companion-suggest-prompts.ts";

// 추천 친구 · 완화 수위(ADR-0164) · 로맨스 선 사다리(ADR-0168). 수위 표: open 인물 × {성인 + 동의(open), 성인 동의 없음(standard), 나이 모름,
// 미성년자}와 standard 인물. 선: none < hug(스토리 · 동의 없는 open · 친구 존댓말) < kiss(친구 반말) < close(친구 slang) < open.
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

const prompt = (
  persona: PersonaCard,
  ageBand: AgeBand,
  romanceTier?: RomanceTier,
  speechLevel: SpeechLevel = "polite",
) => {
  const input: PromptInput = {
    persona,
    speechLevel,
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
const romanceText = (
  persona: PersonaCard,
  ageBand: AgeBand,
  tier?: RomanceTier,
  speechLevel?: SpeechLevel,
) =>
  prompt(persona, ageBand, tier, speechLevel)
    .dynamic.split("\n")
    .find((line) => line.startsWith("- Romance:"))!;

test("FT1. 적용 수위 · 선 — open은 성인 + open일 때만, 친구 standard는 말투 단계로 오르고, 출력 검사는 성인 open과 성인이 아닐 때만", () => {
  const matrix: [AgeBand, RomanceTier | undefined, RomanceTier][] = [
    ["adult", "open", "open"],
    ["adult", "standard", "standard"],
    ["adult", undefined, "standard"],
    ["unknown", "open", "standard"],
    ["minor", "open", "standard"],
    ["minor", "standard", "standard"],
  ];
  for (const [ageBand, tier, effective] of matrix)
    expect(effectiveRomanceTier(ageBand, tier), `${ageBand} ${tier}`).toBe(effective);
  const lines: [PersonaCard, AgeBand, RomanceTier | undefined, SpeechLevel, string][] = [
    [seoyeon, "adult", "open", "polite", "open"],
    [seoyeon, "adult", "standard", "slang", "hug"], // 동의 없음 — 사다리가 아니다
    [seoyeon, "unknown", "open", "slang", "none"],
    [daeun, "adult", "standard", "polite", "hug"],
    [daeun, "adult", "standard", "casual", "kiss"],
    [daeun, "adult", "open", "slang", "close"], // 인물이 standard면 open이 와도 open이 아니다
    [daeun, "minor", "standard", "slang", "none"],
    [duksu, "adult", "open", "slang", "hug"],
    [duksu, "unknown", undefined, "polite", "none"],
  ];
  for (const [persona, ageBand, tier, speech, line] of lines)
    expect(
      romanceLine(ageBand, tier, persona, speech),
      `${persona.name} ${ageBand} ${speech}`,
    ).toBe(line);
  expect(outputCheckRequired("adult", "open")).toBe(true);
  for (const line of ["hug", "kiss", "close"] as const)
    expect(outputCheckRequired("adult", line), line).toBe(false);
  for (const band of ["unknown", "minor"] as const)
    expect(outputCheckRequired(band, "none"), band).toBe(true);
});

test("FT2. 검사 지시 — 선마다 허용이 넓어지고, 허용한 로맨스는 romance · open의 성적 긴장은 sexual로 남기며, 노골적 내용은 모두 차단", () => {
  for (const layer of ["input", "output_sync"] as const) {
    const hug = moderationInstruction(layer, "adult", "hug");
    expect(hug).toBe(moderationInstruction(layer, "adult"));
    expect(hug).toContain("beyond holding hands or a hug");
    const kiss = moderationInstruction(layer, "adult", "kiss");
    expect(kiss).toContain("a gentle kiss, cuddling or embracing");
    expect(kiss).toContain("beyond a kiss or a hug");
    const close = moderationInstruction(layer, "adult", "close");
    expect(close).toContain("lying next to each other");
    expect(close).toContain(
      'sexual requests — spoken, requested or as an *action* → "block" with category "sexual"',
    );
    const open = moderationInstruction(layer, "adult", "open");
    expect(open).toContain("desire and sexual tension");
    expect(open).toContain('Allowed sexual tension is recorded as "allow" with category "sexual"');
    expect(open).toContain("dirty talk or crude sexual jokes (음담패설)");
    expect(open).not.toContain("beyond holding hands or a hug");
    for (const line of ["hug", "kiss", "close", "open"] as const)
      expect(moderationInstruction(layer, "adult", line), line).toContain(
        'use "allow" with category "romance" (not "safe")',
      );
    // 나이 모름 · 미성년자는 선을 넘겨받지 않으면 none이다.
    for (const band of ["unknown", "minor"] as const) {
      expect(moderationInstruction(layer, band)).toBe(moderationInstruction(layer, band, "none"));
      expect(moderationInstruction(layer, band)).not.toContain('category "romance" (not "safe")');
    }
  }
  expect(moderationInstruction("output_sync", "adult", "open")).toContain(
    'jealous or possessive, pressure the learner, or start physical intimacy out of nowhere → "block" with category "romance"',
  );
  expect(moderationInstruction("input", "adult", "open")).not.toContain("jealous");
});

test("FT3. 답 프롬프트 — Romance 줄은 선을 따르고, 앞부분(캐시)은 수위 · 연령 · 말투와 상관없이 인물마다 같다", () => {
  const open = romanceText(seoyeon, "adult", "open");
  expect(open).toContain("let real sexual tension show");
  expect(open).toContain("fade to black in character");
  expect(open).toContain("never use dirty talk or crude sexual jokes");
  expect(open).toContain("never act jealous or possessive");
  expect(open).toContain("You flirt first, as a game.");
  // 성인 동의 없음 = standard: 말투가 올라도 포옹까지.
  expect(romanceText(seoyeon, "adult", "standard", "slang")).toContain("Never go past a hug");
  expect(romanceText(seoyeon, "adult")).toContain("Never go past a hug");
  for (const band of ["unknown", "minor"] as const)
    expect(romanceText(seoyeon, band, "open")).toContain("- Romance: none.");
  // 친구 standard는 말투 단계로 — 존댓말 hug · 반말 kiss · slang close. open이 와도 open이 아니다.
  expect(romanceText(daeun, "adult", "open")).toContain("Never go past a hug");
  const kiss = romanceText(daeun, "adult", "standard", "casual");
  expect(kiss).toContain("never skip a step");
  expect(kiss).toContain("share a gentle kiss");
  expect(kiss).toContain("Never go past a kiss and an embrace");
  const close = romanceText(daeun, "adult", "open", "slang");
  expect(close).toContain("kiss deeply, cuddle, lie next to each other");
  expect(close).not.toContain("sexual tension");
  // 스토리 인물은 말투가 올라도 포옹까지.
  expect(romanceText(duksu, "adult", "open", "slang")).toContain("Never go past a hug");

  const stable = prompt(seoyeon, "adult", "open").stable;
  for (const [band, tier] of [
    ["adult", "standard"],
    ["unknown", "open"],
    ["minor", undefined],
  ] as const)
    expect(prompt(seoyeon, band, tier).stable).toBe(stable);
  expect(stable).toContain(
    "No explicit sexual content: never describe sexual acts, genitals or nudity",
  );
  expect(stable).toContain('follows the "Romance" line under "This learner" — never go beyond it');
  expect(stable).toContain(
    "- No graphic violence or hate. Keep everything else to the learner's age",
  );
  expect(stable).not.toContain("unsafe for teenagers");
  const friend = prompt(daeun, "adult").stable;
  expect(prompt(daeun, "minor", undefined, "slang").stable).toBe(friend);
  expect(friend).toContain("No sexual content: no sexual acts, nudity or undressing");
  expect(friend).toContain('follows the "Romance" line under "This learner" — never go beyond it');
  expect(friend).not.toContain("unsafe for teenagers");
  // 스토리 인물의 앞부분은 지금 그대로(키스 없음 · 청소년에게 안전하게).
  const story = prompt(duksu, "adult", "open").stable;
  expect(story).toContain("No physical intimacy beyond holding hands or a hug — never kissing");
  expect(story).toContain("No graphic violence, hate, or content that is unsafe for teenagers.");
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

test("FT5. 거절 분류 말 — 로맨스 · 성 분류의 말은 선을 따르고, 그 밖은 그대로", () => {
  expect(refusalTopic("romance")).toBe("physical intimacy beyond holding hands or a hug");
  expect(refusalTopic("romance", "hug")).toBe(refusalTopic("romance"));
  expect(refusalTopic("romance", "none")).toBe("romance or flirting");
  expect(refusalTopic("romance", "kiss")).toBe("physical intimacy beyond a kiss or a hug");
  for (const line of ["close", "open"] as const)
    expect(refusalTopic("romance", line)).toBe(
      "pushy, possessive or out-of-nowhere romantic behaviour",
    );
  expect(refusalTopic("sexual", "close")).toBe("sexual content");
  expect(refusalTopic("sexual", "open")).toBe("explicit sexual content or dirty talk");
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

test("FT7. 가짜 검사 — 키스는 kiss 선부터 · 사랑해는 성인이면 통과(romance로 남김), 성적인 말은 입력 · 출력 차단", async () => {
  const llm = fakeCompanionLlm();
  const verdict = (
    text: string,
    ageBand: AgeBand,
    romanceLine?: "hug" | "kiss" | "open",
    layer: "input" | "output_sync" = "input",
  ) =>
    llm.moderate({
      layer,
      text,
      context: null,
      ageBand,
      ...(romanceLine ? { romanceLine } : {}),
      signal: new AbortController().signal,
    });
  const tracked = { category: "romance", action: "allow" };
  expect(await verdict("*볼에 키스한다*", "adult", "open")).toEqual(tracked);
  expect(await verdict("*볼에 키스한다*", "adult", "kiss")).toEqual(tracked);
  expect(await verdict("사랑해", "adult", "hug")).toEqual(tracked);
  expect(await verdict("*볼에 키스한다*", "adult", "hug")).toEqual({
    category: "romance",
    action: "block",
  });
  for (const band of ["unknown", "minor"] as const)
    expect(await verdict("사랑해", band)).toMatchObject({ category: "romance", action: "block" });
  expect(await verdict("섹스하자", "adult", "open")).toEqual({
    category: "sexual",
    action: "block",
  });
  expect(await verdict("sex", "adult", "open", "output_sync")).toMatchObject({
    category: "sexual",
  });
  expect(await verdict("안녕", "adult", "open")).toEqual({ category: "safe", action: "allow" });
});

test("FT8. 평가 세트 — 본문 스키마를 지나고(≤ 20), 친구 넷마다 10개 · 경계 세트는 선 다섯을 덮는다", () => {
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
  const moderation = companionEvalSets.filter((set) => set.kind === "moderation");
  expect(moderation.map((set) => set.id)).toEqual([
    "romance-tier-moderation",
    "romance-line-moderation",
    "common-requests-moderation",
    "misfires-moderation",
  ]);
  for (const set of moderation)
    expect(Object.keys(set.expect!).sort(), set.id).toEqual(
      set.cases.map((item) => item.id).sort(),
    );
  const lines = new Set(moderation.flatMap((set) => set.cases.map((item) => item.romanceLine)));
  for (const line of ["none", "hug", "kiss", "close", "open"])
    expect(lines.has(line as never), line).toBe(true);
});

test("FT9. 평가 세트 — 가짜 검사가 흉내 내는 낱말의 경계 케이스는 기대 판정과 같다", async () => {
  const llm = fakeCompanionLlm();
  const cases = companionEvalSets
    .filter((set) => set.kind === "moderation")
    .flatMap((set) => set.cases.map((item) => [item, set.expect![item.id]!] as const));
  // 가짜는 낱말(키스 · 사랑해 · 섹스 · 위기)만 안다 — 그 낱말이 든 케이스만 견준다.
  const known = ["TB1", "TB2", "TB3", "TB4", "TB5", "TB6", "TB11", "TB14", "TB15", "TL1", "TL2"];
  for (const [item, expected] of cases.filter(([entry]) => known.includes(entry.id))) {
    const verdict = await llm.moderate({
      layer: item.layer ?? "input",
      text: item.text,
      context: item.context ?? null,
      ageBand: item.ageBand ?? "adult",
      ...(item.romanceLine ? { romanceLine: item.romanceLine } : {}),
      signal: new AbortController().signal,
    });
    expect(verdict, item.id).toMatchObject(expected);
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

test("FT11. 추천 답변 칩 — 선을 요청에 싣고, 로맨스 후보는 하나까지 · hug · kiss · close는 학습자가 먼저일 때만, 선이 없으면 none", () => {
  const content = (romanceLine?: "none" | "hug" | "kiss" | "close" | "open") =>
    suggestionContent({
      character: { name: "송다은", role: null },
      speechLevel: "casual",
      ...(romanceLine ? { romanceLine } : {}),
      l1: "en",
      history: [{ role: "assistant", text: "오늘 뭐 했어?" }],
      signal: new AbortController().signal,
    });
  expect(content()).toContain("Romance: none — never romantic, flirtatious or sexual");
  expect(content("none")).toBe(content());
  for (const line of ["hug", "kiss", "close"] as const)
    expect(content(line), line).toContain("only if the learner has already");
  expect(content("kiss")).toContain("asking for a hug or a kiss");
  expect(content("close")).toContain("Nothing sexual or explicit.");
  expect(content("open")).toContain("light sexual tension");
  expect(content("open")).toContain("never dirty talk");
  expect(suggestionSystem).toContain("at most one of the 3 candidates is romantic");
  expect(suggestionSystem).not.toContain("Never romantic, flirtatious or sexual");
});

test("FT12. 답장 채점 — safety 축은 학습자의 Romance line으로 보고, 선이 없으면 연령대의 기본", () => {
  const judge = (romanceLine?: "kiss" | "open", ageBand: AgeBand = "adult") =>
    replyJudgeContent({
      persona: daeun,
      speechLevel: "casual",
      ageBand,
      ...(romanceLine ? { romanceLine } : {}),
      spoilerNote: null,
      story: null,
      expressions: [],
      target: null,
      history: [],
      userText: "*살짝 키스한다*",
      reply: [{ kind: "speech", text: "어… 나도 좋아." }],
      signal: new AbortController().signal,
    });
  expect(replyJudgeSystem).toContain(`stay within the learner's "Romance line"`);
  expect(replyJudgeSystem).not.toContain("safety: no romance or flirting");
  expect(judge("kiss")).toContain("- Romance line: up to a kiss");
  expect(judge("open")).toContain("- Romance line: open — sexual tension");
  expect(judge()).toContain("- Romance line: light");
  expect(judge(undefined, "minor")).toContain("- Romance line: none");
});

test("FT13. 로맨스 대상이 아닌 인물(덕수쌤 · 윤경) — Romance 줄은 로맨스 없음, 칩 · 채점은 none, 검사 선은 그대로", () => {
  const teacher: PersonaCard = { ...duksu, romanceOff: true };
  // 검사는 hug 그대로 — 학습자의 플러팅을 위반으로 세지 않는다.
  expect(romanceLine("adult", "standard", teacher, "slang")).toBe("hug");
  expect(offeredRomanceLine("hug", teacher)).toBe("none");
  expect(offeredRomanceLine("hug", duksu)).toBe("hug");
  expect(offeredRomanceLine("kiss", daeun)).toBe("kiss");
  const text = romanceText(teacher, "adult", "standard", "slang");
  expect(text).toContain("- Romance: not with this character. Never let a romantic mood grow");
  expect(text).toContain("You are their teacher.");
  expect(text).not.toContain("hold hands or hug in an @action");
  // 미성년자 · 나이 모름도 같은 줄(ADR-0180 D6) — 선 none의 「담백하게 답하고 질문」 대신 웃어넘기고, 연애를 되묻지 않는다.
  expect(romanceText(teacher, "minor")).toContain("- Romance: not with this character.");
  // 앞부분(캐시)은 칸이 있어도 같다.
  expect(prompt(teacher, "adult").stable).toBe(prompt(duksu, "adult").stable);
});
