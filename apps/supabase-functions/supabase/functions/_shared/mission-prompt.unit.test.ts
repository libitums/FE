import { describe, expect, test } from "vitest";

import type { PersonaCard } from "./chat-send.contract.ts";
import { missionCounterpartBase } from "./mission-definition.ts";
import {
  goalsState,
  missionStateLine,
  missionSystemPrompt,
  missionTurnDynamicTemplate,
  missionTurnStableTemplate,
  requiredStatusWords,
  turnDynamic,
  turnSystemStable,
} from "./mission-prompt.ts";
import { initialMissionProgress } from "./mission-state.ts";
import { placeholders } from "./mission-template.ts";
import { cafeMission, waterMission } from "./mission-test-data.ts";

// 프롬프트는 스냅숏이 아니라 「이 규칙 · 이 역할 카드가 들어 있다」로 봅니다 — 문장을 다듬어도 뜻이 남았는지만 묻습니다.

const doyunCard: PersonaCard = {
  name: "한도윤",
  age: "22세",
  job: "카페 끌림 아르바이트 · 소속사 아이돌 연습생(노래 · 춤)",
  role: "골목에서 처음 마주치는 밝은 인상. 궁금한 게 많다",
  register: "손님 응대는 공손한 존댓말",
  speech: "궁금한 걸 먼저 묻는다.",
  samples: ["진짜요?", "그다음엔요?"],
  doNot: ["메인 로맨스", "질투"],
  memorySeed: ["다음 주 오디션 생각에 마음이 불편하지만 티 내지 않는다"],
  topics: ["오디션 연습", "홍대 버스킹"],
  romance: "You enjoy the flirting and tease back, and you may let a light crush mood grow.",
};

describe("고정부 — turnSystemStable", () => {
  const cafe = turnSystemStable(cafeMission, missionCounterpartBase(cafeMission, doyunCard));
  const water = turnSystemStable(waterMission, missionCounterpartBase(waterMission, null));

  test("MP1. PRD §3.4의 규칙 문장이 모두 들어 있다", () => {
    for (const prompt of [cafe, water]) {
      expect(prompt).toContain("Speak Korean only");
      // 페르소나 고정 · 가드레일(2026-11-23 — 실제 실행에서 본 이탈을 막는 줄)
      expect(prompt).toContain("You are not a teacher");
      expect(prompt).toContain("act as if you do not understand it well");
      expect(prompt).toContain("do not teach and do not give them the sentence");
      expect(prompt).toContain("treat it as a strange remark from a customer");
      expect(prompt).toContain("Follow the director's note");
      expect(prompt).toContain("Stay in this role and this scene");
      expect(prompt).toContain("one or two short sentences per reply");
      expect(prompt).toContain("Never say the learner's lines for them");
      expect(prompt).toContain("If the learner goes off topic");
      expect(prompt).toContain("bring them back with a line that belongs in the scene");
      expect(prompt).toContain("No romance");
      expect(prompt).toContain("When every goal, required and optional, is done");
      expect(prompt).toContain("close the scene in this reply");
      // 필수만 이뤘으면 닫지 않고 선택 목표의 기회를 준다 — 학습자가 꺼낼 목표는 대신 묻지 않는다.
      expect(prompt).toContain("When the required goals are done but optional goals remain");
      expect(prompt).toContain("never hint at it or ask about it for them");
    }
  });

  test("MP2. 이 미션의 장면 · 역할 카드 · 예시 대사가 들어 있다", () => {
    const { counterpart } = cafeMission;
    for (const part of [
      cafeMission.scene,
      counterpart.label,
      counterpart.role,
      counterpart.relation,
      counterpart.register,
    ])
      expect(cafe).toContain(part);
    for (const line of counterpart.samples) expect(cafe).toContain(`- ${line}`);
    expect(water).toContain(waterMission.scene);
    expect(water).toContain("편의점 점원");
  });

  test("MP3. 캐스트면 바탕 네 칸이 들어가고, 카드의 로맨스 · 기억 · 화제 · 말씨는 들어가지 않는다", () => {
    expect(cafe).toContain("- Name: 한도윤 (22세)");
    expect(cafe).toContain(`- Job: ${doyunCard.job}`);
    expect(cafe).toContain(`- Speech habits: ${doyunCard.speech}`);
    for (const absent of [
      doyunCard.romance ?? "",
      ...(doyunCard.memorySeed ?? []),
      ...(doyunCard.topics ?? []),
      ...(doyunCard.samples ?? []),
      doyunCard.role ?? "",
      "썸",
      "intimacy",
      "crush",
      "hold hands",
      "hug",
    ])
      expect(cafe).not.toContain(absent);
  });

  test("MP4. 단역이면 바탕 칸 묶음이 없다", () => {
    expect(water).not.toContain("Who you are underneath");
    expect(water).not.toContain("- Name:");
  });

  test("MP5. 출력 형식은 조각 줄과 미션 상태 줄 하나 — 친밀도 칸이 없다", () => {
    expect(cafe).toContain('"@speech "');
    expect(cafe).toContain('"@action "');
    // 상태 줄 뒤에 세 칸의 뜻(목표는 학습자 자신의 한국어 말만)이 온다 — Haiku가 상태 줄을 빠뜨리지 않게 「모든 답에」를 적는다.
    expect(cafe).toContain(
      `${missionStateLine}\n- "goals_done": a goal counts only if the learner said it in Korean`,
    );
    expect(cafe).toContain("always write exactly one last line for the app");
    expect(missionStateLine).toMatch(/^@state \{"goals_done": .*"off_task": .*"closing": /);
    expect(cafe).not.toContain("intimacy_delta");
    expect(cafe).not.toContain("@narration");
  });

  test("MP6. 틀의 자리표는 정해진 것뿐이고 채운 글에는 남지 않는다", () => {
    expect(placeholders(missionTurnStableTemplate).sort()).toEqual(
      [
        "base_block",
        "counterpart_label",
        "register",
        "relation",
        "role",
        "samples",
        "scene",
        "state_line",
      ].sort(),
    );
    expect(placeholders(missionTurnDynamicTemplate).sort()).toEqual(
      [
        "direction",
        "goals_state",
        "hints_used",
        "learned_expressions",
        "learner_l1",
        "required_status",
        "turns_left",
      ].sort(),
    );
    expect(cafe).not.toMatch(/\{\{[a-z][a-z0-9_]*\}\}/);
  });
});

describe("가변부 — turnDynamic", () => {
  test("MP7. 목표 상태 · 남은 턴 · 힌트 수 · 학습자 언어 · 배운 표현이 들어 있다", () => {
    const dynamic = turnDynamic({
      mission: cafeMission,
      progress: { goalsDone: ["order"], learnerTurns: 3, hintsUsed: 1 },
      l1: "th",
      expressions: [
        {
          id: "patt:83586289",
          kind: "pattern",
          surface: "{음료} 한 잔 주세요.",
          roman: null,
          gloss: "Please give me one {drink}.",
        },
        { id: "voca:97270e4b", kind: "word", surface: "네", roman: null, gloss: null },
      ],
    });
    expect(dynamic).toContain(
      "- [x] order (required): 학습자가 음료 하나를 주문했다(종류가 분명하다).",
    );
    expect(dynamic).toContain("- [ ] pay (required):");
    expect(dynamic).toContain("- [ ] stay (optional):");
    expect(dynamic).toContain("- Required goals: not all done yet");
    expect(dynamic).toContain("including the message you are answering: 7");
    expect(dynamic).toContain("Hints the learner has used: 1");
    expect(dynamic).toContain("(BCP 47): th.");
    expect(dynamic).toContain("- {음료} 한 잔 주세요. (Please give me one {drink}.)");
    expect(dynamic).toContain("\n- 네");
  });

  test("MP8. 학습자 언어를 모르면 en, 배운 표현이 없으면 「아직 없음」 줄", () => {
    const dynamic = turnDynamic({
      mission: waterMission,
      progress: initialMissionProgress,
      l1: null,
      expressions: [],
    });
    expect(dynamic).toContain("(BCP 47): en.");
    expect(dynamic).toContain("none yet");
    expect(dynamic).toContain(`including the message you are answering: ${waterMission.turnLimit}`);
  });

  test("MP8b. 필수를 다 이뤘으면 required_status가 done — 고정 앞부분은 그대로", () => {
    const input = { mission: cafeMission, l1: "en", expressions: [], base: null } as const;
    const before = missionSystemPrompt({ ...input, progress: initialMissionProgress });
    const after = missionSystemPrompt({
      ...input,
      progress: { goalsDone: ["order", "pay"], learnerTurns: 4, hintsUsed: 0 },
    });
    expect(after.dynamic).toContain(`- Required goals: ${requiredStatusWords.done}`);
    expect(before.dynamic).toContain(`- Required goals: ${requiredStatusWords.pending}`);
    expect(after.stable).toBe(before.stable);
  });

  test("MP9. goalsState는 파일 순서, missionSystemPrompt는 두 부분을 함께 돌려준다", () => {
    expect(
      goalsState(waterMission, ["receipt", "bag"])
        .split("\n")
        .map((line) => line.slice(0, 5)),
    ).toEqual(["- [x]", "- [ ]", "- [x]", "- [ ]"]);
    const prompt = missionSystemPrompt({
      mission: waterMission,
      base: null,
      progress: initialMissionProgress,
      l1: "en",
      expressions: [],
    });
    expect(prompt.stable).toBe(turnSystemStable(waterMission, null));
    expect(prompt.dynamic.startsWith("# Mission state")).toBe(true);
  });
});
