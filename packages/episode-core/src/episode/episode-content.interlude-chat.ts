// 문자 막간의 대화 정규화입니다(ADR-0088 보충) — 답장 보기와 분기 줄을 버리지 않습니다. 순수 함수만 둡니다.

import type { DeliveryInterlude, DeliveryInterludeCut } from "./episode-content.schema-parts";
import type { EpisodeChat, EpisodeChatTurn } from "./episode-content.model";
import { isRecord, maybe, nonEmpty, toText } from "./episode-content.normalize";
import { EPISODE_SELF_SPEAKER } from "./speaker";

const MESSAGE_FORM = "message";

function turnOf(cut: DeliveryInterludeCut): EpisodeChatTurn | null {
  if (cut.cut_kind === "message_reply") {
    const [first, ...rest] = (cut.options ?? []).map(toText);
    return first === undefined ? null : { kind: "reply", options: [first, ...rest] };
  }
  if (cut.cut_kind !== "message" || cut.line === undefined) return null;
  const speaker = nonEmpty(cut.speaker) ?? nonEmpty(cut.with);
  if (speaker === undefined) return null;
  return {
    kind: "message",
    speaker,
    line: toText(cut.line),
    ...maybe("imageUrl", nonEmpty(cut.image_url)),
    ...maybe("afterOption", cut.after_option),
  };
}

// 인물 그림 표에서 그 화자의 그림 — 모양이 틀린 항목은 건너뜁니다.
function profileImageOf(profiles: unknown, speaker: string): string | undefined {
  if (!Array.isArray(profiles)) return undefined;
  for (const entry of profiles) {
    if (!isRecord(entry) || entry["speaker"] !== speaker) continue;
    const url = entry["image_url"];
    if (typeof url === "string" && url.trim() !== "") return url;
  }
  return undefined;
}

/** 문자 막간 와이어 → 대화. 문자 형식이 아니거나 상대 · 그릴 줄이 없으면 `undefined`. */
export function toChat(wire: DeliveryInterlude): EpisodeChat | undefined {
  if (wire.form !== MESSAGE_FORM) return undefined;
  const turns = wire.cuts.map(turnOf).filter((turn): turn is EpisodeChatTurn => turn !== null);
  const counterpart = turns.find(
    (turn) => turn.kind === "message" && turn.speaker !== EPISODE_SELF_SPEAKER,
  );
  const [first, ...rest] = turns;
  if (first === undefined || counterpart?.kind !== "message") return undefined;
  return {
    counterpart: counterpart.speaker,
    ...maybe("counterpartImageUrl", profileImageOf(wire.profiles, counterpart.speaker)),
    ...maybe("backgroundUrl", nonEmpty(wire.background_url)),
    turns: [first, ...rest],
  };
}
