// 미션 턴 하나의 스트림(ADR-0177, PRD §3.4). `mission-turn-handler.ts`가 판 확인 · 학습자 메시지 저장을 끝낸 뒤 부릅니다.
//
// 1단계 턴(`chat-send-turn.ts`)의 부품을 그대로 씁니다 — 입력 검사(`moderateInput`) · 답 생성(`startReply`) · 출력 검사와 다시 만들기
// (`outputChecker` · `recoverReply`) · 번역(`startTranslation`). 시스템 프롬프트는 미션 전용(`missionSystemPrompt`)이고, 상태 줄은 미션
// 모양(`parseMissionState`)으로 읽습니다. 목표는 답과 병렬로 부르는 판정(`startMissionJudge`)이 정하고, 판정이 실패하면 답의 상태 줄로
// 돌아갑니다(`missionTurnPayload`). 추천 답변 칩 · 기억 추출 · 이야기 · 학습 삽입 지시 · 친밀도는 없습니다.
// 출력 검사는 지금의 나이 규칙 그대로 — 성인은 받는 대로, 미성년자 · 나이 모름은 검사 뒤에 한꺼번에.
// 저장(`companion_mission_finish_turn`)이 돌려준 판 상태가 진실이고 `mission` 이벤트는 그 값으로 씁니다. 코어 `advanceMission`은 대조용입니다.
// 이벤트: start → notice* → delta* → correction → translation* → mission → done(creditsSpent 0). 위기면 crisis → done.
// 판은 모든 목표 · 턴 상한에서만 닫힌다 — 필수만 이뤘으면 `mission.requiredDone`이 참이고 판은 이어진다(끝내기는 mission-finish).

import type { Feedback, ModerationVerdict, Segment } from "./chat-send.contract.ts";
import type { ModerationRecord, TurnStatusName } from "./chat-send-finish.ts";
import { historyFrom, moderateInput, startReply } from "./chat-send-reply.ts";
import { applyTranslation, startTranslation, translationContext } from "./chat-send-translate.ts";
import { outputChecker, recoverReply } from "./chat-send-turn-recover.ts";
import {
  CONTRACT_VERSION,
  STREAM_ERRORS,
  type StreamErrorCode,
} from "./companion-contract/index.ts";
import { systemSplit } from "./companion-llm.ts";
import { crisisResourcesFor } from "./companion-safety.ts";
import type { SegmentDelta } from "./companion-segments.ts";
import { withUsageMeta } from "./companion-usage.ts";
import { missionCounterpartBase } from "./mission-definition.ts";
import type { DbMissionState } from "./mission-http.ts";
import { missionSystemPrompt } from "./mission-prompt.ts";
import { advanceMission, parseMissionState } from "./mission-state.ts";
import {
  callRpcFinish,
  missionTurnPayload,
  startMissionFeedback,
  settleReply,
  startMissionJudge,
  type FinishRow,
} from "./mission-turn-parts.ts";
import type { MissionTurnContext } from "./mission-turn-row.ts";

export type { MissionTurnContext };

/** 입력 검사에 걸린 미션 턴의 고정 안내 — 미션에는 「성격대로 거절」이 없다. 장면 밖 말이 아니게 짧게 둔다. */
export const missionBlockedLine =
  "죄송하지만 그 말씀에는 답할 수 없어요. 하던 이야기로 돌아갈까요?";

export async function runMissionTurn(context: MissionTurnContext): Promise<string> {
  const { deps, env, llm, sink, body, row, mission } = context;
  const ageBand = row.profile.ageBand;
  const moderation: ModerationRecord[] = [];
  const withUsage = (assistant: Record<string, unknown>) => withUsageMeta(assistant, context.usage);
  const finish = (
    status: TurnStatusName,
    assistant: Record<string, unknown> | null,
    extra: { feedback?: Feedback; mission?: unknown } = {},
  ) =>
    callRpcFinish(context, {
      p_user_message_id: row.userMessageId,
      p_status: status,
      p_assistant: assistant,
      p_moderation: moderation,
      p_notices: status === "failed" ? [] : row.notices,
      p_feedback: extra.feedback ?? null,
      p_mission: extra.mission ?? null,
    });
  const sendMission = (state: DbMissionState, ended: FinishRow["ended"]) =>
    sink.send({
      event: "mission",
      data: {
        conversationId: row.conversationId,
        goals: state.goals.map(({ id, done }) => ({ id, done })),
        turnsLeft: state.turnsLeft,
        ended,
        requiredDone: state.requiredDone,
      },
    });
  const done = () =>
    sink.send({
      event: "done",
      data: { assistantMessageId: context.assistantMessageId, creditsSpent: 0, balance: null },
    });
  const abort = new AbortController();
  const fail = async (code: StreamErrorCode, status: "blocked" | "failed") => {
    abort.abort();
    sink.send({ event: "error", data: { code, retryable: STREAM_ERRORS[code].retryable } });
    await finish(status, null).catch(() => undefined);
    return code;
  };

  sink.send({
    event: "start",
    data: {
      contractVersion: CONTRACT_VERSION,
      conversationId: row.conversationId,
      userMessageId: row.userMessageId,
      assistantMessageId: context.assistantMessageId,
      speechLevel: "polite",
    },
  });
  for (const kind of row.notices) sink.send({ event: "notice", data: { kind } });

  const history = historyFrom(row);
  const prompt = missionSystemPrompt({
    mission,
    progress: context.progress,
    l1: row.profile.l1,
    expressions: row.learning.expressions,
    base: missionCounterpartBase(mission, row.persona),
  });
  const system = `${prompt.stable}${systemSplit}${prompt.dynamic}`;
  let reply = startReply(context, history, system, abort);
  const feedback = startMissionFeedback(context, abort);
  const judge = startMissionJudge(context, abort);
  let correctionSent = false;
  const sendCorrection = (value: Feedback) => {
    if (correctionSent) return;
    correctionSent = true;
    sink.send({ event: "correction", data: { userMessageId: row.userMessageId, ...value } });
  };

  let input: ModerationVerdict;
  try {
    input = await moderateInput(llm, body.text, history, ageBand, abort.signal);
  } catch {
    return fail("upstream_unavailable", "failed");
  }
  moderation.push({ layer: "input", category: input.category, action: input.action });
  if (input.action === "crisis") {
    abort.abort();
    sink.send({
      event: "crisis",
      data: crisisResourcesFor(body.client_region ?? row.profile.region ?? null),
    });
    const meta = { ageBand, playground: context.playground };
    await finish("crisis", withUsage({ id: context.assistantMessageId, segments: [], meta }));
    done();
    return "crisis";
  }
  if (input.action === "block") {
    abort.abort();
    const segments: Segment[] = [{ kind: "speech", text: missionBlockedLine }];
    sink.send({ event: "delta", data: { segment: 0, kind: "speech", text: missionBlockedLine } });
    const meta = { blocked: input.category, ageBand, playground: context.playground };
    const saved = await finish("blocked", { id: context.assistantMessageId, segments, meta });
    sendMission(saved.state, saved.ended);
    done();
    return "blocked";
  }

  const sendDelta = (delta: SegmentDelta) => sink.send({ event: "delta", data: delta });
  // 미션 답은 모았다가 다듬은 뒤 보낸다(ADR-0177 D14 — 혼잣말 · 작별 인사 · 대신 묻기가 화면 · TTS로 새지 않게).
  if (ageBand === "adult") {
    void feedback.then(sendCorrection);
  }
  let result: Awaited<typeof reply.done>;
  try {
    result = await reply.done;
  } catch {
    return fail("upstream_unavailable", "failed");
  }
  if (result.segments.length === 0) return fail("upstream_unavailable", "failed");
  const translate = (segments: readonly Segment[]) =>
    startTranslation(
      llm,
      env,
      {
        segments: [...segments],
        l1: row.profile.l1,
        timeoutMs: deps.translationTimeoutMs,
        context: translationContext([...history, { role: "user", text: body.text }]),
        persona: { name: mission.counterpart.label },
      },
      abort.signal,
    );
  let translation = translate(result.segments);
  let recovered: string | null = null;
  if (ageBand !== "adult") {
    // 미션은 로맨스 인물이 아니다 — 인물 · 수위 없이 넘겨 기본 선(성인 hug · 아니면 none)으로 검사한다.
    const checkContext = {
      deps,
      llm,
      body,
      gate: { ageBand },
      turn: { persona: null, speechLevel: "polite" },
    } as const;
    const check = outputChecker(checkContext, moderation);
    let output: ModerationVerdict;
    try {
      output = await check(result.segments);
    } catch {
      return fail("upstream_unavailable", "failed");
    }
    if (output.action !== "allow") {
      const again = await recoverReply(checkContext, {
        history,
        system,
        abort,
        check,
        category: output.category,
      });
      if (again === null) return fail("guardrail_blocked", "blocked");
      ({ reply, result } = again);
      recovered = output.category;
      translation = translate(result.segments);
    }
  }
  const settled = await settleReply(context, result, await judge, async () => {
    const retry = startReply(context, history, system, abort);
    return retry.done;
  });
  const cleaned = settled.outcome === "unchanged" ? null : settled.outcome;
  if (settled.result !== result) translation = translate(settled.result.segments);
  result = settled.result;
  result.segments.forEach((segment, index) =>
    sendDelta({ segment: index, kind: segment.kind, text: segment.text }),
  );

  const [feedbackResult, translated, judged] = await Promise.all([feedback, translation, judge]);
  sendCorrection(feedbackResult);
  const segments = applyTranslation(sink, deps.log, result.segments, translated);
  const turnState = result.stateText === null ? null : parseMissionState(result.stateText);
  const stateLine = result.stateText === null ? "missing" : turnState === null ? "broken" : "ok";
  const payload = missionTurnPayload(context.progress.goalsDone, turnState, judged);
  const expected = advanceMission(
    mission,
    context.progress,
    payload === null
      ? null
      : { goalsDone: payload.goals_done, offTask: payload.off_task, closing: payload.closing },
  );
  let saved: FinishRow;
  try {
    saved = await finish(
      "complete",
      withUsage({
        id: context.assistantMessageId,
        segments,
        meta: {
          model: llm.model,
          ageBand,
          firstDeltaMs: result.firstDeltaMs,
          totalMs: result.totalMs,
          missionState: turnState,
          stateLine,
          judge: judged === null ? "unavailable" : { goals: judged.goals, offTask: judged.offTask },
          ...(cleaned === null ? {} : { cleaned }),
          translation: translated.status,
          playground: context.playground,
          ...(recovered === null ? {} : { guardrailRecovered: { category: recovered } }),
        },
      }),
      {
        feedback: feedbackResult,
        mission: payload,
      },
    );
  } catch {
    sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
    return "internal_error";
  }
  // SQL이 진실 — 코어 전이와 어긋나면 로그만 남긴다.
  const savedDone = saved.state.goals.filter((goal) => goal.done).map((goal) => goal.id);
  if (
    saved.ended !== expected.ended ||
    saved.state.requiredDone !== expected.requiredDone ||
    savedDone.join(",") !== expected.progress.goalsDone.join(",")
  )
    deps.log({ event: "chat_send", status: "stream", outcome: "mission_state_mismatch" });
  sendMission(saved.state, saved.ended);
  done();
  return `complete state=${stateLine}${saved.ended === null ? "" : ` ended=${saved.ended}`}`;
}
