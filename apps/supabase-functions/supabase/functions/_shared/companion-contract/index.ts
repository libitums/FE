// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
export { CONTRACT_VERSION, SUPPORTED_CONTRACT_VERSIONS } from "./version.ts";
export {
  PRE_STREAM_ERRORS,
  STREAM_ERRORS,
  preStreamErrorCodeSchema,
  streamErrorCodeSchema,
  type PreStreamErrorCode,
  type StreamErrorCode,
} from "./error-codes.ts";
export {
  CHAT_TEXT_MAX_LENGTH,
  chatSendRequestSchema,
  inputModeSchema,
  preStreamErrorBodySchema,
  type ChatSendRequest,
  type PreStreamErrorBody,
} from "./chat-send.ts";
export {
  correctionDataSchema,
  crisisDataSchema,
  deltaDataSchema,
  doneDataSchema,
  errorDataSchema,
  feedbackKindSchema,
  noticeDataSchema,
  noticeKindSchema,
  segmentKindSchema,
  speechLevelSchema,
  startDataSchema,
  stateDataSchema,
  translationDataSchema,
  turnEventSchema,
  type NoticeKind,
  type SegmentKind,
  type SpeechLevel,
  type TurnEvent,
  type TurnEventName,
} from "./sse-events.ts";
export {
  createSseParser,
  decodeTurnEvent,
  formatSseEvent,
  parseSse,
  type DecodedTurnEvent,
  type RawSseEvent,
  type SseParser,
} from "./sse-parse.ts";
export { checkTurnOrder, type TurnOrderResult, type TurnOrderViolation } from "./turn-order.ts";
export {
  ageSourceSchema,
  characterAvailabilitySchema,
  companionCharacterSchema,
  companionMemorySchema,
  companionMessageSchema,
  companionMessagesPageSchema,
  companionProfileSchema,
  companionWalletSchema,
  feedbackModeSchema,
  proactivePrefSchema,
  type CompanionCharacter,
  type CompanionMemory,
  type CompanionMessage,
  type CompanionMessagesPage,
  type CompanionProfile,
  type CompanionWallet,
  type FeedbackMode,
  type ProactivePref,
} from "./rpc.ts";
