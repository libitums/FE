// 전화 막간의 정규화입니다(ADR-0088 D6) — 상대 · 대사 줄 종류 · 끝 지문. 순수 함수만 둡니다.

import type { DeliveryInterlude, DeliveryInterludeCut } from "./episode-content.schema-parts";
import type { EpisodeCall, EpisodeCallLine } from "./episode-content.model";
import { profileImageOf } from "./episode-content.interlude-chat";
import { maybe, nonEmpty, toText } from "./episode-content.normalize";
import { EPISODE_SELF_SPEAKER } from "./speaker";

const CALL_FORM = "call";

function lineOf(cut: DeliveryInterludeCut): EpisodeCallLine | null {
  if (cut.cut_kind !== "call" || cut.line === undefined) return null;
  const line = toText(cut.line);
  const audio = maybe("audioUrl", nonEmpty(cut.audio_url));
  if (cut.background_voice === true) {
    return { kind: "background", label: nonEmpty(cut.voice_label) ?? "", line, ...audio };
  }
  const speaker = nonEmpty(cut.speaker);
  if (speaker === undefined) return null;
  return speaker === EPISODE_SELF_SPEAKER
    ? { kind: "self", label: "", line, ...audio }
    : { kind: "caller", label: speaker, line, ...audio };
}

/** 전화 막간 와이어 → 통화. 전화 형식이 아니거나 상대 · 대사가 없으면 `undefined`. */
export function toCall(wire: DeliveryInterlude): EpisodeCall | undefined {
  if (wire.form !== CALL_FORM) return undefined;
  const lines = wire.cuts.map(lineOf).filter((line): line is EpisodeCallLine => line !== null);
  const counterpart =
    wire.cuts.map((cut) => nonEmpty(cut.with)).find((name) => name !== undefined) ??
    lines.find((line) => line.kind === "caller")?.label;
  const [first, ...rest] = lines;
  if (first === undefined || counterpart === undefined) return undefined;
  const end = wire.cuts.find((cut) => cut.cut_kind === "call_end");
  const endText = end?.narration ?? end?.line;
  return {
    counterpart,
    ...maybe("counterpartImageUrl", profileImageOf(wire.profiles, counterpart)),
    ...maybe("backgroundUrl", nonEmpty(wire.background_url)),
    lines: [first, ...rest],
    ...maybe("end", endText === undefined ? undefined : toText(endText)),
  };
}
