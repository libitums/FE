import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { buildMissionLabBundle, type MissionLabBundle } from "./mission-bundle.ts";
import { parseMissionReply } from "./mission-state.ts";
import { scoreMission } from "./mission-score.ts";
import { placeholders } from "./mission-template.ts";
import { loadMissionFiles } from "./mission-test-data.ts";

// 실험실 번들(`apps/supabase-functions/mission-lab-bundle.json`)이 지금 코드와 같은지 봅니다. 프롬프트 · 미션 파일 · 점수식 · 사례를
// 고치고 번들을 다시 만들지 않으면 실패합니다 — 대시보드가 옛 프롬프트로 실험하게 되기 때문입니다.
// `UPDATE_MISSION_LAB_BUNDLE=1`이면 검사 앞에 파일을 다시 씁니다(`pnpm mission:bundle`). 글자가 아니라 내용을 견줍니다 —
// `pnpm format`이 JSON의 줄바꿈을 바꿉니다. 만든 시각 · 커밋(`generatedAt` · `source`)은 견주지 않습니다.

const bundlePath = fileURLToPath(new URL("../../../mission-lab-bundle.json", import.meta.url));

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/** 커밋되지 않은 변경이 있으면 `working-tree`, 아니면 HEAD의 sha. */
function sourceCommit(): string {
  const status = git(["status", "--porcelain"]);
  const head = git(["rev-parse", "HEAD"]);
  return status === "" && head !== null ? head : "working-tree";
}

const comparable = (bundle: unknown) => {
  const { generatedAt: _generatedAt, source: _source, ...rest } = bundle as MissionLabBundle;
  return rest;
};

const build = () =>
  buildMissionLabBundle({
    missions: loadMissionFiles(),
    commit: sourceCommit(),
    generatedAt: new Date().toISOString(),
  });

describe("미션 실험실 번들", () => {
  test("MB1. 커밋한 번들이 코드에서 만든 결과와 같다", () => {
    const expected = build();
    if (process.env["UPDATE_MISSION_LAB_BUNDLE"] === "1") {
      writeFileSync(bundlePath, `${JSON.stringify(expected, null, 2)}\n`);
    }
    const committed: unknown = JSON.parse(readFileSync(bundlePath, "utf8"));
    expect(comparable(committed)).toEqual(comparable(expected));
  });

  test("MB2. 규격 v1의 필수 칸이 있다", () => {
    const bundle = build();
    expect(bundle.bundleVersion).toBe(1);
    expect(bundle.source.repo).toBe("libitums/FE");
    expect(Object.keys(bundle.defaults)).toEqual(
      expect.arrayContaining([
        "turnModel",
        "feedbackModel",
        "hintModel",
        "graderModel",
        "turnMaxTokens",
        "graderMaxTokens",
      ]),
    );
    expect(bundle.scoring.weights).toEqual({ task: 0.5, accuracy: 0.3, expression: 0.2 });
    expect(bundle.scoring.hintPenalty).toBe(5);
    expect(bundle.scoring.hintLimit).toBe(3);
    expect(bundle.output.statePrefix).toBe("@state ");
    expect(bundle.output.segmentPrefixes).toEqual({ speech: "@speech ", action: "@action " });
    expect(bundle.prompts.goalLine).toBe("- [{{mark}}] {{id}} ({{requirement}}): {{criteria}}");
    expect(bundle.prompts.transcriptLine).toEqual({
      counterpart: "{{label}}: {{text}}",
      learner: "Learner: {{text}}",
    });
    for (const name of ["goals_state", "required_status", "turns_left", "hints_used", "learner_l1"])
      expect(placeholders(bundle.prompts.turnDynamic)).toContain(name);
    for (const name of ["mission_brief", "goal_id", "goal_criteria", "transcript"])
      expect(placeholders(bundle.prompts.hint.user)).toContain(name);
    expect(bundle.missions.map((mission) => mission.id)).toEqual(["u01-water", "u06-cafe"]);
  });

  test("MB3. 미션의 고정 프롬프트는 다 채워져 있고, 캐스트만 바탕 칸이 있다", () => {
    const bundle = build();
    for (const mission of bundle.missions) {
      expect(mission.turnSystemStable).not.toMatch(/\{\{[a-z][a-z0-9_]*\}\}/);
      expect(mission.missionBrief).toContain(mission.scene);
    }
    const [water, cafe] = bundle.missions;
    expect(cafe?.turnSystemStable).toContain("- Name: 한도윤 (22세)");
    expect(water?.turnSystemStable).not.toContain("- Name:");
  });

  test("MB4. 교정 프롬프트는 서버의 교정 글 · 스키마를 자리표로 뽑은 것이다", () => {
    const { feedback } = build().prompts;
    expect(placeholders(feedback.user).sort()).toEqual(
      ["context", "counterpart_label", "counterpart_role", "learner_text"].sort(),
    );
    expect(placeholders(feedback.system)).toEqual(["learner_l1"]);
    expect(feedback.system).toContain("You give feedback on one chat message");
    expect(feedback.user).toContain("Character: {{counterpart_label}} ({{counterpart_role}})");
    expect(feedback.user).toContain(
      "Recent conversation (context only — do not give feedback on it):\n{{context}}\n\n",
    );
    expect(feedback.schema).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["status", "corrected", "items"]),
    });
  });

  test("MB5. 번들의 사례가 코드의 결과와 같다(점수 · 해석)", () => {
    const bundle = build();
    for (const fixture of bundle.scoring.fixtures) {
      const score = scoreMission(fixture);
      expect({
        task: score.task,
        expression: score.expression,
        total: score.total,
        outcome: score.outcome,
      }).toEqual(fixture.expected);
    }
    for (const fixture of bundle.output.fixtures) {
      const parsed = parseMissionReply(fixture.raw);
      expect(parsed.segments).toEqual(fixture.expected.segments);
      expect(parsed.state === null ? null : parsed.state.goalsDone).toEqual(
        fixture.expected.state?.goals_done ?? null,
      );
    }
  });
});
