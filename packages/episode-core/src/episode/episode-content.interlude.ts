// 막간(INT) 이야기의 정규화입니다(ADR-0088) — 형식이 무엇이든 표지와 같은 컷 목록으로 바꿉니다. 순수 함수만 둡니다.

import type { DeliveryEpisodeV2 } from "./episode-content.schema";
import {
  interludeWireOf,
  type DeliveryInterlude,
  type DeliveryInterludeCut,
} from "./episode-content.schema-parts";
import type { DecodeIssue, EpisodeCut, EpisodeStory, Text } from "./episode-content.model";
import { issue, maybe, nonEmpty, toText } from "./episode-content.normalize";
import { toCall } from "./episode-content.interlude-call";
import { toChat } from "./episode-content.interlude-chat";
import { EPISODE_SELF_SPEAKER } from "./speaker";

const INTERLUDE_KIND = "interlude";
// 메신저 답장은 분기 화면이 생기기 전까지 첫 보기의 흐름만 그립니다(`after_option`은 1부터 셉니다).
const CHOSEN_OPTION = 1;
const NO_ASIDE: Text = { ko: "" };

// 갈래마다 `index`만 뺀 컷입니다(유니온에 `Omit`을 그대로 쓰면 갈래 키가 사라집니다).
type CutDraft = EpisodeCut extends infer Cut
  ? Cut extends EpisodeCut
    ? Omit<Cut, "index">
    : never
  : never;

function narrationOf(
  text: Text,
  image: Partial<Pick<EpisodeCut, "imageUrl">>,
  brief: string,
): CutDraft {
  return { kind: "narration", narration: text, imageBrief: brief, ...image };
}

function speechOf(
  speaker: string,
  line: Text,
  aside: Text,
  image: Partial<Pick<EpisodeCut, "imageUrl">>,
  brief: string,
): CutDraft {
  return { kind: "speech", speaker, line, aside, imageBrief: brief, ...image };
}

function draftsOf(cut: DeliveryInterludeCut, background: string | undefined): CutDraft[] {
  const image = maybe(
    "imageUrl",
    nonEmpty(cut.image_url) ?? nonEmpty(cut.background_url) ?? background,
  );
  const brief = cut.image_brief ?? "";
  const speaker = nonEmpty(cut.speaker) ?? nonEmpty(cut.with) ?? "";
  const line = cut.line === undefined ? undefined : toText(cut.line);
  const narration = cut.narration === undefined ? undefined : toText(cut.narration);
  switch (cut.cut_kind) {
    case "monologue":
      return line === undefined
        ? []
        : [
            {
              kind: "monologue",
              speaker: speaker || EPISODE_SELF_SPEAKER,
              line,
              imageBrief: brief,
              ...image,
            },
          ];
    case "narration":
    case "call_end":
    case "look": {
      const text = narration ?? line;
      return text === undefined ? [] : [narrationOf(text, image, brief)];
    }
    case "message_reply": {
      const chosen = cut.options?.[CHOSEN_OPTION - 1];
      return chosen === undefined
        ? []
        : [speechOf(speaker || EPISODE_SELF_SPEAKER, toText(chosen), NO_ASIDE, image, brief)];
    }
    default: {
      // speech · message · call과 모르는 종류 — 지문이 있으면 먼저, 대사가 있으면 그다음.
      const drafts: CutDraft[] = [];
      if (narration !== undefined) drafts.push(narrationOf(narration, image, brief));
      if (line !== undefined) {
        const aside =
          cut.aside !== undefined
            ? toText(cut.aside)
            : cut.background_voice === true && nonEmpty(cut.voice_label) !== undefined
              ? { ko: cut.voice_label ?? "" }
              : NO_ASIDE;
        drafts.push(speechOf(speaker, line, aside, image, brief));
      }
      return drafts;
    }
  }
}

/** 막간 와이어 → 이야기. 그릴 컷이 하나도 없으면 `null`. */
export function toStory(wire: DeliveryInterlude): EpisodeStory | null {
  const background = nonEmpty(wire.background_url);
  const drafts = wire.cuts
    .filter((cut) => cut.after_option === undefined || cut.after_option === CHOSEN_OPTION)
    .flatMap((cut) => draftsOf(cut, background));
  const cuts = drafts.map((draft, i) => ({ ...draft, index: i + 1 }) as EpisodeCut);
  const [first, ...rest] = cuts;
  if (first === undefined) return null;
  return {
    form: wire.form,
    ...maybe("caption", wire.caption === undefined ? undefined : toText(wire.caption)),
    cuts: [first, ...rest],
    ...maybe("chat", toChat(wire)),
    ...maybe("call", toCall(wire)),
  };
}

export type InterludePlan = {
  /** 스텝 id → 이야기(막간 스텝만). */
  readonly stories: ReadonlyMap<string, EpisodeStory>;
  /** 막간 스텝을 버린 뒤의 와이어 — 스텝과 `completion.requires`에서 함께 뺍니다. */
  readonly wire: DeliveryEpisodeV2;
  readonly warnings: readonly DecodeIssue[];
};

/** 막간 스텝을 읽고, 틀린 것은 버립니다. 입력을 바꾸지 않습니다. */
export function interludePlanOf(wire: DeliveryEpisodeV2): InterludePlan {
  const stories = new Map<string, EpisodeStory>();
  const dropped = new Set<string>();
  const warnings: DecodeIssue[] = [];
  wire.steps.forEach((step, i) => {
    if (step.kind !== INTERLUDE_KIND) return;
    const interlude = interludeWireOf(step.interlude);
    const story = interlude === null ? null : toStory(interlude);
    if (story === null) {
      dropped.add(step.id);
      warnings.push(
        issue(
          "invalid-interlude",
          `steps[${i}].interlude`,
          `interlude step ${step.id} has no drawable cuts`,
        ),
      );
      return;
    }
    stories.set(step.id, story);
  });
  if (dropped.size === 0) return { stories, wire, warnings };
  const completion = wire.completion;
  return {
    stories,
    wire: {
      ...wire,
      steps: wire.steps.filter((step) => !dropped.has(step.id)),
      ...(completion === undefined
        ? {}
        : { completion: { requires: completion.requires.filter((id) => !dropped.has(id)) } }),
    },
    warnings,
  };
}
