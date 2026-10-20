import { expect, test } from "vitest";

import type { CatalogCuts, CatalogCutView } from "../catalog-cover/catalog-cover.contract";
import {
  initialRoleplayTalkState,
  isRoleplayTalkDone,
  judgeRoleplayReply,
  roleplayStoryCutsOf,
  roleplayTalkReducer,
  speechReadinessOf,
} from "./roleplay-story";

const text = (ko: string) => ({ ko, en: null, roman: null });
const narration = (index: number, ko: string): CatalogCutView => ({
  kind: "narration",
  index,
  text: text(ko),
  imageUrl: null,
});
const line = (index: number, ko: string): CatalogCutView => ({
  kind: "line",
  voice: "speech",
  index,
  speaker: { kind: "named", name: "점원" },
  text: text(ko),
  aside: null,
  imageUrl: null,
});

test("[RS1] 이름 · 나라가 없는 정답은 말하기 규칙 그대로 — 부호는 무시, 낱말이 다르면 오답", () => {
  expect(judgeRoleplayReply(["카드로 할게요."], "카드로 할게요", [])).toBe("correct");
  expect(judgeRoleplayReply(["카드로 할게요."], "현금으로 할게요", [])).toBe("incorrect");
  expect(judgeRoleplayReply(["아니요, 괜찮아요.", "괜찮아요."], "괜찮아요", [])).toBe("correct");
});

test("[RS2] 이름이 든 낱말은 판정에서 빠진다 — 인식기가 이름을 다르게 적어도 맞다", () => {
  const accepted = ["Emma로 예약했어요."] as const;
  expect(judgeRoleplayReply(accepted, "엠마로 예약했어요", ["Emma"])).toBe("correct");
  expect(judgeRoleplayReply(accepted, "예약했어요", ["Emma"])).toBe("correct");
  expect(judgeRoleplayReply(accepted, "엠마로 왔어요", ["Emma"])).toBe("incorrect");
});

test("[RS3] 이름과 나라가 함께 든 문장 — 나머지 낱말이 차례대로 있어야 맞다", () => {
  const accepted = ["저는 미국에서 왔어요. 여기서 며칠 묵어요?"] as const;
  const wildcards = ["Mary Jane", "미국"];
  expect(judgeRoleplayReply(accepted, "저는 미국에서 왔어요 여기서 며칠 묵어요", wildcards)).toBe(
    "correct",
  );
  expect(judgeRoleplayReply(accepted, "여기서 며칠 묵어요 저는 왔어요", wildcards)).toBe(
    "incorrect",
  );
});

test("[RS9] 정답이 이름뿐이면 무언가 말해야 맞다 — 빈 인식은 오답", () => {
  expect(judgeRoleplayReply(["Emma"], "", ["Emma"])).toBe("incorrect");
  expect(judgeRoleplayReply(["Emma"], "엠마", ["Emma"])).toBe("correct");
});

test("[RS4] 한 턴 — 말하기 → 판정 → 다음, 결과가 쌓이고 힌트는 접힌다", () => {
  let state = roleplayTalkReducer(initialRoleplayTalkState, { type: "hint" });
  state = roleplayTalkReducer(state, { type: "start" });
  expect(state.phase).toBe("listening");
  state = roleplayTalkReducer(state, { type: "heard", text: "네", verdict: "correct" });
  expect(state).toMatchObject({ phase: "heard", heard: "네", verdict: "correct" });
  state = roleplayTalkReducer(state, { type: "next" });
  expect(state).toMatchObject({
    turnIndex: 1,
    phase: "ready",
    results: ["correct"],
    hintShown: false,
  });
});

test("[RS5] 틀리면 다시 말할 수 있고, 맞힌 뒤에는 다시 하기가 무시된다", () => {
  let state = roleplayTalkReducer(initialRoleplayTalkState, { type: "start" });
  state = roleplayTalkReducer(state, { type: "heard", text: "아", verdict: "incorrect" });
  state = roleplayTalkReducer(state, { type: "retry" });
  expect(state).toMatchObject({ phase: "ready", heard: "", verdict: null });
  state = roleplayTalkReducer(state, { type: "start" });
  state = roleplayTalkReducer(state, { type: "heard", text: "네", verdict: "correct" });
  expect(roleplayTalkReducer(state, { type: "retry" })).toBe(state);
});

test("[RS6] 건너뛰기는 판정 없이 넘기고 수만 센다 — 듣는 중에는 받지 않는다", () => {
  const listening = roleplayTalkReducer(initialRoleplayTalkState, { type: "start" });
  expect(roleplayTalkReducer(listening, { type: "skip" })).toBe(listening);
  const unavailable = roleplayTalkReducer(listening, { type: "unavailable", reason: "failed" });
  const skipped = roleplayTalkReducer(unavailable, { type: "skip" });
  expect(skipped).toMatchObject({ turnIndex: 1, results: [], skippedCount: 1 });
  expect(isRoleplayTalkDone(skipped, 1)).toBe(true);
  expect(isRoleplayTalkDone(skipped, 2)).toBe(false);
});

test("[RS7] 늦게 온 인식 결과는 듣는 중이 아니면 무시된다", () => {
  expect(
    roleplayTalkReducer(initialRoleplayTalkState, {
      type: "heard",
      text: "네",
      verdict: "correct",
    }),
  ).toBe(initialRoleplayTalkState);
});

test("[RS8] 표지 마지막 컷이 첫 턴 대사와 같으면 빼고, 다르면 그대로 둔다", () => {
  const cuts: CatalogCuts = [narration(1, "계산대에 올린다."), line(2, "봉투 드릴까요?")];
  expect(roleplayStoryCutsOf(cuts, "봉투 드릴까요?")).toEqual([cuts[0]]);
  expect(roleplayStoryCutsOf(cuts, "삼천 원입니다.")).toEqual(cuts);
  expect(roleplayStoryCutsOf([line(1, "봉투 드릴까요?")], "봉투 드릴까요?")).toBeNull();
});

test("[RS10] 시작 전 말하기 준비 — 묻지 않음은 ask, 거부 · 제한은 blocked, 인식기 없음은 unsupported", () => {
  const status = (microphone: string, speechRecognition: string, recognizerAvailable = true) =>
    ({ microphone, speechRecognition, recognizerAvailable }) as never;
  expect(speechReadinessOf(status("granted", "granted"))).toBe("ready");
  expect(speechReadinessOf(status("not-determined", "granted"))).toBe("ask");
  expect(speechReadinessOf(status("granted", "denied"))).toBe("blocked");
  expect(speechReadinessOf(status("restricted", "granted"))).toBe("blocked");
  expect(speechReadinessOf(status("granted", "granted", false))).toBe("unsupported");
});
