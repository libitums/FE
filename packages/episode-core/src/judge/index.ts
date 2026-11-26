// @libitums/episode-core/judge — 말하기 · 글자 · 타일 · 보기 판정과 통과 기준.

export type { AnswerResult } from "./answer-result";
export type { NonEmpty } from "./non-empty";
export {
  judgeSpeaking,
  matchedWordCount,
  speakingChunks,
  speakingWords,
  type SpeakingChunk,
} from "./speaking-judge";
export { judgeRoleplayReplyExact } from "./roleplay-reply";
export {
  judgeRoleplayReply,
  judgeSpokenAnswer,
  type SpokenAnswerJudgement,
  type SpokenGrade,
} from "./spoken-answer";
export { spokenTrackOf, spokenUnitsOf, type SpokenTrack } from "./hangul-pronunciation";
export { addsNegation } from "./spoken-negation";
export {
  judgeSpokenLenient,
  SPOKEN_EXACT_MAX_UNITS,
  SPOKEN_FLOOR_MIN_UNITS,
  SPOKEN_LENIENT_THRESHOLD,
  SPOKEN_ONE_SLIP_MAX_UNITS,
  SPOKEN_SEGMENT_FLOOR,
  spokenAllowedDistance,
  spokenPasses,
  spokenSimilarity,
  type SpokenJudgement,
  type SpokenOutcome,
  type SpokenSimilarity,
} from "./spoken-lenient";
export { isTypedAnswerAccepted, isTypedAnswerCorrect, normalizeAnswerText } from "./typed-answer";
export { canCheckTiles, composeTileReply, judgeTileReply, type ReplyTile } from "./tile-reply";
export { judgeChoice } from "./choice";
export {
  catalogPassCriterion,
  judgeAssessment,
  type PassCriterion,
  type PassVerdict,
} from "./pass";
