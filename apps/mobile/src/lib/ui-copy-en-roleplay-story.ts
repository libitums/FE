// 영어 문구표 구획 — 에피소드 롤플레이(미리보기 · 말하기 대화).

import type { RoleplayStoryCopy } from "../screens/roleplay-story/roleplay-story.contract";
import { n } from "./ui-copy-en-plural";

export const roleplayStoryEn: RoleplayStoryCopy = {
  lineCount: (count) => n(count, "line", "lines"),
  withCounterpart: (name) => `with ${name}`,
  previewBody: (name) => `Act out this scene with ${name}. Answer each line out loud.`,
  start: "Start roleplay",
  lineProgress: (ordinal, total) => `Line ${String(ordinal)} / ${String(total)}`,
  me: "Me",
  speak: "Speak",
  stop: "Stop",
  listening: "Listening… Tap again when you're done.",
  showHint: "Show hint",
  hint: (translation) => `Say: ${translation}`,
  cantSpeak: "Can't speak now",
  great: "Great",
  notQuite: "Not quite",
  youSaid: (heard) => `You said: ${heard}`,
  heardNothing: "I didn't catch that.",
  unavailable: "Speaking isn't available right now. You can skip this line.",
  blocked: "Allow Microphone and Speech Recognition for this app in Settings, or skip this line.",
  permissionTitle: "Turn on the microphone",
  permissionBody:
    "Roleplay is spoken. Allow Microphone and Speech Recognition for this app in Settings.",
  openSettings: "Open Settings",
  notNow: "Not now",
  unsupportedTitle: "Speaking isn't available",
  unsupportedBody:
    "Speech recognition isn't available on this device right now. You can still play the scene and skip each line.",
  startAnyway: "Start anyway",
  retryHeard: "I didn't catch that. Tap the mic and try again.",
  playAgain: "Play again",
};
