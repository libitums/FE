// 문항의 음성 주소를 풀어 문항 음성 값으로 바꿉니다(순수). 듣기 여섯 유형은 `ListenAudio`,
// 나머지 여섯 유형은 `AnswerEchoAudio`입니다. 자기 음성이 없는 유형도 정답 원문이 이 에피소드에 녹음돼 있으면
// 정답 뒤 음성을 냅니다(ADR-0172).

import { contentAudioSourceOf } from "../lib/content-audio";
import type { LearningItem } from "../lib/episode-content.model";
import type {
  AnswerEchoAudio,
  AnswerEchoItemType,
  ListenAudio,
  ListenItemType,
  QuestionAudio,
} from "../lib/question-audio";
import type { CatalogLessonItemPort } from "./catalog-lesson-types";
import { answerEchoTextOf, isBareWord, ownAudioIdOf, spokenKoOf } from "./catalog-recorded-audio";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

/** 재생 주소와, 포트가 알면 말소리 길이입니다. */
type ResolvedAudio = { readonly source: string; readonly speechMs?: number };

function resolvedOf(
  id: string | undefined,
  spokenKo: string,
  port: CatalogLessonItemPort,
): ResolvedAudio | null {
  const source = contentAudioSourceOf(id, spokenKo, port.audioUrlOf);
  if (source === null) return null;
  const speechMs = id === undefined ? null : (port.audioSpeechMsOf?.(id) ?? null);
  return speechMs === null ? { source } : { source, speechMs };
}

function ownResolvedOf(
  item: ItemOf<ListenItemType | AnswerEchoItemType>,
  port: CatalogLessonItemPort,
): ResolvedAudio | null {
  return resolvedOf(ownAudioIdOf(item), spokenKoOf(item), port);
}

/**
 * 정답 원문을 이 에피소드 녹음 색인에서 찾아 재생 주소로 풉니다 — 받은 파일이 있는 첫 id입니다. 원문 · 색인 · 녹음 ·
 * 받은 파일이 없으면 `null`.
 */
function recordedOf(item: LearningItem, port: CatalogLessonItemPort): ResolvedAudio | null {
  const answer = answerEchoTextOf(item);
  if (answer === null || isBareWord(answer) || port.recordedAudioOf === undefined) return null;
  for (const id of port.recordedAudioOf(answer)) {
    const resolved = resolvedOf(id, answer, port);
    if (resolved !== null) return resolved;
  }
  return null;
}

const echoOf = (resolved: ResolvedAudio | null): AnswerEchoAudio | null =>
  resolved === null ? null : { kind: "answer-echo", ...resolved };

export function catalogListenAudioOf(
  item: ItemOf<ListenItemType>,
  port: CatalogLessonItemPort,
): ListenAudio | null {
  const resolved = ownResolvedOf(item, port);
  if (resolved === null) return null;
  return { kind: "listen", source: resolved.source, ref: { itemId: item.id, itemType: item.type } };
}

export function catalogAnswerEchoOf(
  item: ItemOf<AnswerEchoItemType>,
  port: CatalogLessonItemPort,
): AnswerEchoAudio | null {
  return echoOf(ownResolvedOf(item, port) ?? recordedOf(item, port));
}

/** 자기 음성이 없는 유형의 정답 뒤 음성입니다 — 정답 원문이 이 에피소드에 녹음돼 있을 때만(ADR-0172). */
export function catalogRecordedEchoOf(
  item: LearningItem,
  port: CatalogLessonItemPort,
): AnswerEchoAudio | null {
  return echoOf(recordedOf(item, port));
}

/** 대답 고르기 — 상대 말은 듣기, 정답 대답은 판정 뒤 한 번(ADR-0172). */
export function catalogReplySelectAudioOf(
  item: ItemOf<"REPLY_SELECT">,
  port: CatalogLessonItemPort,
): QuestionAudio | null {
  const listen = catalogListenAudioOf(item, port);
  const echo = echoOf(recordedOf(item, port));
  if (listen === null) return echo;
  return echo === null ? listen : { ...listen, echo };
}

/** 소리가 있을 때만 `audio` 키를 싣는 조각입니다. */
export function audioField<Audio extends QuestionAudio>(
  audio: Audio | null,
): { readonly audio?: Audio } {
  return audio === null ? {} : { audio };
}
